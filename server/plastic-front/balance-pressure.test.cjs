'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame,ROSTER}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const {config}=require('./public/room-campaign.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function scene(map='livingroom-star',coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.structures=[];g.defenses=[];g.buildings=[];g.pickups=[];for(const c of g.units)Object.assign(c,{x:1500,y:6000,cooldown:1e6});g.random=()=>.99;return g;}

test('all allied roster ranks use the same health and weapon scales, including the radio operator',()=>{
 for(const type of ROSTER){
  const g=scene();g.tech[0][type]=5;g.abilities.health=3;g.abilities.damage=2;g.evolved[type]=true;
  const u=g.addUnit(0,type,1500,6000),one=g.stats(u),lucky=type==='lucky'?g.luckyScale(u):null;
  for(const [rank,damage,hp,speed,heal] of [[2,2.9,2.2,1.15,2.5],[3,8,5.5,1.3,7.2]]){
   u.star=rank;
   const s=g.stats(u);
   near(s.damage,one.damage*damage);near(s.hp,one.hp*hp);
   near(s.rate,one.rate/(type==='medic'?1:speed));
   near(s.range,one.range*speed);near(s.splash,one.splash*speed);
   near(s.speed,one.speed);near(s.defense,one.defense);
   if(type==='medic')near(s.heal,one.heal*heal);
   if(type==='lucky')near(g.luckyScale(u)*3,lucky*damage);
  }
 }
 const g=scene(),enemy=g.addUnit(2,'tank',1500,6000),one=g.stats(enemy);
 enemy.star=3;assert.deepEqual(g.stats(enemy),one);
 const regular=scene('livingroom'),unit=regular.addUnit(0,'rifle',1500,6000),ordinary=regular.stats(unit);
 unit.star=3;assert.deepEqual(regular.stats(unit),ordinary);
});

test('old two-star saves immediately adopt the requested HP without healing, reviving or changing cooperative ownership',()=>{
 const g=scene('livingroom-star',true),ids=[];
 for(const owner of [0,1])g.withOwner(owner,()=>{g.tech[0].rifle=owner?5:2;const u=g.addUnit(0,'rifle',1500+owner*100,6000),one=g.stats(u).hp;u.star=owner?3:2;u.maxHp=one*(owner?7.8:2.5);u.hp=u.maxHp*.37;ids.push({id:u.id,owner,hp:one*(owner?5.5:2.2)});});
 const dead=g.withOwner(0,()=>g.addUnit(0,'rifle',1700,6000));dead.star=2;dead.hp=0;
 const copy=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));
 for(const record of ids){const u=copy.units.find(v=>v.id===record.id);near(u.maxHp,record.hp);near(u.hp/u.maxHp,.37);assert.equal(u.coopOwner,record.owner);const hp=u.hp;copy.upgradeBalance();near(u.hp,hp);}
 assert.equal(copy.units.find(v=>v.id===dead.id).hp,0);
});

test('opening ants ramp out of their extra HP reduction before the general five-to-eight-minute recovery',()=>{
 const g=scene();for(const [at,factor]of [[0,.375],[120,.375],[180,.375],[210,.5625],[240,.75],[300,.75],[360,5/6],[420,11/12],[480,1],[600,1],[900,1]]){g.time=at;const u=g.addUnit(2,'ant',1500,6000);near(g.enemyHealthScale(u)/config.combat.hpScale,factor);}
 g.time=420;const u=g.addUnit(2,'ant',1500,6000),full=g.stats({...u,spawnedAt:480}).hp;u.maxHp=full*.75;u.hp=u.maxHp*.4;g.roomHealthVersion=138;
 const restored=unpack(scene(),JSON.parse(JSON.stringify(pack(g)))),v=restored.units.find(t=>t.id===u.id);near(v.maxHp,full*11/12);near(v.hp/v.maxHp,.4);restored.refreshRoomEnemyHealth();near(v.hp/v.maxHp,.4);
});

test('midgame and late ordinary wave pressure grows without increasing boss attack or removing opening limits',()=>{
 const g=scene();g.roomBeat=()=>({density:1.3,name:'test'});g.time=420;assert.equal(g.roomWavePlan().count,14);
 const r=config.encirclement,p=config.evolutionPacing,saved={...r};try{g.roomBeat=()=>({density:1,name:'test'});for(const at of [180,300,420,600,780,900]){g.time=at;const now=g.roomWavePlan().interval;r.intervalScale=2.25;const old=g.roomWavePlan().interval;Object.assign(r,saved);if(at>=300&&at<600)assert.ok(now<old);else near(now,old);}}
 finally{Object.assign(r,saved);}
 g.time=780;near(g.evolutionPace().spawnScale,1.7);assert.equal(g.evolutionPace().capExtra,10);const before=g.addUnit(2,'bladeGuard',1500,6000);g.stampEvolutionWave(before);near(before.evolutionWaveHp,1.45);
 const boss=g.addUnit(2,'crimsonAce',1500,6000);Object.assign(boss,{boss:true,bossPattern:'rearBarrage'});const attack=g.stats(boss).damage,old=p.enabled;p.enabled=false;try{near(g.stats(boss).damage,attack);}finally{p.enabled=old;}
 near(config.patterns.rearBarrage.bossDamageMultiplier,.85);
});

test('a fresh cast can overlap while the first bait retains all thirty seconds under fire',()=>{
 const g=scene(),u=g.addSupportToy('toyDecoyMaker');u.toyNextAt=0;for(let i=0;i<5;i++){const t=g.addUnit(2,'rifle',1600+i*20,6000,true);t.cooldown=1e6;}assert.equal(g.useSupportToy(u),true);const bait=g.supportBait(),hp=bait.hp;near(bait.toyExpires-bait.toyArrivesAt,30);
 for(const at of [.35,3.35,12,20,30.349]){g.time=at;g.damage(bait,1e9,g.units.find(t=>t.team!==0));g.updateSupportToys(0);assert.equal(bait.hp,hp);assert.equal(g.supportBait(),bait);assert.equal(g.useSupportToy(u),false);assert.ok(g.supportBaits().length<=3);assert.ok(bait.toyLuredIds.length<=2);if(at===20)assert.equal(g.supportBaits().length,2);}
 g.time=30.35;g.updateSupportToys(0);assert.equal(bait.hp,0);assert.notEqual(g.supportBait()?.id,bait.id);assert.ok(g.supportBaits().length<=3);
});

test('a living legacy bait extends from its original landing time and replaces dead lured targets without exceeding two',()=>{
 const g=scene(),u=g.addSupportToy('toyDecoyMaker');u.toyNextAt=0;const enemies=Array.from({length:5},(_,i)=>g.addUnit(2,'ant',1600+i*20,6000,true));g.useSupportToy(u);const d=g.supportBait();d.toyExpires=3.35;delete d.toyLifetimeVersion;Object.assign(d,{x:1550,y:6000});g.time=1;g.updateSupportToys(0);near(d.toyExpires,30.35);
 const old=[...d.toyLuredIds];for(const t of enemies)if(old.includes(t.id))t.hp=0;g.updateSupportToys(0);assert.equal(d.toyLuredIds.length,2);assert.ok(d.toyLuredIds.every(id=>!old.includes(id)));
 const copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g)))),next=copy.units.find(t=>t.id===d.id);near(next.toyExpires,30.35);copy.time=29;copy.damage(next,1e9,copy.units.find(t=>t.team!==0&&t.hp>0));assert.ok(next.hp>0);
});

test('two enemies firing continuously in the real simulation cannot remove the bait before its full lifetime',()=>{
 const g=scene(),u=g.addSupportToy('toyDecoyMaker');u.toyNextAt=0;
 for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck','updateMageQuest','updateLaserQuest'])g[key]=()=>{};
 for(let i=0;i<2;i++){const t=g.addUnit(2,'rifle',1700+i*20,6000,true);t.hp=t.maxHp=1e6;t.cooldown=0;}
 g.useSupportToy(u);const bait=g.supportBait(),hp=bait.hp;for(let i=0;i<606;i++){g.update(.05);assert.equal(bait.hp,hp);assert.ok(g.time<bait.toyExpires);}
 for(let i=0;i<3;i++)g.update(.05);assert.equal(bait.hp,0);assert.ok(g.units.filter(t=>t.type==='toyDecoy'&&t.hp>0).length<=1);
});
