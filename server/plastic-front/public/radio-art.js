/* World-space paint for the signal corps. All animation follows the combat clock. */
(function (root) {
'use strict';
const tau = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => 1 - (1 - clamp(n)) ** 3;
const preference = root.matchMedia?.('(prefers-reduced-motion: reduce)');
const quiet = game => game?.reducedMotion ?? preference?.matches ?? false;
const pipLayout = [[], [[0,0]], [[-1,-1],[1,1]], [[-1,-1],[0,0],[1,1]],
 [[-1,-1],[-1,1],[1,-1],[1,1]], [[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],
 [[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]];
function ellipse(c, x, y, w, h, color) {
 if (w <= 0 || h <= 0) return;
 c.fillStyle = color;
 c.beginPath(); c.ellipse(x, y, w, h, 0, 0, tau); c.fill();
}
function gradient(c, x, y, radius, ...stops) {
 const g = c.createRadialGradient(x, y, 0, x, y, radius);
 for (const [at, color] of stops) g.addColorStop(at, color);
 return g;
}
function glow(c, x, y, r, h, center, edge) {
 if (r <= 0 || h <= 0) return;
 c.save(); c.translate(x,y); c.scale(1,h/r);
 ellipse(c,0,0,r,r,gradient(c,0,0,r,[0,center],[.53,edge],[1,'rgba(100,55,30,0)']));
 c.restore();
}
function stroke(c, width, color, path) {
 c.lineWidth = width; c.strokeStyle = color; c.beginPath(); path(); c.stroke();
}
function polygon(c, points, color) {
 c.beginPath(); c.moveTo(...points[0]);
 for (let i = 1; i < points.length; i++) c.lineTo(...points[i]);
 c.closePath(); c.fillStyle = color; c.fill();
}
function seedFor(e) { return Math.floor(e.x * .67 + e.y * .41 + (e.seq || 0) * 71); }
function noise(seed, i) {
 let h = Math.imul(seed + Math.imul(i, 1597334677), 2246822519);
 return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
function face(c,x,y,n,gold,angle) {
 c.save(); c.translate(x,y); c.rotate(angle);
 c.fillStyle = gold ? '#795128' : '#364c42';
 c.beginPath(); c.roundRect(-8,-8,17,19,3.4); c.fill();
 const ivory = c.createLinearGradient(-6,-9,6,9);
 ivory.addColorStop(0,gold ? '#fff5bc' : '#fffdf1');
 ivory.addColorStop(.68,gold ? '#edc064' : '#e1e7cc');
 ivory.addColorStop(1,gold ? '#bb8138' : '#a5b3a1');
 c.fillStyle = ivory; c.beginPath(); c.roundRect(-9,-9,17,17,3.5); c.fill();
 stroke(c,.8,gold ? '#ffe393' : '#fbffe9',()=>c.roundRect(-8.3,-8.3,15.7,15.7,3));
 for (const [a,b] of pipLayout[n] || []) {
  ellipse(c,a*4.5-.5,b*4.5-.1,n===1?2.25:1.55,n===1?2.25:1.55,'#ffffd6');
  ellipse(c,a*4.5-.5,b*4.5-.7,n===1?2.25:1.55,n===1?2.25:1.55,gold?'#513516':'#263c34');
 }
 c.restore();
}
function rolls(c,game,visible) {
 const rolling = game.effects.filter(e=>e.kind==='radioRoll' && visible(e.source || e));
 if (!rolling.length) return;
 const tr = c.getTransform();
 const scale = Math.max(.4, Math.hypot(tr.a,tr.b) / (root.devicePixelRatio || 1));
 const lanes = [];
 for (const e of rolling) {
  const u=e.source || e, age=e.max-e.t, hit=e.a===e.b, reduced=quiet(game);
  const spinning=!reduced && age<.23;
  const tick=Math.floor(age*23), first=e.golden?3:1, count=7-first;
  const faces=spinning ? [first+(e.a-first+tick)%count,first+(e.b-first+5*tick)%count] : [e.a,e.b];
  const x=u.x*scale;
  let y=(u.y-57)*scale-10;
  while(lanes.some(lane=>Math.abs(lane.x-x)<41 && Math.abs(lane.y-y)<22)) y-=23;
  lanes.push({x,y});
  c.save(); c.globalAlpha *= clamp(e.t/.16);
  if (hit && !spinning) {
   const lampX=u.x+7, lampY=u.y-38;
   glow(c,lampX,lampY,15,15,'#fff9b6','#ffc44772');
   ellipse(c,lampX,lampY,2.3,2.3,'#fffdee');
   const wave=reduced?.46:clamp((age-.23)/.52), r=5+wave*17;
   c.save(); c.globalAlpha*=1-wave;
   stroke(c,1.6,'#ffdb85',()=>c.arc(lampX,lampY,r,-1.5,-.22));
   stroke(c,1.2,'#ffeab0',()=>c.arc(lampX,lampY,r+4,-1.5,-.22)); c.restore();
  }
  c.translate(x/scale,y/scale); c.scale(1/scale,1/scale);
  const jump=spinning ? 3*Math.sin(age/.23*Math.PI):0;
  const twist=spinning ? .37*Math.sin(age*38):0;
  face(c,-10,-jump,faces[0],hit||e.golden,twist-.035);
  face(c,10,-jump*.55,faces[1],hit||e.golden,-twist+.035);
  c.restore();
 }
}
function flame(c,x,y,width,height,bend) {
 const fill = c.createLinearGradient(0,y-height,0,y);
 fill.addColorStop(0,'#ed4c1c59'); fill.addColorStop(.55,'#fa6824db'); fill.addColorStop(1,'#e5a633ee');
 c.fillStyle=fill; c.beginPath(); c.moveTo(x-width,y);
 c.bezierCurveTo(x-width*1.3,y-height*.43,x+bend-width*.1,y-height*.51,x+bend,y-height);
 c.bezierCurveTo(x+width*.42+bend,y-height*.53,x+width*1.6,y-height*.21,x+width,y);
 c.quadraticCurveTo(x,y+width*.4,x-width,y); c.fill();
 c.fillStyle='#ffe297'; c.beginPath(); c.moveTo(x-width*.45,y);
 c.quadraticCurveTo(x-width*.5,y-height*.22,x+bend*.5,y-height*.56);
 c.quadraticCurveTo(x+width*.67,y-height*.16,x+width*.4,y); c.closePath(); c.fill();
}
// Burn outward from the actual impact to each fuel pool. The pools remain fixed on the board.
function burningTrail(c,x,y,r,progress,fade) {
 const side=(x<0?-1:1)*r*.16, cx=x*.57-side,cy=y*.56+side*.51;
 const q=ease(progress), endX=2*(1-q)*q*cx+q*q*x,endY=2*(1-q)*q*cy+q*q*y;
 const path=()=>{c.moveTo(0,0);c.quadraticCurveTo(q*cx,q*cy,endX,endY);};
 c.save();c.lineCap='round';c.globalAlpha*=fade;
 stroke(c,Math.max(3,r*.066),'#612a20b8',path);
 stroke(c,Math.max(1.4,r*.032),'#e8662dc2',path);
 if(progress<1)glow(c,endX,endY,6,3,'#fff5a0','#ff8c36aa');
 c.restore();
}
function ground(c,game,visible=()=>true,fx) {
 for(const z of game.radioFireZones || []) {
  if (!visible(z)) continue;
  const age=game.time-z.startedAt, life=z.until-game.time;
  if (age<0 || life<=0) continue;
  const fade=clamp(age/.14)*clamp(life/.4), r=z.radius, seed=seedFor(z);
  const time=quiet(game) ? .48 : age;
  c.save(); c.translate(z.x,z.y); c.globalAlpha*=fade;
  ellipse(c,0,0,r,r,gradient(c,0,0,r,[0,'#73361ca8'],[.58,'#9c41298c'],[.87,'#bd552f67'],[1,'#6a362300']));
  const reduced=quiet(game),sheet=impactSheet();
  const textures=fx?.prepareImpactMaterials?.();
  // Unequal pockets of spilled fuel. The scorched islands stay fixed while wisps rise from each pool.
  const pockets=r>105?8:5;
  for(let i=0;i<pockets;i++) {
   const a=i*2.39996+seed*.08+(noise(seed,i+13)-.5)*.9;
   const d=r*(i===0?.05:.32+.41*noise(seed,i+35));
   const x=Math.cos(a)*d, y=Math.sin(a)*d;
   const wide=r*(.14+.19*noise(seed,i+4)), depth=wide*(.38+.24*noise(seed,i+14));
   const spread=reduced?1:clamp((age-i*.035)/.47);
   burningTrail(c,x,y,r,spread,.90-.31*clamp(age/.95));
   if(!spread)continue;
   glow(c,x,y,wide,depth,'#462219ee','#b745139c');
   if(sheet){
    const phase=reduced?.42:(time*(.88+.19*noise(seed,i))+noise(seed,i+8))%1;
    const width=Math.max(22,wide*2.1)*(.6+.4*spread);
    paintVolume(c,sheet,3,phase,x,y,width*(noise(seed,i+51)>.5?1:-1),width*(.76+.24*noise(seed,i+17)));
   }
   if(!reduced&&textures?.smoke?.length){
    const rise=(time*.76+noise(seed,i+42))%1;
    heatCloud(c,textures.smoke[i%3],x+rise*wide*.35,y-rise*wide*.7,wide*(.8+rise*.5),wide,Math.sin(rise*Math.PI)*.38);
   }
   const pieces=2+(i%3);
   for(let j=0;j<pieces;j++) {
    const k=5*i+j, phase=time*(3.8+2.1*noise(seed,k+40))+k*1.73;
    const px=x+(noise(seed,k+6)-.5)*wide*1.4,py=y+(noise(seed,k+38)-.5)*depth;
    const s=(3+r*.046)*(j===0?1.3:.39+.62*noise(seed,k+17));
    glow(c,px,py,s*1.8,s*.64,'#ffd075c9','#ef792278');
    if(!sheet&&textures) {
     const h=s*(2.55+.55*Math.sin(phase));
     c.save();c.globalAlpha*=.88;c.drawImage(textures.fire[k%3],px-s*1.32,py-h*.85,s*2.65,h);c.restore();
    }
    if(!sheet)flame(c,px,py,s*(.27+.19*noise(seed,k+23)),s*(1.1+.46*Math.sin(phase)),s*.83*Math.sin(phase*.71));
    const ember=(time*(.38+.58*noise(seed,k+5))+noise(seed,k+13))%1;
    c.save();c.globalAlpha*=1-ember;
    ellipse(c,px+Math.sin(ember*4+k)*3+ember*5,py-s*(1.4+ember*2.4),1.15,.73,'#ffdb8c');c.restore();
   }
  }
  c.restore();
 }
}

const CELL_WIDTH=144,CELL_HEIGHT=216;
const atlas=typeof root.Image==='function'?new root.Image():null;
if(atlas)atlas.src='assets/effects/radio-strike-models-v214.webp';
// Decode on the first radio roll, outside the game's initial asset load.
const TILE=192,FRAMES=24,COLUMNS=6,ROWS=FRAMES/COLUMNS;
let volumeAtlas;
function impactSheet(){
 if(!volumeAtlas&&typeof root.Image==='function'){
  volumeAtlas=new root.Image();
  volumeAtlas.src='assets/effects/radio-impact-volume-v1.webp';
 }
 return volumeAtlas?.complete&&volumeAtlas.naturalWidth===TILE*COLUMNS&&volumeAtlas.naturalHeight===TILE*ROWS*4?volumeAtlas:null;
}
function paintVolume(c,sheet,band,p,x,y,width,height){
 const f=Math.min(FRAMES-1,Math.floor(clamp(p)*FRAMES));
 c.save();c.translate(x,y);if(width<0)c.scale(-1,1);
 const w=Math.abs(width);
 c.drawImage(sheet,(f%COLUMNS)*TILE,(band*ROWS+Math.floor(f/COLUMNS))*TILE,TILE,TILE,-w/2,-height*151/TILE,w,height);
 c.restore();
}
const prop={
 incendiary:{column:0,size:59,tail:.60,drop:179,shift:-91,flight:.55,ink:'#ffd483',glare:'#fff0a9',wake:'#ff984f'},
 missile:{column:1,size:65,tail:.79,drop:194,shift:107,flight:.47,ink:'#c1eeef',glare:'#e3ffff',wake:'#8bc6cf'},
 nuke:{column:2,size:95,tail:.97,drop:256,shift:0,flight:.81,ink:'#ffd390',glare:'#fff4cf',wake:'#efaa61'}
};
function assetReady(){
 return atlas?.complete&&atlas.naturalWidth===CELL_WIDTH*3&&atlas.naturalHeight===CELL_HEIGHT*4;
}
function flash(c,r,alpha,color){
 if(alpha<=0)return;
 c.save();c.globalAlpha*=alpha;c.globalCompositeOperation='screen';
 glow(c,0,-2,r,r*.51,'#ffffeb',color);
 c.restore();
}
function guidance(c,e,p,style,reduced){
 const nuke=e.strike==='nuke',r=e.radius, clock=reduced?.18:p;
 c.save();c.lineCap='round';
 c.globalAlpha*=nuke?.56+.27*p:.35+.36*p;
 if(nuke||!e.seq){
  c.setLineDash(nuke?[9,8]:[4,7]);c.lineDashOffset=reduced?0:-p*16;
  stroke(c,nuke?2:1.35,style.ink,()=>c.arc(0,0,r,0,tau));c.setLineDash([]);
  const inner=r*(1-.75*ease(clock));
  c.save();c.globalAlpha*=.41;
  stroke(c,1.15,style.ink,()=>c.arc(0,0,inner,0,tau));c.restore();
  for(let i=0;i<4;i++){
   const a=tau*(i+.5)/4,x=Math.cos(a),y=Math.sin(a);
   stroke(c,nuke?2.8:1.5,style.glare,()=>{c.moveTo(x*(r-9),y*(r-9));c.lineTo(x*(r+3),y*(r+3));});
  }
 }
 const lock=(nuke?26:16)*(1-.42*ease(clock));
 for(let i=0;i<4;i++){
  const a=tau*i/4+Math.PI/4;
  stroke(c,1.55,style.glare,()=>c.arc(0,0,lock,a-.25,a+.25));
 }
 stroke(c,1.05,style.ink,()=>{c.moveTo(-4,0);c.lineTo(4,0);c.moveTo(0,-4);c.lineTo(0,4);});
 c.restore();
}
function flightPoint(style,seq,p){
 const lane=seq===1?-.67:seq===2?.62:1,remain=1-p;
 return {x:style.shift*lane*remain,y:-style.drop*(1-p**1.75)};
}
function missileWake(c,style,seq,t){
 // Sample the shell's path in world space. Each trail bends into its own landing lane.
 if(t<=.025)return;
 const steps=9, length=Math.min(.54,t),left=[],right=[];
 for(let i=0;i<=steps;i++){
  const u=i/steps, at=t-u*length, pos=flightPoint(style,seq,at);
  const tangent=flightPoint(style,seq,at+.005),dx=tangent.x-pos.x,dy=tangent.y-pos.y;
  const norm=Math.hypot(dx,dy)||1,width=1.4+4.8*u;
  const x=pos.x-dx/norm*style.size*style.tail,y=pos.y-dy/norm*style.size*style.tail;
  left.push([x-dy/norm*width,y+dx/norm*width]);right.push([x+dy/norm*width,y-dx/norm*width]);
 }
 const [x,y]=left[0],[tailX,tailY]=left[steps];
 const g=c.createLinearGradient(x,y,tailX,tailY);
 g.addColorStop(0,'#e5ffffcc');g.addColorStop(.46,'#c1eeee80');g.addColorStop(1,'#bbd9db00');
 polygon(c,left.concat(right.reverse()),g);
}
function drawFallback(c,width,length,style){
 const metal=c.createLinearGradient(-width/2,0,width/2,0);
 metal.addColorStop(0,'#273333');metal.addColorStop(.39,style.wake);metal.addColorStop(1,'#283531');
 const half=width*.32;
 polygon(c,[[-half,-length*.93],[-width*.5,-length],[-width*.44,-length*.77],[-half,-length*.66]],style.ink);
 polygon(c,[[half,-length*.93],[width*.5,-length],[width*.44,-length*.77],[half,-length*.66]],style.ink);
 polygon(c,[[-half,-length],[half,-length],[half,-length*.19],[0,0],[-half,-length*.19]],metal);
 c.fillStyle=style.glare;c.fillRect(-half,-length*.39,width*.64,2);
}
function incoming(c,e,p,fx){
 const style=prop[e.strike],reduced=quiet(),nuke=e.strike==='nuke';
 guidance(c,e,p,style,reduced);
 if(e.t>style.flight)return;
 const travel=clamp(1-e.t/style.flight),seq=e.seq||0;
 const point=flightPoint(style,seq,travel);
 const next=flightPoint(style,seq,Math.min(1.001,travel+.015));
 const angle=Math.atan2(point.x-next.x,next.y-point.y);
 if(!reduced&&e.strike==='missile')missileWake(c,style,seq,travel);
 glow(c,point.x*.33,0,13+(nuke?10:0)+travel*9,6+travel*5,'#181b1bce','#332b294c');
 c.save();c.translate(point.x,point.y);c.rotate(angle);
 const length=style.size*style.tail, w=style.size*CELL_WIDTH/CELL_HEIGHT;
 const textures=fx?.prepareImpactMaterials?.();
 const seed=seedFor(e),jet=nuke?50:34;
 if(!reduced){
  // Scaled puffs separate along the wake, so the exhaust reads as moving through the air.
  for(let i=0;i<5;i++){
   const q=i/5,side=(noise(seed,i)-.5)*q*w*(.68+.35*Math.sin(travel*10+i));
   const y=-length-jet*(q+.13),size=8+q*(nuke?23:12);
   c.save();c.globalAlpha*=(1-q)*.61;
   const image=textures?.smoke?.[i%3];
   if(image)c.drawImage(image,side-size/2,y-size/2,size,size);
   else glow(c,side,y,size*.57,size*.4,'#e4d9c5b8','#a39c8c80');
   c.restore();
  }
 }
 const plume=c.createLinearGradient(0,-length-jet,0,-length+3);
 plume.addColorStop(0,'#d8a87900');plume.addColorStop(.38,style.wake+'a0');
 plume.addColorStop(.76,style.glare);plume.addColorStop(1,'#ffffed');
 const nozzle=w*(nuke?.12:.092),delta=reduced?0:Math.sin(travel*44)*3;
 c.beginPath();c.moveTo(-nozzle,-length+4);
 c.bezierCurveTo(-nozzle*1.7,-length-12,nozzle*.2,-length-jet*.72,delta,-length-jet);
 c.bezierCurveTo(nozzle*.32,-length-jet*.65,nozzle*1.6,-length-11,nozzle,-length+4);
 c.closePath();c.fillStyle=plume;c.fill();
 if(assetReady()){
  const frame=reduced?0:Math.min(3,Math.floor(travel*4));
  c.drawImage(atlas,style.column*CELL_WIDTH,frame*CELL_HEIGHT,CELL_WIDTH,CELL_HEIGHT,-w/2,-style.size,w,style.size);
 }else drawFallback(c,w,length,style);
 c.restore();
}
// A ring reaches the actual damage radius before it fades, while the plume rises above it.
function pressure(c,r,p,style,power,reduced){
 const q=clamp(p/(power===3?.49:.72)),radius=reduced?r*.83:r*(.18+.82*ease(q));
 if(q===1)return;
 c.save();c.globalAlpha*=clamp(1-q)*(reduced?.46:.86);
 stroke(c,power+1.5,style.wake+'99',()=>c.arc(0,0,radius,0,tau));
 stroke(c,1.2,style.glare,()=>c.arc(0,0,radius,0,tau));
 if(power>1&&!reduced)stroke(c,1.05,style.ink+'a8',()=>c.arc(0,0,radius*(.82+.10*q),0,tau));
 c.restore();
}
function heatCloud(c,image,x,y,w,h,alpha){
 if(!image||alpha<=0)return;
 c.save();c.globalAlpha*=alpha;c.drawImage(image,x-w*.5,y-h*.55,w,h);c.restore();
}
function groundSurge(c,e,p,textures){
 const nuke=e.strike==='nuke',seed=seedFor(e),life=nuke?.73:.60;
 if(p>=life)return;
 const t=p/life,d=e.radius*(.13+.87*ease(t));
 c.save();c.globalAlpha*=Math.sin(Math.PI*Math.sqrt(t))*(nuke?.86:.66);
 const count=nuke?18:8;
 for(let i=0;i<count;i++){
  const a=tau*(i+noise(seed,i)*.48)/count;
  const x=Math.cos(a)*d,y=Math.sin(a)*d;
  const w=e.radius*(.13+.12*noise(seed,i+3))*(.5+.8*t);
  heatCloud(c,textures?.dust?.[i%2],x,y,w,w*.5,.83);
  if(nuke&&i%3!==1){
   stroke(c,1.5+1.6*(1-t),'#fff1c48c',()=>c.arc(0,0,d,a-.088,a+.072));
  }
 }
 c.restore();
}
function secondaryBurst(c,e,p,style,textures,reduced){
 const r=e.radius,fire=e.strike==='incendiary',seed=seedFor(e),bloom=ease(p/.46),heat=clamp(1-p/.76);
 c.save();
 if(fire){
  const width=r*(.27+.48*bloom);
  glow(c,0,0,width,width*.65,'#ec6b29d0','#be431b70');
  for(let i=0;i<(reduced?4:9);i++){
   const a=i*2.39996+seed*.09,d=r*(.12+.5*noise(seed,i))*bloom;
   const x=Math.cos(a)*d,y=Math.sin(a)*d-(6+r*.17)*bloom*noise(seed,i+11);
   const w=r*(.18+.14*noise(seed,i+7))*(.58+bloom*.77),h=w*(.92+noise(seed,i+20)*.69);
   heatCloud(c,textures?.fire?.[i%3],x,y,w,h,heat*.95);
   const tongue=w*.37*(1-.4*p);
   flame(c,x,y,tongue*.62,tongue,Math.cos(a)*tongue*.45);
  }
 }else{
  // The cool plastic shell breaks away from the warm impact core.
  for(let i=0;i<(reduced?3:7);i++){
   const a=i*2.39996+(e.angle||0),d=r*(.14+.29*noise(seed,i))*bloom;
   const x=Math.cos(a)*d,y=Math.sin(a)*d-bloom*r*.24;
   const w=r*(.23+.21*noise(seed,i+22))*(.6+bloom*.9);
   heatCloud(c,textures?.smoke?.[i%3],x,y,w,w*.91,.76);
   heatCloud(c,textures?.fire?.[i%3],x,y+4,w*.78,w*.65,heat*.76);
  }
  glow(c,0,-9,r*(.22+.22*bloom),r*.22,'#fff1bb','#ff992575');
 }
 c.restore();
}
function cloudDepth(c,r,p,seed,textures,reduced){
 // The expanding cap is widest at the lit underside, connected by the tapered stem.
 const rise=ease(p/.75),h=r*(.23+.42*rise),width=r*(.13+.24*rise),hot=clamp(1-p/.82),wind=Math.sin(seed)*r*.055*rise;
 c.save();
 const column=c.createLinearGradient(-r*.13,0,r*.1,-h*.22);
 column.addColorStop(0,'#644031');column.addColorStop(.42,'#d17a43');column.addColorStop(.64,'#ffd590');
 column.addColorStop(.82,'#a15c3b');column.addColorStop(1,'#64453a');
 c.beginPath();c.moveTo(-r*.18,2);
 c.bezierCurveTo(-r*.07,-h*.12,-r*.13,-h*.34,wind-r*.058,-h*.52);
 c.bezierCurveTo(wind-r*.03,-h*.66,wind-r*.12,-h*.82,wind-width*.42,-h*.99);
 c.lineTo(wind+width*.44,-h*.99);
 c.bezierCurveTo(wind+r*.22,-h*.78,wind+r*.02,-h*.69,wind+r*.065,-h*.52);
 c.bezierCurveTo(wind+r*.103,-h*.31,r*.04,-h*.16,r*.16,1);
 c.quadraticCurveTo(0,r*.05,-r*.18,2);c.closePath();c.fillStyle=column;c.fill();c.clip();
 for(let i=0;i<6;i++){
  const q=(i+.5)/6, x=wind*q+Math.sin(q*11+p*3)*r*.047,y=-h*(.13+q*.83),w=r*(.19+.16*noise(seed,i));
  heatCloud(c,textures?.smoke?.[i%3],x,y,w,w*.84,.8);
  heatCloud(c,textures?.fire?.[i%3],x,y+5,w*.94,w*1.1,hot*.84);
 }
 c.restore();
 c.save();c.translate(wind,-h);
 const puff=[[-1.00,.01],[-.99,-.24],[-.81,-.40],[-.73,-.60],[-.49,-.57],[-.32,-.81],[-.03,-.78],[.15,-.87],[.42,-.69],[.64,-.65],[.76,-.42],[.96,-.39],[1.01,-.16],[.97,.07],[.78,.15],[.62,.30],[.36,.27],[.15,.43],[-.09,.34],[-.34,.42],[-.56,.27],[-.78,.24]];
 const points=puff.map(([x,y],i)=>[width*(x+(noise(seed,i)-.5)*.10),width*(y+(noise(seed,i+7)-.5)*.12)]);
 c.beginPath();c.moveTo((points[0][0]+points.at(-1)[0])/2,(points[0][1]+points.at(-1)[1])/2);
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i],[nx,ny]=points[(i+1)%points.length];
  c.quadraticCurveTo(x,y,(x+nx)/2,(y+ny)/2);
 }
 c.closePath();
 const mantle=c.createLinearGradient(0,-width*.82,0,width*.42);
 mantle.addColorStop(0,'#b49e86');mantle.addColorStop(.36,'#956f57');
 mantle.addColorStop(.67,'#6b4d42');mantle.addColorStop(.88,hot>.38?'#ffd7a0':'#b8825f');
 mantle.addColorStop(1,'#9d6045');
 c.fillStyle=mantle;c.fill();c.clip();
 for(let i=0;i<(reduced?7:12);i++){
  const band=i%2,x=width*((i+.5)/6%1*2-1), span=Math.sqrt(Math.max(0,1-(x/width)**2));
  const y=width*((band?-.28:-.48)*span+(noise(seed,i+17)-.5)*.29),w=width*(.56+.34*noise(seed,i+11));
  heatCloud(c,textures?.smoke?.[i%3],x,y,w,w*.9,.87);
  heatCloud(c,textures?.fire?.[i%3],x,y+width*.36,w*.96,w*.72,hot*.87);
  if(!textures)glow(c,x,y,w*.45,w*.37,'#d3b69a70','#ad968e64');
 }
 c.restore();
 if(!reduced){
  for(let i=0;i<6;i++){
   const q=i/6,a=i*2.39996,d=r*(.21+q*.58)*ease(p/.7),w=r*(.23+q*.22);
   heatCloud(c,textures?.dust?.[i%2],Math.cos(a)*d,Math.sin(a)*d,w,w*.46,clamp(1-p/.9)*.92);
  }
 }
}
function embers(c,e,p,nuke){
 const r=e.radius,seed=seedFor(e),reach=ease(p/.83);
 c.save();c.globalAlpha*=clamp(1-p/.9)*.95;c.lineCap='round';
 for(let i=0;i<(nuke?22:10);i++){
  const a=i*2.39996+noise(seed,i)*.54,dx=Math.cos(a),dy=Math.sin(a);
  const d=r*(.30+.67*noise(seed,i+34))*reach,lift=Math.sin(p*Math.PI)*r*(.14+.37*noise(seed,i+12));
  const x=dx*d,y=dy*d-lift,size=2+noise(seed,i+4)*(nuke?12:8);
  stroke(c,1+noise(seed,i)*1.8,i%3?'#ffbd6c':'#fffad7',()=>{c.moveTo(x-dx*size*.8,y-dy*size*.52+size*.36);c.lineTo(x,y);});
 }
 c.restore();
}
function impact(c,e,p,fx){
 const style=prop[e.strike],nuke=e.strike==='nuke',reduced=quiet(),r=e.radius;
 const textures=fx?.prepareImpactMaterials?.(),heat=clamp(1-p/(nuke?.28:.25));
 pressure(c,r,p,style,nuke?3:e.strike==='missile'?2:1,reduced);
 if(!reduced&&e.strike!=='incendiary')groundSurge(c,e,p,textures);
 flash(c,r*(.40+.17*p),heat*(reduced?.46:.85),style.wake+'b8');
 c.save();c.globalAlpha*=clamp((1-p)/(nuke?.32:.23));
 const sheet=impactSheet();
 if(sheet){
  const size=r*(nuke?1.58:e.strike==='missile'?1.92:2.05);
  const mirrored=e.strike==='missile'&&e.seq===1;
  const frame=reduced?.32:p;
  paintVolume(c,sheet,style.column,frame,0,0,mirrored?-size:size,size);
 }else if(nuke)cloudDepth(c,r,p,seedFor(e),textures,reduced);
 else secondaryBurst(c,e,p,style,textures,reduced);
 if(!reduced)embers(c,e,p,nuke);
 c.restore();
}

function event(c,e,fx) {
 if(e.kind==='radioRoll'){impactSheet();return true;} // Heads-up result renders after units and blasts.
 if((e.kind!=='radioIncoming'&&e.kind!=='radioImpact')||!Object.hasOwn(prop,e.strike))return false;
 const p=clamp(1-e.t/e.max);
 c.save();c.translate(e.x,e.y);
 if(e.kind==='radioIncoming')incoming(c,e,p,fx);else impact(c,e,p,fx);
 c.restore();return true;
}
root.FrontRadioArt={event,rolls,ground};
})(typeof window==='undefined'?globalThis:window);

