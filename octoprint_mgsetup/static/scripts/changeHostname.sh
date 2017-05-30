#!/bin/sh

sudo hostnamectl --no-ask-password set-hostname $1
sudo /home/pi/oprint/bin/python2.7 /home/pi/.octoprint/scripts/changeHostname.py $1 $2
sudo shutdown -r 0