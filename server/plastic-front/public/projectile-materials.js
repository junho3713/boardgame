/* Textured projectiles and world-space exhaust. Rendering only; simulation owns flight. */
(function(root){'use strict';
const TAU=Math.PI*2,MISSILE_LENGTH_SCALE=.8,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
let assets=null;
function loadAssets(){
 if(assets)return assets;
 assets={};const jobs=[];
 if(typeof root.Image==='undefined'){assets.ready=Promise.resolve();return assets;}
 for(const [key,file]of Object.entries({boss:'boss-killer-v20261106.png',lucky:'jackpot-missile-v20261106.png',fire:'impact-fire-v20261106.png'})){
  const image=assets[key]=new root.Image();jobs.push(new Promise(resolve=>{image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src='assets/effects/'+file;}));
 }
 assets.ready=Promise.all(jobs);return assets;
}
function install(Effects){
 if(!Effects||Effects.prototype.projectileMaterialVersion)return;
 const p=Effects.prototype,oldLucky=p.drawLuckyMissile,oldMortarPose=p.mortarPose;p.projectileMaterialVersion=2;
 p.prepareCombatMaterials=function(){
  const a=loadAssets(),m=this.prepareImpactMaterials?.();
  if(m){this.textures.smoke=m.smoke[0];this.textures.exhaust=m.smoke[1];this.textures.fire=m.fire[0];}
  this.combatAssets=a;return a.ready.then(()=>{if(a.fire?.naturalWidth)this.impactFireImage=a.fire;});
 };
 p.missileGeometry=function(kind,size=1,anchor='tip'){
  const scale=kind==='boss'&&anchor==='tip'?1.2:1,width=(kind==='boss'?76:58)*size*MISSILE_LENGTH_SCALE*scale,offset=anchor==='tip'?-width*.47:0;
  return{width,scale,offset,nozzle:offset-width*.462};
 };
 p.drawMaterialMissile=function(c,x,y,angle,time,kind='boss',size=1,{exhaust=true,anchor='center'}={}){
  const a=this.combatAssets||loadAssets(),image=a[kind];if(!image?.complete||!image.naturalWidth)return false;
  const {width,scale,offset,nozzle}=this.missileGeometry(kind,size,anchor),height=width/MISSILE_LENGTH_SCALE*image.naturalHeight/image.naturalWidth;
  c.save();c.translate(x,y);c.rotate(angle);
  if(exhaust)this.drawPropulsion(c,nozzle,0,time,(kind==='boss'?1.12:.83)*size*scale);
  c.globalCompositeOperation='source-over';c.globalAlpha=1;c.drawImage(image,offset-width/2,-height/2,width,height);c.restore();return true;
 };
 p.drawPropulsion=function(c,x,y,time,size=1){
  const m=this.prepareImpactMaterials?.();if(!m)return;
  c.save();c.translate(x,y);c.scale(size,size);c.globalCompositeOperation='lighter';
  const flicker=.9+.1*Math.sin(time*47)+.06*Math.cos(time*79),length=45*flicker;
  c.globalAlpha=.25;c.drawImage(m.flash,-36,-17,57,34);
  // Three turbulent layers form a pinched, flickering jet with a white hot throat.
  for(let i=2;i>=0;i--){c.globalAlpha=.55-i*.12;c.save();c.translate(-7-i*9,Math.sin(time*31+i*2)*(.6+i*.4));c.rotate(Math.sin(time*21+i)*.04);c.drawImage(m.fire[i],-length*(.7+i*.13),-7-i*.5,length*(1+i*.12),14+i);c.restore();}
  c.globalAlpha=.95;c.drawImage(m.flash,-15,-4,22,8);c.restore();
 };
 p.drawLuckyMissile=function(c,x,y,angle,time){if(!this.drawMaterialMissile(c,x,y,angle,time,'lucky',1,{anchor:'tip'}))return oldLucky.call(this,c,x-Math.cos(angle)*27,y-Math.sin(angle)*27,angle,time);};
 // Keep the seven launch lanes, but scale their curvature to the actual distance.
 // fromY already includes the launcher's height; do not subtract it a second time.
 p.mortarPose=function(b,time){
  if(b.kind!=='missile'||b.source?.type!=='lucky')return oldMortarPose.call(this,b,time);
  const k=clamp(1-(b.landAt-time)/b.delay),q=.6*k+.4*k*k,dq=.6+.8*k;
  const dx=b.x-b.fromX,dy=b.y-b.fromY,d=Math.max(1,Math.hypot(dx,dy)),rise=Math.min(48,d*.13),lane=(b.luckyLane||0)*Math.min(.36,d*.001);
  const wave=Math.sin(Math.PI*q),slope=Math.PI*Math.cos(Math.PI*q),sway=wave*lane;
  const x=b.fromX+dx*q-dy/d*sway,groundY=b.fromY+dy*q+dx/d*sway,height=wave*rise;
  return{x,y:groundY-height,groundY:groundY+24*(1-q),height,k,team:b.team,angle:Math.atan2((dy+dx/d*lane*slope-rise*slope)*dq,(dx-dy/d*lane*slope)*dq)};
 };
 p.materialShotPose=function(b){
  if(b.kind==='bossKiller'&&b.guidedFlight){
   const f=b.guidedFlight,k=clamp(f.progress),q=.6*k+.4*k*k,height=f.launchHeight*(1-q)+f.targetHeight*q+Math.sin(Math.PI*k)*Math.min(18,f.distance*.055);
   return{x:b.x,y:b.y-height,angle:f.heading,height,team:b.team};
  }
  const flight=b.target?.visualFlightHeight??root.FrontTypes?.[b.target?.type]?.flightHeight??0,from=root.FrontTypes?.[b.source?.type]?.flightHeight||0,total=b.source?Math.hypot(b.target.x-b.source.x,b.target.y-b.source.y):1,progress=clamp(1-Math.hypot(b.target.x-b.x,b.target.y-b.y)/Math.max(1,total));
  return{x:b.x,y:b.y-(b.kind==='bossKiller'?22:16)-from*(1-progress)-flight*progress,angle:Math.atan2(b.target.y-b.y,b.target.x-b.x),team:b.team};
 };
 p.emitMaterialTrail=function(b,pose,time,visible=()=>true){
  const motor=b.kind==='missile'||b.kind==='rocket'||b.kind==='bossKiller',last=this.trails.get(b),period=motor?.04:.08;
  if(last&&time-last.time<period)return;
  const dt=last?time-last.time:period,steps=Math.min(3,Math.max(1,Math.ceil(dt/period))),boss=b.kind==='bossKiller',lucky=b.kind==='missile'&&b.source?.type==='lucky',tail=boss||lucky?-this.missileGeometry(boss?'boss':'lucky').nozzle:motor?9:6;
  this.trails.set(b,{time,x:pose.x,y:pose.y});
  if(!visible(pose))return;
  for(let i=1;i<=steps;i++){
   const q=i/steps,x=(last?last.x+(pose.x-last.x)*q:pose.x)-Math.cos(pose.angle)*tail,y=(last?last.y+(pose.y-last.y)*q:pose.y)-Math.sin(pose.angle)*tail;
   this.add({kind:boss?'exhaust':'whiteSmoke',x:x+(this.random()-.5)*2,y:y+(this.random()-.5)*2,vx:-Math.cos(pose.angle)*(motor?12:2)+(this.random()-.5)*9,vy:-Math.sin(pose.angle)*10-7,size:boss?6:lucky?5:motor?4:2,growth:boss?23:lucky?18:motor?12:5,life:boss?.65:lucky?.55:motor?.4:.22,drag:1.1,team:b.team,alpha:boss?.37:lucky?.28:.19});
  }
 };
 p.drawMaterialTracer=function(c,b){
  const q=this.materialShotPose(b),style=b.evoStyle,color=style==='pierce'?'#bfe7ef':style==='ricochet'?'#e4d8a0':style==='heatPierce'?'#ffb763':'#ffdc99',length=style==='pierce'?64:style==='heatPierce'?47:30,width=style==='pierce'?2.5:style==='heatPierce'?2:1.5,m=this.prepareImpactMaterials?.();
  c.save();c.translate(q.x,q.y);c.rotate(q.angle);c.globalCompositeOperation='lighter';
  const g=c.createLinearGradient(-length,0,2,0);g.addColorStop(0,color+'00');g.addColorStop(.65,color+'95');g.addColorStop(1,'#fff9e8');c.strokeStyle=g;c.lineCap='round';
  c.globalAlpha=.18;c.lineWidth=width*4;c.beginPath();c.moveTo(-length,0);c.lineTo(2,0);c.stroke();c.globalAlpha=.95;c.lineWidth=width;c.stroke();
  if(m){c.globalAlpha=.8;c.drawImage(m.flash,-10,-5,20,10);}c.globalCompositeOperation='source-over';c.fillStyle='#fff0c4';c.beginPath();c.moveTo(5,0);c.lineTo(1,-1.4);c.lineTo(-4,-1.3);c.lineTo(-4,1.3);c.lineTo(1,1.4);c.closePath();c.fill();c.restore();
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install(root.FrontEffects);
})(typeof window==='undefined'?globalThis:window);
