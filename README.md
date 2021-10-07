# pi0w-wifi-sniffer
A proof of concept project to monitor foot traffic using WIFI sniffer via InfluxDB, implemented on Raspberry Pi Zero W

# Quick Installation
### :warning: Make sure you get the correct local ip address for you Raspberry Pi Zero W
## connect to pi via ssh:
```
ssh pi@192.168.1.20
```

## to transfer file from windows to pi:
- for whole project folder:
```
scp -r pi0w-wifi-sniffer\_info\www pi@192.168.1.20:/home/pi/www
```

- for just 1 file:
```
scp pi0w-wifi-sniffer\_info\www\index.js pi@192.168.1.20:/home/pi/www
scp pi0w-wifi-sniffer\_info\service\airodump.sh pi@192.168.1.20:/home/pi
```

## Re4son-Kernel for Raspberry Pi, which patches Raspbian with the Kali Linux kernel and adds the necessary Nexmon drivers as well
```
wget -O re4son-kernel_current.tar.xz https://re4son-kernel.com/download/re4son-kernel-current/
tar -xJf re4son-kernel_current.tar.xz
cd re4son-kernel_4*
sudo ./install.sh
```

## Aircrack-ng is a suite of tools for doing lots of stuff with Wi-Fi networks
```
sudo apt update
sudo apt install aircrack-ng
```

## Create service to start up airodump whenever we power on the Pi0W
```
sudo nano /lib/systemd/system/airodump.service
```
```
	[Unit]
	Description=airodump

	[Service]
	Type=idle
	ExecStart=/bin/bash /home/pi/airodump.sh
```

```
nano airodump.sh
```
```
	if [ -f "/home/pi/dump-01.csv" ]; then
	        rm /home/pi/dump-*.csv
	fi

	iw phy phy0 interface add mon0 type monitor
	ifconfig mon0 up

	/usr/sbin/airodump-ng --channel 1-13,36-165 --ignore-negative-one --write /home/pi/dump --output-format csv mon0
```

```
sudo nano /etc/rc.local
```
```
	.....
	fi

	sudo systemctl start airodump

	exit 0

```

## Install node for data process and communication
```
wget https://nodejs.org/dist/latest-v10.x/node-v10.23.2-linux-armv6l.tar.xz
tar -xJf node-v10.23.2-linux-armv6l.tar.xz
cd node-v10.23.2-linux-armv6l/
sudo cp -R * /usr/local/
```

## NPM relies heavily on Git being available
```
sudo apt install git
```

## Clean up
```
rm -rf node-*
rm -rf re4son-*
```

## Create a folder to contain node files
```
mkdir www
cd www
npm init
```

## Install npm packages
```
npm install axios
npm install csv-parser
npm install @influxdata/influxdb-client
```

## Create index.js and write codes for data process and endpoint trigger
```
nano index.js
```
```
	const axios = require('axios');
	const csv = require('csv-parser');
	const fs = require("fs");

	// *** INFLUX DB CONFIG ***
	const {InfluxDB} = require('@influxdata/influxdb-client');
	const token = {{your-token}};
	const org = {{your-org}};
	const bucket = {{your-bucket}};
	const client = new InfluxDB({url: {{your-url}}, token: token});
	// ************************

	function readDump(){
		const file_path =  "/home/pi/dump-01.csv";
		var is_client_section = false;
		var clients = [];
		const now =  new Date().getTime();
		const interval = 60000;
		const client_section_header_0 = "Station MAC";
		const client_section_last_seen_column = "_2";
		const client_section_mac_addr_column = "_0";

		fs.createReadStream(file_path)
			.pipe(csv())
			.on('data', (row)=>{
				if(is_client_section){
					var last_seen = new Date(row[client_section_last_seen_column]).getTime();
					if(last_seen >= now - interval){
						//console.log("row: ",row[client_section_mac_addr_column]);
						clients.push(row[client_section_mac_addr_column]);
					}
				}

				if(row[client_section_mac_addr_column] == client_section_header_0){
					is_client_section = true;
					console.log("counting number of clients scanned in the last " + interval/60000  + " min(s)");
				}

			})
			.on('end', ()=>{
				// console.log("reached end of csv file");
				clients = clients.filter((v, i, a)=> a.indexOf(v)===i);
				console.log('count: ', clients.length);
				// postCount(clients.length);
				saveToInflux(clients.length);
			});
	}

	function postCount(count){
		const url = "http://192.168.1.32:3000";
		console.log("calling " + url);
		axios.post(url,{
			"count": count
		})
		.then((res)=>{
			//console.log("res",Object.keys(res));
			console.log("status", res.status);
			console.log("statusText", res.statusText);
			console.log("data", res.data);
		})
		.catch((err)=>{
			console.log("err", err);
		})
	}

	function saveToInflux(count){
		const {Point} = require('@influxdata/influxdb-client');
		const writeApi = client.getWriteApi(org, bucket);
		const _host = 'teck_ghee_hawker_center_1';
		const _measurement = 'traffic_count';
		const _field = 'tick';
		writeApi.useDefaultTags({host: _host});

		const point = new Point(_measurement)
		.floatField(_field, count)
		writeApi.writePoint(point)
		writeApi
		.close()
		.then(() => {
			console.log('FINISHED')
		})
		.catch(e => {
			console.error(e)
			console.log('\\nFinished ERROR')
		})
	}

	function timeoutFunc(){
		console.log("");
		readDump();
		setTimeout(timeoutFunc, 60000);
	}

	timeoutFunc();
```

## Install pm2
```
sudo npm install -g pm2
```

## Run pm2
```
pm2 status
```

## Run the app under pm2
```
cd /home/pi/www
pm2 start index.js
```

## Save and resurrect apps
```
pm2 save
pm2 resurrect
```

## Run on startup
```
pm2 startup
sudo env PATH=$PATH:/usr/local/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u pi --hp /home/pi
sudo systemctl enable pm2-pi
```

## :warning:ONLY DO IT IF NEEDED. Set cronjob to reboot every 1 hour to keep it fresh
```
sudo nano /etc/crontab
```
```
	0  0     * * *   root    reboot
```

## Reboot to let everything take effect
```
sudo reboot
```


# Reference:
- [airodump](https://medium.com/swlh/scanning-for-mobile-devices-through-wi-fi-using-pi-zero-w-8099be08cc1e)

- [nodejs and npm](https://danidudas.medium.com/how-to-install-node-js-and-npm-on-raspberry-pi-zero-or-other-arm-v6-device-220d0392a426)

- [pms](https://desertbot.io/blog/nodejs-git-and-pm2-headless-raspberry-pi-install)

- [cronjob for reboot](https://www.raspberrypi.org/forums/viewtopic.php?t=126106)
