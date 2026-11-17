import * as T from './three.module.js';

// Positions are local to the Blender vanity. The stream starts at its aerator.
export const BASIN_OUTLET=[.055,1.188,0];
export const BASIN_IMPACT=[.055,.764,0];
export function buildBasinFlow({parent,lever,state}){
 const root=new T.Group();root.name='Basin running water';Object.assign(root.userData,{interactId:'basin',label:'세면대 · 수도 켜기 / 잠그기'});parent.add(root);
 const water=new T.MeshPhysicalMaterial({color:'#b6d2d1',metalness:.05,roughness:.16,transparent:true,opacity:.48,depthWrite:false});
 const stream=new T.Mesh(new T.CylinderGeometry(.008,.006,1,16,6,true),water);stream.name='Aerator water stream';root.add(stream);
 const light=new T.MeshBasicMaterial({color:'#e6f0e9',transparent:true,opacity:.40,depthWrite:false});
 const streaks=Array.from({length:4},(_,i)=>{const mesh=new T.Mesh(new T.CylinderGeometry(.001,.0015,.055,5),light);mesh.position.x=BASIN_OUTLET[0]+Math.cos(i*1.57)*.006;mesh.position.z=Math.sin(i*1.57)*.006;root.add(mesh);return mesh;});
 const rings=Array.from({length:3},()=>{const mesh=new T.Mesh(new T.RingGeometry(.025,.028,32),light.clone());mesh.rotation.x=-Math.PI/2;mesh.position.set(.055,.769,0);root.add(mesh);return mesh;});
 const drops=Array.from({length:7},()=>{const mesh=new T.Mesh(new T.SphereGeometry(.0025,6,4),light);root.add(mesh);return mesh;});
 const clothGeometry=new T.PlaneGeometry(.15,.12,10,8),pos=clothGeometry.attributes.position;
 for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*42)*.006+Math.cos(pos.getY(i)*28)*.004);
 clothGeometry.computeVertexNormals();
 const cloth=new T.Mesh(clothGeometry,new T.MeshStandardMaterial({color:'#93a99e',roughness:1,side:T.DoubleSide}));cloth.name='Cloth held under running water';Object.assign(cloth.userData,{interactId:'basin',label:'물줄기에 천 적시는 중'});cloth.rotation.x=-Math.PI/2;cloth.position.set(.055,1.005,0);parent.add(cloth);
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 let valve=0,flow=0,time=0;
 return {root,stream,cloth,update(dt){
  time+=dt;const opening=state.faucetOn?1:0,k=1-Math.exp(-dt*9);valve+=(opening-valve)*k;
  lever.rotation.z=-.55*valve;lever.rotation.y+=((state.faucetHot?-.6:0)-lever.rotation.y)*k;
  const target=state.faucetOn?Math.max(0,(valve-.25)/.75):0;flow+=(target-flow)*(1-Math.exp(-dt*12));root.visible=flow>.015;
  cloth.visible=state.basinWetting&&flow>.45;
  const bottom=cloth.visible?1.015:BASIN_IMPACT[1],length=(BASIN_OUTLET[1]-bottom)*Math.min(1,flow*2);
  stream.position.set(BASIN_OUTLET[0],BASIN_OUTLET[1]-length/2,0);stream.scale.set(Math.max(.1,flow),length,Math.max(.1,flow));
  streaks.forEach((mesh,i)=>{const phase=reduced?(i+.5)/4:(time*1.9+i/4)%1;mesh.position.y=BASIN_OUTLET[1]-.028-phase*Math.max(0,length-.056);mesh.visible=length>.06;});
  rings.forEach((mesh,i)=>{const phase=reduced?(i+.5)/3:(time*1.65+i/3)%1;mesh.scale.setScalar(.35+phase*1.8);mesh.material.opacity=(1-phase)*.3*flow;mesh.visible=!cloth.visible&&flow>.75;});
  drops.forEach((mesh,i)=>{const p=(time*2.5+i/7)%1,a=i*2.399;mesh.position.set(.055+Math.cos(a)*p*.045,bottom+.004+Math.sin(p*Math.PI)*.025,Math.sin(a)*p*.045);mesh.visible=!reduced&&flow>.75;});
  cloth.material.color.set(state.clothWet?'#6e8a7b':'#93a99e');
 }};
}
