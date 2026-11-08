'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame,LUCKY}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.buildings=[];g.structures=[];g.defenses=[];g.pickups=[];g.visible=g.lineClear=()=>true;return g;}
test('the seven-minute spike retains 25 percent health relief and returns continuously through twelve minutes',()=>{
 const g=scene();for(const [time,factor]of [[300,.75],[419.99,.75],[420,.75],[480,.75],[540,.8125],[600,.875],[660,.9375],[720,1],[900,1]]){
  g.time=time;const u=g.addUnit(2,'bladeGuard',1500,6000),full={...u,spawnedAt:720};near(g.stats(u).hp/g.stats(full).hp,factor);a.equal(g.stats(u).damage,g.stats(full).damage);a.equal(g.stats(u).defense,g.stats(full).defense);
 }
});
test('a seven-minute save migrates once without healing or changing boss HP',()=>{
 const g=scene();g.time=420;const u=g.addUnit(2,'stagBeetle',1500,6000);u.maxHp/= .75;u.hp=u.maxHp*.6;const boss=g.addUnit(2,'bladeGuard',1800,6000);boss.boss=true;boss.bossPattern='wideSlash';boss.hp=boss.maxHp=g.stats(boss).hp;const beforeBoss=boss.hp;g.roomHealthVersion=137;
 const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g)))),v=copy.units.find(v=>v.id===u.id);near(v.maxHp,u.maxHp*.75);near(v.hp/v.maxHp,.6);near(copy.units.find(v=>v.id===boss.id).maxHp,beforeBoss);copy.refreshRoomEnemyHealth();near(v.hp/v.maxHp,.6);
});
test('actual allied 777 impacts ignore 35 percent armor, retain edge falloff and honor shields for either cooperative owner',()=>{
 for(const coop of [false,true])for(const owner of coop?[0,1]:[0]){
  const g=scene(coop);g.time=420;const scope=fn=>coop?g.withOwner(owner,fn):fn();const source=scope(()=>g.addUnit(0,'lucky',1200,6000)),target=g.addUnit(2,'rhinoBeetle',1500,6000),armor=g.stats(target).defense;
  target.hp=target.maxHp=1e6;const before=target.hp;g.launchMissile(source,target,{damage:700});g.time=g.mortarShells.at(-1).landAt;g.updateMortars();near(before-target.hp,700*100/(100+armor*.65));a.ok(before-target.hp>700*g.defenseFactor(target,source));
  target.type='hornet';target.boss=true;target.bossPattern='venomDive';target.bossAction={phase:'high',until:g.time+5};g.launchMissile(source,target,{damage:700});const hp=target.hp;g.time=g.mortarShells.at(-1).landAt;g.updateMortars();near(target.hp,hp);
 }
 a.equal(LUCKY.missileDamage,700);a.equal(LUCKY.missiles,7);
});
