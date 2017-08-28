#!/bin/sh


gpio -g mode 4 out
gpio -g write 4 0
gpio -g write 4 1
gpio -g mode 4 out
gpio -g mode 4 up

#/home/pi/oprint/bin/octoprint client command "/api/connection" "disconnect"

#gpio -g mode 4 out
#gpio -g write 4 0
#gpio -g write 4 1
#gpio -g mode 4 out
#gpio -g mode 4 up

#/home/pi/oprint/bin/octoprint client command "/api/connection" "connect"