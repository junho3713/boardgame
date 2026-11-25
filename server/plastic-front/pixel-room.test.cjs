'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {FrontGame}=require('./public/engine.js');
require('./public/two-star.js');
const {pack,unpack}=require('./public/autoplay.js');
const make=map=>new FrontGame({},undefined,{map});

test('the pixel battlefield uses the living room layout, wave schedule, manual fire and two-star fusion',()=>{
 const pixel=make('livingroom-pixel'),room=make('livingroom-star');
 assert.equal(pixel.battlefieldId(),'livingroom-pixel');
 assert.equal(pixel.waveRules(),room.waveRules());
 assert.deepEqual(pixel.obstacles,room.obstacles);
 assert.deepEqual(pixel.bases,room.bases);
 assert.equal(pixel.isRoomCampaign(),true);
 pixel.start();pixel.setManualAim({x:-1,y:0});
 assert.equal(Math.abs(pixel.manualAimAngle()),Math.PI);
 pixel.cash[0]=10000;pixel.phase='choice';assert.equal(pixel.buy('rifle'),true);
 assert.equal(pixel.twoStarCount('rifle'),1);
 const restored=unpack(make('backyard'),pack(pixel));
 assert.equal(restored.battlefieldId(),'livingroom-pixel');assert.equal(restored.twoStarCount('rifle'),1);
 assert.equal(unpack(pixel,pack(room)).pixelRoom,false);
});
test('retired outpost links select the pixel room; existing defense saves retain their progress on the bedroom floor',()=>{
 assert.equal(make('desktop-star').battlefieldId(),'livingroom-pixel');
 const defense=make('bedroom-star');defense.start();
 defense.time=315;defense.cash[0]=411;defense.bases[0].hp=2376;defense.buildings[0].hp=123;
 const save=pack(defense);
 Object.assign(save.fields,{mapId:'desktop',desktopStar:true,bedroomStar:false});
 Object.assign(save.fields.world,{id:'desktop',variant:'desktop-star',width:2800,height:3200});
 const restored=unpack(make('backyard'),save);
 assert.equal(restored.battlefieldId(),'bedroom-star');assert.equal(restored.world.variant,'bedroom-star');
 assert.equal(restored.time,315);assert.equal(restored.cash[0],411);assert.equal(restored.bases[0].hp,2376);
 assert.equal(restored.buildings[0].hp,123);assert.equal(restored.alive(0).length,defense.alive(0).length);
 assert.equal(restored.waveRules(),defense.waveRules());assert.deepEqual(restored.obstacles,defense.obstacles);
});
test('the current picker serves independent classic and pixel room previews and closes the outpost',()=>{
 const dir=path.join(__dirname,'public'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(html,/name="battlefield" value="livingroom-star"/);
 assert.match(html,/name="battlefield" value="livingroom-pixel"/);assert.doesNotMatch(html,/value="desktop-star"/);
 assert.match(html,/name="battlefield" value="desktop"/);
 assert.ok(fs.existsSync(path.join(dir,'assets/previews/start-livingroom-pixel.png')));
});
