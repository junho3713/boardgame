'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {FrontGame,TYPES}=require('./public/engine.js');
const {pack,unpack}=require('./public/autoplay.js');

function renderer(){
 const window={FrontTypes:TYPES},context=vm.createContext({window,Math,Map,WeakMap,WeakSet,Promise});
 for(const file of ['effects.js','impact-materials.js','projectile-materials.js','evolution-effects.js'])vm.runInContext(fs.readFileSync(__dirname+'/public/'+file,'utf8'),context,{filename:file});
 const textures=Object.fromEntries(['glow','fire','smoke','whiteSmoke','dust','scorch','exhaust'].map(k=>[k,{name:k}]));
 return new window.FrontEffects({textures});
}
function scene(distance=100,type='tank'){
 const g=new FrontGame();g.start();g.units=g.units.filter(u=>u.type==='leader');g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.pickups=[];
 for(const method of ['updateMission','updateSwarm','updateBosses','updateArtillery','gainXP','levelCheck','syncEnemyGrowth','move','navigate','separateCrowd','resolvePosition'])g[method]=()=>{};
 g.visible=()=>true;g.lineClear=()=>true;
 const source=g.addUnit(0,'lucky',800,1500),target=g.addUnit(2,type,800+distance,1500);
 source.nextLuckyAt=Infinity;target.boss=true;target.hp=target.maxHp=1e6;g.evolved.lucky=true;
 for(const u of g.units)u.cooldown=1e6;
 return {g,source,target};
}
function near(actual,expected,tolerance=1e-7){a.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);}
function finitePose(p){for(const key of ['x','y','angle'])a.ok(Number.isFinite(p[key]),`${key} must be finite`);}
function directionMatches(angle,dx,dy){const length=Math.hypot(dx,dy);a.ok(length>1e-9);a.ok((Math.cos(angle)*dx+Math.sin(angle)*dy)/length>1-1e-6,'missile nose must follow the visible path');}

test('777 progresses toward its impact in every direction and distance without a backwards turn',()=>{
 const fx=renderer(),source={type:'lucky',team:0,x:800,y:1500};
 for(const distance of [12,32,90,240,480])for(let direction=0;direction<8;direction++)for(const lane of [-75,-25,0,25,75]){
  const angle=direction*Math.PI/4,shell={kind:'missile',source,team:0,fromX:800,fromY:1476,x:800+Math.cos(angle)*distance,y:1500+Math.sin(angle)*distance,delay:1,landAt:4,luckyLane:lane};
  const start=fx.mortarPose(shell,3),end=fx.mortarPose(shell,4),dx=end.x-start.x,dy=end.y-start.y;
  near(start.x,shell.fromX);near(start.y,shell.fromY);near(end.x,shell.x);near(end.y,shell.y);
  let previous=start;
  for(let step=1;step<=100;step++){
   const current=fx.mortarPose(shell,3+step/100);finitePose(current);
   a.ok((current.x-previous.x)*dx+(current.y-previous.y)*dy>0,`backwards flight: distance=${distance}, direction=${direction}, lane=${lane}, step=${step}`);
   previous=current;
  }
  for(const fraction of [.1,.3,.5,.7,.9]){
   const before=fx.mortarPose(shell,3+fraction-1e-5),after=fx.mortarPose(shell,3+fraction+1e-5),current=fx.mortarPose(shell,3+fraction);
   directionMatches(current.angle,after.x-before.x,after.y-before.y);
  }
 }
});

test('777 accelerates into a shorter landing while keeping a fixed launch point after the vehicle moves',()=>{
 const {g,source,target}=scene(240),fx=renderer();g.launchMissile(source,target,{damage:700,lane:75});const shell=g.mortarShells[0];
 near(shell.delay,.35);near(shell.landAt-g.time,.35);
 const first=fx.mortarPose(shell,.15);source.x-=300;source.y+=200;const moved=fx.mortarPose(shell,.15);
 near(first.x,moved.x);near(first.y,moved.y);near(first.angle,moved.angle);
 const hp=target.hp;g.time=shell.landAt-.001;g.updateMortars();a.equal(target.hp,hp);a.equal(g.mortarShells.length,1);
 g.time=shell.landAt;g.updateMortars();a.equal(g.mortarShells.length,0);a.ok(target.hp<hp);
});

test('allied 777 speed scales with distance while enemy jackpots and missile buildings retain their timing',()=>{
 for(const distance of [10,240,480]){
  const {g,source,target}=scene(distance);g.launchMissile(source,target);const shell=g.mortarShells[0];
  near(shell.delay,Math.max(.35,Math.min(.6,distance/850)));
  for(const actor of [{...source,team:2},{...source,type:'missileBase'}]){g.launchMissile(actor,target);near(g.mortarShells.at(-1).delay,g.buildingStats('missileBase',actor.team).flightTime);}
 }
});

test('a close boss-killer stays in flight for 0.28 seconds and applies its existing damage exactly once',()=>{
 const {g,source,target}=scene(10);g.castLucky(source,'bossKiller');const shot=g.shots[0],hp=target.hp;
 near(shot.guidedFlight.duration,.28);near(shot.damage,6000*g.luckyScale(source));
 const expected=shot.damage*100/(100+g.stats(target).defense*.35),impact=g.impact;let calls=0;
 g.impact=function(p){if(p===shot)calls++;return impact.call(this,p);};
 for(let frame=0;frame<5;frame++){g.update(.05);a.ok(g.shots.includes(shot),'close projectile vanished before the minimum flight');a.equal(target.hp,hp);}
 for(let frame=0;frame<20;frame++)g.update(.05);
 a.equal(g.shots.includes(shot),false);a.equal(calls,1);near(hp-target.hp,expected,1e-6);
});

test('boss-killer pause freezes simulation, flight metadata and its rendered pose',()=>{
 const {g,source}=scene(300),fx=renderer();g.castLucky(source,'bossKiller');g.update(.05);const shot=g.shots[0];
 g.phase='paused';const saved=JSON.stringify(shot.guidedFlight),time=g.time,position=fx.materialShotPose(shot);
 for(let frame=0;frame<30;frame++)g.update(.05);
 a.equal(g.time,time);a.equal(JSON.stringify(shot.guidedFlight),saved);
 const current=fx.materialShotPose(shot);near(current.x,position.x);near(current.y,position.y);near(current.angle,position.angle);
});

test('guided boss-killers follow the visible path to a moving flying boss independently of vehicle movement',()=>{
 const {g,source,target}=scene(300,'hornet'),fx=renderer();target.visualFlightHeight=80;g.castLucky(source,'bossKiller');const shot=g.shots[0],flight=shot.guidedFlight;
 near(flight.launchHeight,30);near(flight.targetHeight,96);
 let previous=fx.materialShotPose(shot);finitePose(previous);near(previous.y,source.y-30);
 for(let frame=1;frame<=5;frame++){
  g.time=frame*.04;target.x+=3;target.y-=2;g.updateBossKillerFlight(shot,.04);
  const current=fx.materialShotPose(shot);finitePose(current);directionMatches(current.angle,current.x-previous.x,current.y-previous.y);
  const before={x:current.x,y:current.y,angle:current.angle};source.x-=50;source.y+=35;
  const moved=fx.materialShotPose(shot);near(moved.x,before.x);near(moved.y,before.y);near(moved.angle,before.angle);previous=current;
 }
 g.time=flight.startedAt+flight.duration;g.updateBossKillerFlight(shot,.05);const end=fx.materialShotPose(shot);
 near(end.x,target.x);near(end.y,target.y-96);a.equal(shot.life,0);
});

test('save and restore preserve guided-flight metadata, actor references and the remaining flight',()=>{
 const {g,source,target}=scene(400);g.castLucky(source,'bossKiller');const shot=g.shots[0];g.time=.2;g.updateBossKillerFlight(shot,.2);
 const restored=unpack(scene().g,JSON.parse(JSON.stringify(pack(g)))),copy=restored.shots[0];
 a.deepEqual(copy.guidedFlight,shot.guidedFlight);a.equal(copy.source,restored.units.find(u=>u.id===source.id));a.equal(copy.target,restored.units.find(u=>u.id===target.id));
 for(const time of [.25,.35,shot.guidedFlight.startedAt+shot.guidedFlight.duration]){
  g.time=restored.time=time;g.updateBossKillerFlight(shot,.05);restored.updateBossKillerFlight(copy,.05);
  near(copy.x,shot.x);near(copy.y,shot.y);near(copy.guidedFlight.heading,shot.guidedFlight.heading);near(copy.target.hp,target.hp);a.equal(copy.life,shot.life);
 }
});

test('legacy boss-killer saves without flight metadata still render and resolve through the generic projectile loop',()=>{
 const {g,source,target}=scene(10),fx=renderer();g.castLucky(source,'bossKiller');const shot=g.shots[0];delete shot.guidedFlight;
 finitePose(fx.materialShotPose(shot));const hp=target.hp;g.update(.05);a.equal(g.shots.includes(shot),false);a.ok(target.hp<hp);
});
