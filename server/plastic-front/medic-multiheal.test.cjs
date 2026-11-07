'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js');

function scene(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star3'});g.start();
 g.units=g.units.filter(u=>u.type==='leader');g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.pickups=[];g.mission.stage=3;
 for(const method of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck','syncEnemyGrowth','move','navigate','separateCrowd','resolvePosition','autoFuseUnits'])g[method]=()=>{};
 for(const u of g.units)u.cooldown=1e6;
 return g;
}
function medic(g,{evolved=true,star=1,owner=0,x=1000}={}){
 const create=()=>{g.tech[0].medic=5;g.evolved.medic=evolved;const u=g.addUnit(0,'medic',x,6000);u.star=star;u.hp=u.maxHp=g.stats(u).hp;u.cooldown=0;return u;};
 return g.coop?g.withOwner(owner,create):create();
}
function patient(g,x,y=6000,{owner=0,team=0,hp=100,maxHp=1000}={}){
 const create=()=>{const u=g.addUnit(team,'rifle',x,y);Object.assign(u,{hp,maxHp,cooldown:1e6});return u;};
 return g.coop&&team===0?g.withOwner(owner,create):create();
}
function observe(g){const calls=[],heal=g.heal;g.heal=function(target,amount,source){const result=heal.call(this,target,amount,source);calls.push({target,amount,source,result});return result;};return calls;}
function near(actual,expected){a.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);}

test('ordinary medics keep one nearest patient while evolved medics heal the nearest three at full amount',()=>{
 for(const evolved of [false,true]){
  const g=scene(),u=medic(g,{evolved}),targets=[patient(g,1150),patient(g,1030),patient(g,1090),patient(g,1060)],calls=observe(g),amount=g.stats(u).heal;
  g.update(.05);const expected=[targets[1],targets[3],targets[2]].slice(0,evolved?3:1);
  a.deepEqual(calls.map(h=>h.target.id),expected.map(t=>t.id));a.ok(calls.every(h=>h.source===u&&h.amount===amount));
  for(const t of targets)near(t.hp,100+(expected.includes(t)?amount:0));
  const effects=g.effects.filter(e=>e.kind==='heal');a.equal(effects.length,expected.length);a.deepEqual(effects.map(e=>[e.x,e.y]),expected.map(t=>[t.x,t.y]));
  near(u.cooldown,1);
 }
});

test('a healing pulse uses distinct injured patients and clamps their HP even with fewer than three available',()=>{
 const g=scene(),u=medic(g),first=patient(g,1020,6000,{hp:999}),second=patient(g,1040),calls=observe(g);
 // A duplicated object reference must never consume two places or receive two heals.
 g.units.push(first);g.update(.05);
 a.deepEqual(calls.map(h=>h.target.id),[first.id,second.id]);near(first.hp,first.maxHp);near(second.hp,100+g.stats(u).heal);a.equal(g.effects.filter(e=>e.kind==='heal').length,2);
});

test('dead, hostile, healthy and out-of-range patients are skipped; self-healing and built repair bots remain eligible',()=>{
 const g=scene(),u=medic(g),dead=patient(g,1005,6000,{hp:0}),hostile=patient(g,1010,6000,{team:2}),healthy=patient(g,1015,6000,{hp:1000}),edge=patient(g,1340),far=patient(g,1400);
 u.hp-=10;
 const bot={id:++g.serial,kind:'repairBot',team:0,x:1030,y:6000,hp:100,maxHp:1000,buildUntil:0},unfinished={...bot,id:++g.serial,x:1020,buildUntil:100};g.buildings.push(bot,unfinished);
 const calls=observe(g);g.update(.05);a.deepEqual(calls.map(h=>h.target.id),[u.id,bot.id]);near(u.hp,u.maxHp);near(bot.hp,100+g.stats(u).heal);
 for(const t of [hostile,edge,far,unfinished])near(t.hp,100);near(dead.hp,0);near(healthy.hp,1000);
});

test('three-target treatment retains a one-second cooldown and pauses with the simulation',()=>{
 const g=scene(),u=medic(g),targets=[patient(g,1020),patient(g,1040),patient(g,1060)],calls=observe(g);g.update(.05);a.equal(calls.length,3);
 const initial=targets.map(t=>t.hp);for(let i=0;i<19;i++)g.update(.05);a.equal(calls.length,3);a.deepEqual(targets.map(t=>t.hp),initial);
 g.phase='paused';const time=g.time,cooldown=u.cooldown;for(let i=0;i<30;i++)g.update(.05);near(g.time,time);near(u.cooldown,cooldown);a.equal(calls.length,3);
 g.phase='playing';g.update(.05);a.equal(calls.length,6);for(const t of targets)near(t.hp,100+2*g.stats(u).heal);near(u.cooldown,1);
});

test('one-, two- and three-star medics keep their full existing per-patient healing amount',()=>{
 for(const star of [1,2,3]){
  const g=scene(),u=medic(g,{star}),targets=[patient(g,1020),patient(g,1040),patient(g,1060)],calls=observe(g),expected=22.4*({1:1,2:2.5,3:7.2}[star]);
  near(g.stats(u).heal,expected);g.update(.05);a.equal(calls.length,3);for(const t of targets)near(t.hp,100+expected);
 }
});

test('each cooperative owner uses their own medic evolution and star healing while selecting allied patients',()=>{
 for(const evolvedOwner of [0,1]){
  const g=scene(true),medics=[medic(g,{owner:0,evolved:evolvedOwner===0,star:2,x:1000}),medic(g,{owner:1,evolved:evolvedOwner===1,star:2,x:1800})],groups=medics.map((u,owner)=>[patient(g,u.x+20,6000,{owner:1-owner}),patient(g,u.x+40,6000,{owner}),patient(g,u.x+60,6000,{owner})]),calls=observe(g);
  g.update(.05);
  for(const [owner,u] of medics.entries()){
   const count=owner===evolvedOwner?3:1,hits=calls.filter(h=>h.source===u),amount=(owner===evolvedOwner?22.4:16)*2.5;
   a.equal(hits.length,count);near(g.stats(u).heal,amount);a.deepEqual(hits.map(h=>h.target.id),groups[owner].slice(0,count).map(t=>t.id));
   for(const [i,t] of groups[owner].entries())near(t.hp,100+(i<count?amount:0));
  }
  a.equal(g.coopOwner,0);
 }
});

test('multiple medics retain 100/60/40 percent per-patient healing efficiency',()=>{
 const g=scene(),medics=[medic(g),medic(g,{x:1002}),medic(g,{x:1004})],targets=[patient(g,1030),patient(g,1050),patient(g,1070)],calls=observe(g),amount=g.stats(medics[0]).heal;
 g.update(.05);a.equal(calls.length,9);
 for(const t of targets){const hits=calls.filter(h=>h.target===t);a.equal(hits.length,3);for(const [i,h] of hits.entries())near(h.result,amount*[1,.6,.4][i]);near(t.hp,100+amount*2);}
});

test('three-patient healing stays separate from the five-patient ten-second cleanse',()=>{
 const g=scene(),u=medic(g),nearby=[patient(g,1020),patient(g,1040),patient(g,1060)],distant=[patient(g,1500),patient(g,1600),patient(g,1700)],all=[...nearby,...distant],calls=observe(g);
 for(const t of all)t.slowUntil=30;
 g.update(.05);a.equal(calls.length,3);a.deepEqual(calls.map(h=>h.target.id),nearby.map(t=>t.id));a.equal(all.filter(t=>t.slowUntil===0).length,5);a.equal(g.effects.filter(e=>e.kind==='cleanse').length,5);near(u.nextCleanseAt,g.time+10);
 g.time=u.nextCleanseAt-.01;g.updateMedicCleanses();a.equal(all.filter(t=>t.slowUntil===0).length,5);
 g.time=u.nextCleanseAt;g.updateMedicCleanses();a.equal(all.filter(t=>t.slowUntil===0).length,6);
});

test('the actual browser worker imports evolution rewards and restores a three-patient healing pulse without CommonJS',()=>{
 const messages=[],scheduled=[],sandbox={structuredClone,setTimeout:fn=>scheduled.push(fn),postMessage:message=>messages.push(structuredClone(message))};
 sandbox.self=sandbox;const context=vm.createContext(sandbox),directory=path.join(__dirname,'public');
 sandbox.importScripts=(...urls)=>{for(const url of urls){const file=url.split('?')[0];vm.runInContext(fs.readFileSync(path.join(directory,file),'utf8'),context,{filename:file});}};
 // Exercise the production import list: Node's automatic require() must not hide a missing worker dependency.
 vm.runInContext(fs.readFileSync(path.join(directory,'autoplay-worker.js'),'utf8'),context,{filename:'autoplay-worker.js'});
 a.equal(vm.runInContext('typeof module',context),'undefined');a.equal(typeof context.FrontGame.prototype.evolutionEnabled,'function');
 const setup=vm.runInContext(`(()=>{
  const g=new FrontGame();g.start();g.units=g.units.filter(u=>u.type==='leader');g.obstacles=[];
  g.tech[0].medic=5;g.evolved.medic=true;const medic=g.addUnit(0,'medic',800,2400);medic.cooldown=0;
  const patients=[825,850,875].map(x=>{const u=g.addUnit(0,'rifle',x,2400);u.hp=u.maxHp/2;u.cooldown=100;return u;});
  const p=new FrontAutoPilot(g);p.active=true;p.nextThink=100;p.nextBuild=100;p.nextPermanent=100;
  return{snapshot:p.snapshot(),ids:patients.map(u=>u.id),before:patients.map(u=>u.hp),amount:g.stats(medic).heal};
 })()`,context);
 context.onmessage({data:{snapshot:structuredClone(setup.snapshot),seconds:.05}});
 for(let count=0;scheduled.length&&count<20;count++)scheduled.shift()();
 a.equal(scheduled.length,0);a.equal(messages.filter(m=>m.error).length,0,JSON.stringify(messages.filter(m=>m.error)));
 const done=messages.find(m=>m.type==='done');a.ok(done,'worker must finish its real advance request');near(done.processed,.05);
 const restored=context.FrontAutoPilot.restore(done.snapshot).game;
 for(const [i,id] of setup.ids.entries()){const patient=restored.units.find(u=>u.id===id);a.ok(patient);near(patient.hp,setup.before[i]+setup.amount);}
 a.equal(restored.effects.filter(e=>e.kind==='heal').length,3);
});
