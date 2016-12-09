
/**
 * SAM_BA
 * The clas that embodies the root protocol of the Atmel SAM-BA
 * flashing ROM routines.
 */
class SamBA {

  /**
   * Create a SAM_BA object
   *
   * @param  {serialport} serialPort this is the serialport object
   */
  constructor(serialPort) {
    this.serialPort = serialPort;

    this._data = [];
    this._dataPromises = [];

    this.stackAddress = 0;
    this.jumpAddress = 0;
  }

  /**
   * Set the information from the blob in order to call go()
   *
   * @param  {number} stackAddress this is the serialport object
   * @param  {number} jumpAddress this is the serialport object
   */
  setJumpData(stackAddress, jumpAddress) {
    this.stackAddress = stackAddress;
    this.jumpAddress = jumpAddress;
  }

  /**
   * init - initilize the connection
   *
   * @return {Promise}  Promise to indicate when init is done
   */
  init() {
    this.serialPort.on('data', (data)=>{
      // console.log('< ' + data.toString('hex'));
      this._data.push({data: data, pos: 0});
      this._handleDataPromises();
    });

    // Start out in binary mode
    return this._writeWithPromise('N#')
      .then(()=>{
        return this._readWithPromise(2);
      })
      .then(()=>{
      //   // ignore the response (it's just CRLF)
      //   // now read the reset vector
      //   return this.readWord(0);
      // })
      // .then((resetVector)=>{
      //   this.resetVector = resetVector;
      //   console.log('resetVector: 0x'+resetVector.toString(16));
      //   // now read the chipId1
      //   return this.readWord(0x400e0740);
      // })
      // .then((chipId1)=>{
      //   this.chipId1 = chipId1;
      //  console.log('chipId1: 0x'+chipId1.toString(16));
        // now read the chipId2
        return this.readWord(0x400e0940);
      })
      .then((chipId)=>{
        this.chipId = chipId;
        console.log('chipId: 0x'+chipId.toString(16));
        // now read the version
        return this.getVersion();
      })
      .then((vStr)=>{
        this.vers = vStr;
        console.log('vStr: '+vStr);
        return Promise.resolve(vStr);
      });
  }

  /**
   * go - tell the board to execute a function at a given address
   *
   * @param  {number} address The address withing the machine to jump to.
   * @return {Promise}     Promise to be fulfilled when the request is sent
   */
  go(address) {
    if (this.jumpAddress === 0 || this.stackAddress === 0) {
      return Promise.reject('setJumpData() was apparently not called.');
    }
    return this.writeWord(this.jumpAddress, address)
    .then(()=>{
      return this.writeWord(this.stackAddress, address+1);
    })
    .then(()=>{
      return this._writeWithPromise(this._goCmd(this.jumpAddress));
    });
  }

  /**
   * write - send data to the board
   * @param  {number} address  the address to send the data to
   * @param  {Buffer} data     a Buffer containing JUST the data to send
   * @return {Promise}         Promise to be fulfilled when the data is sent
   */
  write(address, data) {
    return this._writeWithPromise(this._writeCmd(address, data))
      .then(()=>{
        return this._writeWithPromise(data, true);
      });
  }

  /**
   * writeWord - wrate a 32-bit (4-byte) word to the address
   * @param  {number} address  the address to read the data from
   * @param  {number} value    the value of a number to send
   * @return {Promise}  Promise to be fulfilled with the requested number
   */
  writeWord(address, value) {
    return this._writeWithPromise( this._writeWordCmd(address, value) );
  }

  /**
   * read - read data from the board
   * @param  {number} address  the address to read the data from
   * @param  {number} length   the length (in bytes) of the data to read
   * @return {Promise}         Promise to be fulfilled with the Buffer of data
   */
  read(address, length) {
    // Warning from bossac:
    // The SAM firmware has a bug reading powers of 2 over 32 bytes
    // via USB.  If that is the case here, then read the first byte
    // with a readByte and then read one less than the requested size.
    if (length > 32 && !(length & (length - 1))) {
        return readByte(address).then((byte)=>{
          return this._writeWithPromise(this._readCmd(address+1, length-1))
            .then(()=>{
              return this._readWithPromise(length-1);
            })
            .then( (buffer)=>{
              let b2 = buffer.alloc(length);
              b2.writeUInt8(byte);
              buffer.copy(b2, 1);
              return new Promise((r)=>r(b2));
            });
        });
    }

    return this._writeWithPromise(this._readCmd(address, length))
      .then(()=>{
        return this._readWithPromise(length);
      });
  }

  /**
   * readByte - read a byte
   * @param  {number} address  the address to read the data from
   * @return {Promise}  Promise to be fulfilled with the requested number
   */
  readByte(address) {
    return this._writeWithPromise(this._readByteCmd(address))
      .then(()=>{
        return this._readWithPromise(1);
      })
      .then((buf)=>{
        return new Promise((finish)=>{
          finish(buf.readUInt8());
        });
      });
  }

  /**
   * readWord - read a 32-bit (4-byte) word
   * @param  {number} address  the address to read the data from
   * @return {Promise}  Promise to be fulfilled with the requested number
   */
  readWord(address) {
    return this._writeWithPromise(this._readWordCmd(address))
      .then(()=>{
        return this._readWithPromise(4);
      })
      .then((buf)=>{
        return Promise.resolve(buf.readUInt32LE());
      });
  }


  /**
   * readWordTimeout - read a 32-bit (4-byte) word, with a timeout
   * @param  {number} address  the address to read the data from
   * @param  {number} timeout  the maximum number of ms to wait for a response
   * @return {Promise}  Promise to be fulfilled with the requested number
   */
  readWordTimeout(address, timeout) {
    return this._writeWithPromise(this._readWordCmd(address))
    .then(()=>{
      return this._readWithPromise(4, timeout);
    })
    // .then((buf)=>{
    //   if (undefined === buf) {
    //     console.log(`failed`);
    //     return Promise.reject("timed out");
    //   }
    //   return Promise.resolve(buf);
    // })
    .then((buf)=>{
      return Promise.resolve(buf.readUInt32LE());
    });
  }


  /**
   * getVersion - read the version string which is of indeterminate size,
   *              so we use a timeout.
   * @return {Promise}  Promise to be fulfilled with version string
   */
  getVersion() {
    return this._writeWithPromise('V#')
      .then(()=>{
        return this._readWithPromise(128, 100);
      })
      .then((buf)=>{
        return new Promise((finish)=>{
          finish(buf.toString('utf8'));
        });
      });
  }

  /* -Internal use functions below- */

  /**
   * _readWithPromise - read the requested amount of data into a Buffer
   *
   * @param  {number} length  the number of bytes to read
   * @param  {number} timeout milliseconds for timeout
   * @return {Promise}        a Promise that will return the data on completion
   */
  _readWithPromise(length, timeout=1000) {
    return new Promise((fulfill, reject)=>{
      let p = {
        fulfill: fulfill,
        reject: reject,
        timedout: false,
        buffer: Buffer.alloc(length),
        filled: 0,
      };
      p.timeout = setTimeout(()=>{
        p.timedout = true;
        this._handleDataPromises();
      }, timeout);
      this._dataPromises.push(p);
      // setTimeout(()=>{
      //   this.serialPort.flush((err)=> {
      //     if (err) {
      //       reject(err);
      //       return;
      //     }
      //   });
      // }, 10);
    });
  }

  /**
   * _handleDataPromises - internal function
   */
  _handleDataPromises() {
    while ((this._dataPromises.length !== 0)) {
      let topDataPromise = this._dataPromises[0];

      if (this._data.length !== 0) {
        let topData = this._data[0];

        let needed = topDataPromise.buffer.length - topDataPromise.filled;
        let available = topData.data.length - topData.pos;

        if (needed >= available) {
          // copy out the needed data
          topData.data.copy(topDataPromise.buffer,
                            topDataPromise.filled,
                            topData.pos);
          topDataPromise.filled += available;
          this._data.shift(); // we're done with this data, shift it out
        } else {
          // available is more than needed, so we'll copy out what's available
          topData.data.copy(topDataPromise.buffer,
                            topDataPromise.filled,
                            topData.pos,
                            topData.pos + needed);
          topDataPromise.filled += needed;
          topData.pos += needed;
        }
      }

      // Logic is: if we timed out, then we just send what we have
      if ((topDataPromise.timedout && topDataPromise.filled > 0) ||
          (topDataPromise.buffer.length === topDataPromise.filled)) {
        this._dataPromises.shift(); // we can remove this from the list
        clearTimeout(topDataPromise);
        topDataPromise.fulfill(topDataPromise.buffer);

        // We handles one request, loop to see if there's another.
        continue;
      } else
      if (topDataPromise.timedout) {
        // we timed out but didn't get any data, fail
        this._dataPromises.shift(); // we can remove this from the list
        clearTimeout(topDataPromise);
        topDataPromise.reject(new Error('Read request timed out'));
      }
      break;
    }
  }

  /**
   * _writeWithPromise - internal use only
   *
   * @param  {Buffer} data      raw Buffer to write tot he serial port
   * @param  {Boolean} logAsHex (dafault false)
   * @return {Promise}          Promise to be fulfilled when the data is sent
   */
  _writeWithPromise(data, logAsHex=false) {
    return new Promise((finalize, reject)=>{
      if (logAsHex) {
        console.log('> ' + data.toString('hex'));
      } else {
        console.log('> ' + data);
      }
      this.serialPort.write(data, (err)=>{
        if (err) {
          reject(err);
          return;
        }

        // In some cases, SAM-BA needs to see the request in a different
        // "packet" than what follows.
        // Also, a serialport.write() calls the callback when the data is
        // queued, NOT when the data is finished sending out of the machine.
        process.nextTick(()=>{
          this.serialPort.drain((err)=>{
            if (err) {
              reject(err);
              return;
            }
            finalize();
          }); // drain
        }); // nextTick
      }); // write
    }); // Promise
  }

  /**
   * _goCmd - internal use only
   *
   * @param  {number} address Address to jump to
   * @return {string}         Returns the string needed to tell SAM-BA
   *                               to jump to addr.
   */
  _goCmd(address) {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address); // thumb mode, we go to the address + 1
    return `G${addrBuffer.toString('hex')}#`;
  }

  /**
   * _writeWordCmd - internal use only
   * @param  {number} address Address to write to
   * @param  {number} value   Buffer object containing *only* the data to send
   * @return {string}         Returns the string to send to the machine to
   *                               initialte a send request.
   */
  _writeWordCmd(address, value) {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address);
    let valueBuffer = Buffer.alloc(4);
    valueBuffer.writeUInt32BE(value);
    return `W${addrBuffer.toString('hex')},${valueBuffer.toString('hex')}#`;
  }

  /**
   * _writeCmd - internal use only
   * @param  {number} address Address to write to
   * @param  {Buffer} data    Buffer object containing *only* the data to send
   * @return {string}         Returns the string to send to the machine to
   *                               initialte a send request.
   */
  _writeCmd(address, data) {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address);
    let sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32BE(data.length);
    return `S${addrBuffer.toString('hex')},${sizeBuffer.toString('hex')}#`;
  }

  /**
   * _readByteCmd - internal use only
   * @param  {number} address Address to write to
   * @param  {Buffer} data    Buffer object containing *only* the data to send
   * @return {string}         Returns the string to send to the machine to
   *                               initialte a send request.
   */
  _readByteCmd(address) {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address);
    return `o${addrBuffer.toString('hex')},#`;
  }

  /**
   * _readWordCmd - internal use only
   * @param  {number} address Address to read from
   * @return {string}         Returns the string to send to the machine to
   *                               initialte a read request.
   */
  _readWordCmd(address) {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address);
    return `w${addrBuffer.toString('hex')},#`;
  }

  /**
   * _readCmd - internal use only
   * @param  {number} address Address to write to
   * @param  {number} length  Buffer object containing *only* the data to send
   * @return {string}         Returns the string to send to the machine to
   *                               initialte a read request.
   */
  _readCmd(address, length) {
    let addrBuffer = Buffer.alloc(4);
    addrBuffer.writeUInt32BE(address);
    let lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(length);
    return `R${addrBuffer.toString('hex')},${lengthBuffer.toString('hex')}#`;
  }
}

module.exports = SamBA;
