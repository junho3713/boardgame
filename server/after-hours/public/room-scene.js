import {createBedSearch} from './bed-cover.js';
import {buildHotelDoor,hingedDoor} from './hotel-doors.js';
import {buildSearchProps} from './room-search.js?v=20261117-tricks1';
import {buildPuzzleProps} from './puzzle-props.js?v=20261117-tricks1';
import * as T from './three.module.js';
import {Reflector} from './Reflector.js';
import {GLTFLoader} from './GLTFLoader.js';
import {buildExterior} from './exterior-scene.js?v=20261117-environment2';
import {uvVisible} from './room-state.js?v=20261117-tricks1';
import {buildHotelExtension} from './hotel-extension.js?v=20261117-tricks1';
import {canWalk} from './room-layout.js?v=20261117-stairs1';
import {buildDomesticModels} from './domestic-models.js?v=20261117-tricks1';
import {buildTwinRoom} from './twin-room.js?v=20261117-tricks1';
import {buildRoomDetails} from './room-details.js?v=20261117-tricks1';

export function buildRoom(renderer,state){
 const scene=new T.Scene();scene.background=new T.Color('#121616');scene.fog=new T.FogExp2('#121616',.014);
 const roots=[],solids=[],tweens=[],suiteLights=[],fixtureLights=[];const assetsFailed=[];let resolveReady;
 const ready=new Promise(r=>resolveReady=r);
 const manager=new T.LoadingManager(()=>resolveReady());manager.onError=url=>assetsFailed.push(url);
 const loader=new T.TextureLoader(manager),aniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 function tex(name,color=false,repeat=[1,1]){const t=loader.load('./assets/'+name);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=aniso;if(color)t.colorSpace=T.SRGBColorSpace;return t;}
 const floorMap=tex('herringbone_parquet_Diffuse.jpg',true,[3,3.8]);
 const floorNormal=tex('herringbone_parquet_nor_gl.jpg',false,[3,3.8]);
 const floorRough=tex('herringbone_parquet_Rough.jpg',false,[3,3.8]);
 const wallMap=tex('decrepit_wallpaper_Diffuse.jpg',true,[2.2,1]);
 const wallNormal=tex('decrepit_wallpaper_nor_gl.jpg',false,[2.2,1]);
 const wallRough=tex('decrepit_wallpaper_Rough.jpg',false,[2.2,1]);
 const fabricMap=tex('quatrefoil_jacquard_fabric_Diffuse.jpg',true,[3,3]);
 const fabricNormal=tex('quatrefoil_jacquard_fabric_nor_gl.jpg',false,[3,3]);
 const fabricRough=tex('quatrefoil_jacquard_fabric_Rough.jpg',false,[3,3]);
 const photo=tex('hotel-photo.jpg',true);
 function canvasTexture(draw,w=1024,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
 const grain=canvasTexture((a,w,h)=>{a.fillStyle='#63442d';a.fillRect(0,0,w,h);for(let i=0;i<800;i++){const y=Math.random()*h;a.strokeStyle=`rgba(${Math.random()>.4?'25,15,7':'200,157,92'},${Math.random()*.2})`;a.lineWidth=Math.random()*2+1;a.beginPath();a.moveTo(0,y);for(let x=0;x<w;x+=32)a.lineTo(x,y+Math.sin(x*.008+i)*3);a.stroke();}for(let i=0;i<50;i++){a.fillStyle='#130d0814';a.fillRect(0,i*21,w,1);}},512);
 grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.anisotropy=aniso;
 const mat=(color,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const wood=new T.MeshStandardMaterial({map:grain,color:'#95806b',roughness:.58});
 const darkwood=new T.MeshStandardMaterial({map:grain,color:'#524237',roughness:.64});
 const brass=mat('#93734a',.32,.74),black=mat('#171a19',.36,.15),ivory=mat('#e1d7bb',.76),paper=mat('#d1b991',.93),linen=mat('#c5baa4',.97),leather=mat('#352e25',.64);
 const wallpaper=new T.MeshStandardMaterial({map:wallMap,normalMap:wallNormal,normalScale:new T.Vector2(.5,.5),roughnessMap:wallRough,color:'#b6b09a'});
 const floorMat=new T.MeshStandardMaterial({map:floorMap,normalMap:floorNormal,normalScale:new T.Vector2(.42,.42),roughnessMap:floorRough,color:'#a69981',roughness:.8});
 const fabric=new T.MeshStandardMaterial({map:fabricMap,normalMap:fabricNormal,normalScale:new T.Vector2(.26,.26),roughnessMap:fabricRough,color:'#768379',roughness:.95});
 function mesh(geo,material,parent=scene){const o=new T.Mesh(geo,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,x,y,z,m=wood,parent=scene){const o=mesh(new T.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o;}
 function rounded(w,h,d,r=.025){r=Math.min(r,w/4,h/4,d/3);const s=new T.Shape(),x=-w/2+r,y=-h/2+r,W=w-2*r,H=h-2*r;s.moveTo(x,y);s.lineTo(x+W,y);s.lineTo(x+W,y+H);s.lineTo(x,y+H);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r});g.translate(0,0,-d/2+r);return g;}
 function rb(w,h,d,x,y,z,m=wood,parent=scene,r=.025){const o=mesh(rounded(w,h,d,r),m,parent);o.position.set(x,y,z);return o;}
 function cyl(r1,r2,h,x,y,z,m=brass,parent=scene,segments=32){const o=mesh(new T.CylinderGeometry(r1,r2,h,segments),m,parent);o.position.set(x,y,z);return o;}
 function ball(rx,ry,rz,x,y,z,m,parent=scene){const o=mesh(new T.SphereGeometry(1,24,16),m,parent);o.scale.set(rx,ry,rz);o.position.set(x,y,z);return o;}
 function rod(a,b,r,m=brass,parent=scene){const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);const o=mesh(new T.CylinderGeometry(r,r,d.length(),12),m,parent);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
 function group(x=0,y=0,z=0,parent=scene){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
 function solid(x,z,w,d){solids.push({x,z,w,d});}
 function shiftSince(childStart,solidStart,x,z){for(const o of scene.children.slice(childStart)){o.position.x+=x;o.position.z+=z;}for(const b of solids.slice(solidStart)){b.x+=x;b.z+=z;}}
 function interactive(o,id,label){o.userData.interactId=id;o.userData.label=label;roots.push(o);return o;}
 function sign(text,w,h,x,y,z,rotation=0,fg='#c7b899',bg='#18211d',mirror=false){const texture=canvasTexture((a,W,H)=>{a.fillStyle=bg;a.fillRect(0,0,W,H);a.strokeStyle=fg;a.lineWidth=3;a.strokeRect(12,12,W-24,H-24);a.fillStyle=fg;a.font=`500 ${H/(text.split('\n').length+1)*.65}px serif`;a.textAlign='center';a.textBaseline='middle';if(mirror){a.translate(W,0);a.scale(-1,1);}const lines=text.split('\n');lines.forEach((l,i)=>a.fillText(l,W/2,H*(i+1)/(lines.length+1),W-50));},1024,Math.round(1024*h/w));const o=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}),scene);o.position.set(x,y,z);o.rotation.y=rotation;return o;}
 const ao=canvasTexture((a,w,h)=>{const g=a.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(0,0,0,.7)');g.addColorStop(.6,'rgba(0,0,0,.38)');g.addColorStop(1,'rgba(0,0,0,0)');a.fillStyle=g;a.fillRect(0,0,w,h);},128);
 function shadow(x,z,w,d){const p=mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:ao,transparent:true,depthWrite:false,opacity:.8}));p.rotation.x=-Math.PI/2;p.position.set(x,.014,z);p.castShadow=false;return p;}
 // 316 is one suite: bedroom, living room, kitchenette and bathroom.
 box(7.2,.15,9,0,-.075,0,floorMat);box(7.2,.15,6,0,-.075,7.5,floorMat);box(6,.15,6,6.6,-.075,7.5,floorMat);
 box(.16,3.2,9,-3.68,1.6,0,wallpaper);box(.16,3.2,3.5,3.68,1.6,-2.75,wallpaper);box(.16,3.2,4.1,3.68,1.6,2.45,wallpaper);box(.16,.5,1.4,3.68,2.95,-.3,wallpaper);
 box(2.15,3.2,.16,-2.525,1.6,-4.58,wallpaper);box(2.15,3.2,.16,2.525,1.6,-4.58,wallpaper);box(2.9,.65,.16,0,2.875,-4.58,wallpaper);box(2.9,.7,.16,0,.35,-4.58,wallpaper);
 // Open bedroom doorway. The suite's locked front door is in the living room.
 for(const z of[4.58,10.58]){box(5.05,3.2,.16,-1.075,1.6,z,wallpaper);box(.8,3.2,.16,3.2,1.6,z,wallpaper);box(1.35,.5,.16,2.125,2.95,z,wallpaper);}
 for(const [z,d]of[[5.4,1.8],[9.1,2.8]])box(.16,3.2,d,-3.68,1.6,z,wallpaper);box(.16,.5,1.4,-3.68,2.95,7.0,wallpaper);box(.16,3.2,6,9.68,1.6,7.5,wallpaper);
 for(const [z,d]of[[5.7,2.4],[9.45,2.1]])box(.16,3.2,d,3.68,1.6,z,wallpaper);box(.16,.5,1.5,3.68,2.95,7.65,wallpaper);
 for(const z of[4.58,10.58])box(6,3.2,.16,6.6,1.6,z,wallpaper);
 for(const [x,z,w,d]of[[0,0,7.4,9.2],[0,7.5,7.4,6],[6.6,7.5,6,6]])box(w,.12,d,x,3.27,z,mat('#827b68'));
 // A genuine hotel corridor separates 316 from 317.
 box(13.8,.15,3,3.3,-.075,12,floorMat);box(13.8,.12,3,3.3,3.27,12,mat('#827b68'));
 box(.16,3.2,3,10.28,1.6,12,wallpaper);for(const z of[10.875,13.125])box(.16,3.2,.75,-3.68,1.6,z,wallpaper);box(.16,.5,1.5,-3.68,2.95,12,wallpaper);
 box(7.2,3.2,.16,0,1.6,13.58,wallpaper);box(.86,3.2,.16,4.03,1.6,13.58,wallpaper);box(4.42,3.2,.16,7.99,1.6,13.58,wallpaper);box(1.32,.5,.16,5.12,2.95,13.58,wallpaper);
 // 317 has its own entrance from the corridor and a final exit at the far end.
 box(6.6,.15,7.2,6.9,-.075,17.1,floorMat);box(6.6,.12,7.2,6.9,3.24,17.1,mat('#827b68'));
 for(const x of[3.58,10.28])box(.12,3.2,7.2,x,1.6,17.1,wallpaper);
 box(1.4,3.2,.14,4.3,1.6,20.72,wallpaper);box(3.9,3.2,.14,8.25,1.6,20.72,wallpaper);box(1.3,.5,.14,5.65,2.95,20.72,wallpaper);
 for(const x of[3.67,10.17]){box(.07,.78,7.2,x,.39,17.1,darkwood);box(.09,.06,7.2,x,.82,17.1,brass);box(.12,.08,7.2,x,3.08,17.1,ivory);}
 for(const [x,w]of[[4.3,1.3],[8.25,3.8]])box(w,.78,.06,x,.39,20.62,darkwood);
 // Suite wainscot and trim follow the openings instead of covering them.
 for(const [x,z,d]of[[-3.58,0,9],[3.58,-2.75,3.5],[3.58,2.45,4.1]]){box(.08,.78,d,x,.39,z,darkwood);box(.11,.065,d,x,.82,z,brass);box(.12,.09,d,x,.09,z,wood);for(const y of[3.03,3.12,3.18])box(.15,.055,d,x,y,z,ivory);}
 for(const z of[-4.49,4.49,4.68,10.49])for(const [x,w]of(z<0?[[0,7.2]]:[[-1.075,5.05],[3.2,.8]])){box(w,.78,.07,x,.39,z,darkwood);box(w,.06,.09,x,.82,z,brass);box(w,.09,.1,x,.09,z,wood);for(const y of[3.03,3.12,3.18])box(w,.055,.15,x,y,z,ivory);}
 for(const [z,d]of[[5.4,1.8],[9.1,2.8]]){box(.08,.78,d,-3.58,.39,z,darkwood);box(.11,.065,d,-3.58,.82,z,brass);box(.12,.09,d,-3.58,.09,z,wood);}box(.15,.055,6,-3.58,3.12,7.5,ivory);
 for(const x of[9.58]){box(.08,.78,6,x,.39,7.5,darkwood);box(.11,.065,6,x,.82,7.5,brass);box(.12,.09,6,x,.09,7.5,wood);box(.15,.055,6,x,3.12,7.5,ivory);}
 for(const [z,d]of[[5.7,2.4],[9.45,2.1]]){box(.08,.78,d,3.58,.39,z,darkwood);box(.11,.065,d,3.58,.82,z,brass);}
 for(const z of[4.68,10.49]){box(6,.78,.07,6.6,.39,z,darkwood);box(6,.06,.09,6.6,.82,z,brass);box(6,.06,.12,6.6,3.12,z,ivory);}
 for(const [x,z,r]of[[2.12,4.4,Math.PI],[2.12,4.76,0]])sign(z<4.5?'거실 · LIVING':'침실 · BEDROOM',.92,.18,x,2.85,z,r);
 sign('간이주방 · KITCHEN',.96,.18,3.47,2.84,7.65,-Math.PI/2);

 box(4.6,.15,6,5.9,-.075,-1.5,floorMat);box(4.6,.12,6,5.9,3.27,-1.5,mat('#b4b4a3'));box(.16,3.2,6,8.28,1.6,-1.5,wallpaper);for(const z of[-4.58,1.58])box(4.6,3.2,.16,5.9,1.6,z,wallpaper);sign('욕실 · BATH',.8,.17,3.47,2.85,-.3,-Math.PI/2);
 const ceilingLamp=group(0,3.06,0);cyl(.35,.4,.08,0,0,0,brass,ceilingLamp);ball(.31,.13,.31,0,-.13,0,new T.MeshStandardMaterial({color:'#eadbbc',emissive:'#e8c392',emissiveIntensity:.45}),ceilingLamp);
 scene.add(new T.HemisphereLight('#b5c3ce','#272018',.25));
 const mainLight=new T.PointLight('#ffd19b',26,10,1.8);mainLight.position.set(0,2.85,0);mainLight.castShadow=true;mainLight.shadow.mapSize.set(1024,1024);mainLight.shadow.bias=-.00005;mainLight.shadow.normalBias=.025;mainLight.shadow.radius=3;scene.add(mainLight);
 const moon=new T.DirectionalLight('#a1b7d4',1.6);moon.position.set(1,4,-8);moon.target.position.set(-1,.2,1.5);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:25});moon.shadow.bias=-.00005;moon.shadow.normalBias=.025;moon.shadow.radius=4;scene.add(moon,moon.target);
 const bounce=new T.PointLight('#8c9db2',2.8,7,2);bounce.position.set(0,1.8,-4.1);scene.add(bounce);
 // Window, rain and pleated curtains.
 const windowGroup=group(0,0,-4.48);for(const x of [-1.5,0,1.5])box(.07,1.95,.12,x,1.65,0,ivory,windowGroup);for(const y of [.68,1.64,2.62])box(3.08,.07,.14,0,y,0,ivory,windowGroup);box(3.2,.12,.32,0,.65,.03,wood,windowGroup);
 const glass=box(2.94,1.88,.025,0,1.65,-.035,new T.MeshPhysicalMaterial({color:'#647789',transparent:true,opacity:.22,roughness:.12,metalness:.15,depthWrite:false}),windowGroup);glass.castShadow=false;
 const exterior=buildExterior(scene,loader,canvasTexture);
 const curtainFabric=new T.MeshStandardMaterial({map:fabricMap,normalMap:fabricNormal,color:'#666758',roughness:1,side:T.DoubleSide});
 const curtains=[];for(const side of [-1,1]){const g=group(side*1.7,0,-4.3);const geo=new T.PlaneGeometry(.95,2.55,40,24),p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin((x+.5)*Math.PI*12)*.09+(1-Math.abs(y)/1.28)*.025);p.setY(i,y+Math.cos(x*20)*.025);}geo.computeVertexNormals();const cloth=mesh(geo,curtainFabric,g);cloth.position.y=1.56;interactive(cloth,'curtains','커튼');curtains.push({g,side});}
 rod([-2.25,2.96,-4.15],[2.25,2.96,-4.15],.035,brass);for(let i=0;i<18;i++){const tor=mesh(new T.TorusGeometry(.055,.009,8,16),brass);tor.position.set(-2.1+i*.247,2.96,-4.15);tor.rotation.y=Math.PI/2;}
 // Blender-authored bed. Keep a local fallback if the optional binary cannot load.
 // Its loading manager includes GLB parsing and embedded textures in room.ready.
 const bed=interactive(group(-2,0,-1.5),'bed','침대');bed.name='bed-316';bed.userData.modelState='loading';
 const fallback=group(0,0,0,bed);fallback.name='bed-fallback';fallback.scale.z=.9;
 rb(2.14,.24,3.75,0,.37,0,darkwood,fallback,.04);rb(2.04,.28,3.64,0,.62,0,linen,fallback,.08);rb(2.3,1.35,.14,0,1.05,-1.89,darkwood,fallback,.035);rb(2.05,1.12,.09,0,1.08,-1.8,fabric,fallback,.05);
 for(const x of [-.9,.9])for(const z of [-1.6,1.6]){cyl(.055,.08,.36,x,.18,z,darkwood,fallback);ball(.08,.05,.08,x,.055,z,brass,fallback);}
 for(const x of [-.65,0,.65])for(const y of [.75,1.08,1.4])ball(.035,.035,.016,x,y,-1.743,brass,fallback);
 const blanketGeo=new T.PlaneGeometry(2.24,2.8,32,40),bp=blanketGeo.attributes.position;for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i);const drop=Math.max(0,Math.abs(x)-.94)*2.1;bp.setZ(i,Math.sin(y*9+x*2)*.014+Math.cos(x*12)*.012-drop);}blanketGeo.computeVertexNormals();const blanket=mesh(blanketGeo,fabric,fallback);blanket.rotation.x=-Math.PI/2;blanket.position.set(0,.81,.4);
 for(const x of [-.5,.5]){const pillow=rb(.89,.18,.55,x,.86,-1.2,linen,fallback,.07);pillow.rotation.y=x*.08;}
 const bedSearch=createBedSearch({bed,fallbackBlanket:blanket,scene,state,canvasTexture});
 new GLTFLoader(manager).load('./assets/models/bed-316.glb?v=20261117-long-tuft',gltf=>{
   const model=gltf.scene;model.name='bed-316-model';model.rotation.y=Math.PI;model.scale.setScalar(1.08);
   model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   bed.add(model);fallback.visible=false;bedSearch.setModel(model);bed.userData.modelState='loaded';
 },undefined,()=>{bed.userData.modelState='fallback';});
 shadow(-2,-1.45,2.65,3.8);solid(-2,-1.45,2.14,3.38);
 const lampStart=scene.children.length,lampSolids=solids.length;
 // Living-room side table and UV lamp.
 const bedside=group(-2.95,0,-3.65);rb(.75,.65,.64,0,.4,0,wood,bedside);rb(.84,.07,.72,0,.77,0,wood,bedside);for(const x of [-.25,.25])for(const z of [-.2,.2])rod([x,0,z],[x,.2,z],.035,darkwood,bedside);solid(-2.95,-3.65,.85,.75);shadow(-2.95,-3.65,1.2,1.1);
 const lamp=interactive(group(-2.95,.82,-3.65),'lamp','거실 스탠드');cyl(.16,.19,.06,0,.02,0,brass,lamp);cyl(.035,.055,.5,0,.3,0,brass,lamp);const shadeMat=new T.MeshStandardMaterial({color:'#c8b995',side:T.DoubleSide,roughness:1,emissive:'#e6bc73',emissiveIntensity:.2});const shade=mesh(new T.CylinderGeometry(.22,.34,.4,40,1,true),shadeMat,lamp);shade.position.y=.68;const lightbulb=ball(.065,.1,.065,0,.65,0,new T.MeshStandardMaterial({color:'#fff3ca',emissive:'#ffe1a0',emissiveIntensity:1.5}),lamp);cyl(.012,.012,.1,0,.93,0,brass,lamp);
 const lampLight=new T.PointLight('#ffc47c',17,5,1.6);lampLight.position.set(-2.95,1.47,-3.65);lampLight.castShadow=true;lampLight.shadow.mapSize.set(512,512);lampLight.shadow.bias=-.00005;lampLight.shadow.normalBias=.012;scene.add(lampLight);rod([-2.92,.84,-3.6],[-3.28,.1,-3.9],.009,black);
 
 // Worn rug: thousands of small geometric knots rather than a flat rectangle.
 const rugTex=canvasTexture((a,w,h)=>{a.fillStyle='#5a3b34';a.fillRect(0,0,w,h);for(let i=0;i<18;i++){a.strokeStyle=['#b19565','#342e2a','#8c664a'][i%3];a.lineWidth=5;a.strokeRect(10+i*5,10+i*5,w-20-i*10,h-20-i*10);}a.translate(w/2,h/2);for(let y=-330;y<=330;y+=90)for(let x=-180;x<=180;x+=90){a.save();a.translate(x,y);a.rotate(Math.PI/4);a.fillStyle='#a38d60';a.fillRect(-24,-24,48,48);a.fillStyle='#423e33';a.fillRect(-17,-17,34,34);a.fillStyle='#c1aa79';a.fillRect(-5,-5,10,10);a.restore();}for(let i=0;i<30000;i++){a.fillStyle=Math.random()>.5?'#dbc9a00b':'#00000010';a.fillRect((Math.random()-.5)*w,(Math.random()-.5)*h,1,2);}},512,1024);const rug=mesh(new T.PlaneGeometry(2.1,3.5),new T.MeshStandardMaterial({map:rugTex,roughness:1,color:'#b0a28d'}));rug.rotation.x=-Math.PI/2;rug.position.set(.35,.025,.3);for(const z of [-1.49,2.09])for(let x=-.7;x<1.4;x+=.035)rod([x,.025,z],[x+Math.sin(x*10)*.01,.025,z+(z>0?.08:-.08)],.004,linen);
 const vanityStart=scene.children.length,vanitySolids=solids.length;
 // Bathroom fallback cabinet has its own linen puzzle, independent of the bedroom.
 const desk=group(2.98,0,-2.15);rb(.92,.09,2.0,0,1.02,0,wood,desk);for(const z of [-.8,.8])for(const x of [-.33,.33]){rod([x,.03,z],[x,.97,z],.045,darkwood,desk);ball(.07,.04,.07,x,.04,z,brass,desk);}box(.65,.48,1.65,.08,.72,0,darkwood,desk);solid(2.98,-2.15,.95,2.05);shadow(2.98,-2.15,1.5,2.6);
 const bathCabinet=interactive(group(0,0,0,desk),'linenCabinet','욕실 린넨 수납장');rb(.08,.25,1.48,-.42,.78,0,wood,bathCabinet);box(.6,.04,1.4,-.1,.66,0,darkwood,bathCabinet);box(.62,.16,.05,-.1,.75,-.7,wood,bathCabinet);box(.62,.16,.05,-.1,.75,.7,wood,bathCabinet);const handle=mesh(new T.TorusGeometry(.07,.012,8,24),brass,bathCabinet);handle.position.set(-.48,.77,0);handle.rotation.y=Math.PI/2;ball(.018,.027,.02,-.467,.8,-.35,black,bathCabinet);
 shiftSince(vanityStart,vanitySolids,4.5,.65);const legacyVanity=scene.children.slice(vanityStart);for(const b of solids.slice(vanitySolids))b.bathLegacy=true;
 const diningStart=scene.children.length,diningSolids=solids.length;
 // Ledger and stationery. The worksheet texture is shared with the movable overlay puzzle.
 const ledger=interactive(box(.62,.025,.72,2.9,1.08,-2.05,paper),'ledger','인화 작업표');const blotter=box(.76,.015,1.12,2.98,.799,-2.03,leather);ledger.position.y=.816;
 const ledgerPrint=canvasTexture((a,w,h)=>{a.fillStyle='#bda680';a.fillRect(0,0,w,h);a.fillStyle='#514738';a.font='28px serif';a.fillText('CONTACT  /  316',55,80);a.strokeStyle='#5b503b';for(let x=50;x<600;x+=80){a.beginPath();a.moveTo(x,140);a.lineTo(x,700);a.stroke();}for(let y=140;y<740;y+=80){a.beginPath();a.moveTo(50,y);a.lineTo(570,y);a.stroke();}a.font='30px monospace';for(let y=0;y<6;y++)for(let x=0;x<6;x++)a.fillText(String((x*7+y*3)%10),70+x*80,190+y*80);},640,800);const lp=mesh(new T.PlaneGeometry(.6,.7),new T.MeshStandardMaterial({map:ledgerPrint,roughness:1}));lp.rotation.x=-Math.PI/2;lp.position.set(2.9,.831,-2.05);interactive(lp,'ledger','인화 작업표');
 for(const x of [2.7,3.0]){const pen=cyl(.009,.009,.25,x,.818,-1.48,brass);pen.rotation.z=Math.PI/2;}
 const chair=group(1.83,0,-2.15);rb(.53,.08,.56,0,.51,0,darkwood,chair);rb(.49,.07,.52,0,.57,0,leather,chair);for(const x of [-.21,.21])for(const z of [-.22,.22])rod([x,0,z],[x,.52,z],.026,darkwood,chair);for(const z of [-.22,.22])rod([-.22,.5,z],[-.22,1.14,z],.025,darkwood,chair);rb(.055,.44,.48,-.23,.94,0,darkwood,chair);solid(1.83,-2.15,.56,.6);shadow(1.83,-2.15,.9,.9);
 // Mantel clock: glass, hands, minute marks and a spring-loaded compartment.
 const clock=interactive(group(2.96,1.09,-2.87),'clock','멈춘 탁상시계');clock.rotation.y=-Math.PI/2;rb(.47,.1,.22,0,.03,0,darkwood,clock);rb(.37,.45,.18,0,.29,0,darkwood,clock,.035);const clockface=canvasTexture((a,w,h)=>{a.fillStyle='#d1c6a5';a.fillRect(0,0,w,h);a.translate(w/2,h/2);a.strokeStyle='#514737';a.lineWidth=5;a.beginPath();a.arc(0,0,235,0,Math.PI*2);a.stroke();for(let i=0;i<60;i++){a.save();a.rotate(i*Math.PI/30);a.lineWidth=i%5?2:5;a.beginPath();a.moveTo(0,-205);a.lineTo(0,i%5?-215:-225);a.stroke();a.restore();}a.fillStyle='#3a352c';a.textAlign='center';a.textBaseline='middle';a.font='48px serif';for(let i=1;i<=12;i++)a.fillText(String(i),Math.sin(i*Math.PI/6)*166,-Math.cos(i*Math.PI/6)*166);},512);const face=mesh(new T.CircleGeometry(.17,64),new T.MeshStandardMaterial({map:clockface,roughness:.65}),clock);face.position.set(0,.3,.101);const hr=box(.014,.1,.006,0,.33,.111,black,clock);const mn=box(.009,.14,.007,0,.35,.12,black,clock);ball(.015,.015,.008,0,.3,.13,brass,clock);const glassface=mesh(new T.CircleGeometry(.172,64),new T.MeshPhysicalMaterial({transparent:true,opacity:.11,roughness:.12,color:'#b9c8ce',depthWrite:false}),clock);glassface.position.set(0,.3,.14);glassface.castShadow=false;
 const clockFlap=rb(.34,.06,.19,0,.09,.02,darkwood,clock);const clockKey=group(0,.12,.02,clock);const bow=mesh(new T.TorusGeometry(.04,.009,8,20),brass,clockKey);rod([0,-.04,0],[0,-.15,0],.009,brass,clockKey);box(.05,.018,.016,.018,-.13,0,brass,clockKey);clockKey.visible=false;
 rb(.82,.07,1.65,2.95,.76,-2.05,wood);for(const z of[-2.72,-1.38])for(const x of[2.65,3.25])box(.06,.74,.06,x,.37,z,wood);solid(2.95,-2.05,.82,1.65);
 // Restore the original locked drawer beneath the bedroom writing desk.
 const drawer=interactive(group(2.95,0,-2.05),'drawer','침실 책상 서랍 · 삼각 표식');
 box(.68,.025,1.40,0,.57,0,darkwood,drawer);rb(.035,.12,1.43,-.36,.625,0,wood,drawer,.006);box(.03,.10,1.40,.325,.625,0,wood,drawer);for(const z of[-.685,.685])box(.65,.10,.025,0,.625,z,wood,drawer);
 rod([-.39,.63,-.13],[-.39,.63,.13],.009,brass,drawer);const deskMark=sign('△',.075,.075,0,0,0,-Math.PI/2,'#cfb37f','#463727');drawer.add(deskMark);deskMark.position.set(-.383,.63,.39);ball(.007,.014,.012,-.383,.63,.49,black,drawer);
 const bulb=interactive(group(-.03,.615,.2,drawer),'bulb','책상 서랍 안의 보랏빛 전구');const tube=mesh(new T.CylinderGeometry(.028,.028,.33,16),new T.MeshStandardMaterial({color:'#8573b9',emissive:'#1c1039',roughness:.3}),bulb);tube.rotation.z=Math.PI/2;for(const x of[-.18,.18]){const end=cyl(.034,.034,.055,x,0,0,brass,bulb);end.rotation.z=Math.PI/2;}bulb.visible=false;
 const mirrorStart=scene.children.length,mirrorSolids=solids.length;
 // Photographic print and a removable frame with an actual back.
 const frame=interactive(group(-3.47,1.83,1.15),'frame','호텔 사진');frame.rotation.y=Math.PI/2;rb(1.34,.98,.1,0,0,0,darkwood,frame);for(const y of [-.45,.45])rb(1.3,.045,.13,0,y,.02,brass,frame);for(const x of [-.63,.63])rb(.045,.88,.13,x,0,.02,brass,frame);const pic=mesh(new T.PlaneGeometry(1.18,.79),new T.MeshStandardMaterial({map:photo,roughness:.8}),frame);pic.position.z=.057;box(1.17,.8,.014,0,0,-.059,paper,frame);const backPaper=box(.4,.3,.014,.2,.05,-.077,mat('#a78b5b'),frame);backPaper.userData.filmBack=true;const tape=box(.46,.035,.018,.2,.05,-.088,new T.MeshStandardMaterial({color:'#a68e59',transparent:true,opacity:.78,roughness:1}),frame);tape.userData.filmBack=true;
 const uvInk=sign('바깥  ↙\n가운데  ↑\n안쪽  ↘',1.26,.75,-3.478,1.84,1.15,Math.PI/2,'#b6aee0','#23221e',true);uvInk.material.transparent=true;uvInk.material.opacity=0;uvInk.castShadow=false;
 // A real planar reflection, not a painted "mirror" texture.
 const mirrorGroup=group(3.48,1.83,1.15);mirrorGroup.rotation.y=-Math.PI/2;rb(1.48,1.79,.1,0,0,0,darkwood,mirrorGroup);for(const y of [-.83,.83])rb(1.44,.055,.14,0,y,.03,brass,mirrorGroup);for(const x of [-.69,.69])rb(.055,1.62,.14,x,0,.03,brass,mirrorGroup);const mirror=new Reflector(new T.PlaneGeometry(1.32,1.58),{color:0xb9c2bb,textureWidth:1024,textureHeight:1024,clipBias:.003});mirror.position.z=.065;mirrorGroup.add(mirror);interactive(mirror,'mirror','벽 거울');const reflectRoom=mirror.onBeforeRender;mirror.onBeforeRender=function(...args){const opacity=uvInk.material.opacity;uvInk.material.opacity=uvVisible(state)?1:0;try{reflectRoom.apply(this,args);}finally{uvInk.material.opacity=opacity;}};
 
 // Wardrobe, suitcase, books, rotary telephone and switches provide searchable human detail.
 const bedroomStart=scene.children.length;
 const wardrobe=interactive(group(-2.4,0,3.91),'wardrobe','옷장');box(1.9,.08,.72,0,.16,0,darkwood,wardrobe);box(1.9,.08,.72,0,2.45,0,darkwood,wardrobe);box(.08,2.3,.72,-.91,1.3,0,darkwood,wardrobe);box(.08,2.3,.72,.91,1.3,0,darkwood,wardrobe);box(1.9,2.3,.06,0,1.3,.33,darkwood,wardrobe);rod([-.8,2.1,0],[.8,2.1,0],.018,brass,wardrobe);rb(2.04,.12,.82,0,2.5,0,wood,wardrobe);const wardrobeDoors=[];for(const side of [-1,1]){const hinge=group(side*.93,0,-.4,wardrobe),x=-side*.46;rb(.91,2.13,.06,x,1.3,0,wood,hinge);rb(.75,1.86,.035,x,1.3,-.042,darkwood,hinge);ball(.025,.08,.022,x-side*.3,1.2,-.08,brass,hinge);wardrobeDoors.push({hinge,side});}for(let i=0;i<3;i++){const x=-.45+i*.42;rod([x,2.13,0],[x-.16,1.96,0],.009,brass,wardrobe);rod([x,2.13,0],[x+.16,1.96,0],.009,brass,wardrobe);rod([x-.16,1.96,0],[x+.16,1.96,0],.009,brass,wardrobe);}box(.3,.01,.2,0,.21,-.1,paper,wardrobe);for(const x of [-.7,.7])for(const z of [-.22,.22])cyl(.055,.075,.2,x,.1,z,darkwood,wardrobe);solid(-2.4,3.91,2.05,.9);shadow(-2.4,3.9,2.5,1.4);
 const suitcase=interactive(group(-2.7,.25,2.55),'suitcase','가죽 여행 가방');rb(1.1,.12,.64,0,-.17,0,leather,suitcase,.035);for(const x of[-.52,.52])box(.07,.32,.64,x,.02,0,leather,suitcase);for(const z of[-.29,.29])box(1.05,.32,.07,0,.02,z,leather,suitcase);const suitcaseLid=group(0,.18,.32,suitcase);rb(1.1,.1,.64,0,0,-.32,leather,suitcaseLid,.035);box(.92,.015,.49,0,-.06,-.32,mat('#6c6551'),suitcaseLid);for(const x of [-.35,.35])box(.075,.47,.66,x,0,0,darkwood,suitcase);rb(.32,.08,.06,0,.28,0,brass,suitcase);for(const x of [-.43,.43])box(.1,.06,.04,x,.08,-.34,brass,suitcase);solid(-2.7,2.55,1.15,.7);solids[solids.length-1].suitcaseLegacy=true;shadow(-2.7,2.55,1.6,1);
 const legacyBedroom=scene.children.slice(bedroomStart);
 const phone=interactive(group(2.8,.5,3.7),'phone','검은 전화기');rb(.69,.67,.5,0,-.1,0,wood,phone);rb(.73,.07,.55,0,.26,0,wood,phone);const body=rb(.44,.12,.3,0,.35,0,black,phone,.04);const dial=cyl(.12,.12,.02,0,.42,0,brass,phone);for(let i=0;i<10;i++){const a=i*Math.PI*2/12-.3;const hole=cyl(.018,.018,.025,Math.sin(a)*.083,.435,Math.cos(a)*.083,black,phone,12);}rod([-.2,.46,-.09],[.2,.46,-.09],.035,black,phone);for(const x of [-.19,.19])ball(.08,.055,.07,x,.46,-.09,black,phone);const cordPoints=[];for(let i=0;i<100;i++){const a=i*.6;cordPoints.push(new T.Vector3(.23+Math.sin(a)*.02,.43-i*.004,-.07+Math.cos(a)*.02));}const cord=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cordPoints),100,.006,6,false),black,phone);phone.position.set(.8,.5,9.4);solid(.8,9.4,.8,.6);
 const switchGroup=interactive(group(.96,1.35,4.43),'switch','벽 스위치');rb(.13,.22,.025,0,0,0,ivory,switchGroup,.008);rb(.055,.1,.025,0,0,-.022,black,switchGroup,.008);
 // The exit is a heavy mechanical door, with three nested ring dials.
 for(const x of [1.4,2.84])box(.12,2.75,.2,x,1.375,10.49,wood);box(1.56,.12,.2,2.12,2.76,10.49,wood);
 const innerDoors=[];
 const doorMetal=mat('#64716b',.43,.55);
 function partitionDoor(x,z,w,yaw,field,id,label,swing=1.53,plaque='',plaqueSide=-1){
   const leaf=interactive(group(x,0,z),id,label);leaf.rotation.y=yaw;
   if(['door','twinDoor','kitchenDoor'].includes(id)){
     const frame=group(x,0,z);frame.rotation.y=yaw;
     for(const edge of [-.042,w+.042])rb(.075,2.72,.19,edge,1.36,0,wood,frame,.005);
     rb(w+.16,.073,.19,w/2,2.697,0,wood,frame,.005);
   }
   const handles=buildHotelDoor({parent:leaf,width:w,kind:id==='stairDoor'?'fire':'wood',plaque,plaqueSide,
     helpers:{rb,box,cyl,group,sign,rod},materials:{wood,darkwood,brass,metal:doorMetal,dark:black}});
   const move=hingedDoor({leaf,handles,width:w,thickness:.084,yaw,swing,solids});
   innerDoors.push({leaf,field,label,move});return leaf;
 }
 const door=partitionDoor(1.46,4.5,1.32,0,'bedroomOpen','door','거실 문 · 세 겹의 잠금',-1.53);
 const lock=interactive(group(.82,1.65,-.082,door),'lock','세 겹의 잠금장치');const lockPlate=cyl(.255,.255,.045,0,0,0,brass,lock);lockPlate.rotation.x=Math.PI/2;const rings=[];for(let i=0;i<3;i++){const ring=group(0,0,-.035-i*.008,lock),radius=.21-i*.056;const tor=mesh(new T.TorusGeometry(radius,.018,10,64),darkwood,ring);const notch=box(.028,.045,.015,0,radius,-.01,ivory,ring);rings.push(ring);}ball(.025,.025,.018,0,0,-.08,brass,lock);
 // Living room furniture leaves a clear route along the right side of the suite.
 const loungeStart=scene.children.length;
 const sofa=group(-1.35,0,8.35);rb(2.4,.28,.95,0,.4,0,darkwood,sofa,.05);rb(2.35,.65,.2,0,.82,.42,fabric,sofa,.06);for(const x of[-1.1,1.1])rb(.23,.5,1.05,x,.65,0,fabric,sofa,.06);for(const x of[-.52,.52])rb(.9,.18,.78,x,.62,-.04,fabric,sofa,.06);for(const x of[-.9,.9])for(const z of[-.33,.33])cyl(.045,.06,.28,x,.14,z,darkwood,sofa);solid(-1.35,8.35,2.5,1.1);shadow(-1.35,8.35,2.9,1.6);
 const coffee=group(-1.35,0,6.85);rb(1.7,.08,.8,0,.49,0,wood,coffee);for(const x of[-.68,.68])for(const z of[-.27,.27])rod([x,0,z],[x,.45,z],.03,brass,coffee);const magazine=box(.36,.025,.45,-.2,.55,0,paper,coffee);solid(-1.35,6.85,1.75,.85);shadow(-1.35,6.85,2.2,1.3);
 const legacyLounge=scene.children.slice(loungeStart);
 const loungeRug=rug.clone();loungeRug.position.set(-1.35,.022,7.5);loungeRug.scale.set(1.45,1.05,1);scene.add(loungeRug);
 const minibarCups=[];
 const minibar=interactive(group(-2.92,0,9.7),'minibar','거실 미니바');rb(.93,.9,.65,0,.48,0,wood,minibar);rb(1.02,.06,.73,0,.96,0,darkwood,minibar);for(const x of[-.22,.22])minibarCups.push(cyl(.065,.045,.12,x,1.06,0,ivory,minibar));solid(-2.92,9.7,1,.75);shadow(-2.92,9.7,1.3,1.1);
 for(const [x,z,id]of[[0,7.35,'living'],[6.5,7.3,'kitchen']]){const fixture=group(x,3.05,z);cyl(.34,.4,.07,0,0,0,brass,fixture);ball(.3,.13,.3,0,-.13,0,new T.MeshStandardMaterial({color:'#e3d7b9',emissive:'#edc79a',emissiveIntensity:.4}),fixture);const light=new T.PointLight('#f2c69b',id==='living'?23:26,9,1.7);light.position.set(x,2.7,z);scene.add(light);suiteLights.push({fixture,light,base:light.intensity});}
 // A suite directory and the companion guest's spare key belong inside 316.
 const directory=sign('316 · SUITE\n침실 2 / 거실 / 주방 / 욕실',.65,.42,.65,1.7,4.4,Math.PI);interactive(directory,'suiteDirectory','316호 객실 안내');
 sign('동행인 · 트윈 침실 ←',.65,.16,.8,1.83,10.35,Math.PI);
 const livingSwitch=interactive(group(.25,1.35,10.38),'switch','316호 조명 스위치');rb(.13,.22,.025,0,0,0,ivory,livingSwitch,.008);rb(.055,.1,.025,0,0,-.022,black,livingSwitch,.008);
 // The corridor has a runner, sconces, room numbers and a separate 317 entrance.
 const runner=mesh(new T.PlaneGeometry(13.4,1.45),new T.MeshStandardMaterial({map:fabricMap,color:'#673f35',roughness:1}));runner.rotation.x=-Math.PI/2;runner.position.set(3.3,.025,12);
 for(const [z,x,w]of[[10.7,-1.1,5],[10.7,6.52,7.36],[13.38,.4,8],[13.38,8.02,4.36]]){box(w,.72,.07,x,.36,z,darkwood);box(w,.055,.09,x,.76,z,brass);} // Carve trim at traversable openings below.
 for(const x of[-2.3,3.3,8.5]){const light=new T.PointLight('#e8c89c',6,5,1.8);light.position.set(x,2.35,12);scene.add(light);const lamp=group(x,3.04,12);cyl(.15,.2,.08,0,0,0,brass,lamp);ball(.16,.1,.16,0,-.11,0,new T.MeshStandardMaterial({color:'#e5d9bd',emissive:'#e9c592',emissiveIntensity:.5}),lamp);}
 // Entry door 317 is a normal locked hotel door, not 316's internal connecting door.
 for(const x of[4.4,5.84])box(.12,2.75,.2,x,1.375,13.5,wood);box(1.56,.12,.2,5.12,2.77,13.5,wood);
 partitionDoor(4.46,13.5,1.32,0,'room317Open','entry317','317호 출입문',-1.53,'317');
 sign('317 →',.7,.18,1.1,1.9,13.37,Math.PI);
 // Other guest doors are scenery: they cannot bypass the suite or 317 locks.
 for(const x of[-1.9,8.65]){rb(1.23,2.6,.12,x,1.3,13.4,darkwood);for(const side of[-1,1])box(.1,2.72,.17,x+side*.68,1.36,13.38,wood);sign(x<0?'315':'319',.34,.15,x,2.05,13.31,Math.PI);rod([x+.35,1.12,13.29],[x+.52,1.12,13.29],.022,brass);}
 // A residential hotel kitchenette: refrigerator, sink, hob and a dining table.
 const kitchenStart=scene.children.length;
 const kitchenBase=group(6.3,0,5.04);rb(3.7,.85,.72,0,.47,0,wood,kitchenBase);rb(3.83,.07,.81,0,.93,0,ivory,kitchenBase);for(const x of[-1.35,-.45,.45,1.35]){rb(.84,.7,.04,x,.49,.39,darkwood,kitchenBase);rod([x-.1,.73,.43],[x+.1,.73,.43],.012,brass,kitchenBase);}solid(6.3,5.04,3.8,.82);shadow(6.3,5.04,4.1,1.15);
 const tileMap=canvasTexture((a,w,h)=>{a.fillStyle='#c2c5b9';a.fillRect(0,0,w,h);a.strokeStyle='#777d72';a.lineWidth=3;for(let x=0;x<=w;x+=128){a.beginPath();a.moveTo(x,0);a.lineTo(x,h);a.stroke();}for(let y=0;y<=h;y+=128){a.beginPath();a.moveTo(0,y);a.lineTo(w,y);a.stroke();}},512);const kitchenBacksplash=box(3.85,.68,.025,6.3,1.31,4.7,new T.MeshStandardMaterial({map:tileMap,roughness:.5}));
 const sinkSteel=mat('#7c8983',.28,.75);rb(.73,.025,.5,5.5,.98,5.04,sinkSteel);rb(.58,.015,.35,5.5,.994,5.04,mat('#303d3b',.2,.65));rod([5.5,.99,4.8],[5.5,1.3,4.8],.018,sinkSteel);rod([5.5,1.3,4.8],[5.5,1.3,5.02],.018,sinkSteel);rod([5.5,1.3,5.02],[5.5,1.24,5.02],.018,sinkSteel);
 rb(.84,.035,.58,7.18,.99,5.04,black);for(const x of[6.98,7.38]){cyl(.15,.15,.018,x,1.02,5.04,brass);cyl(.115,.115,.025,x,1.032,5.04,black);}cyl(.11,.13,.19,7.8,1.09,5.03,sinkSteel);rod([7.7,1.22,5.03],[7.91,1.22,5.03],.018,black);
 const legacyKitchen=scene.children.slice(kitchenStart).filter(o=>o!==kitchenBacksplash);
 const suiteDetailsStart=scene.children.length;
 const fridge=group(4.0,0,5.14);rb(.64,1.94,.88,0,.99,0,mat('#a8aba0',.4,.18),fridge,.035);box(.73,.025,.025,0,1.32,.46,black,fridge);for(const y of[.9,1.56])rod([.25,y-.13,.49],[.25,y+.13,.49],.018,brass,fridge);solid(4.0,5.14,.66,.92);shadow(4.15,5.14,1.1,1.2);
 const diningTable=group(8.98,0,6.85);rb(.95,.08,2.02,0,.76,0,wood,diningTable);for(const x of[-.34,.34])for(const z of[-.82,.82])rod([x,0,z],[x,.72,z],.035,darkwood,diningTable);solid(8.98,6.85,1.0,2.05);shadow(8.98,6.85,1.5,2.6);
 const trolley=group(5.2,0,9.3);for(const y of[.25,.78])rb(1.25,.05,.62,0,y,0,darkwood,trolley);for(const x of[-.55,.55])for(const z of[-.25,.25])rod([x,.1,z],[x,.9,z],.015,brass,trolley);for(const x of[-.5,.5])for(const z of[-.22,.22])ball(.06,.06,.025,x,.07,z,black,trolley);for(let i=0;i<5;i++)cyl(.12,.12,.015,5.1,.83+i*.016,9.3,ivory);solid(5.2,9.3,1.3,.7);shadow(5.2,9.3,1.6,1.0);
 // A separate tiled bathroom contains the locked vanity and its UV bulb.
 const legacySuiteDetails=[chair,...scene.children.slice(suiteDetailsStart)];
 const bathStart=scene.children.length,bathSolids=solids.length;
 const bathTile=canvasTexture((a,w,h)=>{a.fillStyle='#a5aaa0';a.fillRect(0,0,w,h);a.strokeStyle='#656d65';a.lineWidth=4;for(let x=0;x<=w;x+=128){a.beginPath();a.moveTo(x,0);a.lineTo(x,h);a.stroke();}for(let y=0;y<=h;y+=128){a.beginPath();a.moveTo(0,y);a.lineTo(w,y);a.stroke();}},512);
 const bathMat=new T.MeshStandardMaterial({map:bathTile,color:'#c9c8b8',roughness:.48});box(4.6,.025,6,5.9,.014,-1.5,bathMat);for(const x of[3.78,8.12]){if(x>8)box(.025,2.4,6,x,1.2,-1.5,bathMat);}for(const z of[-4.4,1.4])box(4.6,2.4,.025,5.9,1.2,z,bathMat);
 const porcelain=mat('#e5e2d2',.2);const basin=mesh(new T.TorusGeometry(.27,.06,12,48),porcelain);basin.rotation.x=Math.PI/2;basin.scale.set(1,1.3,.7);basin.position.set(7.48,1.13,-1.5);ball(.23,.025,.3,7.48,1.08,-1.5,porcelain);cyl(.035,.035,.008,7.48,1.111,-1.5,sinkSteel);rod([7.84,1.07,-1.5],[7.84,1.39,-1.5],.018,sinkSteel);rod([7.84,1.39,-1.5],[7.6,1.39,-1.5],.018,sinkSteel);rod([7.6,1.39,-1.5],[7.6,1.34,-1.5],.018,sinkSteel);
 rb(.055,1.22,1.43,8.05,1.94,-1.5,brass);box(.025,1.12,1.32,8.01,1.94,-1.5,new T.MeshStandardMaterial({color:'#a4b3ae',metalness:.9,roughness:.18}));
 rb(1.85,.1,1.28,4.95,.08,-3.68,porcelain);const showerGlass=box(.025,1.95,1.27,5.93,1.14,-3.68,new T.MeshPhysicalMaterial({color:'#91a6a0',transparent:true,opacity:.18,roughness:.1,metalness:.1,depthWrite:false}));showerGlass.castShadow=false;solid(5.93,-3.68,.04,1.27);rod([4.9,1.02,-4.2],[4.9,2.45,-4.2],.025,sinkSteel);rod([4.9,2.45,-4.2],[4.9,2.45,-3.95],.025,sinkSteel);cyl(.13,.13,.035,4.9,2.43,-3.95,sinkSteel);rb(.12,.2,.07,4.9,1.1,-4.16,sinkSteel);
 const toilet=group(4.45,0,.75);ball(.27,.19,.34,0,.33,0,porcelain,toilet);cyl(.14,.19,.3,0,.17,.07,porcelain,toilet);rb(.52,.64,.22,0,.67,.31,porcelain,toilet);const seat=mesh(new T.TorusGeometry(.22,.035,10,40),ivory,toilet);seat.rotation.x=Math.PI/2;seat.scale.y=1.3;seat.position.set(0,.48,-.02);solid(4.45,.75,.65,.95);
 for(const y of[1.1,1.45])rod([5.55,y,1.3],[6.25,y,1.3],.015,brass);rb(.55,.38,.035,5.9,1.26,1.27,linen);const bathNote=interactive(sign('LAUNDRY / 316',.3,.21,7.15,1.45,1.37,Math.PI,'#484435','#cdbb96'),'bathNote','세탁 담당자의 기록');
 const bathFixture=group(5.8,3.03,-1.4);cyl(.2,.25,.06,0,0,0,ivory,bathFixture);ball(.23,.08,.23,0,-.08,0,new T.MeshStandardMaterial({color:'#e0e8dc',emissive:'#c8d5ce',emissiveIntensity:.5}),bathFixture);const bathLight=new T.PointLight('#cfdbd2',24,7,1.7);bathLight.position.set(5.8,2.7,-1.4);scene.add(bathLight);suiteLights.push({fixture:bathFixture,light:bathLight,base:bathLight.intensity});

 const legacyBath=scene.children.slice(bathStart).filter(o=>![bathNote,bathFixture,bathLight].includes(o));for(const b of solids.slice(bathSolids))b.bathLegacy=true;
 const domestic=buildDomesticModels({scene,renderer,manager,state,solids,mirror,canvasTexture,legacy:{bathCabinet,clock,vanity:legacyVanity,bath:legacyBath,kitchen:legacyKitchen,lounge:legacyLounge,bedroom:legacyBedroom,lightExtras:fixtureLights}});
 const nextRoomStart=scene.children.length,nextRoomSolids=solids.length;
 // Room 317: guest belongings, room service and a mechanical music-box puzzle.
 const secondLight=new T.PointLight('#ffd3a0',27,9,1.7);secondLight.position.set(4,2.65,8);scene.add(secondLight);
 const secondCool=new T.PointLight('#8ea9bb',5,7,2);secondCool.position.set(6.4,2,5.3);scene.add(secondCool);
 const ceiling317=group(4,3.06,8);cyl(.3,.36,.08,0,0,0,brass,ceiling317);ball(.28,.12,.28,0,-.12,0,new T.MeshStandardMaterial({color:'#e1d1ab',emissive:'#e0b278',emissiveIntensity:.5}),ceiling317);
 const rug317=rug.clone();rug317.position.set(3.3,.025,8);rug317.scale.set(.8,.9,1);scene.add(rug317);
 sign('317 · 객실',.7,.17,2.12,2.94,4.7,0);
 // Reuse the authored bed geometry, textures and soft furnishings for the next guest room.
 const nextBed=group(5.7,0,6.9);nextBed.rotation.y=Math.PI;
 ready.then(()=>{const copy=bed.clone(true);copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.traverse(o=>{o.morphTargetInfluences?.fill(0);delete o.userData.interactId;delete o.userData.label;});nextBed.add(copy);interactive(nextBed,'bed317','317호 침대');nextBed.updateMatrixWorld(true);const surface=new T.Raycaster(new T.Vector3(tag317.position.x,3,tag317.position.z),new T.Vector3(0,-1,0)).intersectObject(nextBed,true).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;});if(surface)tag317.position.y=surface.point.y+.045;});
 solid(5.7,6.9,2.14,3.38);shadow(5.7,6.9,2.7,3.9);
 const blanketNote=box(.23,.015,.35,5.1,.94,6.4,paper);const tag317=interactive(blanketNote,'tag317','침대 위 수하물표');tag317.rotation.y=.15;
 // A compact writing table leaves a clear walking route from the connecting door.
 const guestFurnitureStart=scene.children.length;
 const table317=group(1.24,0,8.2);rb(.95,.08,1.65,0,.76,0,wood,table317);for(const x of[-.35,.35])for(const z of[-.65,.65])rod([x,0,z],[x,.72,z],.035,darkwood,table317);solid(1.24,8.2,1,1.7);shadow(1.24,8.2,1.4,2.1);
 const receipt317=interactive(box(.31,.012,.48,1.25,.815,7.9,paper),'receipt317','접힌 호텔 영수증');receipt317.rotation.y=-.15;
 for(const [sheet,title]of [[receipt317,'HOTEL FOLIO'],[tag317,'HOTEL / 317']]){const print=canvasTexture((a,w,h)=>{a.fillStyle='#cbb58c';a.fillRect(0,0,w,h);a.strokeStyle='#61513b';a.lineWidth=3;a.strokeRect(16,16,w-32,h-32);a.fillStyle='#443e30';a.textAlign='center';a.font='24px serif';a.fillText(title,w/2,60);a.font='46px serif';a.fillText('317',w/2,130);for(let y=180;y<330;y+=24){a.fillStyle='#78684d';a.fillRect(40,y,w-80,2);}},256,384);const ink=mesh(new T.PlaneGeometry(sheet===tag317?.22:.3,sheet===tag317?.34:.47),new T.MeshStandardMaterial({map:print,roughness:1}),sheet);ink.rotation.x=-Math.PI/2;ink.position.y=.009;}
 const cup317=cyl(.065,.05,.11,1.2,1.08,8.65,ivory);cyl(.1,.1,.015,1.2,1.025,8.65,ivory);const cupHandle=mesh(new T.TorusGeometry(.035,.008,8,20),ivory);cupHandle.position.set(1.28,1.09,8.65);cupHandle.rotation.y=Math.PI/2;
 // A suitcase on a luggage rack, with independent hinged lid and three brass dials.
 const luggage317=interactive(group(5.7,.65,9.6),'luggage317','다이얼이 달린 여행가방');rb(1.35,.34,.8,0,0,0,leather,luggage317,.04);const luggageLid=group(0,.18,.4,luggage317);rb(1.35,.1,.8,0,0,-.4,leather,luggageLid,.035);for(const x of[-.44,.44])box(.08,.38,.84,x,.01,0,darkwood,luggage317);for(const x of[-.1,0,.1]){const d=cyl(.048,.048,.06,x,.08,-.43,brass,luggage317);d.rotation.x=Math.PI/2;}rod([-.18,.1,-.46],[.18,.1,-.46],.012,brass,luggage317);for(const x of[5.1,6.3])for(const z of[9.3,9.9])rod([x,0,z],[x,.48,z],.028,darkwood);box(1.4,.05,.9,5.7,.45,9.6,darkwood);solid(5.7,9.6,1.5,1);shadow(5.7,9.6,1.8,1.5);
 // Vanity, small round mirror and music box with visible brass drum and winding socket.
 const vanity=group(5.9,0,11.16);rb(2,.09,.72,0,.76,0,wood,vanity);for(const x of[-.84,.84])for(const z of[-.22,.22])rod([x,0,z],[x,.71,z],.04,darkwood,vanity);solid(5.9,11.16,2.05,.8);shadow(5.9,11.16,2.4,1.2);
 const vm=mesh(new T.CircleGeometry(.44,48),new T.MeshStandardMaterial({color:'#8b9690',metalness:.8,roughness:.16}));vm.position.set(6,1.75,11.57);vm.rotation.y=Math.PI;const vr=mesh(new T.TorusGeometry(.46,.025,10,48),brass);vr.position.copy(vm.position);
 const musicBox=interactive(group(5.5,.82,11.06),'musicBox','태엽 구멍이 있는 오르골');rb(.61,.2,.42,0,.08,0,darkwood,musicBox);rb(.65,.035,.46,0,.2,0,brass,musicBox);const musicDrum=group(0,.29,0,musicBox);const md=cyl(.11,.11,.25,0,0,0,brass,musicDrum);md.rotation.z=Math.PI/2;for(let i=0;i<12;i++)ball(.012,.012,.012,Math.sin(i*2)*.1,.04,Math.cos(i*2)*.1,ivory,musicDrum);cyl(.025,.025,.03,-.32,.08,0,black,musicBox);sign('317 · NOCTURNE',.48,.08,5.5,.87,10.835,Math.PI);
 // Wardrobe above a recessed safe; door really opens after the symbol puzzle.
 const wardrobe317=group(1.24,0,10.75);box(1.1,2.4,.72,0,1.2,0,darkwood,wardrobe317);for(const x of[-.3,.3])rb(.48,1.05,.05,x,1.82,-.39,wood,wardrobe317);solid(1.24,10.75,1.15,.82);shadow(1.24,10.75,1.5,1.2);
 const safe317=interactive(group(1.24,.66,10.32),'safe317','네 문양의 객실 금고');box(.86,.7,.16,0,0,.05,black,safe317);const safeDoor=group(-.43,0,-.06,safe317);rb(.86,.7,.08,.43,0,0,black,safeDoor);for(let i=0;i<4;i++)box(.09,.1,.025,.19+i*.16,.08,-.055,brass,safeDoor);rod([.62,-.15,-.09],[.75,-.15,-.09],.02,brass,safeDoor);
 const legacyGuestFurniture=scene.children.slice(guestFurnitureStart).filter(o=>o!==receipt317);
 // 317's normal hotel entrance opens to a short third-floor corridor.
 for(const x of[1.94,3.36])box(.12,2.75,.2,x,1.375,11.7,wood);box(1.54,.12,.2,2.65,2.77,11.7,wood);
 partitionDoor(2,11.7,1.3,0,'exitOpen','exit317','317호 안쪽 문',-1.53,'317 INNER');
 const hallLight=new T.PointLight('#dfd4b2',8,5,1.8);hallLight.position.set(2.65,2.7,13.4);scene.add(hallLight);
 shiftSince(nextRoomStart,nextRoomSolids,3,9);
 const details=buildRoomDetails({scene,renderer,manager,state,solids,canvasTexture,legacy:{guest:legacyGuestFurniture,suite:legacySuiteDetails,minibar:minibarCups}});
 const twin=buildTwinRoom({scene,renderer,manager,state,solids,canvasTexture,helpers:{box,rb,group,cyl,ball,sign},materials:{wood,darkwood,brass,ivory,floorMat}});

 partitionDoor(3.6,8.4,1.5,Math.PI/2,'kitchenOpen','kitchenDoor','주방 문',-1.53);
 partitionDoor(-3.6,6.3,1.4,-Math.PI/2,'twinOpen','twinDoor','트윈 침실 문',-1.53);
 partitionDoor(1.46,10.5,1.32,0,'doorOpen','suiteDoor','316호 출입문',1.53,'316 · SUITE',1);
 const teaBox=interactive(group(-2.92,1.01,9.50),'teaTin','꽃무늬 자물쇠가 달린 차 상자');box(.42,.018,.30,0,0,0,wood,teaBox);for(const x of[-.20,.20])box(.02,.18,.30,x,.09,0,wood,teaBox);for(const z of[-.14,.14])box(.42,.18,.02,0,.09,z,wood,teaBox);const teaLid=group(0,.18,.15,teaBox);rb(.44,.025,.32,0,0,-.15,darkwood,teaLid);box(.045,.055,.022,0,.10,-.162,brass,teaBox);const flowerPlate=sign('✿',.05,.05,0,0,0);teaBox.add(flowerPlate);flowerPlate.position.set(0,.10,-.175);flowerPlate.rotation.y=Math.PI;const shackle=mesh(new T.TorusGeometry(.018,.004,8,20),brass,teaBox);shackle.position.set(0,.139,-.165);const teaPaper=interactive(box(.30,.006,.20,0,.025,0,paper,teaBox),'teaNote','차 상자 안의 편지와 조각');
 interactive(sign('물방울 · 욕실',.35,.16,3.49,1.7,.6,-Math.PI/2),'bathDoor','욕실 문 · 물방울 표식');
 const jugBox=interactive(group(4.65,.98,5.21),'waterStation','주방 열쇠 보관함');box(.32,.018,.26,0,0,0,darkwood,jugBox);for(const x of[-.15,.15])box(.02,.12,.26,x,.06,0,wood,jugBox);for(const z of[-.12,.12])box(.32,.12,.02,0,.06,z,wood,jugBox);const jugLid=group(0,.12,-.13,jugBox);rb(.34,.025,.28,0,0,.13,wood,jugLid);const jugKey=interactive(group(0,.028,0,jugBox),'jugKey','보관함 안의 트윈 침실 열쇠');const keyRing=mesh(new T.TorusGeometry(.028,.006,8,24),brass,jugKey);keyRing.rotation.x=Math.PI/2;rod([0,0,.025],[0,0,.095],.006,brass,jugKey);box(.025,.008,.012,.01,0,.08,brass,jugKey);
 const searchProps=buildSearchProps({T,state,canvasTexture,helpers:{box,rb,rod,cyl,mesh,group,sign,interactive},materials:{wood,darkwood,brass,paper,ivory}});
 const puzzleProps=buildPuzzleProps({T,state,canvasTexture,helpers:{box,rb,rod,cyl,mesh,group,sign,interactive},materials:{wood,darkwood,brass}});
 for(const [i,label]of ['홍차','커피','설탕'].entries()){const f=sign(label,.078,.04,0,0,0);jugBox.add(f);f.position.set(-.1+i*.1,.065,.132);}
 const extension=buildHotelExtension({T,scene,state,roots,solids,helpers:{box,rb,rod,cyl,mesh,group,sign,interactive},materials:{wood,darkwood,brass,ivory,paper,floorMat,wallpaper},partitionDoor});
 solids.push(...extension.solids,{x:6.20,z:22.80,w:.48,d:.48},{x:9.6,z:22.4,w:.32,d:.32},{x:-3.28,z:8.88,w:.45,d:.32});
 const dustGeo=new T.BufferGeometry(),dustPos=new Float32Array(90*3);for(let i=0;i<90;i++)dustPos.set([(Math.random()-.5)*6,Math.random()*2.8,(Math.random()-.5)*8],i*3);dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({color:'#b6b6a5',size:.013,transparent:true,opacity:.26,depthWrite:false}));scene.add(dust);
 const frameHomePosition=frame.position.clone(),frameHomeRotation=frame.rotation.clone();let lastFrameTaken=false;
 function update(dt,time,player){
   const mix=(o,k,target,speed=4)=>o[k]+=(target-o[k])*Math.min(1,dt*speed);
   mix(mainLight,'intensity',state.lightOn?26:0);ceilingLamp.children[1].material.emissiveIntensity=state.lightOn?.45:0;
   mix(moon,'intensity',state.curtainsClosed?.08:1.6);mix(bounce,'intensity',state.curtainsClosed?.25:2.8);
   for(const {g,side}of curtains){mix(g.position,'x',side*(state.curtainsClosed?.8:1.7),3);mix(g.scale,'x',state.curtainsClosed?1.7:1,3);}
   for(const {g}of curtains)g.children[0].rotation.y=Math.sin(time*.6)*.008;
   for(const {hinge,side}of wardrobeDoors)mix(hinge.rotation,'y',state.wardrobeOpen?side*1.5:0,2.5);mix(suitcaseLid.rotation,'x',state.suitcaseOpen?1.7:0,3);mix(drawer.position,'x',state.drawerOpen?2.47:2.95,4);if(!domestic.bathLoaded)mix(bathCabinet.position,'x',state.linenCabinetOpen?-.64:0,4);bulb.visible=state.drawerOpen&&!state.bulbTaken;
   bedSearch.update(dt);
   frame.traverse(o=>{if(o.userData.filmBack)o.visible=!state.inventory.includes('filmB')&&!state.filmJoined;});
   if(state.frameTaken!==lastFrameTaken){if(state.frameTaken){frame.position.set(-3.43,.6,1.15);frame.rotation.set(.09,Math.PI/2-.1,-.04);}else{frame.position.copy(frameHomePosition);frame.rotation.copy(frameHomeRotation);}lastFrameTaken=state.frameTaken;}
   uvInk.material.opacity=0;
   mix(lampLight,'intensity',state.lampOn?(state.uvInstalled?11:17):0);lampLight.color.set(state.uvInstalled?'#9f75eb':'#ffc47c');shadeMat.emissive.set(state.uvInstalled?'#623d91':'#e6bc73');lightbulb.material.emissive.set(state.uvInstalled?'#9956ee':'#ffe1a0');
   for(let i=0;i<3;i++)rings[i].rotation.z=-state.rings[i]*Math.PI/4;
   for(const {fixture,light,base}of suiteLights){mix(light,'intensity',state.lightOn?base:0);fixture.children[1].material.emissiveIntensity=state.lightOn?.4:0;}
   mix(clockFlap.position,'z',state.clockSolved?.18:.02);clockKey.visible=false;
   receipt317.visible=!state.inventory.includes('receipt');tag317.visible=!state.inventory.includes('tag');
   mix(luggageLid.rotation,'x',state.luggageOpen?-1.6:0,3);mix(safeDoor.rotation,'y',state.safeOpen?-1.4:0,3);
   if(state.musicWound)musicDrum.rotation.y=time*.65;
   mix(teaLid.rotation,'x',state.teaTinOpen?1.8:0);teaPaper.visible=state.teaTinOpen;mix(jugLid.rotation,'x',state.stockSolved?-1.8:0);jugKey.visible=state.stockSolved&&!state.stockKeyTaken;jugBox.userData.interactId=jugKey.visible?'jugKey':'waterStation';jugBox.userData.label=jugKey.visible?'열린 보관함 · 트윈 침실 열쇠 꺼내기':'주방 열쇠 보관함';
   for(const d of innerDoors){
     d.move(state[d.field],dt,player);
     d.leaf.userData.label=d.label+(state[d.field]?' · 열림':' · 잠김');
   }
   searchProps.update(dt);puzzleProps.update(dt);extension.update(dt);domestic.update(dt,player);details.update(dt,time);twin.update(dt);for(const light of fixtureLights)light.intensity=state.lightOn?2.4:0;
   exterior.update(dt,time);dust.rotation.y=Math.sin(time*.04)*.025;
 }
 function clockHands(hour,minute){domestic.clockHands(hour,minute);if(domestic.clockLoaded)return;const ha=hour/12*Math.PI*2+minute/60*Math.PI/6,ma=minute/60*Math.PI*2;hr.position.set(Math.sin(ha)*.045,.3+Math.cos(ha)*.045,.111);hr.rotation.z=-ha;mn.position.set(Math.sin(ma)*.065,.3+Math.cos(ma)*.065,.12);mn.rotation.z=-ma;}
 clockHands(11,10);const clockMark=canvasTexture((a,w,h)=>{a.fillStyle='#c6ab75';a.beginPath();a.moveTo(w*.2,h*.8);a.lineTo(w*.8,h*.8);a.lineTo(w*.8,h*.2);a.closePath();a.fill();},128);const markMesh=mesh(new T.PlaneGeometry(.1,.1),new T.MeshStandardMaterial({map:clockMark,transparent:true,roughness:.8}),clock);markMesh.position.set(0,.29,-.102);markMesh.rotation.y=Math.PI;
 function canMove(x,z){return canWalk(state,x,z,solids);}
 return{scene,roots,solids,bedNote:bedSearch.note,ready,assetsFailed,update,canMove,clockHands,setPuzzleDials:details.setPuzzleDials,setCompanionDials:twin.setDials,frame,clock,mirror,lamp,drawer,lock,photo,canvasTexture,materials:{wood,darkwood,brass,paper,black,ivory},helpers:{group,box,rb,rod,cyl,ball,mesh,sign},uvInk};
}
