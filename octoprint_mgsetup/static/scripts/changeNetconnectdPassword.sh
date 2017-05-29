#!/bin/sh

sudo ~/oprint/bin/python2.7 ~/.octoprint/scripts/changeNetconnectdPassword.py $1
sudo systemctl netconnectd restart