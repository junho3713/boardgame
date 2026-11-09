'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontGame}=require('./public/engine.js'),{CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');for(const k of ['obstacles','defenses','structures','buildings','pickups'])g[k]=[];for(const c of g.units)Object.assign(c,{x:1500,y:6000});g.random=()=>.99;g.visible=g.lineClear=()=>true;return g;}
function duplicate(g,u){a.equal(g.collectSupportToy({active:true,x:1500,y:6000},u.type),true);}
test('all four toys gain exactly two cooldown reductions, keep two slots and fully repair duplicate drops',()=>{
 for(const [type,base]of [['toyDrum',30],['toyDecoyMaker',20],['toyTurtle',5],['toyStunner',10]]){const g=scene(),u=g.addSupportToy(type),stats=g.stats(u);near(g.supportToyCooldown(u),base);for(let i=1;i<=4;i++){u.hp=1;duplicate(g,u);a.equal(g.supportToyUpgrades(u),Math.min(i,2));near(g.supportToyCooldown(u),base*(1-.05*Math.min(i,2)));near(u.hp,u.maxHp);a.equal(g.supportToys().length,1);near(g.stats(u).hp,stats.hp);a.equal(u.star,undefined);}}
});
test('an upgrade preserves current cooldown progress and further duplicates cannot reset it',()=>{
 const g=scene(),u=g.addSupportToy('toyDrum');g.time=15;duplicate(g,u);near(u.toyNextAt,29.25);duplicate(g,u);near(u.toyNextAt,28.5);const at=u.toyNextAt;duplicate(g,u);near(u.toyNextAt,at);g.time=28.5;a.equal(g.useSupportToy(u),true);near(u.toyNextAt-g.time,27);near(u.toyBoostUntil-g.time,0);
});
test('shortened real casts keep effect duration and 70/25/5 probability rules unchanged',()=>{
 for(const type of ['toyDrum','toyDecoyMaker','toyTurtle','toyStunner']){const g=scene(),u=g.addSupportToy(type);duplicate(g,u);duplicate(g,u);g.addUnit(2,'ant',u.x+120,u.y,true);u.toyNextAt=0;g.random=()=>.02;a.equal(g.useSupportToy(u),true);a.equal(u.toyProcTier,2);near(u.toyNextAt-g.time,g.supportToyCooldown(u));if(type==='toyDrum')near(u.toyBoostUntil,10);if(type==='toyStunner')near(g.units.find(t=>t.team!==0).toyStunUntil,3);}
});
test('three separate baits coexist without duplicate aggro assignments; a fourth waits without overwriting',()=>{
 const g=scene(),u=g.addSupportToy('toyDecoyMaker');for(let i=0;i<8;i++){const t=g.addUnit(2,'ant',1700+i*12,6000,true);t.hp=t.maxHp=1e6;}
 for(let i=0;i<3;i++){u.toyNextAt=0;a.equal(g.useSupportToy(u),true);g.time+=.4;g.updateSupportToys(0);}const baits=g.supportBaits();a.equal(baits.length,3);a.equal(new Set(baits.flatMap(d=>d.toyLuredIds)).size,6);a.ok(baits.every(d=>d.toyLuredIds.length===2));for(const d of baits)near(d.toyExpires-d.toyArrivesAt,30);
 u.toyNextAt=0;a.equal(g.useSupportToy(u),false);a.deepEqual(g.supportBaits(),baits);near(u.toyNextAt,Math.min(...baits.map(d=>d.toyExpires)));g.time=baits[0].toyExpires;g.updateSupportToys(0);a.equal(baits[0].hp,0);a.equal(baits[1].hp>0,true);a.equal(g.supportBaits().length,3);
});
test('the normal twenty-second schedule overlaps baits and never resets their lifetime',()=>{
 const g=scene(),u=g.addSupportToy('toyDecoyMaker');u.toyNextAt=0;for(let i=0;i<8;i++)g.addUnit(2,'ant',1700+i*10,6000,true);a.equal(g.useSupportToy(u),true);const first=g.supportBait();g.time=20;a.equal(g.useSupportToy(u),true);a.equal(g.supportBaits().length,2);near(first.toyExpires,30.35);g.time=30.35;g.updateSupportToys(0);a.equal(first.hp,0);a.equal(g.supportBaits().length,1);
});
test('upgrade ranks and every bait survive checkpoint and cooperative owner restoration',()=>{
 const g=scene(true);for(const owner of [0,1])g.withOwner(owner,()=>{const u=g.addSupportToy('toyDecoyMaker');if(!owner){duplicate(g,u);duplicate(g,u);}for(let i=0;i<3;i++){const b=g.addUnit(0,'toyDecoy',1500+i*50,6000,true);b.toyArrivesAt=.35;b.toyExpires=30.35;b.toyLifetimeVersion=2;}});const copy=unpack(new CoopGame(),JSON.parse(JSON.stringify(pack(g))));for(const owner of [0,1])copy.withOwner(owner,()=>{a.equal(copy.supportBaits().length,3);near(copy.supportToyCooldown(copy.supportToys()[0]),owner?20:18);a.equal(copy.supportToyUpgrades(copy.supportToys()[0]),owner?0:2);});
});
test('old saves migrate remaining fishing cooldown once without resetting any bait or other toy',()=>{
 const g=scene(),u=g.addSupportToy('toyDecoyMaker');delete u.toyCooldown;delete u.toyUpgradeLevel;u.toyNextAt=30.35;g.time=15.175;g.useSupportToy(u);near(u.toyNextAt,25.175);g.useSupportToy(u);near(u.toyNextAt,25.175);a.equal(g.supportToyUpgrades(u),0);
});
