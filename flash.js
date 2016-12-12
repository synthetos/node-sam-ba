#!//usr/bin/env node

const fs = require('fs');

const SerialPort = require('serialport');
const SamBA = require('./sam_ba');
let argv = require('yargs')
  .demand(['port'])
  .alias('p', 'port')
  .describe('port', 'path to device to update')

  .describe('bin', 'path to *.bin file')
  .alias('b', 'bin')

  .boolean('boot')
  .default('boot', true)
  .alias('B', 'boot')
  .describe('boot', 'set the board to boot to flash (--no-boot to not)')

  .boolean('reset')
  .default('reset', true)
  .alias('R', 'reset')
  .describe('reset', 'reset the board (after everything else)')

  .count('debug')
  .alias('D', 'debug')
  .describe('debug', 'turn up the verbosity (a lot!)')

  .help('h')
  .alias('h', 'help')

  .argv;

let options = {
  baudRate: 921600,
  flowcontrol: ['RTSCTS'],
};

let port = argv.port || '/dev/tty.usbmodem1422';

let sp = new SerialPort(port, options);
let samBa = new SamBA(sp, argv.debug);

const EefcFlash = require('./eefc');
let eefc = null;

let processPromise = new Promise((done, fail)=>{
  sp.once('open', ()=> {
    samBa.init()
    .then(()=>{
      eefc = EefcFlash.EEFCFactory(samBa, samBa.chipId);
      return eefc.init();
    })
    .then(()=>done())
    .catch((e)=>fail(e));
  });
});

let doingSomething = false;

if (argv.bin !== undefined) {
  doingSomething = true;
  processPromise = processPromise
  .then(()=>{
    return writeBin(argv.bin);
  });
}

if (argv.boot === undefined || argv.boot === true) {
  doingSomething = true;
  processPromise = processPromise
  .then(()=>{
    console.log('setting boot-from-flash!');
    return eefc.setBoot(true);
  });
}

if (argv.reset === undefined || argv.reset === true) {
  doingSomething = true;
  processPromise = processPromise
  .then(()=>{
    console.log('resetting the board');
    return eefc.reset();
  });
}

if (doingSomething) {
  processPromise = processPromise
  .then(()=>{
    console.log('done!');
    sp.close();
  }).catch((e)=>{
    console.log(`FAILED: ${e}`);
    sp.close();
  });
}

// global store of the firmware data -- eww, I know.
let firmwareData = null;

/**
 * writeBin
 * @param  {path} firmwareBin path to the firmware .bin file
 * @return {Promise}      promise to be resolved when it's done writing
 */
function writeBin(firmwareBin) {
  return new Promise((done, fail)=>{
    fs.readFile(firmwareBin, (err, data) => {
      if (err) {
        return fail(err);
      }
      firmwareData = data;
      done();
    });
  })
  .then(()=>{
    return writePage(0);
  });
};

/**
 * writePage
 * @param  {number} page page number to write to
 * @return {Promise}      promise to write that page
 */
function writePage(page) {
  if ((page * eefc.size) < firmwareData.length) {
    console.log(`writing page ${page+1} with data from` +
      ` ${page * eefc.size} to ` +
      `${Math.min(((page+1) * eefc.size), firmwareData.length)-1} out of ` +
      `${firmwareData.length} bytes.`);

    let pageData = firmwareData.slice(page * eefc.size, (page+1) * eefc.size);
    return eefc.writePage(page, pageData)
      // .then((changed)=>{
      //   return new Promise((f)=>{
      //     setTimeout(()=>{
      //       f(changed);
      //     }, 10);
      //   });
      // })
      // .then(()=> {
      //   return waitForDone();
      // })
      .then((changed)=>{
        // console.log(`    ${changed} words changed.`);

        return writePage(page+1);
      });
  } else {
    return Promise.resolve();
  }
}
