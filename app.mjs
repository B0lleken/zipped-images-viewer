// app.mjs
import { createServer } from 'node:http';
import * as url from 'node:url';
import * as path from 'node:path';
import { statSync, readdirSync, readFile } from 'node:fs';
import StreamZip from 'node-stream-zip';

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || '127.0.0.1';
const publicFolder = process.env.PUBLICFOLDER || './public';
const imagesFolder = process.env.IMAGESFOLDER || './images';
const maxImageAmount = process.env.MAXIMAGEAMOUNT || 24;
// get all the names of the files inside the "images" folder
const imagesNameList = readdirSync(imagesFolder, { withFileTypes: true })
		  .filter(item => !item.isDirectory())
		  .map(item => item.name);

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

const isNumeric = (num) => (typeof(num) === 'number' || typeof(num) === "string" && num.trim() !== '') && !isNaN(num);

// API logic
const doAPILogic = async (req, res) => {
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
  const responseJSON = [];

  // remove the empty string item at the start of the pathList
  pathList.shift();

  console.dir(pathList);
  console.log('req method: ' + requestMethod);

  // Process the GET request for the "images" endpoint
  if (pathList[0] === 'images' && requestMethod === 'GET') {
	  console.log('.');

	  // the second path value should be an integer as it will be used to retrieve the image zip file
	  if (isNumeric(pathList[1]) === true) {
		  console.log('..');

		  // get the zip file at index "pathList[1]"
		  // we are first converting the string to a number and then to an integer
		  // to first change a possible 1e3 to 1000 and then remove any decimals
		  const filename = imagesNameList[parseInt(Number(pathList[1]))];

		  console.dir(imagesNameList);
		  console.log('filename: ' + filename);

		  console.log("idx: " + parseInt(Number(pathList[1])));
		  console.log("number: " + Number(pathList[1]));
		  console.log("pathlist[1] value: " + pathList[1]);

		  if (typeof filename !== 'undefined') {
			  const zip = new StreamZip.async({ file: `${imagesFolder}/${filename}` });

			  console.log(`Reading zip file: ${imagesFolder}/${filename}`);

			  // Check the "part" value of the path
			  // this will be used for pagination so that only a set amount of images is processed at a time
			  if (typeof pathList[2] === 'undefined' || pathList[2] === 'part') {
				  const part = (isNumeric(pathList[3]) === true) ? parseInt(Number(pathList[3])) : 0;
				  const entriesCount = await zip.entriesCount;

				  console.log(`Entries read: ${entriesCount}`);

				  const entries = await zip.entries();
				  // change entries object to an easier loopable array list
				  const entriesList = Object.values(entries);
				  const startAmount = part * maxImageAmount;
				  const maxAmount = startAmount + maxImageAmount;

				  console.log('startAmount: ' + startAmount);
				  console.log('maxAmount: ' + maxAmount);

				  // TODO: instead of extract, stream the images instead?
				  // https://www.npmjs.com/package/node-stream-zip
				  for (let i = startAmount; i < maxAmount; i++) {
					  const entry = entriesList[i];

					  console.dir(entry);

					  // skip loop when no entry is found
					  if (typeof entry === 'undefined') {
						  continue;
					  }

					  // skip entries that are directories
					  // todo: check for a better solution ?
					  if (entry.isDirectory === true) {
						  continue;
					  }

					  // image paths for inside the zip & output folder
					  const imageFilename = entry.name;
					  // TODO: add zip filename as well instead of just image filename to prevent
					  //    ... mixing extracted files from other zip files
					  const newImageFilename = `/tmp/${imageFilename.split('/').pop()}`;

					  console.log('processing entry: ' + imageFilename);

					  // only extract when image does not exist yet
					  const imageFileStats = statSync(`${publicFolder}${newImageFilename}`, { throwIfNoEntry: false });

					  if (typeof imageFileStats === 'undefined') {
						  console.log('extracting entry: ' + imageFilename);

						  // TODO: make sure the extraction folder(s) exist before extracting the files to them
						  // extract files and place in "temporary" (public) folder
						  await zip.extract(imageFilename, `${publicFolder}${newImageFilename}`);

						  console.log('extracted to: ' + `${publicFolder}${newImageFilename}`);
					  }

					  responseJSON.push(newImageFilename);
				  }

				  // Do not forget to close the file once you're done
				  await zip.close();
			  }

			  res.setHeader('Content-Type', 'application/json');
			  res.end(JSON.stringify(responseJSON, null, 3));
			  return;
		  }
	  }
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
