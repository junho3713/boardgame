'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
require('./public/two-star.js');
const {pack,unpack}=require('./public/autoplay.js');

function field(coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});
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
 let calls=0,auxiliary=0;
 g.diceFace=()=>calls<faces.length?faces[calls++]:2+auxiliary++%2;
 g.random=()=>.62;
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

test('all ranks force a single primary double on the sixth attempt',()=>{
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
  close(turret.damage,base.damage*damageScale*.22);
  close(turret.range,285*radiusScale);close(turret.splash,18*radiusScale);close(turret.scale,radiusScale);
  for(const [face,strike,count,radius,delay] of [[3,'incendiary',1,96,.65],[5,'missile',4,88,1.16],[6,'nuke',1,225,2.4]]){
   g.radioStrikes=[];
   g.radioNextNukeAt=0;
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
 assert.equal(turret.hp,180);
 assert.equal(turret.mountRank,1);
 close(turret.until-turret.landAt,6.5);
 g.time=turret.landAt-.01;g.updateEvolutionCombat();assert.equal(enemy.hp,enemy.maxHp);
 for(let i=0;i<650;i++){g.time=turret.landAt+i/100;g.updateEvolutionCombat();}
 const shots=g.effects.filter(e=>e.kind==='radioTurretShot');
 assert.equal(shots.length,43);
 assert.ok(shots.every(s=>s.tx===enemy.x&&s.ty===enemy.y&&!s.pierced));
 close(enemy.maxHp-enemy.hp,43*18*g.defenseFactor(enemy,radio));
 g.time=turret.until;g.updateEvolutionCombat();assert.deepEqual(g.radioTurrets,[]);
 assert.equal(g.effects.filter(e=>e.kind==='radioTurretEnd').length,1);
});

test('the fifth cooperative drop replaces and detonates the oldest gun at the global four-gun limit',()=>{
 const {g,radio,enemy}=field(true);
 const partner=g.withOwner(1,()=>g.addUnit(0,'guntruck',1000,5900));
 g.evolved.guntruck=true;
 for(let i=0;i<4;i++){
  g.time=i*.25;
  g.withOwner(i%2,()=>fire(g,i%2?partner:radio,enemy,[1,1]));
 }
 const [first,second]=g.radioTurrets,oldSecond=second.until;
 g.time=2;g.updateEvolutionCombat();
 const hp=enemy.hp;
 g.withOwner(1,()=>fire(g,partner,enemy,[2,2]));
 assert.equal(g.radioTurrets.length,4);assert.equal(first.hp,0);assert.ok(!g.radioTurrets.includes(first));
 assert.ok(enemy.hp<hp);assert.equal(g.effects.filter(e=>e.kind==='radioTurretEnd'&&e.radius>0).length,1);
 assert.equal(g.radioTurrets[0],second);close(second.until,oldSecond);
 assert.equal(g.radioTurrets.at(-1).source,partner);
});

test('a drop reuses a same-tick destroyed or overdue slot without removing a live gun',()=>{
 for(const end of ['damage','expiry']){
  const {g,radio,enemy}=field();
  for(let i=0;i<4;i++){
   g.time=i*.25;fire(g,radio,enemy,[1,1]);
  }
  const prior=[...g.radioTurrets];
  const stale=end==='damage'?prior.at(-1):prior[0];
  if(end==='damage'){
   g.time=stale.landAt;g.damage(stale,1000,enemy);
  }else g.time=stale.until;
  assert.equal(g.radioTurrets.length,4);
  fire(g,radio,enemy,[2,2]);
  assert.equal(g.radioTurrets.length,4);
  assert.deepEqual(g.radioTurrets.slice(0,3),prior.filter(t=>t!==stale));
  assert.equal(g.effects.filter(e=>e.kind==='radioTurretEnd').length,1);
  assert.ok(g.radioTurrets.every(t=>t.hp>0&&t.until>g.time));
 }
});

test('enemy AI attacks a landed gun and gun destruction never counts as a troop loss',()=>{
 const {g,radio,enemy}=field();
 fire(g,radio,enemy,[1,1]);
 const [turret]=g.radioTurrets;
 assert.equal(g.canTarget(enemy,turret),false);
 assert.ok(!g.combatCandidates().includes(turret));
 g.time=turret.landAt;
 Object.assign(enemy,{x:turret.x+12,y:turret.y,cooldown:0});
 assert.ok(g.combatCandidates().includes(turret));
 const loss=g.losses[0];
 g.updateBattleUnits(.05,g.commander(1));
 assert.ok(turret.hp<180);
 g.damage(turret,1000,enemy);
 g.updateEvolutionCombat();
 assert.deepEqual(g.radioTurrets,[]);
 assert.equal(g.losses[0],loss);
 assert.equal(g.effects.filter(e=>e.kind==='radioTurretEnd'&&!e.radius).length,1);
});

test('the evolved twin gun pierces along one line, persists HP and allied projectile identity, then blasts on death or expiry',()=>{
 for(const end of ['damage','expiry']){
  const {g,radio,enemy}=field();
  g.evolved.guntruck=true;
  fire(g,radio,enemy,[2,2]);
  const [turret]=g.radioTurrets;
  assert.equal(turret.hp,320);assert.equal(turret.mountRank,2);
  const far=g.addUnit(2,'ant',turret.x+120,turret.y);
  const side=g.addUnit(2,'ant',turret.x+125,turret.y+35);
  Object.assign(enemy,{x:turret.x+57,y:turret.y});
  g.time=turret.landAt;g.updateEvolutionCombat();
  close(enemy.maxHp-enemy.hp,22*g.defenseFactor(enemy,radio));
  close(far.maxHp-far.hp,22*.55*g.defenseFactor(far,radio));
  assert.equal(side.hp,side.maxHp);
  g.damage(turret,40,enemy);
  g.shots.push({target:turret,source:enemy,team:2});
  const copy=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g))));
  copy.lineClear=()=>true;
  const restored=copy.radioTurrets[0],restoredEnemy=copy.units.find(u=>u.id===enemy.id);
  assert.equal(copy.shots[0].target,restored);
  assert.equal(restored.source,copy.units.find(u=>u.id===radio.id));
  assert.equal(restored.hp,280);
  const hp=restoredEnemy.hp;
  if(end==='damage')copy.damage(restored,1000,restoredEnemy);
  else copy.time=restored.until;
  copy.updateEvolutionCombat();
  assert.deepEqual(copy.radioTurrets,[]);
  assert.equal(copy.effects.filter(e=>e.kind==='radioTurretEnd'&&e.radius===88).length,1);
  close(hp-restoredEnemy.hp,135*(1-.4*57/88)*copy.defenseFactor(restoredEnemy,restored.source));
 }
});

test('evolved sixes share the twelve-second launch cooldown and the fallback shaves off one second',()=>{
 const {g,radio,enemy}=field(),partner=g.addUnit(0,'guntruck',940,5900);
 g.evolved.guntruck=true;
 assert.equal(fire(g,radio,enemy,[6,6]).strike,'nuke');
 assert.equal(g.radioNextNukeAt,12);
 g.time=3;
 const aim=g.commandFirePoint(g.commander(0),550,Math.PI);
 const fallback=fire(g,partner,aim,[6,6]);
 assert.equal(fallback.strike,'missile');assert.equal(fallback.rolls[0].missileCount,6);
 assert.equal(g.radioNextNukeAt,11);
 const missiles=g.radioStrikes.filter(s=>s.strike==='missile');
 assert.equal(missiles.length,6);assert.ok(missiles.every(s=>s.source===partner&&!s.guidance&&s.damage===100));
 assert.equal(fallback.tx,aim.x);

 const state=pack(g),saved=unpack(new FrontGame(),state);
 assert.equal(saved.radioNextNukeAt,11);
 delete state.fields.radioNextNukeAt;
 assert.equal(unpack(saved,state).radioNextNukeAt,0);

 g.time=10.5;
 assert.equal(fire(g,partner,enemy,[6,6]).strike,'missile');
 assert.equal(g.radioNextNukeAt,10.5);
 assert.equal(fire(g,radio,enemy,[6,6]).strike,'nuke');
 assert.equal(g.radioNextNukeAt,22.5);
});

test('the cooldown is shared by both commanders in cooperative play',()=>{
 const {g,radio,enemy}=field(true);
 g.evolved.guntruck=true;
 const partner=g.withOwner(1,()=>{g.evolved.guntruck=true;return g.addUnit(0,'guntruck',940,5900);});
 assert.equal(fire(g,radio,enemy,[6,6]).strike,'nuke');
 const fallback=g.withOwner(1,()=>fire(g,partner,enemy,[6,6]));
 assert.equal(fallback.strike,'missile');
 assert.equal(g.radioNextNukeAt,11);
});

test('pity, evolution correction, the hotline and a non-double auxiliary pair cannot manufacture a triple jackpot',()=>{
 const {g,radio,enemy}=field();
 radio.star=2;g.evolved.guntruck=true;g.radioNextNukeAt=12;
 const ordinary=fire(g,radio,enemy,[6,6,2,2,3,4]);
 assert.equal(ordinary.strike,'missile');assert.equal(ordinary.jackpot,false);assert.equal(ordinary.rolls.length,1);
 radio.radioMisses=5;
 assert.equal(fire(g,radio,enemy,[6]).jackpot,false);
 let correctedRolls=0;
 g.diceFace=(_unit,_evolved,set)=>{assert.equal(set,0);return correctedRolls++===0?6:2;};
 g.random=()=>0;
 g.fireUnitProjectiles(radio,enemy,{damage:100});
 const corrected=g.effects.findLast(e=>e.kind==='radioRoll');
 assert.deepEqual(corrected.rolls[0].dice,[6,6]);assert.equal(corrected.jackpot,false);
 g.linkState().radioHotlineUntil=5;
 g.diceFace=()=>assert.fail('the hotline does not roll dice');
 g.fireUnitProjectiles(radio,enemy,{damage:100});
 const hotline=g.effects.findLast(e=>e.kind==='radioRoll');
 assert.equal(hotline.strike,'missile');assert.equal(hotline.jackpot,false);
});

test('natural triple doubles bypass the launch cooldown while whiteout stays rate limited',()=>{
 const {g,radio,enemy}=field(),partner=g.addUnit(0,'guntruck',940,5900);
 radio.star=2;partner.star=3;
 g.evolved.guntruck=true;
 for(const [time,caller,dice] of [[0,radio,[6,6]],[.2,partner,[1,1,2,2,4,4]],[3.5,radio,[5,5,6,6,3,3]]]){
  g.time=time;
  const roll=fire(g,caller,enemy,dice);
  assert.equal(roll.strike,'nuke');
  assert.equal(roll.jackpot,dice.length===6);
  assert.deepEqual(roll.rolls.flatMap(pair=>pair.dice),dice);
  assert.equal(g.radioNextNukeAt,time+12);
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
