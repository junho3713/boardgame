/* Canvas presentation for the searchlight and energy coating. */
(function(root){'use strict';
const TAU=Math.PI*2;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function ellipse(c,x,y,rx,ry,angle=0){
 c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);
}
function hex(c,x,y,r,stretch=1){
 c.beginPath();
 for(let i=0;i<6;i++){
  const a=Math.PI/6+i*Math.PI/3,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*stretch;
  if(i)c.lineTo(px,py);else c.moveTo(px,py);
 }
 c.closePath();
}
function searchlights(c,game,visible=()=>true){
 for(const u of game.units){
  const s=u.droneScan;
  if(u.team!==0||u.hp<=0||s?.targetId==null||game.time>=s.until||game.time<(u.toyStunUntil||0)||!visible(s)&&!visible(u))continue;
  const strength=clamp(Math.min((game.time-s.startedAt)*7,(s.until-game.time)*4),0,1);
  const angle=u.aimFace??u.face??0,r=s.radius,x=u.x+Math.cos(angle)*12;
  const y=u.y-(u.visualFlightHeight??54)+Math.sin(game.time*5+(u.id||0)*1.7)*-2.4+Math.sin(angle)*9;
  c.save();c.globalAlpha=strength;
  const floor=c.createRadialGradient(s.x,s.y,0,s.x,s.y,r);
  floor.addColorStop(0,'#fff3b14c');floor.addColorStop(.72,'#ffe29628');floor.addColorStop(1,'#ffdc8100');
  c.fillStyle=floor;ellipse(c,s.x,s.y,r,r);c.fill();
  c.strokeStyle='#ffe5a056';c.lineWidth=1.2;
  for(let i=0;i<4;i++){
   const a=game.time*.9+i*Math.PI/2;
   c.beginPath();c.arc(s.x,s.y,r*.94,a,a+.36);c.stroke();
  }
  const d=Math.hypot(x-s.x,y-s.y);
  if(d>8){
   const nx=(s.y-y)/d,ny=(x-s.x)/d;
   for(const [width,near,far] of [[.73,'#fff5c067','#ffe4a31c'],[.46,'#fff4ae74','#ffedba00']]){
    const g=c.createLinearGradient(x,y,s.x,s.y);g.addColorStop(0,near);g.addColorStop(1,far);
    c.fillStyle=g;c.beginPath();c.moveTo(x+nx*3,y+ny*3);
    c.lineTo(s.x+nx*r*width,s.y+ny*r*width);
    c.quadraticCurveTo(s.x+ny*r*.18,s.y-nx*r*.18,s.x-nx*r*width,s.y-ny*r*width);
    c.lineTo(x-nx*3,y-ny*3);c.closePath();c.fill();
   }
  }
  c.fillStyle='#fff8d4';ellipse(c,x,y,4.4,3);c.fill();c.restore();
 }
}
// A small hex patch mapped onto the left shoulder of the dome. Store sphere
// coordinates once so each unit can project it to its own footprint and height.
const edgeCells=[];
for(const [row,count] of [1,2,3,3,2].entries()){
 for(let col=0;col<count;col++){
  const size=.165,lat=.22+1.5*row*size;
  const lon=-1.43+Math.sqrt(3)*size*(col+(row%2)*.5);
  const points=[];
  for(let i=0;i<6;i++){
   const a=Math.PI/6+i*TAU/6,latitude=lat+size*Math.sin(a),longitude=lon+size*Math.cos(a);
   const circle=Math.cos(latitude);
   points.push([circle*Math.sin(longitude),circle*Math.cos(longitude),Math.sin(latitude)]);
  }
  edgeCells.push({points,opacity:(.34+.065*row)/(1+.7*col)});
 }
}
function rimArc(c,width,depth,rear){
 const start=rear?Math.PI:0;
 c.beginPath();
 for(let i=0;i<3;i++){
  const from=start+i*Math.PI/3+.033,to=start+(i+1)*Math.PI/3-.033;
  c.moveTo(width*Math.cos(from),depth*Math.sin(from));
  c.ellipse(0,0,width,depth,0,from,to);
 }
 c.strokeStyle=rear?'#5bf7f630':'#55fff63d';c.lineWidth=4.1;c.stroke();
 c.strokeStyle=rear?'#65e8df97':'#9efff5f0';c.lineWidth=rear?1.0:1.35;c.stroke();
}
function domeFront(c,width,height,depth,shine){
 const film=c.createLinearGradient(-width,0,width,0);
 film.addColorStop(0,'#4fefee50');film.addColorStop(.13,'#6bf4ee16');
 film.addColorStop(.34,'#a6fff905');film.addColorStop(.67,'#a6fff900');
 film.addColorStop(.88,'#76efe908');film.addColorStop(1,'#58dce52b');
 c.beginPath();c.ellipse(0,0,width,height,0,Math.PI,TAU);
 c.ellipse(0,0,width,depth,0,0,Math.PI);c.closePath();
 c.fillStyle=film;c.fill();
 c.save();c.clip();
 const crown=c.createLinearGradient(0,-height,0,-height*.58);
 crown.addColorStop(0,'#b9ffff3a');crown.addColorStop(.36,'#89fff419');crown.addColorStop(1,'#89fff400');
 c.fillStyle=crown;c.fillRect(-width,-height,2*width,.42*height);
 c.lineWidth=.72;c.lineJoin='round';
 const opacity=c.globalAlpha;
 for(const cell of edgeCells){
  c.globalAlpha=opacity*cell.opacity;
  c.beginPath();
  for(const [i,[x,front,z]] of cell.points.entries()){
   const px=width*x,py=depth*front-height*z;
   if(i)c.lineTo(px,py);else c.moveTo(px,py);
  }
  c.closePath();c.strokeStyle='#93fffc';c.stroke();
 }
 c.restore();
 const edge=c.createLinearGradient(-width,-height*.4,width,0);
 edge.addColorStop(0,'#82fffaaf');edge.addColorStop(.42,'#d7ffffdb');
 edge.addColorStop(.80,'#8cf8f750');edge.addColorStop(1,'#65dfdd86');
 c.beginPath();c.ellipse(0,0,width,height,0,Math.PI,TAU);
 c.strokeStyle=edge;c.lineWidth=1.05;c.stroke();
 const gleam=c.createLinearGradient(-width*.76,0,width*.53,0);
 gleam.addColorStop(0,'#58fff600');gleam.addColorStop(.32,'#8cfff6a0');
 gleam.addColorStop(.55,'#ebfffdf2');gleam.addColorStop(1,'#8cfff600');
 c.save();c.globalAlpha*=shine;
 c.beginPath();c.ellipse(0,0,width,height,0,Math.PI*1.21,Math.PI*1.68);
 c.strokeStyle='#5afaf630';c.lineWidth=3.8;c.stroke();
 c.strokeStyle=gleam;c.lineWidth=1.75;c.stroke();c.restore();
 rimArc(c,width,depth,false);
}
function activeShieldHp(unit,time){
 const shield=unit.droneShield;
 return shield&&time<shield.until?Math.max(0,shield.hp):0;
}
function shield(c,u,time,radius,layer='front'){
 const hp=activeShieldHp(u,time);
 if(!hp)return;
 const s=u.droneShield;
 const vehicle=u.type==='tank'||u.type==='lucky',flying=u.type==='drone';
 const width=flying?47:vehicle?Math.max(55,radius*2.12):u.type==='leader'?40:clamp(radius*2.65,36,43);
 const height=flying?53:vehicle?width*1.21:u.type==='sniper'||u.appearance==='rina'?72:65;
 const depth=width*(vehicle ? .58 : .42);
 const lift=flying?(u.visualFlightHeight??54)+Math.sin(time*5+(u.id||0)*1.7)*2.4-9:0;
 c.save();c.translate(0,1-lift);c.filter='none';c.lineCap='round';
 if(u.goldenSummon&&u.type==='tank')c.scale(1.5,1.5);
 c.globalAlpha*=clamp((s.until-time)*3,0,1)*(.58+.42*clamp(hp/s.maxHp,0,1));
 if(layer==='ground'){
  c.save();c.scale(width,depth);
  const glow=c.createRadialGradient(0,0,.75,0,0,1.15);
  glow.addColorStop(0,'#30e8df00');glow.addColorStop(.52,'#46f7ec2c');glow.addColorStop(1,'#30e8df00');
  c.fillStyle=glow;c.fillRect(-1.16,-1.16,2.32,2.32);c.restore();
  rimArc(c,width,depth,true);
 }else{
  domeFront(c,width,height,depth,.91+.09*Math.sin(time*2.1+(u.id||0)));
 }
 c.restore();
}
function event(c,e){
 if(e.kind!=='droneShieldBreak'&&e.kind!=='dronePickupPulse')return false;
 const k=clamp(1-e.t/e.max,0,1),r=3+(e.radius-3)*(1-(1-k)**2);
 c.save();c.globalAlpha=1-k;c.lineWidth=3-1.7*k;c.strokeStyle='#bffaff';
 ellipse(c,e.x,e.y,r,e.kind==='droneShieldBreak'?r*.64:r);c.stroke();
 if(e.kind==='droneShieldBreak'){
  c.strokeStyle='#7ee6ff';
  for(let i=0;i<8;i++){
   const a=i*TAU/8+e.x*.07;
   hex(c,e.x+Math.cos(a)*r*.78,e.y+Math.sin(a)*r*.78-14+14*k,4.5-2.2*k);
   c.stroke();
  }
 }
 c.restore();return true;
}
root.FrontSupportDroneView={searchlights,shield,event,activeShieldHp};
})(typeof window==='undefined'?globalThis:window);
