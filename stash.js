// Simple proxy to cache/store data. Special handling for map tiles to store them
// in the layer/z/x/y directory format. WARNING This is a one-off tool, so expect
// it to fail loudly.
// To use, prefix clientside outbound URLs with `http://localhost:7357/stash/`
// (make sure to URL-encode the tile URL) and add `?type=tile` as a suffix
// if you're fetching tiles.
import fs, { promises as fsp } from 'fs';
import express from 'express';
import request from 'request';
import cors from 'cors'
import path from 'path'

const CACHE_DIR = './cache';
const PORT = 7357;

const app = express();
app.use(cors())

// Bit of premature optimization to make it easier to add special handling
// in the future
const Resource = {
  tile: {
    getLocalPath(url) {
      const parsed = url
        .match(/(.+)\/(\w+)\/(\d+)\/(\d+)\/([\d@x]+)\.(\w+)/)
        .slice(1, 7)
      const [, layer, z, x, y, ext] = parsed
      return {
        url,
        parsed: { layer, z, x, y, ext },
        dir: path.join(CACHE_DIR, layer, z, x),
        filename: `${y}.${ext}`,
      }
    },
    log: {
      exists: ({ parsed: { layer, z, x, y, ext } }) => {
        const tile = [layer, z, x, y].join('/')
        console.log(`[!] tile in cache: ${tile}.${ext}`)
      },
      missing: ({ url }) => {
        console.log(`[+] retrieving tile: ${url}`)
      }
    }
  },
  default: {
    getLocalPath(url) {
      const filename = atob(url)
      return {
        url,
        dir: CACHE_DIR,
        filename,
      }
    },
    log: {
      exists: ({ url }) => {
        console.log(`[!] resource in cache: ${url}`)
      },
      missing: ({ url }) => {
        console.log(`[+] retrieving resource: ${url}`)
      }
    }
  }
}

app.get('/stash/:href(*)', async (req, res) => {
  const href = req.params.href;
  const resourceType = req.query.type;

  const resource = Resource[resourceType] || Resource.default;
  const localPath = resource.getLocalPath(href);
  const { dir, url } = localPath;
  const filepath = path.join(localPath.dir, localPath.filename);

  try {
    await fsp.stat(filepath)
    resource.log.exists(localPath)
    fs.createReadStream(filepath).pipe(res);
  } catch (e) {
    resource.log.missing(localPath)
    await fsp.mkdir(dir, { recursive: true })
    const recv = request(url);
    // Write local cache
    recv.pipe(fs.createWriteStream(filepath));
    // Send response
    recv.pipe(res);
  }
});

const server = app.listen(PORT, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log('[*] app started on %s:%s', host, port);
});
