/* Screen-space art for the squad's three specialist miniatures. Positions and damage come from combat. */
(function(root){'use strict';
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,color,angle=0){
 c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fill();
}
function ball(c,x,y,rx,ry,light,base,shade){
 const g=c.createRadialGradient(x-rx*.38,y-ry*.49,0,x,y,Math.max(rx,ry)*1.07);
 g.addColorStop(0,light);g.addColorStop(.5,base);g.addColorStop(1,shade);ellipse(c,x,y,rx,ry,g);
}
function rod(c,a,b,width,color){
 c.lineCap='round';c.lineWidth=width;c.strokeStyle=color;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();
}
function polygon(c,points,color){
 c.fillStyle=color;c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fill();
}
const pips=[[],[[0,0]],[[-1,-1],[1,1]],[[-1,-1],[0,0],[1,1]],[[-1,-1],[1,-1],[-1,1],[1,1]],[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]];
// Fixed physical layout: opposite faces 1/6, 2/5 and 3/4.
const cubeFaces=[
 {n:1,c:[0,0,1],u:[1,0,0],v:[0,1,0]}, {n:6,c:[0,0,-1],u:[-1,0,0],v:[0,1,0]},
 {n:2,c:[0,1,0],u:[1,0,0],v:[0,0,-1]}, {n:5,c:[0,-1,0],u:[-1,0,0],v:[0,0,-1]},
 {n:3,c:[1,0,0],u:[0,-1,0],v:[0,0,-1]}, {n:4,c:[-1,0,0],u:[0,1,0],v:[0,0,-1]}
];
function die(c,x,y,r,face=5,gold=false,spin=0){
 const yaw=-.62+spin,co=Math.cos(yaw),si=Math.sin(yaw),height=.63,depth=Math.sqrt(1-height*height);
 // Rotate the selected physical face upwards, then rotate the whole cube around its vertical axis.
 function view([a,b,z]){
  switch(face){
   case 6: b=-b;z=-z;break;
   case 2: [b,z]=[-z,b];break;
   case 5: [b,z]=[z,-b];break;
   case 3: [a,z]=[-z,a];break;
   case 4: [a,z]=[z,-a];break;
  }
  const d=si*a+co*b;return [(co*a-si*b)*r,(d*height-z*depth)*r,d*depth+z*height];
 }
 c.save();c.translate(x,y);
 for(const f of cubeFaces){
  const p=view(f.c);if(p[2]<.005)continue;
  const u=view(f.u),v=view(f.v),corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>[p[0]+i*u[0]+j*v[0],p[1]+i*u[1]+j*v[1]]);
  const top=f.n===face,light=top?(gold?'#fff2a4':'#fffbea'):p[0]<0?(gold?'#eebb57':'#e5e8da'):(gold?'#bb802e':'#afbdaf'),shade=top?(gold?'#f7d066':'#e9eadb'):p[0]<0?(gold?'#d29a39':'#c1c8b9'):(gold?'#9d641f':'#9ca999');
  const grad=c.createLinearGradient(0,-r*1.24,0,r*1.45);grad.addColorStop(0,light);grad.addColorStop(1,shade);
  polygon(c,corners,grad);c.strokeStyle=gold?'#8e6c2d':'#788373';c.lineWidth=Math.max(.65,r*.08);c.lineJoin='round';c.stroke();
  c.save();c.transform(u[0],u[1],v[0],v[1],p[0],p[1]);
  c.lineWidth=.047;c.strokeStyle=top?'#ffffff90':'#ffffff55';c.beginPath();c.roundRect(-.94,-.94,1.88,1.88,.15);c.stroke();
  for(const [dx,dy] of pips[f.n]){
   const px=dx*.54,py=dy*.54,rad=f.n===1?.24:.168;
   ellipse(c,px,py+.025,rad+.026,rad+.025,top?'#fff4c4':'#d0d3b7');
   ellipse(c,px,py,rad,rad,gold?'#49371d':'#283e33');
  }c.restore();
 }
 c.restore();
}
function bodyProject(angle){const co=Math.cos(angle),si=Math.sin(angle);return (f,s,z)=>[f*co-s*si,(f*si+s*co)*.66-z];}
function infantry(c,u,time,evolved,dice){
 const angle=Number.isFinite(u.aimFace)?u.aimFace:u.face||0,project=bodyProject(angle),step=Math.sin(u.walk||0);
 const engineer=u.type==='rocket';
 const shell=evolved?'#e4a044':'#b45430',suit=dice?'#5b7447':'#688457',trim=dice?'#aac085':'#b9c78a';
 ellipse(c,2,2,17,6,'#28362942');
 for(const side of [-1,1]){
  const foot=project(side*step*3.5,side*6,3),hip=project(0,side*4,17);
  rod(c,foot,hip,8,'#394536');const toe=project(side*step*3.5+2,side*6,3);
  ball(c,...toe,6,3.7,'#7a7963','#4b5143','#2e382f');
 }
 const bob=Math.abs(step)*.9;c.translate(0,-bob);
 const torso=project(-1,0,25),neck=project(0,0,35),head=project(.7,0,41),hat=project(-.5,0,47);
 const pack=project(-8,0,26);
 if(dice){
  const x=pack[0],y=pack[1],mast=project(-9,-4,61);
  rod(c,[x-4,y],mast,1.6,'#344937');ellipse(c,...mast,1.4,1.3,'#dfc77e');
  c.fillStyle='#485b39';c.beginPath();c.roundRect(x-7,y-10,14,21,2.3);c.fill();
  for(let i=0;i<3;i++)rod(c,[x-4,y-5+i*3],[x+4,y-5+i*3],1.1,'#829268');
 }else ball(c,...pack,8.6,9.3,'#adab81','#788061','#495841');
 ball(c,...torso,12.5,13.5,trim,suit,'#324737');
 const beltL=project(-1,-8,20),beltR=project(-1,8,20);rod(c,beltL,beltR,3.5,'#594b36');
 const strap1=project(0,-7,34),strap2=project(3,5,18);rod(c,strap1,strap2,3.1,dice?'#c4a56e':'#4b4938');
 for(let i=0;i<3;i++){const p=project(4,i*2.8-2,27-i*1.5);rod(c,p,[p[0]+.5,p[1]+3],2.3,dice?'#e8c16d':'#be6842');}
 ball(c,...neck,6,4,'#bb9d6a','#a38964','#71633f');
 ball(c,...head,8.3,8.7,'#d0b68a','#a39767','#64754b');
 for(const side of [-1,1]){
  const facing=Math.sin(angle)*.66+Math.cos(angle)*side*.66;
  if(facing>-.12){const eye=project(6,side*4,42);ellipse(c,...eye,1.05,1.25,'#353d2c');}
 }
 const nose=project(7,0,40);ball(c,...nose,3,2.8,'#d6b68b','#aa9568','#837953');
 ball(c,...hat,10.8,6.1,dice?'#9bcab5':'#c5d59a',suit,'#374e39');
 const brim=project(1.4,0,44);ellipse(c,...brim,11.1,2.1,dice?'#4b6444':'#4a6644');
 const ridge=project(-2,-1,49);ellipse(c,ridge[0]-2.5,ridge[1]-1.6,4.5,.8,dice?'#acd6c7':'#bed1a0',-.16);
 const mark=project(6,3,47);ellipse(c,...mark,1.6,1.8,dice?'#f7e4b8':shell);
 const plantAge=time-u.minePlantedAt,planting=engineer&&plantAge>=0&&plantAge<.26;
 const front=planting?project(6,-4,15):project(12,-3,28),rear=planting?project(4,5,15):project(4,6,27);
 for(const [side,hand] of [[-1,front],[1,rear]]){const shoulder=project(-1,side*8,31);rod(c,shoulder,hand,5.4,suit);ball(c,...hand,3.2,3,'#d0c393','#a7a16d','#56694c');}
 if(engineer){
  if(!planting)root.FrontBlockFlashView?.mine(c,front[0]-2,front[1]+1,evolved,.55,.56);
 }else if(dice){
  const [x,y]=front;
  c.strokeStyle='#364736';c.lineWidth=1.4;c.beginPath();c.moveTo(pack[0],pack[1]+6);
  c.bezierCurveTo(pack[0]+1,pack[1]+22,x+3,y+17,x,y);c.stroke();
  rod(c,[x,y+1],[x-3,y-7],3.8,'#384a36');
  for(const [hx,hy] of [[x,y+2],[x-3,y-8]])ball(c,hx,hy,3.3,2.4,'#b3ba86','#536848','#354331');
  ellipse(c,x-3,y-9,1.1,.7,evolved?'#ffe796':'#b7d678');
 }else{
  const recoil=Math.min(1,(u.recoil||0)*3),P=(f,s=3,z=29)=>project(f-recoil*3.2,s,z);
  rod(c,P(-8),P(4),5.7,'#70513a');rod(c,P(0),P(19),4.8,'#344544');rod(c,P(13),P(29),3.9,evolved?'#806339':'#394d50');
  rod(c,P(15,3,30.2),P(28,3,30.2),1,evolved?'#ffca69':'#9aa8a4');
  rod(c,P(8,3,26.3),P(23,3,26.3),2.1,'#626e63');const pump=9-Math.sin(recoil*Math.PI)*2;
  rod(c,P(pump,3,26.8),P(pump+6,3,26.8),4,shell);
  for(let i=0;i<3;i++)rod(c,P(pump+1+i*2,3,27.5),P(pump+1+i*2,3,25.5),.8,'#795536');
  if(evolved){for(let i=0;i<3;i++)rod(c,P(18+i*3,3,30.3),P(19+i*3,3,30.3),1.7,'#eeae48');}
  ball(c,...P(29.5),2.1,1.8,'#a6aa92','#576665','#293a36');
 }
}
function drone(c,u,time,evolved){
 const attack=u.type!=='drone',combined=u.type==='multiDrone';
 const dark='#39402e',shell='#798450';
 const trim=attack?'#ff9254':'#51dcdf';
 const angle=u.aimFace??u.face??0,hover=(u.visualFlightHeight??54)+Math.sin(time*5+(u.id||0))*1.6;
 const P=(f,s,z=0)=>[Math.cos(angle)*f-Math.sin(angle)*s,(Math.sin(angle)*f+Math.cos(angle)*s)*.78-z];
 ellipse(c,4,2,combined?31:evolved?26:22,8,'#182b2339');c.translate(0,-hover);if(combined||evolved)c.scale(combined?1.23:1.2,combined?1.23:1.2);
 const supports=combined?[[-15,-23],[-15,23],[15,-25],[15,25]]:
  attack?[[-19,-15],[-19,15],[9,-22],[9,22]]:[[-23,0],[0,-23],[0,23],[23,0]];
 const arms=supports.map(([f,s],i)=>({p:P(f,s,attack&&f<0?10:4),i})).sort((a,b)=>a.p[1]-b.p[1]);
 for(const {p,i} of arms){
  rod(c,[0,0],p,8,dark);rod(c,[0,-2],p,4,shell);
  if(attack){const a=time*36+i;rod(c,[p[0]-Math.cos(a)*9,p[1]-Math.sin(a)*6],[p[0]+Math.cos(a)*9,p[1]+Math.sin(a)*6],3,'#25292a');ellipse(c,...p,2,2,dark);continue;}
  ellipse(c,p[0],p[1]+2,10.6,8.2,dark);
  ellipse(c,...p,10.5,7.9,shell);ellipse(c,p[0],p[1]-.7,8.2,5.9,attack?'#342e28':'#3c4e2b');
  c.beginPath();c.ellipse(p[0],p[1],9.8,7.4,0,0,TAU);c.strokeStyle=combined&&i%2?'#58dbd3':trim;c.lineWidth=1.8;c.stroke();
  const a=time*42+i*1.7,dx=Math.cos(a)*7.8,dy=Math.sin(a)*3.4;
  rod(c,[p[0]-dx,p[1]-dy],[p[0]+dx,p[1]+dy],1.9,'#a3ac73');
  ball(c,...p,2.2,2,'#d1d49c','#8e9969','#3f4a30');
 }
 if(attack){
  const rake=f=>Math.min(8,Math.max(0,(12-f)*.32));
  const plate=(shape,top,side,z)=>{
   polygon(c,shape.map(([f,s])=>P(f,s,z+rake(f)-4)),side);
   polygon(c,shape.map(([f,s])=>P(f,s,z+rake(f))),top);
  };
  const body=[[-16,-7],[-9,-12],[5,-12],[15,-6],[15,6],[5,12],[-9,12],[-16,7]];
  plate(body,dark,'#2f2e23',3);
  plate([[-14,-6],[-8,-9],[4,-10],[13,-5],[13,5],[4,10],[-8,9],[-14,6]],'#657347',dark,7);
  plate([[-8,-5],[-4,-8],[5,-7],[11,-2],[11,2],[5,7],[-4,8],[-8,5]],'#848e57',shell,10);
  const glass=[[-7,-4],[-3,-6.6],[3,-6],[10,-3.5],[12,0],[10,3.5],[3,6],[-3,6.6],[-7,4]];
  plate(glass,'#252629','#41433b',11);
  for(const offset of [-6,6]){
   const f=combined?0:-2;
   rod(c,P(f-7,offset,10),P(f-4,offset,10),1.2,combined?'#f7db92':'#606658');
  }
  if(combined){
   const saddle=[[-13,-7],[-3,-7],[0,-5],[0,5],[-3,7],[-13,7]];
   plate(saddle,'#29a5a2','#294b48',14);
   plate(saddle.map(([f,s])=>[f-1,s*.9]),'#34b3af','#126b6f',21);
   const eye=P(-2,0,18+rake(-2));ball(c,...eye,5,4.4,'#f0d38a','#b8883f','#776333');
   ball(c,...eye,3.9,3.4,'#a6fff9','#4ccbcc','#158985');
   for(const side of [-1,1])plate([[-7,side*10],[-3,side*15],[8,side*14],[10,side*10]],
    side<0?'#398c89':'#637847',dark,7);
  }
 }else ball(c,0,-3,10.2,9,'#c8ca92','#798552','#3b482b');
 if(!attack){const lens=P(12,0,2);ball(c,...lens,4.1,3.7,'#fffce1',combined?'#72e6e0':'#ffeaa0','#86733f');}
 if(attack){
  const front=combined?16:12;
  for(const side of [-2.7,2.7]){
   rod(c,P(1,side,-4),P(front,side,-5),4.8,'#373839');
   ball(c,...P(front,side,-5),2.4,2,'#535454','#27282a','#111212');
  }
  if(time-(u.droneFlashAt??-1)<.08)ellipse(c,...P(front,0,-5),5,2.5,'#fff5b5');
 }
 if(evolved&&!attack){
  const core=P(3,0,10),mount=P(-4,0,10),dish=P(-6,0,17);
  ball(c,...core,4.8,2.8,'#edffff','#65e7f7','#226d79');
  rod(c,mount,dish,3,'#646f46');ball(c,...dish,7,3.7,'#c1cb88','#7a8854','#3c4a37');
 }
}
function paintModel(c,u,time,evolved){
 if(u.team!==0||!['rifle','guntruck','drone','rocket'].includes(u.type))return false;
 c.save();if(u.type==='drone')drone(c,u,time,evolved);else infantry(c,u,time,evolved,u.type==='guntruck');c.restore();return true;
}
function burning(c,u,time){
 if(!u.shotgunBurns?.some(b=>b.until>time)||u.hp<=0)return;
 c.save();c.globalCompositeOperation='lighter';
 for(let i=0;i<3;i++){
  const phase=(time*2.3+i*.31)%1,x=(i-1)*5+Math.sin(time*8+i)*1.8,y=-8-phase*12;
  c.globalAlpha=.65*(1-phase);ball(c,x,y,2.7,4.4,'#ffda72','#f39135','#db542700');
 }c.restore();
}
const frames=new Map();
function model(c,u,time,evolved=false){
 if(u.team===0&&(u.type==='combatDrone'||u.type==='multiDrone')){
  c.save();drone(c,u,time,evolved);c.restore();return true;
 }
 if(u.team!==0||!['rifle','guntruck','drone','rocket'].includes(u.type))return false;
 if(!root.document?.createElement)return paintModel(c,u,time,evolved);
 const direction=(Math.round((u.aimFace??u.face??0)/TAU*12)%12+12)%12,flying=u.type==='drone';
 const phase=flying?Math.floor(time*18+(u.id||0))%4:Math.round(Math.sin(u.walk||0)),kick=u.type==='rifle'&&(u.recoil||0)>.035;
 const key=[u.type,direction,phase,Number(evolved),Number(kick)].join('.');
 if(!frames.has(key)){
  const tile=document.createElement('canvas');tile.width=100;tile.height=96;
  const g=tile.getContext('2d');if(!g)return paintModel(c,u,time,evolved);
  g.translate(50,78);paintModel(g,{type:u.type,team:0,face:TAU*direction/12,walk:phase*Math.PI/2,recoil:kick?.18:0,id:0},flying?phase*.047:0,evolved);frames.set(key,tile);
 }
 c.drawImage(frames.get(key),-50,-78);return true;
}
function shotgunMuzzleOffset(angle,hot){
 const step=Math.PI/8,beta=Math.round((angle+Math.PI/2)/step)*step,co=Math.cos(beta),si=Math.sin(beta);
 const forward=hot?38.75:37.1;
 return {x:7*co+forward*si,y:.8*(7*si-forward*co)-.6*49.4};
}
function shot(c,p){
 if(p.kind==='dronePulse'||p.kind==='droneMissile'){
  const missile=p.kind==='droneMissile',angle=Math.atan2(p.target.y-p.y,p.target.x-p.x);
  const range=Math.max(1,Math.hypot(p.target.x-p.source.x,p.target.y-p.source.y));
  const progress=Math.max(0,1-Math.hypot(p.target.x-p.x,p.target.y-p.y)/range);
  const height=47*(1-progress)+(root.FrontTypes?.[p.target.type]?.flightHeight||0)*progress;
  c.save();c.translate(p.x,p.y-height);c.rotate(angle);
  const tail=c.createLinearGradient(-23,0,2,0);tail.addColorStop(0,'#ff562300');tail.addColorStop(.7,'#ff733c');tail.addColorStop(1,'#fff1ac');
  rod(c,[-23,0],[2,0],missile?4:2.6,tail);
  if(missile){rod(c,[-3,0],[7,0],5,'#dc7044');ellipse(c,7,0,2.4,2,'#ffedbc');}
  c.restore();return true;
 }
 if(p.rosterKind!=='shotgunPellet')return false;
 const a=p.commandAngle??Math.atan2(p.target.y-p.y,p.target.x-p.x);
 const left=Math.min(1,Math.max(0,p.travelLeft/Math.max(1,p.target.range))),muzzle=shotgunMuzzleOffset(p.muzzleAngle??a,p.hot);
 const len=p.finisher?35:p.hot?31:27,w=p.finisher?4.8:p.hot?4.2:3.8;
 c.save();c.translate(p.x+muzzle.x*left,p.y-12+(muzzle.y+12)*left);c.rotate(a);
 const trail=c.createLinearGradient(-len,0,1,0);
 trail.addColorStop(0,p.hot?'#e8431500':'#dc912900');trail.addColorStop(.48,p.hot?'#ed6226bd':'#d79c46b8');
 trail.addColorStop(.84,p.hot?'#ffb34c':'#ffe0a0');trail.addColorStop(1,'#fff4ca');
 polygon(c,[[-len,0],[-len*.48,-w*.64],[-4,-w*.8],[1,0],[-4,w*.8],[-len*.32,w*.56]],trail);
 polygon(c,[[-10,0],[-5.5,-w],[1.5,-w*.84],[4,0],[1.1,w*.92],[-5,w]],p.hot?'#a14124':'#89612e');
 polygon(c,[[-9,-.3],[-5.4,-w*.7],[1.4,-w*.57],[3,0],[-.4,w*.49],[-5,w*.43]],p.hot?'#ffb74e':'#f7cf78');
 rod(c,[-len*.48,-.45],[-.3,-.85],1.7,'#fff5ce');ellipse(c,.7,-1,1.3,.75,'#fffced');
 if(p.hot){c.globalCompositeOperation='lighter';rod(c,[-len-3,w*.8],[-len*.76,w*.42],1.4,'#fb9149b5');}
 c.restore();return true;
}
function ring(c,x,y,r,k,color){
 c.strokeStyle=color;c.lineWidth=1.2+3*k;c.beginPath();c.ellipse(x,y,r,Math.max(1,r*.71),0,0,TAU);c.stroke();
}
const unit=(n)=>Math.max(0,Math.min(1,n)),ease=n=>1-Math.pow(1-unit(n),3),smooth=(a,b,n)=>{const t=unit((n-a)/(b-a));return t*t*(3-2*t);};
const variation=(i,seed)=>{let n=Math.imul(i+19,374761393)^Math.imul(seed|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
let diceAtlas=null,diceAtlasPromise;
function prepareDiceEffects(){
 if(diceAtlasPromise)return diceAtlasPromise;
 if(typeof root.Image!=='function')return Promise.resolve(false);
 diceAtlasPromise=new Promise(resolve=>{
  const image=new root.Image();
  image.onload=()=>{if(image.naturalWidth===1536&&image.naturalHeight===1120)diceAtlas=image;resolve(!!diceAtlas);};
  image.onerror=()=>resolve(false);
  image.src='assets/effects/pixelfx/dice-impact-v20261124.png';
 });return diceAtlasPromise;
}
function pixelDiceImpact(c,x,y,p,width,alpha=1){
 if(!diceAtlas)return false;
 // One seeded PixelFX ground simulation: flash, fire bloom, cooled dust.
 // Simulation time is supplied by the event; paused frames never advance.
 const frame=Math.min(28,Math.floor(unit(p)*29)),scale=width/256;
 c.save();c.globalAlpha*=alpha;c.imageSmoothingEnabled=true;
 c.drawImage(diceAtlas,frame%6*256,Math.floor(frame/6)*224,256,224,x-128*scale,y-178*scale,256*scale,224*scale);
 c.restore();return true;
}
let diceMaterials;
function materials(){
 if(diceMaterials)return diceMaterials;if(!root.document?.createElement)return null;
 const cloud=(seed,light,shade)=>{
  const tile=root.document.createElement('canvas');tile.width=tile.height=112;const g=tile.getContext('2d');if(!g)return null;
  // Bake irregular, lit smoke lobes once. No texture creation or random source
  // advances during a paused frame, even when several double rolls overlap.
  for(let i=0;i<17;i++){
   const a=i*2.39996,d=(i?14+variation(i,seed)*18:0),x=56+Math.cos(a)*d,y=56+Math.sin(a)*d*.8,r=14+variation(i+20,seed)*15;
   const ink=g.createRadialGradient(x-r*.29,y-r*.38,r*.1,x,y,r);ink.addColorStop(0,light);ink.addColorStop(.52,shade);ink.addColorStop(1,'#5e5a4b00');ellipse(g,x,y,r,r*.85,ink);
  }return tile;
 };
 const flash=root.document.createElement('canvas');flash.width=flash.height=96;const g=flash.getContext('2d');if(!g)return null;
 const glow=g.createRadialGradient(48,48,0,48,48,48);glow.addColorStop(0,'#fffefa');glow.addColorStop(.12,'#fff5d4ee');glow.addColorStop(.42,'#f0ce8a70');glow.addColorStop(1,'#b6843600');g.fillStyle=glow;g.fillRect(0,0,96,96);
 diceMaterials={dust:cloud(73,'#e8d8b8b0','#af977c65'),smoke:cloud(139,'#b2b4a69e','#5f695d78'),warm:cloud(271,'#fff0bdc0','#c8b17a70'),flash};return diceMaterials;
}
function stamp(c,image,x,y,w,h,angle,alpha,blend='source-over'){
 if(!image||alpha<=.001||w<=0||h<=0)return;c.save();c.globalAlpha*=unit(alpha);c.globalCompositeOperation=blend;c.translate(x,y);c.rotate(angle);c.drawImage(image,-w/2,-h/2,w,h);c.restore();
}
function chip(c,x,y,size,angle,teal=false,gold=false,pip=false){
 c.save();c.translate(x,y);c.rotate(angle);
 const light=gold?'#ffe8a1':teal?'#a9dbce':'#fff9df',base=gold?'#d5a14b':teal?'#679f94':'#c8cfb9',shade=gold?'#86602d':teal?'#3d625b':'#7f8c79';
 polygon(c,[[-size,-size*.46],[size*.54,-size*.7],[size,size*.18],[-size*.36,size*.68]],base);
 polygon(c,[[-size,-size*.46],[size*.54,-size*.7],[size*.45,-size*.30],[-size*.68,-size*.02]],light);
 polygon(c,[[size*.45,-size*.30],[size,size*.18],[-size*.36,size*.68],[-size*.29,size*.31]],shade);
 if(pip)ellipse(c,-size*.15,-size*.05,Math.max(.65,size*.19),Math.max(.45,size*.13),gold?'#574326':'#3d5144');
 c.restore();
}
function diceImpact(c,e,p){
 const m=materials(),split=e.style==='diceSplit',child=e.style==='diceChild',r=Math.max(12,e.radius||48),seed=Math.round(e.x*3+e.y*7+(e.face||1)*83),spread=ease(p),fade=1-smooth(.48,1,p);
 const hasPixels=!!diceAtlas;
 // A short contact flash gives way to floor dust, then tumbling solid chips.
 // The result-face labels are rendered later by results(), above this material.
 if(m){
  for(let i=0;i<(child?5:8);i++){
   const a=i*2.39996+variation(i,seed)*.45,d=r*(.15+spread*.7),w=r*(.29+p*.35)*(1+variation(i+30,seed)*.3);
   stamp(c,m.dust,e.x+Math.cos(a)*d,e.y+Math.sin(a)*d*.68,w,w*.48,a*.12,fade*(split?.48:.6));
  }
  for(let i=0;i<(hasPixels?2:child?3:5);i++){
   const a=i*2.39996,d=r*(.06+spread*.22),w=r*(.44+p*.33),rise=p*r*(.22+variation(i+51,seed)*.2);
   stamp(c,i%2?m.smoke:m.warm,e.x+Math.cos(a)*d,e.y-6+Math.sin(a)*d*.4-rise,w,w*.78,a+p*.15,Math.sin(p*Math.PI)*(hasPixels?.12:.36));
  }
  stamp(c,m.flash,e.x,e.y-5,r*(split?.95:1.38),r*.79,0,(1-smooth(.025,hasPixels?.12:.23,p))*(hasPixels?.32:child?.6:.82),'lighter');
 }
 pixelDiceImpact(c,e.x,e.y,p,r*(split?2.7:3.05),child?.84:.96);
 const count=child?7:split?13:10+(e.face>=4?3:0);
 for(let i=0;i<count;i++){
  const a=i*2.39996+variation(i+4,seed)*.75,d=r*(.25+variation(i+6,seed)*.72)*ease(p*.92),groundY=e.y+Math.sin(a)*d*.66,h=Math.sin(p*Math.PI)*(r*.3+variation(i+8,seed)*r*.35),x=e.x+Math.cos(a)*d,size=(child?1.4:2.1)+variation(i+9,seed)*(split?3.4:2.1);
  c.save();c.globalAlpha*=fade;ellipse(c,x+2,groundY+2,size*1.35,size*.45,'#4b493b24');
  chip(c,x,groundY-h-4,size,a+p*(i%2?6:-5),split&&i%3===0,false,i%3===0);
  if(p<.3&&i%2){c.globalAlpha*=1-p/.3;rod(c,[x,groundY-h-4],[x-Math.cos(a)*5,groundY-h-3-Math.sin(a)*3],.8,'#fff3c7');}c.restore();
 }
}
function diceFragments(c,e,p){
 const seed=Math.round(e.x*5+e.y*3),m=materials();
 (e.angles||[]).forEach((a,i)=>{
  const d=(e.range||75)*p,x=e.x+Math.cos(a)*d,y=e.y+Math.sin(a)*d-5,h=Math.sin(p*Math.PI)*(6+variation(i,seed)*7),size=3.1+variation(i+3,seed)*1.3;
  c.save();c.globalAlpha*=1-smooth(.65,1,p);
  const tail=10+7*(1-p);rod(c,[x-Math.cos(a)*tail,y-h-Math.sin(a)*tail],[x,y-h],2.2,'#d2b58072');rod(c,[x-Math.cos(a)*tail*.5,y-h-Math.sin(a)*tail*.5],[x,y-h],.85,'#fff3c7b0');
  if(m)stamp(c,m.dust,x-Math.cos(a)*12,y-Math.sin(a)*12,14+p*12,7+p*5,a,.22);
  chip(c,x,y-h,size,a+p*(i%2?4:-4),i%3===0,false,true);c.restore();
 });
}
function diceWave(c,e,p){
 const a=Math.atan2(e.ty-e.y,e.tx-e.x),distance=Math.hypot(e.tx-e.x,e.ty-e.y),x=e.x+(e.tx-e.x)*p,y=e.y+(e.ty-e.y)*p,width=(e.width||24),m=materials(),fade=1-smooth(.65,1,p);
 // The double-roll ignition stays at the contact point while its pressure
 // front travels, so the fire does not slide along the floor with the wave.
 pixelDiceImpact(c,e.x,e.y,p,width*3.1,.76);
 c.save();c.translate(x,y);c.rotate(a);
 // A low rolling pressure front connects the matching golden dice. Rounded
 // plastic flakes tumble beside its crest instead of three flat bracket lines.
 if(m)for(let i=-2;i<=2;i++){const side=i*width*.32;stamp(c,m.dust,-8-p*8,side,width*.75,width*.48,.2*i,fade*.45);stamp(c,m.warm,3,side,width*.55,width*.4,.14*i,fade*.35);}
 const crest=c.createLinearGradient(-18,0,10,0);crest.addColorStop(0,'#bf8d3b00');crest.addColorStop(.55,'#d8b15a80');crest.addColorStop(.86,'#fff2bacc');crest.addColorStop(1,'#f5d78b00');
 c.fillStyle=crest;c.beginPath();c.moveTo(-17,-width*.64);c.bezierCurveTo(13,-width*.47,18,width*.47,-17,width*.64);c.quadraticCurveTo(-1,0,-17,-width*.64);c.fill();
 for(let i=0;i<6;i++){const side=(i-2.5)*width*.23,lift=Math.sin(p*Math.PI)*(6+i%3*3),drift=-12-variation(i,Math.round(distance))*22;chip(c,drift,side-lift,1.8+i%3*.6,p*(i%2?5:-5),false,true,i%2===0);}
 if(m)stamp(c,m.flash,3,0,24,width*1.4,0,(1-smooth(.05,.22,p))*.45,'lighter');
 c.restore();
}
function event(c,e,fx){
 if(root.FrontRadioArt?.event(c,e,fx))return true;
 if(e.kind==='rosterDieResult')return true; // Draw result faces together above subsequent impact effects.
 if(!['rosterShotgun','rosterReload','rosterBlast','rosterFragments','rosterDiceWave'].includes(e.kind))return false;
 const k=Math.max(0,Math.min(1,e.t/e.max)),p=1-k;c.save();c.globalAlpha*=k;
 if(e.kind==='rosterShotgun'){
  const angle=e.angle,co=Math.cos(angle),si=Math.sin(angle),muzzle=shotgunMuzzleOffset(angle,e.hot),x=e.x+muzzle.x,y=e.y+muzzle.y;
  // The smoke lifts in world space even when the muzzle points downscreen.
  for(let i=0;i<3;i++){
   const drift=9+i*6+p*(12+i*7),side=(i-1)*(2+p*5),r=(3+i*.65)*(1+p*.95);
   const sx=x+co*drift-si*side,sy=y+si*drift+co*side-p*(9+i*2);
   const haze=c.createRadialGradient(sx-r*.2,sy-r*.25,0,sx,sy,r);
   haze.addColorStop(0,'#8f807668');haze.addColorStop(.65,'#63594d35');haze.addColorStop(1,'#534b4500');ellipse(c,sx,sy,r,r,haze);
  }
  c.translate(x,y);c.rotate(angle);
  const flash=Math.max(0,1-p*2.8),length=e.finisher?55:e.hot?44:36;
  if(flash){
   const reach=length*(.65+.35*flash),width=e.finisher?6:4,flame=c.createLinearGradient(0,0,reach,0);
   flame.addColorStop(0,e.hot?'#ffad46':'#e6a957');flame.addColorStop(.48,'#fff5bc');flame.addColorStop(1,e.hot?'#fd7526b0':'#f6c16986');
   for(let i=-2;i<=2;i++){
    c.save();c.rotate(i*Math.PI/36);const tip=reach*(.86+.07*(2-Math.abs(i)));
    polygon(c,[[2,0],[tip*.38,-width*.38],[tip*.69,-width*.28],[tip,0],[tip*.77,width*.32],[tip*.45,width*.42]],flame);c.restore();
   }
   c.globalCompositeOperation='lighter';ellipse(c,4,0,6*flash+1,3*flash+1,'#fff4be');c.globalCompositeOperation='source-over';
  }
  const kick=p*2.5;
  if(kick>.23){const t=(kick-.23)/2.27;c.save();c.translate(-15-t*12,-5-10*Math.sin(t*Math.PI));c.rotate(-.65-t*4);rod(c,[-1.8,0],[1.8,0],2.6,'#a95a35');rod(c,[1.25,0],[2,0],2.8,'#f9cf79');c.restore();}
 }else if(e.kind==='rosterReload'){
  const u=e.source||e,angle=u.aimFace??u.face??0,load=p*4%1,hand=Math.sin(load*Math.PI),x=u.x+Math.cos(angle)*7,y=u.y-24;
  c.translate(x+Math.sin(angle)*(4+hand*5),y+5+hand*4);c.rotate(angle-.7+load*.65);
  rod(c,[-2.5,0],[2.5,0],3.3,'#a84d2e');rod(c,[-2,-.65],[1.4,-.65],1,'#e88a5c');rod(c,[1.7,0],[2.6,0],3.5,'#e9be63');
 }else if(e.kind==='rosterBlast'&&e.style!=='shotgun'){
  diceImpact(c,e,p);
 }else if(e.kind==='rosterBlast'){
  const hot=e.style==='shotgun',r=Math.max(2,(e.radius||48)*(.15+.85*p)),color=hot?'#ff9947':'#ffe09a';
  const g=c.createRadialGradient(e.x,e.y,0,e.x,e.y,r);g.addColorStop(0,hot?'#ffb24a66':'#f5cf7130');g.addColorStop(1,'#f3c57b00');ellipse(c,e.x,e.y,r,r,g);ring(c,e.x,e.y,r,k,color);
  for(let i=0;i<7;i++){const a=TAU*i/7+.12,d=r*(.63+i%3*.11);rod(c,[e.x+Math.cos(a)*d,e.y+Math.sin(a)*d*.72],[e.x+Math.cos(a)*(d+5),e.y+Math.sin(a)*(d+5)*.72-2],2,color);}
 }else if(e.kind==='rosterFragments'){
  diceFragments(c,e,p);
 }else{
  diceWave(c,e,p);
 }
 c.restore();return true;
}
const resultLanes=new WeakMap();
function results(c,game,visible=()=>true){
 root.FrontBlockFlashView?.enemyStatuses(c,game,visible);
 root.FrontRadioArt?.rolls(c,game,visible);
 const results=game.effects.filter(e=>e.kind==='rosterDieResult'&&visible(e));
 if(!results.length)return;
 const tr=c.getTransform(),scale=Math.max(.38,Math.hypot(tr.a,tr.b)/(root.devicePixelRatio||1)),occupied=[];
 c.save();
 for(const e of results){
  const w=(e.child?18:24)/scale,h=(e.child?20:24)/scale;
  const x=e.x;let lane=resultLanes.get(e)||0,y=e.y-23/scale-lane*(h+2/scale);
  while(occupied.some(p=>Math.abs(p.x-x)<(p.w+w)*.5+2/scale&&Math.abs(p.y-y)<(p.h+h)*.5+2/scale)){lane++;y-=h+2/scale;}
  resultLanes.set(e,lane);
  occupied.push({x,y,w,h});
  const k=e.t/e.max,age=e.max-e.t;c.globalAlpha=Math.min(1,k*6);
  if(!e.child&&age<.32&&lane===0){c.save();c.globalAlpha*=Math.min(1,Math.max(0,(.32-age)/.11));die(c,x,e.y-7,9,e.face,e.golden);c.restore();}
  c.fillStyle=e.golden?'#453616':'#203b2d';c.strokeStyle=e.golden?'#f3cd6d':'#d2e7bb';c.lineWidth=1.2/scale;
  c.beginPath();c.roundRect(x-w/2,y-h/2,w,h,4/scale);c.fill();c.stroke();
  c.fillStyle=e.golden?'#fff2b8':'#f5faeb';c.font='800 '+(e.child?14:17)/scale+'px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(String(e.face),x,y+.3/scale);
 }
 c.restore();
}
function field(c,game,visible=()=>true){
 root.FrontBlockFlashView?.air(c,game,visible);
 root.FrontPirateCannonView?.air(c,game,visible);
 root.FrontBubbleOctopusView?.air(c,game,visible);
 for(const d of game.rosterDice||[]){
  if(!visible(d))continue;const t=Math.max(0,Math.min(1,(game.time-d.startedAt)/Math.max(.001,d.landAt-d.startedAt))),h=8+Math.sin(t*Math.PI)*(d.child?20:48)+(1-t)*17,r=d.child?6.5:10.5;
  ellipse(c,d.x,d.y,5+3*(1-t),2.4,'#443b292f');die(c,d.x,d.y-h,r,d.face,d.golden,Math.sin(Math.PI*t)*.85);
 }
}
root.FrontRosterArt={model,shot,event,field,results,burning,prepareDiceEffects};
if(typeof root.Image==='function')prepareDiceEffects();
})(typeof window==='undefined'?globalThis:window);

