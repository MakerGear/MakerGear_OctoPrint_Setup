#!/bin/sh

sudo hostnamectl --no-ask-password set-hostname $1
echo "Hostname changed to " $1
sudo /home/pi/oprint/bin/python2.7 /home/pi/.octoprint/scripts/changeHostname.py $1 $2
echo "Wifi AP name and /etc/hosts changed to" $1
echo "Restarting now."
sudo shutdown -r 0
