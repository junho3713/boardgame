import * as T from './three.module.js';
import {Reflector} from './Reflector.js';
import {getModelNode,registerRoomMirror} from './room-details.js?v=20261117-tricks1';
import {ZONES,PASSAGES} from './room-layout.js?v=20261117-stairs1';

// These rooms use the hotel's existing Blender fixtures, sharing geometry and textures.
export function buildGuestSuite({scene,state,solids,partitionDoor,canvasTexture,h,m}){
 const {box,rb,cyl,rod,mesh,group,sign,interactive}=h;
 const enamel=new T.MeshStandardMaterial({color:'#ded9ca',roughness:.34});
 const silver=new T.MeshStandardMaterial({color:'#a9b1ac',metalness:.83,roughness:.28});
 const tileMap=canvasTexture((c,w,h)=>{
  c.fillStyle='#9ba89b';c.fillRect(0,0,w,h);
  c.fillStyle='#acb8ac';c.fillRect(3,3,w-6,h-6);
  c.fillStyle='#b3beb2';c.fillRect(4,4,w-8,2);
 },128);
 tileMap.wrapS=tileMap.wrapT=T.RepeatWrapping;
 const tile=new T.MeshStandardMaterial({map:tileMap,roughness:.45});
 function tiled(w,h,d,x,y,z){
  const b=box(w,h,d,x,y,z,tile),g=b.geometry,uv=g.attributes.uv,n=g.attributes.normal,p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const side=Math.abs(n.getX(i))>.5,flat=Math.abs(n.getY(i))>.5;
   uv.setXY(i,(side?p.getZ(i)+z:p.getX(i)+x)/.50,(flat?p.getZ(i)+z:p.getY(i)+y)/(flat?.5:.25));
  }
 }
 for(const [zone,entry,label] of [['kitchen317','galleyDoor317','주방'],['bath317','bathDoor317','욕실']]){
  const b=ZONES[zone],p=PASSAGES.find(v=>v.gate===b.gate),w=b.x1-b.x0,d=b.z1-b.z0;
  const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,bath=zone==='bath317',side=bath?1:-1;
  const wall=(w,h,d,x,y,z)=>bath?tiled(w,h,d,x,y,z):box(w,h,d,x,y,z,m.wallpaper);
  if(bath)tiled(w,.15,d,x,-.075,z);else box(w,.15,d,x,-.075,z,m.floorMat);
  box(w,.12,d,x,3.24,z,m.ivory);
  for(const end of [b.z0,b.z1])wall(w,3.2,.13,x,1.6,end);
  wall(.13,3.2,d,bath?b.x1:b.x0,1.6,z);
  // The common wall and its trim leave the same clear opening as the walk mesh.
  for(const [a,c] of [[13.5,p.low],[p.high,20.7]]){
   const mid=(a+c)/2,len=c-a;
   box(.12,3.2,len,p.at,1.6,mid,m.wallpaper);
   box(.075,.78,len,p.at-side*.08,.39,mid,m.darkwood);
   box(.085,.045,len,p.at-side*.08,.81,mid,m.brass);
   if(bath && a<b.z1)tiled(.018,3.15,Math.min(c,b.z1)-a,p.at+.07,1.575,(a+Math.min(c,b.z1))/2);
  }
  box(.14,.51,p.high-p.low,p.at,2.95,(p.low+p.high)/2,m.wallpaper);
  partitionDoor(p.at,p.low,p.high-p.low,-Math.PI/2,b.gate,entry,'317호 '+label+' 문',side*1.52,label,bath?1:-1);
  sign(label,.52,.16,p.at-side*.11,2.90,(p.low+p.high)/2,-side*Math.PI/2);
  const diffuse=new T.MeshStandardMaterial({color:'#f4e8d2',emissive:'#f1debe',emissiveIntensity:.48});
  cyl(.23,.26,.06,x,3.12,z,m.brass);cyl(.22,.22,.055,x,3.074,z,diffuse);
  const light=new T.PointLight(bath?'#e2efe7':'#fff0cb',23,7,1.7);
  light.position.set(x,2.72,z);scene.add(light);
 }
 // A tiled work wall, wall cupboards and an extractor sit above the fitted hob.
 tiled(3.90,1.41,.029,1.15,1.63,13.586);
 for(const [cx,width] of [[.16,1.76],[2.84,.49]]){
  rb(width,.66,.34,cx,2.18,13.81,m.darkwood);
  const doors=width>1?2:1;
  for(let i=0;i<doors;i++){
   const each=width/doors,middle=cx-width/2+each*(i+.5);
   rb(each-.025,.61,.028,middle,2.18,13.991,m.wood);
   rod([middle-.095,1.962,14.02],[middle+.095,1.962,14.02],.009,m.brass);
  }
  box(width-.08,.014,.022,cx,1.843,13.97,enamel);
 }
 rb(.90,.095,.50,2.03,1.83,13.85,silver);
 rb(.42,.47,.28,2.03,2.11,13.75,silver);
 for(const dx of [-.23,0,.23])box(.18,.008,.27,2.03+dx,1.778,13.85,m.darkwood);
 // Two spoons, napkins and recessed porcelain plates distinguish the place settings.
 // Two place settings and a covered breakfast tray on a freestanding dining table.
 const table=group(.85,0,16.93);
 rb(1.80,.065,.88,0,.775,0,m.wood,table);
 for(const x of [-.75,.75])for(const z of [-.32,.32])rb(.056,.76,.056,x,.38,z,m.darkwood,table);
 solids.push({x:.85,z:16.93,w:1.8,d:.88},{x:1.15,z:14.02,w:3.83,d:.82});
 for(const side of [-1,1]){
  const chair=group(.85,0,16.93+side*.82);if(side<0)chair.rotation.y=Math.PI;
  rb(.43,.075,.41,0,.46,0,m.wood,chair);
  rb(.41,.055,.39,0,.513,0,m.fabric,chair);
  for(const x of [-.17,.17])for(const z of [-.15,.15])rb(.034,z>0?.90:.43,.035,x,z>0?.45:.215,z,m.darkwood,chair);
  rb(.41,.19,.043,0,.81,.16,m.wood,chair);solids.push({x:.85,z:chair.position.z,w:.44,d:.44});
 }
 function lathe(profile,material,parent){
  return mesh(new T.LatheGeometry([...profile].reverse().map(([r,y])=>new T.Vector2(r,y)),56),material,parent);
 }
 const tray=group(.90,.815,16.93);
 rb(.84,.03,.51,0,0,0,silver,tray);
 const dome=interactive(group(.87,.834,16.93),'breakfast317','룸서비스 쟁반 · 은색 덮개');
 lathe([[.0,.17],[.039,.168],[.098,.15],[.157,.113],[.19,.058],[.20,.011],[.204,.006],[.201,0],[.194,.001],[.184,.061],[.151,.109],[.095,.144],[0,.16]],silver,dome);
 cyl(.014,.021,.024,0,.181,0,m.brass,dome);cyl(.032,.026,.016,0,.2,0,m.brass,dome);
 for(const x of [-.61,.62]){
  const plate=group(x,.81,0,table);
  rb(.135,.012,.19,x,.815,.25,m.linen,table);
  const spoon=group(x,.826,.25,table);rod([0,0,-.072],[0,0,.03],.005,silver,spoon);
  const bowl=mesh(new T.SphereGeometry(1,16,10),silver,spoon);bowl.scale.set(.018,.004,.026);bowl.position.z=.043;
  lathe([[0,.008],[.075,.008],[.123,.022],[.128,.021],[.125,.014],[.07,.001],[0,.001]],enamel,plate);
 }
 const bathKey=interactive(group(.85,.841,16.93),'breakfastKey317','냅킨 고리에 묶인 욕실 열쇠');
 rb(.17,.016,.081,.034,.006,0,m.linen,bathKey);
 function keyMesh(parent){
  const ring=mesh(new T.TorusGeometry(.022,.004,8,24),m.brass,parent);ring.rotation.x=Math.PI/2;
  rod([0,0,.018],[0,0,.09],.005,m.brass,parent);box(.019,.008,.012,.006,0,.078,m.brass,parent);
 }
 const napkinRing=cyl(.029,.029,.038,.024,.023,0,m.brass,bathKey);napkinRing.rotation.z=Math.PI/2;
 const tied=group(-.046,.019,.018,bathKey);keyMesh(tied);
 // The guest's breakfast order is tucked into an envelope on the lounge writing table.
 const envelope=interactive(group(4.25,.812,16.88),'envelope317','동행인이 남긴 조식 봉투');
 rb(.32,.009,.21,0,0,0,m.paper,envelope);const slip=sign('317  /  조식 주문',.27,.15,0,0,0,0,'#433729','#d6c59f');envelope.add(slip);slip.rotation.x=-Math.PI/2;slip.position.y=.007;
 const smallKey=group(.045,.016,-.045,envelope);keyMesh(smallKey);
 // Inventory keys are separate from the room's 316 fixtures and their colliders.
 let vanityLeft,vanityRight;
 const cabinetColliders=[{},{}],mirror=new Reflector(new T.PlaneGeometry(1.80,1.10),{color:0xd5ddd6,textureWidth:512,textureHeight:512,clipBias:.003});
 mirror.position.set(14.679,1.83,17.8);mirror.rotation.y=-Math.PI/2;scene.add(mirror);registerRoomMirror(scene,mirror);
 function installBath(source){
  const copy=source.clone(true);copy.name='317 욕실 설비';copy.position.set(6.6,0,18);
  getModelNode(copy,'Bath_Entry_Pivot').removeFromParent();
  scene.add(copy);
  vanityLeft=getModelNode(copy,'Vanity_Door_Left_Pivot');vanityRight=getModelNode(copy,'Vanity_Door_Right_Pivot');
  for(const door of [vanityLeft,vanityRight])interactive(door,'vanity317','세면대 아래 수납장');
  // The open shower leaf rests against the fixed glass return.
  getModelNode(copy,'Shower_Door_Pivot').rotation.y=-1.46;
  solids.push({x:14.37,z:17.8,w:.74,d:1.92},{x:11.95,z:18.87,w:.49,d:.87},
   {x:11.03,z:15.65,w:1.08,d:.05},{x:13.68,z:15.65,w:1.96,d:.05},
   {x:12.60,z:15.16,w:.99,d:.045,yaw:-1.46},...cabinetColliders);
 }
 function installKitchen(source){
  const unit=getModelNode(source,'Kitchen_ROOT').clone(true);unit.position.set(1.15,0,14.02);scene.add(unit);
 }
 function installLounge(source){
  const sofa=getModelNode(source,'Sofa_ROOT').clone(true);sofa.position.set(8.94,0,14.24);sofa.rotation.y=Math.PI;scene.add(sofa);
  const coffee=getModelNode(source,'CoffeeTable_ROOT').clone(true);coffee.position.set(8.92,0,15.68);scene.add(coffee);
  solids.push({x:8.94,z:14.24,w:2.48,d:1.02},{x:8.92,z:15.68,w:1.75,d:.85});
 }
 function update(dt){
  const k=1-Math.exp(-5*dt),t=state.breakfast317Open?1:0;
  dome.position.x+=(.87+.42*t-dome.position.x)*k;
  const travel=(dome.position.x-.87)/.42;
  dome.position.y=.834+Math.sin(Math.PI*Math.min(1,Math.max(0,travel)))*.22;
  bathKey.visible=state.breakfast317Open&&travel>.6&&!state.bathKey317Taken;
  smallKey.visible=!state.galleyKey317Taken;
  if(!vanityLeft)return;
  [vanityLeft,vanityRight].forEach((door,i)=>{
   const side=i?-1:1;
   door.rotation.y+=((state.vanity317Open?-side*1.42:0)-door.rotation.y)*k;
   const angle=door.rotation.y,hinge=14.046,z=i?18.70:16.9;
   Object.assign(cabinetColliders[i],{x:hinge+side*.45*Math.sin(angle),z:z+side*.45*Math.cos(angle),w:.035,d:.895,yaw:angle});
  });
 }
 return{installBath,installKitchen,installLounge,update};
}
