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
const EEFC_FCMD_SGPB = 0xB;
const EEFC_FCMD_CGPB = 0xC;
// const EEFC_FCMD_GGPB = 0xd;

const RSTC_CR_KEY = 0xA5;
const RSTC_CR_PROCRST = (1 << 0);
const RSTC_CR_PERRST = (1 << 2);

/**
 * EEFC routing class
 */
class EefcFlash {
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
  constructor(samBa, addr, pages, size, planes, lockRegions, user, stack,
              regs, resetRegisterBase, resetCommand, canBrownout) {
    this.samBa = samBa;
    this.addr = addr;
    this.pages = pages;
    this.size = size;
    this.planes = planes;
    this.lockRegions = lockRegions;
    this.user = user;
    this.stack = stack;
    this.regs = regs;
    this.resetRegisterBase = resetRegisterBase;
    this.resetCommand = resetCommand;
    this.canBrownout = canBrownout;

    this.EEFC0_FMR = (this.regs + 0x00);
    this.EEFC0_FCR = (this.regs + 0x04);
    this.EEFC0_FSR = (this.regs + 0x08);
    this.EEFC0_FRR = (this.regs + 0x0C);

    this.EEFC1_FMR = (this.regs + 0x200);
    this.EEFC1_FCR = (this.regs + 0x204);
    this.EEFC1_FSR = (this.regs + 0x208);
    this.EEFC1_FRR = (this.regs + 0x20C);

    this.RSTC_CR = (this.resetRegisterBase + 0x00);
    // this.RSTC_SR = (this.resetRegisterBase + 0x04);
    // this.RSTC_MR = (this.resetRegisterBase + 0x08);


    this.bufferNum = 0;
  }

/**
 * EEFCFactory - generate an EEFC object based on the chipId provided
 * @param  {SamBA}  samBa  class object
 * @param  {number} chipId the chipId as reported by the machine
 * @return {EEFC}          the EEFC object associated with chipId
 */
  static EEFCFactory(samBa, chipId) {
    switch (chipId) {
      // SAM3X8n
      case 0x286e0a60: // 8H
      case 0x285e0a60: // 8E
      case 0x284e0a60: // 8C
      {
        return new EefcFlash(
            samBa,      // samBa
            0x80000,    // addr
            2048,       // pages
            256,        // size
            2,          // planes
            32,         // lockRegions
            0x20001000, // user
            0x20010000, // stack
            0X400E0A00, // regs
            0x400E1A00, // reset register base
                        // reset cmd
            ((RSTC_CR_KEY << 24) | RSTC_CR_PROCRST | RSTC_CR_PERRST) >>> 0,
            false       // canBrownout
            );
        break;
      }
      // SAM E70, S70, V70, V71
      case 0xA1020E00: // E70[JQN]21
      case 0xA1120E00: // S70[JQN]21
      case 0xA1220E00: // V71[JQN]21
      // NB. there is no V70[JQN]21
      {
        //  flash = new EefcFlash(samba, "ATSAM(SEV)70x21", 0x400000, 4096, 512, 1, 128, 0x20401000, 0x20420000, 0x400e0c00, false);
        return new EefcFlash(
            samBa,      // samBa
            0x400000,    // addr
            4096,       // pages
            512,        // size
            1,          // planes
            128,         // lockRegions
            0x20401000, // user
            0x20420000, // stack
            0X400E0C00, // regs
            0x400E1800, // reset register base
                        // reset cmd
            ((RSTC_CR_KEY << 24) | RSTC_CR_PROCRST) >>> 0,
            false       // canBrownout
            );
        break;
      }
      case 0xA1020C00: // E70[JQN]20
      case 0xA1120C00: // S70[JQN]20
      case 0xA1220C00: // V71[JQN]20
      case 0xA1320C00: // V70[JQN]20
      {
        // flash = new EefcFlash(samba, "ATSAM(SEV)70x20", 0x400000, 2048, 512, 1,  64, 0x20401000, 0x20420000, 0x400e0c00, false);
        return new EefcFlash(
            samBa,      // samBa
            0x400000,    // addr
            2048,       // pages
            512,        // size
            1,          // planes
            64,         // lockRegions
            0x20401000, // user
            0x20420000, // stack
            0X400E0C00, // regs
            0x400E1800, // reset register base
                        // reset cmd
            ((RSTC_CR_KEY << 24) | RSTC_CR_PROCRST) >>> 0,
            false       // canBrownout
            );
        break;
      }
      case 0xA10D0A00: // E70[JQN]19
      case 0xA11D0A00: // S70[JQN]19
      case 0xA12D0A00: // V71[JQN]19
      case 0xA13D0A00: // V70[JQN]19
      {
        // flash = new EefcFlash(samba, "ATSAM(SEV)70x19", 0x400000, 1024, 512, 1,  32, 0x20401000, 0x20420000, 0x400e0c00, false);
        return new EefcFlash(
            samBa,      // samBa
            0x400000,    // addr
            1024,       // pages
            512,        // size
            1,          // planes
            32,         // lockRegions
            0x20401000, // user
            0x20420000, // stack
            0X400E0C00, // regs
            0x400E1800, // reset register base
                        // reset cmd
            ((RSTC_CR_KEY << 24) | RSTC_CR_PROCRST) >>> 0,
            false       // canBrownout
            );
        break;
      }

      default:
        return null;
    }
  }

  /**
   * init
   * @return {Promise} Promise that will complete when the EEFC object
   *                   has finished initilizing.
   */
  init() {
    let p = Promise.resolve();

    if (this.planes > 1) {
      p = p.then(()=>{
        // SAM3 Errata (FWS must be 6)
        return this.samBa.writeWord(this.EEFC0_FMR, 0x6 << 8);
      })
      .then(()=>{
        return this.samBa.writeWord(this.EEFC1_FMR, 0x6 << 8);
      });
    }

    return p;
  }

  /**
   * erase - erase all flash
   * @return {Promise}     Promise that, when fulfilled, the flash has been
   *                       erased
   */
  erase() {
    return this.writeFCR(0, EEFC_FCMD_EA, 0)
    .then(()=>{
      return this.waitForReady(0);
    })
    .then(()=>{
      if ((this.planes > 1)) {
        return this.writeFCR(1, EEFC_FCMD_EA, 0)
        .then(()=>{
          return this.waitForReady(1);
        });
      }
      return Promise.resolve();
    })
    ;
  }

  /**
   * writePage - write the provided data to the specified page
   * @param {number} page  the number of the page to store the data in
   * @param {Buffer} data  containing the data to be delivered tot he machine
   * @return {Promise}     Promise that, when fulfilled, the data has been
   *                       delievered to the machine
   */
  writePage(page, data) {
    let plane = 0;
    let pageWithinPlane = page;
    if ((this.planes > 1) && (page > (this.pages/2))) {
      plane = 1;
      pageWithinPlane = page - (this.pages/2);
    }

    return this.samBa.write(this.addr + (page*this.size), data)
    .then(()=>{
      return this.writeFCR(plane, EEFC_FCMD_WP, pageWithinPlane);
    })
    .then(()=>{
      return this.waitForReady(plane);
    })
    .catch((e)=>{
      this._log(`writePage FAILED: ${e}`);
      return Promise.reject(e);
    })
    ;
  }


    /**
     * verifyPage - read the  specified page and comare it to the provided data
     * @param {number} page  the number of the page to store the data in
     * @param {Buffer} data  containing the data to be delivered tot he machine
     * @return {Promise}     Promise that, when fulfilled, the data has been
     *                       verified. Will contain a boolean value.
     */
    verifyPage(page, data) {
      return this.samBa.verify(this.addr + (page*this.size), data)
      .catch((e)=>{
        this._log(`writePage FAILED: ${e}`);
        return Promise.reject(e);
      })
      ;
    }

  /**
   * setBoot - set the boot to be from flash or ROM
   * @param {boolean} flash True to boot from flash
   * @return {Promise}     Promise that is resolved once boot flags are set
   */
  setBoot(flash = true) {
    return this.waitForReady()
    .then(()=>{
      this._log(`set boot: ${flash ? 'to flash' : 'to ROM'}`);
      // The arg is a bit number, not a mask!
      // 0 is the security bit, leave that alone!!
      return this.writeFCR(0,
        flash ? EEFC_FCMD_SGPB : EEFC_FCMD_CGPB, 1);
    })
    .then(()=>{
      return this.waitForReady();
    });
  }

  /**
   * reset - reset the board from software
   * @return {Promise}     Promise that is resolved once the board reset has
   *                       been requested
   */
  reset() {
    this._log(`reset command: ${this.resetCommand.toString(16)}`);
    return this.samBa.writeWord(this.RSTC_CR, this.resetCommand);
  }

  /**
   * writeFRC - set the boot to be from flash or ROM
   * @param {number} fcrNum which fcr to write to, options are 0 or 1
   * @param {number} cmd command to send to the fcr
   * @param {number} arg argument to send to the fcr (defaults to 0)
   * @return {Promise}     Promise that is resolved once boot flags are set
   */
  writeFCR(fcrNum, cmd, arg) {
    let fcr = this.EEFC0_FCR;
    if (fcrNum == 1) {
      fcr = this.EEFC1_FCR;
    }

    return this.samBa.writeWord(
      fcr, ((EEFC_KEY << 24) | (arg << 8) | cmd)
    );
  }

  /**
   * waitForReady - wait for FSR to go to 1
   * @param {number} plane The flash plane to wait for
   * @return {Promise}     Promise that is resolved once the flashStatus goes
   *                       to 1
   */
  waitForReady(plane = 0) {
    this._log(`Checking ready (FSR): 0x${
      ((plane == 0) ? this.EEFC0_FSR : this.EEFC1_FSR).toString(16)
    } (plane: ${plane})`);
    return this._tryToReadWord(
      (plane == 0) ? this.EEFC0_FSR : this.EEFC1_FSR,
      100
    )
    .then((data)=>{
      this._log(`FSR: 0x${data.toString(16)}`);
      if ((data & 2)) {
        // there was an error
        // this._log('There was an EEFC error');
        return Promise.reject('There was an EEFC error');
      }
      if ((data & 1) === 1) {
        if ((plane == 0) && (this.planes > 1)) {
          return this.waitForReady(1);
        }
        return Promise.resolve();
      } else {
        return this.waitForReady(plane);
      }
    });
  }

  /**
   * _tryToReadWord - attempt to read address, with a 100ms timeout
   * @param {number} address The address to read
   * @param {number} times maximum number of times to try to read it
   * @return {Promise}     Promise that is resolved once the flashStatus goes
   *                       to 1
   */
  _tryToReadWord(address, times) {
    return new Promise((finish, reject)=>{
      this.samBa.readWordTimeout(address, 500)
      .then((v)=>{
        return finish(v);
      })
      .catch(()=>{
        if (times == 0) {
          reject('tried too many times');
          return;
        }
        return this._tryToReadWord(address, times-1);
      });
    });
  }


    /**
     * _log - internal use only
     * @param {string} text   value to log
     */
    _log(text) {
      this.samBa._log(text);
    }
} // EefcFlash

module.exports = EefcFlash;
