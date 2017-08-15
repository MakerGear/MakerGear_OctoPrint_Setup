#!/bin/sh

sudo ln -s /var/log/dmesg /home/pi/.octoprint/logs/dmesg
sudo ln -s /var/log/messages /home/pi/.octoprint/logs/messages
sudo ln -s /var/log/syslog /home/pi/.octoprint/logs/syslog
sudo ln -s /var/log/syslog /home/pi/.octoprint/logs/syslog.1
sudo ln -s /var/log/netconnectd.log /home/pi/.octoprint/logs/netconnectd.log
sudo ln -s /var/log/netconnectd.log /home/pi/.octoprint/logs/netconnectd.log.1