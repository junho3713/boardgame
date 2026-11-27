'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {pack,unpack}=require('./public/autoplay.js');

const create=(map='livingroom-assault')=>new FrontGame({},undefined,{map});
const defenses=g=>({
 battery:g.defenses.find(p=>p.defenseKind==='laserBattery'),
 tower:g.defenses.find(p=>p.id==='room-threequarter-laser')
});

test('the 440 HP battery sits on the approach side and new-room fences have half HP',()=>{
 const g=create(),{battery,tower}=defenses(g);
 const posts=g.defenses.filter(p=>p.fencePost);
 assert.equal(battery.linkedTowerId,tower.id);
 assert.ok(battery.y>posts[0].y&&g.freePosition(battery.x,battery.y,27));
 assert.equal(battery.hp,440);
 assert.equal(g.defenseStats(battery).damage,0);
 assert.ok(g.combatCandidates().includes(battery));
 assert.ok(posts.every(p=>p.maxHp===6000&&g.defenseFactor(p)===1));
 const classic=create('livingroom-star');
 assert.equal(defenses(classic).battery,undefined);
 assert.equal(classic.defenses.find(p=>p.fencePost).hp,12000);
});

test('cutting the cable starts repeating 3.0 / 1.2 / 2.0 second phases and damages only while firing',()=>{
 const g=create(),{battery,tower}=defenses(g),c=g.commander(0);
 g.time=25;
 c.x=tower.x;c.y=tower.y+250;c.hp=c.maxHp=10000;
 assert.equal(g.roomLaserPower(tower),null);
 g.damage(battery,1000,c);
 assert.ok(tower.hp>0);
 assert.equal(tower.laserFaultAt,25);
 const phases=[[0,'off'],[2.99,'off'],[3,'warning'],[4.19,'warning'],[4.2,'fire'],[6.19,'fire'],[6.2,'off'],[9.2,'warning'],[10.4,'fire']];
 for(const [elapsed,phase] of phases){
  const hp=c.hp;
  g.time=25+elapsed;
  assert.equal(g.roomLaserPower(tower).phase,phase);
  g.updateLaser(tower,1/60);
  assert.equal(c.hp<hp,phase==='fire');
 }
 const loaded=unpack(create(),pack(g)), restored=defenses(loaded);
 assert.equal(restored.battery.hp,0);
 assert.equal(restored.tower.laserFaultAt,25);
 assert.equal(loaded.roomLaserPower(restored.tower).phase,'fire');
});

test('allied mortar still targets the tower over the battery and deals 2.25× structural damage on landing',()=>{
 const g=create(),{battery,tower}=defenses(g);
 Object.assign(g.commander(0),{x:1500,y:4830});
 const mortar=g.addUnit(0,'mortar',tower.x,tower.y+550,true);
 assert.equal(g.stats(mortar).damage,90);
 assert.equal(g.stats(g.addUnit(2,'mortar',500,6500,true)).damage,60);
 assert.equal(g.selectCombatTarget(mortar,[battery,tower]),tower);
 g.launchMortar(mortar,tower,{damage:g.stats(mortar).damage});
 g.time=1.99;
 const hp=tower.hp;
 g.updateMortars();
 assert.equal(tower.hp,hp);
 g.time=2;
 g.updateMortars();
 assert.ok(Math.abs(hp-tower.hp-90*2.25*g.defenseFactor(tower,mortar))<1e-7);
});
