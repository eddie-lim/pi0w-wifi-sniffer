if [ -f "/home/pi/dump-01.csv" ]; then
	rm /home/pi/dump-*.csv
fi

sudo iw phy phy0 interface add mon0 type monitor
sudo ifconfig mon0 up

sudo /usr/sbin/airodump-ng --channel 1-13,36-165 --ignore-negative-one --write /home/pi/dump --output-format csv mon0
