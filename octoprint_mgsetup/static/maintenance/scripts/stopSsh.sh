#!/bin/sh

echo "###Stopping SSH"

sudo update-rc.d ssh disable
sudo invoke-rc.d ssh stop


if [ $? -eq 0 ]; then
	echo "###SSH Service Stopped"

else
    echo "###Error Stopping SSH"
fi

