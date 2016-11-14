let SerialPort = require('serialport');
let SamBA = require('./sam_ba');
let FlashBlob = require('./upload-blob/output/flasher-sam3x');

let options = {
  baudRate: 115200,
  flowcontrol: ['RTSCTS'],
};
let path = '/dev/tty.usbmodem1421';

let sp = new SerialPort(path, options);
let samBa = new SamBA(sp);

let flashBlob = new FlashBlob();

sp.once('open', ()=> {
  samBa.init()
  .then(()=>{
    samBa.setJumpData(flashBlob.stack_address, flashBlob.jump_address);
    return samBa.write(flashBlob._sfixed, flashBlob.blob);
  })
  .then(()=>{
    return samBa.go(flashBlob.flashInit);
  })
  .then(()=>{
    return samBa.readWord(flashBlob.inited);
  })
  .then((data)=>{
    console.log(`inited: ${data.toString(16)}`);
    return samBa.writeWord(flashBlob.EFCIndex, 0);
  })
  .then(()=>{
    return samBa.go(flashBlob.readFlashInfo);
  })
  .then(()=>{
    return samBa.read(flashBlob.flashDescriptor, 28);
  })
  .then((data)=>{
    let pos = 0;
    console.log(`FL_ID: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_SIZE: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_PAGE_SIZE: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_NB_PLANE: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_PLANE[0]: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_PLANE[1]: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_PLANE[2]: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;

    return samBa.writeWord(flashBlob.EFCIndex, 1);
  })
  .then(()=>{
    return samBa.go(flashBlob.readFlashInfo);
  })
  .then(()=>{
    return samBa.read(flashBlob.flashDescriptor, 28);
  })
  .then((data)=>{
    let pos = 0;
    console.log(`FL_ID: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_SIZE: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_PAGE_SIZE: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_NB_PLANE: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_PLANE[0]: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_PLANE[1]: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;
    console.log(`FL_PLANE[2]: ` +
      `0x${data.readUInt32LE(pos).toString(16)}`); pos += 4;

    console.log('done!');
    sp.close();
  }).catch((e)=>{
    console.log(`FAILED: ${e}`);
    sp.close();
  });
});
