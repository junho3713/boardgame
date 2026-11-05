/* Rina's supplied action sheets. Presentation only; combat remains the medic's original rules. */
(()=>{'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
class FrontMedicSkin{
 constructor(){this.loaded=false;this.failures=0;this.states={};this.motion=new WeakMap();this.ready=fetch('assets/rina/manifest-v2.json?v=20261105',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('rina manifest');return r.json();}).then(async data=>{this.manifest=data;await Promise.all(Object.entries(data.states).map(([name,s])=>new Promise(resolve=>{const image=new Image();this.states[name]={...s,image};image.onload=()=>{if(typeof document!=='undefined'){const shadow=document.createElement('canvas');shadow.width=image.naturalWidth;shadow.height=image.naturalHeight;const c=shadow.getContext('2d');if(c){c.drawImage(image,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#17271e';c.fillRect(0,0,shadow.width,shadow.height);this.states[name].shadow=shadow;if(!s.bakedMotion)this.makeHair(this.states[name]);}}resolve();};image.onerror=()=>{this.failures++;resolve();};image.src='assets/rina/'+s.file+'?v=20261105';})));this.loaded=!this.failures&&['directions','heal','healSide','healBack','hit','death','walkFront','walkFrontLeft','walkSide','walkBackLeft','walkBack'].every(k=>this.states[k]?.frames?.length);}).catch(()=>{this.failures++;});}
 makeHair(state){
  const image=state.image,base=document.createElement('canvas'),hair=document.createElement('canvas');base.width=hair.width=image.naturalWidth;base.height=hair.height=image.naturalHeight;const b=base.getContext('2d'),h=hair.getContext('2d');if(!b?.getImageData||!h?.createImageData)return;b.drawImage(image,0,0);const pixels=b.getImageData(0,0,base.width,base.height),locks=h.createImageData(base.width,base.height);
  for(const f of state.frames){const [x,y,w,height]=f.rect;for(let py=y;py<y+height*.4;py++)for(let px=x;px<x+w;px++){const i=(Math.floor(py)*base.width+Math.floor(px))*4,r=pixels.data[i],g=pixels.data[i+1],blue=pixels.data[i+2];if(pixels.data[i+3]>0&&r>150&&g>95&&r>g*1.06&&g>blue*1.35){locks.data.set(pixels.data.subarray(i,i+4),i);pixels.data[i+3]=0;}}}
  b.putImageData(pixels,0,0);h.putImageData(locks,0,0);state.base=base;state.hair=hair;
 }
 isRina(u){return u.team===0&&u.type==='medic'&&u.appearance==='rina';}
 pose(u,time){let m=this.motion.get(u);const fresh=!m;if(!m)m={x:u.x,y:u.y,time,phase:((u.walk||0)/((this.manifest?.walkStride||56)*.12))%1,walking:false,heading:u.face??Math.PI/2,lastMovedAt:-Infinity};const dt=Math.max(0,time-m.time);
  if(!fresh&&dt===0)return m.lastPose;
  const dx=u.x-m.x,dy=u.y-m.y,travel=Math.hypot(dx,dy),stepMoved=dt>0&&travel>.035&&travel/dt>3;
  if(stepMoved){const heading=Math.atan2(dy,dx);m.heading+=delta(heading,m.heading)*Math.min(1,dt*14);m.lastMovedAt=time;m.phase=(m.phase+Math.min(travel,35)/(this.manifest?.walkStride||56))%1;}
  const moving=stepMoved||m.walking&&time-m.lastMovedAt<.09;
  const healing=time<(u.healUntil||0),hurt=time<(u.hurtUntil||0),dead=u.hp<=0;
  // A moving medic keeps her stride and body heading while the treatment effect aims separately.
  const face=moving?m.heading:healing?(u.healAngle??u.face):(u.aimFace??u.face??Math.PI/2),wanted=face-Math.PI/2,step=TAU/8;
  let angle=m.angle;if(!Number.isFinite(angle)||Math.abs(delta(wanted,angle))>step/2+.12)angle=Math.round(wanted/step)*step;
  const direction=((Math.round(angle/step)%8)+8)%8,front=[0,1,7].includes(direction);let state='directions',frame=direction;
  if(dead){state='death';frame=Math.min(3,Math.floor(Math.max(0,time-(u.diedAt??time))/.2));}
  else if(hurt){state='hit';frame=Math.min(3,Math.floor(clamp((time-(u.hurtStartedAt??time))/.32,0,.999)*4));}
  else if(moving){state=['walkFront','walkFrontLeft','walkSide','walkBackLeft','walkBack','walkBackLeft','walkSide','walkFrontLeft'][direction];frame=Math.floor(m.phase*8)%8;}
  else if(healing){state=[2,6].includes(direction)?'healSide':[3,4,5].includes(direction)?'healBack':'heal';frame=Math.min(3,Math.floor(clamp((time-(u.healStartedAt??time))/.7,0,.999)*4));}
  else if(!moving&&front&&!healing&&!this.manifest?.directionalIdle){state='idle';frame=Math.floor(time*2.3+(u.id||0)*.37)%4;}
  const result={state,frame,direction,face,phase:m.phase,walking:moving,healing,dead,flip:state!=='directions'&&[5,6,7].includes(direction)};
  Object.assign(m,{x:u.x,y:u.y,time,walking:moving,face,angle,lastPose:result});this.motion.set(u,m);return result;
 }
 tile(ctx,state,frame,shadow=false,dx=0,dy=0){
  const s=this.states[state],f=s?.frames[frame];if(!f)return;
  const r=f.rect,a=f.anchor||[r[2]/2,r[3]-12],k=(this.manifest.height||84)/(this.manifest.cellHeight||320);
  // One continuous display projection shortens the lower leg proportion for the existing toy scale.
  // It is identical across walk poses; the feet are never independently clipped or translated.
  const projection=state==='death'?null:this.manifest.toyProjection;
  const draw=(image,hx=0,hy=0)=>{if(!image)return;
   if(!projection){ctx.drawImage(image,...r,-a[0]*k+dx+hx,-a[1]*k+dy+hy,r[2]*k,r[3]*k);return;}
   const cut=projection.legTop,leg=projection.legScale,join=(cut-a[1])*leg*k,x=-a[0]*k+dx+hx;
   ctx.drawImage(image,r[0],r[1],r[2],cut,x,join-cut*k+dy+hy,r[2]*k,cut*k);
   ctx.drawImage(image,r[0],r[1]+cut,r[2],r[3]-cut,x,join+dy+hy,r[2]*k,(r[3]-cut)*leg*k);
  };
  draw(shadow?s.shadow:(s.base||s.image));
  if(!shadow&&s.hair)draw(s.hair,Math.sin(this.hairPhase||0)*.25,Math.sin((this.hairPhase||0)*.7)*.10);
 }
 draw(ctx,u,time){if(!this.loaded||!this.isRina(u))return false;const p=this.pose(u,time),age=Math.max(0,time-(u.diedAt??time)),phase=p.phase*TAU,bob=Math.sin(time*2.2+(u.id||0));
  this.hairPhase=p.dead?0:time*2.2+(u.id||0)*.7+phase*.25;ctx.save();if(p.dead)ctx.globalAlpha*=1-clamp((age-.85)/.35,0,1);if(p.flip)ctx.scale(-1,1);
  ctx.save();ctx.globalAlpha*=.17;ctx.fillStyle='#15271d';ctx.beginPath();ctx.ellipse(0,2,p.dead?25:18,p.dead?7:5,0,0,TAU);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha*=.20;ctx.transform(1,0,-.46,-.29,1,1.5);ctx.filter='blur(1.5px)';this.tile(ctx,p.state,p.frame,true);ctx.restore();
  // Baked, articulated steps keep their planted feet; idle breathing pivots at ground.
  ctx.save();if(!p.dead&&!p.walking&&!p.healing)ctx.scale(1+bob*.002,1+bob*.003);
  this.tile(ctx,p.state,p.frame);ctx.restore();
  ctx.restore();
  if(p.healing&&!p.dead){const progress=clamp((time-(u.healStartedAt??time))/.7,0,1),healFace=u.healAngle??p.face;if(progress>.25&&progress<.85){ctx.save();ctx.translate(Math.cos(healFace)*13,-32+Math.sin(healFace)*7);ctx.rotate(healFace);for(let i=0;i<7;i++){const t=(progress*1.8+i*.11)%1;ctx.globalAlpha=(1-t)*.32;ctx.fillStyle=i%2?'#e5fff5':'#93efd5';ctx.beginPath();ctx.ellipse(8+t*28,Math.sin(i*2.4)*t*7,1.5+t*2,.8+t*1.3,0,0,TAU);ctx.fill();}ctx.restore();}}
  return true;
 }
 diagnostics(){return{loaded:this.loaded,failures:this.failures,states:Object.keys(this.states)};}
}
window.FrontMedicSkin=FrontMedicSkin;
})();
