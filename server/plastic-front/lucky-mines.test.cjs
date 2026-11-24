'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,LUCKY}=require('./public/engine.js');
require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');

function scene(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});
 g.start();g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];
 g.addUnit(0,'leader',1500,7010);g.visible=g.lineClear=()=>true;
 return g;
}
function retona(g,owner=0,evolved=false){
 const build=()=>{
  g.evolved.lucky=evolved;
  return g.addUnit(0,'lucky',1500,7000);
 };
 return g.coop?g.withOwner(owner,build):build();
}
function forceRoll(g,kinds,owner=0){
 const u=retona(g,owner);
 u.star=2;u.face=0;u.luckyInterval=LUCKY.interval;u.nextLuckyAt=4;
 u.luckyChannels=kinds.map(kind=>({roll:{kind,startedAt:0,endsAt:.6,resolved:false},next:4}));
 g.time=.6;
 const roll=()=>g.updateLuckyUnit(u);
 if(g.coop)g.withOwner(owner,roll);else roll();
 return u;
}
function mob(g,type,x,y=7000){return g.addUnit(2,type,x,y);}

test('Retona automatically tosses the grenade toward nearby enemies even when the commander aims away',()=>{
 const g=scene(),u=retona(g),target=mob(g,'ant',1650);
 g.setManualAim({x:-1,y:0});u.moveFace=Math.PI;
 g.castLucky(u,'mine');
 a.equal(g.luckyFlashes[0].x,target.x);a.equal(g.luckyMines.length,0);
 g.castLucky(u,'glue');a.equal(g.luckyGlues[0].x,target.x);
 g.castLucky(u,'spray');a.equal(g.luckySprays[0].target,target);
 g.castLucky(u,'missiles');a.equal(g.luckyMissileTarget(u).target,target);
});
test('each winning two-star reel throws one grenade in solo and both coop squads and retains its channel on restore',()=>{
 const outcomes=[['mine','mine','blank'],['mine','blank','mine'],['blank','mine','mine'],['mine','mine','mine']];
 for(const coop of [false,true])for(const owner of coop?[0,1]:[0])for(const kinds of outcomes){
  const g=scene(coop),u=forceRoll(g,kinds,owner),channels=kinds.flatMap((kind,i)=>kind==='mine'?[i]:[]);
  a.deepEqual(g.luckyFlashes.map(f=>f.rouletteChannel),channels);
  a.ok(g.luckyFlashes.every(f=>f.source===u&&f.startedAt===.6&&f.landAt>.6));
  const again=()=>g.updateLuckyUnit(u);
  if(coop)g.withOwner(owner,again);else again();
  a.equal(g.luckyFlashes.length,channels.length);
  const restored=unpack(scene(coop),JSON.parse(JSON.stringify(pack(g))));
  a.deepEqual(restored.luckyFlashes.map(f=>f.rouletteChannel),channels);
  a.ok(restored.luckyFlashes.every(f=>f.source===restored.units.find(v=>v.id===u.id)));
 }
});
test('a basic flash covers nearby hostiles for two seconds and interrupts attack preparations without deleting shells in flight',()=>{
 const g=scene(),u=retona(g),bomb=mob(g,'bombBug',1660),sniper=mob(g,'sniper',1670,7030),gun=mob(g,'artillery',1650,6980),other=mob(g,'artillery',2400);
 bomb.bombFuse={startedAt:0,explodeAt:.6};
 sniper.sniperAim={target:g.commander(0),fireAt:.5};
 g.crisis.phase='active';g.crisis.battery=[gun,other];g.crisis.nextEscort=10;
 g.barrages.push({source:gun,landAt:1},{source:other,landAt:2});
 g.mortarShells.push({source:gun,landAt:1});
 const flash=g.castLucky(u,'mine');
 g.time=flash.landAt-.01;g.updateLuckyFlashes();
 a.ok(bomb.bombFuse);a.equal(g.luckyFlashActive(bomb),false);
 g.time=flash.landAt;g.updateLuckyFlashes();
 a.equal(bomb.bombFuse,null);a.equal(sniper.sniperAim,null);a.equal(g.luckyFlashActive(gun),true);
 a.equal(g.luckyFlashConfused(sniper),false);a.equal(g.luckyFlashActive(other),false);
 a.equal(g.luckyFlashActive(g.commander(0)),false);a.equal(g.luckyFlashes.length,0);
 a.equal(g.mortarShells.length,1);a.deepEqual(g.barrages.map(v=>v.source),[other]);a.equal(g.crisis.canceled,1);
 g.updateArtillery();
 a.ok(g.barrages.every(v=>v.source===other));
 g.time=flash.landAt+1.99;
 a.equal(g.updateLuckyFlashEnemy(bomb,.05),true);a.equal(bomb.bombFuse,null);
 g.time=flash.landAt+2;
 a.equal(g.updateLuckyFlashEnemy(bomb,.05),false);
});
test('evolved confusion redirects projectiles to enemy units while splash leaves nearby player troops alone',()=>{
 const g=scene(true),u=retona(g,1,true),rocket=mob(g,'rocket',1630),enemy=mob(g,'ant',1800),ally=g.addUnit(0,'rifle',1790,7020);
 a.equal(g.applyLuckyFlash(rocket,{source:u,evolved:true}),true);
 rocket.cooldown=0;g.updateLuckyFlashEnemy(rocket,.05);
 const shot=g.shots.at(-1);
 a.equal(shot.target,enemy);a.equal(shot.source.coopOwner,1);a.equal(shot.team,0);a.equal(shot.source.flashRedirect,true);
 const before=ally.hp,enemyHp=enemy.hp;g.impact(shot);
 a.ok(enemy.hp<enemyHp);a.equal(ally.hp,before);
});
test('confused bomb ants start a new fuse next to hostiles and redirected chains leave all nearby allies unharmed',()=>{
 const g=scene(),u=retona(g,0,true),bomb=mob(g,'bombBug',1700),second=mob(g,'bombBug',1735),ant=mob(g,'ant',1750),ally=g.addUnit(0,'rifle',1710,7020);
 second.hp=1;ant.hp=1;
 g.applyLuckyFlash(bomb,{source:u,evolved:true});
 g.updateLuckyFlashEnemy(bomb,.05);
 a.equal(bomb.bombFuse.redirected,true);const before=ally.hp;
 g.time=bomb.bombFuse.explodeAt;g.updateLuckyFlashEnemy(bomb,.05);
 a.equal(bomb.hp,0);a.equal(second.hp,0);a.equal(ant.hp,0);a.equal(ally.hp,before);
 a.equal(g.effects.filter(e=>e.visualKind==='bombBug').length,2);
});
test('a later basic flash extends attack lock without prolonging the stronger confusion window',()=>{
 const g=scene(),u=retona(g,0,true),enemy=mob(g,'rifle',1600);
 g.applyLuckyFlash(enemy,{source:u,evolved:true});
 g.time=1;g.applyLuckyFlash(enemy,{source:u,evolved:false});
 a.equal(g.luckyFlashConfused(enemy),true);
 g.time=2;g.updateLuckyFlashEnemy(enemy,.05);
 a.equal(g.luckyFlashActive(enemy),true);a.equal(enemy.luckyFlash.confused,false);
 g.time=3;a.equal(g.updateLuckyFlashEnemy(enemy,.05),false);
});
test('flash cancels grounded boss windups and respects high-flight invulnerability',()=>{
 const g=scene(),u=retona(g),boss=mob(g,'hornet',1660);
 boss.boss=true;boss.bossPattern='venomDive';
 boss.bossAction={phase:'high'};
 a.equal(g.applyLuckyFlash(boss,{source:u,evolved:false}),false);
 a.equal(boss.bossAction.phase,'high');
 boss.bossAction={phase:'dive'};
 g.effects.push({kind:'bossDiveWarn',source:boss,x:boss.x,y:boss.y,t:1});
 a.equal(g.applyLuckyFlash(boss,{source:u,evolved:false}),true);
 a.equal(boss.bossAction,null);a.equal(boss.visualFlightHeight,48);a.equal(g.effects.at(-1).t,0);
 const sword=mob(g,'swordEmpress',1730);
 sword.swords={blades:[{action:{stage:'warn'}},{action:{stage:'active'}}],nextAttackAt:.2};
 a.equal(g.applyLuckyFlash(sword,{source:u,evolved:false}),true);
 a.ok(sword.swords.blades.every(b=>b.action===null));
 a.ok(sword.swords.nextAttackAt>=2);
});
test('legacy armed mines survive restore and detonate once after allied mine wins switch to flash grenades',()=>{
 const g=scene(),u=retona(g);
 g.luckyMines.push({x:1650,y:7000,ownerId:u.id,source:u,team:0,damage:100,armAt:.35,placedAt:0,expires:60,rulesVersion:85});
 const original=pack(g);
 delete original.fields.luckyFlashes;
 const restored=unpack(scene(),JSON.parse(JSON.stringify(original)));
 const owner=restored.units.find(v=>v.id===u.id),ant=mob(restored,'ant',1651),hp=ant.hp;
 restored.castLucky(owner,'mine');a.equal(restored.luckyMines.length,1);
 restored.time=.34;restored.updateLuckyObjects(.05);a.equal(ant.hp,hp);
 restored.time=.36;restored.updateLuckyObjects(.05);a.ok(ant.hp<hp);a.equal(restored.luckyMines.length,0);
});
