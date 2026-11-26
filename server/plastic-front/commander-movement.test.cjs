'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-6,`${x} != ${y}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.units=g.units.filter(u=>u.type==='leader');const c=g.commander(0);c.x=1500;c.y=6000;for(const key of ['updateMission','updateSwarm','updateBosses','updateArtillery','gainXP','levelCheck','syncEnemyGrowth'])g[key]=()=>{};return g;}

test('nearby or lagging infantry and armor never throttle commander input, including cooperative owners',()=>{
 for(const coop of [false,true]){const g=scene(coop);for(const owner of coop?[0,1]:[0]){const check=()=>{const c=g.commander(0);c.x=1500;c.y=6000;for(const appearance of ['sarge','shino','blaze','shion']){c.appearance=appearance;for(const type of ['tank','guntruck','rifle','machinegun']){const u=g.addUnit(0,type,c.x-150,c.y+200);for(const x of [-500,-90,0,90,100,500]){u.x=c.x+x;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[1,1]])near(g.commanderMoveSpeed(dx,dy),g.stats(c).speed);}u.hp=0;}}};if(coop)g.withOwner(owner,check);else check();}}
});

test('keyboard movement and a direct move order cover the normal commander distance with a tank behind',()=>{
 for(const order of [false,true]){const g=scene(),c=g.commander(0);g.addUnit(0,'tank',c.x-200,c.y+200);if(order)g.moveOrder={x:c.x+600,y:c.y,facing:0};else g.input={x:1,y:0};const x=c.x,speed=g.stats(c).speed;for(let i=0;i<10;i++)g.update(.05);near(c.x-x,speed*.5);near(c.y,6000);}
});

test('commander control still honors actual slow, root and drum buff expiry without adding a hit movement penalty',()=>{
 const g=scene(),c=g.commander(0);g.time=10;g.addUnit(0,'tank',c.x-150,c.y+200);const normal=g.stats(c).speed,x=c.x;c.slowUntil=11;c.slowAmount=.3;g.move(c,1000,0,.1,g.commanderMoveSpeed(1,0));near(c.x-x,normal*.7*.1);c.rootedUntil=11;const stopped=c.x;g.move(c,1000,0,.1,g.commanderMoveSpeed(1,0));near(c.x,stopped);g.time=12;const after=c.x;g.damage(c,1,{team:2,type:'rifle',x:c.x-100,y:c.y});g.move(c,1000,0,.1,g.commanderMoveSpeed(1,0));near(c.x-after,normal*.1);const drum=g.addUnit(0,'toyDrum',c.x+70,c.y+70);drum.toyBoostUntil=20;drum.toyProcTier=2;near(g.commanderMoveSpeed(1,0),normal*1.3);g.time=21;near(g.commanderMoveSpeed(1,0),normal*1.05);drum.hp=0;near(g.commanderMoveSpeed(1,0),normal);
});

test('a radio already at the front retreats into the medic line when a threat approaches',()=>{
 const g=scene(),c=g.commander(0);
 const radio=g.addUnit(0,'guntruck',c.x,c.y-125);
 const medic=g.addUnit(0,'medic',c.x+65,c.y+120);
 const rifle=g.addUnit(0,'rifle',c.x+50,c.y-85);
 const threat=g.addUnit(2,'artillery',c.x,c.y-300,true);
 radio.cooldown=999;
 g.updateFormationFacing(1);
 a.equal(g.formationEnemy,threat);
 a.ok(g.formationPoint(rifle,c).y<c.y-80);
 near(g.formationPoint(radio,c).y,g.formationPoint(medic,c).y);
 for(let i=0;i<60;i++)g.update(.05);
 a.ok(radio.y>c.y+65,'radio returns behind the commander during combat');
 threat.y=c.y+300;
 g.updateFormationFacing(.05);
 a.ok(g.formationPoint(radio,c).y<c.y-65,'radio takes the side away from the new threat');
});

test('radio follows its own commander during a distant ground order or siege in co-op',()=>{
 const g=scene(true);
 for(const owner of [0,1])g.withOwner(owner,()=>{
  const c=g.commander(0);
  c.x=owner?1850:1200;c.y=6000;
  const direction=owner?-1:1;
  g.formationFacing=owner?Math.PI:0;
  g.guardianSiege=null;
  g.moveOrder={x:c.x+direction*500,y:c.y,facing:g.formationFacing};
  const radio=g.addUnit(0,'guntruck',c.x,c.y+60);
  const assertRear=()=>{
   const target=g.formationPoint(radio,g.squadMoveAnchor(radio));
   a.ok((target.x-c.x)*direction<-65);
   a.ok(Math.hypot(target.x-c.x,target.y-c.y)<=210);
  };
  assertRear();
  g.guardianSiege={hp:100,x:c.x+direction*590,y:c.y,defenseKind:'laserTower'};
  assertRear();
 });
 const enemy=g.commander(1);
 enemy.x=1300;enemy.y=1800;
 const truck=g.addUnit(1,'guntruck',enemy.x,enemy.y+120);
 a.ok(g.formationPoint(truck,enemy,Math.PI/2).y>enemy.y);
});

test('radio drop pods prefer the rear and fall back to otherwise valid landing spots',()=>{
 const g=scene(),c=g.commander(0);
 g.formationFacing=-Math.PI/2;
 g.random=()=>.75;
 const [rear]=g.planSummonLandings([{type:'guntruck'}]);
 a.ok(rear.y>c.y);
 g.freePosition=(x,y)=>y<c.y;
 const [fallback]=g.planSummonLandings([{type:'guntruck'}]);
 a.ok(fallback.y<c.y);
});
