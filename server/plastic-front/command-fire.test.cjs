'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');

function field(map='livingroom-star'){
 const g=map==='coop'?new CoopGame():new FrontGame({},undefined,{map});
 g.start();
 g.units=g.units.filter(u=>u.type==='leader'&&u.team===0);
 g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.pickups=[];
 g.camera={x:1100,y:1300};g.viewport={width:720,height:540};
 for(const c of g.units)Object.assign(c,{x:1100+(c.coopOwner||0)*120,y:1300,cooldown:99});
 for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','levelCheck'])g[key]=()=>{};
 return g;
}
function add(g,type,x,y,team=0){
 const unit=g.addUnit(team,type,x,y);
 unit.cooldown=team===0?0:99;
 return unit;
}
const from=(g,u)=>g.shots.find(p=>p.source===u);

test('manual aim accepts arbitrary finite vectors, keeps its last valid value, and clears on release',()=>{
 const g=field(),c=g.commander(0);assert.equal(g.manualAimAngle(),null);
 assert.equal(g.setManualAim({x:3,y:4}),true);assert.deepEqual(g.manualAim,{x:.6,y:.8});
 assert.ok(Math.abs(g.manualAimAngle()-Math.atan2(4,3))<1e-12);assert.equal(c.manualAimAngle,g.manualAimAngle());
 for(const invalid of [{x:NaN,y:1},{x:Infinity,y:0},{x:'1',y:0},{}])assert.equal(g.setManualAim(invalid),false);
 assert.ok(Math.abs(g.manualAimAngle()-Math.atan2(4,3))<1e-12);g.setManualAim({x:0,y:0});assert.equal(c.manualAimAngle,null);
 g.setManualAim({x:1,y:1});g.setManualAim(null);assert.equal(g.manualAim,null);assert.equal(c.manualAimAngle,null);
});

test('only the five manually controlled troop types use the held angle',()=>{
 const g=field(),c=g.commander(0),angle=Math.atan2(1,3),received=new Map();
 const types=['rifle','machinegun','rocket','tank','guntruck','sniper','mortar','drone','lucky','medic'];
 const troops=types.map((type,i)=>add(g,type,1100+i*2,1310));
 const near=add(g,'rifle',930,1310,1),heavy=add(g,'tank',860,1310,1);
 near.hp=near.maxHp=3000;heavy.maxHp=9000;heavy.hp=30;
 g.move=g.navigate=g.separateCrowd=()=>{};g.setFocus(near);g.setManualAim({x:3,y:1});c.cooldown=0;
 g.fireUnitProjectiles=(u,t)=>{if(u.team===0)received.set(u.type,t);return [];};
 g.launchMortar=(u,t)=>received.set(u.type,t);
 const medic=troops.find(u=>u.type==='medic'),wounded=troops[0];wounded.hp=wounded.maxHp*.25;
 troops.find(u=>u.type==='tank').turretFace=angle;
 const hp=wounded.hp;for(let i=0;i<40;i++)g.update(.025);
 for(const type of types.slice(0,5))assert.ok(Math.abs(received.get(type)?.angle-angle)<1e-12,type);
 for(const type of ['leader','lucky','mortar'])assert.equal(received.get(type),near,type);
 assert.equal(received.has('drone'),false);assert.ok(troops.find(u=>u.type==='drone').droneScan);
 assert.equal(received.get('sniper'),heavy);assert.ok(wounded.hp>hp);assert.equal(received.has(medic.type),false);
});

test('mouse aim converges from each soldier and hits the body beneath a raised enemy sprite',()=>{
 const g=field(),left=add(g,'machinegun',1000,1320),right=add(g,'machinegun',1200,1330);
 const bomb=add(g,'bombBug',1100,1145,2);
 bomb.hp=bomb.maxHp=3000;
 g.move=g.navigate=g.separateCrowd=()=>{};
 const point={x:bomb.x+7,y:bomb.y-44};
 assert.equal(g.setManualAim({x:0,y:-1,point}),true);
 assert.equal(g.setManualAim({x:0,y:-1,point:{x:-1,y:10}}),false);
 assert.deepEqual(g.manualAim.point,point);
 g.update(.02);
 for(const shooter of [left,right]){
  const shot=from(g,shooter);
  assert.ok(Math.abs(shot.commandAngle-Math.atan2(bomb.y-shooter.y,bomb.x-shooter.x))<1e-12);
  g.advanceCommandShot(shot,.25,[bomb]);
  assert.equal(shot.target,bomb);
 }
 const empty={x:1190,y:1190};
 g.setManualAim({x:0,y:-1,point:empty});g.shots=[];left.cooldown=0;g.update(.02);
 assert.ok(Math.abs(from(g,left).commandAngle-Math.atan2(empty.y-left.y,empty.x-left.x))<1e-12);
});

test('manual squad fire waits for a visible hostile while the commander independently targets the nearest enemy',()=>{
 for(const map of ['livingroom-star','livingroom-pixel','bedroom-star']){
  const g=field(map),c=g.commander(0),gun=add(g,'machinegun',1080,1325);
  g.input={x:-1,y:0};g.setManualAim({x:1,y:0});g.update(.02);
  assert.equal(from(g,gun),undefined,map);
  const enemy=add(g,'rifle',1100,200,1);
  g.update(.02);assert.equal(from(g,gun),undefined,map);
  g.input={x:0,y:0};Object.assign(enemy,{x:985,y:1300});g.setFocus(enemy);c.cooldown=0;g.update(.02);
  const shot=from(g,gun);assert.equal(shot?.commandAngle,0,map);assert.ok(shot.x<shot.target.x);
  assert.equal(from(g,c)?.target,enemy);
  g.setManualAim(null);g.shots=[];gun.cooldown=0;g.update(.02);
  assert.equal(from(g,gun)?.target,enemy,map);
 }
});

test('swept contact selects the first body along the ray and honors movement, range and cover',()=>{
 const g=field(),source=add(g,'machinegun',1000,1300),rear=add(g,'rifle',1170,1300,1),front=add(g,'rifle',1100,1300,1);
 const make=()=>g.fireUnitProjectiles(source,g.commandFirePoint(source,250,0),{damage:10},g.stats(source))[0];
 const hit=make();g.advanceCommandShot(hit,.25,[rear,front]);
 assert.equal(hit.target,front);assert.ok(front.hp<front.maxHp);assert.equal(rear.hp,rear.maxHp);
 const miss=make();front.y+=80;rear.x+=100;g.advanceCommandShot(miss,.4,[rear,front]);
 assert.equal(miss.x,1250);assert.equal(miss.life,0);assert.equal(rear.hp,rear.maxHp);
 const crossing=make();g.advanceCommandShot(crossing,.05,[front]);front.y=1300;
 g.advanceCommandShot(crossing,.1,[front]);assert.equal(crossing.target,front);
 const covered=make(),hp=front.hp;g.obstacles=[{x:1050,y:1270,w:20,h:60}];
 g.advanceCommandShot(covered,.2,[front]);assert.equal(covered.life,0);assert.equal(front.hp,hp);
});

test('mortars and snipers independently target enemies behind the squad through windup and firing',()=>{
 const g=field(),mortar=add(g,'mortar',1100,1300),sniper=add(g,'sniper',1100,1340),enemy=add(g,'rifle',850,1300,1);
 g.setManualAim({x:1,y:0});g.moveOrder={x:1400,y:1300,facing:0};g.update(.02);
 assert.ok(g.mortarShells.some(s=>s.source===mortar&&Math.abs(s.x-enemy.x)<5));
 assert.equal(sniper.sniperAim.target,enemy);
 const fireAt=sniper.sniperAim.fireAt;
 g.update(.02);assert.equal(sniper.sniperAim.fireAt,fireAt);
 for(let i=0;i<60&&!from(g,sniper);i++)g.update(.025);
 assert.equal(from(g,sniper)?.target,enemy);
});

test('each cooperative squad uses its own commander, with straight flight surviving save and restore',()=>{
 const g=field('coop'),a=add(g,'machinegun',1090,1330),b=g.withOwner(1,()=>add(g,'machinegun',1200,1340));
 add(g,'rifle',1130,1170,1);
 g.withOwner(0,()=>{g.setManualAim({x:1,y:0});});
 g.withOwner(1,()=>{g.setManualAim({x:0,y:1});});g.update(.02);
 assert.equal(from(g,a).commandAngle,0);assert.equal(from(g,b).commandAngle,Math.PI/2);
 const saved=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));
 const restored=saved.shots.find(p=>p.source.id===b.id);
 assert.equal(restored.commandAngle,Math.PI/2);assert.equal(restored.source.coopOwner,1);
 assert.equal(restored.travelLeft,from(g,b).travelLeft);
});

test('a distant cooperative squad reacts to its own play area with the other camera left behind',()=>{
 const g=field('coop'),first=add(g,'rifle',1090,1330),second=g.withOwner(1,()=>{
  Object.assign(g.commander(0),{x:1100,y:5500});
  return add(g,'rifle',1090,5530);
 });
 for(const owner of [0,1])g.withOwner(owner,()=>g.setManualAim({x:1,y:0}));
 add(g,'rifle',1100,5420,1);g.update(.02);
 assert.equal(from(g,first),undefined);assert.ok(from(g,second)?.target.commandShot);
});

test('shotgun and radio alternate between automatic targeting and a held manual angle on ordinary and star maps',()=>{
 for(const map of ['livingroom','livingroom-star']){
  const g=field(map),shotgun=add(g,'rifle',1100,1320),dice=add(g,'guntruck',1130,1340),enemy=add(g,'rifle',980,1300,1);
  g.diceFace=()=>6;g.setManualAim({x:1,y:0});g.evolved.rifle=true;g.setFocus(enemy);
  g.update(.01);const pellets=g.shots.filter(s=>s.source===shotgun);
  assert.equal(pellets.length,5);assert.equal(pellets[2].commandAngle,0);assert.ok(pellets.every(s=>s.hot));
  assert.equal(g.radioStrikes.find(d=>d.source===dice).angle,0);assert.equal(enemy.hp,enemy.maxHp);
  g.shots=[];enemy.hp=0;shotgun.cooldown=dice.cooldown=0;g.update(.01);
  assert.equal(g.shots.filter(s=>s.source===shotgun).length,0);assert.equal(g.radioStrikes.length,4);
  g.setManualAim(null);enemy.hp=enemy.maxHp;g.radioStrikes=[];g.move=()=>{};
  g.time=shotgun.shotgunPumpUntil;shotgun.cooldown=dice.cooldown=0;g.update(.01);
  assert.ok(Math.cos(g.shots.find(s=>s.source===shotgun).muzzleAngle)<0);
  assert.ok(Math.cos(g.radioStrikes[0].angle)<0);assert.ok(Math.abs(g.radioStrikes[0].x-enemy.x)<2);
 }
});

test('five-pellet volleys pump for one base second and reload the fourth shell for 1.8 seconds in live combat',()=>{
 const g=field(),c=g.commander(0),u=add(g,'rifle',1100,1320),enemy=add(g,'rifle',980,1300,1);
 const reloads=[];
 g.events.shotgunReload=event=>reloads.push({...event,sequence:u.shotgunSequence});
 g.setManualAim({x:1,y:0});g.move=()=>{};const fired=[];
 for(let i=0;i<540&&fired.length<5;i++){
  const before=u.shotgunSequence||0;g.update(.01);
  if(u.shotgunSequence>before){
   fired.push(g.time);assert.ok(Math.abs(u.shotgunPumpUntil-u.shotgunPumpStartedAt-1)<1e-7);
   assert.equal(g.shots.filter(p=>p.source===u&&p.sequence===u.shotgunSequence).length,5);
  }
 }
 assert.equal(fired.length,5);
 assert.deepEqual(fired.slice(1).map((t,i)=>Number((t-fired[i]).toFixed(2))),[1,1,1,1.8]);
 assert.deepEqual(reloads,[{id:u.id,team:0,x:u.x,y:u.y,duration:1.8,sequence:4}]);
 assert.equal(enemy.hp,enemy.maxHp);assert.equal(u.shotgunRounds,3);
 const basic=g.stats(u);assert.equal(basic.rate,1);assert.equal(g.shotgunReloadTime(u),1.8);
 g.abilities.haste=3;const faster=g.stats(u);assert.ok(faster.rate<basic.rate);
 assert.ok(Math.abs(g.shotgunReloadTime(u)-1.8*faster.rate)<1e-8);
});

test('a visible distant contact starts an incendiary call, and its random position ignores manual aim',()=>{
 const g=field(),radio=add(g,'guntruck',1100,1320),far=add(g,'rifle',2000,1580,1);
 g.visible=()=>true;g.move=g.navigate=g.separateCrowd=()=>{};
 g.diceFace=()=>3;g.random=()=>0;g.setManualAim({x:-1,y:0});
 g.update(.01);
 const shell=g.radioStrikes.find(v=>v.source===radio);
 assert.equal(shell.strike,'incendiary');assert.deepEqual([shell.x,shell.y],[far.x,far.y]);
 const near=add(g,'rifle',1160,1310,1);
 // Keep the same random draw and manual bearing. The far contact is still in
 // allied vision, but a contact on the player's board now takes precedence.
 g.fireUnitProjectiles(radio,g.commandFirePoint(radio,620,Math.PI),{damage:10});
 const second=g.radioStrikes.at(-1);assert.deepEqual([second.x,second.y],[near.x,near.y]);
 const rolls=g.effects.filter(e=>e.kind==='radioRoll');
 assert.deepEqual(rolls.map(r=>[r.tx,r.ty]),[[far.x,far.y],[near.x,near.y]]);
});
test('an automatic missile salvo selects the packed group and attack speed shortens the next roll',()=>{
 const g=field(),radio=add(g,'guntruck',1100,1320);
 add(g,'rifle',1170,1320,1);
 g.scoutUntil=g.time+10;
 const cluster=add(g,'rifle',1360,2020,1);add(g,'rifle',1390,2020,1);add(g,'rifle',1415,2020,1);
 g.move=g.navigate=g.separateCrowd=()=>{};g.diceFace=()=>5;
 const base=g.stats(radio).rate;g.abilities.haste=5;
 g.update(.01);assert.ok(radio.cooldown<base);
 const first=g.radioStrikes[0];assert.equal(first.strike,'missile');assert.equal(first.x,cluster.x);
});
