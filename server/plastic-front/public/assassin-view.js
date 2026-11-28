/* The same figure and single four-point silhouette are used for the real ninja and her doubles. */
(function(root){'use strict';
const tau=2*Math.PI,sprite=new Image(),attack=root.FrontAssassin;
// Each action frame has a foot anchor. All four stride cells share one ground point.
const poses=[{x:.511,y:.966},{x:.463,y:.964},{x:.416,y:.914}];
const strideAnchor={x:.5,y:.966},reducedMotion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
let shade=null,throwLayers=null,cloneThrowLayers=null;
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
sprite.onload=()=>{
 shade=document.createElement('canvas');shade.width=sprite.naturalWidth;shade.height=sprite.naturalHeight;
 const c=shade.getContext('2d');c.drawImage(sprite,0,0);c.globalCompositeOperation='source-atop';
 c.fillStyle='rgba(115,79,157,.87)';c.fillRect(0,0,shade.width,shade.height);
 throwLayers=splitThrowPose(sprite);cloneThrowLayers=splitThrowPose(shade);

};
sprite.src='assets/models/kunoichi.webp?v=seven-poses';
function ellipse(c,x,y,rx,ry,paint){c.beginPath();c.ellipse(x,y,rx,ry,0,0,tau);c.fillStyle=paint;c.fill();}
function glow(c,x,y,r,inner,outer){
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);
 c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}
function progress(a,time,duration){return Math.max(0,Math.min(1,1-(a.until-time)/duration));}
function raisedStar(c,layers,left,top,size,clone,charge){
 const pivotX=252/384*size,pivotY=219/384*size;
 c.drawImage(layers.torso,left,top,size,size);
 c.save();c.translate(left+pivotX,top+pivotY);c.rotate(-.91*charge);
 c.drawImage(layers.arm,-pivotX,-pivotY,size,size);
 const x=49/384*size,y=-1/384*size;
 c.globalAlpha*=.5+.5*charge;
 glow(c,x,y,6+charge*5,clone?'#d4c5e5':'#ff2c50',clone?'#d4c5e500':'#ff264600');
 c.restore();
}
function body(c,u,time){
 if(!sprite.naturalWidth)return;
 const clone=u.assassinClone,action=u.assassinAction,pose=action?.phase,throwing=pose==='throw',preparing=throwing||pose==='warn';
 const charge=preparing?progress(action,time,throwing?attack.windup:.75):0;
 c.save();
 if(clone){
  for(let i=0;i<3;i++){const phase=(time*.72+i/3+u.id*.19)%1;
   ellipse(c,Math.sin(i*2.2+phase*2)*11,-phase*9,4+phase*3,2+phase*1.5,'rgba(149,109,177,'+(.15*(1-phase))+')');}
 }
 const sign=Math.cos(u.face)<0?-1:1;
 const released=time-(u.assassinReleasedAt??-Infinity)<.28;
 const moving=!pose&&!released&&time-(u.assassinStepAt??-Infinity)<.09;
 const stride=3+Math.floor((u.walk||0)*.94)%4;
 let frame=0;
 if(pose==='dash'||pose==='retreat'&&u.assassinAction.until-time>.35)frame=2;
 else if(!preparing&&released)frame=1;
 else if(moving)frame=stride;
 c.scale(sign,1);
 if(preparing&&!reducedMotion?.matches){
  const windup=charge*charge*(3-2*charge);
  c.translate((throwing?-4:2)*windup,0);
  c.scale(1+.035*windup,1-(throwing?.085:.055)*windup);c.rotate((throwing?-.12:.09)*windup);
 }
 if(pose==='dash'&&!reducedMotion?.matches){
  const a=u.assassinAction,progress=1-a.left/a.length;
  const sweep=Math.sin(Math.PI*Math.max(0,Math.min(1,progress)));
  c.save();c.globalAlpha*=(clone?.23:.64)*sweep;
  c.translate(18,-22);c.rotate(-.2);
  const edge=c.createLinearGradient(-40,0,17,0);
  edge.addColorStop(0,'rgba(180,145,182,0)');edge.addColorStop(.68,clone?'#b7a5cb':'#f15a75');edge.addColorStop(1,clone?'#eee5fa':'#fff3df');
  c.fillStyle=edge;c.beginPath();c.moveTo(-40,-12);c.quadraticCurveTo(-1,7,20,-5);c.quadraticCurveTo(1,15,-40,-12);c.fill();c.restore();
 }
 const flash=clone&&u.cloneFlashUntil>time;c.globalAlpha*=flash?.57:clone?.88:1;
 const figure=flash&&shade?shade:sprite,cell=sprite.naturalHeight,anchor=poses[frame]||strideAnchor,size=90;
 const layers=flash?cloneThrowLayers:throwLayers,left=-anchor.x*size,top=-anchor.y*size;
 if(throwing&&layers)raisedStar(c,layers,left,top,size,clone,reducedMotion?.matches?1:Math.min(1,.28+charge*1.2));
 else c.drawImage(figure,frame*cell,0,cell,cell,left,top,size,size);
 if(preparing){
  const intensity=.8+.2*Math.sin(time*29),light=clone?'#bdb1d1':'#ff273f',outside=clone?'rgba(196,182,216,0)':'rgba(245,15,54,0)';
  c.globalAlpha*=clone?.42:intensity;
  for(const [x,y,r] of [[3.3,-52.3,3.1],[12.6,-53,3.1],[-17,-25,4.6]])glow(c,x,y,r,light,outside);
  if(!throwing)glow(c,24,-36.7,4.6,light,outside);
 }
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
 const clone=u.assassinClone,charge=progress(a,now,attack.windup),v=attack.throwVector(u,a);
 const length=attack.starRange,width=Math.tan(attack.starSpread)*length;
 c.save();c.translate(v.x,v.y);c.rotate(v.angle);
 const fill=c.createLinearGradient(0,0,length,0);
 fill.addColorStop(0,clone?'#cab3df24':'#e3376552');fill.addColorStop(1,clone?'#cab3df06':'#e3376512');
 c.fillStyle=fill;c.beginPath();c.moveTo(0,0);c.lineTo(length,-width);c.lineTo(length,width);c.fill();
 c.strokeStyle=clone?'#e5d9f2a8':'#ff758e';c.lineWidth=clone?1.25:2;
 c.setLineDash([6,7]);c.beginPath();c.moveTo(length,-width);c.lineTo(0,0);c.lineTo(length,width);c.stroke();c.setLineDash([]);
 c.strokeStyle=clone?'#e0cfed9e':'#ffbad0';c.lineWidth=2;
 for(let x=28;x<length*charge;x+=52){
  c.beginPath();c.moveTo(x-7,-4);c.lineTo(x,0);c.lineTo(x-7,4);c.stroke();
 }
 c.restore();
}
function ground(c,game){
 for(const u of game.units){const a=u.assassinAction;
  if(u.type!=='assassin'||u.hp<=0||!game.visible(u))continue;
  groundShadow(c,u);
  if(a?.phase==='throw')throwWarning(c,u,a,game.time);
  if(a?.phase!=='warn')continue;
  const clone=u.assassinClone,charge=Math.max(0,1-(a.until-game.time)/.75);
  c.save();c.translate(u.x,u.y);c.rotate(a.angle);
  c.fillStyle=clone?'rgba(145,131,161,.1)':'rgba(187,19,54,.17)';c.fillRect(0,-5,a.length,10);
  c.strokeStyle=clone?'rgba(209,200,221,.57)':'#ff4766';c.lineWidth=clone?1.4:2.3;
  c.setLineDash([8,5]);c.beginPath();c.moveTo(0,0);c.lineTo(a.length,0);c.stroke();c.setLineDash([]);
  c.fillStyle=clone?'#b7a8c6':'#ff6379';c.fillRect(0,-1,a.length*charge,2);
  c.beginPath();c.moveTo(a.length,0);c.lineTo(a.length-9,-4);c.lineTo(a.length-9,4);c.fill();c.restore();
 }
}
// Four concave sides and one open central hole. Only the bevels catch the light.
function throwingStar(c,x,y,angle,clone){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(1,.92);
 const shape=new Path2D();shape.moveTo(0,-10);shape.quadraticCurveTo(1.5,-1.5,10,0);
 shape.quadraticCurveTo(1.5,1.5,0,10);shape.quadraticCurveTo(-1.5,1.5,-10,0);shape.quadraticCurveTo(-1.5,-1.5,0,-10);
 shape.closePath();shape.moveTo(2,0);shape.arc(0,0,2,0,tau);shape.closePath();
 c.fillStyle=clone?'#90889f':'#342e3a';c.fill(shape,'evenodd');c.strokeStyle=clone?'#c2bacb':'#f9dfdc';c.lineWidth=1;c.stroke(shape);
 c.clip(shape,'evenodd');for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.fillStyle=clone?'#bcb3ca':i%2?'#d0bac2':'#fce7e5';
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
  throwingStar(c,star.x,star.y-height,g.time*19+star.angle,clone);
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
root.FrontAssassinView={body,ground,stars,event};
})(window);
