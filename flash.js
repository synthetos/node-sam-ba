#!//usr/bin/env node

const fs = require('fs');

const SerialPort = require('serialport');
const SamBA = require('./sam_ba');
let argv = require('yargs')
  .demand(['bin','port'])
  .argv;

let options = {
  baudRate: 115200,
  flowcontrol: ['RTSCTS'],
};

let port = argv.port || '/dev/tty.usbmodem1422';

let sp = new SerialPort(port, options);
let samBa = new SamBA(sp);

const EefcFlash = require('./eefc');
let eefc = null;

let firmwareBin = argv.bin;
let firmwareData = null;

let readPromise = new Promise((done, fail)=>{
  fs.readFile(firmwareBin, (err, data) => {
    if (err) {
      return fail(err);
    }
    firmwareData = data;
    done();
  });
});

let spOpenPromise = new Promise((done, fail)=>{
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

Promise.all([readPromise, spOpenPromise])
  // .then(()=>{
  //   return samBa.read(eefc.flashBlob._sfixed, eefc.flashBlob.blob.length);
  // })
  // .then((data)=>{
  //   console.log(`data: ${data.toString('hex')}`);
  //   return samBa.go(eefc.flashBlob.flashInit);
  // })
  // .then(()=>{
  //   return samBa.readWord(eefc.flashBlob.inited);
  // })
  // .then((data)=>{
  //   console.log(`inited: ${data.toString(16)}`);
  // })
  .then(()=>{
    return writePage(0);
  })
  .then(()=>{
    console.log('done!');
    sp.close();
  }).catch((e)=>{
    console.log(`FAILED: ${e}`);
    sp.close();
  });

/**
 * writePage
 * @param  {number} page page number to write to
 * @return {Promise}      promise to write that page
 */
function writePage(page) {
  if ((page * eefc.size) < firmwareData.length) {
    console.log(`writing page ${page} with data from` +
      ` ${page * eefc.size} to ` +
      `${Math.min(((page+1) * eefc.size), firmwareData.length)-1} out of ` +
      `${firmwareData.length} bytes.`);

    let pageData = firmwareData.slice(page * eefc.size,
            Math.min(((page+1) * eefc.size), firmwareData.length)-1);
    return eefc.writePage(page, pageData)
      .then(()=>{
        return new Promise((f)=>{
          setTimeout(()=>{
            f();
          }, 100);
        });
      })
      // .then(()=> {
      //   return waitForDone();
      // })
      .then(()=>{
        return writePage(page+1);
      });
  } else {
    return Promise.resolve();
  }
}

/**
 * wiatForDone - wait for eefc.flashBlob.flashStatus to go to 1
 * @return {Promise} Promise that is resolved once the flashStatus goes to 1
 */
function waitForDone() {
  return new Promise((f)=>{
    return samBa.readWord(eefc.flashBlob.flashStatus);
  })
  .then((data)=>{
    console.log(`flashStatus: ${data.toString(16)}`);
    if (data == 0) {
      return f();
    } else {
      return waitForDone();
    }
  });
}
