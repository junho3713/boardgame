'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js');
const {pack,unpack}=require('./public/autoplay.js');
function scene(type='ant',coop=false){
 const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();
 g.units=g.units.filter(t=>t.team===0&&t.type==='leader');g.obstacles=[];g.buildings=[];g.structures=[];g.defenses=[];g.effects=[];g.visible=g.lineClear=()=>true;
 for(const c of g.alive(0))Object.assign(c,{x:1000,y:6000,cooldown:1e6});
 const enemy=g.addUnit(2,type,1800,6000);enemy.assault=true;
 const bait=g.addUnit(0,'toyDecoy',1700,6000,true);Object.assign(bait,{toyArrivesAt:0,toyExpires:30,toyLifetimeVersion:2,toyLuredIds:[enemy.id]});return{g,enemy,bait};
}
test('only nearby bait ahead on the natural route diverts an approaching enemy',()=>{
 const {g,enemy,bait}=scene();assert.equal(g.pursuitTarget(enemy),bait);
 for(const [x,y]of [[1700,6200],[1900,6000],[1590,6000]]){Object.assign(bait,{x,y});assert.equal(g.supportDecoyTarget(enemy),null);assert.notEqual(g.pursuitTarget(enemy),bait);assert.equal(g.canTarget(enemy,bait),false);}
 Object.assign(bait,{x:1700,y:6000});assert.equal(g.supportDecoyTarget(enemy),bait);g.lineClear=()=>false;assert.equal(g.supportDecoyTarget(enemy),null);
});
test('a soldier in front and an ally already in firing range take priority over bait',()=>{
 for(const type of ['ant','rifle','tank','crimsonAce']){const {g,enemy,bait}=scene(type);const ally=g.addUnit(0,'rifle',1750,6000);assert.equal(g.supportDecoyTarget(enemy),null,type);assert.equal(g.canTarget(enemy,bait),false,type);assert.equal(g.pursuitTarget(enemy),ally,type);}
 const {g,enemy,bait}=scene('rifle');g.commander(0).x=1600;assert.equal(g.supportDecoyTarget(enemy),null);assert.notEqual(g.pursuitTarget(enemy),bait);
});
test('route changes release lure slots and later approaching enemies can take them',()=>{
 const {g,enemy,bait}=scene();g.updateSupportToys(0);assert.deepEqual(bait.toyLuredIds,[enemy.id]);
 const ally=g.addUnit(0,'rifle',1750,6000);g.updateSupportToys(0);assert.deepEqual(bait.toyLuredIds,[]);
 ally.hp=0;g.updateSupportToys(0);assert.deepEqual(bait.toyLuredIds,[enemy.id]);assert.equal(g.supportDecoyTarget(enemy),bait);
});
test('all boss categories destroy bait with one damaging hit, ordinary enemies retain the thirty-second lifetime',()=>{
 for(const [type,flag]of [['rhinoBeetle','boss'],['hornet','boss'],['bayonetCaptain','roadCaptain'],['crimsonAce','boss'],['swordEmpress','finalBoss']]){const {g,enemy,bait}=scene(type);enemy[flag]=true;const losses=g.losses[0],cash=g.cash[0];g.damage(bait,0,enemy);assert.ok(bait.hp>0);g.damage(bait,1,enemy);assert.equal(bait.hp,0,type);assert.equal(bait.toyExpires,g.time);assert.equal(g.supportDecoyTarget(enemy),null);assert.equal(g.losses[0],losses);assert.equal(g.cash[0],cash);}
 const {g,enemy,bait}=scene();g.damage(bait,1e6,enemy);assert.equal(bait.hp,bait.maxHp);g.time=29.99;g.updateSupportToys(0);assert.ok(bait.hp>0);g.time=30;g.updateSupportToys(0);assert.equal(bait.hp,0);
});
test('a boss arriving at a shark bait triggers the ambush before destroying it, without repeated damage',()=>{
 const {g,enemy,bait}=scene('rhinoBeetle');enemy.boss=true;enemy.x=bait.x+50;enemy.hp=enemy.maxHp=1e6;
 g.supportBursts=[{source:g.commander(0),owner:0,bait,state:'circling',x:bait.x,y:bait.y,angle:0,tier:1,damage:100,radius:140,strength:2,shown:false,hit:false}];
 g.damage(bait,1,enemy);assert.equal(bait.hp,0);const burst=g.supportBursts[0];assert.equal(burst.state,'breaching');
 g.time=burst.impactAt;g.updateSupportBursts();assert.ok(enemy.hp<enemy.maxHp);const hp=enemy.hp;g.updateSupportBursts();assert.equal(enemy.hp,hp);
});
test('a cooperative saved bait uses the same route and boss-hit rules after restoration',()=>{
 const {g,enemy,bait}=scene('rhinoBeetle',true);enemy.boss=true;const copy=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));copy.visible=copy.lineClear=()=>true;
 const boss=copy.units.find(t=>t.id===enemy.id),d=copy.units.find(t=>t.id===bait.id);assert.equal(copy.supportDecoyTarget(boss),d);copy.damage(d,1,boss);assert.equal(d.hp,0);
});
