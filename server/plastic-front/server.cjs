'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');

const PREFIX = '/plastic-front';
const ROOT = path.join(__dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8',
};

function audioRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match || (!match[1] && !match[2])) return undefined;
  const suffix = match[1] === '';
  const start = suffix ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = suffix || !match[2] ? size - 1 : Math.min(Number(match[2]), size - 1);
  return start <= end ? {start, end} : null;
}

function createHandler() {
  const coop = require('./coop-server.cjs').createCoopHandler();
  return async function servePlasticFront(req, res) {
    if (req.url.split('?')[0].startsWith('/plastic-front/api/coop/')) return coop(req,res);
    const reply = (status) => { res.writeHead(status, {'Cache-Control': 'no-store'}); res.end(); };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return reply(405);
    }
    let pathname;
    try { pathname = decodeURIComponent(req.url.split('?')[0]); } catch { return reply(400); }
    if (pathname === PREFIX) {
      res.writeHead(308, {Location: PREFIX + '/' + (req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '')});
      return res.end();
    }
    if (!pathname.startsWith(PREFIX + '/')) return reply(404);
    let relative = pathname.slice(PREFIX.length + 1);
    if (!relative) relative = 'index.html';
    if (relative.includes('\\') || relative.includes('\0') || relative.split('/').some(part => part.startsWith('.'))) return reply(404);
    const file = path.resolve(ROOT, relative);
    if (!file.startsWith(ROOT + path.sep)) return reply(404);
    const type = TYPES[path.extname(file).toLowerCase()];
    if (!type) return reply(404);
    let stat;
    try { stat = await fs.promises.stat(file); } catch { return reply(404); }
    if (!stat.isFile()) return reply(404);
    const etag = 'W/"' + stat.size.toString(16) + '-' + Math.trunc(stat.mtimeMs).toString(16) + '"';
    const headers = {
      'Content-Type': type, 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': /\.(?:html|js|css|json)$/.test(file) ? 'no-cache' : 'public, max-age=3600',
      'ETag': etag,
    };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    let range;
    if (type === 'audio/mpeg' || type === 'audio/wav') {
      headers['Accept-Ranges'] = 'bytes';
      if (req.method === 'GET' && !req.headers['if-range']) {
        range = audioRange(req.headers.range, stat.size);
      }
      if (range === null) {
        res.writeHead(416, {...headers, 'Content-Range': 'bytes */' + stat.size});
        return res.end();
      }
      if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
    }
    res.writeHead(range ? 206 : 200, {
      ...headers, 'Content-Length': range ? range.end - range.start + 1 : stat.size
    });
    if (req.method === 'HEAD') return res.end();
    pipeline(fs.createReadStream(file, range), res, () => {});
  };
}
module.exports = {createHandler};
