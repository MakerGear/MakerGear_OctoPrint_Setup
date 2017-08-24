#!/bin/sh
sudo raspi-config --expand-rootfs
echo "Restarting Printer - you can close this window after the restart"

sudo shutdown -r -F 0
