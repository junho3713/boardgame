'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {CoopGame}=require('./public/coop-engine.js');
const {FrontGame,FrontProfile}=require('./public/engine.js');
function game(){const g=new CoopGame();g.start();return g;}
test('two-star living-room layout and individual enemy stats match the solo game',()=>{
 const g=game(),solo=new FrontGame({},new FrontProfile(),{map:'livingroom-star'});
 assert.equal(g.starMax,2);assert.deepEqual(g.bounds(),solo.bounds());assert.deepEqual(g.obstacles,solo.obstacles);
 for(const type of ['ant','stagBeetle','hornet'])assert.deepEqual(g.stats({team:2,type,threat:0}),solo.stats({team:2,type,threat:0}));
 assert.equal(g.units.filter(u=>u.team===0&&u.type==='leader').length,2);
 assert.equal(g.canTarget(g.owned(0)[0],g.owned(1)[0]),false);
});
test('movement, spending, combat credit, upgrade stats and fusion remain personal',()=>{
 const g=game(),green=g.withOwner(0,()=>g.commander(0)),blue=g.withOwner(1,()=>g.commander(0));
 const before={green:{x:green.x,y:green.y},blue:{x:blue.x,y:blue.y}};
 g.withOwner(1,()=>{g.input={x:1,y:0};});for(let i=0;i<8;i++)g.update(.05);
 assert.ok(blue.x>before.blue.x);assert.ok(Math.abs(green.x-before.green.x)<2);
 const blueCash=g.withOwner(1,()=>g.cash[0]);g.withOwner(0,()=>{g.cash[0]=1000;assert.ok(g.buy('rifle'));});
 assert.equal(g.withOwner(1,()=>g.cash[0]),blueCash);
 assert.equal(g.owned(0).filter(u=>u.type==='rifle'&&u.star===2).length,1);
 assert.equal(g.owned(1).filter(u=>u.type==='rifle').length,2);
 const enemy=g.addUnit(2,'ant',green.x+200,green.y);const greenXP=g.xp,otherXP=g.withOwner(1,()=>g.xp);
 g.damage(enemy,1e9,blue);assert.equal(g.xp,greenXP);assert.ok(g.withOwner(1,()=>g.xp)>otherXP);
 const greenRifle=g.owned(0).find(u=>u.type==='rifle'),blueRifle=g.owned(1).find(u=>u.type==='rifle'),oldBlue=g.stats(blueRifle).damage;
 g.withOwner(0,()=>{g.abilities.damage=5;g.tech[0].rifle=5;});assert.equal(g.stats(blueRifle).damage,oldBlue);assert.ok(g.stats(greenRifle).damage>oldBlue);
});
test('one player choosing never stops time, shields only that squad for exactly five seconds',()=>{
 const g=game();g.withOwner(0,()=>{g.xp=g.neededXP();});g.levelCheck();
 assert.equal(g.phase,'playing');assert.deepEqual(g.coopChoosing,[true,false]);assert.equal(g.coopInvulnerable[0],5);
 const a=g.owned(0)[0],b=g.owned(1)[0],source={team:2,type:'ant'},hp=a.hp;
 g.damage(a,10,source);assert.equal(a.hp,hp);const blueHP=b.hp;g.damage(b,10,source);assert.ok(b.hp<blueHP);
 for(let i=0;i<101;i++)g.update(.05);assert.ok(g.time>5);assert.equal(g.coopChoosing[0],true);assert.equal(g.phase,'playing');
 g.damage(a,10,source);assert.ok(a.hp<hp);
});
test('regular wave counts average 1.8x with scaled caps while boss schedules remain original',()=>{
 const g=game(),solo=new FrontGame({},new FrontProfile(),{map:'livingroom-star'});let original=0,expanded=0;
 for(let i=0;i<5;i++){const a=FrontGame.prototype.roomWavePlan.call(g).count,b=g.roomWavePlan().count;original+=a;expanded+=b;g.coopSpawnRemainder=(a*1.8+g.coopSpawnRemainder)%1;}
 assert.equal(expanded,original*1.8);assert.equal(g.roomWaveCap(),Math.ceil(solo.roomWaveCap()*1.8));assert.equal(g.bossState.nextAt,solo.bossState.nextAt);
});
test('the unchanged 20-minute finale loads all four persistent swords on the server',()=>{
 const g=game(),config=require('./public/room-campaign.js').config;
 g.time=1200;g.roomCampaign.bossCursor=config.bosses.length-1;g.roomCampaign.rushCursor=config.bossRush.pairs.length;g.roomCampaign.bossReadyAt=0;
 g.updateBosses();g.update(.05);const boss=g.units.find(u=>u.finalBoss);
 assert.ok(boss);assert.equal(boss.type,'swordEmpress');assert.equal(boss.swords.blades.length,4);assert.ok(boss.maxHp>0);
});
