/* The same figure and single four-point silhouette are used for the real ninja and her doubles. */
(function(root){'use strict';
const tau=2*Math.PI,sprite=new Image(),attack=root.FrontAssassin;
const warningColor='#ff4e65';
// Each action frame has a foot anchor. All four stride cells share one ground point.
const poses=[{x:.511,y:.966},{x:.463,y:.964},{x:.416,y:.914}];
const reducedMotion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
let shade=null,throwLayers=null,cloneThrowLayers=null;
// Four original steps, each followed by five in-between poses in the atlas.
const strideTicks=6,strideCell=144,stridePeriod=8.4,strideFeet=[201,208,201,212];
const motion=new WeakMap(),walkAtlas=new Image();
let walkShade=null,blendCanvas=null;
function raster(sizeX,sizeY=sizeX){
 const c=document.createElement('canvas');c.width=sizeX;c.height=sizeY;return c;
}
function splitThrowPose(source){
 const size=sprite.naturalHeight,scale=size/384;
 const layer=keepArm=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');
  c.drawImage(source,0,0,size,size,0,0,size,size);
  c.globalCompositeOperation=keepArm?'destination-in':'destination-out';
  // Follow the glove and forearm of the standing frame, leaving the face and dagger in place.
  c.scale(scale,scale);c.beginPath();
  c.moveTo(252,211);c.lineTo(272,201);c.lineTo(292,181);c.lineTo(348,181);
  c.lineTo(348,253);c.lineTo(273,253);c.lineTo(252,233);c.closePath();c.fill();
  return canvas;
 };
 return {torso:layer(false),arm:layer(true)};
}
function ghostTint(source,width,height){
 const shade=raster(width,height),c=shade.getContext('2d');
 c.drawImage(source,0,0);c.globalCompositeOperation='source-atop';
 c.fillStyle='rgba(115,79,157,.87)';c.fillRect(0,0,width,height);
 return shade;
}
sprite.onload=()=>{
 shade=ghostTint(sprite,sprite.naturalWidth,sprite.naturalHeight);
 throwLayers=splitThrowPose(sprite);cloneThrowLayers=splitThrowPose(shade);
};
sprite.src='assets/models/kunoichi.webp?v=seven-poses';
walkAtlas.decoding='async';
walkAtlas.fetchPriority='low';
walkAtlas.onload=()=>{walkShade=ghostTint(walkAtlas,walkAtlas.naturalWidth,walkAtlas.naturalHeight);};
walkAtlas.src='assets/models/kunoichi-walk-v1.webp';
function ellipse(c,x,y,rx,ry,paint){c.beginPath();c.ellipse(x,y,rx,ry,0,0,tau);c.fillStyle=paint;c.fill();}
function glow(c,x,y,r,inner,outer){
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);
 c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}
function progress(a,time,duration){return Math.max(0,Math.min(1,1-(a.until-time)/duration));}
function raisedStar(c,layers,left,top,size,charge){
 const pivotX=252/384*size,pivotY=219/384*size;
 c.drawImage(layers.torso,left,top,size,size);
 c.save();c.translate(left+pivotX,top+pivotY);c.rotate(-.91*charge);
 c.drawImage(layers.arm,-pivotX,-pivotY,size,size);
 const x=49/384*size,y=-1/384*size;
 c.globalAlpha*=.5+.5*charge;
 glow(c,x,y,6+charge*5,warningColor,'#ff264600');
 c.restore();
}
function figurePose(u,time){
 const action=u.assassinAction,phase=action?.phase,releaseAge=time-(u.assassinReleasedAt??-Infinity);
 if(phase==='throw'||phase==='warn'){
  return {mode:phase,charge:progress(action,time,phase==='throw'?attack.windup:.75)};
 }
 if(phase==='dash')return {mode:'dash',charge:1-action.left/action.length};
 if(releaseAge>=0&&releaseAge<.27)return {mode:'release',charge:releaseAge/.27};
 if(phase==='retreat'||time-(u.assassinStepAt??-Infinity)<.10){
  return {mode:'walk',cycle:((u.walk||0)/stridePeriod)%1};
 }
 return {mode:'idle'};
}
const smooth=n=>n*n*(3-2*n);
function sampleFigure(u,time){
 const pose=figurePose(u,time),side=Math.cos(u.face||0);
 let state=motion.get(u);
 if(!state||time<state.time||time-state.time>.25||Math.hypot(u.x-state.x,u.y-state.y)>150){
  state={side:side<0?-1:1,turnAt:-Infinity,switchedAt:-Infinity,last:pose};
  motion.set(u,state);
 }else if(pose.mode!==state.last.mode){
  state.previous=state.last;state.switchedAt=time;
 }
 // Keep facing stable as the target crosses the vertical axis.
 if(state.side*side<-.19){state.side=-state.side;state.turnAt=time;}
 const turn=Math.max(0,Math.min(1,(time-state.turnAt)/.14));
 pose.facing=state.side;
 if(turn<1&&!reducedMotion?.matches)pose.facing*=(turn<.5?-1:1)*(1-.44*Math.sin(Math.PI*turn));
 Object.assign(state,{time,last:pose,x:u.x,y:u.y});
 const duration=pose.mode==='dash'?.065:pose.mode==='release'?.09:state.previous?.mode==='dash'?.14:.13;
 const blend=smooth(Math.max(0,Math.min(1,(time-state.switchedAt)/duration)));
 if(blend>=1)state.previous=null;
 return {pose,previous:state.previous,blend};
}
function drawFigure(c,pose,clone){
 const {mode,charge,facing}=pose,cell=sprite.naturalHeight,size=90;
 const figure=clone&&shade?shade:sprite,throwing=mode==='throw',preparing=throwing||mode==='warn';
 c.save();c.scale(facing,1);
 if(mode==='walk'){
  const cycle=pose.cycle,phase=cycle*strideFeet.length,i=Math.floor(phase),t=phase-i;
  const anchor=(strideFeet[i]+(strideFeet[(i+1)%strideFeet.length]-strideFeet[i])*t)/384;
  if(!reducedMotion?.matches){
   const rise=Math.sin(cycle*tau)**2;
   c.translate(Math.sin(cycle*tau)*.7,-1.4*rise);
   c.rotate(.024*Math.cos(cycle*tau));
  }
  if(walkAtlas.naturalWidth===strideCell*strideTicks){
   const frame=Math.round(cycle*strideTicks*strideFeet.length)%(strideTicks*strideFeet.length);
   const source=clone&&walkShade?walkShade:walkAtlas;
   c.drawImage(source,(frame%strideTicks)*strideCell,Math.floor(frame/strideTicks)*strideCell,strideCell,strideCell,-anchor*size,-.966*size,size,size);
  }else c.drawImage(figure,(3+i)*cell,0,cell,cell,-anchor*size,-.966*size,size,size);
  c.restore();return;
 }
 if(!reducedMotion?.matches){
  if(preparing){
   const windup=smooth(charge);
   c.translate((throwing?-4:2)*windup,0);
   c.scale(1+.035*windup,1-(throwing?.085:.055)*windup);c.rotate((throwing?-.12:.09)*windup);
  }else if(mode==='release'){
   const recoil=(1-charge)**2;
   c.translate(3.5*recoil,-recoil);c.rotate(.055*recoil);
  }
 }
 const frame=mode==='dash'?2:mode==='release'?1:0,anchor=poses[frame];
 const layers=clone?cloneThrowLayers:throwLayers,left=-anchor.x*size,top=-anchor.y*size;
 if(throwing&&layers)raisedStar(c,layers,left,top,size,reducedMotion?.matches?1:Math.min(1,.08+charge*1.22));
 else c.drawImage(figure,frame*cell,0,cell,cell,left,top,size,size);
 if(preparing){
  if(!clone){
   glow(c,3.3,-52.3,3.1,'#ff273f','#f50f3600');
   glow(c,12.6,-53,3.1,'#ff273f','#f50f3600');
  }
  c.globalAlpha*=.7+.3*charge;
  glow(c,-17,-25,4.6,warningColor,'#f50f3600');
  if(!throwing)glow(c,24,-36.7,4.6,warningColor,'#f50f3600');
 }
 c.restore();
}
function crossfade(c,older,newer,blend,clone){
 const resolution=2,size=128,ox=64,oy=104;
 blendCanvas??=Array.from({length:3},()=>raster(size*resolution));
 const [a,b,out]=blendCanvas;
 for(const [canvas,pose] of [[a,older],[b,newer]]){
  const layer=canvas.getContext('2d');
  layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,canvas.width,canvas.height);
  layer.setTransform(resolution,0,0,resolution,ox*resolution,oy*resolution);
  drawFigure(layer,pose,clone);
 }
 const mixed=out.getContext('2d');
 mixed.clearRect(0,0,out.width,out.height);
 const earlier=blend<.5;
 mixed.drawImage(earlier?a:b,0,0);
 mixed.save();mixed.globalCompositeOperation='source-atop';mixed.globalAlpha=earlier?blend:1-blend;
 mixed.drawImage(earlier?b:a,0,0);mixed.restore();
 c.drawImage(out,-ox,-oy,size,size);
}
function body(c,u,time){
 if(!sprite.naturalWidth)return;
 const clone=u.assassinClone,{pose,previous,blend}=sampleFigure(u,time);
 c.save();
 if(clone){
  for(let i=0;i<3;i++){const phase=(time*.72+i/3+u.id*.19)%1;
   ellipse(c,Math.sin(i*2.2+phase*2)*11,-phase*9,4+phase*3,2+phase*1.5,'rgba(149,109,177,'+(.15*(1-phase))+')');}
 }
 if(pose.mode==='dash'&&!reducedMotion?.matches){
  const sweep=Math.sin(Math.PI*Math.max(0,Math.min(1,pose.charge)));
  c.save();c.scale(pose.facing,1);c.globalAlpha*=(clone?.23:.64)*sweep;
  c.translate(18,-22);c.rotate(-.2);
  const edge=c.createLinearGradient(-40,0,17,0);
  edge.addColorStop(0,'rgba(180,145,182,0)');edge.addColorStop(.68,clone?'#b7a5cb':'#f15a75');edge.addColorStop(1,clone?'#eee5fa':'#fff3df');
  c.fillStyle=edge;c.beginPath();c.moveTo(-40,-12);c.quadraticCurveTo(-1,7,20,-5);c.quadraticCurveTo(1,15,-40,-12);c.fill();c.restore();
 }
 const flash=clone&&u.cloneFlashUntil>time;
 c.globalAlpha*=flash?.57:clone?.88:1;
 if(previous&&blend<=0)drawFigure(c,previous,clone);
 else if(previous)crossfade(c,previous,pose,blend,clone);
 else drawFigure(c,pose,clone);
 c.restore();
}
function groundShadow(c,u){
 const clone=u.assassinClone;
 c.save();c.translate(u.x+6,u.y+5);c.scale(1,.47);
 glow(c,0,0,31,clone?'#39234155':'#211917ad',clone?'#39234100':'#21191700');
 if(!clone)glow(c,-5,-7,22,'#21191772','#21191700');
 c.restore();
}
function throwWarning(c,u,a,now){
 const charge=progress(a,now,attack.windup),v=attack.throwVector(u,a);
 const boss=u.type==='ninjaAssassin';
 if(boss)Object.assign(v,{x:u.x,y:u.y,angle:a.angle});
 const length=boss?420:attack.starRange,width=boss?17:Math.tan(attack.starSpread)*length;
 c.save();c.translate(v.x,v.y);c.rotate(v.angle);
 const fill=c.createLinearGradient(0,0,length,0);
 fill.addColorStop(0,'#ee2f5252');fill.addColorStop(1,'#ee2f521a');
 c.fillStyle=fill;c.beginPath();c.moveTo(0,0);c.lineTo(length,-width);c.lineTo(length,width);c.fill();
 c.strokeStyle=warningColor;c.lineWidth=2;
 c.setLineDash([6,7]);c.beginPath();c.moveTo(length,-width);c.lineTo(0,0);c.lineTo(length,width);c.stroke();c.setLineDash([]);
 c.strokeStyle='#ff8f9c';c.lineWidth=2;
 for(let x=28;x<length*charge;x+=52){
  c.beginPath();c.moveTo(x-7,-4);c.lineTo(x,0);c.lineTo(x-7,4);c.stroke();
 }
 c.restore();
}
function ground(c,game){
 for(const u of game.units){const a=u.assassinAction;
  const boss=u.type==='ninjaAssassin';
  if((!boss&&u.type!=='assassin')||u.hp<=0||!game.visible(u))continue;
  if(!boss||!u.assassinClone)groundShadow(c,u);
  if(boss&&!u.assassinClone){
   root.FrontRotationView.ninjaBase(c,u);
  }
  if(a?.phase==='throw')throwWarning(c,u,a,game.time);
  if(a?.phase!=='warn')continue;
  const charge=progress(a,game.time,boss?.7:.75);
  c.save();c.translate(u.x,u.y);c.rotate(a.angle);
  c.fillStyle='#c719382e';c.fillRect(0,-5,a.length,10);
  c.strokeStyle=warningColor;c.lineWidth=2.3;
  c.setLineDash([8,5]);c.beginPath();c.moveTo(0,0);c.lineTo(a.length,0);c.stroke();c.setLineDash([]);
  c.fillStyle='#ff6379';c.fillRect(0,-1,a.length*charge,2);
  c.beginPath();c.moveTo(a.length,0);c.lineTo(a.length-9,-4);c.lineTo(a.length-9,4);c.fill();c.restore();
 }
}
// Four concave sides and one open central hole. Only the bevels catch the light.
function throwingStar(c,x,y,angle,clone){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(1,.92);
 const shape=new Path2D();shape.moveTo(0,-10);shape.quadraticCurveTo(1.5,-1.5,10,0);
 shape.quadraticCurveTo(1.5,1.5,0,10);shape.quadraticCurveTo(-1.5,1.5,-10,0);shape.quadraticCurveTo(-1.5,-1.5,0,-10);
 shape.closePath();shape.moveTo(2,0);shape.arc(0,0,2,0,tau);shape.closePath();
 c.fillStyle=clone?'#90889f':'#481124';c.fill(shape,'evenodd');c.strokeStyle=clone?'#c2bacb':'#ff4f59';c.lineWidth=1.35;c.stroke(shape);
 c.clip(shape,'evenodd');for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.fillStyle=clone?'#c2bbce':i%2?'#d02d4a':'#ffb0a6';
  c.beginPath();c.moveTo(0,-10);c.quadraticCurveTo(1.5,-1.5,10,0);c.lineTo(2.8,-2.8);c.closePath();c.fill();}
 c.restore();
}
function stars(c,g,visible){
 for(const star of g.roomCampaign?.assassinStars||[]){
  if(g.time<star.launchAt||!visible(star)||!star.source)continue;
  const clone=star.source.assassinClone,height=13+31*Math.max(0,1-(390-star.left)/100);
  c.save();c.globalAlpha*=clone?.62:1;c.translate(star.x,star.y-height);c.rotate(star.angle);
  const trail=c.createLinearGradient(-21,0,0,0);trail.addColorStop(0,'rgba(170,145,185,0)');trail.addColorStop(1,clone?'#b0a3ba':'#f37284');
  c.fillStyle=trail;c.beginPath();c.moveTo(-22,0);c.lineTo(0,-2);c.lineTo(0,2);c.fill();c.restore();
  c.save();c.globalAlpha*=clone?.65:1;
  throwingStar(c,star.x,star.y-height,g.time*19+star.angle,clone);c.restore();
 }
}
function event(c,e){
 if(!['assassinSmoke','assassinDecoy','assassinPuff'].includes(e.kind))return false;
 const small=e.kind==='assassinPuff',life=Math.max(0,e.t/e.max),p=1-life,spread=small?11:26;
 c.save();c.translate(e.x,e.y);c.globalAlpha*=life;
 if(!small){c.strokeStyle='rgba(159,103,194,.8)';c.lineWidth=2*life+.5;c.beginPath();c.ellipse(0,0,12+spread*p,5+11*p,0,0,tau);c.stroke();}
 for(let i=0;i<(small?4:8);i++){
  const a=i*2.4+e.seed*.7,x=Math.cos(a)*spread*(.2+p),y=Math.sin(a)*spread*.38-(small?17:9)-p*(8+i*2);
  const r=(small?4:10)+p*(small?3:7);
  glow(c,x,y,r,i%2?'rgba(130,87,157,.77)':'rgba(48,32,61,.84)','rgba(102,66,128,0)');
 }
 if(e.damage>0||e.kind==='assassinDecoy'){
  c.font='bold '+(small?12:15)+'px sans-serif';c.textAlign='center';c.lineWidth=2.5;c.strokeStyle='#494351';
  c.fillStyle=small?'#d5d0d5':'#e1c9ef';const label=small?String(Math.max(1,Math.round(e.damage))):'분신!';
  c.strokeText(label,0,-52-13*p);c.fillText(label,0,-52-13*p);
 }
 c.restore();return true;
}
root.FrontAssassinView={body,ground,stars,event,throwingStar,warningColor};
})(window);
