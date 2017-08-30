#!/bin/sh

sudo netconnectcli forget_wifi
sudo \cp /home/pi/.octoprint/scripts/interfaces /etc/network/interfaces
netconnectcli start_ap
echo "Netconnectd Wifi forgotten!"