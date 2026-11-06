'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const {applySnapshot}=require('./public/coop-state.js'),labels=require('./public/unit-labels.js');
function renderer(){const w={};vm.runInNewContext(fs.readFileSync(__dirname+'/public/medic-skin.js','utf8'),{window:w,Math,WeakMap,Promise,fetch:()=>new Promise(()=>{})});const r=Object.create(w.FrontMedicSkin.prototype);r.motion=new WeakMap();r.manifest=JSON.parse(fs.readFileSync(__dirname+'/public/assets/rina/manifest-v2.json'));return r;}

test('insect-team mortar escorts load and draw the hostile infantry atlas instead of procedural fallback',async()=>{
 const w={},requests=[];class Image{set src(value){requests.push(value);queueMicrotask(()=>this.onload());}}
 vm.runInNewContext(fs.readFileSync(__dirname+'/public/models.js','utf8'),{window:w,Image,Math,WeakMap,Map,Promise});
 const model=Object.create(w.FrontModels.prototype);Object.assign(model,{manifest:JSON.parse(fs.readFileSync(__dirname+'/public/assets/models/manifest.json')),assets:new Map(),motion:new WeakMap(),loaded:0,failures:0});
 const escort=model.ensure('mortar',2);assert.ok(escort);await escort.loading;assert.ok(escort.ready);assert.equal(model.ensure('mortar',1),escort);assert.match(requests[0],/mortar-1-body\.webp/);
 const draws=[],ctx={save(){},restore(){},scale(){},drawImage(...args){draws.push(args);}};
 for(let d=0;d<8;d++)assert.equal(model.draw(ctx,{id:d,type:'mortar',team:2,hp:100,x:0,y:0,face:d*Math.PI/4,walk:0},1),true);
 assert.equal(draws.length,8);assert.ok(new Set(draws.map(args=>args[1]+':'+args[2])).size>=8);assert.equal(model.failures,0);
});
test('co-op snapshots retain walking identity and remap all combat references without retaining stale fields',()=>{
 const server=new CoopGame(),client=new CoopGame();applySnapshot(client,pack(server),unpack);
 const actor=client.units.find(u=>u.team===0&&u.coopOwner===1),source=server.units.find(u=>u.id===actor.id);const motion=new WeakMap([[actor,{phase:.4}]]);
 actor.stalePose=true;source.x+=18;server.time=.15;server.shots=[{source,target:server.units.find(u=>u.team!==0),life:1}];
 const packet=pack(server),before=JSON.stringify(packet);applySnapshot(client,packet,unpack);
 assert.equal(client.units.find(u=>u.id===actor.id),actor);assert.equal(motion.get(actor).phase,.4);assert.equal(actor.x,source.x);assert.equal(actor.stalePose,undefined);assert.equal(client.shots[0].source,actor);assert.equal(JSON.stringify(packet),before);
});

test('an actual roaming mage and all four escorts draw in eight directions, including the mage casting frame',async()=>{
 const w={},requests=[];class Image{set src(value){requests.push(value);queueMicrotask(()=>this.onload());}}
 vm.runInNewContext(fs.readFileSync(__dirname+'/public/models.js','utf8'),{window:w,Image,Math,WeakMap,Map,Promise});
 const model=Object.create(w.FrontModels.prototype);Object.assign(model,{manifest:JSON.parse(fs.readFileSync(__dirname+'/public/assets/models/manifest.json')),assets:new Map(),motion:new WeakMap(),loaded:0,failures:0});
 const g=new CoopGame();g.start();g.time=360;g.units=g.units.filter(u=>u.team===0);g.northernSpawn=()=>({x:1500,y:6000});const group=g.spawnRoomMageGroup();assert.equal(group.length,5);
 for(const u of group){const item=model.ensure(u.type,u.team);assert.ok(item,'missing model: '+u.type+' / team '+u.team);await item.loading;assert.ok(item.ready);}
 assert.ok(requests.some(url=>url.includes('blizzardMage-1-v095.webp')));assert.equal(model.ensure('blizzardMage',2),model.ensure('blizzardMage',1));
 const draws=[],ctx={save(){},restore(){},scale(){},translate(){},drawImage(...args){draws.push(args);}};
 for(const u of group)for(let d=0;d<8;d++){u.face=u.aimFace=d*Math.PI/4;assert.equal(model.draw(ctx,u,g.time),true);}
 assert.equal(draws.length,40);const mage=group[0];mage.blizzardCast={};model.draw(ctx,mage,g.time+.05);assert.equal(draws.at(-1)[2],256);assert.equal(mage.team,2);assert.equal(model.failures,0);
});
test('the medic keeps eight directional walking views and the same frozen pose on a paused clock',()=>{
 const r=renderer(),expected=['walkFront','walkFrontLeft','walkSide','walkBackLeft','walkBack','walkBackLeft','walkSide','walkFrontLeft'];
 for(let i=0;i<8;i++){
  const angle=Math.PI/2+i*Math.PI/4,u={id:i,type:'medic',team:0,appearance:'rina',x:0,y:0,face:angle,hp:100,walk:0};
  r.pose(u,1);u.x+=Math.cos(angle)*9;u.y+=Math.sin(angle)*9;u.walk=1.08;const pose=r.pose(u,1.1);
  assert.equal(pose.direction,i);assert.equal(pose.state,expected[i]);assert.equal(pose.flip,[5,6,7].includes(i));assert.equal(r.pose(u,1.1),pose);
 }
});

test('mage walking advances with travel, freezes on a paused clock, and yields to idle or casting',async()=>{
 const w={};class Image{set src(value){queueMicrotask(()=>this.onload());}}
 vm.runInNewContext(fs.readFileSync(__dirname+'/public/models.js','utf8'),{window:w,Image,Math,WeakMap,Map,Promise});
 const model=Object.create(w.FrontModels.prototype);Object.assign(model,{manifest:JSON.parse(fs.readFileSync(__dirname+'/public/assets/models/manifest.json')),assets:new Map(),motion:new WeakMap(),loaded:0,failures:0});
 const item=model.ensure('blizzardMage',2);await item.loading;assert.ok(item.layers.walk.ready);assert.equal(item.layers.walk.frames,8);assert.equal(item.layers.walk.directions,8);
 const draws=[],ctx={save(){},restore(){},scale(){},translate(){},drawImage(...args){draws.push(args);}},u={id:1,type:'blizzardMage',team:2,hp:100,x:1000,y:6000,face:0,walk:0};
 model.draw(ctx,u,10);aState(false,0);u.x+=9;u.walk+=1.08;model.draw(ctx,u,10.1);aState(true,1);const phase=model.motion.get(u).walkPhase;model.draw(ctx,u,10.1);aState(true,1);assert.equal(model.motion.get(u).walkPhase,phase);
 model.draw(ctx,u,11);aState(false,0);u.x+=9;u.blizzardCast={};model.draw(ctx,u,11.1);aState(false,1);assert.equal(draws.at(-1)[0],item.layers.body.image);assert.equal(model.motion.get(u).walkPhase,phase);
 u.blizzardCast=null;u.x+=9;model.draw(ctx,u,11.2);aState(true,2);assert.equal(draws.at(-1)[0],item.layers.walk.image);
 function aState(walking,frame){assert.equal(model.motion.get(u).walking,walking);assert.equal(model.motion.get(u).frame,frame);}
 const atlas=fs.readFileSync(__dirname+'/public/assets/models/blizzardMage-walk-v20261106.webp');assert.equal(atlas.toString('ascii',0,4),'RIFF');assert.equal(atlas.readUInt32LE(4)+8,atlas.length);assert.equal(atlas.toString('ascii',12,16),'VP8X');assert.equal(atlas.readUIntLE(24,3)+1,2048);assert.equal(atlas.readUIntLE(27,3)+1,2048);assert.ok(atlas[20]&16);
});
test('healing has front, side and back actions while hit and defeat override an ongoing stride',()=>{
 const r=renderer();
 for(const [direction,state]of [[0,'heal'],[2,'healSide'],[4,'healBack']]){const u={id:10+direction,x:0,y:0,face:Math.PI/2+direction*Math.PI/4,healAngle:Math.PI/2+direction*Math.PI/4,healStartedAt:1,healUntil:1.7,hp:100};assert.equal(r.pose(u,1.2).state,state);u.hurtStartedAt=1.2;u.hurtUntil=1.52;u.x+=3;assert.equal(r.pose(u,1.3).state,'hit');u.hp=0;u.diedAt=1.4;assert.equal(r.pose(u,1.7).state,'death');}
});

test('a missing walking download still shows the original mage instead of procedural fallback',async()=>{
 const w={};class Image{set src(value){queueMicrotask(()=>value.includes('blizzardMage-walk-')?this.onerror():this.onload());}}
 vm.runInNewContext(fs.readFileSync(__dirname+'/public/models.js','utf8'),{window:w,Image,Math,WeakMap,Map,Promise});
 const model=Object.create(w.FrontModels.prototype);Object.assign(model,{manifest:JSON.parse(fs.readFileSync(__dirname+'/public/assets/models/manifest.json')),assets:new Map(),motion:new WeakMap(),loaded:0,failures:0});
 const item=model.ensure('blizzardMage',2);await item.loading;assert.ok(item.ready);assert.equal(item.layers.walk.ready,false);assert.equal(model.failures,1);
 const ctx={save(){},restore(){},scale(){},translate(){},drawImage(){}};assert.equal(model.draw(ctx,{id:1,type:'blizzardMage',team:2,hp:100,x:0,y:0,face:0,walk:0},1),true);
});
test('evolved Lucky names appear at every star level and each co-op squad uses its own evolution state',()=>{
 const g=new CoopGame();g.start();g.withOwner(0,()=>{g.tech[0].lucky=5;g.abilities.speed=5;g.checkEvolutions();});
 const green=g.addUnit(0,'lucky',100,200),blue=g.withOwner(1,()=>g.addUnit(0,'lucky',300,200));
 for(const star of [1,2,3]){green.star=star;g.withOwner(1,()=>{const label=labels.evolution(g,green);assert.equal(label.text,'슈퍼 럭키 레토나');assert.equal(label.y,green.y-90);assert.equal(labels.evolution(g,blue),null);});}
 g.withOwner(1,()=>{g.tech[0].lucky=5;g.abilities.speed=5;g.checkEvolutions();});assert.equal(labels.evolution(g,blue).text,'슈퍼 럭키 레토나');
});
test('all refined action frames and anchors fit their actual atlas dimensions with generated alpha retained',()=>{
 const m=JSON.parse(fs.readFileSync(__dirname+'/public/assets/rina/manifest-v2.json'));
 assert.equal(m.toyProjection,undefined);assert.equal(m.volumetric,true);
 for(const [name,s]of Object.entries(m.states)){
  const b=fs.readFileSync(__dirname+'/public/assets/rina/'+s.file);assert.ok(b.length>1000,name);
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  let width,height,alpha=false;
  for(let i=12;i+8<=b.length;){const kind=b.toString('ascii',i,i+4),n=b.readUInt32LE(i+4),p=i+8;
   if(kind==='VP8X'){alpha=!!(b[p]&16);width=1+b.readUIntLE(p+4,3);height=1+b.readUIntLE(p+7,3);}
   if(kind==='VP8L'){const bits=b.readUInt32LE(p+1);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;alpha=!!(bits&0x10000000);}
   if(kind==='ALPH')alpha=true;i=p+n+(n%2);
  }
  assert.ok(width&&height&&alpha,name);assert.equal(s.frames.length,name.startsWith('walk')||name==='directions'?8:4);
  for(const f of s.frames){const [x,y,w,h]=f.rect;assert.equal(h,320);assert.equal(f.anchor[1],306);assert.ok(w>f.anchor[0]);assert.ok(x>=0&&y>=0&&x+w<=width&&y+h<=height,name);}
 }
});


test('evolution glyph bottoms sit exactly four pixels above star tops across infantry, vehicles, skins and stars',()=>{
 const g=new CoopGame();g.start();
 const ctx={font:'original',save(){this.saved=this.font;},restore(){this.font=this.saved;},measureText(t){return t.startsWith('★')?{actualBoundingBoxAscent:9.5}:{actualBoundingBoxDescent:1.5};}};
 for(const type of ['rifle','tank','guntruck','lucky','medic'])for(const star of [2,3])for(const rina of type==='medic'?[false,true]:[false]){
  g.evolved[type]=true;const u=g.addUnit(0,type,100,200);Object.assign(u,{star,...(rina?{appearance:'rina'}:{})});
  const label=labels.evolution(g,u,ctx),vehicle=['tank','guntruck','lucky'].includes(type),healthY=u.y-((vehicle?79:rina?86:66)-(vehicle?10:8));
  aGap(healthY-6-9.5-(label.y+1.5));aFont();
 }
 function aGap(gap){assert.equal(gap,4);}function aFont(){assert.equal(ctx.font,'original');}
});
