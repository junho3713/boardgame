import * as T from '../three.module.js';
import {Reflector} from '../Reflector.js';
import {basinSurface} from '../basin-water.js';
import {waterSurface,fallingJet} from '../basin-flow.js';
import {hitsBlock,keyExposed,ROOMS} from './school-state.js';

const room=ROOMS.washroom, W=room.x1-room.x0, D=room.z1-room.z0;
const washX=x=>room.x0+x, washZ=z=>room.z0+z;

function tiles(texture,rand,width,height,tone,octagon=false){
  const map=texture(512,512,(a,w,h)=>{
    a.fillStyle=octagon?'#494e4b':'#757368';a.fillRect(0,0,w,h);
    for(let j=0;j<8;j++)for(let i=0;i<8;i++){
      const x=64*i+2,y=64*j+2,shade=rand()*9-4.5;
      a.fillStyle='rgb('+tone.map(c=>Math.round(c+shade)).join(',')+')';
      if(octagon){
        const cut=11;a.beginPath();a.moveTo(x+cut,y);a.lineTo(x+60-cut,y);a.lineTo(x+60,y+cut);
        a.lineTo(x+60,y+60-cut);a.lineTo(x+60-cut,y+60);a.lineTo(x+cut,y+60);a.lineTo(x,y+60-cut);a.lineTo(x,y+cut);a.closePath();a.fill();
      }else{
        a.fillRect(x,y,61,61);a.fillStyle='#ffffda41';a.fillRect(x+1,y,59,1);a.fillRect(x,y,1,58);
        a.fillStyle='#25302638';a.fillRect(x+1,y+60,60,1);
      }
      for(let n=0;n<14;n++){a.fillStyle=n%2?'#ffffff0c':'#28252013';a.fillRect(x+3+rand()*52,y+3+rand()*52,rand()*4+1,1);}
      if(rand()<.12){a.strokeStyle='#5d5e4c55';a.lineWidth=1;a.beginPath();a.moveTo(x+1,y+8);a.lineTo(x+7,y+16);a.lineTo(x+5,y+25);a.lineTo(x+12,y+34);a.stroke();}
    }
  });
  map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(width,height);
  return new T.MeshStandardMaterial({map,roughness:octagon?.43:.34,metalness:.035});
}

export function buildWashroom(model,s,api){
  const {scene,blocks,solid,box,sign,panel,group,lit,texture,mat,rand}=api;
  const root=group(room.x0,0,room.z0);root.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const node=name=>{const o=model.getObjectByName(name);if(!o)throw Error('Missing washroom fitting '+name);return o;};
  const metal=mat('#8b9691',.32,.48),dark=mat('#384842'),enamel=mat('#cfceba',.38),glassEdge=mat('#263936',.29,.25);
  const wallBase=mat('#aaa99a'),sage=tiles(texture,rand,1,1,[126,153,139]),cream=tiles(texture,rand,1,1,[206,203,176]);
  const floorMat=tiles(texture,rand,W/1.12,D/1.12,[147,152,138],true);
  const layer=(width,height,x,y,z,angle,material)=>{
    const o=new T.Mesh(new T.PlaneGeometry(width,height),material);o.position.set(x,y,z);o.rotation.y=angle;root.add(o);return o;
  };
  const floor=new T.Mesh(new T.PlaneGeometry(W,D),floorMat);floor.rotation.x=-Math.PI/2;floor.position.set(W/2,.005,D/2);floor.receiveShadow=true;root.add(floor);
  box(W,.12,D,W/2,3.45,D/2,wallBase,root);
  function wallStrip(x,z,length,angle){
    const localWall=group(x,0,z,null,null,root);localWall.rotation.y=angle;
    box(length,3.40,.052,0,1.70,-.025,wallBase,localWall);
    for(const [bottom,top,base] of [[.045,1.16,sage],[1.22,2.38,cream]]){
      const material=base.clone();material.map=base.map.clone();material.map.repeat.set(length/1.23,(top-bottom)/1.23);
      material.bumpMap=material.map;material.bumpScale=.009;
      const strip=new T.Mesh(new T.PlaneGeometry(length,top-bottom),material);strip.position.set(0,(top+bottom)/2,.009);strip.receiveShadow=true;localWall.add(strip);
    }
    box(length,.065,.024,0,1.19,.012,dark,localWall);box(length,.055,.025,0,.032,.01,glassEdge,localWall);
    box(length,.02,.02,0,2.39,.01,enamel,localWall);
  }
  wallStrip(W/2,.015,W,0);wallStrip(W/2,D-.015,W,Math.PI);
  wallStrip(.015,D/2,D,Math.PI/2);
  const left=4.72-room.z0,right=6.25-room.z0;
  wallStrip(W-.066,left/2,left,-Math.PI/2);
  wallStrip(W-.066,(D+right)/2,D-right,-Math.PI/2);
  box(.025,.9,right-left,W-.061,2.97,(left+right)/2,wallBase,root);

  // The service mirror renders the stall doors and the moving player viewpoint in real time.
  box(.064,.99,2.63,.064,1.72,4.41,glassEdge,root);
  const mirror=new Reflector(new T.PlaneGeometry(2.56,.93),{color:0x9aada5,textureWidth:512,textureHeight:256,clipBias:.005});
  mirror.rotation.y=Math.PI/2;mirror.position.set(.101,1.72,4.41);root.add(mirror);
  const patina=texture(768,256,(a,w,h)=>{
    for(let i=0;i<1800;i++){const x=rand()*w,edge=rand()**3*15,y=rand()<.5?edge:h-edge;a.fillStyle=i%3?'#584e3670':'#cfccaa80';a.fillRect(x,y,1+rand()*4,1+rand()*2);}
    for(let i=0;i<42;i++){const x=rand()*w,length=4+rand()*46;a.fillStyle='#d4dcc124';a.fillRect(x,h-length,1,length);}
  });
  const wear=layer(2.56,.93,.104,1.72,4.41,Math.PI/2,new T.MeshBasicMaterial({map:patina,transparent:true,depthWrite:false}));wear.raycast=()=>{};
  for(const z of [3.15,4.41,5.67])box(.029,.98,.018,.114,1.72,z,metal,root);
  box(.16,.031,2.64,.15,1.216,4.41,metal,root);
  const warm=new T.MeshBasicMaterial({color:0xffe4b2});
  box(.15,.096,1.00,.10,2.28,4.41,dark,root);box(.17,.052,.88,.126,2.255,4.41,warm,root);
  lit(washX(.48),2.24,washZ(4.42),'#ffdb9e',3.1,4.8);
  box(.28,.095,1.56,3.46,3.27,3.00,metal,root);
  for(const x of [3.39,3.53])box(.034,.038,1.40,x,3.205,3.00,new T.MeshBasicMaterial({color:'#d8ede2'}),root);
  const overhead=new T.SpotLight('#c5dfd1',16,9,1.20,.75,1.65);
  overhead.position.set(washX(3.46),3.16,washZ(3.00));
  overhead.target.position.set(washX(2.50),0,washZ(2.6));scene.add(overhead,overhead.target);
  overhead.castShadow=true;overhead.shadow.mapSize.set(512,512);overhead.shadow.bias=-.00045;overhead.shadow.normalBias=.018;

  const windowTex=texture(640,220,(a,w,h)=>{
    const sky=a.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#293b51');sky.addColorStop(.63,'#69818b');sky.addColorStop(1,'#465e60');a.fillStyle=sky;a.fillRect(0,0,w,h);
    for(let i=0;i<16;i++){const x=rand()*w,top=h*(.57+rand()*.32);a.fillStyle='#33464a88';a.fillRect(x,top,22+rand()*45,h-top);}
    for(let x=0;x<w;x+=5){a.fillStyle=x%10?'#b0ced62b':'#10232c59';a.fillRect(x,0,2,h);}
    for(let i=0;i<115;i++){a.fillStyle='#c4d9d855';a.fillRect(rand()*w,rand()*h,1,rand()*24+2);}
  });
  box(2.94,.89,.088,3.13,2.46,D-.066,metal,root);
  layer(2.84,.80,3.13,2.46,D-.117,Math.PI,new T.MeshBasicMaterial({map:windowTex}));
  for(const x of [2.62,3.63])box(.046,.84,.045,x,2.46,D-.131,metal,root);
  box(2.98,.059,.19,3.13,2.00,D-.108,metal,root);
  lit(washX(3.16),2.37,washZ(6.42),'#99bfda',4.2,4.8);

  const sheet=group(4.83,1.65,.063,'washLog','청소 당번 일지',root);
  box(.55,.77,.031,0,0,.017,dark,sheet);
  panel(sheet,.49,.69,0,0,.039,0,(a,w,h)=>{
    a.fillStyle='#c4bd9f';a.fillRect(0,0,w,h);a.fillStyle='#404a40';a.textAlign='center';a.font='bold 44px serif';a.fillText('청소 당번 일지',w/2,89);
    a.font='20px sans-serif';a.fillText('서령고등학교  ·  서관 시설계',w/2,128);
    a.strokeStyle='#747965';for(let i=0;i<11;i++){a.beginPath();a.moveTo(31,170+i*40);a.lineTo(w-31,170+i*40);a.stroke();}
    for(const x of [31,142,349,w-31]){a.beginPath();a.moveTo(x,170);a.lineTo(x,570);a.stroke();}
    a.fillStyle='#535f58';a.font='20px serif';a.fillText('11 / 06',86,240);a.fillText('급수 점검',248,240);a.fillText('11 / 07',86,280);a.fillText('인계',247,280);
    a.strokeStyle='#933c32';a.lineWidth=4;a.beginPath();a.arc(401,244,23,0,7);a.stroke();a.fillStyle='#933c32';a.fillText('완',401,251);
  });
  box(.181,.045,.035,0,.344,.060,metal,sheet);
  const poster=group(.045,1.72,6.12,null,null,root);poster.rotation.y=Math.PI/2;
  box(.53,.74,.018,0,0,0,dark,poster);
  panel(poster,.505,.716,0,0,.014,0,(a,w,h)=>{
    a.fillStyle='#d1c6a4';a.fillRect(0,0,w,h);a.fillStyle='#344e46';a.fillRect(16,16,w-32,90);
    a.fillStyle='#e2d8bb';a.textAlign='center';a.font='bold 47px serif';a.fillText('물 을  아 낍 시 다',w/2,79,w-62);
    a.strokeStyle='#497064';a.lineWidth=16;a.beginPath();a.moveTo(70,244);a.lineTo(254,244);a.quadraticCurveTo(320,244,320,311);a.lineTo(362,311);a.quadraticCurveTo(366,199,269,199);a.lineTo(66,199);a.stroke();
    a.fillStyle='#52796e';a.beginPath();a.moveTo(338,339);a.bezierCurveTo(327,369,300,392,312,414);a.bezierCurveTo(344,461,391,415,365,383);a.closePath();a.fill();
    a.fillStyle='#8a4a38';a.font='bold 31px serif';a.fillText('한 방울도 소중하게',w/2,h*.78);a.font='20px serif';a.fillStyle='#4e5446';a.fillText('1997   서령고등학교 환경부',w/2,h*.90);
  });
  const deposits=texture(512,384,(a,w,h)=>{
    for(let i=0;i<84;i++){
      const x=w*.28+rand()*w*.44,len=h*(.12+.76*rand()),y=rand()*h*.13;
      const g=a.createLinearGradient(0,y,0,y+len);g.addColorStop(0,'#494b3650');g.addColorStop(.5,'#63513723');g.addColorStop(1,'#63513700');
      a.fillStyle=g;a.fillRect(x,y,1+rand()*3,len);
    }
  });
  const staining=new T.MeshBasicMaterial({map:deposits,transparent:true,depthWrite:false});
  for(const z of [3.68,5.12]){const drip=layer(.90,.85,.034,.48,z,Math.PI/2,staining);drip.raycast=()=>{};}
  const floorDrain=group(2.06,.018,3.72,null,null,root);
  box(.218,.012,.218,0,0,0,metal,floorDrain);
  for(let i=0;i<7;i++)box(.15,.004,.009,0,.008,(i-3)*.023,dark,floorDrain);
  const dirty=texture(256,256,(a,w,h)=>{
    const g=a.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);g.addColorStop(0,'#293d4080');g.addColorStop(.6,'#384b4828');g.addColorStop(1,'#384b4800');a.fillStyle=g;a.fillRect(0,0,w,h);
  });
  const shadowMat=new T.MeshBasicMaterial({map:dirty,transparent:true,depthWrite:false});
  for(const [x,z,w,d] of [[.4,3.68,1.42,1.07],[.4,5.12,1.34,1.16],[1.12,.83,1.28,1.53],[2.82,.83,1.28,1.53],[2.06,3.72,1.44,1.30]]){
    const stain=new T.Mesh(new T.PlaneGeometry(w,d),shadowMat);stain.rotation.x=-Math.PI/2;stain.position.set(x,.013,z);root.add(stain);stain.raycast=()=>{};
  }
  const register=(name,id,label)=>{const o=node(name);o.userData.id=id;o.userData.label=label;return o;};
  const invisible=new T.MeshBasicMaterial({visible:false});
  function target(o,w,h,d,offset=[0,0,0]){
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),invisible);mesh.position.set(...offset);o.add(mesh);
  }
  const water=new T.MeshPhysicalMaterial({color:'#829f9c',transparent:true,opacity:.69,roughness:.14,metalness:.22,clearcoat:1,side:T.DoubleSide,depthWrite:false});
  const glint=new T.MeshBasicMaterial({color:'#cee2dd',transparent:true,opacity:.58,depthWrite:false});
  function liquid(geometry,material){
    const o=new T.Mesh(geometry,material);root.add(o);o.raycast=()=>{};return o;
  }
  function disc(x,y,z,mat){
    const o=liquid(new T.CircleGeometry(1,40),mat);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);return o;
  }
  const basins=[3.68,5.12].map((z,i)=>{
    const n=i+1,tap=register('Tap'+n,'tap'+n,'십자 수도꼭지'),plug=register('Stopper'+n,'plug'+n,'고무 물마개');
    target(tap,.126,.078,.126);target(plug,.074,.052,.074);
    const bath=group(0,0,z,null,null,root);
    const surface=waterSurface(bath,.44,.42),jet=fallingJet(bath,[.42,1.107,0]);
    const beads=new T.InstancedMesh(new T.SphereGeometry(.005,5,3),glint,8);root.add(beads);beads.raycast=()=>{};
    const plugOrigin=plug.position.clone();
    solid(washX(.38),washZ(z),.73,.73);
    return {z,tap,plug,plugOrigin,surface,jet,beads,flow:0};
  });
  const stalls=[1.12,2.82].map((x,i)=>{
    const o=register('Stall'+(i+1),'stall'+(i+1),(i?'둘째':'첫째')+' 칸 문');
    sign(o,i?'02':'01',.115,.096,.68,1.68,.032,0,'#3e5d52','#ded7ad');
    const flush=register('Flush'+(i+1),'flush'+(i+1),'물내림 손잡이');target(flush,.15,.085,.07,[.035,0,.008]);
    const collision={w:1.37,d:.061,x:0,z:0,angle:0};blocks.push(collision);
    solid(washX(x-.806),washZ(1.12),.05,2.08);solid(washX(x),washZ(.77),.41,.56);solid(washX(x),washZ(.305),.54,.34);
    for(const edge of [-.79,.79])solid(washX(x+edge),washZ(2.15),.13,.08);
    const bowl=disc(x,.327,.79,water);
    return {o,flush,collision,x,bowl};
  });
  solid(washX(3.63),washZ(1.13),.05,2.07);solid(washX(1.02),washZ(6.30),.75,.65);
  const supply=register('Supply','supply','둘째 칸 급수 밸브');target(supply,.18,.18,.055);
  const lid=register('CisternLid','lid','물탱크 도기 뚜껑'),seat=lid.position.clone();
  const key=register('LostKey','lostKey','붉은 꼬리표 열쇠 집기');target(key,.15,.035,.080);
  const tank=liquid(new T.PlaneGeometry(.447,.273),water);tank.rotation.x=-Math.PI/2;tank.position.set(2.82,.96,.303);
  const floatArm=node('FloatArm');
  const temp=new T.Object3D();
  return function update(dt,time,camera){
    const k=1-Math.exp(-6*dt),approach=(v,goal)=>v+(goal-v)*k;
    mirror.visible=camera.position.x<room.x1+.3&&camera.position.z>room.z0-.3;
    overhead.castShadow=mirror.visible;
    for(const [i,b] of basins.entries()){
      const state=s.basins[i],profile=basinSurface(state.basinVolume),y=profile.height+.003;
      b.flow=approach(b.flow,Number(state.faucetOn));
      b.surface.update(profile,state.basinVolume,b.flow,Number(!state.drainClosed),time);
      b.tap.rotation.y=approach(b.tap.rotation.y,state.faucetOn?1.28:0);
      b.plug.position.set(b.plugOrigin.x,b.plugOrigin.y+(state.drainClosed?0:.064),b.plugOrigin.z+(state.drainClosed?0:.209));
      const bottom=Math.max(.74,y);
      b.jet.update(1.107,bottom,b.flow,time);b.beads.visible=b.flow>.18;
      if(!b.beads.visible)continue;
      for(let j=0;j<8;j++){
        const u=(time*2.4+j/8)%1,a=j*2.399;
        temp.position.set(.42+.038*u*Math.cos(a),bottom+.065*Math.sin(Math.PI*u),b.z+.038*u*Math.sin(a));temp.updateMatrix();b.beads.setMatrixAt(j,temp.matrix);
      }
      b.beads.instanceMatrix.needsUpdate=true;
    }
    for(const [i,st] of stalls.entries()){
      const openAngle=i===0?1.47:-1.48;
      const angle=approach(st.o.rotation.y,s['stall'+(i+1)]?openAngle:0);
      function blockAt(a){return {x:washX(st.x-.70+.686*Math.cos(a)),z:washZ(2.15-.686*Math.sin(a)),w:1.37,d:.061,angle:a};}
      const next=blockAt(angle);
      if(!hitsBlock(camera.position.x,camera.position.z,next)){st.o.rotation.y=angle;}
      Object.assign(st.collision,blockAt(st.o.rotation.y));
      st.flush.rotation.z=approach(st.flush.rotation.z,s.flushing[i]?-.42:0);
      st.bowl.scale.set(.099,.135,1);st.bowl.position.y=.332+(s.flushing[i]?Math.sin(time*13)*.009:0);
    }
    supply.rotation.z=approach(supply.rotation.z,s.supply?0:2.8);
    lid.position.x=approach(lid.position.x,seat.x+(s.lid?-.56:0));
    lid.position.y=seat.y+.05*Math.sin(Math.min(1,Math.abs(lid.position.x-seat.x)/.56)*Math.PI);
    tank.position.y=.735+.245*s.tanks[1];tank.visible=s.tanks[1]>.015;
    floatArm.rotation.z=-1.07*(1-s.tanks[1]);
    key.visible=keyExposed(s)&&lid.position.x<seat.x-.30;
  };
}
