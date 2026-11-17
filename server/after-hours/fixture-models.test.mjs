import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './public/three.module.js';
import {registerRoomMirror,getModelNode} from './public/room-details.js';
import {TEST_STARTS,createTestStart} from './public/test-starts.js';
import {canWalk} from './public/room-layout.js';
import {TWIN_SOLIDS} from './public/twin-room.js';
import {createState} from './public/room-state.js';
function model(name){
 const b=fs.readFileSync(new URL('./public/assets/models/'+name,import.meta.url));assert.equal(b.toString('ascii',0,4),'glTF');const jsonLength=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jsonLength));const binStart=28+jsonLength;
 function accessor(id){const a=g.accessors[id],v=g.bufferViews[a.bufferView],count={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5121:1,5123:2,5125:4,5126:4}[a.componentType],out=[];const read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];for(let i=0;i<a.count;i++)for(let j=0;j<count;j++)out.push(b[read](binStart+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*count)+j*size));return out;}
 const nodes=g.nodes.map(n=>{const root=new T.Group();root.name=n.name;if(n.translation)root.position.fromArray(n.translation);if(n.rotation)root.quaternion.fromArray(n.rotation);if(n.scale)root.scale.fromArray(n.scale);if(n.matrix){root.matrix.fromArray(n.matrix);root.matrix.decompose(root.position,root.quaternion,root.scale);}if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(accessor(p.attributes.POSITION),3));if(p.indices!==undefined)geo.setIndex(accessor(p.indices));root.add(new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide})));}return root;});g.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const scene=new T.Group();for(const id of g.scenes[g.scene||0].nodes)scene.add(nodes[id]);scene.updateMatrixWorld(true);return{g,scene,nodes,bytes:b.length};
}
const height=(scene,x,z,startY=3)=>new T.Raycaster(new T.Vector3(x,startY,z),new T.Vector3(0,-1,0)).intersectObject(scene,true)[0]?.point.y;
test('Blender names with spaces and decimal points resolve after GLTFLoader sanitizes them',()=>{
 const scene=new T.Group();for(const name of['Hand towel 6.22','Hand towel 6.54','Trolley | spare cup']){const node=new T.Group();node.name=T.PropertyBinding.sanitizeNodeName(name);scene.add(node);assert.equal(getModelNode(scene,name),node);}
});
test('Blender basin and kitchen sink have real openings and deep cavities',()=>{
 const bath=model('bathroom-316.glb');assert.ok(height(bath.scene,7.43,.35)>.93,'vanity counter edge');const basin=height(bath.scene,7.72,-.1);assert.ok(basin>.70&&basin<.86,'basin is recessed: '+basin);
 const kitchen=model('kitchen-316.glb');assert.ok(height(kitchen.scene,4.65,5.2)>.95,'kitchen counter edge');for(const x of[5.4,5.5,5.6]){const sink=height(kitchen.scene,x,5.04,.94);assert.ok(sink>.72&&sink<.86,'sink below its faucet is recessed without a cabinet divider inside: '+sink);}
 const wc=height(bath.scene,5.35,.69,.42);assert.ok(wc<.28,'toilet trap is not obstructed by its pedestal: '+wc);
});
test('animated cabinet doors, shower door, privacy door and clock hands remain separate nodes',()=>{
 const bath=model('bathroom-316.glb');for(const name of ['Vanity_ROOT','Vanity_Door_Left_Pivot','Vanity_Door_Right_Pivot','Shower_Door_Pivot','Bath_Entry_Pivot'])assert.ok(bath.nodes.some(n=>n.name===name),name);
 const clock=model('wall-clock-316.glb');for(const name of ['WallClock316_ROOT','Clock_Hour_Hand','Clock_Minute_Hand','Clock_Key_Cover'])assert.ok(clock.nodes.some(n=>n.name===name),name);
 const bedroom=model('bedroom-fixtures-316.glb');for(const name of ['Wardrobe_Door_Left_Pivot','Wardrobe_Door_Right_Pivot','Wire_Hanger_0','Wire_Hanger_1','Wire_Hanger_2','Suitcase_Lid_Pivot'])assert.ok(bedroom.nodes.some(n=>n.name===name),name);
 for(const filename of ['bathroom-316.glb','kitchen-316.glb','wall-clock-316.glb','lounge-316.glb','bedroom-fixtures-316.glb']){const m=model(filename);assert.ok(m.bytes<(filename==='bathroom-316.glb'?4500000:3500000));assert.ok(m.g.images?.every(image=>image.bufferView!==undefined&&!image.uri));assert.equal(m.g.cameras,undefined);}
});

test('317 luggage and safe expose real cavities when their separated doors open',()=>{
 const m=model('guestroom-317.glb');
 for(const name of ['Luggage317_ROOT','Luggage317_Lid_Pivot','Safe317_ROOT','Safe317_Door_Pivot','MusicBox317_ROOT','MusicBox317_Drum',...Array.from({length:4},(_,i)=>'Safe317_Symbol_'+i),...Array.from({length:3},(_,i)=>'Luggage317_Number_'+i)])assert.ok(m.scene.getObjectByName(name),name);
 const safe=m.scene.getObjectByName('Safe317_ROOT'),door=m.scene.getObjectByName('Safe317_Door_Pivot');
 const safeDepth=()=>new T.Raycaster(new T.Vector3(4.24,.66,18.8),new T.Vector3(0,0,1)).intersectObject(safe,true)[0]?.point.z;
 assert.ok(safeDepth()<19.2);door.rotation.y=1.52;m.scene.updateMatrixWorld(true);assert.ok(safeDepth()>19.55,'opened door reveals the empty cavity');
 const lid=m.scene.getObjectByName('Luggage317_Lid_Pivot'),luggage=m.scene.getObjectByName('Luggage317_ROOT');
 assert.ok(height(luggage,8.95,18.46)> .91);lid.rotation.x=1.82;m.scene.updateMatrixWorld(true);assert.ok(height(luggage,8.95,18.46)<.65,'case has a recessed lining on its empty side');
 for(const name of ['guestroom-317.glb','suite-details-316.glb']){const f=model(name);assert.ok(f.bytes<5000000);assert.ok(f.g.images.every(i=>i.bufferView!==undefined&&!i.uri));assert.equal(f.g.cameras,undefined);assert.ok(f.g.meshes.length<90);}
});

test('new furniture keeps every administrator start clear and blocks walking through chairs',()=>{
 const added=[{x:5.12,z:16.92,w:.58,d:.59,yaw:Math.PI/2},{x:9.38,z:19.51,w:.55,d:.50},{x:7.12,z:17.18,w:.67,d:.58},{x:4.24,z:19.18,w:.84,d:.07}];
 for(const p of TEST_STARTS)assert.ok(canWalk(createTestStart(p.id).state,p.position[0],p.position[2],added),p.id);
 assert.equal(canWalk(createTestStart('room317').state,5.12,16.92,added),false);
});

test('three mirrors cannot recurse and restore visibility even if a reflection fails',()=>{
 const scene={},a={visible:true,onBeforeRender(){assert.equal(b.visible,false);assert.equal(c.visible,false);return 'puzzle reflection';}},b={visible:true,onBeforeRender(){}},c={visible:false,onBeforeRender(){throw Error('test reflection failure');}};
 [a,b,c].forEach(m=>registerRoomMirror(scene,m));registerRoomMirror(scene,a);
 assert.equal(a.onBeforeRender(),'puzzle reflection');assert.equal(b.visible,true);assert.equal(c.visible,false);
 assert.throws(()=>c.onBeforeRender(),/test reflection failure/);assert.equal(a.visible,true);assert.equal(b.visible,true);assert.equal(c.visible,false);
});

test('the twin bedroom keeps usable bed dimensions, separate case hinge and clear entry routes',()=>{
 const m=model('twin-room-316.glb');
 for(const name of['TwinBed_0','TwinBed_1','CompanionCase_ROOT','CompanionCase_Lid'])assert.ok(m.scene.getObjectByName(name),name);
 for(const x of[-7.75,-5.25]){const y=height(m.scene,x,8.85);assert.ok(y>.58&&y<.72,'duvet at seated bed height');}
 const s=createState(true);for(const [x,z]of[[-3.6,7],[-4.3,7],[-6.5,7],[-6.5,8.7],[-6.55,6.1]])assert.ok(canWalk(s,x,z,TWIN_SOLIDS),x+','+z);
 for(const p of TEST_STARTS)assert.ok(canWalk(createTestStart(p.id).state,p.position[0],p.position[2],TWIN_SOLIDS),p.id);
 assert.equal(canWalk(s,-7.75,8.85,TWIN_SOLIDS),false);assert.ok(m.bytes<4000000);
 const chest=m.scene.getObjectByName('CompanionCase_ROOT'),lid=m.scene.getObjectByName('CompanionCase_Lid');
 const closed=height(chest,-6.55,5);lid.rotation.x=-1.85;m.scene.updateMatrixWorld(true);assert.ok(height(chest,-6.55,5)<closed-.10);
});

test('table surfaces, tea service and music box fit seated furniture scale',()=>{
 const guest=model('guestroom-317.glb'),suite=model('suite-details-316.glb');
 for(const [scene,x,z]of[[guest.scene,4.10,17.8],[guest.scene,9.4,20.1],[suite.scene,8.98,7.4]]){const top=height(scene,x,z);assert.ok(top>.78&&top<.81,'table surface at 79 cm: '+top);}
 const music=guest.scene.getObjectByName('MusicBox317_ROOT');assert.ok(music.position.y<.85);
});

test('ceramic cups have deep interiors and finger clearance, and the kettle has an open pouring outlet',()=>{
 const guest=model('guestroom-317.glb'),cup=guest.scene.getObjectByName('TeaService317');
 const bottom=height(cup,4.2,17.65);assert.ok(bottom>.82&&bottom<.84,'cup inner floor: '+bottom);
 assert.ok(height(cup,4.243,17.65)>.89,'rolled rim stands above the empty interior');
 const handleGap=new T.Raycaster(new T.Vector3(4.262,.861,17.95),new T.Vector3(0,0,-1)).intersectObject(cup,true);assert.equal(handleGap.length,0,'handle leaves a real finger opening');
 const kitchen=model('kitchen-316.glb'),kettle=kitchen.scene.getObjectByName('HotelKettle_ROOT');assert.ok(kettle);
 const hit=new T.Raycaster(new T.Vector3(7.651,1.218,5.04),new T.Vector3(.588,-.809,0).normalize()).intersectObject(kettle,true)[0];assert.ok(hit&&hit.distance>.032,'open spout does not have a solid cap');
 const bath=model('bathroom-316.glb');assert.ok(bath.g.materials.some(m=>/Hotel terry/.test(m.name)&&m.normalTexture),'packed terry pile surface');
 for(const name of['Hand towel 6.22','Hand towel 6.54']){const bounds=new T.Box3().setFromObject(bath.scene.getObjectByName(name));assert.ok(bounds.max.y>1.49&&bounds.max.y<1.53);assert.ok(bounds.min.y<1.08&&bounds.min.y>.95);assert.ok(bounds.max.z-bounds.min.z<.12,'drape folds around the rail');}
});
