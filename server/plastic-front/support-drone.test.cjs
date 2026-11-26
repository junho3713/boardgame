'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
const near=(actual,expected)=>a.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
function scene(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});
 g.units=g.units.filter(u=>u.type==='leader');
 g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];g.effects=[];
 g.visible=g.lineClear=()=>true;g.defenseFactor=()=>1;g.time=30;
 return g;
}
function spawn(g,team,type,x,y){
 const c=g.commander(0),u=g.addUnit(team,type,c.x+x,c.y+y);
 Object.assign(u,{x:c.x+x,y:c.y+y});
 return u;
}
function tick(g,u,dt=0){
 const run=()=>g.updateSupportDrone(u,g.commander(0),dt,g.stats(u));
 return g.coop?g.withOwner(u.coopOwner,run):run();
}

test('spotlight follows boss priority, buffs each lit enemy, and doubles bubble absorption without doubling spillover',()=>{
 const g=scene(),drone=spawn(g,0,'drone',0,-65),source=g.commander(0);
 const regular=spawn(g,2,'rifle',65,-60),special=spawn(g,2,'bubbleOctopus',25,-169);
 const boss=spawn(g,2,'rhinoBeetle',60,-290),neighbor=spawn(g,2,'pirateCannon',105,-283);
 boss.boss=true;boss.maxHp=boss.hp=1000;neighbor.maxHp=neighbor.hp=1000;
 tick(g,drone);
 a.equal(drone.droneScan.targetId,boss.id);
 a.equal(drone.nextDroneScanAt,36);
 a.equal(g.supportScanAt(regular),null);
 boss.x-=30;g.time=31;tick(g,drone);a.equal(drone.droneScan.x,boss.x);
 boss.bubbleShield={hp:100,sourceId:special.id};
 g.damage(boss,20,source);near(boss.bubbleShield.hp,50);near(boss.hp,1000);
 g.damage(boss,40,source);a.equal(boss.bubbleShield,undefined);near(boss.hp,975);
 g.damage(neighbor,20,source);near(neighbor.hp,975);
 g.time=33.5;tick(g,drone);a.equal(g.supportScanAt(neighbor),null);
 boss.hp=0;g.time=36;tick(g,drone);a.equal(drone.droneScan.targetId,special.id);
});

test('energy coating uses health ratios, star strength and same-owner recipients; only an evolved break shoves enemies',()=>{
 const g=scene(true),c=g.commander(0),drone=spawn(g,0,'drone',0,-50);
 const friend=g.withOwner(1,()=>spawn(g,0,'rifle',-150,-15));friend.hp=1;
 const troops=Array.from({length:6},(_,i)=>spawn(g,0,'rifle',-80+i*24,-80));
 troops.forEach((u,i)=>{u.hp=u.maxHp*(.1+i*.15);});
 const enemy=spawn(g,2,'ant',25,-104),pushed=[];g.pushSupportTarget=(from,to)=>pushed.push([from.id,to.id]);
 tick(g,drone);
 for(const u of [c,...troops.slice(0,2)])near(u.droneShield.hp,u.maxHp*.22);
 a.equal(troops[2].droneShield,undefined);a.equal(friend.droneShield,undefined);
 const before=c.hp;g.damage(c,c.droneShield.hp+7,enemy);near(c.hp,before-7);a.deepEqual(pushed,[]);
 drone.star=2;g.time=38;tick(g,drone);
 near(troops[2].droneShield.hp,troops[2].maxHp*.28);a.equal(troops[3].droneShield,undefined);
 g.time=46;drone.star=3;drone.summonEvolved=true;tick(g,drone);
 a.equal([c,...troops,drone].filter(u=>u.droneShield?.until>g.time).length,6);
 const patient=troops[3];near(patient.droneShield.hp,patient.maxHp*.34);near(drone.droneScan.vulnerability,.35);
 g.damage(patient,patient.droneShield.hp,enemy);a.ok(pushed.some(([from,to])=>from===patient.id&&to===enemy.id));
 const n=pushed.length;g.time=52;g.damage(troops[0],1,enemy);a.equal(pushed.length,n);
});

test('air pickup collects the drone owner’s boss and ordinary crystals and ignores strategic drops',()=>{
 const g=scene(true),u=g.withOwner(1,()=>spawn(g,0,'drone',200,0));
 const owned={x:u.x,y:u.y,amount:16,owner:1,boss:true};
 const foreign={...owned,owner:0},regular={...owned,boss:false,amount:10};
 g.experienceDrops=[foreign,owned,regular];
 g.pickups=['magnet','heal','rare','star'].map(combatDrop=>({x:u.x,y:u.y,combatDrop,active:true,owner:1}));
 tick(g,u);a.deepEqual(g.experienceDrops,[foreign,regular]);a.equal(g.coopStates[1].xp,16);a.equal(g.coopStates[0].xp,0);
 tick(g,u);a.deepEqual(g.experienceDrops,[foreign]);a.equal(g.coopStates[1].xp,26);a.ok(g.pickups.every(x=>x.active));
 u.summonEvolved=true;tick(g,u);
 const xp={...owned,x:u.x+105},other={...foreign,x:u.x+90};
 g.experienceDrops=[xp,other];g.time=40;tick(g,u,.05);
 a.equal(xp.dronePullId,u.id);a.ok(xp.x<u.x+105);a.equal(other.dronePullId,undefined);
 const restored=unpack(scene(true),pack(g));
 a.equal(restored.experienceDrops.find(x=>x.dronePullId===u.id).owner,1);
 a.equal(restored.units.find(x=>x.id===u.id).nextDronePulseAt,50);
});

test('ordinary defeat gold still credits immediately while a support drone lives',()=>{
 const g=scene(),c=g.commander(0),drone=spawn(g,0,'drone',180,0),enemy=spawn(g,2,'ant',180,0),cash=g.cash[0];
 g.damage(enemy,10000,c);a.equal(g.cash[0],cash+3);
 const drop=g.experienceDrops[0];tick(g,drone);
 a.equal(g.collectExperienceDrop(drop),false);a.equal(g.cash[0],cash+3);
});
