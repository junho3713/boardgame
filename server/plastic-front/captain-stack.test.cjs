'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame,TYPES}=require('./public/engine');
const {CoopGame}=require('./public/coop-engine');
const {pack,unpack}=require('./public/autoplay');
const ant={team:2,type:'ant',x:0,y:0};

function battle(stack=true,coop=false){
 const settings={map:'livingroom-star',captainStackHpMode:stack,realtimeSummons:true};
 const g=coop?new CoopGame({},settings):new FrontGame({},undefined,settings);
 g.units=g.units.filter(u=>u.team===0&&u.type==='leader');
 g.phase='playing';g.time=40;return g;
}
function add(g,type,star=1){
 const c=g.commander(0),u=g.addUnit(0,type,c.x+12,c.y+5);
 u.star=star;u.hp=u.maxHp=g.stats(u).hp;return u;
}
test('captain draws one real bar per owned troop in deterministic rank and frontline order',()=>{
 const g=battle(),c=g.commander(0),units=[];
 for(const rank of [3,2,1])for(const type of ['medic','tank','machinegun','rifle'])units.push(add(g,type,rank));
 const extra=add(g,'medic'),dead=add(g,'tank');dead.hp=0;
 const lines=g.captainStack(c);assert.equal(lines.length,14);
 assert.deepEqual(lines.map(u=>[u.star||1,u.type]),[
  [1,'tank'],[1,'rifle'],[1,'machinegun'],[1,'medic'],[1,'medic'],
  [2,'tank'],[2,'rifle'],[2,'machinegun'],[2,'medic'],[3,'tank'],[3,'rifle'],[3,'machinegun'],[3,'medic'],[1,'leader']]);
 assert.equal(lines[4],extra);
});
test('remote allies do not intercept, while shields and damage gates work even in a single blast',()=>{
 const g=battle(),c=g.commander(0),tank=add(g,'tank'),medic=add(g,'medic'),cash=g.cash[0];
 tank.droneShield={hp:5,maxHp:5,until:g.time+6};
 g.damage(tank,20000,ant);assert.equal(tank.hp,tank.maxHp);
 g.damage(c,2,ant);assert(tank.droneShield.hp<5);assert.equal(tank.hp,tank.maxHp);
 g.damage(c,20000,ant);assert.equal(tank.hp,0);assert.equal(g.cash[0],cash+Math.floor(TYPES.tank.cost*.25));
 g.time+=.349;g.damage(c,20000,ant);assert.equal(medic.hp,medic.maxHp);
 g.time+=.002;g.damage(c,20000,ant);assert.equal(medic.hp,0);assert.equal(c.hp,c.maxHp);
 assert.deepEqual(g.captainStack(c),[c]);
});
test('three-star losses recover in steps, golden three-star troops keep the normal loss rule',()=>{
 const g=battle(),c=g.commander(0),start=g.cash[0];let line=add(g,'multiDrone',3);
 for(const star of [2,1]){
  g.damage(c,1e7,ant);const next=g.captainStack(c)[0];
  assert.equal(next.id,line.recoveredAs);assert.equal(next.type,line.type);assert.equal(next.star,star);
  assert.equal(next.maxHp,g.stats(next).hp);assert.equal(next.hp,next.maxHp);assert.equal(g.cash[0],start);
  line=next;g.time+=.36;
 }
 g.damage(c,1e7,ant);assert.equal(g.cash[0]-start,55);
 const gold=add(g,'tank',3);gold.goldenSummon=true;g.time+=.36;
 g.damage(c,1e7,ant);assert(!gold.recoveredAs);assert.deepEqual(g.captainStack(c),[c]);
});
test('merging shrinks the stack; the last bar uses normal revival, protection and third-down defeat',()=>{
 const g=battle(),c=g.commander(0);for(let i=0;i<3;i++)add(g,'rifle');
 assert.equal(g.captainStack(c).length,4);g.autoFuseUnits();assert.equal(g.captainStack(c).length,2);
 for(let i=0;i<2;i++){g.damage(c,1e6,ant);g.time+=.36;}
 for(let i=1;i<=3;i++){
  g.damage(c,1e6,ant);assert.equal(c.hp,0);assert.equal(g.retreated,i);
  if(i===3){assert.equal(g.phase,'ended');break;}
  assert.equal(c.deadUntil,g.time+5);g.time=c.deadUntil;g.reviveCommander(c);g.damage(c,1e6,ant);
  assert.equal(c.hp,c.maxHp);assert.equal(c.reviveProtectionUntil,g.time+3);g.time+=3;
 }
});
test('medics prioritize wounded bars, drone shields cover only the top, hearts and fever heal every living bar',()=>{
 const g=battle(),c=g.commander(0),m=add(g,'medic'),drone=add(g,'drone'),tank=add(g,'tank');
 c.hp=1;m.hp=1;tank.hp=2;drone.hp=0;
 assert.deepEqual(g.medicPatients(m),[tank]);m.cooldown=0;g.updateMedicHealing(m);assert(tank.hp>2);assert.equal(c.hp,1);
 tank.hp=tank.maxHp;assert.deepEqual(g.medicPatients(m),[m]);m.hp=m.maxHp;assert.deepEqual(g.medicPatients(m),[c]);
 const d=add(g,'drone');d.nextDroneShieldAt=0;g.updateSupportDrone(d,c,0,g.stats(d),[]);
 assert(tank.droneShield);assert(!m.droneShield&&!c.droneShield);
 for(const u of [m,tank,c])u.hp=1;
 const pickup={active:true,combatDrop:'heal',owner:0,x:c.x,y:c.y};assert(g.collectCombatDrop(pickup,c));
 for(const u of [m,tank,c])assert.equal(u.hp,1+u.maxHp*.25);
 assert(g.activateTacticalFever());for(const u of [m,tank,c])assert(Math.abs(u.hp-(1+u.maxHp*.55))<1e-7);
 assert.equal(drone.hp,0);
});
test('co-op keeps hits, salvage, gates, healing and target selection independent for both captains',()=>{
 const g=battle(true,true),green=g.commander(0),greenTank=add(g,'tank');
 const [blue,blueMedic]=g.withOwner(1,()=>[g.commander(0),add(g,'medic')]);
 green.x=0;blue.x=300;const enemy={...ant,x:290,y:blue.y};assert.equal(g.pursuitTarget(enemy),blue);
 assert(!g.canTarget(enemy,blueMedic));assert(!g.canTarget(enemy,greenTank));assert(!g.screeningUnit(enemy,blue));
 const gold0=g.cash[0],gold1=g.withOwner(1,()=>g.cash[0]);
 g.damage(blue,1e6,enemy);g.damage(green,1e6,enemy);
 assert.equal(g.cash[0]-gold0,Math.floor(TYPES.tank.cost/4));
 assert.equal(g.withOwner(1,()=>g.cash[0])-gold1,Math.floor(TYPES.medic.cost/4));
 assert.equal(blueMedic.hp,0);assert.equal(greenTank.hp,0);assert.equal(green.hp,green.maxHp);assert.equal(blue.hp,blue.maxHp);
 blue.hp=0;assert.equal(g.pursuitTarget(enemy),green);
});
test('a mine still damages enemies, and a bomb insect fuses only within reach of a captain',()=>{
 const g=battle(),c=g.commander(0),u=add(g,'rocket');g.lineClear=()=>true;g.navigate=()=>{};
 const bug=g.addUnit(2,'bombBug',c.x+500,c.y);u.x=bug.x;u.y=bug.y;
 g.updateBombBug(bug,.05);assert(!bug.bombFuse);bug.x=c.x+5;bug.y=c.y;g.updateBombBug(bug,.05);assert(bug.bombFuse);
 u.x=bug.x;u.y=bug.y;const [mine]=g.fireUnitProjectiles(u,bug,{damage:1e6,critical:false});
 assert(mine);g.time=mine.armAt+.01;g.updateBlockMines();assert.equal(bug.hp,0);assert(c.hp===c.maxHp);assert(u.hp<u.maxHp);
});
test('stealth prevents independent targeting but never locks the active drone bar',()=>{
 const g=battle(),c=g.commander(0),drone=add(g,'drone');drone.droneLootUntil=g.time+2;
 assert(g.isDroneStealthed(drone));g.damage(drone,20,ant);assert.equal(drone.hp,drone.maxHp);
 g.damage(c,20,ant);assert(drone.hp<drone.maxHp);assert.equal(c.hp,c.maxHp);
});
test('basic mode retains normal targeting, individual casualties and old save compatibility',()=>{
 const g=battle(false),c=g.commander(0),tank=add(g,'tank',3);
 assert(g.canTarget(ant,tank));g.damage(c,10,ant);assert(c.hp<c.maxHp);assert.equal(tank.hp,tank.maxHp);
 g.damage(tank,1e7,ant);assert.equal(tank.hp,0);assert(!tank.recoveredAs);
 const old=pack(g);delete old.fields.captainStackHpMode;assert.equal(unpack(battle(true),old).captainStackHpMode,false);
 const stacked=battle();stacked.commander(0).stackGuardUntil=40.35;
 const restored=unpack(battle(false),pack(stacked));assert(restored.captainStackHpMode);assert.equal(restored.commander(0).stackGuardUntil,40.35);
});
