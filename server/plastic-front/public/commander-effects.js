/* Commander ultimates: authored blade trails, turbulent flame and dual-gun fire.
 * Presentation only. Uses simulation time and the existing bounded particle pool. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
let sharedAssets=null,sharedReady=null;
const readyImage=image=>image?.complete&&image.naturalWidth>0&&image.naturalHeight>0;
function bladeStamp(c,image,r,angle,alpha){
 if(!readyImage(image))return;c.save();c.rotate(angle);c.globalAlpha*=clamp(alpha);const size=r*2.27;c.drawImage(image,-size*.52,-size*.53,size,size);c.restore();
}
function jetSheet(c,image,length,width,time,phase,alpha,steps){
 // Neighboring strips share exactly the same displaced edge. The flame is a
 // continuous flow field, not a train of independent sprites or fireballs.
 const iw=image.naturalWidth,ih=image.naturalHeight,from=iw*.021,span=iw*.967;
 const edge=t=>({x:t*length,y:Math.sin(t*10-time*12+phase)*t*t*width*.032+Math.sin(t*21-time*19+phase)*t*width*.012,h:width*(1+Math.sin(t*12-time*10+phase)*.07*t)});
 c.save();c.globalAlpha*=clamp(alpha);
 for(let i=0;i<steps;i++){
  const t=i/steps,n=(i+1)/steps,p=edge(t),q=edge(n),w=q.x-p.x;
  // Affine shear aligns strip centers to avoid visible seams while the stream bends.
  c.save();c.translate(p.x,p.y);c.transform(1,(q.y-p.y)/w,0,1,0,0);
  c.drawImage(image,from+span*t,0,span/steps+.6,ih,0,-p.h*.54,w+.6,p.h);c.restore();
 }
 c.restore();
}
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
 p.commanderMaterialVersion=2;
 p.prepareCommanderMaterials=function(){
  if(sharedReady){this.commanderAssets=sharedAssets;return sharedReady;}
  sharedAssets={blade:null,flame:null};this.commanderAssets=sharedAssets;
  const ImageType=root.Image||(typeof Image!=='undefined'?Image:null);
  if(!ImageType){sharedReady=Promise.resolve(sharedAssets);return sharedReady;}
  sharedReady=Promise.all(['blade','flame'].map(kind=>new Promise(resolve=>{
   const image=new ImageType();sharedAssets[kind]=image;image.onload=()=>resolve(true);image.onerror=()=>{sharedAssets[kind]=null;resolve(false);};image.src=`assets/effects/ultimate-${kind}-v20261106.webp`;
  }))).then(()=>sharedAssets);return sharedReady;
 };
 p.reset=function(){baseReset.call(this);this.ultimateActors=new Map();this.ultimateCues=[];this.ultEmissionTimes=new Map();};
 p.update=function(game,visible=()=>true){
  if(!this.commanderAssets)this.prepareCommanderMaterials();baseUpdate.call(this,game,visible);this.ultimateActors??=new Map();this.ultimateCues??=[];
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
 p.drawCommanderContacts=function(c,e){
  if(!e.hits?.length)return;
  const age=Math.max(0,(e.max||0)-e.t),sword=e.kind==='shionSpin',flame=e.kind==='flame',m=this.prepareImpactMaterials?.(),origin=this.muzzlePoint(e);
  c.save();
  for(const [index,h]of (e.hits||[]).slice(0,8).entries()){
   const x=h.x,y=h.y-(h.height||0),distance=Math.hypot(x-origin.x,y-origin.y),delay=sword||flame?0:clamp(distance/2600,.035,.12),t=age-delay,life=sword?.22:flame?.14:.10;
   if(t<0||t>=life)continue;const k=1-t/life,a=Math.atan2(y-origin.y,x-origin.x),color=sword?'#ff829e':h.armored?'#ffe8b4':'#ffbd69';
   if(flame){if(m){stamp(c,m.fire[index%3],x,y-8-t*28,18+t*45,26+t*55,a,.46*k);stamp(c,m.flash,x,y,20,16,0,.22*k*k,'lighter');}continue;}
   c.save();c.translate(x,y);c.rotate(sword?a-.8:a);c.lineCap='round';
   // A darker cut behind a narrow white core reads against the light oak board.
   c.globalAlpha=k;c.strokeStyle=sword?'#6a1732':'#754226';c.lineWidth=sword?4:2.8;c.beginPath();c.moveTo(-13*k,sword?-8*k:0);c.lineTo(16*k,sword?9*k:0);c.stroke();
   c.globalCompositeOperation='lighter';c.strokeStyle='#fff4df';c.lineWidth=sword?1.8:1.3;c.stroke();
   for(let j=0;j<(h.armored?7:5);j++){const ang=j*2.399+index*.7,travel=(10+j*2)*t/life,inner=3+travel,outer=inner+5*k;c.strokeStyle=j%2?color:'#fff4d8';c.lineWidth=j%3?1:1.7;c.beginPath();c.moveTo(Math.cos(ang)*inner,Math.sin(ang)*inner*.8);c.lineTo(Math.cos(ang)*outer,Math.sin(ang)*outer*.8-3*t);c.stroke();}
   c.restore();if(m)stamp(c,m.flash,x,y,31*k+8,17*k+5,a,.6*k*k,'lighter');
  }
  c.restore();
 };
 p.drawCommanderBlade=function(c,e){
  const q=clamp(1-e.t/Math.max(.001,e.max)),fade=Math.min(1,(1-q)*6),u=e.source?.hp>0?e.source:e,r=e.range||170,head=(e.angle||0)+q*TAU,m=this.prepareImpactMaterials?.(),blade=this.commanderAssets?.blade;
  c.save();c.translate(u.x,u.y-16);c.scale(1,.78);
  if(readyImage(blade)){
   // One wide cutting wake plus a faint angular echo. Center remains transparent.
   bladeStamp(c,blade,r*.91,head-.29,.17*fade);
   bladeStamp(c,blade,r,head+.34,.88*fade);
   c.globalCompositeOperation='lighter';ribbon(c,r*.94,head-.02,1.46,2.7,'#ffe7d7',fade*.65);c.globalCompositeOperation='source-over';
  }else{
   ribbon(c,r*.98,head,2.65,37,'#86183f',fade*.5);ribbon(c,r*.96,head-.025,2.44,26,'#e3426e',fade*.7);c.globalCompositeOperation='lighter';ribbon(c,r*.96,head-.04,1.8,5,'#ffd0d9',fade*.9);c.globalCompositeOperation='source-over';
  }
  const tx=Math.cos(head-.1)*r*.94,ty=Math.sin(head-.1)*r*.94;
  if(m){stamp(c,m.flash,tx,ty,47,13,head,fade*.53,'lighter');for(let i=0;i<5;i++){const a=head-i*.65;stamp(c,m.dust[i%2],Math.cos(a)*r*.86,Math.sin(a)*r*.86+17,30+q*18,13,a,.10*fade);}}
  // Short, tapered streaks break up the trailing silhouette without another rail.
  c.globalCompositeOperation='lighter';c.strokeStyle='#ff8da5';c.lineWidth=1.1;c.globalAlpha=fade*.65;
  for(let i=0;i<7;i++){const a=head-.35-i*.29,rr=r*(.88+(i%3)*.045);c.beginPath();c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);c.lineTo(Math.cos(a-.08-i*.008)*rr*.97,Math.sin(a-.08-i*.008)*rr*.97);c.stroke();}
  c.restore();this.drawCommanderContacts(c,e);return true;
 };
 p.drawCommanderFlame=function(c,e){
  const latest=this.flameJets.get(this.flameKey(e));if(latest&&latest!==e)return true;
  const m=this.prepareImpactMaterials?.();if(!m)return baseDraw.call(this,c,e);
  const origin=this.muzzlePoint(e),a=e.angle||0,source=e.source||e,dx=source.x+Math.cos(a)*e.range-origin.x,dy=source.y+Math.sin(a)*e.range-16-origin.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),clock=this.time,fade=clamp(e.t/.045),image=this.commanderAssets?.flame,steps=this.budget<=240?20:28;
  c.save();
  // Both the textured plume and its fallback stay within the nozzle cone.
  c.beginPath();c.moveTo(origin.x,origin.y);c.arc(origin.x,origin.y,length,angle-e.arc/2,angle+e.arc/2);c.closePath();c.clip();
  // Warm haze and sparse smoke stay behind the coherent pressure jet.
  for(let i=0;i<3;i++){const t=.6+i*.12,w=24+t*28,off=Math.sin(clock*4+i*2.1)*e.range*t*.09;stamp(c,m.smoke[i%3],origin.x+dx*t-Math.sin(a)*off,origin.y+dy*t+Math.cos(a)*off-18*t,w*1.3,w,clock*.13+i,.08*fade);}
  c.save();c.translate(origin.x,origin.y);c.rotate(angle);
  if(readyImage(image)){
   const width=Math.sin(e.arc/2)*e.range*1.44;
   jetSheet(c,image,length*.96,width,clock,0,.70*fade,steps);
   c.save();c.scale(1,-1);jetSheet(c,image,length*(.89+.025*Math.sin(clock*9)),width*.72,clock*1.07,2.8,.29*fade,steps);c.restore();
   // A much narrower hot channel provides depth, with no solid white beam.
   c.globalCompositeOperation='lighter';jetSheet(c,image,length*.68,width*.19,clock*1.23,1.4,.20*fade,Math.ceil(steps*.7));
  }else{
   // Texture failure still leaves a continuous overlapping plume at the real nozzle.
   for(let i=17;i>=0;i--){const t=i/18,w=42+t*105,off=Math.sin(t*12-clock*13)*t*14;stamp(c,m.fire[i%3],t*length,off,w,18+t*95,Math.sin(clock*5+i)*.17,(.8-t*.25)*fade);}
  }
  stamp(c,m.fire[2],17,0,53,19,0,.76*fade,'lighter');stamp(c,m.flash,0,0,31,22,0,.53*fade,'lighter');c.restore();c.restore();this.drawCommanderContacts(c,e);return true;
 };
 p.drawCommanderVolley=function(c,e){
  const age=Math.max(0,(e.max||0)-e.t),m=this.prepareImpactMaterials?.(),origin=this.muzzlePoint(e),a=e.angle||0,shot=e.shot||0,range=e.range||460,arc=e.arc||136*Math.PI/180,hits=(e.hits||[]).slice(0,8);
  const tracerCount=Math.max(7,hits.length);
  c.save();
  for(let i=0;i<tracerCount;i++){
   const heading=a+(i/(tracerCount-1)-.5)*arc*.94+Math.sin(shot*2.1+i)*.014,reach=range*(.84+((i+shot)%3)*.07),hit=hits[i],tx=hit?hit.x:e.x+Math.cos(heading)*reach,ty=hit?hit.y-(hit.height||0):e.y+Math.sin(heading)*reach-14,dx=tx-origin.x,dy=ty-origin.y,len=Math.hypot(dx,dy)||1,arrival=clamp(len/2600,.035,.12),progress=clamp(age/arrival),fade=progress<1?1:clamp(1-(age-arrival)/.032);
   if(age<=0||fade<=0)continue;const x=origin.x+dx*progress,y=origin.y+dy*progress,tail=Math.min(hit?56:46,len*progress),x0=x-dx/len*tail,y0=y-dy/len*tail;
   const g=c.createLinearGradient(x0,y0,x,y);g.addColorStop(0,'#fbc28000');g.addColorStop(.55,e.appearance==='shino'?'#ffd4bd':'#ffd082');g.addColorStop(1,'#fff8df');
   c.strokeStyle=g;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.lineTo(x,y);c.globalCompositeOperation='source-over';c.globalAlpha=fade*.25;c.lineWidth=5.2;c.stroke();c.globalCompositeOperation='lighter';c.globalAlpha=fade;c.lineWidth=1.6;c.stroke();
   // The pointed tracer nose and low glow retain a physical bullet silhouette.
   c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.fillStyle='#fff4c5';c.beginPath();c.moveTo(3,0);c.lineTo(-4,-1.2);c.lineTo(-4,1.2);c.closePath();c.fill();c.restore();if(m)stamp(c,m.flash,x,y,15,6,Math.atan2(dy,dx),fade*.42,'lighter');
  }
  c.globalAlpha=1;
  if(m){
   const flash=clamp(1-age/.085),pulse=.86+Math.sin(shot*2.4)*.14,jet=this.commanderAssets?.flame;
   c.save();c.translate(origin.x,origin.y);c.rotate(a);
   if(readyImage(jet)&&flash>0){c.globalAlpha=flash*.92;c.drawImage(jet,0,-15,48*pulse,30);c.globalAlpha=1;}
   else stamp(c,m.fire[shot%3],13,0,42*pulse,20,0,flash*.95,'lighter');
   for(const side of [-1,1])stamp(c,m.fire[1],4,side*6,21,9,side*.75,flash*.58,'lighter');stamp(c,m.flash,2,0,40,25,0,flash*.7,'lighter');
   if(age>.035)stamp(c,m.smoke[shot%3],12+age*32,-age*24,21+age*55,15+age*37,.2,clamp(age/.12)*.23);c.restore();
  }
  c.restore();this.drawCommanderContacts(c,e);return true;
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
