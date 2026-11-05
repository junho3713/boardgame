'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js');
const {applySnapshot}=require('./public/coop-state.js'),labels=require('./public/unit-labels.js');
function renderer(){const w={};vm.runInNewContext(fs.readFileSync(__dirname+'/public/medic-skin.js','utf8'),{window:w,Math,WeakMap,Promise,fetch:()=>new Promise(()=>{})});const r=Object.create(w.FrontMedicSkin.prototype);r.motion=new WeakMap();r.manifest=JSON.parse(fs.readFileSync(__dirname+'/public/assets/rina/manifest-v2.json'));return r;}
test('co-op snapshots retain walking identity and remap all combat references without retaining stale fields',()=>{
 const server=new CoopGame(),client=new CoopGame();applySnapshot(client,pack(server),unpack);
 const actor=client.units.find(u=>u.team===0&&u.coopOwner===1),source=server.units.find(u=>u.id===actor.id);const motion=new WeakMap([[actor,{phase:.4}]]);
 actor.stalePose=true;source.x+=18;server.time=.15;server.shots=[{source,target:server.units.find(u=>u.team!==0),life:1}];
 const packet=pack(server),before=JSON.stringify(packet);applySnapshot(client,packet,unpack);
 assert.equal(client.units.find(u=>u.id===actor.id),actor);assert.equal(motion.get(actor).phase,.4);assert.equal(actor.x,source.x);assert.equal(actor.stalePose,undefined);assert.equal(client.shots[0].source,actor);assert.equal(JSON.stringify(packet),before);
});
test('the medic keeps eight directional walking views and the same frozen pose on a paused clock',()=>{
 const r=renderer(),expected=['walkFront','walkFrontLeft','walkSide','walkBackLeft','walkBack','walkBackLeft','walkSide','walkFrontLeft'];
 for(let i=0;i<8;i++){
  const angle=Math.PI/2+i*Math.PI/4,u={id:i,type:'medic',team:0,appearance:'rina',x:0,y:0,face:angle,hp:100,walk:0};
  r.pose(u,1);u.x+=Math.cos(angle)*9;u.y+=Math.sin(angle)*9;u.walk=1.08;const pose=r.pose(u,1.1);
  assert.equal(pose.direction,i);assert.equal(pose.state,expected[i]);assert.equal(pose.flip,[5,6,7].includes(i));assert.equal(r.pose(u,1.1),pose);
 }
});
test('healing has front, side and back actions while hit and defeat override an ongoing stride',()=>{
 const r=renderer();
 for(const [direction,state]of [[0,'heal'],[2,'healSide'],[4,'healBack']]){const u={id:10+direction,x:0,y:0,face:Math.PI/2+direction*Math.PI/4,healAngle:Math.PI/2+direction*Math.PI/4,healStartedAt:1,healUntil:1.7,hp:100};assert.equal(r.pose(u,1.2).state,state);u.hurtStartedAt=1.2;u.hurtUntil=1.52;u.x+=3;assert.equal(r.pose(u,1.3).state,'hit');u.hp=0;u.diedAt=1.4;assert.equal(r.pose(u,1.7).state,'death');}
});
test('evolved Lucky names appear at every star level and each co-op squad uses its own evolution state',()=>{
 const g=new CoopGame();g.start();g.withOwner(0,()=>{g.tech[0].lucky=5;g.abilities.speed=5;g.checkEvolutions();});
 const green=g.addUnit(0,'lucky',100,200),blue=g.withOwner(1,()=>g.addUnit(0,'lucky',300,200));
 for(const star of [1,2,3]){green.star=star;g.withOwner(1,()=>{const label=labels.evolution(g,green);assert.equal(label.text,'슈퍼 럭키 레토나');assert.equal(label.y,248);assert.equal(labels.evolution(g,blue),null);});}
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
