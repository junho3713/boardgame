'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,ROSTER}=require('./public/engine.js');require('./public/two-star.js');const wave=require('./public/wave-test.js'),{pack}=require('./public/autoplay.js');
test('every minute recommendation produces a legal, growing army on all three room variants',()=>{
 for(const map of ['livingroom','livingroom-star','livingroom-star3']){
  const original=new FrontGame({},undefined,{map,medicSkin:'rina'}),before=JSON.stringify(pack(original));let lastLevel=0;
  for(let time=0;time<=1200;time+=60){const g=wave.fork(original),c=wave.recommended(g,time),v=wave.validateLoadout(g,c);wave.seek(g,time);wave.applyLoadout(g,c);
   a.equal(g.level,c.level);a.ok(c.level>=lastLevel);lastLevel=c.level;a.equal(g.alive(0).length-1,v.size);a.ok(v.size<=g.capacity());a.ok(g.selectedAbilities().length<=5);
   for(const u of g.alive(0)){a.equal(u.hp,g.stats(u).hp);a.equal(u.maxHp,g.stats(u).hp);if(u.type==='medic')a.equal(u.appearance,'rina');}
  }a.equal(JSON.stringify(pack(original)),before);
 }
});
test('custom upgrades, stars, evolution and cooldown readiness affect actual combat stats without changing permanent upgrades',()=>{
 for(const [map,stars]of [['livingroom-star',2],['livingroom-star3',3]]){
  const g=wave.fork(new FrontGame({},undefined,{map}));wave.seek(g,900);const c=wave.recommended(g,900);c.counts=Object.fromEntries(ROSTER.map(t=>[t,t==='lucky'||t==='medic'?9:0]));c.tech.lucky=c.tech.medic=5;c.abilities.speed=c.abilities.defense=5;
  const permanent={...g.profile.upgrades};wave.applyLoadout(g,c);a.equal(g.evolved.lucky,true);a.equal(g.evolved.medic,true);a.deepEqual(g.profile.upgrades,permanent);
  const lucky=g.alive(0).find(u=>u.type==='lucky');a.equal(lucky.star,stars);a.equal(g.stats(lucky).name,'슈퍼 럭키 레토나');a.equal(g.ultimate.readyAt,g.time);
  a.equal(g.alive(0).filter(u=>u.type==='lucky').length,stars===2?3:1);
 }
});
test('invalid custom setups reject atomically rather than silently dropping troops or upgrades',()=>{
 const g=wave.fork(new FrontGame({},undefined,{map:'livingroom'}));wave.seek(g,720);const before=JSON.stringify(pack(g));
 for(const change of [c=>c.counts.rifle=9,c=>c.level=NaN,c=>{c.tech.medic=0;c.counts.medic=1;},c=>Object.keys(c.abilities).forEach(k=>c.abilities[k]=1),c=>ROSTER.forEach(k=>{c.tech[k]=1;c.counts[k]=8;})]){const c=wave.recommended(g,720);change(c);a.throws(()=>wave.applyLoadout(g,c));a.equal(JSON.stringify(pack(g)),before);}
});
test('repeated late and early setups rebuild once with no accumulated troops, level-ups, or stale poison',()=>{
 const g=wave.fork(new FrontGame({},undefined,{map:'livingroom-star3'}));
 for(const time of [1200,240,900,0]){wave.seek(g,time);g.commander(0).poisonUntil=time+4;const c=wave.recommended(g,time);wave.applyLoadout(g,c);a.equal(g.xp,0);a.equal(g.commander(0).poisonUntil,0);a.equal(g.alive(0).length-1,wave.validateLoadout(g,c).size);}
});
