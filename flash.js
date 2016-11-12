let SerialPort = require('serialport');
let SamBA = require('./sam_ba');

let options = {
  baudRate: 115200,
  flowcontrol: ['RTSCTS'],
};
let path = '/dev/tty.usbmodem1421';

let sp = new SerialPort(path, options);
let samBa = new SamBA(sp);

sp.once('open', ()=> {
  samBa.init().then(()=>{
    console.log('done!');
    sp.close();
  });
});
