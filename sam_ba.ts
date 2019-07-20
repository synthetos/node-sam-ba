import SerialPort from "serialport";

class DataRequest {
  public timedout = false;
  private timeoutId?: NodeJS.Timeout;
  public promise: Promise<Buffer>;
  private resolveFn!: (
    value?: Buffer | PromiseLike<Buffer> | undefined
  ) => void;
  private rejectFn!: (value?: any) => void;

  constructor(
    public length: number,
    private parent: SamBA,
    private timeout = 0,
    public keepOnTimeout = false
  ) {
    this.promise = new Promise((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });

    if (timeout > 0) {
      this.timeoutId = setTimeout(() => {
        this.timedout = true;
        this.parent._handleTimedOutRequest();
      }, timeout);
    }
  }

  resolve(value: Buffer | undefined) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.resolveFn(value);
  }

  reject(value: any) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.rejectFn(value);
  }
}

/**
 * SAM_BA
 * The clas that embodies the root protocol of the Atmel SAM-BA
 * flashing ROM routines.
 */
export class SamBA {
  private _dataRequests: DataRequest[] = [];
  private _dataBuffer = Buffer.allocUnsafe(4 * 1024); // 4k should do nicely
  private _dataBufferReadPos = 0;
  private _dataBufferWritePos = 0;

  public chipId: number = -1;
  public vers: string = "";

  /**
   * Create a SAM_BA object
   *
   * @param  {SerialPort} serialPort this is the serialport object
   * @param  {number} debugLevel level of debugging output, 0 is none
   */
  constructor(public serialPort: SerialPort, public debugLevel: number) {
    this.serialPort.on("data", (data: Buffer) => {
      data.copy(this._dataBuffer, this._dataBufferWritePos);
      this._dataBufferWritePos += data.length;

      this._handleDataRequests();
    });
  }

  public stackAddress = 0;
  public jumpAddress = 0;

  /**
   * Set the information from the blob in order to call go()
   *
   * @param  {number} stackAddress this is the serialport object
   * @param  {number} jumpAddress this is the serialport object
   */
  setJumpData(stackAddress: number, jumpAddress: number) {
    this.stackAddress = stackAddress;
    this.jumpAddress = jumpAddress;
  }

  /**
   * init - initilize the connection
   *
   * @return {Promise}  Promise to indicate when init is done
   */
  async init(): Promise<any> {
    // Start out in binary mode
    await this._writeWithPromise(Buffer.from("N#"));
    await this._readWithPromise(2);
    const chipId = await this.readWord(0x400e0940);
    this.chipId = chipId;
    this._log("chipId: 0x" + chipId.toString(16));
    const vStr = await this.getVersion();
    this.vers = vStr;
    this._log("vStr: " + vStr);
    return vStr;
  }

  /**
   * go - tell the board to execute a function at a given address
   *
   * @param  {number} address The address withing the machine to jump to.
   * @return {Promise}     Promise to be fulfilled when the request is sent
   */
  async go(address: number): Promise<void> {
    if (this.jumpAddress === 0 || this.stackAddress === 0) {
      return Promise.reject("setJumpData() was apparently not called.");
    }
    await this.writeWord(this.jumpAddress, address);
    await this.writeWord(this.stackAddress, address + 1);
    await this._writeWithPromise(this._goCmd(this.jumpAddress));
  }

  /**
   * write - send data to the board
   * @param  {number} address  the address to send the data to
   * @param  {Buffer} data     a Buffer containing JUST the data to send
   * @param  {number} offset   the offset into data to start sending from
   *                           (default: 0)
   * @return {Promise<void>}         Promise to be fulfilled when the data is sent
   */
  async write(
    address: number,
    data: Buffer,
    offset: number = 0
  ): Promise<void> {
    // await this._writeWithPromise(this._writeCmd(address, data.length));
    // return await this._writeWithPromise(data, true);

    while (offset < data.length) {
      await this.writeWord(address, data.readUInt32LE(offset));
      address += 4;
      offset += 4;
    }
  }

  /**
   * verify - read data from the board and compare it to the data provided
   * @param  {number} address  the address to send the data to
   * @param  {Buffer} data     a Buffer containing JUST the data to verify
   * @param  {number} offset   the offset into data to start verifying from
   *                           (default: 0)
   * @return {Promise<boolean>}         Promise to be fulfilled when the data is verified
   */
  async verify(
    address: number,
    data: Buffer,
    offset: number = 0
  ): Promise<boolean> {
    while (offset < data.length) {
      let value: Buffer;
      try {
        value = await this.read(
          address,
          Math.min(32, data.length - offset),
          10,
          false // toss what was read
        );
      } catch (e) {
        this._log(
          `Verify @${address.toString(16)} failed:` + (e as Error).message
        );
        return false;
      }

      let correctValue = data.slice(offset, offset + 32);
      if (!value.equals(correctValue)) {
        this._log(
          `Verify @${address.toString(16)} failed:` +
            `${value.toString("hex")} !== ${correctValue.toString("hex")}`
        );
        return false;
      }

      await new Promise(r => {
        setTimeout(() => r(), 2);

        this._log(
          `Verify +${offset.toString(16)} passed: ${value.toString(
            "hex"
          )} == ${correctValue.toString("hex")}`
        );
      });

      address += 32;
      offset += 32;
    }
    return true;
  }

  /**
   * writeWord - wrate a 32-bit (4-byte) word to the address
   * @param  {number} address  the address to read the data from
   * @param  {number} value    the value of a number to send
   * @return {Promise<void>}  Promise to be fulfilled with the requested number
   */
  writeWord(address: number, value: number): Promise<void> {
    return this._writeWithPromise(this._writeWordCmd(address, value));
  }

  /**
   * read - read data from the board
   * @param  {number} address  the address to read the data from
   * @param  {number} length   the length (in bytes) of the data to read
   * @return {Promise<Buffer>}         Promise to be fulfilled with the Buffer of data
   */
  async read(
    address: number,
    length: number,
    timeout = 0,
    keep = false
  ): Promise<Buffer> {
    // Warning from bossac:
    // The SAM firmware has a bug reading powers of 2 over 32 bytes
    // via USB.  If that is the case here, then read the first byte
    // with a readByte and then read one less than the requested size.
    if (length > 32 && !(length & (length - 1))) {
      // await this._writeWithPromise(this._readWordCmd(address));
      // let buf =  await this._readWithPromise(4);
      // await this._writeWithPromise(this._readCmd(address + 4, length - 4));
      // // We'll assume that they buffer together, can be read from the seialport as one chunk
      // return Buffer.concat([buf, await this._readWithPromise(length-4)]);
    }

    await this._writeWithPromise(this._readCmd(address, length));
    return await this._readWithPromise(length, timeout, keep);
  }

  /**
   * readByte - read a byte
   * @param  {number} address  the address to read the data from
   * @return {Promise<number>}  Promise to be fulfilled with the requested number
   */
  async readByte(address: number): Promise<number> {
    await this._writeWithPromise(this._readByteCmd(address));
    const buf = await this._readWithPromise(1);
    return buf.readUInt8(0);
  }

  /**
   * readWord - read a 32-bit (4-byte) word
   * @param  {number} address  the address to read the data from
   * @return {Promise<number>}  Promise to be fulfilled with the requested number
   */
  async readWord(address: number): Promise<number> {
    await this._writeWithPromise(this._readWordCmd(address));
    const buf = await this._readWithPromise(4);
    return buf.readUInt32LE(0);
  }

  /**
   * readWordTimeout - read a 32-bit (4-byte) word, with a timeout
   * @param  {number} address  the address to read the data from
   * @param  {number} timeout  the maximum number of ms to wait for a response
   * @return {Promise<number>}  Promise to be fulfilled with the requested number
   */
  async readWordTimeout(
    address: number,
    timeout: number,
    keep = false
  ): Promise<number> {
    await this._writeWithPromise(this._readWordCmd(address));
    const buf = await this._readWithPromise(4, timeout, keep);
    try {
      return buf.readUInt32LE(0);
    } catch (e) {
      debugger;
      return 0;
    }
  }

  /**
   * getVersion - read the version string which is of indeterminate size,
   *              so we use a timeout.
   * @return {Promise<string>}  Promise to be fulfilled with version string
   */
  async getVersion(): Promise<string> {
    await this._writeWithPromise(Buffer.from(`V#`));
    const buf = await this._readWithPromise(128, 100, true);
    return buf.toString("utf8");
  }

  /* -Internal use functions below- */

  /**
   * _readWithPromise - read the requested amount of data into a Buffer
   *
   * @param  {number} length   the number of bytes to read
   * @param  {number} timeout  milliseconds for timeout
   * @return {Promise<Buffer>} a Promise that will return the data on completion
   */
  _readWithPromise(
    length: number,
    timeout: number = 1000,
    keep = false
  ): Promise<Buffer> {
    let newRequest = new DataRequest(length, this, timeout, keep);
    this._dataRequests.push(newRequest);
    this._handleDataRequests();
    return newRequest.promise;
  }

  /**
   * _handleDataRequests - internal function to handle when new data comes in
   */
  _handleDataRequests() {
    while (this._dataRequests.length !== 0) {
      let topDataRequest = this._dataRequests[0];
      let needed = topDataRequest.length;
      let available = this._dataBufferWritePos - this._dataBufferReadPos;

      if (available >= needed) {
        // available is more than needed, so we'll copy out what's available
        topDataRequest.resolve(
          this._dataBuffer.slice(
            this._dataBufferReadPos,
            this._dataBufferReadPos + needed
          )
        );
        this._dataBufferReadPos += needed;

        this._dataRequests.shift();

        continue;
      }

      break;
    }

    if (this._dataBufferWritePos === this._dataBufferReadPos) {
      this._dataBufferWritePos = 0;
      this._dataBufferReadPos = 0;
    }
  }

  /**
   * _handleTimedOutRequest - internal function to call from DataRequest when a timeout occurs
   */
  _handleTimedOutRequest() {
    let topDataRequest = this._dataRequests[0];
    let available = this._dataBufferWritePos - this._dataBufferReadPos;
    if (topDataRequest.keepOnTimeout) {
      topDataRequest.length = available;
    }
    let needed = topDataRequest.length;

    if (available >= needed) {
      // this is an odd edge case that we should NEVER see
      this._handleDataRequests();
    } else {
      // we were waiting for more data than we got, scrap what we got and error out
      this._dataBufferWritePos = 0;
      this._dataBufferReadPos = 0;

      topDataRequest.reject(
        new Error(
          `Read timed out with ${available} bytes in the buffer (now discarded)`
        )
      );
    }
  }

  /**
   * _writeWithPromise - internal use only
   *
   * @param  {Buffer} data      raw Buffer to write tot he serial port
   * @param  {Boolean} logAsHex (dafault false)
   * @return {Promise<void>}    Promise to be fulfilled when the data is sent
   */
  _writeWithPromise(data: Buffer, logAsHex: boolean = false): Promise<void> {
    if (logAsHex) {
      this._log("> " + data.toString("hex"));
    } else {
      this._log("> " + data);
    }

    return new Promise((resolve, reject) => {
      this.serialPort.write(data, err => {
        // Note this callback is called when the data is queued,
        // NOT when the data is finished sending out of the machine.

        // Also, this callback may be called after the promise has already been rejected by a drain error
        if (err) {
          throw err;
        }
      }); // write

      // In some cases, SAM-BA needs to see the request in a different "packet" than what follows.
      process.nextTick(() => {
        this.serialPort.drain(err => {
          if (err) {
            return reject(err);
          }
          resolve();
        }); // drain
      }); // nextTick
    });
  }

  /**
   * _goCmd - internal use only
   *
   * @param  {number} address Address to jump to
   * @return {Buffer}         Returns the string needed to tell SAM-BA
   *                               to jump to addr.
   */
  _goCmd(address: number): Buffer {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address, 0); // thumb mode, we go to the address + 1
    return Buffer.from(`G${addrBuffer.toString("hex")}#`);
  }

  /**
   * _writeWordCmd - internal use only
   * @param  {number} address Address to write to
   * @param  {number} value   Buffer object containing *only* the data to send
   * @return {Buffer}         Returns the string to send to the machine to
   *                               initialte a send request.
   */
  _writeWordCmd(address: number, value: number): Buffer {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address, 0);
    let valueBuffer;
    if (Buffer.isBuffer(value)) {
      valueBuffer = value;
    } else {
      valueBuffer = Buffer.alloc(4);
      valueBuffer.writeUInt32BE(value, 0);
    }
    return Buffer.from(
      `W${addrBuffer.toString("hex")},${valueBuffer.toString("hex")}#`
    );
  }

  /**
   * _writeCmd - internal use only
   * @param  {number} address Address to write to
   * @param  {Buffer} data    Buffer object containing *only* the data to send
   * @return {Buffer}         Returns the string to send to the machine to
   *                               initiate a send request.
   */
  _writeCmd(address: number, length: number): Buffer {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address, 0);
    let sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32BE(length, 0);
    return Buffer.from(
      `S${addrBuffer.toString("hex")},${sizeBuffer.toString("hex")}#`
    );
  }

  /**
   * _readByteCmd - internal use only
   * @param  {number} address Address to write to
   * @param  {Buffer} data    Buffer object containing *only* the data to send
   * @return {Buffer}         Returns the string to send to the machine to
   *                               initialte a send request.
   */
  _readByteCmd(address: number): Buffer {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address, 0);
    return Buffer.from(`o${addrBuffer.toString("hex")},#`);
  }

  /**
   * _readWordCmd - internal use only
   * @param  {number} address Address to read from
   * @return {Buffer}         Returns the string to send to the machine to
   *                               initialte a read request.
   */
  _readWordCmd(address: number): Buffer {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address, 0);
    return Buffer.from(`w${addrBuffer.toString("hex")},#`);
  }

  /**
   * _readCmd - internal use only
   * @param  {number} address Address to write to
   * @param  {number} length  Buffer object containing *only* the data to send
   * @return {Buffer}         Returns the string to send to the machine to
   *                               initialte a read request.
   */
  _readCmd(address: number, length: number): Buffer {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address, 0);
    let lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(length, 0);
    return Buffer.from(
      `R${addrBuffer.toString("hex")},${lengthBuffer.toString("hex")}#`
    );
  }

  /**
   * _log - internal use only
   * @param {string} text   value to log
   */
  _log(text: string) {
    if (this.debugLevel > 0) {
      console.log(text);
    }
  }
}
