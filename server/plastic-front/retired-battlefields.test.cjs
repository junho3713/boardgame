'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {FrontGame}=require('./public/engine');
require('./public/two-star');
const {pack,unpack}=require('./public/autoplay');
const {FrontRunSave}=require('./public/run-save');

test('retired map URLs lead to the final assault and the picker only lists supported maps',()=>{
 for(const map of ['bedroom-star','factory-star','livingroom-pixel','desktop-star']){
  assert.equal(new FrontGame({},undefined,{map}).battlefieldId(),'livingroom-assault');
 }
 const menu=fs.readFileSync(__dirname+'/public/index.html','utf8');
 const maps=[...menu.matchAll(/name="battlefield" value="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(maps,['livingroom-assault','livingroom-star','backyard','desktop','livingroom']);
 for(const file of ['bedroom-star.js','pixel-room.js','pixel-infantry.js','pixel-promotion.css','assets/bedroom','assets/pixel-room']){
  assert.equal(fs.existsSync(__dirname+'/public/'+file),false,file);
 }
});

test('retired checkpoints cannot revive a deleted map and supported checkpoints still load',()=>{
 const game=new FrontGame({},undefined,{map:'livingroom-assault'});
 game.phase='playing';
 const storage=new Map();
 const save=new FrontRunSave({
  getItem:key=>storage.get(key)??null,
  setItem:(key,value)=>storage.set(key,value),
  removeItem:key=>storage.delete(key)
 });
 assert.equal(save.save(game),true);
 const current=storage.get(save.key);
 assert.equal(save.load().game.battlefieldId(),'livingroom-assault');
 for(const obsolete of [{pixelRoom:true},{bedroomStar:true},{factoryStar:true},{desktopStar:true},{world:{id:'bedroom'}}]){
  const stored=JSON.parse(current);
  Object.assign(stored.engine.fields,obsolete);
  storage.set(save.key,JSON.stringify(stored));
  assert.equal(save.load(),null);
  assert.throws(()=>unpack(new FrontGame(),{...stored.engine,profile:game.profile.snapshot()}),/retired/);
 }
 const desktop=new FrontGame({},undefined,{map:'desktop'});
 assert.equal(unpack(new FrontGame(),pack(desktop)).battlefieldId(),'desktop');
});
