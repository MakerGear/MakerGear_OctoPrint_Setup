#!/bin/sh

echo "Patching system logs into octoprint"

echo "remove old links"
sudo rm /home/pi/.octoprint/logs/dmesg
sudo rm /home/pi/.octoprint/logs/messages
sudo rm /home/pi/.octoprint/logs/syslog
sudo rm /home/pi/.octoprint/logs/syslog.1
sudo rm /home/pi/.octoprint/logs/netconnectd.log
sudo rm /home/pi/.octoprint/logs/netconnectd.log.1


echo "try to create new links"

if [ -e /var/log/dmesg ]
then
    sudo ln -s /var/log/dmesg /home/pi/.octoprint/logs/dmesg
    echo "dmesg linked"
fi


if [ -e /var/log/messagesg ]
then
    sudo ln -s /var/log/messages /home/pi/.octoprint/logs/messages
    echo "messages linked"
fi

if [ -e /var/log/syslog ]
then
    sudo ln -s /var/log/syslog /home/pi/.octoprint/logs/syslog
    echo "syslog linked"
fi

if [ -e /var/log/syslog.1 ]
then
    sudo ln -s /var/log/syslog /home/pi/.octoprint/logs/syslog.1
    echo "syslog.1 linked"
fi

if [ -e /var/log/netconnectd.log ]
then
    sudo ln -s /var/log/netconnectd.log /home/pi/.octoprint/logs/netconnectd.log
    echo "netconnectd.log linked"
fi

if [ -e /var/log/netconnectd.log.1 ]
then
    sudo ln -s /var/log/netconnectd.log /home/pi/.octoprint/logs/netconnectd.log.1
    echo "netconnectd.log.1 linked"
fi

echo 'Finished'





