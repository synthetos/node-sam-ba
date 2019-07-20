#!/usr/bin/env node

import fs from "fs";
import { promisify } from "util";
const readFile = promisify(fs.readFile);

import SerialPort from "serialport";
import { SamBA } from "./sam_ba";

let argv = require("yargs")
  .demand(["port"])
  .alias("p", "port")
  .describe("port", "path to device to update")

  .describe("bin", "path to *.bin file")
  .alias("b", "bin")

  .boolean("boot")
  .default("boot", true)
  .alias("B", "boot")
  .describe("boot", "set the board to boot to flash (--no-boot to not)")

  .boolean("reset")
  .default("reset", true)
  .alias("R", "reset")
  .describe("reset", "reset the board (after everything else)")

  .count("debug")
  .alias("D", "debug")
  .describe("debug", "turn up the verbosity (a lot!)")

  .help("h")
  .alias("h", "help").argv;

let options = {
  baudRate: 921600,
  flowcontrol: ["RTSCTS"]
};

let port = argv.port || "/dev/tty.usbmodem1422";

let sp = new SerialPort(port, options);

import { EefcFlash } from "./eefc";

sp.once("open", async () => {
  try {
    let samBa = new SamBA(sp, argv.debug);
    await samBa.init();

    const eefc = EefcFlash.EEFCFactory(samBa, samBa.chipId);
    await eefc.init();

    if (argv.bin !== undefined) {
      await writeBin(eefc, argv.bin);
    }

    if (argv.boot === undefined || argv.boot === true) {
      console.log("setting boot-from-flash!");
      await eefc.setBoot(true);
    }

    if (argv.reset === undefined || argv.reset === true) {
      console.log("resetting the board");
      await eefc.reset();
    }

    console.log("done!");
    sp.close();
  } catch (e) {
    console.log(`FAILED: ${e}`);
    sp.close();
  }
});

/**
 * writeBin
 * @param  {path} firmwareBin path to the firmware .bin file
 * @return {Promise}      promise to be resolved when it's done writing
 */
async function writeBin(eefc: EefcFlash, firmwareBin: string): Promise<any> {
  let data = await readFile(firmwareBin);
  let firmwareData = Buffer.from(data.buffer);

  // Erase-then-write method
  // TODO: Offer option to read-erase page-write where only changed pages are written, as reading is 100x faster
  await eefc.erase();

  return write(eefc, firmwareData);
}

/**
 * writePage
 * @param  {number} page page number to write to
 * @return {Promise}      promise to write that page
 */
async function write(eefc: EefcFlash, firmwareData: Buffer): Promise<void> {
  let page = 0;
  while (page * eefc.size < firmwareData.length) {
    console.log(
      `writing page ${page + 1} with data from` +
        ` ${page * eefc.size} to ` +
        `${Math.min((page + 1) * eefc.size, firmwareData.length) - 1} out of ` +
        `${firmwareData.length} bytes.`
    );

    let pageData = firmwareData.slice(page * eefc.size, (page + 1) * eefc.size);
    await eefc.writePage(page, pageData);
    await new Promise(r => { setTimeout(() => r(), 1); });

    const passed = await eefc.verifyPage(page, pageData);
    if (!passed) {
      throw Error("VERIFY FAILED!");
    }

    page += 1;
  }
}
