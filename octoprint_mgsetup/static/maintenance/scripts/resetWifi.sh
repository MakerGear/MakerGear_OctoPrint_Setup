#!/bin/sh

echo "Resetting Network to AP mode and restarting printer"
sudo netconnectcli forget_wifi
sudo \cp /home/pi/.octoprint/scripts/interfaces /etc/network/interfaces
netconnectcli start_ap
echo "Netconnectd Wifi forgotten!"

sudo shutdown -r now
