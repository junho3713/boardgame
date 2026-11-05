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
    res.writeHead(200, {...headers, 'Content-Length': stat.size});
    if (req.method === 'HEAD') return res.end();
    pipeline(fs.createReadStream(file), res, () => {});
  };
}
module.exports = {createHandler};
