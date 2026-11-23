import * as T from '../three.module.js';

export function makeLockers(slots,{group,box,sign,solid,mat}){
  const enamel=mat('#647d72',.51,.25),recess=mat('#283a34',.68,.22);
  const lining=mat('#34463c'),steel=mat('#acada1',.31,.66),tag=mat('#b4a689');
  const leaves=new Map();
  for(const [i,slot] of slots.entries()){
    const root=group(-7.24,0,slot.z,slot.id,'락커에 숨기');root.rotation.y=Math.PI/2;
    box(.70,1.98,.035,0,1.02,-.299,lining,root);
    for(const side of [-.35,.35])box(.025,1.98,.63,side,1.02,0,enamel,root);
    for(const y of [.078,1.995])box(.72,.046,.64,0,y,0,enamel,root);
    box(.69,.08,.50,0,.04,-.01,recess,root);
    const leaf=group(-.34,0,.308,null,null,root);leaves.set(slot.id,leaf);
    // Slots are openings in the steel door, at the eye height of a crouching player.
    const w=.68,xc=w/2;
    box(w,1.22,.027,xc,.712,0,enamel,leaf);
    box(w,.40,.027,xc,1.772,0,enamel,leaf);
    for(const x of [.060,w-.060])box(.12,.25,.027,x,1.447,0,enamel,leaf);
    for(let n=0;n<5;n++)box(.44,.021,.028,xc,1.336+n*.052,.002,enamel,leaf,-.28);
    for(const y of [.48,1.73])box(.021,.096,.029,.016,y,.017,steel,leaf);
    box(.093,.168,.014,w-.106,.99,.018,recess,leaf);
    box(.019,.101,.038,w-.104,1,.041,steel,leaf);
    box(.13,.069,.019,xc,1.82,.017,tag,leaf);
    sign(leaf,'서 '+String(i+1).padStart(2,'0'),.118,.057,xc,1.82,.029,0,'#bdb292','#273831');
    solid(-7.24,slot.z,.64,.72);
  }
  return leaves;
}

export function makeGuard({scene:model,animations},scene){
  const body=new T.Group();scene.add(body);body.add(model);
  model.traverse(o=>{
    if(o.isMesh){o.raycast=()=>{};o.receiveShadow=true;
      if(o.material?.name==='m006_body')o.material.color.set('#8298aa');}
  });
  const mixer=new T.AnimationMixer(model);
  const action=name=>mixer.clipAction(T.AnimationClip.findByName(animations,name)).play();
  const idle=action('Stand'),walk=action('Walk');walk.weight=0;mixer.update(0);body.updateMatrixWorld(true);
  const bone=name=>model.getObjectByName('Bip01_'+name);
  const head=bone('Head'),hand=bone('R_Hand'),eye=bone('REye').getWorldPosition(new T.Vector3());
  eye.lerp(bone('LEye').getWorldPosition(new T.Vector3()),.5);
  const cloth=new T.MeshStandardMaterial({color:'#293740',roughness:.93});
  const trim=new T.MeshStandardMaterial({color:'#b8a36f',metalness:.47,roughness:.42});
  const metal=new T.MeshStandardMaterial({color:'#3e4948',metalness:.66,roughness:.32});
  function mesh(parent,geometry,material,x,y,z){
    const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.raycast=()=>{};parent.add(o);return o;
  }
  const cap=new T.Group();cap.position.copy(eye);scene.add(cap);
  const crown=mesh(cap,new T.SphereGeometry(1,24,14),cloth,0,.075,-.046);crown.scale.set(.112,.072,.129);
  const brim=mesh(cap,new T.SphereGeometry(1,24,10),cloth,0,.045,.045);brim.scale.set(.109,.009,.100);
  const pin=mesh(cap,new T.OctahedronGeometry(.017),trim,0,.082,.078);pin.scale.set(.68,1,.3);
  head.attach(cap);
  const nameplate=new T.Group(),chest=bone('Spine2');
  chest.getWorldPosition(nameplate.position);nameplate.position.add(new T.Vector3(.082,.025,.133));scene.add(nameplate);
  mesh(nameplate,new T.BoxGeometry(.074,.024,.008),trim,0,0,0);
  for(const x of [-.02,-.006,.008,.023])mesh(nameplate,new T.BoxGeometry(.006,.008,.002),cloth,x,0,.005);
  chest.attach(nameplate);
  const keys=new T.Group(),hip=bone('Pelvis');hip.getWorldPosition(keys.position);
  keys.position.add(new T.Vector3(-.16,-.04,.057));scene.add(keys);
  mesh(keys,new T.TorusGeometry(.021,.003,6,16),trim,0,0,0);
  for(const [i,x] of [-.015,0,.016].entries()){
    const key=mesh(keys,new T.BoxGeometry(.007,.051,.004),trim,x,-.037,0);key.rotation.z=(i-1)*.21;
    mesh(keys,new T.BoxGeometry(.013,.007,.005),trim,x+.004,-.058,0);
  }
  hip.attach(keys);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
  const ink=shadowCanvas.getContext('2d'),shade=ink.createRadialGradient(32,32,3,32,32,32);
  shade.addColorStop(0,'#101710b3');shade.addColorStop(1,'#10171000');ink.fillStyle=shade;ink.fillRect(0,0,64,64);
  mesh(body,new T.PlaneGeometry(.78,.60),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),0,.012,0).rotation.x=-Math.PI/2;
  const torch=new T.Group(),barrel=new T.CylinderGeometry(.028,.022,.163,16);
  mesh(torch,barrel,metal,0,0,0).rotation.x=Math.PI/2;
  mesh(torch,new T.CylinderGeometry(.042,.028,.050,18),metal,0,0,.095).rotation.x=Math.PI/2;
  mesh(torch,new T.CircleGeometry(.035,20),new T.MeshBasicMaterial({color:'#ffe7a3'}),0,0,.122);
  const haze=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    uniforms:{tint:{value:new T.Color('#d7c490')}},vertexShader:'varying vec2 tex;void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 tex;uniform vec3 tint;void main(){float fade=tex.y*tex.y;gl_FragColor=vec4(tint,.058*fade);}'});
  const beam=mesh(torch,new T.ConeGeometry(.48,3.2,32,1,true),haze,0,0,1.72);beam.rotation.x=-Math.PI/2;
  scene.add(torch);
  const light=new T.SpotLight('#ffdf9f',0,8,.36,.68,1.55);scene.add(light,light.target);
  const aim=new T.Vector3(),up=new T.Vector3(0,0,1);
  return function update(dt,time,g){
    body.visible=torch.visible=g.mode!=='off';light.intensity=body.visible?11:0;
    if(!body.visible)return;
    const gait=Math.min(1,g.speed/.95);idle.weight=1-gait;walk.weight=gait;
    mixer.update(dt*(g.speed>1.5?1.75:1));body.position.set(g.x,0,g.z);body.rotation.y=g.yaw;
    body.updateMatrixWorld(true);hand.getWorldPosition(torch.position);
    const sweep=.09*Math.sin(time*2),angle=g.yaw+sweep;
    aim.set(Math.sin(angle),-.14+.045*Math.sin(time*2.7),Math.cos(angle)).normalize();
    torch.quaternion.setFromUnitVectors(up,aim);
    light.position.copy(torch.position).addScaledVector(aim,.125);
    const edge=aim.x>0?(-4.62-g.x)/aim.x:(-7.58-g.x)/aim.x;
    const end=aim.z>0?(7.56-g.z)/aim.z:(-26.97-g.z)/aim.z;
    const length=Math.max(.2,Math.min(3.2,edge,end)-.12);
    beam.scale.set(length/3.2,length/3.2,length/3.2);beam.position.z=.12+length/2;
    light.distance=Math.min(8,Math.max(.5,Math.min(edge,end)+.3));
    light.target.position.copy(light.position).add(aim);
  };
}
