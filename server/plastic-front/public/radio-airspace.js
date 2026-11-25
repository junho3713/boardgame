/* Client-side projection and floor art for the signal corps. Distances are in world units. */
(function(root){
'use strict';
const tau=2*Math.PI,clamp=n=>Math.max(0,Math.min(1,n));
const directions={incendiary:-.34,missile:1/Math.tan(65*Math.PI/180),nuke:0};
const flightSeconds={incendiary:.55,missile:.47,nuke:.81};
const pass={incendiary:{length:.4,lead:0,size:98},missile:{length:.45,lead:.35,size:96},nuke:{length:.7,lead:flightSeconds.nuke,size:282}};
const flightOrigins=new WeakMap(), silhouettes=new Map(), decals=new Map();

function flightPose(strike,secondsLeft,drop){
 const t=clamp(1-secondsLeft/flightSeconds[strike]), progress=t**2.5;
 const slope=directions[strike], remaining=drop*(1-progress);
 return {x:slope*remaining,y:-remaining,angle:Math.atan2(1,-slope)-Math.PI/2,progress,t};
}
// Freeze the launch altitude in world space. Camera pans and network snapshot replacement
// must not move a missile already in the air. Discard finished paths on the next floor pass.
function syncOrigins(c,game){
 let state=flightOrigins.get(c);
 if(!state){state={paths:new Map(),lastTime:-1};flightOrigins.set(c,state);}
 if(game.time<state.lastTime)state.paths.clear();
 state.lastTime=game.time;
 for(const [key,path] of state.paths)if(path.until<game.time-.1)state.paths.delete(key);
 const tr=c.getTransform(),worldTop=-tr.f/tr.d;
 for(const e of game.effects||[]){
  if(e.kind!=='radioIncoming')continue;
  const key=flightKey(e);
  if(!state.paths.has(key))state.paths.set(key,{drop:Math.max(120,e.y-worldTop+36),until:e.landAt??game.time+e.t});
 }
}
function flightKey(e){
 return Number.isFinite(e.landAt)?[e.source?.id,e.seq,e.strike,e.landAt,e.x,e.y].join('/'):e;
}
function pose(c,e,left=e.t){
 // The caller has translated the origin to the point of impact.
 const m=c.getTransform(),drop=flightOrigins.get(c)?.paths.get(flightKey(e))?.drop??Math.max(120,m.f/m.d+36);
 return flightPose(e.strike,left,drop);
}
function marker(c,e,left,reduced){
 const p=clamp(1-left/e.max),r=e.radius;
 if(e.strike==='incendiary'||(e.seq>0&&left>flightSeconds.missile))return;
 c.save();c.lineCap='round';
 if(e.strike==='nuke'){
  const ring=r*clamp(left/e.max)**1.25;
  c.fillStyle='rgba(187,27,17,.07)';c.beginPath();c.arc(0,0,r,0,tau);c.fill();
  c.lineWidth=3;c.strokeStyle='#a82c27';c.stroke();
  c.lineWidth=2.7;c.strokeStyle='#ff533c';c.beginPath();c.arc(0,0,ring,0,tau);c.stroke();
  for(let i=0;i<8;i++){
   c.rotate(tau/8);c.fillStyle='#f64e32';c.beginPath();c.moveTo(-4,-r+2);c.lineTo(4,-r+2);c.lineTo(0,-r+11);c.closePath();c.fill();
  }
 }else{
  const gap=8+17*(1-p),arm=13;
  if(!reduced)c.rotate(-.46*(1-p));
  for(let i=0;i<4;i++){
   c.rotate(Math.PI/2);c.beginPath();c.moveTo(0,-gap);c.lineTo(0,-gap-arm);
   c.lineWidth=5;c.strokeStyle='#9b3024';c.stroke();c.lineWidth=2.6;c.strokeStyle='#ffac4d';c.stroke();
   c.beginPath();c.moveTo(-3,-gap-3);c.lineTo(0,-gap+2);c.lineTo(3,-gap-3);c.closePath();c.fillStyle='#f85732';c.fill();
  }
  c.fillStyle='#f34c2d';c.fillRect(-1.6,-1.6,3.2,3.2);
 }
 c.restore();
}
function shadow(c,e,left){
 if(e.strike==='incendiary'||left>flightSeconds[e.strike])return;
 const t=clamp(1-left/flightSeconds[e.strike]),nuke=e.strike==='nuke';
 const radius=nuke?15+56*t*t:5+17*t*t,opacity=.07+(nuke?.63:.58)*t*t;
 c.save();c.scale(1,nuke?1:.43);
 const g=c.createRadialGradient(0,0,0,0,0,radius);
 g.addColorStop(0,'rgba(0,0,0,'+opacity+')');g.addColorStop(.55,'rgba(0,0,0,'+opacity*.72+')');g.addColorStop(1,'rgba(0,0,0,0)');
 c.fillStyle=g;c.fillRect(-radius,-radius,radius*2,radius*2);c.restore();
}
// Half-templates run from the nose to the tail. Mirror them to keep clean wing tips.
const outlines={
 incendiary:[[0,-49],[3,-47],[5,-35],[7,-23],[9,-9],[44,-6],[47,-2],[46,6],[9,5],[5,25],[4,32],[17,35],[18,39],[4,39],[0,45]],
 missile:[[0,-53],[3,-47],[5,-22],[9,-10],[12,-20],[13,-15],[12,-4],[38,22],[38,27],[12,19],[8,30],[17,40],[17,43],[5,39],[0,42]],
 nuke:[[0,-44],[3,-42],[6,-30],[8,-17],[21,-12],[22,-19],[25,-19],[28,-10],[36,-6],[39,-12],[42,-11],[43,-4],[62,5],[65,12],[45,9],[25,8],[8,5],[5,28],[21,35],[22,40],[4,37],[0,43]]
};
function silhouette(kind){
 if(silhouettes.has(kind))return silhouettes.get(kind);
 const image=root.document.createElement('canvas');image.width=image.height=288;
 const c=image.getContext('2d'),half=outlines[kind];
 c.translate(144,144);c.scale(2,2);c.filter='blur(1.8px)';c.fillStyle='#000';c.beginPath();c.moveTo(...half[0]);
 for(const [x,y] of half.slice(1))c.lineTo(x,y);
 for(let i=half.length-2;i>0;i--)c.lineTo(-half[i][0],half[i][1]);
 c.closePath();c.fill();
 if(kind==='incendiary'){c.beginPath();c.ellipse(0,-46,15,1.8,0,0,tau);c.fill();}
 silhouettes.set(kind,image);return image;
}
function passPhase(kind,secondsLeft){
 const spec=pass[kind];return .5+(spec.lead-secondsLeft)/spec.length;
}
function aircraftPass(strike,left,width,height,scale,targetX,targetY){
 const spec=pass[strike],p=passPhase(strike,left);
 if(p<0||p>1)return null;
 const shortSide=Math.min(width,height);
 const size=Math.min(shortSide*.42,Math.max(shortSide*(strike==='nuke'?.23:.10),spec.size*scale));
 const margin=size*(strike==='missile'?.93:.75);
 // Keep the crossing in view even when the target itself is near an edge.
 const crossX=Math.max(width*.25,Math.min(width*.75,targetX));
 const crossY=Math.max(height*.22,Math.min(height*.78,targetY));
 const slope=Math.min(.42,.44*height/width,(crossY-size*.34)/(width-crossX),(height-crossY-size*.34)/crossX);
 const bias=4*p*(1-p)*(crossX-width/2);
 const x=width+margin-p*(width+2*margin)+bias;
 return {x,y:crossY+(crossX-x)*slope,angle:Math.atan2(slope,-1)+Math.PI/2,
  size,opacity:Math.min(1,p*9,(1-p)*9)};
}
function aircraft(c,e,left,reduced){
 if(e.seq>0)return;
 const m=c.getTransform(),{width,height}=c.canvas;
 if(!width||!height)return;
 const path=aircraftPass(e.strike,left,width,height,Math.hypot(m.a,m.b),
  m.a*e.x+m.c*e.y+m.e,m.b*e.x+m.d*e.y+m.f);
 if(!path)return;
 const {x,y,angle,size:s,opacity}=path;
 c.save();c.setTransform(1,0,0,1,x,y);c.rotate(angle);
 // A softer pass still marks the strike cue with reduced motion enabled.
 c.globalAlpha*=(reduced?.16:.34)*opacity;
 const img=silhouette(e.strike);
 if(e.strike==='missile'){
  // The wingman trails to the side of the lead aircraft.
  c.drawImage(img,-s*.74,-s*.68,s,s);c.drawImage(img,-s*.26,-s*.32,s,s);
 }else c.drawImage(img,-s/2,-s/2,s,s);
 c.restore();
}
function scorchTile(crater){
 if(decals.has(crater))return decals.get(crater);
 const tile=root.document.createElement('canvas'),n=192;tile.width=tile.height=n;
 const ctx=tile.getContext('2d'),im=ctx.createImageData(n,n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=(x+.5-n/2)/(n/2),v=(y+.5-n/2)/(n/2),a=Math.atan2(v,u);
  const d=Math.hypot(u,v)*(1+.043*Math.sin(7*a)+.031*Math.cos(13*a));
  const fleck=.5+.5*Math.sin(x*17.73+y*61.4+Math.sin(x*.28+y*.19)*5);
  const seam=.5+.5*Math.sin(a*17+3*Math.sin(a*8)+d*5);
  const ash=clamp((1-d)*3)*(.71+.15*fleck+.14*seam);
  const lip=crater?Math.exp(-((d-.63)**2)/.009)*(.55-.43*Math.sin(a)):0;
  const i=(y*n+x)*4;im.data[i]=23+lip*76;im.data[i+1]=19+lip*51;im.data[i+2]=18+lip*31;im.data[i+3]=Math.round(ash*210);
 }
 ctx.putImageData(im,0,0);decals.set(crater,tile);return tile;
}
function scorch(c,r,crater){
 const depth=crater?.73:.90;c.drawImage(scorchTile(crater),-r,-r*depth,r*2,r*2*depth);
}
root.FrontRadioAirspace={flightPose,flightSeconds,pose,syncOrigins,marker,shadow,passPhase,aircraftPass,aircraft,scorch};
if(typeof module!=='undefined'&&module.exports)module.exports=root.FrontRadioAirspace;
})(typeof window==='undefined'?globalThis:window);
