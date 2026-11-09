'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck','separateCrowd','updateFormationFacing','updateUltimate'])g[key]=()=>{};for(const u of g.units){u.x=1500;u.y=6000;u.cooldown=1e6;}return g;}
test('moving into treatment range heals in the same simulation frame after actual movement, regardless of unit order',()=>{
 for(const reverse of [false,true]){const g=scene(),m=g.addUnit(0,'medic',1000,6000),patient=g.addUnit(0,'rifle',1284,6000);m.cooldown=0;patient.hp=10;g.commander(0).x=1284;
  g.formationPoint=u=>({x:u.x+(u===m?200:0),y:u.y});g.squadMovePoint=(u,p)=>p;g.navigate=function(u,x,y,dt,speed){this.move(u,x-u.x,y-u.y,dt,speed);};if(reverse)g.units.reverse();const before=patient.hp;g.update(.05);a.ok(m.x>1000);a.ok(patient.hp>before);a.equal(m.healStartedAt,g.time);a.equal(g.effects.find(e=>e.kind==='heal').target,patient);
 }
});
test('an actual walking medic keeps one-second healing pulses, star amount and patient priority while retaining movement',()=>{
 const g=scene(),c=g.commander(0);g.tech[0].medic=1;const m=g.addUnit(0,'medic',1450,6100);m.star=2;m.hp=m.maxHp=g.stats(m).hp;m.cooldown=0;c.hp=50;const ticks=[],heal=g.heal;g.heal=function(t,n,s){const got=heal.call(this,t,n,s);if(s===m)ticks.push({at:this.time,target:t,got});return got;};g.input={x:1,y:0};const mx=m.x;
 for(let i=0;i<41;i++)g.update(.05);a.ok(m.x!==mx);a.equal(ticks.length,3);a.ok(ticks.every(t=>t.target===c&&Math.abs(t.got-25)<1e-6));a.ok(Math.abs(ticks[1].at-ticks[0].at-1)<1e-6);
});
test('a medic closes a short frontline gap without chasing a patient across the map or leaving the squad leash',()=>{
 const g=scene(),c=g.commander(0);c.x=1500;c.y=6000;const m=g.addUnit(0,'medic',1500,6136),t=g.addUnit(0,'tank',1500,5800);t.hp=10;const normal={x:m.x,y:m.y},point=g.medicTreatmentPoint(m,normal,g.stats(m));a.ok(point.y<normal.y);a.ok(Math.hypot(point.x-c.x,point.y-c.y)<=260);t.y=5000;a.deepEqual(g.medicTreatmentPoint(m,normal,g.stats(m)),normal);
});
test('cooperative moving treatment uses the owning medic upgrades and does not heal enemies',()=>{
 const g=scene(true),m=g.withOwner(1,()=>{g.tech[0].medic=5;return g.addUnit(0,'medic',1500,6100);}),c=g.withOwner(1,()=>g.commander(0)),enemy=g.addUnit(2,'rifle',1500,6100);c.hp=50;enemy.hp=5;m.cooldown=0;g.withOwner(0,()=>{g.tech[0].medic=1;});g.update(.05);a.ok(Math.abs(c.hp-66)<1e-7);a.equal(enemy.hp,5);a.equal(g.coopOwner,0);
});
test('old six-plus guards are reduced once without rewards and living guards no longer block saved supplies',()=>{
 for(const ambushed of [false,true]){const g=scene();g.time=240;g.updateRareSupplies();const p=g.pickups[0],c=g.commander(0);p.guardVersion=2;for(let i=0;i<2;i++){const u=g.addUnit(2,'rifle',p.x+100+i*60,p.y);u.rareSupplyGuard=true;p.guardIds.push(u.id);}if(ambushed){Object.assign(c,{x:p.x,y:p.y+300});g.updateRareSupplySecurity();p.guardVersion=2;}
  const rewards={kills:g.kills,cash:g.cash[0]},copy=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));copy.updateRareSupplySecurity();const q=copy.pickups[0];a.equal(copy.rareSupplyGuards(q).length,ambushed?10:6);a.equal(copy.kills,rewards.kills);a.equal(copy.cash[0],rewards.cash);const serial=copy.serial;copy.updateRareSupplySecurity();a.equal(copy.serial,serial);const commander=copy.commander(0);Object.assign(commander,{x:q.x,y:q.y});q.supplyKind='artillery';a.equal(copy.collectFieldSupply(q),true);a.equal(copy.supplyState().artillery,1);a.equal(copy.collectFieldSupply(q),false);
 }
});
