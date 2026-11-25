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
   const strikes=evolved?['incendiary','incendiary','missile','missile','missile','nuke']:
    ['incendiary','incendiary','incendiary','missile','missile','missile'];
   const strike=strikes[face-1];
   assert.deepEqual(outcome.rolls.map(r=>r.dice),[[face,face]]);
   assert.equal(outcome.strike,strike);assert.ok(g.radioStrikes.every(s=>s.strike===strike));
   assert.equal(g.radioStrikes.length,strike==='missile'?(evolved?4:face-2):1);
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
  assert.equal(roll.strike,'incendiary');assert.equal(radio.radioMisses,0);
 }
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
  for(const [face,strike,count,radius,delay] of [[1,'incendiary',1,96,.65],[5,'missile',4,88,1.16],[6,'nuke',1,225,2.4]]){
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
