const {test}=require('node:test'),a=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {pack,unpack,FrontAutoPilot}=require('./public/autoplay.js');
const {FrontRunSave}=require('./public/run-save.js');
const map=require('./public/desktop-star.js'),base=require('./public/waves-defense.js');
const create=()=>new FrontGame({},undefined,{map:'desktop-star'});
test('new desk battlefield has independent geometry, central HQ and completed starting defenses',()=>{
 const g=create(),old=new FrontGame({},undefined,{map:'desktop'});
 a.equal(g.battlefieldId(),'desktop-star');a.equal(g.isDesktopDefense(),true);a.equal(g.isRoomCampaign(),false);a.equal(g.starMax,2);
 a.deepEqual([g.bounds().width,g.bounds().height],[2800,3200]);a.notDeepEqual(g.obstacles,old.obstacles);
 a.deepEqual([g.bases[0].x,g.bases[0].y,g.bases[0].hp],[1400,1600,4000]);
 a.equal(g.buildingCount('mgTower'),2);a.equal(g.buildingCount('barricade'),2);a.equal(g.cash[0],135);
 a.ok(g.buildings.every(b=>b.starter&&b.hp===b.maxHp&&b.buildUntil===0));
 const other=create();g.obstacles[0].x=42;a.notEqual(other.obstacles[0].x,42);a.equal(old.bases[0].hp,900);
});
test('two-star recruitment fuses three copies and keeps existing attack, health and medic multipliers',()=>{
 const g=create();g.start();g.cash[0]=10000;g.phase='choice';a.equal(g.buy('rifle'),true);
 a.equal(g.twoStarCount('rifle'),1);a.equal(g.fusionCandidates('rifle').length,0);
 const u=g.alive(0).find(u=>u.type==='rifle'),one=g.stats({...u,star:1}),two=g.stats(u);a.equal(u.star,2);a.equal(two.damage,one.damage*3);a.equal(two.hp,one.hp*2.5);
 g.tech[0].medic=1;for(let i=0;i<3;i++)a.equal(g.buy('medic'),true);
 const m=g.alive(0).find(u=>u.type==='medic');a.equal(g.stats(m).heal,g.stats({...m,star:1}).heal*2.5);a.equal(g.isThreeStarExperiment(),false);
});
test('all four approaches spawn offscreen away from allies and have routes to the central base',()=>{
 const g=create(),v=g.spawnView(),sides=[];
 for(let i=1;i<=4;i++){const p=g.desktopEntry(i);a.ok(p);sides.push(p.entrySide);a.ok(p.x+50<v.left||p.x-50>v.right||p.y+50<v.top||p.y-50>v.bottom);a.ok(g.freePosition(p.x,p.y,50));a.ok(g.findPath(p,g.bases[0],30).length);a.ok(g.alive(0).every(u=>Math.hypot(u.x-p.x,u.y-p.y)>200));}
 a.deepEqual(sides,[0,1,2,3]);
});
test('map supply locations are reachable and timed supplies stay on the new map',()=>{
 const g=create();g.start();for(const p of map.config.supplies){a.ok(g.freePosition(p.x,p.y,24));a.ok(g.findPath(g.commander(0),p,24).length);}
 for(const p of g.pickups)p.active=false;g.time=75;g.updateDesktopDefense();const p=g.pickups.find(p=>p.active);a.ok(map.config.supplies.some(q=>q.x===p.x&&q.y===p.y));a.equal(g.desktop.nextSupply,150);
});
test('wave variant postpones the first boss, grows later numbers and leaves older maps intact',()=>{
 const before=JSON.stringify(base),g=create(),rules=g.waveRules(),old=new FrontGame({},undefined,{map:'desktop'});
 a.equal(rules.boss.firstAt,240);a.equal(g.bossState.nextAt,240);a.equal(old.bossState.nextAt,120);a.equal(rules.swarm.firstAt,8);
 g.time=720;old.time=720;a.ok(g.pressure().combatCap>old.pressure().combatCap);a.ok(g.pressure().swarmBatch>old.pressure().swarmBatch);a.equal(JSON.stringify(base),before);
});
test('manual save and engine checkpoints restore map identity, casualties and building damage',()=>{
 const g=create();g.start();g.time=81;g.bases[0].hp=2376;g.buildings[0].hp=123;g.units.find(u=>u.type==='rifle').hp=0;
 const restored=unpack(new FrontGame(),pack(g));a.equal(restored.battlefieldId(),'desktop-star');a.equal(restored.waveRules().boss.firstAt,240);a.equal(restored.bases[0].hp,2376);a.equal(restored.buildings[0].hp,123);a.equal(restored.alive(0).length,2);
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},save=new FrontRunSave(storage,{id:'test'});a.equal(save.save(g),true);const loaded=save.load().game;a.equal(loaded.desktopStar,true);a.equal(loaded.battlefieldId(),'desktop-star');a.equal(loaded.bases[0].hp,2376);a.equal(loaded.world.variant,'desktop-star');
});
test('20-minute defense requires a surviving HQ and preserves the shared result rules',()=>{
 const win=create();win.start();win.time=1200;win.updateDesktopDefense();a.equal(win.phase,'ended');a.equal(win.result,'win');
 const lose=create();lose.start();lose.bases[0].hp=0;lose.time=1200;lose.updateDesktopDefense();a.equal(lose.phase,'ended');a.equal(lose.result,'lose');
});
test('AI can choose a firing position south of the HQ on the new four-sided map',()=>{
 const g=create(),p=new FrontAutoPilot(g,undefined,17);p.start();g.units.filter(u=>u.team===0).forEach(u=>{u.x=800;u.y=1600;});const enemy=g.addUnit(2,'ant',1400,2030);g.focusTarget=null;p.defendDesktop([enemy]);a.equal(g.focusTarget,enemy);a.ok(g.moveOrder);a.ok(g.moveOrder.y>g.bases[0].y-130);
});
test('defenders intercept a nearby outpost attacker; leaving the HQ exposed remains dangerous',()=>{
 const g=create();g.start();const enemy=g.addUnit(2,'ant',1400,1715);enemy.assault=true;
 a.equal(g.pursuitTarget(enemy).base,undefined);for(const u of g.alive(0)){u.x=1400;u.y=2700;}a.equal(g.pursuitTarget(enemy),g.bases[0]);
});
test('an intercepted melee enemy does not attack the HQ while approaching a defender outside melee range',()=>{
 const g=create();g.start();for(const u of g.units)if(u.type!=='leader')u.hp=0;for(const b of g.buildings)b.hp=0;
 const c=g.commander(0);c.x=1400;c.y=2000;c.cooldown=100;const enemy=g.addUnit(2,'ant',1400,1690);enemy.assault=true;enemy.cooldown=0;
 const hp=g.bases[0].hp;g.update(.05);a.equal(g.bases[0].hp,hp);a.equal(g.pursuitTarget(enemy),c);
 c.y=2700;enemy.x=1400;enemy.y=1690;enemy.cooldown=0;g.update(.05);a.ok(g.bases[0].hp<hp);
});
test('browser and background worker load shared map data before the engine; picker ships a cached preview',()=>{
 const pub=path.join(__dirname,'public');for(const file of ['index.html','boss-test.html','combat-lab.html','autoplay-worker.js']){const s=fs.readFileSync(path.join(pub,file),'utf8');a.ok(s.indexOf('desktop-star.js?')<s.indexOf('engine.js?'),file);}
 const html=fs.readFileSync(path.join(pub,'index.html'),'utf8');a.ok(html.includes('value="desktop-star"'));a.ok(fs.existsSync(path.join(pub,'assets/previews/start-desktop-star-v20261115.svg')));
});
