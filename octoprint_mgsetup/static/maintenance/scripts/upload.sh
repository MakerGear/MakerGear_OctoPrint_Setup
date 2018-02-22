#!/bin/sh
echo "###Trying to compile & upload firmware. "

cd /home/pi/m3firmware/

echo "M300 S659 P500" > /dev/ttyS0
platformio run --target clean -s
#platformio run --target clean
platformio run -s
#platformio run

if [ $? -eq 0 ]; then
    echo "###Firmware has Compiled Correctly"
    echo "M300 S659 P500" > /dev/ttyS0
	echo "M300 S859 P500" > /dev/ttyS0
    echo "Begin Upload"
	/home/pi/.platformio/packages/tool-avrdude/avrdude -q -q -cwiring -p atmega2560 -P/dev/ttyS0 -b115200 -D -Uflash:w:.pioenvs/megaatmega2560/firmware.hex
	#/home/pi/.platformio/packages/tool-avrdude/avrdude -v -cwiring -p atmega2560 -P/dev/ttyS0 -b115200 -D -Uflash:w:.pioenvs/megaatmega2560/firmware.hex
	
	if [ $? -eq 0 ]; then
    echo "###Firmware has Uploaded Correctly"
    
	else
	    echo "###Firmware has Failed Upload - Ending Script"
	fi


else
    echo "###Firmware has Failed to Compile  - Ending Script"
fi






