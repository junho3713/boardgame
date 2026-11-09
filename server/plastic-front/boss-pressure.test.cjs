'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {CoopGame}=require('./public/coop-engine.js');
const {FrontGame,FrontProfile,BIKE}=require('./public/engine.js');
const patterns=require('./public/room-campaign.js').config.patterns;
function game(map='livingroom-star3'){const g=new FrontGame({},new FrontProfile(),{map});g.start();g.units=[];g.obstacles=[];g.buildings=[];g.defenses=[];return g;}
function charge(g,target){const boss=g.addUnit(2,'rhinoBeetle',target.x-60,target.y);Object.assign(boss,{boss:true,bossPattern:'rhinoCharge',bikeAttack:{phase:'charge',angle:0,remaining:360,traveled:0,hit:[]}});g.updateBike(boss,.1,patterns.rhinoCharge);return boss;}
test('rhino charge uses a shared infantry-average hit, ignores armor, and takes a smaller fraction from vehicles',()=>{
 for(const star of [1,2,3]){const g=game();g.abilities.health=g.abilities.defense=5;
  const infantry=['rifle','machinegun','sniper','rocket','mortar','medic'].map((type,i)=>{g.tech[0][type]=5;const u=g.addUnit(0,type,1500+i*30,6000);u.star=star;u.hp=u.maxHp=g.stats(u).hp;return u;});
  const tank=g.addUnit(0,'tank',1690,6000);tank.star=star;tank.hp=tank.maxHp=g.stats(tank).hp;
  const expected=infantry.reduce((n,u)=>n+u.maxHp,0)/infantry.length*.5,before=new Map([...infantry,tank].map(u=>[u.id,u.hp]));
  const boss=g.addUnit(2,'rhinoBeetle',1440,6000);Object.assign(boss,{boss:true,bossPattern:'rhinoCharge',bikeAttack:{phase:'charge',angle:0,remaining:360,traveled:0,hit:[]}});g.updateBike(boss,.45,patterns.rhinoCharge);
  for(const u of [...infantry,tank])a.ok(Math.abs(before.get(u.id)-u.hp-expected)<1e-7);a.ok(expected<tank.maxHp*.5);const hp=tank.hp;g.updateBike(boss,.1,patterns.rhinoCharge);a.equal(tank.hp,hp);
 }
});
test('rhino damage locks at telegraph start and has a finite infantry fallback when only vehicles survive',()=>{
 const g=game(),t=g.addUnit(0,'rifle',1500,6000),boss=g.addUnit(2,'rhinoBeetle',1440,6000);Object.assign(boss,{boss:true,bossPattern:'rhinoCharge',cooldown:0});a.ok(g.startBikeCharge(boss,t,patterns.rhinoCharge));const expected=t.maxHp*.5;
 a.equal(boss.bikeAttack.impactDamage,expected);g.addUnit(0,'rifle',2000,7000).maxHp=10000;const hp=t.hp;g.time=1;g.updateBike(boss,.1,patterns.rhinoCharge);a.ok(Math.abs(hp-t.hp-expected)<1e-7);
 const solo=game(),tank=solo.addUnit(0,'tank',1500,6000),baseline=solo.infantryChargeDamage(.5);a.ok(Number.isFinite(baseline)&&baseline>0&&baseline<tank.maxHp*.5);const th=tank.hp;charge(solo,tank);a.ok(Math.abs(th-tank.hp-baseline)<1e-7);
});
test('rhino charge respects dodging and both squads five-second shields',()=>{
 const g=game(),t=g.addUnit(0,'rifle',1500,6000),hp=t.hp,boss=g.addUnit(2,'rhinoBeetle',1440,5800);Object.assign(boss,{boss:true,bossPattern:'rhinoCharge',bikeAttack:{phase:'charge',angle:0,remaining:360,traveled:0,hit:[]}});g.updateBike(boss,.1,patterns.rhinoCharge);a.equal(t.hp,hp);
 for(const owner of [0,1]){const c=new CoopGame();c.start();c.obstacles=[];c.buildings=[];c.defenses=[];c.withOwner(owner,()=>{c.xp=c.neededXP();});c.levelCheck();const u=c.owned(owner)[0];u.x=1500;u.y=6000;const h=u.hp,expected=c.infantryChargeDamage(.5);c.time=4.999;charge(c,u);a.equal(u.hp,h);c.time=5;charge(c,u);a.ok(Math.abs(h-u.hp-expected)<1e-7);}
});
test('soldier boss acceleration lasts one second every two seconds and actual stab damage is tripled',()=>{
 const g=game(),boss=g.addUnit(2,'bayonetCaptain',1500,6000);Object.assign(boss,{boss:true,bossPattern:'soldierDash'});
 const base=g.stats({...boss,bossPattern:null}).damage;a.ok(Math.abs(g.stats(boss).damage-base*3)<1e-7);
 const speed=g.stats(boss).speed;for(const [time,multiplier]of [[.45,2.2],[.999,2.2],[1,1],[1.999,1],[2,2.2]]){g.time=time;boss.x=1500;g.move(boss,1000,0,.1,speed);a.ok(Math.abs(boss.x-1500-speed*.1*multiplier)<1e-7);}
 const t=g.addUnit(0,'rifle',boss.x+30,boss.y);t.hp=t.maxHp=10000;const hp=t.hp;boss.face=0;boss.cooldown=0;g.updateBayonet(boss,t,g.stats(boss));g.time+=1;g.updateBayonet(boss,t,g.stats(boss));a.ok(Math.abs(hp-t.hp-base*3*g.defenseFactor(t,boss))<1e-7);
});
test('ordinary soldiers gain ten percent damage and ordinary bike collisions retain their existing damage formula',()=>{
 const g=game(),soldier=g.addUnit(2,'bayonetCaptain',1000,6000);a.equal(g.enemyDamageScale(soldier),1.25*1.1);a.equal(BIKE.maxHpDamage,undefined);
 const t=g.addUnit(0,'rifle',1500,6000),bike=g.addUnit(2,'bikeRaider',1440,6000);bike.bikeAttack={phase:'charge',angle:0,remaining:450,traveled:0,hit:[]};const hp=t.hp,expected=g.stats(bike).damage*g.defenseFactor(t,bike);g.updateBike(bike,.1,BIKE);a.ok(Math.abs(hp-t.hp-expected)<1e-7);
});
test('the blade boss can threaten a ranged formation with a 220-range slash and 0.7-second warning',()=>{
 const g=game(),boss=g.addUnit(2,'bladeGuard',1500,6000),t=g.addUnit(0,'rifle',1700,6000);Object.assign(boss,{boss:true,bossPattern:'wideSlash',cooldown:0});t.hp=t.maxHp=10000;
 const rules=patterns.wideSlash,base=g.stats({...boss,bossPattern:null}).damage;a.equal(rules.range,220);a.equal(rules.windup,.7);a.ok(Math.abs(g.stats(boss).damage-base*2)<1e-7);
 g.updateBossSlash(boss,rules);a.ok(boss.bossAction);const hp=t.hp;g.time=.699;g.updateBossSlash(boss,rules);a.equal(t.hp,hp);g.time=.7;g.updateBossSlash(boss,rules);a.ok(t.hp<hp);
});
