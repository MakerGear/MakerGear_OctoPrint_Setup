#!/bin/sh


echo "###Starting SSH"

sudo update-rc.d ssh enable
sudo invoke-rc.d ssh start


if [ $? -eq 0 ]; then
	echo "###SSH Service Started"

else
    echo "###Error Starting SSH"
fi

