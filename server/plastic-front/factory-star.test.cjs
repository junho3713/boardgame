const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {pack,unpack,FrontAutoPilot}=require('./public/autoplay.js'),{FrontRunSave}=require('./public/run-save.js'),factory=require('./public/factory-star.js');
const create=()=>new FrontGame({},undefined,{map:'factory-star'});
test('factory is a separate two-star world with new machinery and geometry instead of desk props',()=>{
 const g=create(),desk=new FrontGame({},undefined,{map:'desktop-star'});a.equal(g.battlefieldId(),'factory-star');a.equal(g.world.id,'factory');a.equal(g.world.variant,'factory-star');a.equal(g.desktopStar,false);a.equal(g.factoryStar,true);a.equal(g.starExperiment,true);a.equal(g.starMax,2);
 a.deepEqual([g.bounds().width,g.bounds().height],[3200,3400]);a.notDeepEqual(g.obstacles,desk.obstacles);a.ok(g.obstacles.every(o=>o.kind.startsWith('factory')));a.equal(g.obstacles.filter(o=>o.kind==='factoryAssembly').length,4);
 const second=create();g.obstacles[0].x=42;a.notEqual(second.obstacles[0].x,42);a.equal(desk.battlefieldId(),'desktop-star');a.equal(desk.world.id,'desktop');
});
test('factory recruitment uses the real two-star fusion, HP multiplier and three lucky roulettes',()=>{
 const g=create();g.start();g.phase='choice';g.cash[0]=10000;a.equal(g.buy('rifle'),true);a.equal(g.twoStarCount('rifle'),1);
 const rifle=g.alive(0).find(u=>u.type==='rifle'),base=g.stats({...rifle,star:1});a.equal(g.stats(rifle).hp,base.hp*2.5);a.equal(g.stats(rifle).damage,base.damage*3);
 g.tech[0].lucky=1;for(let i=0;i<3;i++)a.equal(g.buy('lucky'),true);const lucky=g.alive(0).find(u=>u.type==='lucky');a.equal(lucky.star,2);g.updateLuckyUnit(lucky);a.equal(lucky.luckyChannels.length,3);a.equal(g.isThreeStarExperiment(),false);
});
test('four factory approaches are offscreen, clear of allies and connected to the control base',()=>{
 const g=create(),v=g.spawnView(),sides=[];for(let i=1;i<=4;i++){const p=g.desktopEntry(i);a.ok(p);sides.push(p.entrySide);a.ok(g.freePosition(p.x,p.y,50));a.ok(p.x+50<v.left||p.x-50>v.right||p.y+50<v.top||p.y-50>v.bottom);a.ok(g.findPath(p,g.bases[0],30).length);a.ok(g.alive(0).every(u=>Math.hypot(u.x-p.x,u.y-p.y)>200));}a.deepEqual(sides,[0,1,2,3]);
});
test('machine bodies block movement, conveyor crossings remain walkable and supplies can be reached',()=>{
 const g=create();for(const o of g.obstacles)a.equal(g.freePosition(o.x+o.w/2,o.y+o.h/2,24),false,o.kind);
 for(const [x,y]of [[1147,1800],[2052,1800],[1600,1397],[1600,2217]])a.equal(g.freePosition(x,y,24),true,'walkable belt');
 for(const p of factory.config.supplies){a.ok(g.freePosition(p.x,p.y,24));a.ok(g.findPath(g.commander(0),p,24).length);}g.start();for(const p of g.pickups)p.active=false;g.time=75;g.updateDesktopDefense();a.ok(g.pickups.some(p=>p.active&&factory.config.supplies.some(q=>q.x===p.x&&q.y===p.y)));
});
test('parts bins provide actual nearby armor cover and starter defenses consume construction slots only',()=>{
 const g=create();a.equal(g.obstacles.filter(o=>o.cover).length,4);a.equal(g.buildingCount('mgTower'),2);a.equal(g.buildingCount('barricade'),2);a.equal(g.cash[0],135);a.equal(g.bases[0].hp,4000);
 const u=g.addUnit(0,'rifle',1465,1175);const covered=g.defenseFactor(u),def=g.stats(u).defense;a.equal(covered,100/(100+def+12));u.x=1600;u.y=2100;a.equal(g.defenseFactor(u),100/(100+def));
});
test('engine and manual checkpoints restore factory identity and damage instead of a desk world',()=>{
 const g=create();g.start();g.time=92;g.bases[0].hp=2876;g.buildings[0].hp=123;g.alive(0).find(u=>u.type==='rifle').hp=0;
 const restored=unpack(new FrontGame(),pack(g));a.equal(restored.battlefieldId(),'factory-star');a.equal(restored.world.id,'factory');a.equal(restored.bases[0].hp,2876);a.equal(restored.buildings[0].hp,123);a.equal(restored.alive(0).length,2);a.equal(restored.waveRules().boss.firstAt,240);
 const data=new Map(),save=new FrontRunSave({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},{id:'factory'});a.equal(save.save(g),true);a.equal(save.load().game.battlefieldId(),'factory-star');
 const old=new FrontGame({},undefined,{map:'desktop'});a.equal(unpack(new FrontGame(),pack(old)).battlefieldId(),'desktop');
});
test('factory uses 20-minute HQ defense and does not fall through into backyard victory conditions',()=>{
 const g=create();a.equal(g.isDesktopDefense(),true);a.equal(g.hasInvulnerableHQ(),false);a.equal(g.crisis.phase,'disabled');a.equal(g.structures.length,0);a.equal(g.objective().title,'장난감 공장 · 2성 / 제어기지 방어');g.start();g.time=1200;g.updateMission(.05);a.equal(g.phase,'ended');a.equal(g.result,'win');
 const lose=create();lose.start();lose.bases[0].hp=0;lose.time=1200;lose.updateMission(.05);a.equal(lose.result,'lose');
});
function context(){const calls=[],c=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{for(const v of args)if(typeof v==='number')a.ok(Number.isFinite(v),k+' finite');calls.push([k,...args]);return String(k).startsWith('create')?{addColorStop(){}}:undefined;}});return{c,calls};}
test('factory terrain and every toy machine draw finite geometry; belt parts animate without mutating gameplay',()=>{
 const g=create(),terrain=context();factory.terrain(terrain.c,g);for(const o of g.obstacles)factory.obstacle(terrain.c,o,3);a.ok(terrain.calls.length>3000);
 const before=JSON.stringify(pack(g)),first=context(),next=context();factory.motion(first.c,g);g.time=1;factory.motion(next.c,g);a.notDeepEqual(first.calls,next.calls);g.time=0;a.equal(JSON.stringify(pack(g)),before);a.equal(g.obstacles.some(o=>o.kind==='belt'),false);
});
test('factory data loads before the engine in browser and worker, with a packaged preview and factory selector',()=>{
 const pub=path.join(__dirname,'public');for(const name of ['index.html','boss-test.html','combat-lab.html','autoplay-worker.js']){const s=fs.readFileSync(path.join(pub,name),'utf8');a.ok(s.indexOf('desktop-star.js?')<s.indexOf('factory-star.js?'));a.ok(s.indexOf('factory-star.js?')<s.indexOf('engine.js?'));}
 const html=fs.readFileSync(path.join(pub,'index.html'),'utf8');a.ok(html.includes('value="factory-star"'));a.ok(fs.existsSync(path.join(pub,'assets/previews/start-factory-star-v20261115.svg')));
});
test('seeded AI can move, recruit and fuse through the factory opening without damaging the HQ',()=>{
 const g=create(),pilot=new FrontAutoPilot(g,undefined,17);pilot.start();pilot.advance(180,{silent:true});a.equal(g.phase,'playing');a.ok(g.time>=180);a.equal(g.bases[0].hp,4000);a.ok(g.alive(0).some(u=>u.star===2));a.ok(g.level>2);a.equal(g.battlefieldId(),'factory-star');
});
