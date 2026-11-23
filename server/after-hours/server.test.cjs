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
    assert.match(html,/href="school\/"/);
    const schoolRedirect=await fetch(origin+'/after-hours/school?from=lobby',{redirect:'manual'});
    assert.equal(schoolRedirect.status,308);
    assert.equal(schoolRedirect.headers.get('location'),'/after-hours/school/?from=lobby');
    const school=await fetch(origin+'/after-hours/school/');
    assert.equal(school.status,200);
    assert.match(await school.text(),/마지막 종례/);
    for(const file of ['school-game.js','school-scene.js','school-state.js','school-console.js','school-audio.js','school.css','school-night.jpg']){
      const resource=await fetch(origin+'/after-hours/school/'+file,{method:'HEAD'});
      assert.equal(resource.status,200,file);
      assert.ok(Number(resource.headers.get('content-length'))>100);
    }
    assert.match(html, /316호에서 눈뜨기/);
    assert.match(html, /name="guestAppearance" value="male" checked/);
    assert.match(html, /name="guestAppearance" value="female"/);
    for(const name of ['guest-male.webp','guest-female.webp']){
      const portrait=await fetch(origin+'/after-hours/assets/'+name);
      assert.equal(portrait.status,200,name);
      assert.equal(portrait.headers.get('content-type'),'image/webp');
      assert.equal(Buffer.from(await portrait.arrayBuffer()).toString('ascii',8,12),'WEBP');
    }
    const extension = await fetch(origin + '/after-hours/hotel-extension.js');
    assert.equal(extension.status, 200);
    assert.match(extension.headers.get('content-type'), /javascript/);
    assert.match(await extension.text(), /buildHotelExtension/);
    for (const name of ['puzzle-tricks.js','rubbing-puzzle.js','bath-steam.js','basin-flow.js','basin-water.js','bath-audio.js','hotel-doors.js','bed-cover.js','room-search.js','search-state.js','puzzles.css','suite-puzzles.js','puzzle-evidence.js','puzzle-props.js','style.css', 'game.js', 'test-starts.js', 'room-state.js', 'room-layout.js', 'room-scene.js', 'domestic-models.js', 'room-details.js', 'twin-room.js', 'exterior-scene.js', 'Reflector.js', 'GLTFLoader.js', 'BufferGeometryUtils.js', 'three.module.js', 'THREE-LICENSE.txt','assets/hotel-photo.jpg','assets/rainy-town-night.jpg','assets/herringbone_parquet_Diffuse.jpg']) {
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
    for(const name of ['bathroom-316.glb','kitchen-316.glb','wall-clock-316.glb','lounge-316.glb','bedroom-fixtures-316.glb','guestroom-317.glb','suite-details-316.glb','twin-room-316.glb','mirror-guest-female.glb']){
      const response=await fetch(origin+'/after-hours/assets/models/'+name);assert.equal(response.status,200,name);assert.equal(response.headers.get('content-type'),'model/gltf-binary');const data=Buffer.from(await response.arrayBuffer());assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(8),data.length);
    }
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
