#!/bin/sh

sudo netconnectcli forget_wifi
netconnectcli start_ap
echo "Netconnectd Wifi forgotten!"