#!/bin/sh


/home/pi/oprint/bin/octoprint client command '/api/job' 'cancel'

/home/pi/oprint/bin/octoprint client command "/api/connection" "disconnect"
#/bin/sleep 10

gpio -g mode 4 out
gpio -g write 4 0
gpio -g write 4 1
gpio -g mode 4 out
gpio -g mode 4 up

#

/home/pi/oprint/bin/octoprint client command "/api/connection" "connect"

/home/pi/oprint/bin/octoprint client command "/api/plugin/mgsetup" "flushPrintActive"
