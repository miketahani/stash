/* 
   stash tiles while you're exploring them in a map.
   on a frontend map, just prefix your tile layer URL with 'http://localhost:7357/stash/' and 
   requests will get routed through this lil server, which will save the tiles in standard slippy-format.
   (tile URLs look like `http://example.com/{layer}/{z}/{x}/{y}.png`)
*/

var CACHE_DIR = './tiles/',
    PORT = 7357;

var fs = require('fs'),
    express = require('express'),
    request = require('request'),
    mkdirp = require('mkdirp');

var app = express();

// function getTile (req, tileUrl, dir, tilePath, callback) {}

app.get('/stash/:href(*)', function (req, res) {
  
  // parse out parts of the url to make a request
  var tileUrl = req.params.href;
  var parsed = tileUrl
    .match(/(.+)\/(\w+)\/(\d+)\/(\d+)\/([\d@x]+)\.(\w+)/)
    .slice(1, 7);

  var dir = CACHE_DIR + parsed.slice(1, 4).join('/'),
      tileFile = parsed[4] + '.' + parsed[5],
      tilePath = dir + '/' + tileFile;

  // check if the tile exists, else, grab it
  fs.stat(tilePath, function (err, stats) { 
    
    if (!err && stats.isFile()) { 
      console.log('[*] tile in cache: ' + tileFile);
      fs.createReadStream(tilePath).pipe(res);
    } else { 
      console.log('[*] tile not in cache: ' + tileFile);
      // create the directory structure if it doesn't exist    
      mkdirp(dir, function (err) {
        if (err) { console.log('[x] ERROR creating directory: ' + dir); }
        // request the remote tile
        console.log('[*] getting tile: ' + tileUrl);
        // NOTE: the querystring was added for grabbing mapbox studio tiles, but could have an
        // adverse effect if you're not stacking urls-as-querystrings
        var tile = request(tileUrl + req._parsedUrl.search);
        // FIXME is this async?
        tile.pipe(fs.createWriteStream(tilePath));
        tile.pipe(res);
      });
    
    }
  });
});

var server = app.listen(PORT, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('[*] app started on %s:%s', host, port);
});
