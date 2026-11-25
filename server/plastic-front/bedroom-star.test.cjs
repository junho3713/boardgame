const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const vm=require('node:vm');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {pack,unpack,FrontAutoPilot}=require('./public/autoplay.js'),{FrontRunSave}=require('./public/run-save.js'),floor=require('./public/bedroom-star.js');
const create=()=>new FrontGame({},undefined,{map:'bedroom-star'});
test('bedroom floor is an independent household map and the removed factory URL selects it',()=>{
 const g=create();a.equal(g.world.id,'bedroom');a.equal(g.battlefieldId(),'bedroom-star');a.equal(g.bedroomStar,true);a.equal(g.pixelRoom,false);a.equal(g.starExperiment,true);a.equal(g.starMax,2);a.deepEqual([g.bounds().width,g.bounds().height],[3200,3400]);a.ok(g.obstacles.every(o=>o.bedroom));a.ok(g.obstacles.every(o=>!o.kind.startsWith('factory')));a.equal(new FrontGame({},undefined,{map:'factory-star'}).battlefieldId(),'bedroom-star');
 const other=create();g.obstacles[0].x=12;a.notEqual(other.obstacles[0].x,12);a.equal(new FrontGame({},undefined,{map:'livingroom-pixel'}).world.id,'livingroom');
});
test('normal recruitment creates a real two-star squad and keeps medic and lucky vehicle rules',()=>{
 const g=create();g.start();g.phase='choice';g.cash[0]=10000;a.equal(g.buy('rifle'),true);a.equal(g.twoStarCount('rifle'),1);const rifle=g.alive(0).find(u=>u.type==='rifle'),one=g.stats({...rifle,star:1});a.equal(g.stats(rifle).damage,one.damage*3);a.equal(g.stats(rifle).hp,one.hp*2.5);
 for(const type of ['medic','lucky']){g.tech[0][type]=1;for(let i=0;i<3;i++)a.equal(g.buy(type),true);}const medic=g.alive(0).find(u=>u.type==='medic');a.equal(g.stats(medic).heal,g.stats({...medic,star:1}).heal*2.5);const lucky=g.alive(0).find(u=>u.type==='lucky');g.updateLuckyUnit(lucky);a.equal(lucky.luckyChannels.length,3);
});
test('household obstacles have clear four-sided offscreen approaches and supply routes',()=>{
 const g=create(),v=g.spawnView(),sides=[];for(let i=1;i<=4;i++){const p=g.desktopEntry(i);a.ok(p);sides.push(p.entrySide);a.ok(g.freePosition(p.x,p.y,50));a.ok(p.x+50<v.left||p.x-50>v.right||p.y+50<v.top||p.y-50>v.bottom);a.ok(g.findPath(p,g.bases[0],30).length);a.ok(g.alive(0).every(u=>Math.hypot(u.x-p.x,u.y-p.y)>200));}a.deepEqual(sides,[0,1,2,3]);for(const p of floor.config.supplies){a.ok(g.freePosition(p.x,p.y,24));a.ok(g.findPath(g.commander(0),p,24).length);}
});
test('slippers and storage bodies block movement while the rug remains normal walkable floor',()=>{
 const g=create();for(const o of g.obstacles)a.equal(g.freePosition(o.x+o.w/2,o.y+o.h/2,20),false,o.kind);for(const [x,y]of [[1210,1500],[1990,1830],[1600,2200]])a.ok(g.freePosition(x,y,24));const bin=g.obstacles.find(o=>o.kind==='bedroomBin'),r=floor.binRect(bin);a.ok(r.w>bin.w&&r.y<bin.y);a.ok(r.y+r.h>=bin.y+bin.h);
});
test('books and wooden blocks provide the documented armor cover and completed starting defenses',()=>{
 const g=create();a.equal(g.obstacles.filter(o=>o.cover).length,4);a.equal(g.buildingCount('mgTower'),2);a.equal(g.buildingCount('barricade'),2);a.equal(g.cash[0],135);a.equal(g.bases[0].hp,4000);const u=g.addUnit(0,'rifle',1430,1010),def=g.stats(u).defense;a.equal(g.defenseFactor(u),100/(100+def+12));u.x=1600;u.y=2200;a.equal(g.defenseFactor(u),100/(100+def));
});
test('timed supplies and the 20-minute defense use the bedroom world',()=>{
 const g=create();g.start();g.pickups.forEach(p=>p.active=false);g.time=75;g.updateDesktopDefense();a.ok(g.pickups.some(p=>p.active&&floor.config.supplies.some(q=>p.x===q.x&&p.y===q.y)));a.equal(g.waveRules().boss.firstAt,240);a.equal(g.hasInvulnerableHQ(),false);a.equal(g.objective().title,'방바닥 · 2성 / 중앙 기지 방어');g.time=1200;g.updateMission(.05);a.equal(g.result,'win');const lose=create();lose.start();lose.bases[0].hp=0;lose.time=1200;lose.updateMission(.05);a.equal(lose.result,'lose');
});
test('manual and engine saves preserve the new map, casualties and damage',()=>{
 const g=create();g.start();g.time=92;g.bases[0].hp=2876;g.buildings[0].hp=123;g.alive(0).find(u=>u.type==='rifle').hp=0;const restored=unpack(new FrontGame(),pack(g));a.equal(restored.battlefieldId(),'bedroom-star');a.equal(restored.bases[0].hp,2876);a.equal(restored.buildings[0].hp,123);a.equal(restored.alive(0).length,2);
 const data=new Map(),save=new FrontRunSave({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},{id:'bedroom'});a.equal(save.save(g),true);a.equal(save.load().game.world.id,'bedroom');
});
test('old factory checkpoints migrate to household geometry without refunding resources or reviving troops',()=>{
 const g=create();g.start();g.time=190;g.cash[0]=33;g.bases[0].hp=1234;g.buildings[0].hp=87;g.units.find(u=>u.type==='rifle').hp=0;const data=pack(g);Object.assign(data.fields,{factoryStar:true,bedroomStar:false,mapId:'factory',world:{id:'factory',variant:'factory-star',width:3200,height:3400,scale:1,layoutVersion:7},obstacles:[{kind:'factoryPress',x:850,y:1670,w:200,h:190}]});
 const restored=unpack(new FrontGame(),data);a.equal(restored.battlefieldId(),'bedroom-star');a.equal(restored.factoryStar,false);a.ok(restored.obstacles.every(o=>o.bedroom));a.equal(restored.time,190);a.equal(restored.cash[0],33);a.equal(restored.bases[0].hp,1234);a.equal(restored.buildings[0].hp,87);a.equal(restored.alive(0).length,2);a.equal(restored.upgradeBedroomMap(),false);
});
test('legacy desk and room checkpoints retain their own geometry and map identities',()=>{
 for(const map of ['livingroom-star','desktop','livingroom-pixel']){const g=new FrontGame({},undefined,{map}),before=JSON.stringify(g.obstacles),restored=unpack(new FrontGame(),pack(g));a.equal(restored.battlefieldId(),map);a.equal(JSON.stringify(restored.obstacles),before);}
});
test('the factory has no selectable map or executable asset and browser plus worker load the replacement',()=>{
 const pub=path.join(__dirname,'public');for(const name of ['index.html','boss-test.html','combat-lab.html','autoplay-worker.js']){const s=fs.readFileSync(path.join(pub,name),'utf8');a.ok(s.indexOf('bedroom-star.js?')<s.indexOf('engine.js?'));a.equal(s.includes('factory-star.js?'),false);}const html=fs.readFileSync(path.join(pub,'index.html'),'utf8');a.equal(html.includes('value="factory-star"'),false);a.ok(html.includes('value="bedroom-star"'));a.equal(fs.existsSync(path.join(pub,'factory-star.js')),false);a.equal(fs.existsSync(path.join(pub,'assets/previews/start-factory-star-v20261115.svg')),false);
 for(const name of ['assets/bedroom/toy-bin-v1.webp','assets/previews/start-bedroom-star-v20261115.webp']){const bytes=fs.readFileSync(path.join(pub,name));a.equal(bytes.toString('ascii',0,4),'RIFF');a.equal(bytes.toString('ascii',8,12),'WEBP');a.ok(bytes.length<300000);}
});
test('the new room artwork loads only for a selected floor map and its opaque body is drawn at finite bounds',async()=>{
 a.equal(floor.diagnostics().bin,false);await floor.prepare();a.equal(floor.diagnostics().bin,false);for(const o of floor.obstacles().filter(o=>o.kind==='bedroomBin'))for(const n of Object.values(floor.binRect(o)))a.ok(Number.isFinite(n));const s=fs.readFileSync(path.join(__dirname,'public/bedroom-star.js'),'utf8');a.equal(s.includes('const ready=typeof Image'),false);a.ok(s.includes('function prepare()'));
});
test('the actual combat renderer routes shared household props and their occlusion to the bedroom renderer',()=>{
 const drawn=[],w={FrontDesktopCover:{art:{}},FrontDesktopProps:{art:{}},FrontDesktopNotebook:{art:{file:'test'}},FrontDesktopItems:{art:{}},FrontBedroom:{obstacle:(c,o)=>drawn.push(o.kind),opacity:()=>.37,depth:()=>999,visible:()=>true}};
 class Image{set src(v){}}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'public/desktop.js'),'utf8'),{window:w,Image});
 for(const kind of ['slipper','cushion','books','blocks','bedroomBin']){const o={kind,bedroom:true,x:0,y:0,w:100,h:100};w.FrontDesktop.obstacle({},o);a.equal(w.FrontDesktop.opacity(o,[]),.37);a.equal(w.FrontDesktop.depth(o),999);a.equal(w.FrontDesktop.visible(o,{x:0,y:0},100,100),true);}
 a.deepEqual(drawn,['slipper','cushion','books','blocks','bedroomBin']);
});
test('the seeded AI can recruit, fuse and navigate the bedroom floor opening',()=>{
 const g=create(),p=new FrontAutoPilot(g,undefined,17);p.start();p.advance(180,{silent:true});a.equal(g.phase,'playing');a.ok(g.time>=180);a.equal(g.bases[0].hp,4000);a.ok(g.alive(0).some(u=>u.star===2));a.ok(g.level>2);a.equal(g.world.id,'bedroom');
});
