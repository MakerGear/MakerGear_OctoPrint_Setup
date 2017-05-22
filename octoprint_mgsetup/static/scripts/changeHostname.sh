#!/bin/sh

sudo hostnamectl --no-ask-password set-hostname $1
sudo ~/OctoPrint/venv/bin/python2.7 ~/.octoprint/scripts/changeHostname.py $1
