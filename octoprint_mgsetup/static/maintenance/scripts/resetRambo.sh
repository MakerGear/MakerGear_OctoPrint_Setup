#!/bin/sh
#this will trigger the resetWatch.py and disconnect/reconnect, as long as API mode is enabled
gpio -g mode 4 out
gpio -g write 4 0
sleep .5
gpio -g write 4 1
gpio -g mode 4 out
gpio -g mode 4 up
