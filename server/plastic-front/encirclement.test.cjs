'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];const c=g.commander(0);Object.assign(c,{x:1500,y:4200});g.camera={x:c.x,y:c.y};g.viewport={width:900,height:700};return g;}
test('ordinary room waves cycle north, east, south and west outside the actual viewport',()=>{
 const g=scene(),sides=[];for(let i=0;i<12;i++){g.units=g.units.filter(u=>u.team===0);const u=g.spawnRoomEnemy('ant'),v=g.spawnView();a.ok(u);sides.push(u.roomEntrySide);a.ok(u.x+55<v.left||u.x-55>v.right||u.y+55<v.top||u.y-55>v.bottom);a.ok(g.freePosition(u.x,u.y,55));a.ok(Math.hypot(u.x-1500,u.y-4200)>205);}
 a.deepEqual(sides,[0,1,2,3,0,1,2,3,0,1,2,3]);
});
test('blocked or out-of-map sides fall back to a valid edge, never inside the view or on troops',()=>{
 const g=scene(),v=g.spawnView(),free=g.freePosition;g.freePosition=function(x,y,r){return y>v.top&&free.call(this,x,y,r);};const p=g.roomEntry(2,55,0);a.ok(p);a.notEqual(p.entrySide,0);g.freePosition=()=>false;a.equal(g.roomEntry(3,55,0),null);a.equal(g.spawnRoomEnemy('ant'),null);
 const corner=scene();Object.assign(corner.commander(0),{x:100,y:100});corner.camera={x:100,y:100};for(let side=0;side<4;side++){const p=corner.roomEntry(5,55,side);a.ok(p);a.ok(p.x>=100&&p.y>=125);a.ok(p.entrySide===1||p.entrySide===2);}
});
test('eight guards stay beside the crate, approach adds four exactly once, and all twelve gate collection',()=>{
 const g=scene();g.time=120;g.updateRareSupplies();const p=g.pickups[0],c=g.commander(0),guards=g.rareSupplyGuards(p);a.equal(guards.length,8);for(const u of guards){a.ok(Math.hypot(u.x-p.x,u.y-p.y)<=181);a.equal(u.supplyAnchorX,p.x);a.equal(g.pursuitTarget(u).x,u.homeX);}
 Object.assign(c,{x:p.x,y:p.y+300});g.updateRareSupplySecurity();a.equal(g.rareSupplyGuards(p).length,12);g.updateRareSupplySecurity();a.equal(g.rareSupplyGuards(p).length,12);a.equal(p.ambushPending,false);Object.assign(c,{x:p.x,y:p.y});a.equal(g.collectFieldSupply(p),false);for(const u of g.rareSupplyGuards(p))g.damage(u,1e9,c);a.equal(g.collectFieldSupply(p),true);
});
test('supply sentries pursue nearby attackers but return home instead of abandoning the supply',()=>{
 const g=scene();g.time=120;g.updateRareSupplies();const p=g.pickups[0],u=g.rareSupplyGuards(p)[0],c=g.commander(0);Object.assign(c,{x:p.x+200,y:p.y});a.equal(g.pursuitTarget(u),c);u.x=p.x+400;a.deepEqual(g.pursuitTarget(u),{x:u.homeX,y:u.homeY});Object.assign(c,{x:p.x+900,y:p.y});u.x=u.homeX;a.deepEqual(g.pursuitTarget(u),{x:u.homeX,y:u.homeY});
});
test('old active rare crates gain the missing guards once without resurrecting earned kills',()=>{
 const g=scene();g.time=120;g.updateRareSupplies();const p=g.pickups[0],old=g.rareSupplyGuards(p);p.guardIds=old.slice(0,5).map(u=>u.id);g.units=g.units.filter(u=>!old.slice(5).includes(u));p.guardVersion=1;old[0].hp=0;const kills=g.kills;g.upgradeRareSupplyGuards();a.equal(p.guardIds.length,8);a.equal(g.rareSupplyGuards(p).length,7);a.equal(old[0].hp,0);a.equal(g.kills,kills);const serial=g.serial;g.upgradeRareSupplyGuards();a.equal(g.serial,serial);
 const restored=unpack(scene(),JSON.parse(JSON.stringify(pack(g))));restored.upgradeRareSupplyGuards();a.equal(restored.rareSupplyGuards(restored.pickups[0]).length,7);
});
test('hostile rifle and machinegun sentries use the existing 3D enemy atlases across team IDs',async()=>{
 const window={},context=vm.createContext({window,Math,Map,WeakMap,Promise,Image:class{set src(value){this.url=value;this.onload();}}});vm.runInContext(fs.readFileSync(__dirname+'/public/models.js','utf8'),context);const m=Object.create(window.FrontModels.prototype);m.assets=new Map();m.loaded=0;m.failures=0;m.manifest=JSON.parse(fs.readFileSync(__dirname+'/public/assets/models/manifest.json','utf8'));
 for(const type of ['rifle','machinegun','sniper','mortar']){const hostile=m.ensure(type,2);a.ok(hostile,type+' fell back to placeholder');await hostile.loading;a.equal(hostile.ready,true);a.equal(hostile,m.ensure(type,1));a.ok(hostile.layers.body.image.url.includes(type+'-1'));}
});
test('cooperative supply upgrades and waves share one world schedule without multiplying guards',()=>{
 const g=scene(true);g.time=120;g.updateRareSupplies();const p=g.pickups[0];for(const owner of [0,1])g.withOwner(owner,()=>{const c=g.commander(0);Object.assign(c,{x:p.x,y:p.y+300});g.updateRareSupplySecurity();});a.equal(g.rareSupplyGuards(p).length,12);a.equal(g.pickups.length,1);
});

test('real update ticks spawn a mini offscreen and bring it toward the squad without overriding spawn logic',()=>{
 const g=scene();g.time=59.8;for(const key of ['updateMission','updateSwarm','updateArtillery','levelCheck'])g[key]=()=>{};for(let i=0;i<10;i++)g.update(.05);const mini=g.units.find(u=>u.miniBoss&&u.hp>0);a.ok(mini);const c=g.commander(0),distance=Math.hypot(mini.x-c.x,mini.y-c.y);for(let i=0;i<60;i++)g.update(.05);a.ok(Math.hypot(mini.x-c.x,mini.y-c.y)<distance-50);a.equal(g.units.filter(u=>u.miniBoss&&u.hp>0).length,1);
});
