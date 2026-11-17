import * as T from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
import {Reflector} from './Reflector.js';
import {registerRoomMirror,getModelNode} from './room-details.js?v=20261117-suite7';

// Blender-authored fixtures, with stable interaction roots and separate moving parts.
export function buildDomesticModels({scene,renderer,manager,state,solids,legacy,mirror,canvasTexture}){
 registerRoomMirror(scene,mirror);
 const loader=new GLTFLoader(manager),result={bathLoaded:false,clockLoaded:false,update,clockHands};
 let left,right,shower,entry,hourHand,minuteHand,keyCover,wardrobeLeft,wardrobeRight,caseLid,hour=11,minute=10;
 const doorSolid={x:3.76,z:-.325,w:.055,d:1.35,yaw:1.4},showerSolid={x:5.55,z:-2.35,w:.98,d:.04,yaw:0};
 const cabinetLeftSolid={x:7.446,z:-.656,w:.035,d:.875,yaw:0},cabinetRightSolid={x:7.446,z:.256,w:.035,d:.875,yaw:0};
 const wardrobeLeftSolid={x:-2.876,z:3.51,w:.90,d:.055,yaw:0},wardrobeRightSolid={x:-1.924,z:3.51,w:.90,d:.055,yaw:0};
 const names=['bathroom-316.glb','kitchen-316.glb','wall-clock-316.glb','lounge-316.glb','bedroom-fixtures-316.glb'];
 function load(file,apply){loader.load('./assets/models/'+file+'?v=20261117-suite7',gltf=>{
  const model=gltf.scene;model.name=file;model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
   for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.transparent){m.depthWrite=false;o.castShadow=false;}if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  });scene.add(model);model.updateMatrixWorld(true);try{apply(model);}catch(e){console.error('Fixture validation failed',file,e);model.removeFromParent();}
 },undefined,()=>{});}
 const hide=nodes=>nodes.forEach(o=>o.visible=false);
 const required=(model,name)=>{const o=getModelNode(model,name);if(!o)throw Error('Missing model node '+name);return o;};
 function interactive(o,id,label){o.userData.interactId=id;o.userData.label=label;return o;}
 load(names[0],model=>{
  left=required(model,'Vanity_Door_Left_Pivot');right=required(model,'Vanity_Door_Right_Pivot');shower=required(model,'Shower_Door_Pivot');entry=required(model,'Bath_Entry_Pivot');const vanity=required(model,'Vanity_ROOT');
  // Retain these objects so the inventory, key and bulb logic does not depend on load timing.
  scene.attach(legacy.bulb);legacy.bulb.position.set(7.66,.466,-.55);legacy.bulb.rotation.set(0,Math.PI/2,0);
  scene.attach(legacy.drawer);legacy.drawer.clear();legacy.drawer.position.set(0,0,0);legacy.drawer.rotation.set(0,0,0);legacy.drawer.attach(vanity);
  vanity.traverse(o=>{if(!o.isMesh)return;const name=o.material?.name||'';if(/porcelain|limestone|nickel/i.test(name))interactive(o,'basin','세면대');});
  hide(legacy.vanity);hide(legacy.bath);
  interactive(shower,'showerDoor','샤워부스 유리문');interactive(entry,'bathDoor','욕실 문');
  interactive(required(model,'Toilet_ROOT'),'toilet','변기');for(const name of ['Hand towel 6.22','Hand towel 6.54'])interactive(required(model,name),'towels','봉에 걸린 면 수건');
  // Replace the old fixture footprints; the architecture and doorway remain unchanged.
  for(let i=solids.length-1;i>=0;i--)if(solids[i].bathLegacy)solids.splice(i,1);
  solids.push({x:7.77,z:-.2,w:.74,d:1.92},{x:5.35,z:.87,w:.49,d:.87},{x:4.43,z:-2.35,w:1.08,d:.045},{x:7.08,z:-2.35,w:1.96,d:.045},doorSolid,showerSolid,cabinetLeftSolid,cabinetRightSolid);
  buildTileSurfaces();buildBathMirror();result.bathLoaded=true;update(1);
 });
 load(names[1],model=>{hide(legacy.kitchen);interactive(required(model,'Kitchen_ROOT'),'kitchenSink','주방 싱크대');interactive(required(model,'HotelKettle_ROOT'),'kettle','스테인리스 전기 주전자');});
 load(names[2],model=>{
  const clock=required(model,'WallClock316_ROOT');hourHand=required(model,'Clock_Hour_Hand');minuteHand=required(model,'Clock_Minute_Hand');keyCover=required(model,'Clock_Key_Cover');
  clock.removeFromParent();model.removeFromParent();legacy.clock.clear();legacy.clock.position.set(8.65,2.08,4.74);legacy.clock.rotation.set(0,0,0);legacy.clock.add(clock);legacy.clock.userData.label='멈춘 주방 벽시계';result.clockLoaded=true;clockHands(hour,minute);
 });
 load(names[3],model=>{hide(legacy.lounge);for(const name of ['LoungeCup_0','LoungeCup_1'])interactive(required(model,name),'cup','도자기 찻잔');});
 load(names[4],model=>{wardrobeLeft=required(model,'Wardrobe_Door_Left_Pivot');wardrobeRight=required(model,'Wardrobe_Door_Right_Pivot');caseLid=required(model,'Suitcase_Lid_Pivot');interactive(required(model,'Wardrobe_ROOT'),'wardrobe','옷장');interactive(required(model,'Suitcase_ROOT'),'suitcase','짐 받침대 위 여행 가방');hide(legacy.bedroom);for(let i=solids.length-1;i>=0;i--)if(solids[i].suitcaseLegacy)solids.splice(i,1);solids.push(wardrobeLeftSolid,wardrobeRightSolid,{x:2.65,z:.9,w:1.23,d:.82});});
 function clockHands(h,m){hour=h;minute=m;if(hourHand){hourHand.rotation.z=-(h/12*Math.PI*2+m/60*Math.PI/6);minuteHand.rotation.z=-m/60*Math.PI*2;}}
 function collider(o,hinge,cx,cz,w,d){const yaw=o.rotation.y;return{x:hinge.x+cx*Math.cos(yaw)+cz*Math.sin(yaw),z:hinge.z-cx*Math.sin(yaw)+cz*Math.cos(yaw),w,d,yaw};}
 function update(dt){const mix=(o,target)=>o.rotation.y+=(target-o.rotation.y)*Math.min(1,dt*4);
  if(result.bathLoaded){mix(left,state.drawerOpen?-1.4:0);mix(right,state.drawerOpen?1.4:0);mix(shower,state.showerOpen?-1.4:0);mix(entry,state.bathDoorOpen?1.48:0);
   Object.assign(doorSolid,collider(entry,entry.position,0,.675,.055,1.35));Object.assign(showerSolid,collider(shower,shower.position,-.5,0,.98,.045));
   Object.assign(cabinetLeftSolid,collider(left,{x:7.446,z:-1.1},0,.45,.035,.895));Object.assign(cabinetRightSolid,collider(right,{x:7.446,z:.7},0,-.45,.035,.895));
  }
  if(keyCover)keyCover.position.z+=( (state.clockSolved?.14:.065)-keyCover.position.z)*Math.min(1,dt*4);
  if(wardrobeLeft){mix(wardrobeLeft,state.wardrobeOpen?1.55:0);mix(wardrobeRight,state.wardrobeOpen?-1.55:0);caseLid.rotation.x+=((state.suitcaseOpen?1.7:0)-caseLid.rotation.x)*Math.min(1,dt*4);Object.assign(wardrobeLeftSolid,collider(wardrobeLeft,{x:-3.33,z:3.51},.465,0,.924,.055));Object.assign(wardrobeRightSolid,collider(wardrobeRight,{x:-1.47,z:3.51},-.465,0,.924,.055));}
 }
 function tileTexture(color){const map=canvasTexture((a,w,h)=>{a.fillStyle=color;a.fillRect(0,0,w,h);let seed=316;for(let i=0;i<7000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%w;seed=(seed*1664525+1013904223)>>>0;const y=seed%h;a.fillStyle=i%2?'#ffffff05':'#2c302b07';a.fillRect(x,y,1,1);}a.strokeStyle='#62665e';a.lineWidth=2;a.strokeRect(0,0,w,h);a.strokeStyle='#ece7d640';a.lineWidth=1;a.strokeRect(3,3,w-6,h-6);},256);map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;}
 function tile(w,h,x,y,z,rotation,repeat){const map=tileTexture('#aaa99a');map.repeat.set(...repeat);const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,color:'#e1dccc',roughness:.49}));o.position.set(x,y,z);o.rotation.y=rotation;o.receiveShadow=true;scene.add(o);return o;}
 function buildTileSurfaces(){
  const floor=tile(4.6,6,5.9,.034,-1.5,0,[4.6/.6,6/.6]);floor.rotation.x=-Math.PI/2;
  tile(4.6,3.12,5.9,1.6,-4.47,0,[4.6/.6,3.12/.3]);tile(4.6,3.12,5.9,1.6,1.47,Math.PI,[4.6/.6,3.12/.3]);
  tile(6,3.12,8.17,1.6,-1.5,-Math.PI/2,[6/.6,3.12/.3]);
  tile(3.5,3.12,3.78,1.6,-2.75,Math.PI/2,[3.5/.6,3.12/.3]);tile(1.1,3.12,3.78,1.6,.95,Math.PI/2,[1.1/.6,3.12/.3]);
  // Warm vanity lights make the sink interior, cabinet and lock readable.
  for(const z of[-1.33,.93]){const light=new T.PointLight('#f8e4c7',2.4,3,1.8);light.position.set(7.98,1.95,z);scene.add(light);legacy.lightExtras.push(light);}
 }
 function buildBathMirror(){const bathMirror=new Reflector(new T.PlaneGeometry(1.80,1.10),{color:0xd5ddd6,textureWidth:512,textureHeight:512,clipBias:.003});bathMirror.position.set(8.079,1.83,-.2);bathMirror.rotation.y=-Math.PI/2;scene.add(bathMirror);
  registerRoomMirror(scene,bathMirror);
 }
 // A low-intensity neutral room reflection gives nickel and brass proper surface highlights.
 const envScene=new T.Scene();envScene.background=new T.Color('#8d918d');
 for(const [x,y,z,w,h,d,color]of[[-3,2,0,.1,3,5,'#d8d1c2'],[3,1,0,.1,4,5,'#798a86'],[0,4,0,5,.1,5,'#f5eee0'],[0,2,4,3,2,.1,'#c8d1d0']]){const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color}));o.position.set(x,y,z);envScene.add(o);}
 const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromScene(envScene,.04);scene.environment=environment.texture;scene.environmentIntensity=.28;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 return result;
}
