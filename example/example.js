const http = require('http');
const fs = require('fs');

const app = http.createServer(function (request, response) {
    let url = request.url;
    const shouldReturnIndex =
        request.url === '/' || request.url.includes('code') || request.url.includes('favicon.ico');
    if (shouldReturnIndex) {
        url = '/index.html';
    }
    if (request.url.includes('index.js')) {
        url = `/..${request.url}`;
    }
    response.writeHead(200);
    response.end(fs.readFileSync(__dirname + url));
});

app.listen(8888);
console.log('start localhost:8888');
