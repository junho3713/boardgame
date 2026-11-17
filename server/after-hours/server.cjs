'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const PREFIX = '/after-hours';
const FILES = new Map([
  ['index.html', 'text/html; charset=utf-8'],
  ['style.css', 'text/css; charset=utf-8'],
  ['puzzles.css', 'text/css; charset=utf-8'],
  ['suite-puzzles.js', 'text/javascript; charset=utf-8'],
  ['puzzle-evidence.js', 'text/javascript; charset=utf-8'],
  ['puzzle-props.js', 'text/javascript; charset=utf-8'],
  ['room-search.js', 'text/javascript; charset=utf-8'],
  ['search-state.js', 'text/javascript; charset=utf-8'],
  ['game.js', 'text/javascript; charset=utf-8'],
  ['room-scene.js', 'text/javascript; charset=utf-8'],
  ['hotel-extension.js', 'text/javascript; charset=utf-8'],
  ['exterior-scene.js', 'text/javascript; charset=utf-8'],
  ['room-state.js', 'text/javascript; charset=utf-8'],
  ['room-layout.js', 'text/javascript; charset=utf-8'],
  ['domestic-models.js', 'text/javascript; charset=utf-8'],
  ['room-details.js', 'text/javascript; charset=utf-8'],
  ['twin-room.js', 'text/javascript; charset=utf-8'],
  ['test-starts.js', 'text/javascript; charset=utf-8'],
  ['Reflector.js', 'text/javascript; charset=utf-8'],
  ['GLTFLoader.js', 'text/javascript; charset=utf-8'],
  ['BufferGeometryUtils.js', 'text/javascript; charset=utf-8'],
  ['assets/models/twin-room-316.glb', 'model/gltf-binary'],
  ['assets/models/guestroom-317.glb', 'model/gltf-binary'],
  ['assets/models/suite-details-316.glb', 'model/gltf-binary'],
  ['assets/models/bed-316.glb', 'model/gltf-binary'],
  ['assets/models/bathroom-316.glb', 'model/gltf-binary'],
  ['assets/models/kitchen-316.glb', 'model/gltf-binary'],
  ['assets/models/wall-clock-316.glb', 'model/gltf-binary'],
  ['assets/models/lounge-316.glb', 'model/gltf-binary'],
  ['assets/models/bedroom-fixtures-316.glb', 'model/gltf-binary'],
  ['assets/herringbone_parquet_Diffuse.jpg', 'image/jpeg'],
  ['assets/herringbone_parquet_nor_gl.jpg', 'image/jpeg'],
  ['assets/herringbone_parquet_Rough.jpg', 'image/jpeg'],
  ['assets/decrepit_wallpaper_Diffuse.jpg', 'image/jpeg'],
  ['assets/decrepit_wallpaper_nor_gl.jpg', 'image/jpeg'],
  ['assets/decrepit_wallpaper_Rough.jpg', 'image/jpeg'],
  ['assets/quatrefoil_jacquard_fabric_Diffuse.jpg', 'image/jpeg'],
  ['assets/quatrefoil_jacquard_fabric_nor_gl.jpg', 'image/jpeg'],
  ['assets/quatrefoil_jacquard_fabric_Rough.jpg', 'image/jpeg'],
  ['assets/hotel-photo.jpg', 'image/jpeg'],
  ['assets/rainy-town-night.jpg', 'image/jpeg'],
  ['credits.txt', 'text/plain; charset=utf-8'],
  ['three.module.js', 'text/javascript; charset=utf-8'],
  ['THREE-LICENSE.txt', 'text/plain; charset=utf-8'],
]);
function createHandler() {
  return async function serveAfterHours(req, res) {
    const reply = status => { res.writeHead(status, {'Cache-Control': 'no-store'}); res.end(); };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return reply(405);
    }
    let pathname;
    try { pathname = decodeURIComponent(req.url.split('?')[0]); }
    catch { return reply(400); }
    if (pathname === PREFIX) {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(308, {Location: PREFIX + '/' + query, 'Cache-Control': 'no-store'});
      return res.end();
    }
    if (!pathname.startsWith(PREFIX + '/')) return reply(404);
    const relative = pathname.slice(PREFIX.length + 1) || 'index.html';
    const mime = FILES.get(relative);
    if (!mime) return reply(404);
    const file = path.join(__dirname, 'public', relative);
    let size;
    try { size = (await fs.promises.stat(file)).size; } catch { return reply(404); }
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': size,
      'Cache-Control': relative === 'three.module.js' ? 'public, max-age=86400' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; connect-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; base-uri 'none'; frame-ancestors 'self'",
    });
    if (req.method === 'HEAD') return res.end();
    pipeline(fs.createReadStream(file), res, () => {});
  };
}
module.exports = { createHandler };
