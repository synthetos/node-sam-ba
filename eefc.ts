import { SamBA } from "./sam_ba";

// There is *some* reset controller in here too. TODO: Break it out.

const EEFC_KEY = 0x5a;

// const EEFC_FCMD_GETD = 0x0;
const EEFC_FCMD_WP = 0x1;
// const EEFC_FCMD_WPL = 0x2;
// const EEFC_FCMD_EWP = 0x3;
// const EEFC_FCMD_EWPL = 0x4;
const EEFC_FCMD_EA = 0x5;
// const EEFC_FCMD_SLB = 0x8;
// const EEFC_FCMD_CLB = 0x9;
// const EEFC_FCMD_GLB = 0xa;
const EEFC_FCMD_SGPB = 0xb;
const EEFC_FCMD_CGPB = 0xc;
// const EEFC_FCMD_GGPB = 0xd;

const RSTC_CR_KEY = 0xa5;
const RSTC_CR_PROCRST = 1 << 0;
const RSTC_CR_PERRST = 1 << 2;

/**
 * EEFC routing class
 */
export class EefcFlash {
  readonly EEFC0_FMR: number;
  readonly EEFC0_FCR: number;
  readonly EEFC0_FSR: number;
  readonly EEFC0_FRR: number;

  readonly EEFC1_FMR: number;
  readonly EEFC1_FCR: number;
  readonly EEFC1_FSR: number;
  readonly EEFC1_FRR: number;

  readonly RSTC_CR: number;
  // readonly RSTC_SR : number;
  // readonly RSTC_MR : number;

  bufferNum = 0;

  /**
   * constructor
   * @param {SamBA} samBa class object
   * @param {number} addr address
   * @param {number} pages
   * @param {number} size
   * @param {number} planes
   * @param {number} lockRegions
   * @param {number} user
   * @param {number} stack
   * @param {number} regs
   * @param {number} resetRegisterBase
   * @param {number} resetCommand
   * @param {boolean} canBrownout
   */
  constructor(
    public samBa: SamBA,
    public addr: number,
    public pages: number,
    public size: number,
    public planes: number,
    public lockRegions: number,
    public user: number,
    public stack: number,
    public regs: number,
    public resetRegisterBase: number,
    public resetCommand: number,
    public canBrownout: boolean
  ) {
    this.EEFC0_FMR = this.regs + 0x00;
    this.EEFC0_FCR = this.regs + 0x04;
    this.EEFC0_FSR = this.regs + 0x08;
    this.EEFC0_FRR = this.regs + 0x0c;

    this.EEFC1_FMR = this.regs + 0x200;
    this.EEFC1_FCR = this.regs + 0x204;
    this.EEFC1_FSR = this.regs + 0x208;
    this.EEFC1_FRR = this.regs + 0x20c;

    this.RSTC_CR = this.resetRegisterBase + 0x00;
    // this.RSTC_SR = (this.resetRegisterBase + 0x04);
    // this.RSTC_MR = (this.resetRegisterBase + 0x08);

    this.bufferNum = 0;
  }

  /**
   * EEFCFactory - generate an EEFC object based on the chipId provided
   * @param  {SamBA}  samBa  class object
   * @param  {number} chipId the chipId as reported by the machine
   * @return {EefcFlash}          the EEFC object associated with chipId
   */
  static EEFCFactory(samBa: SamBA, chipId: number): EefcFlash {
    switch (chipId) {
      // SAM3X8n
      case 0x286e0a60: // 8H
      case 0x285e0a60: // 8E
      case 0x284e0a60: {
        // 8C
        return new EefcFlash(
          samBa, // samBa
          0x80000, // addr
          2048, // pages
          256, // size
          2, // planes
          32, // lockRegions
          0x20001000, // user
          0x20010000, // stack
          0x400e0a00, // regs
          0x400e1a00, // reset register base
          // reset cmd
          ((RSTC_CR_KEY << 24) | RSTC_CR_PROCRST | RSTC_CR_PERRST) >>> 0,
          false // canBrownout
        );
        break;
      }
      // SAM E70, S70, V70, V71
      case 0xa1020e00: // E70[JQN]21
      case 0xa1120e00: // S70[JQN]21
      case 0xa1220e00: {
        // NB. there is no V70[JQN]21 // V71[JQN]21
        //  flash = new EefcFlash(samba, "ATSAM(SEV)70x21", 0x400000, 4096, 512, 1, 128, 0x20401000, 0x20420000, 0x400e0c00, false);
        return new EefcFlash(
          samBa, // samBa
          0x400000, // addr
          4096, // pages
          512, // size
          1, // planes
          128, // lockRegions
          0x20401000, // user
          0x20420000, // stack
          0x400e0c00, // regs
          0x400e1800, // reset register base
          // reset cmd
          ((RSTC_CR_KEY << 24) | RSTC_CR_PROCRST) >>> 0,
          false // canBrownout
        );
        break;
      }
      case 0xa1020c00: // E70[JQN]20
      case 0xa1120c00: // S70[JQN]20
      case 0xa1220c00: // V71[JQN]20
      case 0xa1320c00: {
        // V70[JQN]20
        // flash = new EefcFlash(samba, "ATSAM(SEV)70x20", 0x400000, 2048, 512, 1,  64, 0x20401000, 0x20420000, 0x400e0c00, false);
        return new EefcFlash(
          samBa, // samBa
          0x400000, // addr
          2048, // pages
          512, // size
          1, // planes
          64, // lockRegions
          0x20401000, // user
          0x20420000, // stack
          0x400e0c00, // regs
          0x400e1800, // reset register base
          // reset cmd
          ((RSTC_CR_KEY << 24) | RSTC_CR_PROCRST) >>> 0,
          false // canBrownout
        );
        break;
      }
      case 0xa10d0a00: // E70[JQN]19
      case 0xa11d0a00: // S70[JQN]19
      case 0xa12d0a00: // V71[JQN]19
      case 0xa13d0a00: {
        // V70[JQN]19
        // flash = new EefcFlash(samba, "ATSAM(SEV)70x19", 0x400000, 1024, 512, 1,  32, 0x20401000, 0x20420000, 0x400e0c00, false);
        return new EefcFlash(
          samBa, // samBa
          0x400000, // addr
          1024, // pages
          512, // size
          1, // planes
          32, // lockRegions
          0x20401000, // user
          0x20420000, // stack
          0x400e0c00, // regs
          0x400e1800, // reset register base
          // reset cmd
          ((RSTC_CR_KEY << 24) | RSTC_CR_PROCRST) >>> 0,
          false // canBrownout
        );
        break;
      }

      default:
        throw Error(
          `Unknown ChipID ${chipId}, unable to create EefcFlash object`
        );
    }
  }

  /**
   * init
   * @return {Promise<void>} Promise that will complete when the EEFC object
   *                   has finished initilizing.
   */
  async init(): Promise<void> {
    if (this.planes > 1) {
      // SAM3 Errata (FWS must be 6)
      await this.samBa.writeWord(this.EEFC0_FMR, 0x6 << 8);
      await this.samBa.writeWord(this.EEFC1_FMR, 0x6 << 8);
    }
  }

  /**
   * erase - erase all flash
   * @return {Promise<none>}     Promise that, when fulfilled, the flash has been
   *                       erased
   */
  async erase(): Promise<void> {
    await this.writeFCR(0, EEFC_FCMD_EA, 0);
    await this.waitForReady(0);

    if (this.planes > 1) {
      await this.writeFCR(1, EEFC_FCMD_EA, 0);
      await this.waitForReady(1);
    }
  }

  /**
   * writePage - write the provided data to the specified page
   * @param {number} page  the number of the page to store the data in
   * @param {Buffer} data  containing the data to be delivered tot he machine
   * @return {Promise<void>}     Promise that, when fulfilled, the data has been
   *                       delievered to the machine
   */
  async writePage(page: number, data: Buffer): Promise<void> {
    let plane = 0;
    let pageWithinPlane = page;
    if (this.planes > 1 && page > this.pages / 2) {
      plane = 1;
      pageWithinPlane = page - this.pages / 2;
    }

    try {
      await this.samBa.write(this.addr + page * this.size, data);
      await new Promise((r) => {setTimeout(() => r(), 10);});
      await this.writeFCR(plane, EEFC_FCMD_WP, pageWithinPlane);
      await new Promise((r) => {setTimeout(() => r(), 10);});
      await this.waitForReady(plane);
    } catch (e) {
      this._log(`writePage FAILED: ${e}`);
      // rethrow
      throw e;
    }
  }

  /**
   * verifyPage - read the  specified page and comare it to the provided data
   * @param {number} page  the number of the page to store the data in
   * @param {Buffer} data  containing the data to be delivered tot he machine
   * @return {Promise<boolean>}     Promise that, when fulfilled, the data has been
   *                       verified. Will contain a boolean value.
   */
  async verifyPage(page: number, data: Buffer): Promise<boolean> {
    try {
      return await this.samBa.verify(this.addr + page * this.size, data);
    } catch (e) {
      this._log(`writePage verify FAILED: ${e}`);
      throw e; // rethrow
    }
  }

  /**
   * setBoot - set the boot to be from flash or ROM
   * @param {boolean} flash True to boot from flash
   * @return {Promise}     Promise that is resolved once boot flags are set
   */
  async setBoot(flash: boolean = true): Promise<void> {
    await this.waitForReady();
    this._log(`set boot: ${flash ? "to flash" : "to ROM"}`);
    // The arg is a bit number, not a mask!
    // 0 is the security bit, leave that alone!!
    await this.writeFCR(0, flash ? EEFC_FCMD_SGPB : EEFC_FCMD_CGPB, 1);
    await this.waitForReady();
  }

  /**
   * reset - reset the board from software
   * @return {Promise}     Promise that is resolved once the board reset has
   *                       been requested
   */
  async reset(): Promise<void> {
    this._log(`reset command: ${this.resetCommand.toString(16)}`);
    await this.samBa.writeWord(this.RSTC_CR, this.resetCommand);
  }

  /**
   * writeFRC - set the boot to be from flash or ROM
   * @param {number} fcrNum which fcr to write to, options are 0 or 1
   * @param {number} cmd command to send to the fcr
   * @param {number} arg argument to send to the fcr (defaults to 0)
   * @return {Promise}     Promise that is resolved once boot flags are set
   */
  async writeFCR(fcrNum: number, cmd: number, arg: number): Promise<void> {
    let fcr = this.EEFC0_FCR;
    if (fcrNum == 1) {
      fcr = this.EEFC1_FCR;
    }

    await this.samBa.writeWord(fcr, (EEFC_KEY << 24) | (arg << 8) | cmd);
  }

  /**
   * waitForReady - wait for FSR to go to 1
   * @param {number} plane The flash plane to wait for
   * @return {Promise}     Promise that is resolved once the flashStatus goes
   *                       to 1
   */
  async waitForReady(plane: number = 0): Promise<void> {
    while (true) {
      this._log(
        `Checking ready (FSR): 0x${(plane == 0
          ? this.EEFC0_FSR
          : this.EEFC1_FSR
        ).toString(16)} (plane: ${plane})`
      );
      let data: number = await this._tryToReadWord(
        plane == 0 ? this.EEFC0_FSR : this.EEFC1_FSR,
        100
      );
      this._log(`FSR: 0x${data.toString(16)}`);

      if (data & 2) {
        // there was an error
        // this._log('There was an EEFC error');
        throw Error("There was an EEFC error");
      }
      if ((data & 1) === 1) {
        break;
      }
      await new Promise((r) => {
        setTimeout(() => r(), 1);
      });
    }
    if (this.planes > plane+1) {
      await this.waitForReady(plane+1);
    }
  }

  /**
   * _tryToReadWord - attempt to read address, with a 100ms timeout
   * @param {number} address The address to read
   * @param {number} times maximum number of times to try to read it
   * @return {Promise}     Promise that is resolved once the flashStatus goes
   *                       to 1
   */
  async _tryToReadWord(address: number, times: number): Promise<number> {
    while (times) {
      try {
        return await this.samBa.readWordTimeout(address, 10);
      } catch (e) {
        times--;
      }
    }

    throw Error("tried too many times");
  }

  /**
   * _log - internal use only
   * @param {string} text   value to log
   */
  _log(text: string) {
    this.samBa._log(text);
  }
} // EefcFlash
