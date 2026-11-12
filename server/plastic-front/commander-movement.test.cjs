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
