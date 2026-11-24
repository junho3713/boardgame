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
function die(c,x,y,r,face=5,gold=false,tilt=0){
 c.save();c.translate(x,y);c.rotate(tilt);
 const dark=gold?'#77421a':'#424d65',light=gold?'#fff0a5':'#fff9df';
 polygon(c,[[-r,-r*.64],[-r*.36,-r*1.04],[r,-r*.78],[r*.42,-r*.35]],light);
 polygon(c,[[r*.42,-r*.35],[r,-r*.78],[r,r*.51],[r*.42,r*.92]],gold?'#b87527':'#8595aa');
 c.transform(1,.19,0,1,-r,-r*.63);
 const g=c.createLinearGradient(0,0,r*1.45,r*1.25);g.addColorStop(0,light);g.addColorStop(1,gold?'#e5a53b':'#d6d6c6');
 c.fillStyle=g;c.strokeStyle=dark;c.lineWidth=Math.max(.6,r*.08);
 c.beginPath();c.roundRect(0,0,r*1.43,r*1.28,r*.17);c.fill();c.stroke();
 for(const [dx,dy] of pips[face]||pips[5])ellipse(c,r*(.71+dx*.4),r*(.64+dy*.36),r*.115,r*.115,dark);
 c.restore();
}
function bodyProject(angle){const co=Math.cos(angle),si=Math.sin(angle);return (f,s,z)=>[f*co-s*si,(f*si+s*co)*.66-z];}
function infantry(c,u,time,evolved,dice){
 const angle=Number.isFinite(u.aimFace)?u.aimFace:u.face||0,project=bodyProject(angle),step=Math.sin(u.walk||0);
 const shell=evolved?'#e4a044':'#b45430',suit=dice?'#537776':'#688457',trim=dice?'#9fccc2':'#b9c78a';
 ellipse(c,2,2,17,6,'#28362942');
 for(const side of [-1,1]){
  const foot=project(side*step*3.5,side*6,3),hip=project(0,side*4,17);
  rod(c,foot,hip,8,'#394536');const toe=project(side*step*3.5+2,side*6,3);
  ball(c,...toe,6,3.7,'#7a7963','#4b5143','#2e382f');
 }
 const bob=Math.abs(step)*.9;c.translate(0,-bob);
 const torso=project(-1,0,25),neck=project(0,0,35),head=project(.7,0,41),hat=project(-.5,0,47);
 const pack=project(-8,0,26);ball(c,...pack,8.6,9.3,dice?'#b6b598':'#adab81',dice?'#787c68':'#788061','#495841');
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
 const brim=project(1.4,0,44);ellipse(c,...brim,11.1,2.1,dice?'#476866':'#4a6644');
 const ridge=project(-2,-1,49);ellipse(c,ridge[0]-2.5,ridge[1]-1.6,4.5,.8,dice?'#acd6c7':'#bed1a0',-.16);
 const mark=project(6,3,47);ellipse(c,...mark,1.6,1.8,dice?'#f7e4b8':shell);
 const front=project(12,-3,28),rear=project(4,6,27);
 for(const [side,hand] of [[-1,front],[1,rear]]){const shoulder=project(-1,side*8,31);rod(c,shoulder,hand,5.4,suit);ball(c,...hand,3.2,3,'#d0c393','#a7a16d','#56694c');}
 if(dice){
  const pocket=project(-4,8,22);ball(c,...pocket,4.5,4.2,'#c9b88c','#9d865b','#6e6549');
  die(c,front[0],front[1]-4,8.5,evolved?6:5,evolved,-.16);
  if(evolved){const other=project(2,11,24);die(c,...other,6.2,3,true,.19);}
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
 const angle=u.aimFace??u.face??0,P=bodyProject(angle),hover=(u.visualFlightHeight??54)+Math.sin(time*5+(u.id||0))*1.6;
 ellipse(c,1,2,16,5,'#2137343a');c.translate(0,-hover);if(evolved)c.scale(1.3,1.3);
 const arms=[[-12,-11],[-12,11],[12,-11],[12,11]].map(([f,s],i)=>({p:P(f,s,2),i})).sort((a,b)=>a.p[1]-b.p[1]);
 for(const {p,i} of arms){rod(c,[0,2],p,4,'#344b49');rod(c,[0,1],p,1.4,'#94ad96');
  ellipse(c,...p,10,4.9,'#344c4b');ellipse(c,p[0],p[1]-.5,8.6,3.7,'#96c6bb8c');
  const a=time*42+i*1.7,dx=Math.cos(a)*7.8,dy=Math.sin(a)*3.4;
  rod(c,[p[0]-dx,p[1]-dy],[p[0]+dx,p[1]+dy],1.7,'#d9ebe0');
  ball(c,...p,2.2,2,'#fbefd0','#8b9d8a','#374d45');
 }
 ball(c,0,1,9.2,7,'#d2dac0','#6b8c79','#354f4d');const lens=P(6.5,0,0);
 ball(c,...lens,4.3,3.7,'#dbffec',evolved?'#38e8c9':'#71becd','#285759');
 for(const s of [-1,1]){const lamp=P(-7,s*9,2);ellipse(c,...lamp,1.5,1.1,s>0?'#f2a879':'#8bf5d2');}
}
function paintModel(c,u,time,evolved){
 if(u.team!==0||!['rifle','guntruck','drone'].includes(u.type))return false;
 c.save();if(u.type==='drone')drone(c,u,time,evolved);else infantry(c,u,time,evolved,u.type==='guntruck');c.restore();return true;
}
const portraits=new Map();
function portrait(type){
 if(!['rifle','guntruck','drone'].includes(type)||!root.document?.createElement)return '';
 if(!portraits.has(type)){
  const tile=document.createElement('canvas');tile.width=112;tile.height=100;const c=tile.getContext('2d');if(!c)return '';
  const g=c.createRadialGradient(52,50,8,55,52,62);g.addColorStop(0,'#c4ccaf');g.addColorStop(1,'#8f9d84');c.fillStyle=g;c.fillRect(0,0,112,100);
  c.translate(51,type==='drone'?126:89);c.scale(1.45,1.45);model(c,{type,team:0,face:.55,id:1,walk:0},.2,false);portraits.set(type,tile.toDataURL('image/png'));
 }
 return portraits.get(type);
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
 if(u.team!==0||!['rifle','guntruck','drone'].includes(u.type))return false;
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
function shot(c,p){
 if(!['shotgunPellet','droneBullet'].includes(p.rosterKind))return false;
 const drone=p.rosterKind==='droneBullet',a=p.commandAngle??Math.atan2(p.target.y-p.y,p.target.x-p.x),len=drone?12:p.finisher?18:9;
 let height=drone?54:22;if(p.target&&p.source){const span=Math.hypot(p.target.x-p.source.x,p.target.y-p.source.y),left=Math.min(1,Math.hypot(p.target.x-p.x,p.target.y-p.y)/Math.max(1,span));height=(drone?30:22)*left+12*(1-left);}
 const x=p.x,y=p.y-height,dx=Math.cos(a)*len,dy=Math.sin(a)*len;
 c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(x-dx,y-dy,x,y);
 g.addColorStop(0,'#ffbe5400');g.addColorStop(.5,drone?'#64eddc':p.hot?'#f77a2c':'#cdac76');g.addColorStop(1,drone?'#d5fff9':p.hot?'#ffe986':'#fff0c6');rod(c,[x-dx,y-dy],[x,y],p.finisher?3:drone?2:1.7,g);c.restore();return true;
}
function ring(c,x,y,r,k,color){
 c.strokeStyle=color;c.lineWidth=1.2+3*k;c.beginPath();c.ellipse(x,y,r,Math.max(1,r*.71),0,0,TAU);c.stroke();
}
function event(c,e){
 if(!['rosterShotgun','rosterReload','rosterBlast','rosterFragments','rosterDiceWave'].includes(e.kind))return false;
 const k=Math.max(0,Math.min(1,e.t/e.max)),p=1-k;c.save();c.globalAlpha*=k;
 if(e.kind==='rosterShotgun'){
  c.translate(e.x+Math.cos(e.angle)*16,e.y-24+Math.sin(e.angle)*11);c.rotate(e.angle);const w=e.finisher?13:e.hot?9:5,reach=(e.finisher?57:e.hot?39:21)*(.55+.45*k);
  c.globalCompositeOperation='lighter';const g=c.createLinearGradient(0,0,reach,0);g.addColorStop(0,'#fff6bf');g.addColorStop(.32,e.hot?'#ffb032':'#eed294');g.addColorStop(1,e.hot?'#e2471600':'#dfbc7700');
  polygon(c,[[0,0],[reach*.32,-w],[reach*.6,-w*.42],[reach,-w*.75],[reach*.7,0],[reach*.9,w*.8],[reach*.4,w*.45],[reach*.2,w]],g);
 }else if(e.kind==='rosterReload'){
  const u=e.source||e,x=u.x+10,y=u.y-22-(Math.sin(p*Math.PI)*10);c.translate(x,y);c.rotate(p*2.7-.55);c.fillStyle='#b96a40';c.fillRect(-2,-4,4,8);c.fillStyle='#e6b76c';c.fillRect(-2,2,4,2);
 }else if(e.kind==='rosterBlast'){
  const hot=e.style==='shotgun',r=Math.max(2,(e.radius||48)*(.15+.85*p)),color=hot?'#ff9947':'#ffe09a';
  if(!hot&&e.face&&p<.7)die(c,e.x,e.y-8-p*11,7,e.face,e.style==='diceSplit');
  const g=c.createRadialGradient(e.x,e.y,0,e.x,e.y,r);g.addColorStop(0,hot?'#ffb24a66':'#f5cf7130');g.addColorStop(1,'#f3c57b00');ellipse(c,e.x,e.y,r,r,g);ring(c,e.x,e.y,r,k,color);
  for(let i=0;i<7;i++){const a=TAU*i/7+.12,d=r*(.63+i%3*.11);rod(c,[e.x+Math.cos(a)*d,e.y+Math.sin(a)*d*.72],[e.x+Math.cos(a)*(d+5),e.y+Math.sin(a)*(d+5)*.72-2],2,color);}
 }else if(e.kind==='rosterFragments'){
  for(const a of e.angles||[]){const reach=(e.range||75)*p,dx=Math.cos(a),dy=Math.sin(a);rod(c,[e.x+dx*(reach-9),e.y+dy*(reach-9)-4],[e.x+dx*reach,e.y+dy*reach-4],2.5,'#e6bc6e');}
 }else{
  const a=Math.atan2(e.ty-e.y,e.tx-e.x),x=e.x+(e.tx-e.x)*p,y=e.y+(e.ty-e.y)*p,size=(e.width||24)*.5;
  c.translate(x,y);c.rotate(a);for(let i=0;i<3;i++){c.strokeStyle=i?'#fff1aa':'#fbc65e';c.lineWidth=i?1.5:4;c.beginPath();c.moveTo(-8-i*4,-size);c.quadraticCurveTo(13-i*4,0,-8-i*4,size);c.stroke();}
 }
 c.restore();return true;
}
function field(c,game,visible=()=>true){
 for(const d of game.rosterDice||[]){
  if(!visible(d))continue;const t=Math.max(0,Math.min(1,(game.time-d.startedAt)/Math.max(.001,d.landAt-d.startedAt))),h=8+Math.sin(t*Math.PI)*(d.child?20:48)+(1-t)*17,r=d.child?5:8;
  ellipse(c,d.x,d.y,5+3*(1-t),2.4,'#443b292f');die(c,d.x,d.y-h,r,d.face,d.golden,Math.sin(t*Math.PI*3)*.45);
 }
 for(const l of game.rosterLasers||[]){
  if(!visible(l))continue;const x=l.x,y=l.y-54,tx=l.x+Math.cos(l.angle)*l.range,ty=l.y+Math.sin(l.angle)*l.range-10;
  c.save();c.globalCompositeOperation='lighter';rod(c,[x,y],[tx,ty],7,'#39ffcd42');rod(c,[x,y],[tx,ty],3.4,'#59f3dbb0');rod(c,[x,y],[tx,ty],1.3,'#d5fff0');ellipse(c,tx,ty,3,2,'#8affd8');c.restore();
 }
}
root.FrontRosterArt={model,portrait,shot,event,field,burning};
})(typeof window==='undefined'?globalThis:window);

