/* Commander ultimates: authored blade trails, turbulent flame and dual-gun fire.
 * Presentation only. Uses simulation time and the existing bounded particle pool. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function stamp(c,img,x,y,w,h,angle,alpha,blend='source-over'){
 if(!img||alpha<=0)return;c.save();c.globalAlpha*=clamp(alpha);c.globalCompositeOperation=blend;c.translate(x,y);c.rotate(angle);c.drawImage(img,-w/2,-h/2,w,h);c.restore();
}
function ribbon(c,r,start,span,width,color,alpha){
 // A pointed, asymmetric blade, with a full cutting edge and a vanishing tail.
 c.save();c.globalAlpha*=alpha;c.fillStyle=color;c.beginPath();
 for(let i=0;i<=32;i++){const t=i/32,a=start-span*(1-t),rr=r+Math.sin(t*Math.PI)*width*.16;if(i)c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
 for(let i=32;i>=0;i--){const t=i/32,a=start-span*(1-t),rr=r-width*Math.sin(Math.PI*t)**.65;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}
 c.closePath();c.fill();c.restore();
}
function install(Effects){
 if(!Effects||Effects.prototype.commanderMaterialVersion)return;
 const p=Effects.prototype,baseDraw=p.drawEvent,baseEmit=p.emit,baseUpdate=p.update,baseReset=p.reset,baseParticles=p.drawParticles;
 p.commanderMaterialVersion=1;
 p.reset=function(){baseReset.call(this);this.ultimateActors=new Map();this.ultimateCues=[];this.ultEmissionTimes=new Map();};
 p.update=function(game,visible=()=>true){
  baseUpdate.call(this,game,visible);this.ultimateActors??=new Map();this.ultimateCues??=[];
  const active=new Set();
  for(const u of game.units||[]){
   if(u.type!=='leader'||u.hp<=0||!u.ultimatePose?.active)continue;active.add(u.id);
   if(!this.ultimateActors.has(u.id)&&visible(u)){
    this.ultimateCues.push({source:u,x:u.x,y:u.y,team:u.team,appearance:u.appearance,at:game.time});
    if(this.ultimateCues.length>4)this.ultimateCues.shift();
   }
   this.ultimateActors.set(u.id,true);
  }
  for(const id of this.ultimateActors.keys())if(!active.has(id))this.ultimateActors.delete(id);
  this.ultimateCues=this.ultimateCues.filter(e=>game.time-e.at<.7&&e.source.hp>0);
 };
 p.emit=function(e){
  if(e.kind==='shionSpin'||e.kind==='ultimateVolley'||e.kind==='flame'&&e.boost){
   // Co-op snapshots recreate event objects. Stable identities prevent repeated
   // casings/sparks; the newest flame object must still replace the old one.
   this.ultEmissionTimes??=new Map();
   if(e.kind==='flame'){this.flameJets.set(this.flameKey(e),e);if(this.flameJets.size>4)this.flameJets.delete(this.flameJets.keys().next().value);}
   if(Number.isFinite(e.at)){
    const key=`${e.kind}:${e.sourceId??e.source?.id??0}:${e.at}:${e.shot||0}`;
    if(this.ultEmissionTimes.has(key))return;this.ultEmissionTimes.set(key,this.time);
    if(this.ultEmissionTimes.size>128)this.ultEmissionTimes.delete(this.ultEmissionTimes.keys().next().value);
   }
  }
  if(e.kind==='shionSpin'){
   const r=e.range||170;
   for(let i=0;i<18;i++){const a=i*2.399963+(e.shot||0)*.53,d=r*(.64+this.random()*.33),v=35+this.random()*80;this.add({kind:'spark',x:e.x+Math.cos(a)*d,y:e.y-16+Math.sin(a)*d*.78,vx:-Math.sin(a)*v,vy:Math.cos(a)*v*.7-16,life:.22+this.random()*.23,size:1.4+this.random()*1.3,team:e.team,color:i%3?'#ff577e':'#fff0e3',drag:1.1});}
   return;
  }
  if(e.kind==='ultimateVolley'){
   const m=this.muzzlePoint(e),a=e.angle||0,side=e.hand==='right'?1:-1;
   for(let i=0;i<3;i++)this.add({kind:'casing',x:m.x,y:m.y,vx:-Math.sin(a)*side*(35+i*17),vy:Math.cos(a)*side*30-50-i*12,gravity:210,life:.45+this.random()*.2,size:1.8,team:e.team,color:'#e8b66b'});
   this.add({kind:'whiteSmoke',x:m.x,y:m.y,vx:Math.cos(a)*25,vy:Math.sin(a)*15-25,size:5,growth:20,life:.3,team:e.team,alpha:.2});
   return;
  }
  if(e.kind==='flame'&&e.boost){
   this.flameJets.set(this.flameKey(e),e);if(this.flameJets.size>4)this.flameJets.delete(this.flameJets.keys().next().value);
   const a=e.angle||0;
   for(let i=0;i<9;i++){const d=e.range*(.28+this.random()*.67),off=(this.random()-.5)*Math.sin(e.arc/2)*d*1.35;this.add({kind:'spark',x:e.x+Math.cos(a)*d-Math.sin(a)*off,y:e.y+Math.sin(a)*d+Math.cos(a)*off-18,vx:Math.cos(a)*(50+this.random()*80),vy:Math.sin(a)*60-25-this.random()*35,life:.25+this.random()*.35,size:1+this.random()*1.1,team:e.team,color:i%3?'#ff993b':'#ffe3a4',drag:1.2});}
   return;
  }
  return baseEmit.call(this,e);
 };
 p.drawUltimateArea=function(c,u,state,time){
  if(u.hp<=0)return;
  const sword=u.appearance==='shion',flame=u.appearance==='blaze',r=sword?(root.FrontSword?.ultimateRange||170):flame?(root.FrontFlame?.ultimateRange||420):(root.FrontUltimate?.range||460),half=(flame?(root.FrontFlame?.ultimateArc||70*Math.PI/180):(root.FrontUltimate?.arc||136*Math.PI/180))/2,a=Number.isFinite(state.angle)?state.angle:0;
  c.save();c.translate(u.x,u.y);c.lineWidth=1;c.strokeStyle=sword?'#ffc2d261':'#ffe3a350';c.fillStyle=sword?'#9f153610':'#e7952910';c.beginPath();
  if(sword)c.arc(0,0,r,0,TAU);else{c.moveTo(0,0);c.arc(0,0,r,a-half,a+half);c.closePath();}c.fill();c.setLineDash([7,15]);c.stroke();c.setLineDash([]);
  // Broken floor streaks carry motion without hiding units or implying more range.
  c.strokeStyle=sword?'#ff6e91':'#f7bd70';c.globalAlpha=.25;c.lineWidth=1.6;
  for(let i=0;i<3;i++){const start=time*(sword?2.4:.7)+i*TAU/3;c.beginPath();c.ellipse(0,0,29+i*5,12+i*2,0,start,start+.7);c.stroke();}c.restore();
 };
 p.drawCommanderBlade=function(c,e){
  const q=clamp(1-e.t/Math.max(.001,e.max)),fade=Math.min(1,(1-q)*5),u=e.source?.hp>0?e.source:e,r=e.range||170,head=(e.angle||0)+q*TAU,m=this.prepareImpactMaterials?.();
  c.save();c.translate(u.x,u.y-16);c.scale(1,.78);
  // Dark red back edge makes the luminous blade readable on a bright wooden board.
  for(let i=2;i>=0;i--){const a=head-i*.72,reach=r*(.96-i*.11),span=2.45-i*.23;
   ribbon(c,reach+2,a,span,22-i*4,'#5f0e31',fade*(.19-i*.035));
   ribbon(c,reach,a,span,16-i*3,'#db295b',fade*(.56-i*.10));
   c.globalCompositeOperation='lighter';ribbon(c,reach-1,a-.025,span*.86,7-i*1.2,'#ff96b5',fade*(.78-i*.18));ribbon(c,reach-1,a-.045,span*.6,2.3,'#fff1e9',fade*(.95-i*.2));c.globalCompositeOperation='source-over';
  }
  // Small crossing cuts travel with the sharp leading tip, leaving the body clear.
  const tx=Math.cos(head-.12)*r*.93,ty=Math.sin(head-.12)*r*.93;
  c.save();c.translate(tx,ty);c.rotate(head-.12);c.globalCompositeOperation='lighter';c.globalAlpha=fade;c.strokeStyle='#fff0eb';c.lineWidth=1.5;c.beginPath();c.moveTo(-11,-7);c.lineTo(8,4);c.moveTo(-3,9);c.lineTo(3,-9);c.stroke();c.restore();
  if(m){stamp(c,m.flash,tx,ty,41,17,head,fade*.4,'lighter');for(let i=0;i<5;i++){const a=head-i*.7;stamp(c,m.dust[i%2],Math.cos(a)*r*.83,Math.sin(a)*r*.83+19,30+q*15,15,a,.12*fade);}}
  c.restore();return true;
 };
 p.drawCommanderFlame=function(c,e){
  const latest=this.flameJets.get(this.flameKey(e));if(latest&&latest!==e)return true;
  const m=this.prepareImpactMaterials?.();if(!m)return baseDraw.call(this,c,e);
  const origin=this.muzzlePoint(e),a=e.angle||0,source=e.source||e,dx=source.x+Math.cos(a)*e.range-origin.x,dy=source.y+Math.sin(a)*e.range-16-origin.y,clock=this.time,fade=clamp(e.t/.045),phase=((clock*2.8)%1+1)%1,steps=this.budget<=240?18:22;
  c.save();
  // A few low-opacity ash curls behind the fire keep the flame volumetric.
  for(let i=0;i<5;i++){const t=.5+i*.1,w=28+t*39,off=Math.sin(clock*5+i*2.1)*e.range*t*.12;stamp(c,m.smoke[i%3],origin.x+dx*t-Math.sin(a)*off,origin.y+dy*t+Math.cos(a)*off-12*t,w*1.5,w,clock*.15+i,.13*fade);}
  // Independent tongues advect from the real nozzle to the existing cone edge.
  for(let i=steps-1;i>=0;i--){const t=(i+phase)/steps,spread=Math.sin(e.arc/2)*e.range*t,heat=(1-t*.5)*fade,ax=origin.x+dx*t,ay=origin.y+dy*t-5*t;
   for(let lane=-1;lane<=1;lane++){const off=lane*spread*.63+Math.sin(t*18-clock*14+lane)*spread*.17,px=ax-Math.sin(a)*off,py=ay+Math.cos(a)*off,w=40+t*115,h=(20+t*72)*(lane===0?1:.84),turn=a+Math.sin(i*2.3+clock*7+lane)*.38;
    stamp(c,m.fire[(i+lane+3)%3],px,py,w,h,turn,heat*(lane===0?.80:.65));
    if(lane===0&&i%2===0)stamp(c,m.fire[(i+1)%3],px,py,w*.72,h*.45,turn,heat*.25,'lighter');
   }
  }
  // Hot pressure core at the nozzle, never a solid triangular cone.
  stamp(c,m.fire[2],origin.x+Math.cos(a)*19,origin.y+Math.sin(a)*19,58,18,a,.78*fade,'lighter');stamp(c,m.flash,origin.x,origin.y,35,24,a,.65*fade,'lighter');c.restore();return true;
 };
 p.drawCommanderVolley=function(c,e){
  const q=clamp(1-e.t/Math.max(.001,e.max)),m=this.prepareImpactMaterials?.(),origin=this.muzzlePoint(e),a=e.angle||0,shot=e.shot||0,range=e.range||460,arc=e.arc||136*Math.PI/180;
  c.save();
  // Seven moving streaks follow the firing fan; each dies at its own endpoint.
  for(let i=0;i<7;i++){const heading=a+(i/6-.5)*arc*.94+Math.sin(shot*2.1+i)*.014,reach=range*(.84+((i+shot)%3)*.07),progress=clamp(q*1.22-i%3*.018),tx=e.x+Math.cos(heading)*reach,ty=e.y+Math.sin(heading)*reach-14,dx=tx-origin.x,dy=ty-origin.y,len=Math.hypot(dx,dy)||1,x=origin.x+dx*progress,y=origin.y+dy*progress,tail=Math.min(44,len*progress),fade=clamp((1-progress)/.16);
   if(progress<=0||fade<=0)continue;
   const x0=x-dx/len*tail,y0=y-dy/len*tail,g=c.createLinearGradient(x0,y0,x,y);g.addColorStop(0,'#ffc47700');g.addColorStop(.65,e.appearance==='shino'?'#ffd4be':'#ffce7b');g.addColorStop(1,'#fff8dd');c.strokeStyle=g;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.lineTo(x,y);c.globalCompositeOperation='source-over';c.globalAlpha=fade*.22;c.lineWidth=5;c.stroke();c.globalCompositeOperation='lighter';c.globalAlpha=fade*.95;c.lineWidth=1.8;c.stroke();
   if(m)stamp(c,m.flash,x,y,11,5,Math.atan2(dy,dx),fade*.65,'lighter');
  }
  c.globalAlpha=1;
  if(m){const flash=clamp(1-q/.62);stamp(c,m.fire[shot%3],origin.x+Math.cos(a)*12,origin.y+Math.sin(a)*12,41,19,a,flash*.95,'lighter');stamp(c,m.flash,origin.x,origin.y,42,30,a,flash*.65,'lighter');for(const side of [-1,1])stamp(c,m.fire[1],origin.x-Math.sin(a)*side*5,origin.y+Math.cos(a)*side*5,20,8,a+side*.8,flash*.6,'lighter');}
  else{c.globalAlpha=1-q;c.strokeStyle='#fff3c8';c.lineWidth=3;c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(origin.x+Math.cos(a)*24,origin.y+Math.sin(a)*24);c.stroke();}
  c.restore();return true;
 };
 p.drawEvent=function(c,e){
  if(e.kind==='shionSpin')return this.drawCommanderBlade(c,e);
  if(e.kind==='flame'&&e.boost)return this.drawCommanderFlame(c,e);
  if(e.kind==='ultimateVolley')return this.drawCommanderVolley(c,e);
  return baseDraw.call(this,c,e);
 };
 p.drawParticles=function(c,visible=()=>true){
  baseParticles.call(this,c,visible);const m=this.prepareImpactMaterials?.();
  for(const e of this.ultimateCues||[]){if(!visible(e)||e.source.hp<=0)continue;const q=clamp((this.time-e.at)/.7),k=1-q,u=e.source,sword=e.appearance==='shion',color=sword?'#ff95b0':'#ffdf9e',r=22+90*(1-Math.pow(k,3));
   c.save();c.globalCompositeOperation='lighter';
   if(m){stamp(c,m.flash,u.x,u.y-18,85,29,0,clamp(1-q/.22)*.43,'lighter');for(let i=0;i<5;i++){const a=i*2.399963;stamp(c,m.dust[i%2],u.x+Math.cos(a)*r,u.y+Math.sin(a)*r*.42,35+q*25,12+q*10,a,k*.16,'source-over');}}
   c.strokeStyle=color;c.lineWidth=1.3;c.globalAlpha=k*.85;
   for(let i=0;i<14;i++){const a=i*2.399963,d=24+q*(33+i%4*10),x=u.x+Math.cos(a)*d,y=u.y+Math.sin(a)*d*.45-q*(20+i%3*12);c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*5*k,y-6*k);c.stroke();}c.restore();
  }
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install(root.FrontEffects);
})(typeof window==='undefined'?globalThis:window);
