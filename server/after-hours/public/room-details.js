import {SAFE_BEATS} from './puzzle-evidence.js?v=20261117-puzzles2';
import * as T from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
import {Reflector} from './Reflector.js';

// GLTFLoader replaces spaces and punctuation in Blender node names.
export function getModelNode(root,name){return root.getObjectByName(name)||root.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));}

// Mirrors share a visibility guard, preserving the lounge's reflection-only puzzle ink.
const mirrorSets=new WeakMap();
export function registerRoomMirror(scene,mirror){
 let mirrors=mirrorSets.get(scene);if(!mirrors){mirrors=[];mirrorSets.set(scene,mirrors);}
 if(mirrors.includes(mirror))return;mirrors.push(mirror);const render=mirror.onBeforeRender;
 mirror.onBeforeRender=function(...args){const others=mirrors.filter(o=>o!==mirror).map(o=>[o,o.visible]);others.forEach(([o])=>o.visible=false);try{return render.apply(this,args);}finally{others.forEach(([o,v])=>o.visible=v);}};
}

export function buildRoomDetails({scene,renderer,manager,state,solids,legacy,canvasTexture}){
 const loader=new GLTFLoader(manager);let lid,safeDoor,drum,numberFaces=[],symbolFaces=[];
 const result={guestLoaded:false,suiteLoaded:false,update,setPuzzleDials};
 const safeDoorSolid={x:4.24,z:19.18,w:.84,d:.07,yaw:0};
 const required=(root,name)=>{const o=getModelNode(root,name);if(!o)throw Error('Missing room detail '+name);return o;};
 function interactive(o,id,label){Object.assign(o.userData,{interactId:id,label});}
 function load(file,apply){loader.load('./assets/models/'+file+'?v=20261117-stairs1',gltf=>{
  const model=gltf.scene;model.name=file;model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());});
  try{apply(model);scene.add(model);model.updateMatrixWorld(true);}catch(e){console.error('Room detail model validation failed',file,e);model.removeFromParent();}
 },undefined,()=>{});}
 const symbolPaths=['M8 18h16l-2-4v-4a6 6 0 0 0-12 0v4l-2 4m6 4h4','M23 22A11 11 0 0 1 12 4a11 11 0 1 0 11 18Z','M4 10q4-6 8 0t8 0t8 0M4 18q4-6 8 0t8 0t8 0M4 26q4-6 8 0t8 0t8 0','m16 3 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z'];
 const symbols=symbolPaths.map(path=>canvasTexture((a,w,h)=>{a.clearRect(0,0,w,h);a.scale(w/32,h/32);a.strokeStyle='#dac393';a.lineWidth=1.8;a.lineCap='round';a.lineJoin='round';a.stroke(new Path2D(path));},128));
 const numbers=Array.from({length:10},(_,n)=>canvasTexture((a,w,h)=>{a.clearRect(0,0,w,h);a.fillStyle='#ecd8ac';a.font='600 78px serif';a.textAlign='center';a.textBaseline='middle';a.fillText(n,w/2,h/2+3);},128));
 function face(parent,map,w,h){const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,transparent:true,roughness:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));o.rotation.y=Math.PI;parent.add(o);return o;}
 let lastDigits=[0,0,0],lastSymbols=[0,0,0,0];
 function setPuzzleDials(digits=lastDigits,values=lastSymbols){lastDigits=[...digits];lastSymbols=[...values];numberFaces.forEach((o,i)=>{o.material.map=numbers[lastDigits[i]];});symbolFaces.forEach((o,i)=>{o.material.map=symbols[lastSymbols[i]];});}
 load('guestroom-317.glb',model=>{
  lid=required(model,'Luggage317_Lid_Pivot');safeDoor=required(model,'Safe317_Door_Pivot');drum=required(model,'MusicBox317_Drum');
  const caseRoot=required(model,'Luggage317_ROOT'),safe=required(model,'Safe317_ROOT'),music=required(model,'MusicBox317_ROOT');
  interactive(caseRoot,'luggage317','다이얼이 달린 가죽 여행가방');interactive(safe,'safe317','네 문양의 객실 금고');interactive(music,'musicBox','태엽 구멍이 있는 오르골');
  numberFaces=[0,1,2].map(i=>face(required(model,'Luggage317_Number_'+i),numbers[0],.022,.033));symbolFaces=[0,1,2,3].map(i=>face(required(model,'Safe317_Symbol_'+i),symbols[0],.092,.103));setPuzzleDials();
  for(let i=0;i<4;i++){const tally=canvasTexture((a,w,h)=>{a.clearRect(0,0,w,h);a.strokeStyle='#dccb9c';a.lineWidth=5;for(let n=0;n<SAFE_BEATS[i];n++){const x=w/2+(n-(SAFE_BEATS[i]-1)/2)*14;a.beginPath();a.moveTo(x,10);a.lineTo(x,h-10);a.stroke();}},128,64);const marks=face(required(model,'Safe317_Symbol_'+i),tally,.07,.035);marks.position.y=.075;}
  legacy.guest.forEach(o=>o.visible=false);
  solids.push({x:5.12,z:16.92,w:.58,d:.59,yaw:Math.PI/2},{x:9.38,z:19.51,w:.55,d:.50},{x:7.12,z:17.18,w:.67,d:.58},safeDoorSolid);
  const reflection=new Reflector(new T.CircleGeometry(.435,64),{color:0xc9d1cd,textureWidth:512,textureHeight:512,clipBias:.003});reflection.position.set(9,1.75,20.545);reflection.rotation.y=Math.PI;scene.add(reflection);registerRoomMirror(scene,reflection);
  const light=new T.PointLight('#f9d9a9',2.7,3.6,1.8);light.position.set(7.12,1.15,17.18);scene.add(light);
  interactive(required(model,'TeaService317'),'cup','도자기 찻잔');result.guestLoaded=true;update(1,0);
 });
 load('suite-details-316.glb',model=>{for(const name of ['MinibarCup_0','MinibarCup_1','Trolley | spare cup'])interactive(required(model,name),'cup','도자기 찻잔');legacy.suite.forEach(o=>o.visible=false);(legacy.minibar||[]).forEach(o=>o.visible=false);result.suiteLoaded=true;});
 function update(dt,time=0){if(!result.guestLoaded)return;const k=Math.min(1,dt*4);
  lid.rotation.x+=( (state.luggageOpen?1.82:0)-lid.rotation.x)*k;
  safeDoor.rotation.y+=( (state.safeOpen?1.52:0)-safeDoor.rotation.y)*k;
  if(state.musicWound)drum.rotation.x=time*.72;
  const angle=safeDoor.rotation.y;Object.assign(safeDoorSolid,{x:3.817+.423*Math.cos(angle),z:19.18-.423*Math.sin(angle),yaw:angle});
 }
 return result;
}
