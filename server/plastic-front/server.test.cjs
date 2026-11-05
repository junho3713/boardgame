'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {createApp} = require('../girl-lobby/server.cjs');

async function withApp(run) {
  const app = createApp();
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${app.address().port}`); }
  finally { await new Promise(resolve => app.close(resolve)); }
}

test('Plastic Front runs under a subpath alongside the existing board games', async () => withApp(async origin => {
  const redirect = await fetch(origin + '/plastic-front?mode=idle', {redirect: 'manual'});
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), '/plastic-front/?mode=idle');
  const page = await fetch(origin + '/plastic-front/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /플라스틱 프론트/);
  for (const [url, mime] of [
    ['engine.js?v=178', 'text/javascript'], ['style.css', 'text/css'],
    ['autoplay-worker.js?v=178', 'text/javascript'],
    ['assets/models/manifest.json', 'application/json'],
    ['boss-test.html', 'text/html'],
  ]) {
    const res = await fetch(origin + '/plastic-front/' + url);
    assert.equal(res.status, 200, url);
    assert.ok(res.headers.get('content-type').startsWith(mime), url);
    const etag = res.headers.get('etag');
    assert.equal((await fetch(origin + '/plastic-front/' + url, {headers: {'If-None-Match': etag}})).status, 304);
    await res.arrayBuffer();
  }
  for (const route of ['/', '/healthz', '/avalon/', '/splendor3/']) {
    const res = await fetch(origin + route);
    assert.equal(res.status, 200, route);
    await res.arrayBuffer();
  }
}));

test('static hosting rejects traversal, source files and unsupported methods', async () => withApp(async origin => {
  // Raw HTTP preserves dot segments instead of normalizing them like fetch does.
  for (const route of ['/plastic-front/%2e%2e/server.cjs', '/plastic-front/%2e%2e%5cserver.cjs',
    '/plastic-front/.git/config', '/plastic-front/%00', '/plastic-front/server.cjs',
    '/plastic-front/assets/', '/plastic-front/missing.js', '/plastic-fronted/']) {
    const status = await new Promise((resolve, reject) => {
      http.get(origin + route, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
    });
    assert.equal(status, 404, route);
  }
  assert.equal((await fetch(origin + '/plastic-front/', {method: 'POST'})).status, 405);
  const head = await fetch(origin + '/plastic-front/engine.js', {method: 'HEAD'});
  assert.equal(head.status, 200);
  assert.ok(Number(head.headers.get('content-length')) > 1000);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
}));
