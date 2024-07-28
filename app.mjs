// app.mjs
import { createServer } from 'node:http';
import * as url from 'node:url';
import * as path from 'node:path';
import { createReadStream, exists, statSync, readFile } from 'node:fs';

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || '127.0.0.1';
const publicFolder = process.env.PUBLICFOLDER || './public';

// starts a http server locally on port 3000
createServer((req, res) => {
  //res.writeHead(200, { 'Content-Type': 'text/html' });
  //createReadStream('public/index.html').pipe(res);
  
  console.log(`${req.method} ${req.url}`);

  // parse URL
  const parsedUrl = url.parse(req.url);
  const originalPathname = `${parsedUrl.pathname}`;
  // extract URL path
  let pathname = `${publicFolder}${originalPathname}`;
  // based on the URL path, extract the file extension. e.g. .js, .doc, ...
  let ext = path.parse(pathname).ext;
  // maps file extension to MIME typere
  const map = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword'
  };

  exists(pathname, function (exist) {
    if (!exist) {
      // if the file is not found, return 404
      res.statusCode = 404;
      res.end(`File ${originalPathname} not found!`);
      return;
    }

    // if is a directory search for index file matching the extension
    if (statSync(pathname).isDirectory()) {
		ext = ext || '.html';
		pathname += '/index' + ext;
	}

    // read file from file system
    readFile(pathname, function(err, data){
      if (err) {
        res.statusCode = 500;
        res.end(`Error getting the file: ${err}.`);
      } else {
        // if the file is found, set Content-type and send data
        res.setHeader( 'Content-type', map[ext] || 'text/plain' );
        res.end(data);
      }
    });
  });
  
}).listen(port, hostname, () => {
  console.log(`Server listening on port ${hostname}:${port}`);
});

// run with `node app.mjs`
