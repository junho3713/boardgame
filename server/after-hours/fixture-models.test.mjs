import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './public/three.module.js';
function model(name){
 const b=fs.readFileSync(new URL('./public/assets/models/'+name,import.meta.url));assert.equal(b.toString('ascii',0,4),'glTF');const jsonLength=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jsonLength));const binStart=28+jsonLength;
 function accessor(id){const a=g.accessors[id],v=g.bufferViews[a.bufferView],count={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5121:1,5123:2,5125:4,5126:4}[a.componentType],out=[];const read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];for(let i=0;i<a.count;i++)for(let j=0;j<count;j++)out.push(b[read](binStart+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*count)+j*size));return out;}
 const nodes=g.nodes.map(n=>{const root=new T.Group();root.name=n.name;if(n.translation)root.position.fromArray(n.translation);if(n.rotation)root.quaternion.fromArray(n.rotation);if(n.scale)root.scale.fromArray(n.scale);if(n.matrix){root.matrix.fromArray(n.matrix);root.matrix.decompose(root.position,root.quaternion,root.scale);}if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(accessor(p.attributes.POSITION),3));if(p.indices!==undefined)geo.setIndex(accessor(p.indices));root.add(new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide})));}return root;});g.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));const scene=new T.Group();for(const id of g.scenes[g.scene||0].nodes)scene.add(nodes[id]);scene.updateMatrixWorld(true);return{g,scene,nodes,bytes:b.length};
}
const height=(scene,x,z,startY=3)=>new T.Raycaster(new T.Vector3(x,startY,z),new T.Vector3(0,-1,0)).intersectObject(scene,true)[0]?.point.y;
test('Blender basin and kitchen sink have real openings and deep cavities',()=>{
 const bath=model('bathroom-316.glb');assert.ok(height(bath.scene,7.43,.35)>.93,'vanity counter edge');const basin=height(bath.scene,7.72,-.1);assert.ok(basin>.70&&basin<.86,'basin is recessed: '+basin);
 const kitchen=model('kitchen-316.glb');assert.ok(height(kitchen.scene,4.65,5.2)>.95,'kitchen counter edge');for(const x of[5.4,5.5,5.6]){const sink=height(kitchen.scene,x,5.04,.94);assert.ok(sink>.72&&sink<.86,'sink below its faucet is recessed without a cabinet divider inside: '+sink);}
 const wc=height(bath.scene,5.35,.69,.42);assert.ok(wc<.28,'toilet trap is not obstructed by its pedestal: '+wc);
});
test('animated cabinet doors, shower door, privacy door and clock hands remain separate nodes',()=>{
 const bath=model('bathroom-316.glb');for(const name of ['Vanity_ROOT','Vanity_Door_Left_Pivot','Vanity_Door_Right_Pivot','Shower_Door_Pivot','Bath_Entry_Pivot'])assert.ok(bath.nodes.some(n=>n.name===name),name);
 const clock=model('wall-clock-316.glb');for(const name of ['WallClock316_ROOT','Clock_Hour_Hand','Clock_Minute_Hand','Clock_Key_Cover'])assert.ok(clock.nodes.some(n=>n.name===name),name);
 const bedroom=model('bedroom-fixtures-316.glb');for(const name of ['Wardrobe_Door_Left_Pivot','Wardrobe_Door_Right_Pivot','Wire_Hanger_0','Wire_Hanger_1','Wire_Hanger_2','Suitcase_Lid_Pivot'])assert.ok(bedroom.nodes.some(n=>n.name===name),name);
 for(const filename of ['bathroom-316.glb','kitchen-316.glb','wall-clock-316.glb','lounge-316.glb','bedroom-fixtures-316.glb']){const m=model(filename);assert.ok(m.bytes<3500000);assert.ok(m.g.images?.every(image=>image.bufferView!==undefined&&!image.uri));assert.equal(m.g.cameras,undefined);}
});
