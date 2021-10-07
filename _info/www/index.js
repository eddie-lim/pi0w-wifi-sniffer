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
