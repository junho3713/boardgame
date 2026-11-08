/* Bounded, simulation-time combat VFX. Only presentation; never damages or moves a unit. */
((root)=>{'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const enhancedFaces=roll=>roll.bossKillerAvailable||roll.kind==='bossKiller'?['glue','mine','spray','missiles','bossKiller']:['glue','mine','spray','missiles'];
class FrontEffects{
 constructor({budget=360,textures=null,weaponPoint=null}={}){this.budget=budget;this.textures=textures||this.makeTextures();this.weaponPoint=weaponPoint;this.reset();this.stickyAsset();this.cleanseAsset();this.healingReductionAsset();}
 healingReductionAsset(){
  if(this.healingReductionHeart)return this.healingReductionHeart;if(typeof Image==='undefined')return null;
  const a=this.healingReductionHeart={image:new Image(),ready:false};a.loading=new Promise(resolve=>{a.image.onload=()=>{a.ready=true;resolve(true);};a.image.onerror=()=>resolve(false);});a.image.src='assets/effects/healing-reduction-heart-v115.webp';return a;
 }
 cleanseAsset(){
  if(this.cleanseCrystal)return this.cleanseCrystal;if(typeof Image==='undefined')return null;
  const a=this.cleanseCrystal={image:new Image(),ready:false};a.loading=new Promise(resolve=>{a.image.onload=()=>{a.ready=true;resolve(true);};a.image.onerror=()=>resolve(false);});a.image.src='assets/effects/cleanse-crystal-v114.webp';return a;
 }
 drawCleanse(ctx,e){
  const a=this.cleanseAsset();if(!a?.ready||e.target?.hp<=0)return;
  const p=clamp(1-e.t/e.max,0,1),x=e.target?.x??e.x,y=e.target?.y??e.y,items=[[-18,-33,14],[13,-44,18],[-1,-59,12]];
  for(let i=0;i<3;i++){const q=(p-i*.075)/(1-i*.075);if(q<0||q>1)continue;const size=items[i][2]*(.55+.45*Math.min(1,q/.16))*(1-.2*q),h=size*a.image.naturalHeight/a.image.naturalWidth;
   ctx.save();ctx.globalAlpha=Math.min(1,q/.10)*Math.min(1,(1-q)/.35);ctx.translate(x+items[i][0]+Math.sin(q*3+i)*2,y+items[i][1]-q*14);ctx.rotate((i-1)*.12);ctx.drawImage(a.image,-size/2,-h/2,size,h);ctx.restore();
  }
 }
 stickyAsset(){
  if(this.stickyGel)return this.stickyGel;if(typeof Image==='undefined')return null;
  const asset=this.stickyGel={image:new Image(),ready:false};asset.loading=new Promise(resolve=>{asset.image.onload=()=>{asset.ready=true;resolve(true);};asset.image.onerror=()=>resolve(false);});asset.image.src='assets/effects/lucky-sticky-gel-v78.png';return asset;
 }
 drawStickyGel(ctx,x,y,r,opacity=1){const a=this.stickyAsset();if(!a?.ready)return false;const w=r*2.32,h=w*a.image.naturalHeight/a.image.naturalWidth;ctx.save();ctx.globalAlpha*=opacity;ctx.drawImage(a.image,x-w/2,y-h/2,w,h);ctx.restore();return true;}
 reset(){this.particles=[];this.scorches=[];this.seen=new WeakSet();this.trails=new WeakMap();this.flameJets=new Map();this.time=0;this.seed=73991;this.serial=0;}
 random(){this.seed^=this.seed<<13;this.seed^=this.seed>>>17;this.seed^=this.seed<<5;return(this.seed>>>0)/4294967296;}
 makeTextures(){
  const make=(stops)=>{const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d'),r=g.createRadialGradient(48,48,0,48,48,48);for(const [k,v]of stops)r.addColorStop(k,v);g.fillStyle=r;g.fillRect(0,0,96,96);return c;};
  return{flame:make([[0,'#fff8dfff'],[.12,'#fff0a4ff'],[.35,'#ffb32ff5'],[.60,'#ff6b16d9'],[.84,'#de3b096e'],[1,'#b5220000']]),glow:make([[0,'#fffce9'],[.12,'#ffedac'],[.35,'#ffb84b99'],[1,'#f57a1600']]),whiteSmoke:make([[0,'#eee9d5ce'],[.35,'#d6d8c9a0'],[1,'#aab3a400']]),fire:make([[0,'#fff3cdee'],[.2,'#ffd16add'],[.5,'#ee7720aa'],[1,'#b5350900']]),smoke:make([[0,'#687060b0'],[.45,'#73776c80'],[1,'#89917a00']]),dust:make([[0,'#bcaa7880'],[.4,'#b4a47166'],[1,'#c6b58200']]),scorch:make([[0,'#292c20aa'],[.45,'#3b382b77'],[.8,'#514b3430'],[1,'#625a3c00']])};
 }
 add(p){if(this.particles.length>=this.budget)this.particles.shift();this.particles.push({age:0,spin:(this.random()-.5)*8,rotation:this.random()*TAU,...p});}
 emit(e){
  const r=e.radius||50;
  if(e.kind==='shionSlash'||e.kind==='shionSpin'){
   const count=e.kind==='shionSpin'?14:7;for(let i=0;i<count;i++){const a=e.kind==='shionSpin'?i/count*TAU:e.angle+(i/(count-1)-.5)*e.arc,r=e.range*(.72+this.random()*.24);this.add({kind:'spark',x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r-12,vx:Math.cos(a)*45,vy:Math.sin(a)*30-15,life:.18+this.random()*.15,size:1.5+this.random(),team:0,color:i%3?'#ff5c87':'#fff3dc'});}
  }else if(e.kind==='explosion'&&e.visualKind==='acid'){
   for(let i=0;i<8;i++){const a=i/8*TAU;this.add({kind:'whiteSmoke',x:e.x,y:e.y-4,vx:Math.cos(a)*18,vy:Math.sin(a)*10-22,size:4,life:.3,growth:14,team:e.team,alpha:.35});}
  }else if(e.kind==='explosion'){
   const count=Math.min(24,10+Math.round(r/7));
   for(let i=0;i<count;i++){
    const a=this.random()*TAU,v=30+this.random()*r*1.8,t=.5+this.random()*.7;
    this.add({kind:i%3?'smoke':'fire',x:e.x,y:e.y-5,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.62-22,size:12+this.random()*r*.27,life:t,growth:22+this.random()*25,drag:2.6,team:e.team,alpha:i%3?.24:.75});
   }
   for(let i=0;i<Math.min(22,8+Math.floor(r/6));i++){
    const a=this.random()*TAU,v=80+this.random()*r*2;
    this.add({kind:i%3?'spark':'debris',x:e.x,y:e.y-6,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.65-70,gravity:190,size:2+this.random()*3,life:.4+this.random()*.6,team:e.team,color:i%3?'#ffce73':'#706a47'});
   }
   this.scorches.push({x:e.x,y:e.y,r:Math.min(90,r*.8),age:0,life:7,team:e.team});if(this.scorches.length>24)this.scorches.shift();
  }else if(['bikeDust','bikeBrake','bikeImpact'].includes(e.kind)){
   const impact=e.kind==='bikeImpact',count=impact?9:e.kind==='bikeBrake'?7:3;
   for(let i=0;i<count;i++){const a=(e.angle||0)+Math.PI+(this.random()-.5)*1.8,v=15+this.random()*(impact?100:45);this.add({kind:impact&&i%3===0?'spark':'dust',x:e.x,y:e.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.7-9,size:impact&&i%3===0?2:7+this.random()*6,growth:20,life:.3+this.random()*.25,team:e.team,alpha:.34,color:'#ffe2aa'});}
  }else if(e.kind==='hit'){
   const lift=e.team===2?8:20;
   for(let i=0;i<(e.armor?6:3);i++){const a=this.random()*TAU,v=28+this.random()*70;this.add({kind:e.armor?'spark':'dust',x:e.x,y:e.y-lift,vx:Math.cos(a)*v,vy:Math.sin(a)*v-20,gravity:100,life:.18+this.random()*.2,size:e.armor?1.5:7,growth:14,team:e.team,color:'#ffe8aa',alpha:.4});}
  }else if(e.kind==='burst'){
   for(let i=0;i<9;i++){const a=this.random()*TAU,v=30+this.random()*75;this.add({kind:'debris',x:e.x,y:e.y-12,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.7-55,gravity:180,size:2+this.random()*3,life:.5+this.random()*.35,team:e.team,color:e.team===0?'#6e9648':e.team===1?'#b57657':'#8c794d'});}
   this.add({kind:'dust',x:e.x,y:e.y,vx:0,vy:-10,size:22,growth:32,life:.65,team:e.team,alpha:.38});
  }else if(e.kind==='flame'){
   const key=this.flameKey(e);this.flameJets.set(key,e);if(this.flameJets.size>4)this.flameJets.delete(this.flameJets.keys().next().value);
   const p=this.muzzlePoint(e),a=e.angle||0,dx=(e.source?.x??e.x)+Math.cos(a)*e.range-p.x,dy=(e.source?.y??e.y)+Math.sin(a)*e.range-14-p.y;
   for(let i=0;i<10;i++){
    const u=.15+this.random()*.82,spread=(this.random()-.5)*Math.sin(e.arc/2)*e.range*u*.65,x=p.x+dx*u-Math.sin(a)*spread,y=p.y+dy*u+Math.cos(a)*spread*.75;
    this.add({kind:i%5===0?'smoke':'fire',x,y,vx:Math.cos(a)*(110+this.random()*140)-Math.sin(a)*spread*.2,vy:Math.sin(a)*(90+this.random()*120)-10,size:4+u*10,growth:18,life:.18+this.random()*.16,team:e.team,alpha:i%5===0?.12:.32,drag:.2});
   }
   for(let i=0;i<3;i++)this.add({kind:'spark',x:e.x+Math.cos(a)*e.range*.82,y:e.y+Math.sin(a)*e.range*.82-14,vx:Math.cos(a)*(60+this.random()*100)+(this.random()-.5)*85,vy:Math.sin(a)*85-25+(this.random()-.5)*65,gravity:-15,life:.2+this.random()*.2,size:1+this.random(),team:e.team,color:'#ffca66'});
  }else if(e.kind==='ultimateVolley'){
   const p=this.muzzlePoint(e),side=e.hand==='right'?1:-1,a=e.angle||0;
   for(let i=0;i<7;i++){const angle=a+(i-3)*(e.arc/6)*.94+Math.sin(e.shot*3+i)*.012,range=e.range*(.87+.13*((i+e.shot)%3)/2),life=range/(1200+this.random()*200),tx=e.x+Math.cos(angle)*range,ty=e.y+Math.sin(angle)*range-12;this.add({kind:'bullet',x:p.x,y:p.y,vx:(tx-p.x)/life,vy:(ty-p.y)/life,life,size:2,team:0,drag:0,spin:0});}
   for(let i=0;i<2;i++)this.add({kind:'casing',x:p.x,y:p.y,vx:-Math.sin(a)*side*(35+i*20),vy:Math.cos(a)*side*30-55,gravity:190,life:.55,size:2.1,team:0,color:'#e7b967'});
   this.add({kind:'smoke',x:p.x,y:p.y,vx:Math.cos(a)*24,vy:Math.sin(a)*18-20,size:6,growth:16,life:.35,team:0,alpha:.24});
  }else if(e.kind==='muzzle'){
   if(e.weapon==='machinegun'||e.weapon==='guntruck'){if(++this.serial%3)return;}
   const p=this.muzzlePoint(e),a=e.angle||0,heavy=e.weapon==='tank'||e.weapon==='crimsonAce',rocket=e.weapon==='rocket',mortar=e.weapon==='mortar';
   if(heavy||rocket||mortar){
    for(let i=0;i<(heavy?8:6);i++){const spread=(this.random()-.5)*.75,angle=a+spread,speed=25+this.random()*65;this.add({kind:'whiteSmoke',x:p.x,y:p.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed*.7-15,size:8+this.random()*7,growth:25,life:.45+this.random()*.3,team:e.team,alpha:heavy?.37:.42,drag:2.5});}
    if(rocket)for(let i=0;i<7;i++){const angle=a+Math.PI+(this.random()-.5)*.6,speed=45+this.random()*80;this.add({kind:'whiteSmoke',x:e.x-Math.cos(a)*10,y:e.y-28-Math.sin(a)*8,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed*.7-6,size:9+this.random()*5,growth:24,life:.55+this.random()*.2,team:e.team,alpha:.48,drag:2});}
    if(heavy)for(let i=0;i<4;i++){const side=i%2?1:-1;this.add({kind:'dust',x:e.x,y:e.y,vx:-Math.sin(a)*side*(25+i*6),vy:Math.cos(a)*side*25,size:13,growth:25,life:.4,team:e.team,alpha:.28});}
   }else this.add({kind:'smoke',x:p.x,y:p.y,vx:Math.cos(a)*18,vy:Math.sin(a)*12-16,size:5,growth:14,life:.28,team:e.team,alpha:.16});
  }
 }
 update(game,visible=()=>true){
  if(game.time<this.time)this.reset();const dt=clamp(game.time-this.time,0,.05);this.time=game.time;
  for(const p of this.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.gravity||0)*dt;const drag=Math.max(0,1-(p.drag??.6)*dt);p.vx*=drag;p.vy*=drag;p.rotation+=p.spin*dt;}
  this.particles=this.particles.filter(p=>p.age<p.life);for(const s of this.scorches)s.age+=dt;this.scorches=this.scorches.filter(s=>s.age<s.life);
  for(const e of game.effects){if(this.seen.has(e))continue;this.seen.add(e);if(visible(e))this.emit(e);}
  for(const [key,e]of this.flameJets)if(!game.effects.includes(e))this.flameJets.delete(key);
  if(game.phase!=='playing')return;
  for(const p of game.mortarShells||[]){if(p.kind==='acid')continue;if(this.emitMaterialTrail){this.emitMaterialTrail(p,this.mortarPose(p,game.time),game.time,visible);continue;}const last=this.trails.get(p)??-1;if(game.time-last<.11)continue;this.trails.set(p,game.time);const q=this.mortarPose(p,game.time);if(visible(q))this.add({kind:'whiteSmoke',x:q.x,y:q.y,vx:0,vy:-4,size:p.kind==='missile'?(p.source?.type==='lucky'?11:7):3.5,growth:p.kind==='missile'?14:5,life:p.kind==='missile'?.5:.24,team:p.team,alpha:p.kind==='missile'?.4:.2});}
  for(const p of game.shots){if(this.emitMaterialTrail&&['rocket','bossKiller'].includes(p.kind)){this.emitMaterialTrail(p,this.materialShotPose(p),game.time,visible);continue;}if(p.kind!=='rocket'||!visible(p))continue;const last=this.trails.get(p)??-1;if(game.time-last<.045)continue;this.trails.set(p,game.time);this.add({kind:'whiteSmoke',x:p.x,y:p.y-15,vx:0,vy:-8,size:7,growth:13,life:.5,team:p.team,alpha:.22});}
 }
 blob(ctx,image,x,y,size,alpha=1){ctx.globalAlpha=clamp(alpha,0,1);ctx.drawImage(image,x-size,y-size,size*2,size*2);}
 ground(ctx,visible=()=>true){ctx.save();for(const s of this.scorches)if(visible(s)){ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,.65);this.blob(ctx,this.textures.scorch,0,0,s.r,(1-s.age/s.life)*.45);ctx.restore();}ctx.restore();}
 muzzlePoint(e){const point=e.muzzle||this.weaponPoint?.(e);if(point)return point;if(e.kind==='ultimateVolley'){const a=e.angle||0,side=e.hand==='right'?1:-1;return{x:e.x+Math.cos(a)*24-Math.sin(a)*side*9,y:e.y+Math.sin(a)*18+Math.cos(a)*side*7-34};}const skin=e.weapon==='sniper'&&['kayla','hayeon'].includes(e.appearance),a=skin?Math.round((e.angle||0)/(Math.PI/4))*(Math.PI/4):e.angle||0,reach=e.origin?(skin?(e.crouched===false?36:34):({tank:53,sniper:46,machinegun:40,rocket:35,mortar:26,guntruck:22,lucky:24,shino:22}[e.weapon]||35)):e.weapon==='tank'?24:6,lift=skin?(e.crouched===false?26:24):({tank:19,guntruck:20,lucky:24,sniper:28,rocket:31,mortar:22,shino:34}[e.weapon]||28),side=skin&&e.origin?6.2:0;return{x:e.x+Math.cos(a)*reach-Math.sin(a)*side,y:e.y+(Math.sin(a)*reach+Math.cos(a)*side)*.8-lift};}
 mortarPose(p,time){const k=clamp(1-(p.landAt-time)/p.delay,0,1),rise=p.kind==='acid'?12:p.kind==='missile'?70:150,height=Math.sin(k*Math.PI)*rise,dx=p.x-p.fromX,dy=p.y-p.fromY,length=Math.hypot(dx,dy)||1,lane=p.luckyLane||0,sway=Math.sin(k*Math.PI)*lane,drift=Math.cos(k*Math.PI)*Math.PI*lane,x=p.fromX+dx*k-dy/length*sway,groundY=p.fromY+dy*k+dx/length*sway;return{x,y:groundY-height,groundY,angle:Math.atan2(dy+dx/length*drift-Math.cos(k*Math.PI)*rise*Math.PI,dx-dy/length*drift),team:p.team};}
 drawMortar(ctx,p,time){const q=this.mortarPose(p,time);if(p.kind==='acid'){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle);ctx.fillStyle='#e7c967';ctx.beginPath();ctx.ellipse(0,0,11,4,0,0,TAU);ctx.fill();ctx.fillStyle='#fff1b9';ctx.beginPath();ctx.ellipse(3,-1,5,1.5,0,0,TAU);ctx.fill();ctx.globalAlpha=.35;ctx.fillStyle='#e9d686';ctx.beginPath();ctx.ellipse(-13,0,7,2.5,0,0,TAU);ctx.fill();ctx.restore();return;}ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#293427';ctx.beginPath();ctx.ellipse(q.x+4,q.groundY,7,3,0,0,TAU);ctx.fill();ctx.globalAlpha=1;if(p.kind==='missile'&&p.source?.type==='lucky'){this.drawLuckyMissile(ctx,q.x,q.y,q.angle,time);ctx.restore();return;}if(root.FrontLivingRoom?.projectile(ctx,q.x,q.y,q.angle,p.kind,p.team)){ctx.restore();return;}ctx.translate(q.x,q.y);ctx.rotate(q.angle);ctx.fillStyle='#496346';ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(4,-4);ctx.lineTo(-7,-4);ctx.lineTo(-9,0);ctx.lineTo(-7,4);ctx.lineTo(4,4);ctx.closePath();ctx.fill();ctx.fillStyle=p.team===0?'#91d68a':'#c5c79a';ctx.fillRect(-2,-4,3,8);ctx.fillStyle='#344b36';ctx.beginPath();ctx.moveTo(-7,-2);ctx.lineTo(-14,-7);ctx.lineTo(-12,0);ctx.lineTo(-14,7);ctx.lineTo(-7,2);ctx.fill();ctx.fillStyle=p.team===0?'#c2f3b3':'#e1deb8';ctx.fillRect(2,-3,3,1.2);ctx.restore();}
 drawLuckyMissile(ctx,x,y,angle,time){
  ctx.save();ctx.translate(x,y);ctx.save();ctx.rotate(angle);const pulse=.8+.2*Math.sin(time*52),worldAngle=Math.atan2(Math.sin(angle)/.8,Math.cos(angle)),tail=27*Math.hypot(Math.cos(worldAngle),.8*Math.sin(worldAngle));
  ctx.fillStyle='#f47c29';ctx.beginPath();ctx.moveTo(-tail,-3);ctx.lineTo(-tail-17-5*pulse,0);ctx.lineTo(-tail,3);ctx.closePath();ctx.fill();ctx.fillStyle='#fff0a6';ctx.beginPath();ctx.moveTo(-tail,-1.5);ctx.lineTo(-tail-11-3*pulse,0);ctx.lineTo(-tail,1.5);ctx.closePath();ctx.fill();
  ctx.restore();if(root.FrontLivingRoom?.field(ctx,'lucky-missile',0,0,worldAngle)){ctx.restore();return;}ctx.rotate(angle);
  ctx.strokeStyle='#4a302b';ctx.lineWidth=1;ctx.fillStyle='#a92e28';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-6,side*4);ctx.lineTo(-18,side*12);ctx.lineTo(-15,side*3);ctx.closePath();ctx.fill();ctx.stroke();}
  const body=ctx.createLinearGradient(0,-6,0,6);body.addColorStop(0,'#ff9b79');body.addColorStop(.3,'#f54f37');body.addColorStop(1,'#922929');ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(25,0);ctx.quadraticCurveTo(18,-6,10,-6);ctx.lineTo(-16,-6);ctx.lineTo(-18,0);ctx.lineTo(-16,6);ctx.lineTo(10,6);ctx.quadraticCurveTo(18,6,25,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#f0dfad';ctx.fillRect(2,-6,5,12);ctx.fillStyle='#fff1d0';ctx.fillRect(3,-5,2,3);ctx.fillStyle='#5a6350';ctx.fillRect(-14,-6,3,12);ctx.strokeStyle='#ffc3a5';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-7,-3);ctx.lineTo(10,-3);ctx.stroke();ctx.restore();
 }
 drawLaser(ctx,u,time,presentation={}){const aim=u.sniperAim,t=aim?.target;if(!aim||!t||t.hp<=0||time>=aim.fireAt||u.hp<=0)return false;const a=Math.atan2(t.y-u.y,t.x-u.x),m=this.muzzlePoint({x:u.x,y:u.y,weapon:'sniper',appearance:u.appearance,crouched:presentation.crouched,muzzle:presentation.muzzle,angle:a,origin:true}),endY=t.y-(root.FrontTypes?.[t.type]?.flightHeight||0)-(t.base||t.structure?20:t.team===2?9:28),k=clamp((time-aim.started)/Math.max(.01,aim.fireAt-aim.started),0,1);ctx.save();ctx.globalAlpha=.4+k*.3;ctx.strokeStyle=u.team===0?'#ef2637':'#ff633f';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(t.x,endY);ctx.stroke();ctx.globalAlpha=.65;ctx.fillStyle='#ff3b3b';ctx.beginPath();ctx.arc(t.x,endY,2,0,TAU);ctx.fill();ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(t.x,endY,5+3*(1-k),0,TAU);ctx.stroke();ctx.restore();return true;}
 drawUltimateArea(ctx,c,state,time){
  ctx.save();ctx.translate(c.x,c.y);if(c.appearance==='shion'){const radius=root.FrontSword?.ultimateRange||170;ctx.strokeStyle='#ff779799';ctx.fillStyle='#a3133820';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.fill();ctx.stroke();ctx.restore();return;}const half=(c.appearance==='blaze'?root.FrontFlame.ultimateArc:(root.FrontUltimate?.arc||136*Math.PI/180))/2;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,c.appearance==='blaze'?root.FrontFlame.ultimateRange:460,state.angle-half,state.angle+half);ctx.closePath();ctx.fillStyle='#d8394820';ctx.fill();ctx.strokeStyle='#ffc17c50';ctx.lineWidth=1.5;ctx.setLineDash([9,13]);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#ffbc82';ctx.globalAlpha=.45+.15*Math.sin(time*8);ctx.beginPath();ctx.ellipse(0,0,23,12,0,0,TAU);ctx.stroke();ctx.restore();
 }
 flameKey(e){return e.sourceId??`${e.team}:${Math.round(e.x/16)}:${Math.round(e.y/16)}`;}
 flamePlumes(e){
  const m=this.muzzlePoint(e),a=e.angle||0,dx=(e.source?.x??e.x)+Math.cos(a)*e.range-m.x,dy=(e.source?.y??e.y)+Math.sin(a)*e.range-14-m.y,clock=this.time,phase=(clock*15)%1,plumes=[];
  for(let i=0;i<16;i++){
   const u=(i+phase)/16,width=Math.sin(e.arc/2)*e.range*Math.pow(u,1.4),wave=Math.sin(clock*19-u*16)*u*7;
   for(let lane=-1;lane<=1;lane++){
    const offset=lane*width*.52+wave+Math.sin(i*2.7+clock*11+lane)*width*.11,x=m.x+dx*u-Math.sin(a)*offset,y=m.y+dy*u+Math.cos(a)*offset*.8-u*u*6;
    plumes.push({x,y,angle:Math.atan2(dy,dx)+Math.sin(clock*9+i)*.2,size:(5+u*27)*(1+.16*Math.sin(i*2.3-clock*17)),alpha:(1-Math.pow(u,2.6))*(lane===0?.90:.60)});
   }
  }
  return plumes;
 }
 luckyGround(ctx,game,visible=()=>true){
  for(const z of game.luckyGlues||[]){if(!visible(z)||game.time>=z.expires)continue;const landed=game.time>=z.landAt,r=z.radius||100;ctx.save();ctx.translate(z.x,z.y);ctx.strokeStyle=landed?'#b9ee72':'#d7f2a18c';ctx.fillStyle=landed?'#9cdb3d24':'#afd96510';ctx.lineWidth=1.6;ctx.setLineDash(landed?[]:[6,6]);ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.stroke();ctx.setLineDash([]);
   if(landed&&!this.drawStickyGel(ctx,0,0,r,Math.min(1,Math.max(0,z.expires-game.time)))){ctx.fillStyle='#8fce40aa';ctx.strokeStyle='#d1f89a';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=64;i++){const a=i*TAU/64,w=r*(.78+.10*Math.sin(a*5+.4)+.05*Math.cos(a*3));if(i)ctx.lineTo(Math.cos(a)*w,Math.sin(a)*w);else ctx.moveTo(Math.cos(a)*w,Math.sin(a)*w);}ctx.closePath();ctx.fill();ctx.stroke();for(let i=0;i<9;i++){const a=i*2.4,d=r*(.17+(i%3)*.23);ctx.fillStyle='#dcfba664';ctx.beginPath();ctx.ellipse(Math.cos(a)*d,Math.sin(a)*d,4+i%3,2+i%2,a,0,TAU);ctx.fill();}}
   ctx.restore();}
  ctx.save();for(const m of game.luckyMines||[]){if(!visible(m))continue;ctx.save();ctx.translate(m.x,m.y);ctx.fillStyle='#243e32';ctx.strokeStyle='#a9dba3';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(0,0,12,7,0,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle=game.time<m.armAt?'#e4d77e':Math.sin(game.time*8)>.2?'#b4f5aa':'#477855';ctx.fillRect(-4,-5,8,4);ctx.restore();}
  for(const u of game.units){if(u.hp<=0||game.time>=(u.luckySlowUntil||0)||!visible(u))continue;ctx.save();ctx.translate(u.x,u.y);ctx.strokeStyle='#b5e871';ctx.lineWidth=2;ctx.fillStyle='#97d94238';ctx.beginPath();ctx.ellipse(0,0,(u.r||13)+9,11,0,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-12,1);ctx.quadraticCurveTo(-18,5,-12,9);ctx.moveTo(12,1);ctx.quadraticCurveTo(18,5,12,9);ctx.stroke();ctx.restore();}ctx.restore();
 }
 drawSprayCloud(ctx,s,time){
  if(s.emitting===false)return;
  const age=Math.max(0,time-(s.startedAt??time-1)),left=Math.max(0,(s.expires??time+1)-time),fade=Math.min(1,age/.15,left/.3),a=s.angle||0,range=s.range||310,targetDistance=Math.hypot((s.aimX??s.x+Math.cos(a)*range)-s.x,(s.aimY??s.y+Math.sin(a)*range)-s.y)||range;
  ctx.save();for(let i=0;i<14;i++){const travel=((age*1.8+i/14)%1),d=24+(range-24)*travel,width=Math.tan(Math.PI/5)*d,height=24+((s.aimHeight??16)-24)*Math.min(1,d/targetDistance);for(const lane of [-1,0,1]){const offset=lane*width*.58+Math.sin(i*2.7+time*8)*width*.1,x=s.x+Math.cos(a)*d-Math.sin(a)*offset,y=s.y+Math.sin(a)*d+Math.cos(a)*offset-height;this.blob(ctx,this.textures.whiteSmoke,x,y,10+travel*32,(1-travel*.78)*.52*fade);}}ctx.restore();
 }
 drawLuckySprays(ctx,game,visible=()=>true){for(const s of game.luckySprays||[])if(s.source.hp>0&&game.time<s.expires&&visible(s))this.drawSprayCloud(ctx,s,game.time);}
 luckySymbol(ctx,kind,x,y,size){
  if(kind==='glue'&&this.drawStickyGel(ctx,x,y,size*.44))return;
  this.luckyIcons??=new Map();let icon=this.luckyIcons.get(kind);
  if(!icon&&typeof document!=='undefined'){icon=document.createElement('canvas');icon.width=icon.height=64;const c=icon.getContext('2d');c.scale(2,2);this.paintLuckySymbol(c,kind);this.luckyIcons.set(kind,icon);}
  if(icon){ctx.drawImage(icon,x-size/2,y-size/2,size,size);return;}
  ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/32,size/32);this.paintLuckySymbol(ctx,kind);ctx.restore();
 }
 paintLuckySymbol(c,kind){
  c.save();c.lineJoin='round';c.lineCap='round';c.lineWidth=1.5;c.strokeStyle='#203128';
  const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();c.stroke();};
  if(kind==='glue'){
   c.fillStyle='#8fd824';c.beginPath();for(let i=0;i<64;i++){const a=i*TAU/64,r=9+2.4*Math.cos(a*8),x=16+Math.cos(a)*r,y=16+Math.sin(a)*r;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();c.stroke();
   c.strokeStyle='#d8fb80';c.lineWidth=2.2;c.beginPath();c.arc(14,14,5,Math.PI,Math.PI*1.65);c.stroke();ellipse(25,4,2.2,2.7,'#a9e63d');
  }else if(kind==='mine'){
   c.fillStyle='#e45e28';c.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,r=i%2?7:14,x=16+Math.cos(a)*r,y=14+Math.sin(a)*r;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();
   ellipse(16,24,12,5,'#3c4b49');c.fillStyle='#67746b';c.fillRect(4,19,24,5);ellipse(16,19,12,5,'#87968c');ellipse(16,17,7,3.7,'#b9352c');ellipse(16,15,6,3,'#f27739');c.strokeStyle='#ffbf73';c.beginPath();c.moveTo(12,14);c.lineTo(17,13);c.stroke();
  }else if(kind==='spray'){
   c.translate(16,16);c.rotate(.22);c.translate(-16,-16);c.fillStyle='#d4ded4';c.beginPath();c.roundRect(8,8,16,21,3);c.fill();c.stroke();ellipse(16,8,8,2.8,'#f2efdc');c.fillStyle='#53645e';c.fillRect(12,2,8,5);c.fillStyle='#dce8d4';c.fillRect(11,1,7,3);
   c.fillStyle='#8bc6a0';c.fillRect(10,13,12,12);ellipse(16,19,3,4,'#2a4c3b');c.strokeStyle='#294d39';c.lineWidth=.8;for(let i=0;i<3;i++){c.beginPath();c.moveTo(11,16+i*2.4);c.lineTo(21,19+i*1.2);c.stroke();}
   c.strokeStyle='#d7523d';c.lineWidth=2;c.beginPath();c.arc(16,19,6,0,TAU);c.moveTo(12,15);c.lineTo(20,23);c.stroke();c.strokeStyle='#92bda2';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.moveTo(22,3+i*1.7);c.lineTo(27+i,2+i*2);c.stroke();}
  }else{
   for(const [x,y]of [[12,17],[23,14]]){c.save();c.translate(x,y);c.rotate(.6);c.fillStyle='#f5a13b';c.beginPath();c.moveTo(-3,7);c.lineTo(0,14);c.lineTo(3,7);c.fill();c.fillStyle='#d55237';c.beginPath();c.moveTo(-3,3);c.lineTo(-6,9);c.lineTo(-1,7);c.lineTo(1,7);c.lineTo(6,9);c.lineTo(3,3);c.fill();c.stroke();c.fillStyle='#d74932';c.beginPath();c.moveTo(-3,7);c.lineTo(-3,-5);c.quadraticCurveTo(-2,-11,0,-13);c.quadraticCurveTo(2,-11,3,-5);c.lineTo(3,7);c.closePath();c.fill();c.stroke();c.fillStyle='#f4d78b';c.fillRect(-3,-2,6,3);c.strokeStyle='#ffae83';c.beginPath();c.moveTo(-1,-8);c.lineTo(-1,-4);c.stroke();c.restore();}
  }c.restore();
 }
 luckyReserveBadge(ctx,u,ammo){const x=u.x+50,y=u.y-134;ctx.save();ctx.fillStyle='#243b2df0';ctx.strokeStyle='#f0ba88';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,34,36,5);ctx.fill();ctx.stroke();this.luckySymbol(ctx,'missiles',x+17,y+12,20);ctx.fillStyle='#fff0cb';ctx.font='700 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('×'+ammo,x+17,y+28);ctx.restore();}
 luckyReels(ctx,u,game,single=false){
  if(!single&&u.star>=2&&u.luckyChannels){for(let i=0;i<3;i++){ctx.save();ctx.translate(0,-i*48);this.luckyReels(ctx,{...u,luckyRoll:u.luckyChannels[i].roll,luckyChannelIndex:i},game,true);ctx.restore();}return;}
  if(u.hp<=0)return;const reserve=[...(game.luckySalvos||[]),...(game.enemyLuckySalvos||[])].filter(v=>v.source?.id===u.id&&v.remaining>0&&(u.luckyChannelIndex===undefined||(v.rouletteChannel??0)===u.luckyChannelIndex)),ammo=reserve.reduce((n,v)=>n+v.remaining,0);if(ammo)this.luckyReserveBadge(ctx,u,ammo);
  const roll=u.luckyRoll;if(!roll||game.time>roll.endsAt+.95)return;
  const faces=enhancedFaces(roll),jackpot=roll.resolved&&['missiles','bossKiller'].includes(roll.kind),enhanced=roll.enhanced,clock=game.time-roll.startedAt,x=u.x-39,y=u.y-129;
  ctx.save();ctx.fillStyle='#22392cef';ctx.strokeStyle=jackpot?'#ffe49a':enhanced?'#d6db96':'#8ba66a';ctx.lineWidth=jackpot?2:1.5;ctx.beginPath();ctx.roundRect(x-7,y-6,92,38,6);ctx.fill();ctx.stroke();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='italic 900 22px sans-serif';
  for(let i=0;i<3;i++){const settled=roll.resolved||clock>=.34+i*.13,index=(Math.floor(clock*25)+u.id+i*3)%faces.length,kind=settled?(roll.kind==='blank'?faces[(u.id+i)%faces.length]:roll.kind):faces[index],left=x+i*27;ctx.save();ctx.beginPath();ctx.roundRect(left,y,24,25,3);ctx.clip();ctx.fillStyle=jackpot?'#f9e9a5':'#f0ead3';ctx.fillRect(left,y,24,25);ctx.fillStyle='#c5bfaa';ctx.fillRect(left,y,24,2);ctx.fillRect(left,y+23,24,2);const jitter=settled?0:Math.sin(clock*95+i)*4;
   if(settled&&kind==='missiles'){ctx.fillStyle='#c84830';ctx.fillText('7',left+12,y+13);}else{this.luckySymbol(ctx,kind,left+12,y+12.5+jitter,23);if(!settled){ctx.globalAlpha=.3;this.luckySymbol(ctx,faces[(index+1)%faces.length],left+12,y-12.5+jitter,23);}}ctx.restore();}
  ctx.fillStyle=jackpot?'#fff0ac':clock<.6&&Math.sin(clock*35)>.1?'#cde986':'#8caa63';ctx.fillRect(x-5,y+7,2,10);ctx.fillRect(x+80,y+7,2,10);ctx.fillStyle='#14261b';ctx.fillRect(x-1,y+28,79,2);ctx.fillStyle=jackpot?'#ffe49a':'#a4ca70';ctx.fillRect(x-1,y+28,79*clamp(clock/.6,0,1),2);
  ctx.restore();
 }
 drawBikeWarning(ctx,u,time){
  const a=u.bikeAttack;if(!a||u.hp<=0)return false;
  const warmup=a.phase==='windup',start=warmup?a.origin:u,length=warmup?a.distance:a.remaining,k=warmup?clamp((time-a.startedAt)/(a.chargeAt-a.startedAt),0,1):1,w=a.halfWidth||root.FrontBike?.halfWidth||24;
  ctx.save();ctx.translate(start.x,start.y);ctx.rotate(a.angle);
  ctx.fillStyle=warmup?'#ee3f493a':'#ffac6238';ctx.strokeStyle=warmup?'#ff636b':'#ffd3a0';ctx.lineWidth=2.5;ctx.setLineDash(warmup?[10,5]:[]);
  ctx.beginPath();ctx.moveTo(0,-w);ctx.lineTo(Math.max(0,length-24),-w);ctx.lineTo(length,0);ctx.lineTo(Math.max(0,length-24),w);ctx.lineTo(0,w);ctx.closePath();ctx.fill();ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#ffb1a8';ctx.globalAlpha=.5+k*.45;
  for(let d=55;d<length-24;d+=65){ctx.beginPath();ctx.moveTo(d-9,-10);ctx.lineTo(d+3,0);ctx.lineTo(d-9,10);ctx.lineTo(d-3,0);ctx.closePath();ctx.fill();}
  if(warmup){ctx.globalAlpha=.28;ctx.fillStyle='#ff7b65';ctx.fillRect(0,-w,length*k,w*2);}
  ctx.restore();
  if(warmup){ctx.save();ctx.font='700 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#3e2025';ctx.fillStyle='#fff2d7';const label=`돌진 ${Math.max(0,a.chargeAt-time).toFixed(1)}초`;ctx.strokeText(label,a.origin.x,a.origin.y-88);ctx.fillText(label,a.origin.x,a.origin.y-88);ctx.restore();}
  return true;
 }
 drawEvent(ctx,e){
  if(e.kind==='explosion'&&e.visualKind==='acid'){const k=clamp(e.t/e.max,0,1);ctx.save();ctx.globalAlpha=k*.6;ctx.fillStyle='#d8ba60';ctx.strokeStyle='#f3df97';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x,e.y,e.radius*(1-.4*k),e.radius*(1-.4*k)*.65,0,0,TAU);ctx.fill();ctx.stroke();ctx.restore();return true;}
  if(e.kind==='explosion'&&this.drawImpactMaterial?.(ctx,e,{boss:e.visualKind==='bossKiller',style:e.visualKind}))return true;
  if(e.kind==='muzzle'&&this.drawMuzzleMaterial?.(ctx,e))return true;
  const k=clamp(e.t/e.max,0,1),p=1-k;
  if(!['shionSlash','shionSpin','bossSlashWarn','bossDiveWarn','bossBarrageWarn','bossGroggy','butterflyWarn','butterflyWind','healingWeaken','cleanse','muzzle','explosion','hit','burst','tracer','heal','evolve','ultimateVolley','sting','bayonetWarn','bayonetThrust','bladeSlash','flame','luckyGlueThrow','luckyGlue','luckySpray','luckyJackpot'].includes(e.kind))return false;
  ctx.save();
  if(e.kind==='shionSlash'||e.kind==='shionSpin'){
   const spin=e.kind==='shionSpin',x=spin&&e.source?.hp>0?e.source.x:e.x,y=(spin&&e.source?.hp>0?e.source.y:e.y)-15,r=e.range,start=spin?e.angle+p*TAU:e.angle-e.arc/2+p*e.arc,span=spin?Math.PI*1.05:e.arc*.72;
   ctx.translate(x,y);ctx.scale(1,.78);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
   for(const [width,color,alpha]of [[16,'#b91d56',.25],[8,'#ff416c',.65],[2,'#ffe4ed',.95]]){ctx.globalAlpha=k*alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(0,0,r*.85,start-span,start);ctx.stroke();}
   ctx.globalAlpha=k*.5;ctx.strokeStyle='#fff4db';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r*.62,start-span*.85,start-.08);ctx.stroke();
  }else if(e.kind==='bossSlashWarn'||e.kind==='bossDiveWarn'||e.kind==='bossBarrageWarn'){
   if(e.source?.hp<=0){ctx.restore();return true;}ctx.strokeStyle='#ff514b';ctx.fillStyle='#ed302c30';ctx.lineWidth=2.5;ctx.globalAlpha=.65+.25*Math.sin(p*12);
   if(e.kind==='bossSlashWarn'){ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,e.range,-e.arc/2,e.arc/2);ctx.closePath();ctx.fill();ctx.stroke();}
   else{ctx.beginPath();ctx.ellipse(e.x,e.y,e.radius,e.radius*.8,0,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(e.x,e.y,e.radius*p,e.radius*.8*p,0,0,TAU);ctx.stroke();ctx.fillStyle='#ffddd1';ctx.font='700 12px sans-serif';ctx.textAlign='center';ctx.fillText(e.kind==='bossDiveWarn'?'맹독 급강하':'후열 포격',e.x,e.y-e.radius-9);}
  }else if(e.kind==='bossGroggy'){
   const u=e.target;if(u?.hp>0){ctx.strokeStyle='#ffdb86';ctx.fillStyle='#ffe6a0';ctx.font='700 11px sans-serif';ctx.textAlign='center';ctx.fillText('그로기 · 받는 피해 +'+(e.bonus??30)+'%',u.x,u.y-104);for(let i=0;i<3;i++){const a=i*TAU/3+this.time*2;ctx.beginPath();ctx.arc(u.x+Math.cos(a)*25,u.y-86+Math.sin(a)*8,3,0,TAU);ctx.fill();}}
  }else if(e.kind==='butterflyWarn'){
   ctx.translate(e.x,e.y);ctx.rotate(e.angle||0);ctx.scale(1,.85);ctx.globalAlpha=.12+.16*p;ctx.fillStyle='#d3a7ff';ctx.strokeStyle='#ead6ff';ctx.lineWidth=1.4;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(12,0);ctx.arc(0,0,e.range,-e.arc/2,e.arc/2);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(e.kind==='butterflyWind'){
   const reach=e.range*p,spread=Math.tan(e.arc/2)*reach;ctx.translate(e.x,e.y-42*(1-p));ctx.rotate(e.angle||0);ctx.scale(1,.85);ctx.globalAlpha=Math.sin(Math.PI*Math.min(1,p*1.2))*.7;ctx.lineCap='round';
   for(let i=0;i<6;i++){const lane=(i-2.5)/3,yy=lane*spread*.67,xx=Math.max(8,reach-24-i%3*13),r=11+spread*.13;
    ctx.strokeStyle=i%2?'#c6f2e6':'#e1c9fb';ctx.lineWidth=4+i%2*2;ctx.beginPath();ctx.moveTo(Math.max(0,xx-90),yy*.55);ctx.bezierCurveTo(xx-40,yy-r,xx+32,yy+r,xx,yy+r*.5);ctx.bezierCurveTo(xx-r,yy+r*.3,xx-r,yy-r*.2,xx-4,yy-r*.25);ctx.stroke();
    ctx.strokeStyle='#ffffff99';ctx.lineWidth=1;ctx.stroke();
   }
   ctx.fillStyle='#caa4e9';for(let i=0;i<12;i++){const a=i*2.39996,xx=reach*(.55+(i%4)*.14),yy=Math.sin(a+p*5)*spread*.65;ctx.save();ctx.translate(xx,yy);ctx.rotate(a+p*3);ctx.beginPath();ctx.ellipse(0,0,3.6,6.5,0,0,TAU);ctx.fill();ctx.restore();}
  }else if(e.kind==='healingWeaken'){
   ctx.globalAlpha=k;ctx.fillStyle='#ead0ff';ctx.font='600 11px sans-serif';ctx.textAlign='center';ctx.fillText('치유 −50%',e.x,e.y-47-18*p);
  }else if(e.kind==='cleanse'){
   this.drawCleanse(ctx,e);
  }else if(e.kind==='luckyGlueThrow'){const gx=e.x+(e.tx-e.x)*p,gy=e.y+(e.ty-e.y)*p,height=20*(1-p)+Math.sin(p*Math.PI)*55;ctx.fillStyle='#172b2530';ctx.beginPath();ctx.ellipse(gx+5,gy,12-4*p,5-2*p,0,0,TAU);ctx.fill();ctx.fillStyle='#a9e44b';ctx.strokeStyle='#ecffb2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(gx,gy-height,9+3*Math.sin(p*12),7,p*6,0,TAU);ctx.fill();ctx.stroke();for(let i=1;i<4;i++){const q=Math.max(0,p-i*.035),x=e.x+(e.tx-e.x)*q,y=e.y+(e.ty-e.y)*q-20*(1-q)-Math.sin(q*Math.PI)*55;ctx.globalAlpha=.35/i;ctx.beginPath();ctx.arc(x,y,4-i*.7,0,TAU);ctx.fill();}ctx.globalAlpha=1;}else if(e.kind==='luckyGlue'){ctx.fillStyle='#b6ef6570';for(let i=0;i<8;i++){const a=i*2.4,d=(e.radius||100)*p*.9;ctx.beginPath();ctx.ellipse(e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,10*(1-p)+3,5*(1-p)+2,a,0,TAU);ctx.fill();}}else if(e.kind==='luckySpray'){this.drawSprayCloud(ctx,{...e,startedAt:this.time-(e.max-e.t),expires:this.time+e.t},this.time);}else if(e.kind==='luckyJackpot'){ctx.globalCompositeOperation='lighter';this.blob(ctx,this.textures.glow,e.x,e.y-28,70,k*.4);ctx.strokeStyle='#ffe9a6';ctx.lineWidth=2*k;for(let i=0;i<8;i++){const a=i*TAU/8;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*(18+p*25),e.y-26+Math.sin(a)*(12+p*18));ctx.lineTo(e.x+Math.cos(a)*(28+p*45),e.y-26+Math.sin(a)*(19+p*30));ctx.stroke();}}else if(e.kind==='flame'){
   const latest=this.flameJets.get(this.flameKey(e));if(latest&&latest!==e){ctx.restore();return true;}
   const m=this.muzzlePoint(e);ctx.globalCompositeOperation='lighter';
   for(const q of this.flamePlumes(e)){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle);ctx.scale(1.35,.85);this.blob(ctx,this.textures.flame||this.textures.fire,0,0,q.size,q.alpha*k);ctx.restore();}
   // A short hot core makes the nozzle readable; no filled cone or hard edges.
   this.blob(ctx,this.textures.glow,m.x,m.y,13,k*.65);
  }else if(e.kind==='bladeSlash'){
   ctx.translate(e.x,e.y-20);ctx.scale(1,.8);ctx.rotate(e.angle);const end=-1.05+2.1*p,start=end-.85,r=e.range;ctx.globalCompositeOperation='lighter';ctx.globalAlpha=k*.8;ctx.fillStyle='#e935a48c';ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.arc(0,0,r-9,end,start,true);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffb2e5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r-3,start+.14,end);ctx.stroke();if(e.hit){const x=Math.cos(end)*(r-3),y=Math.sin(end)*(r-3);ctx.fillStyle='#ffe0f5';for(let i=0;i<3;i++){const a=i*2.1;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*7*p,y+Math.sin(a)*7*p,1.5,4*(1-p)+1,a,0,TAU);ctx.fill();}}
  }else if(e.kind==='bayonetWarn'){
   ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.globalAlpha=.16+.18*p;ctx.fillStyle=e.slash?'#e1469e':'#eda058';ctx.strokeStyle=e.slash?'#ffb2e5':'#f4c57e';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(8,0);ctx.arc(0,0,e.range,e.slash?-.95:-.48,e.slash?.95:.48);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(e.kind==='bayonetThrust'){
   const a=e.angle,x=e.x+Math.cos(a)*e.range,y=e.y+Math.sin(a)*e.range-22;ctx.globalAlpha=k*.8;ctx.strokeStyle='#edf1d4';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(x-Math.cos(a)*18,y-Math.sin(a)*14);ctx.lineTo(x+Math.cos(a)*8,y+Math.sin(a)*6);ctx.stroke();if(e.hit){ctx.strokeStyle='#efb96c';ctx.lineWidth=1.5;for(let i=0;i<3;i++){const angle=a+(i-1)*.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*(8+8*p),y+Math.sin(angle)*(8+8*p));ctx.stroke();}}
  }else if(e.kind==='sting'){
   const a=Math.atan2(e.ty-e.y,e.tx-e.x),x=e.x+Math.cos(a)*20,y=e.y-e.flightHeight-12+Math.sin(a)*12;ctx.strokeStyle='#ffbd76';ctx.lineWidth=2*k;ctx.globalAlpha=k;ctx.beginPath();ctx.arc(x,y,9+7*p,a-.8,a+.8);ctx.stroke();
  }else if(e.kind==='ultimateVolley'){
   const m=this.muzzlePoint(e);ctx.globalCompositeOperation='lighter';this.blob(ctx,this.textures.glow,m.x,m.y,28,k*.9);
   ctx.save();ctx.translate(m.x,m.y);ctx.rotate(e.angle);ctx.fillStyle='#fff7da';ctx.beginPath();ctx.moveTo(29,0);ctx.lineTo(3,4);ctx.lineTo(-7,11);ctx.lineTo(-3,0);ctx.lineTo(-7,-11);ctx.lineTo(3,-4);ctx.closePath();ctx.fill();ctx.restore();
  }else if(e.kind==='muzzle'){
   const m=this.muzzlePoint(e),heavy=e.weapon==='tank'||e.weapon==='crimsonAce',size=heavy?36:e.weapon==='rocket'?23:e.weapon==='mortar'?19:e.weapon==='sniper'?19:14;ctx.globalCompositeOperation='lighter';this.blob(ctx,this.textures.glow,m.x,m.y,size,k*.8);ctx.translate(m.x,m.y);ctx.rotate(e.angle||0);ctx.globalAlpha=k;
   ctx.fillStyle='#ffe7a1';ctx.beginPath();ctx.moveTo(size*k,0);ctx.lineTo(2,4);ctx.lineTo(-6,9*k);ctx.lineTo(-2,0);ctx.lineTo(-6,-9*k);ctx.lineTo(2,-4);ctx.closePath();ctx.fill();ctx.fillStyle='#fffbed';ctx.fillRect(-2,-2,8+size*.25*k,4);
  }else if(e.kind==='explosion'){
   const r=e.radius||50;ctx.globalCompositeOperation='lighter';this.blob(ctx,this.textures.glow,e.x,e.y-8,r*(.6+.5*p),Math.max(0,1-p*3)*.85);
   for(let i=0;i<5;i++){const a=i*2.399;this.blob(ctx,this.textures.fire,e.x+Math.cos(a)*r*p*.42,e.y+Math.sin(a)*r*p*.28-12*p,r*(.2+.25*p),Math.max(0,1-p*1.5)*.8);}
   ctx.globalCompositeOperation='source-over';ctx.globalAlpha=k*.6;ctx.strokeStyle=e.team===0?'#9deba8':'#f4ddb0';ctx.lineWidth=1+5*k;ctx.beginPath();ctx.ellipse(e.x,e.y,r*(.25+p),r*(.16+p*.65),0,0,TAU);ctx.stroke();
   ctx.globalAlpha=k*.3;ctx.strokeStyle='#a89868';ctx.lineWidth=10*k;ctx.beginPath();ctx.ellipse(e.x,e.y,r*(.3+p*.9),r*(.2+p*.58),0,0,TAU);ctx.stroke();
  }else if(e.kind==='tracer'){
   const g=ctx.createLinearGradient(e.x,e.y-20,e.tx,e.ty-12);g.addColorStop(0,'#fff5c700');g.addColorStop(.6,'#ffe8a777');g.addColorStop(1,'#fffde3');ctx.globalCompositeOperation='lighter';ctx.globalAlpha=k;ctx.strokeStyle=g;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(e.x,e.y-20);ctx.lineTo(e.tx,e.ty-12);ctx.stroke();this.blob(ctx,this.textures.glow,e.tx,e.ty-12,10,k*.45);
  }else if(e.kind==='heal'){
   ctx.globalAlpha=k;ctx.strokeStyle='#c6f1a5';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(e.x,e.y,18+14*p,8+6*p,0,0,TAU);ctx.stroke();ctx.fillStyle='#d6ffc1';for(let i=0;i<3;i++){const x=e.x+(i-1)*12,y=e.y-15-p*32-i*5;ctx.fillRect(x-1.5,y-5,3,10);ctx.fillRect(x-5,y-1.5,10,3);}
  }else if(e.kind==='evolve'){
   ctx.globalCompositeOperation='lighter';this.blob(ctx,this.textures.glow,e.x,e.y-20,65,k*.35);ctx.globalAlpha=k;ctx.strokeStyle='#ffe29a';ctx.lineWidth=2;
   for(let i=0;i<9;i++){const a=i*TAU/9+p*3,r=25+p*65;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*r*.5,e.y+Math.sin(a)*r*.4-10);ctx.lineTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r*.7-25);ctx.stroke();}ctx.globalCompositeOperation='source-over';ctx.fillStyle='#ffe9a7';ctx.font='700 18px sans-serif';ctx.textAlign='center';ctx.fillText('진화!',e.x,e.y-30-20*p);
  }
  ctx.restore();return true;
 }
 drawShot(ctx,p,evolved=false){
  const a=Math.atan2(p.target.y-p.y,p.target.x-p.x),heavy=p.kind==='tank'||p.kind==='crimsonAce'||p.kind==='rocket',sniper=p.kind==='sniper',len=heavy?25:sniper?33:16,flight=p.target.visualFlightHeight??root.FrontTypes?.[p.target.type]?.flightHeight??0,fromFlight=root.FrontTypes?.[p.source?.type]?.flightHeight||0,total=p.source?Math.hypot(p.target.x-p.source.x,p.target.y-p.source.y):1,progress=clamp(1-Math.hypot(p.target.x-p.x,p.target.y-p.y)/Math.max(1,total),0,1),y=p.y-16-fromFlight*(1-progress)-flight*progress;
  ctx.save();if(p.kind==='crimsonAce'){const tip=this.weaponPoint?.(p.source);if(tip)ctx.translate((tip.x-p.source.x)*(1-progress),(tip.y-p.source.y+16)*(1-progress));}ctx.globalCompositeOperation='lighter';const g=ctx.createLinearGradient(p.x-Math.cos(a)*len,y-Math.sin(a)*len,p.x,y);g.addColorStop(0,heavy&&p.team===0?'#75ec8a00':'#ffc47500');g.addColorStop(.7,heavy&&p.team===0?'#8bef9b':evolved?'#ffd05a':'#ffc97b');g.addColorStop(1,heavy&&p.team===0?'#d4ffcc':'#fff8d7');ctx.strokeStyle=g;ctx.lineWidth=heavy?3:sniper?1.5:1.3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-Math.cos(a)*len,y-Math.sin(a)*len);ctx.lineTo(p.x,y);ctx.stroke();if(heavy){this.blob(ctx,this.textures.glow,p.x,y,8,.45);ctx.globalCompositeOperation='source-over';ctx.translate(p.x,y);ctx.rotate(a);ctx.fillStyle=p.kind==='rocket'?'#658356':p.team===0?'#92bd7e':'#d6bc77';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(3,-3);ctx.lineTo(-8,-3);ctx.lineTo(-8,3);ctx.lineTo(3,3);ctx.closePath();ctx.fill();if(p.kind==='rocket'){ctx.fillStyle='#ced4aa';ctx.fillRect(-7,-4,3,8);}}ctx.restore();
 }
 drawHealingStatuses(ctx,game,visible=()=>true){
  const a=this.healingReductionAsset();
  for(const u of [...game.units,...game.buildings.filter(b=>b.kind==='repairBot')]){
   if(u.hp<=0||!visible(u))continue;const healing=game.time<(u.healingReductionUntil||0),poison=game.time<(u.poisonUntil||0);if(!healing&&!poison)continue;
   const vehicle=['tank','guntruck','artillery','lucky'].includes(u.type),rise=vehicle?79:u.kind==='repairBot'?48:66,w=20,h=a?.ready?w*a.image.naturalHeight/a.image.naturalWidth:18;
   ctx.save();if(healing&&a?.ready)ctx.drawImage(a.image,u.x-w/2,u.y-rise-h-7,w,h);
   if(poison){const x=u.x+(healing?20:0),y=u.y-rise-16;ctx.translate(x,y);ctx.fillStyle='#94d756';ctx.strokeStyle='#d8ffb0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-9);ctx.bezierCurveTo(-3,-3,-8,1,-6,5);ctx.bezierCurveTo(-3,11,5,10,6,4);ctx.bezierCurveTo(6,0,2,-5,0,-9);ctx.closePath();ctx.fill();ctx.stroke();}
   ctx.restore();
  }
 }
 drawParticles(ctx,visible=()=>true){
  ctx.save();
  for(const p of this.particles){if(!visible(p))continue;const k=1-p.age/p.life,size=p.size+(p.growth||0)*p.age;
   ctx.globalCompositeOperation=p.kind==='fire'||p.kind==='spark'?'lighter':'source-over';
   if(p.kind==='bullet'){ctx.save();ctx.globalAlpha=k;ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.fillStyle='#d78c3f';ctx.fillRect(-5,-1.4,7,2.8);ctx.fillStyle='#fff0b4';ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(1,-1.5);ctx.lineTo(1,1.5);ctx.closePath();ctx.fill();ctx.globalAlpha=k*.35;ctx.strokeStyle='#ffba6a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(-15,0);ctx.stroke();ctx.restore();}
   else if(p.kind==='casing'){ctx.save();ctx.globalAlpha=k;ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.fillStyle='#b77b35';ctx.fillRect(-p.size*1.7,-p.size*.6,p.size*3.4,p.size*1.2);ctx.fillStyle='#ffe6a5';ctx.fillRect(-p.size*1.7,-p.size*.6,p.size*3.4,p.size*.45);ctx.restore();}
   else if(p.kind==='spark'){ctx.globalAlpha=k;ctx.strokeStyle=p.color;ctx.lineWidth=p.size*.65;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.035,p.y-p.vy*.035);ctx.stroke();}
   else if(p.kind==='debris'){ctx.save();ctx.globalAlpha=k;ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-size,-size*.7);ctx.lineTo(size,0);ctx.lineTo(size*.2,size);ctx.closePath();ctx.fill();ctx.fillStyle='#d8cc9277';ctx.fillRect(-size*.6,-size*.5,size,.6);ctx.restore();}
   else this.blob(ctx,this.textures[p.kind]||this.textures.smoke,p.x,p.y,size,k*(p.alpha||.35));
  }ctx.restore();
 }
 diagnostics(){return{particles:this.particles.length,scorches:this.scorches.length,budget:this.budget};}
}
root.FrontEffects=FrontEffects;if(typeof module!=='undefined')module.exports={FrontEffects};
})(typeof window!=='undefined'?window:globalThis);
