#!/bin/sh

platformio run
/home/pi/.platformio/packages/tool-avrdude/avrdude -v -cwiring -p atmega2560 -P/dev/ttyS0 -b115200 -D -Uflash:w:.pioenvs/megaatmega2560/firmware.hex




