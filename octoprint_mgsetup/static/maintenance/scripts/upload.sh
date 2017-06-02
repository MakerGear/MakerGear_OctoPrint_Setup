#!/bin/sh
echo "Trying to upload firmware."
cd /home/pi/m3firmware
echo "M300 S659 P500" > /dev/ttyS0

platformio run

echo "M300 S659 P500" > /dev/ttyS0
echo "M300 S859 P500" > /dev/ttyS0
/home/pi/.platformio/packages/tool-avrdude/avrdude -v -cwiring -p atmega2560 -P/dev/ttyS0 -b115200 -D -Uflash:w:.pioenvs/megaatmega2560/firmware.hex
echo "Firmware uploaded!"
