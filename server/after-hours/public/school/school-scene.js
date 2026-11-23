import * as T from '../three.module.js';
import {Reflector} from '../Reflector.js';
import {GLASS,PORTALS} from './school-state.js';
import {buildWashroom} from './washroom.js';

export function buildSchool(renderer,s,washModel){
  const scene=new T.Scene();scene.background=new T.Color('#14222b');scene.fog=new T.FogExp2('#172629',.033);
  const blocks=[],groups=new Map(),solid=(x,z,w,d)=>blocks.push({x,z,w,d});
  const cube=new T.BoxGeometry(1,1,1),tube=new T.CylinderGeometry(.5,.5,1,12),scratch=new T.Object3D();
  const mat=(color,roughness=.82,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  let seed=4421;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  function texture(w,h,draw){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
  }
  const plaster=texture(384,384,(a,w,h)=>{a.fillStyle='#d4d2bf';a.fillRect(0,0,w,h);for(let i=0;i<12500;i++){a.fillStyle=i%3?'#524b3910':'#fbf2d52a';a.fillRect(rand()*w,rand()*h,1+rand()*3,1+rand()*4);}});
  const grain=texture(384,256,(a,w,h)=>{a.fillStyle='#977143';a.fillRect(0,0,w,h);for(let i=0;i<900;i++){const y=rand()*h;a.strokeStyle=i%3?'#42281126':'#e9bf7e2a';a.lineWidth=rand()*1.5+.3;a.beginPath();a.moveTo(0,y);a.bezierCurveTo(w*.29,y+rand()*8,w*.55,y-rand()*9,w,y+rand()*3);a.stroke();}for(let i=0;i<75;i++){const x=rand()*w,y=rand()*h;a.fillStyle='#40382855';a.fillRect(x,y,rand()*13+1,1);}});
  const terrazzo=texture(384,384,(a,w,h)=>{a.fillStyle='#9b9f92';a.fillRect(0,0,w,h);for(let i=0;i<13400;i++){a.fillStyle=['#5d69617a','#bec1ae','#7d817799','#dbd7c3'][i%4];const x=rand()*w,y=rand()*h,r=rand()*2.4+.3;a.beginPath();a.moveTo(x,y);a.lineTo(x+r*1.7,y-r*.3);a.lineTo(x+r*.4,y+r);a.fill();}a.strokeStyle='#676d60';a.lineWidth=1.4;a.strokeRect(0,0,w,h);});
  terrazzo.wrapS=terrazzo.wrapT=T.RepeatWrapping;
  const floor=(w,d)=>{const map=terrazzo.clone();map.repeat.set(w/.75,d/.75);return new T.MeshStandardMaterial({map,roughness:.48});};
  const wood=new T.MeshStandardMaterial({map:grain,roughness:.53}),oak=new T.MeshStandardMaterial({map:grain,color:'#a39674',roughness:.65});
  const wall=new T.MeshStandardMaterial({map:plaster,color:'#b9bba6'}),mint=mat('#78968a'),base=mat('#455953'),trim=mat('#c0bca9'),steel=mat('#83918a',.37,.56),black=mat('#283230'),cork=mat('#926d49'),paper=mat('#e5d9bb'),red=mat('#9e453f'),glass=mat('#54716f',.21,.35);
  const glow=(color)=>new T.MeshBasicMaterial({color,toneMapped:false});
  const fluoro=glow('#efedcb'),hallTube=glow('#c9dcd4'),redLamp=glow('#f8946b'),exitGreen=glow('#91c9a7');
  function geom(g,m,x,y,z,w,h,d,parent=null,rx=0,ry=0,rz=0){
    scratch.position.set(x,y,z);scratch.rotation.set(rx,ry,rz);scratch.scale.set(w,h,d);scratch.updateMatrix();
    if(parent){const o=new T.Mesh(g,m);o.position.copy(scratch.position);o.rotation.copy(scratch.rotation);o.scale.copy(scratch.scale);parent.add(o);return o;}
    let byMat=groups.get(g);if(!byMat){byMat=new Map();groups.set(g,byMat);}
    if(!byMat.has(m))byMat.set(m,[]);byMat.get(m).push(scratch.matrix.clone());
  }
  const box=(w,h,d,x,y,z,m,parent,rx,ry,rz)=>geom(cube,m,x,y,z,w,h,d,parent,rx,ry,rz);
  const cyl=(r,h,x,y,z,m,parent,rx=0,rz=0)=>geom(tube,m,x,y,z,r*2,h,r*2,parent,rx,0,rz);
  function group(x,y,z,id,label,parent=scene){
    const g=new T.Group();g.position.set(x,y,z);parent.add(g);
    if(id)g.userData={id,label};return g;
  }
  function panel(parent,w,h,x,y,z,rotation,paint,res=512){
    const map=texture(res,Math.max(72,Math.round(res*h/w)),paint);
    const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,color:'#dadaca'}));
    o.position.set(x,y,z);o.rotation.y=rotation;parent.add(o);return o;
  }
  function sign(parent,str,w,h,x,y,z,r,bg='#384e46',fg='#e3e0c9'){
    return panel(parent,w,h,x,y,z,r,(a,W,H)=>{a.fillStyle=bg;a.fillRect(0,0,W,H);a.strokeStyle=fg;a.lineWidth=1.6;a.strokeRect(5,5,W-10,H-10);a.fillStyle=fg;a.textAlign='center';a.textBaseline='middle';a.font='600 '+Math.min(H*.55,W*1.48/str.length)+'px sans-serif';a.fillText(str,W/2,H*.51,W*.93);},384);
  }
  function lit(x,y,z,c,n,range){const l=new T.PointLight(c,n,range,1.65);l.position.set(x,y,z);scene.add(l);return l;}
  function darkPatch(x,z,w,d){
    const mesh=new T.Mesh(new T.PlaneGeometry(w,d),ao);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.009,z);mesh.raycast=()=>{};scene.add(mesh);
  }
  const ao=new T.MeshBasicMaterial({map:texture(64,64,(a,w,h)=>{const g=a.createRadialGradient(32,32,4,32,32,32);g.addColorStop(0,'#1019188a');g.addColorStop(1,'#10191800');a.fillStyle=g;a.fillRect(0,0,w,h);}),transparent:true,depthWrite:false});
  const hemi=new T.HemisphereLight('#9fbed0','#54594b',.48);scene.add(hemi);
  const moon=new T.DirectionalLight('#a9cce3',.77);moon.position.set(8,6,2);scene.add(moon);
  const ceiling=mat('#b9b8a6');
  function roomFloor(x,z,w,d){box(w,.13,d,x,-.07,z,floor(w,d));box(w,.14,d,x,3.47,z,ceiling);
    for(let X=x-w/2+.6;X<x+w/2;X+=1.2)box(.013,.009,d,X,3.394,z,trim);
    for(let Z=z-d/2+.6;Z<z+d/2;Z+=1.2)box(w,.009,.013,x,3.393,Z,trim);
  }
  roomFloor(0,0,9.2,10.8);roomFloor(-6.1,-.2,3,15.6);roomFloor(-10.2,-4.825,5.2,6.35);
  function partition(alongX,x,z,length){
    function layer(y,h,depth,m){box(alongX?length:depth,h,alongX?depth:length,x,y,z,m);}
    layer(1.70,3.4,.095,wall);layer(.58,1.16,.106,mint);layer(1.18,.042,.12,trim);layer(.066,.13,.13,base);
  }
  function gateWall(p,lo,hi){
    const ax=p.axis==='z';
    for(const [a,b] of [[lo,p.lo],[p.hi,hi]])partition(ax,ax?(a+b)/2:p.at,ax?p.at:(a+b)/2,b-a);
    const mid=(p.lo+p.hi)/2,len=p.hi-p.lo;
    box(ax?len:.11,.97,ax?.11:len,ax?mid:p.at,2.92,ax?p.at:mid,wall);
    for(const edge of [p.lo,p.hi])box(ax?.075:.18,2.47,ax?.18:.075,ax?edge:p.at,1.235,ax?p.at:edge,steel);
    box(ax?len+.10:.18,.065,ax?.18:len+.10,ax?mid:p.at,2.45,ax?p.at:mid,steel);
  }
  partition(true,0,-5.45,9.2);partition(true,0,5.45,9.2);gateWall(PORTALS[0],-5.4,5.4);
  partition(false,-4.6,-6.7,2.6);partition(false,-4.6,6.5,2.2);partition(true,-6.1,-8.01,3);
  gateWall(PORTALS[1],-8,-1.65);gateWall(PORTALS[3],-1.65,7.6);gateWall(PORTALS[2],-7.6,-4.6);
  partition(false,-12.82,-4.825,6.35);partition(true,-10.20,-8.02,5.20);partition(true,-10.20,-1.64,5.20);
  function fixture(x,z,m,len=1.55){box(.34,.085,len+.14,x,3.29,z,base);for(const dx of [-.099,.099])cyl(.026,len,x+dx,3.225,z,m,null,Math.PI/2);}
  const coldTube=mat('#768580');
  const lamps=[];for(const x of [-2.0,1.9])for(const z of [-2.95,.05,3.10])fixture(x,z,(x<0&&z===-2.95)||(x>0&&z===3.10)?fluoro:coldTube);
  lamps.push(lit(-2,2.92,-2.95,'#e4dda9',10,7),lit(1.9,2.92,3.1,'#c7dfd6',7,7));
  for(const z of [-6.2,-1,4.4])fixture(-6.15,z,hallTube,1.26);
  lit(-6.05,2.75,-4.60,'#a8cbca',13,8);lit(-6.2,2.78,4.1,'#a6c2a9',10,7);
  fixture(-10.4,-5.2,hallTube);lit(-10.25,2.70,-5.15,'#edcc9a',18,8);
  // Recessed glazing, window catches and a distant opposite wing beyond the east wall.
  box(.13,.92,10.8,4.60,.46,0,mint);box(.26,.075,10.8,4.53,.91,0,trim);
  box(.13,.37,10.8,4.60,3.22,0,wall);
  const night=glow('#263e52'),silhouette=glow('#141f2a'),paneLit=glow('#6c756a');
  box(.12,12,31,12,1.4,0,night);
  for(let k=0;k<7;k++){const z=-13+k*4.1,h=2.3+rand()*3;box(.7,h,3.6,10.7,h/2-.65,z,silhouette);
    for(let j=0;j<5;j++)for(let f=0;f<3;f++)if(rand()>.52)box(.03,.24,.33,10.33,f*.77+.09,z-1.32+j*.62,paneLit);}
  const rainInk=new T.LineBasicMaterial({color:'#9aafb4',transparent:true,opacity:.29});
  const rainLines=[];for(let i=0;i<240;i++){const z=-5.35+rand()*10.7,y=1+rand()*1.92;rainLines.push(4.57,y,z,4.57,y-.04-rand()*.13,z+.008);}
  const streak=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rainLines,3)),rainInk);scene.add(streak);
  const paneGlass=new T.MeshBasicMaterial({color:'#77959c',transparent:true,opacity:.17,depthWrite:false});
  for(let i=0;i<5;i++){
    const z=-4.32+i*2.16;
    box(.045,2.14,.067,4.57,1.99,z-1.06,steel);box(.035,2.12,.033,4.56,1.99,z,steel);
    box(.07,.055,2.14,4.56,1.60,z,steel);box(.058,.065,2.14,4.56,3.03,z,steel);
    box(.014,2.03,2.09,4.59,1.99,z,paneGlass);
    box(.075,.12,.021,4.52,1.48,z-.08,black);
  }
  const windowGroup=group(4.49,1.79,-.02,'window','창틀의 원고걸이');windowGroup.rotation.y=-Math.PI/2;
  const reflection=new Reflector(new T.PlaneGeometry(1.98,1.38),{color:0x697f85,textureWidth:384,textureHeight:256,clipBias:.004,
    shader:{...Reflector.ReflectorShader,fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('color ), 1.0','color ), 0.38')}});
  reflection.material.transparent=true;reflection.material.depthWrite=false;windowGroup.add(reflection);reflection.renderOrder=1;
  box(.73,.025,.05,0,-.5,.018,black,windowGroup);for(const dx of [-.28,.28])box(.035,.064,.05,dx,-.46,.02,steel,windowGroup);
  const ghost=panel(windowGroup,.60,.60,0,-.13,.035,0,(a,w,h)=>{a.clearRect(0,0,w,h);a.fillStyle='#c9efdf';a.font='44px monospace';a.textAlign='center';GLASS.forEach((n,i)=>a.fillText(n,w*(.20+i%3*.30),h*(.24+Math.floor(i/3)*.29)));});
  ghost.material.transparent=true;ghost.material.opacity=.72;ghost.renderOrder=3;
  // The pane remains fully targetable when its handwritten marks disappear.
  const inserted=group(0,-.13,.054,null,null,windowGroup);
  box(.65,.016,.006,0,.325,0,steel,inserted);box(.65,.016,.006,0,-.325,0,steel,inserted);
  for(const dx of [-.32,.32])box(.012,.65,.006,dx,0,0,steel,inserted);
  function desk(x,z,i){
    box(.90,.047,.61,x,.775,z,wood);box(.89,.022,.60,x,.743,z,base);
    for(const dx of [-.34,.34])for(const dz of [-.22,.22]){
      cyl(.016,.70,x+dx,.37,z+dz,steel);cyl(.022,.037,x+dx,.034,z+dz,black);
    }
    box(.66,.026,.39,x,.57,z+.015,steel);
    for(const side of [-.32,.32])box(.018,.15,.41,x+side,.645,z+.015,steel);
    const cz=z+.50;box(.44,.042,.40,x,.447,cz,oak);box(.43,.185,.035,x,.78,cz+.18,oak,null,-.08);
    for(const dx of [-.16,.16]){cyl(.014,.79,x+dx,.40,cz+.154,steel);cyl(.014,.42,x+dx,.225,cz-.13,steel);box(.013,.012,.29,x+dx,.215,cz,steel);}
    if(i%4===1){box(.23,.028,.306,x+.16,.814,z-.018,black,null,0,.08);box(.21,.008,.29,x+.16,.835,z-.018,paper,null,0,.08);}
    if(i%3===0)box(.15,.012,.017,x-.22,.81,z+.13,red,null,0,.26);
    if(i===4||i===11||i===17){
      const bag=i===11?black:base;
      box(.29,.33,.13,x+.04,.59,cz+.25,bag,null,-.10,.04);
      box(.22,.14,.055,x+.04,.49,cz+.335,bag,null,-.12,.04);
      box(.21,.014,.014,x+.04,.55,cz+.367,steel);
      for(const dx of [-.09,.09])box(.024,.135,.020,x+.04+dx,.775,cz+.20,black,null,-.16);
    }
    if(i===5||i===13){box(.22,.024,.28,x-.04,.601,z+.05,paper,null,0,-.10);box(.23,.016,.29,x-.02,.624,z+.052,mint,null,0,-.06);}
    darkPatch(x,z+.13,1.30,1.55);solid(x,z+.18,.90,.98);
  }
  let deskId=0;for(const z of [-1.65,-.03,1.61,3.25])for(const x of [-2.9,-1.6,.15,1.45,2.85])desk(x,z,deskId++);
  const attendance=group(.12,.824,3.23,'attendance','야간 점호표');
  attendance.rotation.y=-.12;box(.29,.014,.34,0,0,0,paper,attendance);
  const ledger=sign(attendance,'야간 점호표',.26,.25,0,.009,0,0,'#cfc5a8','#403f34');ledger.rotation.x=-Math.PI/2;
  const speaker=group(2.98,2.72,-5.31);
  box(.46,.39,.18,0,0,.065,oak,speaker);box(.41,.33,.02,0,0,.165,black,speaker);
  for(let i=0;i<8;i++)box(.36,.013,.016,0,-.128+i*.036,.183,steel,speaker);
  box(.031,.015,.016,.167,.133,.188,redLamp,speaker);
  // Steel cleaning cupboard and the unswept erasers at the back of the room.
  const props=group(-3.35,0,5.12);props.rotation.y=Math.PI;
  for(const x of [-.38,.38]){
    box(.73,1.74,.42,x,.885,0,mint,props);box(.67,1.64,.025,x,.885,.225,base,props);
    for(let j=0;j<5;j++)box(.27,.014,.02,x,1.52-j*.040,.245,black,props);
    box(.027,.15,.03,x+.22,.91,.25,steel,props);
  }
  solid(-3.35,5.12,1.5,.45);
  const corkboard=group(1.15,1.85,5.38);corkboard.rotation.y=Math.PI;
  box(3.7,1.06,.06,0,0,0,oak,corkboard);box(3.62,.98,.036,0,0,.046,cork,corkboard);
  for(let i=0;i<7;i++){const x=-1.45+i*.48,y=.10*Math.sin(i*3.8);box(.32,.46,.008,x,y,.076,trim,corkboard,0,0,(i%3-1)*.04);box(.025,.019,.015,x,y+.20,.083,red,corkboard);}
  sign(corkboard,'학 급 게 시 판',.89,.14,0,.46,.084,0);
  const board=group(-.30,2.11,-5.31,'board','칠판 레일');
  box(5.58,1.43,.09,0,0,0,oak,board);box(5.45,1.34,.04,0,0,.063,black,board);
  const boardSlide=group(0,0,.105,null,null,board);
  panel(boardSlide,4.52,1.23,0,0,.009,0,(a,w,h)=>{
    a.fillStyle='#284438';a.fillRect(0,0,w,h);
    for(let i=0;i<16000;i++){a.fillStyle=i%2?'#b4c7a30d':'#121e2414';a.fillRect(rand()*w,rand()*h,rand()*4+1,1);}
    a.fillStyle='#d5dbb9';a.font='36px serif';a.fillText('야간 자율학습',w*.075,h*.38);
    a.strokeStyle='#b5c9aa';a.beginPath();a.moveTo(w*.07,h*.46);a.lineTo(w*.36,h*.44);a.stroke();
    a.font='21px serif';a.fillText('창문 잠그기     ·     소등',w*.09,h*.69);
    a.font='17px serif';a.fillText('11월  7일   금요일',w*.75,h*.24);},1024);
  for(const y of [-.64,.64])box(4.60,.038,.055,0,y,0,steel,boardSlide);
  for(const x of [-2.28,2.28])box(.037,1.30,.055,x,0,0,steel,boardSlide);
  box(5.65,.05,.19,-.3,1.42,-5.18,steel);box(.21,.056,.083,-1.25,1.475,-5.17,wood);
  const film=group(1.56,2.03,-5.17,'film','끼인 투명 원고 집기');box(.31,.26,.016,0,0,0,paper,film);
  sign(film,'야간 투사 원고',.28,.11,0,0,.012,0,'#d2c18a','#403e30');
  // Chalkboard is in front of the slip when closed; hold the prop back until exposed.
  const clock=group(0,3.02,-5.33);
  cyl(.225,.065,0,0,.026,steel,clock,Math.PI/2);
  panel(clock,.42,.42,0,0,.069,0,(a,w,h)=>{const c=w/2;a.fillStyle='#cccaba';a.beginPath();a.arc(c,c,c,0,7);a.fill();a.translate(c,c);a.strokeStyle='#35413b';for(let i=0;i<12;i++){a.rotate(Math.PI/6);a.lineWidth=3;a.beginPath();a.moveTo(0,-c*.76);a.lineTo(0,-c*.91);a.stroke();}for(const [ang,len] of [[9.28*Math.PI/6,.53],[17*Math.PI/30,.81]]){a.save();a.rotate(ang);a.lineWidth=5;a.beginPath();a.moveTo(0,0);a.lineTo(0,-len*c);a.stroke();a.restore();}}).material.transparent=true;
  const deskTop=group(-2.98,0,-4.22,'drawer','교탁의 번호 서랍');
  box(1.48,.07,.73,0,1.02,0,wood,deskTop);box(1.32,.82,.57,0,.55,0,oak,deskTop);
  box(1.38,.08,.62,0,.11,0,base,deskTop);solid(-2.98,-4.22,1.46,.75);darkPatch(-2.98,-4.13,1.9,1.28);
  const drawer=group(0,.84,.30,null,null,deskTop);box(1.24,.22,.052,0,0,0,wood,drawer);
  box(1.13,.022,.37,0,-.095,-.19,black,drawer);for(const dx of [-.56,.56])box(.018,.16,.37,dx,-.02,-.19,oak,drawer);
  box(.25,.027,.06,.28,.02,.054,steel,drawer);
  sign(drawer,'0   0   0',.20,.078,-.38,.018,.03,0,'#353d38','#f4e5be');
  function key(parent,x,y,z,id,tag){
    const g=group(x,y,z,id,tag,parent);
    const pickArea=new T.Mesh(new T.BoxGeometry(.15,.027,.21),new T.MeshBasicMaterial({visible:false}));
    pickArea.position.set(.027,0,.031);g.add(pickArea);
    const ring=new T.Mesh(new T.TorusGeometry(.037,.009,8,20),steel);ring.rotation.x=-Math.PI/2;g.add(ring);
    box(.015,.012,.095,0,0,.073,steel,g);box(.038,.013,.017,.013,0,.115,steel,g);
    box(.075,.008,.13,.065,0,-.014,red,g);return g;
  }
  const classKey=key(drawer,0,-.070,-.14,'roomKey','교실 열쇠 집기');
  const lightSwitch=group(-4.49,1.43,-2.30,'light','교실 전등 스위치');lightSwitch.rotation.y=Math.PI/2;
  box(.18,.25,.039,0,0,0,trim,lightSwitch);box(.071,.135,.036,0,0,.034,black,lightSwitch);
  sign(scene,'2학년 3반',.76,.23,-4.68,2.63,-3.44,-Math.PI/2);
  function slider(p,id,label,material){
    const mid=(p.lo+p.hi)/2,w=p.hi-p.lo-.065,ax=p.axis==='z';
    const g=group(ax?mid:p.at,0,ax?p.at:mid,id,label);g.rotation.y=ax?0:Math.PI/2;
    const leaf=group(0,0,0,null,null,g);
    for(const side of [-1,1])box(.115,2.36,.076,side*(w/2-.057),1.20,0,material,leaf);
    box(w-.18,1.13,.070,0,.58,0,material,leaf);box(w-.18,.10,.07,0,2.33,0,material,leaf);
    box(w-.19,1.12,.028,0,1.72,0,glass,leaf);box(.03,1.16,.058,0,1.72,0,steel,leaf);
    for(const side of [-1,1])box(.032,.20,.05,w*.35,1.03,side*.054,steel,leaf);
    box(w+.08,.018,.16,0,.011,0,steel,g);
    return {leaf,w,p,mid,ax,block:{x:g.position.x,z:g.position.z,w:ax?w:.08,d:ax?.08:w}};
  }
  const doors=[slider(PORTALS[0],'classDoor','교실 미닫이문',oak),slider(PORTALS[1],'boothDoor','방송실 방음문',base),slider(PORTALS[2],'exitDoor','서쪽 현관문',steel),slider(PORTALS[3],'washDoor','서쪽 화장실 문',mint)];
  doors.forEach(d=>blocks.push(d.block));
  sign(scene,'서쪽 화장실',.86,.24,-7.508,2.65,5.49,Math.PI/2);
  const updateWashroom=buildWashroom(washModel,s,{scene,blocks,solid,box,sign,panel,group,lit,texture,mat,rand});
  // Corridor display case, the rain-gear tray and a paper patch schedule.
  const chart=group(-7.52,1.71,.45,'chart','방송 회선 점검표');chart.rotation.y=Math.PI/2;
  box(1.48,1.03,.055,0,0,0,wood,chart);box(1.40,.95,.04,0,0,.045,cork,chart);
  sign(chart,'방송 회선 점검표',.86,.46,0,.045,.074,0,'#d9caaa','#33453c');
  const lost=group(-5.01,0,4.0,'tray','분실물함 아래 받침');lost.rotation.y=-Math.PI/2;
  box(1.32,.055,.53,0,.83,0,oak,lost);for(const dx of [-.62,.62])box(.055,.77,.54,dx,.415,0,mint,lost);
  box(1.24,.60,.036,0,.48,-.23,base,lost);box(1.24,.045,.50,0,.33,0,wood,lost);
  sign(lost,'분 실 물',.63,.11,0,.82,.272,0,'#d9cfb4','#3c473f');
  const tray=group(0,.435,.22,null,null,lost);box(1.18,.09,.027,0,0,0,oak,tray);box(1.15,.025,.38,0,-.025,-.19,steel,tray);
  const deposit=washModel.getObjectByName('PropertyRack'),padlock=washModel.getObjectByName('TrayPadlock');
  lost.add(deposit);tray.add(padlock);padlock.position.set(-.34,.038,.032);
  const tape=group(.04,.01,-.14,'tape','카세트테이프 집기',tray);
  box(.165,.027,.106,0,0,0,black,tape);box(.138,.003,.071,0,.015,0,paper,tape);for(const dx of [-.045,.045])cyl(.014,.004,dx,.018,0,black,tape);
  solid(-5.01,4.0,.55,1.32);
  for(const z of [1.5,2.25,3.0]){box(.32,1.56,.66,-7.35,.79,z,mint);for(let i=0;i<4;i++)box(.016,.017,.21,-7.18,1.31-i*.043,z,black);box(.045,.055,.075,-7.17,.79,z+.17,steel);solid(-7.35,z,.35,.69);}
  sign(scene,'방 송 실',.75,.25,-7.51,2.66,-6.00,Math.PI/2);
  sign(scene,'서 쪽   현 관',.94,.24,-6.1,2.72,7.52,Math.PI,'#355848','#cee5cb');
  box(.20,.06,.02,-6.74,2.73,7.54,exitGreen);
  // Broadcast booth with reel transport, mixing desk, acoustic treatment and key cabinet.
  const acoustic=mat('#635e53');
  for(const x of [-12.35,-11.47,-10.59,-9.71,-8.83])for(const y of [1.24,2.16]){box(.78,.81,.055,x,y,-7.94,acoustic);for(let i=0;i<5;i++)box(.041,.75,.042,x-.29+i*.143,y,-7.88,base);}
  box(3.30,.08,.95,-10.78,.84,-7.30,wood);for(const x of [-12.12,-9.46])box(.085,.81,.80,x,.419,-7.30,base);
  solid(-10.78,-7.30,3.32,.97);darkPatch(-10.78,-7.22,3.62,1.30);
  const deck=group(-11.50,.90,-7.28,'deck','카세트 데크');box(1.24,.33,.49,0,.17,0,black,deck);
  box(.51,.18,.025,-.23,.19,.261,glass,deck);for(const dx of [-.36,-.12])cyl(.046,.02,dx,.19,.281,steel,deck,Math.PI/2);
  for(let i=0;i<5;i++)box(.083,.034,.053,-.43+i*.106,.054,.267,steel,deck);
  sign(deck,'STEREO  /  PLAY',.45,.085,.29,.22,.251,0,'#242e28','#c8b991');
  const patch=group(-9.88,.90,-7.24,'patch','구내 방송 송출반');box(1.24,.32,.50,0,.16,0,base,patch);
  for(let i=0;i<3;i++){const dx=-.37+i*.32;cyl(.067,.038,dx,.15,.262,black,patch,Math.PI/2);sign(patch,'ABC'[i],.13,.077,dx,.268,.255,0);}
  const keyBox=group(-12.70,1.47,-4.05,'cabinet','당직 열쇠함');keyBox.rotation.y=Math.PI/2;
  box(.78,.66,.09,0,0,0,base,keyBox);for(const dx of [-.37,.37])box(.04,.65,.23,dx,0,.1,steel,keyBox);
  box(.77,.035,.22,0,-.31,.10,steel,keyBox);const lid=group(-.389,0,.23,null,null,keyBox);
  box(.78,.64,.047,.39,0,0,mint,lid);sign(lid,'당 직 열 쇠',.44,.15,.39,.05,.03,0);
  const yardKey=key(keyBox,.06,-.17,.13,'exitKey','현관 열쇠 집기');yardKey.rotation.x=Math.PI/2;
  sign(scene,'방 송 중',.68,.19,-10.2,2.18,-7.865,0,'#612b25','#f4b0a3');
  for(let i=0;i<2;i++){const x=-12.04+i*2.67;box(.41,.54,.27,x,1.64,-7.77,black);cyl(.139,.02,x,1.66,-7.62,base,null,Math.PI/2);}
  for(const x of [-7.8,-4.4])box(.10,2.9,.10,x,1.45,10.95,steel);
  box(4.72,.13,4.62,-6.1,-.075,9.92,floor(4.72,4.62));box(4.72,.095,3,-6.1,3.24,9.08,base);
  for(const x of [-8.40,-3.81])box(.09,.86,4.6,x,.42,9.9,base);
  for(let i=0;i<8;i++){const x=-15+i*2.65;box(1.7,1.5+rand()*2,.6,x,.35,14+rand(),silhouette);}
  lit(-6,2.65,9.88,'#9abddd',9,7);
  for(const [g,byMat] of groups)for(const [m,matrices] of byMat){
    const batch=new T.InstancedMesh(g,m,matrices.length);matrices.forEach((v,i)=>batch.setMatrixAt(i,v));batch.computeBoundingSphere();scene.add(batch);
  }
  const lamp=new T.SpotLight('#f9edca',10,10,.48,.68,1.65);scene.add(lamp,lamp.target);
  let progress=0;
  function update(dt,time,cam,torch){
    reflection.visible=cam.position.x>-7.55;
    updateWashroom(dt,time,cam);
    const k=1-Math.exp(-dt*6);const to=(o,f,v)=>o[f]+=(v-o[f])*k;
    to(boardSlide.position,'x',s.board?-1.17:0);film.visible=s.board&&boardSlide.position.x<-.65&&!s.film;
    to(drawer.position,'z',s.drawer?.72:.30);classKey.visible=s.drawer&&drawer.position.z>.58&&!s.roomKey;
    to(tray.position,'z',s.tray?.61:.22);tape.visible=s.tray&&tray.position.z>.47&&!s.tape;
    to(padlock.rotation,'z',s.tray?-.64:0);
    to(lid.rotation,'y',s.cabinet?-1.55:0);yardKey.visible=s.cabinet&&lid.rotation.y<-.72&&!s.exitKey;
    for(const d of doors){to(d.leaf.position,'x',s[d.p.field]?d.w+.12:0);d.block[d.ax?'x':'z']=d.mid+(d.ax?1:-1)*d.leaf.position.x;}
    ghost.visible=s.dark;inserted.visible=s.mounted;
    progress+=(Number(!s.dark)-progress)*k;lamps.forEach((l,i)=>l.intensity=(i?7:10)*progress);
    fluoro.color.setScalar(.12+.84*progress);streak.position.y=-((time*.093)%.19);
    lamp.intensity=torch?15:0;lamp.position.copy(cam.position);cam.getWorldDirection(lamp.target.position);lamp.target.position.multiplyScalar(3).add(cam.position);
  }
  function pick(ray){
    const hits=ray.intersectObjects(scene.children,true);
    for(const hit of hits){
      if(hit.distance>2.65)return null;
      let target=hit.object,found=null,visible=true;
      for(;target;target=target.parent){if(!target.visible){visible=false;break;}if(!found&&target.userData.id)found=target.userData;}
      if(!visible)continue;if(found)return found;if(hit.object.isMesh)return null;
    }
    return null;
  }
  return {scene,blocks,pick,update};
}
