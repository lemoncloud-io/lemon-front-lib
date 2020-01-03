const http = require('http');
const fs = require('fs');

const app = http.createServer(function(request,response){
    let url = request.url;
    if (request.url === '/' || request.url.includes('code')) {
        url = '/index.html';
    }
    if (request.url.includes('lemon.front.bundle.js')) {
        url = `/..${request.url}`;
    }
    response.writeHead(200);
    response.end(fs.readFileSync(__dirname + url));
});

app.listen(8888);
console.log('start localhost:8888');
