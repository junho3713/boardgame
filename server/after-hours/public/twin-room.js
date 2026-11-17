import * as T from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
import {TRAVEL_STOPS,COMPANION_TARGET} from './room-state.js?v=20261117-doors3';

export const TWIN_SOLIDS=[
 {x:-7.75,z:8.85,w:1.24,d:2.4},{x:-5.25,z:8.85,w:1.24,d:2.4},
 {x:-6.5,z:9.72,w:.68,d:.54},{x:-6.55,z:4.99,w:1.68,d:.65}
];

export function buildTwinRoom({scene,renderer,manager,state,solids,canvasTexture,helpers,materials}){
 const {box,rb,group,cyl,ball,sign}=helpers,{wood,darkwood,brass,ivory,floorMat}=materials;
 const plaster=new T.MeshStandardMaterial({color:'#b6b3a1',roughness:.92});
 box(5.6,.15,6,-6.4,-.075,7.5,floorMat);
 box(5.6,.12,6,-6.4,3.27,7.5,ivory);
 box(.16,3.2,6,-9.28,1.6,7.5,plaster);
 for(const z of[4.42,10.58])box(5.6,3.2,.16,-6.4,1.6,z,plaster);
 // Only the west-side opening is new. The photo wall at z=5.45 remains intact.
 for(const z of[6.25,7.75])box(.22,2.72,.10,-3.68,1.36,z,wood);
 box(.22,.11,1.60,-3.68,2.76,7.0,wood);
 box(.34,.025,1.42,-3.68,.012,7.0,wood);
 for(const z of[4.54,10.46]){box(5.6,.14,.07,-6.4,.07,z,darkwood);box(5.6,.065,.11,-6.4,3.13,z,ivory);}
 for(const x of[-9.16]){box(.07,.14,6,x,.07,7.5,darkwood);box(.11,.065,6,x,3.13,7.5,ivory);}
 sign('트윈 침실 · TWIN',.98,.16,-3.46,2.91,7.0,Math.PI/2);
 sign('거실 · LIVING',.78,.16,-3.90,2.91,7.0,-Math.PI/2);
 const rug=new T.Mesh(new T.PlaneGeometry(3.75,3.05),new T.MeshStandardMaterial({color:'#596460',roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(-6.5,.017,8.2);rug.receiveShadow=true;scene.add(rug);
 const fixture=group(-6.4,3.06,7.35);cyl(.24,.28,.07,0,0,0,brass,fixture);
 const glow=new T.MeshStandardMaterial({color:'#eee3c8',emissive:'#f5d5a0',emissiveIntensity:.5});ball(.25,.09,.25,0,-.10,0,glow,fixture);
 const light=new T.PointLight('#ffe0b7',22,8,1.8);light.position.set(-6.4,2.7,7.35);light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.normalBias=.025;scene.add(light);
 const bedsideLight=new T.PointLight('#efc28b',2,3,2);bedsideLight.position.set(-6.5,1.05,9.72);scene.add(bedsideLight);
 solids.push(...TWIN_SOLIDS.map(b=>({...b})));
 let lid,faces=[],modelLoaded=false,values=[0,0,0];
 const fallback=[];
 for(const x of[-7.75,-5.25]){fallback.push(rb(1.10,.24,2.10,x,.48,8.85,ivory),rb(1.22,1.2,.12,x,.65,10.0,wood));}
 const fallbackCase=rb(.6,.20,.37,-6.55,.90,5,wood);Object.assign(fallbackCase.userData,{interactId:'companionCase',label:'동행인의 보관함'});fallback.push(fallbackCase);
 const cards=TRAVEL_STOPS.map(stop=>canvasTexture((a,w,h)=>{
  a.fillStyle='#e6ddc9';a.fillRect(0,0,w,h);a.fillStyle=stop.id===0?'#78919b':stop.id===1?'#899478':'#b49e89';a.fillRect(24,24,w-48,h*.65);
  a.fillStyle='#e6d5ad';a.beginPath();a.arc(w*.74,h*.2,22,0,Math.PI*2);a.fill();
  if(stop.id===0){a.fillStyle='#466e7b';for(let i=0;i<4;i++){a.beginPath();a.moveTo(24,h*.43+i*18);for(let x=24;x<w-24;x+=4)a.lineTo(x,h*.43+i*18+Math.sin(x*.035+i)*6);a.lineTo(w-24,h*.67);a.lineTo(24,h*.67);a.fill();}}
  else if(stop.id===1){for(let i=0;i<3;i++){a.fillStyle=['#78826a','#5d705c','#425f50'][i];a.beginPath();a.moveTo(24+i*80,h*.67);a.lineTo(90+i*95,h*.2+i*22);a.lineTo(240+i*70,h*.67);a.fill();}}
  else {a.fillStyle='#555b54';for(let i=0;i<7;i++){const x=34+i*55,H=60+(i%3)*27;a.fillRect(x,h*.67-H,42,H);a.fillStyle='#dfcca4';for(let y=h*.67-H+12;y<h*.65;y+=18)a.fillRect(x+10,y,8,7);a.fillStyle='#555b54';}}
  a.fillStyle='#343f37';a.textAlign='center';a.font='22px serif';a.fillText(stop.date+'  /  '+stop.name,w/2,h*.83);a.font='14px serif';a.fillText('OUR JOURNEY',w/2,h*.94);
 },512,384));
 const symbolMaps=TRAVEL_STOPS.map(stop=>canvasTexture((a,w,h)=>{a.fillStyle='#24302b';a.fillRect(0,0,w,h);a.strokeStyle='#d9c49b';a.lineWidth=4;a.lineCap='round';a.lineJoin='round';a.scale(w/32,h/32);a.lineWidth=1.5;a.stroke(new Path2D(stop.path));},128));
 function decal(parent,map,w,h){const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.8}));parent.add(o);return o;}
 // Keep the clue available even if the optional model fails to load.
 for(const [i,stop]of[2,0,1].entries()){const g=group(-7.06+i*.51,1.62,4.682);const o=decal(g,cards[stop],.404,.304);Object.assign(o.userData,{interactId:'travelPostcards',label:'날짜가 적힌 여행 엽서'});}
 new GLTFLoader(manager).load('./assets/models/twin-room-316.glb?v=20261117-doors3',gltf=>{
  const model=gltf.scene;lid=model.getObjectByName('CompanionCase_Lid');const chest=model.getObjectByName('CompanionCase_ROOT');
  if(!lid||!chest){console.error('Twin room model is missing its case pivots');return;}
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material?.map)o.material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}});
  Object.assign(chest.userData,{interactId:'companionCase',label:'동행인의 보관함 · 여행의 순서'});
  for(const name of['TwinBed_0','TwinBed_1'])Object.assign(model.getObjectByName(name).userData,{interactId:'twinBed',label:'동행인의 침대'});
  faces=[0,1,2].map(i=>decal(model.getObjectByName('CompanionCase_Symbol_'+i),symbolMaps[0],.09,.078));
  fallback.forEach(o=>o.visible=false);scene.add(model);modelLoaded=true;setDials(values);update(1);
 },undefined,()=>{});
 function setDials(next){values=[...next];faces.forEach((o,i)=>o.material.map=symbolMaps[values[i]]);}
 function update(dt){const k=Math.min(1,dt*4);light.intensity+=((state.lightOn?22:0)-light.intensity)*k;bedsideLight.intensity=state.lightOn?2:0;glow.emissiveIntensity=state.lightOn?.5:0;if(modelLoaded){lid.rotation.x+=((state.companionSolved?-1.85:0)-lid.rotation.x)*k;if(state.companionSolved)setDials(COMPANION_TARGET);}}
 return {update,setDials};
}
