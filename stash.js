/*
   stash tiles while you're exploring them in a map.
   on a frontend map, just prefix your tile layer URL with 'http://localhost:7357/stash/' and
   requests will get routed through this lil server, which will save the tiles in standard slippy-format.
   (tile URLs look like `http://example.com/{layer}/{z}/{x}/{y}.png`)
*/
import fs from 'fs';
import express from 'express';
import request from 'request';
import mkdirp from 'mkdirp';
import cors from 'cors'

const CACHE_DIR = './tile-cache/';
const PORT = 7357;

const app = express();
app.use(cors())

app.get('/stash/:href(*)', function (req, res) {

  // parse out parts of the url to make a request
  const tileUrl = req.params.href;
  const parsed = tileUrl
    .match(/(.+)\/(\w+)\/(\d+)\/(\d+)\/([\d@x]+)\.(\w+)/)
    .slice(1, 7);

  const dir = CACHE_DIR + parsed.slice(1, 4).join('/')
  const tileFile = parsed[4] + '.' + parsed[5]
  const tilePath = dir + '/' + tileFile

  // check if the tile exists, else, grab it
  fs.stat(tilePath, function (err, stats) {

    if (!err && stats.isFile()) {
      console.log('[*] tile in cache: ' + tileFile);
      fs.createReadStream(tilePath).pipe(res);
    } else {
      // create the directory structure if it doesn't exist
      mkdirp(dir, function (err) {
        if (err) { console.log('[x] ERROR creating directory: ' + dir); }
        // request the remote tile
        console.log('[*] getting tile: ' + tileUrl);
        const tile = request(tileUrl);
        tile.pipe(fs.createWriteStream(tilePath));
        tile.pipe(res);
      });

    }
  });

});

const server = app.listen(PORT, function () {
  const host = server.address().address;
  const port = server.address().port;
  console.log('[*] app started on %s:%s', host, port);
});
