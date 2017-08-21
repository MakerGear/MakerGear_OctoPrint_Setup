#!/bin/sh

sudo rm syslog.*.gz
sudo rm shaproxy.log.*.gz
sudo rm kern.log.*.gz
sudo rm messages.*
sudo rm netconnectd.log.*.gz
sudo rm daemon.*
sudo rm debu*
sudo rm haproxy*
sudo rm kern*
sudo rm messages.*
sudo rm netconnectd.log.*.gz 
sudo rm netconnectd.log.old 
sudo rm syslog.*.gz
sudo truncate -s 0 /var/log/syslog
sudo truncate -s 0 /var/log/syslog.1
sudo truncate -s 0 /var/log/netconnectd.log
sudo truncate -s 0 /var/log/netconnectd.log.1
sudo truncate -s 0 /var/log/messages
sudo truncate -s 0 /var/log/dmesg