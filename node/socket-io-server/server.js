const http = require('http');
const port = process.env.PORT || 3000;
var server = http.createServer(function (request, response) {
  let data = '';
  request.on('data', chunk => {
    data += chunk;
  })
  request.on('end', () => {
    const body = JSON.parse(data);
    console.log('body', body);
    // save to DB here
    
  })
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end("received\n");
});
server.listen( port, function () {
  console.log('Listening on port: %s', port );
});