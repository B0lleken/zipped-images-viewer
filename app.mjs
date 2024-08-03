// app.mjs
import { createServer } from 'node:http';
import * as url from 'node:url';
import * as path from 'node:path';
import { statSync, readFile } from 'node:fs';

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || '127.0.0.1';
const publicFolder = process.env.PUBLICFOLDER || './public';

// maps the file extensions to MIME types
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

// API logic
const doAPILogic = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const ext = path.parse(pathname).ext;

  // When the path has an extension then it is not an API request, but a file request
  // and should default to a "file not found".
  if (ext !== '') {
	  notFound(res, 'File', `${publicFolder}${pathname}`);
	  return;
  }

  const requestMethod = req.method;
  const pathList = pathname.split('/');

  // remove the empty string item at the start of the pathList
  pathList.shift();

  console.dir(pathList);
  console.log('req method: ' + requestMethod);

  // Process the GET request for the "images" endpoint
  if (pathList[0] === 'images' && requestMethod === 'GET') {

  }

  // when no api logic is found then return "404 not found"
  notFound(res, 'Page', pathname);
};

const notFound = (res, contentType = '', pathname = '') => {
  let responseMessage = 'not found!';

  if (pathname !== '') {
	  responseMessage = pathname + ' ' + responseMessage;
  }

  if (contentType !== '') {
	  responseMessage = contentType + ' ' + responseMessage;
  }

  if (pathname === '' && contentType === '') {
	  responseMessage = '404 ' + responseMessage;
  }

  res.statusCode = 404;
  res.end(responseMessage);
};



// starts a http server locally on port 3000
const app = createServer((req, res) => {

  console.log(`${req.method} ${req.url}`);

  // parse URL
  const parsedUrl = url.parse(req.url);
  const originalPathname = `${parsedUrl.pathname}`;
  // extract URL path
  let pathname = `${publicFolder}${originalPathname}`;
  // based on the URL path, extract the file extension. e.g. .js, .doc, ...
  let ext = path.parse(pathname).ext;

  // By adding "throwIfNoEntry: false", we prevent the synchronous stats retrieval of the path
  // from throwing an exception and cause it to instead return "undefined" when there is no
  // filesystem entry, e.g. the path doesn't exist.
  const pathStats = statSync(pathname, { throwIfNoEntry: false });

  // check for existing path (file or directory)
  if (typeof pathStats === 'undefined') {
	  // do API logic for request
	  doAPILogic(req, res);
      return;
  }

  // check whether the path is a directory
  if (pathStats.isDirectory() === true) {
	  // check for a GET request
	  if (req.method !== 'GET') {
		  // do API logic for non-GET requests
		  doAPILogic(req, res);
		  return;
	  }

	  // When it is a GET request
	  // then search for index file matching the extension
	  const indexFileStats = statSync(pathname + '/index.html', { throwIfNoEntry: false });

	  // check for an index file
	  if (typeof indexFileStats === 'undefined') {
		  // do API logic for GET requests
		  doAPILogic(req, res);
		  return;
	  }

	  // When an index file exists, then update the ext & pathname
	  ext = '.html';
	  pathname += '/index' + ext;
  }

  // read the file from file system
  readFile(pathname, function(err, data){
	  if (err) {
		res.statusCode = 500;
		res.end(`Error getting the file: ${err}.`);
		return;
	  }

	  // when the file could be read without issues then set Content-type and send data
	  res.setHeader( 'Content-type', map[ext] || 'text/plain' );
	  res.end(data);
  });

});

app.listen(port, hostname, () => {
  console.log(`Server listening on port ${hostname}:${port}`);
});



// run with `node app.mjs`
