'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../girl-lobby/server.cjs');

test('hotel assets load under their prefix alongside existing games', async () => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const redirect = await fetch(origin + '/after-hours?mode=explore', {redirect:'manual'});
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get('location'), '/after-hours/?mode=explore');
    const page = await fetch(origin + '/after-hours/');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /connect-src 'self' blob:/);
    const html = await page.text();
    assert.match(html, /316호에서 눈뜨기/);
    for (const name of ['style.css', 'game.js', 'room-state.js', 'room-layout.js', 'room-scene.js', 'exterior-scene.js', 'Reflector.js', 'GLTFLoader.js', 'BufferGeometryUtils.js', 'three.module.js', 'THREE-LICENSE.txt','assets/hotel-photo.jpg','assets/rainy-town-night.jpg','assets/herringbone_parquet_Diffuse.jpg']) {
      const r = await fetch(origin + '/after-hours/' + name);
      assert.equal(r.status, 200, name);
      assert.ok(Number(r.headers.get('content-length')) > 100, name);
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      await r.arrayBuffer();
    }
    const model = await fetch(origin + '/after-hours/assets/models/bed-316.glb?v=20261117-long-tuft');
    assert.equal(model.status, 200);
    assert.equal(model.headers.get('content-type'), 'model/gltf-binary');
    const bytes = Buffer.from(await model.arrayBuffer());
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    assert.ok(gltf.nodes.some(node => node.name === 'Bed316_ROOT'));
    assert.equal(gltf.images.length, 15);
    assert.ok(gltf.images.every(image => image.bufferView !== undefined && !image.uri));
    assert.equal(gltf.cameras, undefined);
    const modelHead = await fetch(origin + '/after-hours/assets/models/bed-316.glb', {method:'HEAD'});
    assert.equal(modelHead.status, 200);
    assert.equal(Number(modelHead.headers.get('content-length')), bytes.length);
    assert.equal((await modelHead.arrayBuffer()).byteLength, 0);
    const head = await fetch(origin + '/after-hours/game.js', {method:'HEAD'});
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    for (const route of ['server.cjs', '../server.cjs', '%2e%2e%2fserver.cjs', '%5cserver.cjs', 'missing.js']) {
      assert.equal((await fetch(origin + '/after-hours/' + route)).status, 404, route);
    }
    assert.equal((await fetch(origin + '/after-hours/%XX')).status, 400);
    const post = await fetch(origin + '/after-hours/', {method:'POST'});
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
    for (const route of ['/', '/healthz', '/plastic-front/']) {
      assert.equal((await fetch(origin + route)).status, 200, route);
    }
    const solo = await fetch(origin + '/api/solo', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name:'배포 확인', bots:2}),
    });
    assert.equal(solo.status, 201);
    assert.equal((await solo.json()).state.phase, 'playing');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
