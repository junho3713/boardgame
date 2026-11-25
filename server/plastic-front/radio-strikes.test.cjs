'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
require('./public/two-star.js');
const {pack,unpack}=require('./public/autoplay.js');

function field(){
 const g=new FrontGame({},undefined,{map:'livingroom-star'});
 g.start();g.mission.stage=3;
 g.units=g.units.filter(u=>u.team===0&&u.type==='leader');
 g.obstacles=[];g.structures=[];g.defenses=[];g.buildings=[];g.effects=[];
 g.visible=g.lineClear=()=>true;
 Object.assign(g.commander(0),{x:900,y:5900});
 g.camera={x:1000,y:5900};g.viewport={width:750,height:500};
 const radio=g.addUnit(0,'guntruck',900,5900);
 const enemy=g.addUnit(2,'ant',1120,5900);enemy.hp=enemy.maxHp=100000;
 return {g,radio,enemy};
}
function fire(g,radio,target,faces,damage=100){
 let calls=0;
 g.random=()=>calls<faces.length?(faces[calls++]-.5)/6:.62;
 g.fireUnitProjectiles(radio,target,{damage,critical:false});
 assert.equal(calls,faces.length);
 return g.effects.findLast(e=>e.kind==='radioRoll');
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);

test('normal and evolved one-star signals preserve their six separate outcomes',()=>{
 for(const evolved of [false,true]){
  for(let face=1;face<=6;face++){
   const {g,radio,enemy}=field();
   g.evolved.guntruck=evolved;
   const outcome=fire(g,radio,g.commandFirePoint(radio,620,Math.PI),[face,face]);
   const strikes=evolved?['turret','turret','incendiary','incendiary','missile','nuke']:
    ['turret','turret','incendiary','incendiary','missile','missile'];
   const strike=strikes[face-1];
   assert.deepEqual(outcome.rolls.map(r=>r.dice),[[face,face]]);
   assert.equal(outcome.strike,strike);assert.ok(g.radioStrikes.every(s=>s.strike===strike));
   assert.equal(g.radioStrikes.length,strike==='turret'?0:strike==='missile'?(evolved?4:face-2):1);
   assert.equal(g.radioTurrets.length,strike==='turret'?1:0);
   if(strike==='incendiary'){
    assert.equal(outcome.rolls[0].tx,enemy.x);
    g.time=g.radioStrikes[0].landAt;g.updateEvolutionCombat();
    assert.equal(g.radioFireZones[0].radius,evolved?120:80);
    close(g.radioFireZones[0].until-g.time,evolved?7:5);
   }
  }
 }
});

test('all ranks have one pair and a forced double on the sixth attempt',()=>{
 for(const rank of [1,2,3]){
  const {g,radio,enemy}=field();radio.star=rank;
  for(let n=0;n<5;n++)assert.equal(fire(g,radio,enemy,[1,2]).strike,null);
  assert.equal(radio.radioMisses,5);
  const roll=fire(g,radio,enemy,[1]);
  assert.deepEqual(roll.rolls.map(pair=>pair.dice),[[1,1]]);
  assert.equal(roll.strike,'turret');assert.equal(radio.radioMisses,0);
 }
});

test('missile bursts follow a running target and lock the displayed landing point before impact',()=>{
 const {g,radio,enemy}=field(),start=enemy.y;
 fire(g,radio,enemy,[5,5]);
 const [shell]=g.radioStrikes,marker=g.effects.find(e=>e.kind==='radioIncoming'&&e.seq===0);
 for(let tick=1;tick<=20;tick++){
  g.time=tick*.05;enemy.y=start+g.time*230;g.updateEvolutionCombat();
 }
 assert.ok(enemy.y-start>shell.radius+g.collisionRadius(enemy));
 assert.ok(shell.y>start+200);assert.equal(marker.y,shell.y);
 const locked=shell.y;
 enemy.y=start+260;g.time=shell.landAt-.05;g.updateEvolutionCombat();
 assert.equal(shell.y,locked);assert.equal(marker.y,locked);
 g.time=shell.landAt;g.updateEvolutionCombat();
 assert.ok(enemy.hp<enemy.maxHp);
 assert.equal(g.effects.findLast(e=>e.kind==='radioImpact').y,locked);
});

test('saved missiles can retarget a nearby survivor while attacks into empty aim directions stay fixed',()=>{
 const {g,radio,enemy}=field(),near=g.addUnit(2,'rifle',enemy.x+65,enemy.y+45);
 fire(g,radio,enemy,[5,5]);
 const enemyId=enemy.id;
 const save=unpack(new FrontGame(),pack(g));
 save.visible=save.lineClear=()=>true;
 const [shell]=save.radioStrikes,savedTarget=save.units.find(u=>u.id===enemyId);
 assert.equal(shell.guidance.target,savedTarget);
 savedTarget.hp=0;save.time=.5;save.updateEvolutionCombat();
 assert.equal(shell.guidance.target.id,near.id);
 close(shell.x,near.x);close(shell.y,near.y);
 const move=field(),angle=Math.PI,aim=move.g.commandFirePoint(move.radio,620,angle);
 fire(move.g,move.radio,aim,[5,5]);
 assert.ok(move.g.radioStrikes.every(shot=>!shot.guidance));
 move.enemy.x-=210;move.g.time=.6;move.g.updateEvolutionCombat();
 close(move.g.radioStrikes[0].x,aim.x);close(move.g.radioStrikes[0].y,aim.y);
});

test('real fusion and the Destiny Star scale damage once and scale every blast radius',()=>{
 const {g,radio,enemy}=field(),leader=g.commander(0);
 g.addUnit(0,'guntruck',920,5900);g.addUnit(0,'guntruck',940,5900);
 g.evolved.guntruck=true;
 const base=g.stats(radio);
 for(const [rank,damageScale,radiusScale] of [[1,1,1],[2,3.4,1.15],[3,10.5,1.30]]){
  if(rank===2)assert.equal(g.fuseUnit('guntruck'),radio);
  if(rank===3){
   for(let i=0;i<2;i++)g.addUnit(0,'guntruck',960+i*20,5900).star=2;
   const destiny={destinyStar:true,active:true,x:leader.x,y:leader.y};
   g.pickups.push(destiny);assert.ok(g.collectFieldSupply(destiny));
  }
  const stats=g.stats(radio);
  close(stats.damage,base.damage*damageScale);
  close(stats.rate,base.rate*(rank===3?.65:1));
  const turretRoll=fire(g,radio,enemy,[1,1],stats.damage),turret=g.radioTurrets.at(-1);
  assert.equal(turretRoll.strike,'turret');assert.equal(turret.rank,rank);
  close(turret.damage,base.damage*damageScale*.24);
  close(turret.range,285*radiusScale);close(turret.splash,18*radiusScale);close(turret.scale,radiusScale);
  for(const [face,strike,count,radius,delay] of [[3,'incendiary',1,96,.65],[5,'missile',4,88,1.16],[6,'nuke',1,225,2.4]]){
   g.radioStrikes=[];
   const roll=fire(g,radio,enemy,[face,face],stats.damage);
   assert.equal(roll.rank,rank);assert.equal(roll.strike,strike);
   assert.deepEqual(roll.rolls.map(pair=>pair.dice),[[face,face]]);
   assert.equal(g.radioStrikes.length,count);
   close(g.radioStrikes[0].landAt-g.time,delay);
   for(const shell of g.radioStrikes){
    close(shell.damage,base.damage*damageScale);
    close(shell.radius,radius*radiusScale);
   }
   if(strike==='missile'){
    g.time=g.radioStrikes[0].landAt;g.updateEvolutionCombat();
    close(g.effects.findLast(e=>e.kind==='radioImpact').radius,radius*radiusScale);
   }
   if(strike==='incendiary'){
    g.time=g.radioStrikes[0].landAt;g.updateEvolutionCombat();
    close(g.radioFireZones.at(-1).radius,120*radiusScale);
    close(g.radioFireZones.at(-1).damage,base.damage*damageScale*.32);
   }
  }
 }
 const saved=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
 assert.equal(saved.radioStrikes[0].source,saved.units.find(u=>u.id===radio.id));
});

test('airdrop guns are independent of units, fire at 6.5 rounds per second and expire 6.5 seconds after landing',()=>{
 const {g,radio,enemy}=field();
 const units=[...g.units],solids=g.solidObstacles();
 fire(g,radio,enemy,[2,2]);
 const [turret]=g.radioTurrets;
 assert.deepEqual(g.units,units);assert.deepEqual(g.solidObstacles(),solids);
 close(turret.until-turret.landAt,6.5);
 g.time=turret.landAt-.01;g.updateEvolutionCombat();assert.equal(enemy.hp,enemy.maxHp);
 for(let i=0;i<650;i++){g.time=turret.landAt+i/100;g.updateEvolutionCombat();}
 const shots=g.effects.filter(e=>e.kind==='radioTurretShot');
 assert.equal(shots.length,43);
 assert.ok(shots.every(s=>s.tx===enemy.x&&s.ty===enemy.y&&!s.boosted));
 close(enemy.maxHp-enemy.hp,43*24*g.defenseFactor(enemy,radio));
 g.time=turret.until;g.updateEvolutionCombat();assert.deepEqual(g.radioTurrets,[]);
 assert.equal(g.effects.filter(e=>e.kind==='radioTurretEnd').length,1);
});

test('a fifth airdrop refreshes the shortest-lived gun, overclocks for three seconds and survives restore',()=>{
 const {g,radio,enemy}=field(),partner=g.addUnit(0,'guntruck',1000,5900);
 for(let i=0;i<4;i++){g.time=i*.25;fire(g,i%2?partner:radio,enemy,[1,1]);}
 const [first,second]=g.radioTurrets,oldSecond=second.until;
 g.time=2;g.updateEvolutionCombat();
 fire(g,partner,enemy,[2,2]);
 assert.equal(g.radioTurrets.length,4);close(first.until,8.5);close(first.overclockUntil,5);
 close(second.until,oldSecond);assert.equal(second.overclockUntil,0);
 g.time=first.nextShot;g.updateEvolutionCombat();
 const next=first.nextShot;close(next-g.time,1/(6.5*1.6));
 const copy=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
 assert.equal(copy.radioTurrets[0].source,copy.units.find(u=>u.id===radio.id));
 close(copy.radioTurrets[0].nextShot,next);close(copy.radioTurrets[0].overclockUntil,5);
});

test('evolved sixes always cause damage, but only one nuke per 3.5 seconds can cause screen whiteout',()=>{
 const {g,radio,enemy}=field(),partner=g.addUnit(0,'guntruck',940,5900);
 g.evolved.guntruck=true;
 for(const [time,caller] of [[0,radio],[.2,partner],[3.5,radio]]){
  g.time=time;
  assert.equal(fire(g,caller,enemy,[6,6]).strike,'nuke');
 }
 assert.equal(g.radioStrikes.length,3);
 const landings=g.radioStrikes.map(s=>s.landAt);
 for(const landAt of landings){
  g.time=landAt;
  const prior=enemy.hp;
  g.updateEvolutionCombat();
  assert.ok(prior-enemy.hp>=700*g.defenseFactor(enemy,radio)-1e-6);
 }
 const blasts=g.effects.filter(e=>e.kind==='radioImpact'&&e.strike==='nuke');
 assert.deepEqual(blasts.map(e=>e.screenFlash),[true,false,true]);
 assert.equal(g.effects.filter(e=>e.kind==='radioCrater').length,3);
});
