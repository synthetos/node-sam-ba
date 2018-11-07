# node-sam-ba
Node library and command-line tool to flash Atmel MCUs using their SAM-BA protocol.

# NOTICE
This is currently in prerelease status. It will be refactored to be a npm module for programmatic use as well as as a command-line utility.

# Usage

1. Make sure a recent version of [node](https://nodejs.org/en/) is installed (6.9.1+).
1. Clone the github repo or download as a zip file and expand it.
1. On the comand line, cd into the new repo or expanded zip directory.
1. `npm install`
1. Obtain a `.bin` file that you wish to flash onto the board. In this example we'll use `../g2core.bin` as the path to that file.
1. Example usage:
  ```bash
  ./flash.js -p /dev/tty.usbmodem12345 -b ../g2core.bin
  ```
1. For full usage, `./flash.js -h` which currently dumps:
```
Options:
  -h, --help   Show help                                               [boolean]
  -p, --port   path to device to update                               [required]
  -b, --bin    path to *.bin file
  -B, --boot   set the board to boot to flash (--no-boot to not)
                                                       [boolean] [default: true]
  -R, --reset  reset the board (after everything else) [boolean] [default: true]
  -D, --debug  turn up the verbosity (a lot!)                            [count]
```
