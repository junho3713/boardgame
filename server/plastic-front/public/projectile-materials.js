/* Textured projectiles and world-space exhaust. Rendering only; simulation owns flight. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
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
 const p=Effects.prototype,oldLucky=p.drawLuckyMissile;p.projectileMaterialVersion=1;
 p.prepareCombatMaterials=function(){
  const a=loadAssets(),m=this.prepareImpactMaterials?.();
  if(m){this.textures.smoke=m.smoke[0];this.textures.exhaust=m.smoke[1];this.textures.fire=m.fire[0];}
  this.combatAssets=a;return a.ready.then(()=>{if(a.fire?.naturalWidth)this.impactFireImage=a.fire;});
 };
 p.drawMaterialMissile=function(c,x,y,angle,time,kind='boss',size=1,{exhaust=true}={}){
  const a=this.combatAssets||loadAssets(),image=a[kind];if(!image?.complete||!image.naturalWidth)return false;
  const width=(kind==='boss'?86:69)*size,height=width*image.naturalHeight/image.naturalWidth;
  c.save();c.translate(x,y);c.rotate(angle);
  if(exhaust)this.drawPropulsion(c,-width*.462,0,time,kind==='boss'?1.12*size:.83*size);
  c.globalCompositeOperation='source-over';c.globalAlpha=1;c.drawImage(image,-width/2,-height/2,width,height);c.restore();return true;
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
 p.drawLuckyMissile=function(c,x,y,angle,time){if(!this.drawMaterialMissile(c,x,y,angle,time,'lucky'))return oldLucky.call(this,c,x,y,angle,time);};
 p.materialShotPose=function(b){
  const flight=b.target?.visualFlightHeight??root.FrontTypes?.[b.target?.type]?.flightHeight??0,from=root.FrontTypes?.[b.source?.type]?.flightHeight||0,total=b.source?Math.hypot(b.target.x-b.source.x,b.target.y-b.source.y):1,progress=clamp(1-Math.hypot(b.target.x-b.x,b.target.y-b.y)/Math.max(1,total));
  return{x:b.x,y:b.y-(b.kind==='bossKiller'?22:16)-from*(1-progress)-flight*progress,angle:Math.atan2(b.target.y-b.y,b.target.x-b.x),team:b.team};
 };
 p.emitMaterialTrail=function(b,pose,time,visible=()=>true){
  const motor=b.kind==='missile'||b.kind==='rocket'||b.kind==='bossKiller',last=this.trails.get(b),period=motor?.04:.08;
  if(last&&time-last.time<period)return;
  const dt=last?time-last.time:period,steps=Math.min(3,Math.max(1,Math.ceil(dt/period))),boss=b.kind==='bossKiller',lucky=b.kind==='missile'&&b.source?.type==='lucky',tail=boss?39:lucky?31:motor?9:6;
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
