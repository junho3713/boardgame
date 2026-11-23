'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const PREFIX = '/after-hours';
const FILES = new Map([
  ['school/index.html', 'text/html; charset=utf-8'],
  ['school/school.css', 'text/css; charset=utf-8'],
  ['school/school-night.jpg', 'image/jpeg'],
  ['school/school-state.js', 'text/javascript; charset=utf-8'],
  ['school/school-scene.js', 'text/javascript; charset=utf-8'],
  ['school/school-audio.js', 'text/javascript; charset=utf-8'],
  ['school/school-render.js', 'text/javascript; charset=utf-8'],
  ['school/handover-tape.mp3', 'audio/mpeg'],
  ['school/school-console.js', 'text/javascript; charset=utf-8'],
  ['school/school-game.js', 'text/javascript; charset=utf-8'],
  ['school/patrol.js', 'text/javascript; charset=utf-8'],
  ['school/patrol-scene.js', 'text/javascript; charset=utf-8'],
  ['school/washroom.js', 'text/javascript; charset=utf-8'],
  ['school/washroom.glb', 'model/gltf-binary'],
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
  ['suite317.js', 'text/javascript; charset=utf-8'],
  ['hotel-extension.js', 'text/javascript; charset=utf-8'],
  ['exterior-scene.js', 'text/javascript; charset=utf-8'],
  ['room-state.js', 'text/javascript; charset=utf-8'],
  ['room-layout.js', 'text/javascript; charset=utf-8'],
  ['domestic-models.js', 'text/javascript; charset=utf-8'],
  ['puzzle-tricks.js', 'text/javascript; charset=utf-8'],
  ['bath-steam.js', 'text/javascript; charset=utf-8'],
  ['rubbing-puzzle.js', 'text/javascript; charset=utf-8'],
  ['basin-water.js', 'text/javascript; charset=utf-8'],
  ['bath-audio.js', 'text/javascript; charset=utf-8'],
  ['bed-cover.js', 'text/javascript; charset=utf-8'],
  ['mirror-guest.js', 'text/javascript; charset=utf-8'],
  ['assets/models/mirror-guest.glb', 'model/gltf-binary'],
  ['assets/models/mirror-guest-female.glb', 'model/gltf-binary'],
  ['assets/guest-male.webp', 'image/webp'],
  ['assets/guest-female.webp', 'image/webp'],
  ['hotel-doors.js', 'text/javascript; charset=utf-8'],
  ['basin-flow.js', 'text/javascript; charset=utf-8'],
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
    if (pathname === PREFIX || pathname === PREFIX + '/school') {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(308, {Location: pathname + '/' + query, 'Cache-Control': 'no-store'});
      return res.end();
    }
    if (!pathname.startsWith(PREFIX + '/')) return reply(404);
    const asset = pathname.slice(PREFIX.length + 1);
    const relative = (asset === '' || asset === 'school/') ? asset + 'index.html' : asset;
    const mime = FILES.get(relative);
    if (!mime) return reply(404);
    const file = path.join(__dirname, 'public', relative);
    let size;
    try { size = (await fs.promises.stat(file)).size; } catch { return reply(404); }
    // Some mobile media players probe the first bytes, then request the frame they need.
    const audio = mime === 'audio/mpeg';
    const range = audio && req.method === 'GET' && !req.headers['if-range'] &&
      /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    let slice;
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
      if (start > end || start >= size) {
        res.writeHead(416, {'Content-Range':'bytes */' + size, 'Cache-Control':'no-store'});
        return res.end();
      }
      slice = {start, end};
    }
    res.writeHead(slice ? 206 : 200, {
      'Content-Type': mime,
      'Content-Length': slice ? slice.end - slice.start + 1 : size,
      ...(audio ? {'Accept-Ranges':'bytes'} : {}),
      ...(slice ? {'Content-Range':'bytes ' + slice.start + '-' + slice.end + '/' + size} : {}),
      'Cache-Control': relative === 'three.module.js' ? 'public, max-age=86400' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; connect-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; base-uri 'none'; frame-ancestors 'self'",
    });
    if (req.method === 'HEAD') return res.end();
    pipeline(fs.createReadStream(file, slice), res, () => {});
  };
}
module.exports = { createHandler };
