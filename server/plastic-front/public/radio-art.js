/* World-space paint for the signal corps. All animation follows the combat clock. */
(function (root) {
'use strict';
const sky=root.FrontRadioAirspace;
const tau = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => 1 - (1 - clamp(n)) ** 3;
const preference = root.matchMedia?.('(prefers-reduced-motion: reduce)');
const quiet = game => game?.reducedMotion ?? preference?.matches ?? false;
const displayFrames=new WeakMap();
// Network games receive the battle clock in snapshots. Animate between confirmations
// on the canvas only, and stop advancing if the server stops sending snapshots.
function beginFrame(c,game){
 let view=displayFrames.get(c);
 if(!view||view.game!==game){
  view={game,snapshot:-Infinity,time:game.time};displayFrames.set(c,view);
 }
 view.reduced=quiet(game);
 if(!game.coop||!root.FrontCoopClient?.active||game.phase!=='playing'||game.bossIntro?.remaining>0){
  view.time=game.time;view.snapshot=-Infinity;
 }else{
  const now=root.performance.now()/1000;
  if(view.snapshot!==game.time){
   if(game.time<view.snapshot||view.snapshot===-Infinity)view.time=game.time;
   view.snapshot=game.time;view.received=now;
  }
  view.time=Math.max(view.time,game.time+Math.min(.125,Math.max(0,now-view.received)));
 }
 view.offset=view.time-game.time;
 return view;
}
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
const pairPositions=[[0,-42],[-36,0],[36,0]];
function face(c,x,y,n,rim,angle,gold) {
 c.save(); c.translate(x,y); c.rotate(angle);
 c.fillStyle=gold?'#9e611e':'#434543';c.beginPath();c.roundRect(-8,-8,18,20,3.5);c.fill();
 c.fillStyle=gold?'#f7d072':'#fff';c.beginPath();c.roundRect(-9,-9,18,18,3.5);c.fill();
 stroke(c,1.6,gold?'#5a390e':'#191918',()=>c.roundRect(-9,-9,18,18,3.5));
 if(rim)stroke(c,2.3,rim,()=>c.roundRect(-10,-10,20,20,4.2));
 for (const [a,b] of pipLayout[n] || []) {
  const r=n===1?2.45:1.7;
  ellipse(c,a*4.6,b*4.6,r,r,gold?'#3f230d':'#0e0e0e');
 }
 c.restore();
}
function drawRollPair(c,roll,x,y,{rank,age,spinning,reduced,duration,grouped,index}) {
 const popup=(age-duration)/.25, accented=roll.success&&popup>=0&&popup<1;
 const zoom=accented?1+(reduced?.09:.5)*Math.min(1,popup/.22,(1-popup)/.30):1;
 const golden=rank===3, revealed=roll.success&&!spinning;
 const twist=spinning&&!reduced ? .34*Math.sin(age*38+index*1.2):0;
 const jump=spinning&&!reduced ? 2.6*Math.sin(age/duration*Math.PI):0;
 c.save();c.translate(x,y);c.scale(zoom,zoom);
 if(grouped){
  const plate=()=>c.roundRect(-22,-12,44,24,5);
  c.fillStyle='rgba(18,30,23,.92)';c.beginPath();plate();c.fill();
  stroke(c,accented?2.1:1.1,accented?'#ffcf58':revealed?'#d4a345':'#8e9380',plate);
 }
 if(spinning&&!reduced)c.scale(.55+.33*Math.abs(Math.sin(age*35+index)),1);
 const rim=!grouped&&accented?(roll.strike==='nuke'?'#ff472f':'#ffbf33'):null;
 face(c,-10.6,-jump,spinning?0:roll.dice[0],rim,twist-.035,golden);
 face(c,10.6,-jump*.55,spinning?0:roll.dice[1],rim,-twist+.035,golden);
 c.restore();
}
function rollLabel(c,label,top,bonus,incendiary,e,u,tr) {
 c.font=bonus?'800 13px sans-serif':'bold 12px sans-serif';
 c.textAlign='center';c.textBaseline='bottom';c.lineJoin='round';
 const width=c.measureText(label).width;
 if(bonus){
  const tag=()=>c.roundRect(-width/2-7,top-16,width+14,19,5);
  c.fillStyle=bonus===3?'#431b15':'#293520';c.beginPath();tag();c.fill();
  stroke(c,1.3,bonus===3?'#e96a3c':'#d6a246',tag);
 }
 c.strokeStyle='#382115';c.lineWidth=bonus?2:3;c.strokeText(label,0,top);
 c.fillStyle=bonus===3?'#fff0bb':'#ffdb89';c.fillText(label,0,top);
 if(bonus||!incendiary)return;
 const tx=incendiary.tx??e.tx, ty=incendiary.ty??e.ty;
 if(Number.isFinite(tx)&&Number.isFinite(ty)){
  const sx=tr.a*tx+tr.c*ty+tr.e,sy=tr.b*tx+tr.d*ty+tr.f;
  if(sx<0||sx>c.canvas.width||sy<0||sy>c.canvas.height){
   c.translate(width/2+7,top-7);c.rotate(Math.atan2(ty-u.y,tx-u.x));
   polygon(c,[[5,0],[-4,-4],[-2,0],[-4,4]],'#ffc568');
  }
 }
}
function rolls(c,game,visible) {
 const rolling = new Map();
 for(const e of game.effects){
  if(e.kind==='radioRoll'&&visible(e.source||e))rolling.set(e.source?.id??e,e);
 }
 if(!rolling.size)return;
 const tr = c.getTransform();
 const pixelRatio=c.canvas?.clientWidth?c.canvas.width/c.canvas.clientWidth:root.devicePixelRatio||1;
 const scale = Math.max(.15, Math.hypot(tr.a,tr.b) / pixelRatio);
 const lanes = [], offset=displayFrames.get(c)?.offset||0, reduced=quiet(game);
 for (const e of rolling.values()) {
  const u=e.source || e, age=e.max-e.t+offset, rank=e.rank||1;
  // Older saves resolve the single displayed pair from the original roll fields.
  const pairs=e.rolls||[{dice:[e.a,e.b],success:e.a===e.b,strike:e.strike}];
  const grouped=pairs.length>1, duration=rank===3?.16:.23, spinning=age<duration;
  const successful=pairs.some(roll=>roll.success), bonus=e.bonus||0;
  const incendiary=pairs.find(roll=>roll.success&&roll.strike==='incendiary');
  const label=bonus===3?'TRIPLE JACKPOT!':bonus===2?'SYNC x2!':incendiary?(e.golden?'강화 소이탄':'소이탄'):'';
  const x=u.x*scale;
  let y=(u.y-(grouped?68:57))*scale-10;
  const width=grouped?71:35, top=(grouped?61:19)+(label?22:0), bottom=19;
  let overlap;
  while((overlap=lanes.find(lane=>Math.abs(lane.x-x)<lane.width+width
   && y+bottom>lane.y-lane.top && y-top<lane.y+lane.bottom))){
   y=overlap.y-overlap.top-bottom-3;
  }
  lanes.push({x,y,width,top,bottom});
  c.save();
  if (successful && !spinning) {
   const lampX=u.x+7, lampY=u.y-38;
   glow(c,lampX,lampY,15,15,'#fff9b6','#ffc44772');
   ellipse(c,lampX,lampY,2.3,2.3,'#fffdee');
   const wave=clamp((age-duration)/.52), r=5+wave*(reduced?5:17);
   c.save(); c.globalAlpha*=1-wave;
   stroke(c,1.6,'#ffdb85',()=>c.arc(lampX,lampY,r,-1.5,-.22));
   stroke(c,1.2,'#ffeab0',()=>c.arc(lampX,lampY,r+4,-1.5,-.22)); c.restore();
  }
  c.translate(x/scale,y/scale); c.scale(1/scale,1/scale);
  pairs.forEach((roll,index)=>{
   const [px,py]=grouped?pairPositions[index]:[0,0];
   drawRollPair(c,roll,px,py,{rank,age,spinning,reduced,duration,grouped,index});
  });
  if(label&&!spinning)rollLabel(c,label,grouped?-64:-21,bonus,incendiary,e,u,tr);
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
 const view=beginFrame(c,game);
 sky.syncOrigins(c,game);
 const events=game.effects||[],reduced=view.reduced;
 for(const e of events){
  if(e.kind!=='radioCrater'||!visible(e))continue;
  const life=e.t/e.max;
  c.save();c.translate(e.x,e.y);c.globalAlpha*=Math.min(1,life*1.65);
  sky.scorch(c,e.radius*.79,true);c.restore();
 }
 for(const z of game.radioFireZones || []) {
  if (!visible(z)) continue;
  const age=view.time-z.startedAt, life=z.until-view.time;
  if (age<0 || life<=0) continue;
  const fade=clamp(age/.14)*clamp(life/.4), r=z.radius, seed=seedFor(z);
  const time=age*(reduced?.47:1);
  c.save(); c.translate(z.x,z.y); c.globalAlpha*=fade;
  sky.scorch(c,r,false);
  const sheet=impactSheet();
  const textures=fx?.prepareImpactMaterials?.();
  // Unequal pockets of spilled fuel. The scorched islands stay fixed while wisps rise from each pool.
  const pockets=r>105?8:5;
  for(let i=0;i<pockets;i++) {
   const a=i*2.39996+seed*.08+(noise(seed,i+13)-.5)*.9;
   const d=r*(i===0?.05:.32+.41*noise(seed,i+35));
   const x=Math.cos(a)*d, y=Math.sin(a)*d;
   const wide=r*(.14+.19*noise(seed,i+4)), depth=wide*(.38+.24*noise(seed,i+14));
   const spread=clamp((age-i*.035)/.47);
   burningTrail(c,x,y,r,spread,.90-.31*clamp(age/.95));
   if(!spread)continue;
   glow(c,x,y,wide,depth,'#462219ee','#b745139c');
   if(textures?.smoke?.length){
    const rise=(time*.71+noise(seed,i+42))%1;
    const lift=wide*(.8+1.34*rise);
    heatCloud(c,textures.smoke[i%3],x+wide*(rise*.23-.08),y-lift,wide*(.60+rise*.72),wide*(.8+rise),Math.sin(rise*Math.PI)*.40);
   }
   if(sheet){
    const phase=(time*(.88+.19*noise(seed,i))+noise(seed,i+8))%1;
    const width=Math.max(20,wide*1.82)*(.6+.4*spread);
    const height=width*(1.46+.29*noise(seed,i+17))*(1+(reduced?.035:.10)*Math.sin(tau*phase));
    paintVolume(c,sheet,3,phase,x,y,width*(noise(seed,i+51)>.5?1:-1),height);
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
 groundPasses(c,game,visible,view);
}

function groundPasses(c,game,visible,view){
 for(const e of game.effects||[]){
  const incoming=e.kind==='radioIncoming',follow=e.kind==='radioImpact'&&e.strike==='incendiary';
  if((!incoming&&!follow)||!visible(e))continue;
  const left=Number.isFinite(e.landAt)?e.landAt-view.time:(incoming?e.t:e.t-e.max)-view.offset;
  c.save();c.translate(e.x,e.y);
  sky.aircraft(c,e,left,view.reduced);
  if(incoming){sky.shadow(c,e,left);sky.marker(c,e,left,view.reduced);}
  if(incoming&&e.strike==='incendiary'&&left>0){
   const closing=clamp(1-left/e.max);
   glow(c,0,0,15+12*closing,7+6*closing,'#ffdd7ece','#f2762866');
   for(let i=0;i<3;i++){
    const a=i*tau/3+.4,d=6+16*(1-closing);
    ellipse(c,Math.cos(a)*d,Math.sin(a)*d*.55,2.4,1.4,'#ffc169');
   }
  }
  c.restore();
 }
}

const CELL_WIDTH=144,CELL_HEIGHT=216;
const atlas=typeof root.Image==='function'?new root.Image():null;
if(atlas)atlas.src='assets/effects/radio-strike-models-v214.webp';
// Prepare the flipbook after the initial page load. A first roll can also request it
// immediately. The procedural flames keep animating while a cold download finishes.
const TILE=192,FRAMES=24,COLUMNS=6,ROWS=FRAMES/COLUMNS;
let volumeAtlas;
function impactSheet(){
 if(!volumeAtlas&&typeof root.Image==='function'){
  volumeAtlas=new root.Image();
  volumeAtlas.decoding='async';
  volumeAtlas.src='assets/effects/radio-impact-volume-v1.webp';
  volumeAtlas.decode?.().catch(()=>{});
 }
 return volumeAtlas?.complete&&volumeAtlas.naturalWidth===TILE*COLUMNS&&volumeAtlas.naturalHeight===TILE*ROWS*4?volumeAtlas:null;
}
if(root.document&&typeof root.addEventListener==='function'){
 const warm=()=>impactSheet();
 const afterLoad=()=>root.requestIdleCallback?root.requestIdleCallback(warm,{timeout:900}):root.setTimeout(warm,0);
 if(root.document.readyState==='complete')afterLoad();
 else root.addEventListener('load',afterLoad,{once:true});
}
function paintVolume(c,sheet,band,p,x,y,width,height){
 const f=Math.min(FRAMES-1,Math.floor(clamp(p)*FRAMES));
 c.save();c.translate(x,y);if(width<0)c.scale(-1,1);
 const w=Math.abs(width);
 c.drawImage(sheet,(f%COLUMNS)*TILE,(band*ROWS+Math.floor(f/COLUMNS))*TILE,TILE,TILE,-w/2,-height*151/TILE,w,height);
 c.restore();
}
const prop={
 incendiary:{column:0,size:59,tail:.60,ink:'#ffd483',glare:'#fff0a9',wake:'#ff984f'},
 missile:{column:1,size:65,tail:.79,ink:'#c1eeef',glare:'#e3ffff',wake:'#8bc6cf'},
 nuke:{column:2,size:95,tail:.97,ink:'#ffd390',glare:'#fff4cf',wake:'#efaa61'}
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
// Smoke starts at the nozzle. It stays on the same axis as the accelerated body.
function exhaust(c,length,t,nuke,fx,reduced){
 const white=fx?.textures?.whiteSmoke;
 const reach=(nuke?150:91)*(.45+.55*t),base=nuke?6:2.6,spread=nuke?17:6;
 c.save();c.translate(0,-length+2);
 const plume=c.createLinearGradient(0,0,0,-reach);
 plume.addColorStop(0,'#fffdf6f0');plume.addColorStop(.23,'#fffdf5cf');
 plume.addColorStop(.70,'#fffcf399');plume.addColorStop(1,'#f6f4ee00');
 c.beginPath();c.moveTo(-base,0);
 c.bezierCurveTo(-base,-reach*.22,-spread,-reach*.8,-spread,-reach);
 c.lineTo(spread,-reach);c.bezierCurveTo(spread,-reach*.8,base,-reach*.25,base,0);
 c.closePath();c.fillStyle=plume;c.fill();
 if(nuke&&white&&!reduced){
  for(let i=0;i<9;i++){
   const u=i/9,w=11+u*32;
   heatCloud(c,white,Math.sin(i*1.9+t*5)*4*u,-reach*u,w,w*1.3,(1-u)*.67);
  }
 }
 c.restore();
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
function incoming(c,e,fx){
 const view=displayFrames.get(c),style=prop[e.strike],reduced=view?.reduced??quiet(),nuke=e.strike==='nuke';
 const time=view?.time??fx?.time;
 const left=Number.isFinite(e.landAt)&&Number.isFinite(time)?e.landAt-time:e.t-(view?.offset||0);
 if(left>sky.flightSeconds[e.strike])return;
 const point=sky.pose(c,e,left),travel=point.t;
 c.save();c.translate(point.x,point.y);c.rotate(point.angle);
 const length=style.size*style.tail,w=style.size*CELL_WIDTH/CELL_HEIGHT;
 const jet=nuke?51:27;
 if(e.strike!=='incendiary')exhaust(c,length,travel,nuke,fx,reduced);
 const plume=c.createLinearGradient(0,-length-jet,0,-length+3);
 plume.addColorStop(0,'#d8a87900');plume.addColorStop(.38,style.wake+'a0');
 plume.addColorStop(.76,style.glare);plume.addColorStop(1,'#ffffed');
 const nozzle=w*(nuke?.12:.092),delta=reduced?0:Math.sin(travel*44)*3;
 c.beginPath();c.moveTo(-nozzle,-length+4);
 c.bezierCurveTo(-nozzle*1.7,-length-12,nozzle*.2,-length-jet*.72,delta,-length-jet);
 c.bezierCurveTo(nozzle*.32,-length-jet*.65,nozzle*1.6,-length-11,nozzle,-length+4);
 c.closePath();c.fillStyle=plume;c.fill();
 if(assetReady()){
  const frame=Math.min(3,Math.floor(travel*4));
  c.drawImage(atlas,style.column*CELL_WIDTH,frame*CELL_HEIGHT,CELL_WIDTH,CELL_HEIGHT,-w/2,-style.size,w,style.size);
 }else drawFallback(c,w,length,style);
 c.restore();
}
// A ring reaches the actual damage radius before it fades, while the plume rises above it.
function missilePressure(c,r,p,style,reduced){
 const q=clamp(p/.72),radius=r*((reduced?.55:.18)+(reduced?.45:.82)*ease(q));
 if(q===1)return;
 c.save();c.globalAlpha*=clamp(1-q)*(reduced?.46:.86);
 stroke(c,3.5,style.wake+'99',()=>c.arc(0,0,radius,0,tau));
 stroke(c,1.2,style.glare,()=>c.arc(0,0,radius,0,tau));
 if(!reduced)stroke(c,1.05,style.ink+'a8',()=>c.arc(0,0,radius*(.82+.10*q),0,tau));
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
function impact(c,e,p,fx,reduced){
 const style=prop[e.strike],nuke=e.strike==='nuke',r=e.radius;
 const textures=fx?.prepareImpactMaterials?.(),heat=clamp(1-p/(nuke?.28:.25));
 if(nuke){
  const age=p*e.max,q=clamp(age/.32),radius=r*(1-(1-q)**2);
  if(age<.44&&radius>0){
   c.save();c.globalAlpha*=clamp((.44-age)/.16)*(reduced?.30:.92);
   stroke(c,4+8*(1-q),'#fffdf2',()=>c.arc(0,0,radius,0,tau));c.restore();
  }
 }else if(e.strike==='missile')missilePressure(c,r,p,style,reduced);
 if(!reduced&&e.strike!=='incendiary')groundSurge(c,e,p,textures);
 flash(c,r*(.40+.17*p),heat*(reduced?.46:.85),style.wake+'b8');
 c.save();c.globalAlpha*=clamp((1-p)/(nuke?.32:.23));
 const sheet=impactSheet();
 if(sheet){
  const size=r*(nuke?1.58:e.strike==='missile'?1.92:2.05);
  const mirrored=e.strike==='missile'&&e.seq===1;
  // Expand along the floor, then lift the plume while keeping its base on the impact point.
  const rise=ease(p/.73),lift=reduced?.075:(nuke?.25:.18);
  const height=size*(1-lift+lift*rise),width=size*(1-.1*(1-ease(p/.31)));
  paintVolume(c,sheet,style.column,p,0,0,mirrored?-width:width,height);
 }else if(nuke)cloudDepth(c,r,p,seedFor(e),textures,reduced);
 else secondaryBurst(c,e,p,style,textures,reduced);
 if(!reduced)embers(c,e,p,nuke);
 c.restore();
}

function event(c,e,fx) {
 if(e.kind==='radioCrater')return true; // Painted under units until the soot dissipates.
 if(e.kind==='radioRoll'){impactSheet();return true;} // Heads-up result renders after units and blasts.
 if((e.kind!=='radioIncoming'&&e.kind!=='radioImpact')||!Object.hasOwn(prop,e.strike))return false;
 const view=displayFrames.get(c);
 const age=view&&Number.isFinite(e.at)?view.time-e.at:e.max-e.t+(view?.offset||0);
 const p=clamp(age/e.max);
 c.save();c.translate(e.x,e.y);
 if(e.kind==='radioIncoming')incoming(c,e,fx);else impact(c,e,p,fx,view?.reduced??quiet());
 c.restore();return true;
}
root.FrontRadioArt={event,rolls,ground};
})(typeof window==='undefined'?globalThis:window);

