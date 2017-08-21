#!/bin/sh

sudo rm /var/log/syslog.*.gz
sudo rm /var/log/messages.*
sudo rm /var/log/netconnectd.log.*.gz
sudo rm /var/log/daemon.*
sudo rm /var/log/debu*
sudo rm /var/log/haproxy*
sudo rm /var/log/kern*
sudo rm /var/log/user*
sudo rm /var/log/auth*
sudo rm /var/log/alternatives*
sudo rm /var/log/boot*
sudo rm /var/log/dpkg*
sudo rm /var/log/webcamd*
sudo rm /var/log/map_iface*
sudo rm /var/log/bootstrap*
sudo rm /var/log/messages.*
sudo rm /var/log/netconnectd.log.old 
sudo truncate -s 0 /var/log/syslog
sudo truncate -s 0 /var/log/syslog.1
sudo truncate -s 0 /var/log/netconnectd.log
sudo truncate -s 0 /var/log/netconnectd.log.1
sudo truncate -s 0 /var/log/messages
sudo truncate -s 0 /var/log/dmesg