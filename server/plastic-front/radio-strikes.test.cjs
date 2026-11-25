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

test('a single roll has a forced double after five misses; fused rolls do not use that pity',()=>{
 const {g,radio,enemy}=field();
 for(let n=0;n<5;n++){const roll=fire(g,radio,enemy,[1,2]);assert.equal(roll.strike,null);}
 assert.equal(radio.radioMisses,5);
 const guaranteed=fire(g,radio,enemy,[1]);
 assert.equal(guaranteed.strike,'incendiary');assert.equal(radio.radioMisses,0);
 g.evolved.guntruck=true;radio.radioMisses=5;radio.star=2;g.radioStrikes=[];
 const roll=fire(g,radio,enemy,[1,2,3,4,5,6]);
 assert.deepEqual(roll.rolls.map(pair=>pair.dice),[[1,2],[3,4],[5,6]]);
 assert.ok(roll.rolls.every(pair=>!pair.success));assert.equal(g.radioStrikes.length,0);
});

test('a real three-troop fusion rolls three pairs and only two doubles boost every hit and fire zone',()=>{
 const {g,radio,enemy}=field();
 g.addUnit(0,'guntruck',920,5900);g.addUnit(0,'guntruck',940,5900);
 assert.equal(g.fuseUnit('guntruck'),radio);
 const roll=fire(g,radio,enemy,[2,2,4,4,1,6]);
 assert.equal(roll.rank,2);assert.equal(roll.bonus,2);
 assert.deepEqual(roll.rolls.map(pair=>pair.success),[true,true,false]);
 assert.deepEqual(g.radioStrikes.map(s=>s.strike),['incendiary','missile','missile']);
 assert.deepEqual(g.radioStrikes.map(s=>s.radius),[96*1.3,88*1.3,88*1.3]);
 assert.ok(g.radioStrikes.every(s=>s.damage===130&&s.source===radio));
 assert.ok(g.effects.filter(e=>e.kind==='radioIncoming').every(e=>e.bonus===2));
 const fireAt=g.radioStrikes.find(s=>s.strike==='incendiary').landAt;
 g.time=fireAt;g.updateEvolutionCombat();
 assert.equal(g.radioFireZones[0].radius,104);
 close(g.radioFireZones[0].damage,41.6);
});

test('three sets of any doubles replace their strikes with one nuke while evolved amplifies it',()=>{
 for(const evolved of [false,true]){
  const {g,radio,enemy}=field();
  radio.star=2;g.evolved.guntruck=evolved;
  const roll=fire(g,radio,enemy,[1,1,2,2,3,3]);
  assert.equal(roll.bonus,3);assert.equal(roll.strike,'nuke');
  assert.deepEqual(roll.rolls.map(pair=>pair.dice),[[1,1],[2,2],[3,3]]);
  assert.equal(g.radioStrikes.length,1);const [nuke]=g.radioStrikes;
  assert.equal(nuke.strike,'nuke');assert.equal(nuke.landAt,g.time+1.2);
  assert.equal(nuke.damage,evolved?150:100);assert.equal(nuke.radius,evolved?337.5:225);
  g.time=nuke.landAt;const prior=enemy.hp;
  g.updateEvolutionCombat();close(prior-enemy.hp,nuke.damage*7*g.defenseFactor(enemy,radio));
  assert.equal(g.radioFireZones.length,evolved?1:0);
  if(evolved)assert.equal(g.radioFireZones[0].radius,237);
 }
});

test('Destiny Star retains three sets and gives the promoted signal corps faster and bigger strikes',()=>{
 const {g,radio,enemy}=field(),leader=g.commander(0);
 for(let i=0;i<2;i++)g.addUnit(0,'guntruck',960+i*20,5900);
 for(const u of g.fusionCandidates('guntruck')){
  u.star=2;u.hp=u.maxHp=g.stats(u).hp;
 }
 const old=g.stats(radio);
 const destiny={destinyStar:true,active:true,x:leader.x,y:leader.y};
 g.pickups.push(destiny);assert.ok(g.collectFieldSupply(destiny));
 close(g.stats(radio).rate,old.rate*.65);assert.equal(radio.star,3);
 const roll=fire(g,radio,enemy,[6,6,3,4,4,5],g.stats(radio).damage);
 assert.equal(roll.rank,3);assert.equal(roll.rolls.length,3);assert.equal(roll.bonus,0);
 assert.equal(g.radioStrikes.length,4);assert.ok(g.radioStrikes.every(s=>s.strike==='missile'));
 close(g.radioStrikes[0].damage,g.stats(radio).damage*1.6);
 close(g.radioStrikes[0].radius,88*1.35);
 const saved=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
 assert.equal(saved.radioStrikes[0].source,saved.units.find(u=>u.id===radio.id));
 assert.deepEqual(saved.effects.findLast(e=>e.kind==='radioRoll').rolls,roll.rolls);
});

test('hotline fixes the first pair without forcing the remaining fused sets',()=>{
 const {g,radio,enemy}=field();
 radio.star=2;g.evolved.guntruck=g.evolved.lucky=true;
 g.addUnit(0,'lucky',950,5900);g.linkState().diceSixUntil=g.time+5;
 const roll=fire(g,radio,enemy,[1,2,5,6]);
 assert.deepEqual(roll.rolls.map(r=>r.dice),[[6,6],[1,2],[5,6]]);
 assert.equal(roll.bonus,0);assert.equal(g.radioStrikes.length,1);assert.equal(g.radioStrikes[0].strike,'nuke');
});
