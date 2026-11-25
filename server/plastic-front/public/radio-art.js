/* World-space paint for the signal corps. All animation follows the combat clock. */
(function (root) {
'use strict';
const tau = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => 1 - (1 - clamp(n)) ** 3;
const preference = root.matchMedia?.('(prefers-reduced-motion: reduce)');
const quiet = game => game?.reducedMotion ?? preference?.matches ?? false;
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
function face(c,x,y,n,gold,angle) {
 c.save(); c.translate(x,y); c.rotate(angle);
 c.fillStyle = gold ? '#795128' : '#364c42';
 c.beginPath(); c.roundRect(-8,-8,17,19,3.4); c.fill();
 const ivory = c.createLinearGradient(-6,-9,6,9);
 ivory.addColorStop(0,gold ? '#fff5bc' : '#fffdf1');
 ivory.addColorStop(.68,gold ? '#edc064' : '#e1e7cc');
 ivory.addColorStop(1,gold ? '#bb8138' : '#a5b3a1');
 c.fillStyle = ivory; c.beginPath(); c.roundRect(-9,-9,17,17,3.5); c.fill();
 stroke(c,.8,gold ? '#ffe393' : '#fbffe9',()=>c.roundRect(-8.3,-8.3,15.7,15.7,3));
 for (const [a,b] of pipLayout[n] || []) {
  ellipse(c,a*4.5-.5,b*4.5-.1,n===1?2.25:1.55,n===1?2.25:1.55,'#ffffd6');
  ellipse(c,a*4.5-.5,b*4.5-.7,n===1?2.25:1.55,n===1?2.25:1.55,gold?'#513516':'#263c34');
 }
 c.restore();
}
function rolls(c,game,visible) {
 const rolling = game.effects.filter(e=>e.kind==='radioRoll' && visible(e.source || e));
 if (!rolling.length) return;
 const tr = c.getTransform();
 const scale = Math.max(.4, Math.hypot(tr.a,tr.b) / (root.devicePixelRatio || 1));
 const lanes = [];
 for (const e of rolling) {
  const u=e.source || e, age=e.max-e.t, hit=e.a===e.b, reduced=quiet(game);
  const spinning=!reduced && age<.23;
  const tick=Math.floor(age*23), first=e.golden?3:1, count=7-first;
  const faces=spinning ? [first+(e.a-first+tick)%count,first+(e.b-first+5*tick)%count] : [e.a,e.b];
  const x=u.x*scale;
  let y=(u.y-57)*scale-10;
  while(lanes.some(lane=>Math.abs(lane.x-x)<41 && Math.abs(lane.y-y)<22)) y-=23;
  lanes.push({x,y});
  c.save(); c.globalAlpha *= clamp(e.t/.16);
  if (hit) {
   const lampX=u.x+7, lampY=u.y-38;
   glow(c,lampX,lampY,15,15,'#fff9b6','#ffc44772');
   ellipse(c,lampX,lampY,2.3,2.3,'#fffdee');
   const wave=reduced?.5:(age*2.8)%1, r=5+wave*12;
   c.save(); c.globalAlpha*=1-wave;
   stroke(c,1.6,'#ffdb85',()=>c.arc(lampX,lampY,r,-1.5,-.22));
   stroke(c,1.2,'#ffeab0',()=>c.arc(lampX,lampY,r+4,-1.5,-.22)); c.restore();
  }
  c.translate(x/scale,y/scale); c.scale(1/scale,1/scale);
  const jump=spinning ? 3*Math.sin(age/.23*Math.PI):0;
  const twist=spinning ? .37*Math.sin(age*38):0;
  face(c,-10,-jump,faces[0],hit||e.golden,twist-.035);
  face(c,10,-jump*.55,faces[1],hit||e.golden,-twist+.035);
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
function ground(c,game,visible=()=>true,fx) {
 for(const z of game.radioFireZones || []) {
  if (!visible(z)) continue;
  const age=game.time-z.startedAt, life=z.until-game.time;
  if (age<0 || life<=0) continue;
  const fade=clamp(age/.14)*clamp(life/.4), r=z.radius, seed=seedFor(z);
  const time=quiet(game) ? .48 : age;
  c.save(); c.translate(z.x,z.y); c.globalAlpha*=fade;
  ellipse(c,0,0,r,r,gradient(c,0,0,r,[0,'#73361ca8'],[.58,'#9c41298c'],[.87,'#bd552f67'],[1,'#6a362300']));
  const textures=fx?.prepareImpactMaterials?.();
  // Unequal pockets of spilled fuel. The scorched islands stay fixed while wisps rise from each pool.
  const pockets=r>105?8:5;
  for(let i=0;i<pockets;i++) {
   const a=i*2.39996+seed*.08+(noise(seed,i+13)-.5)*.9;
   const d=r*(i===0?.05:.32+.41*noise(seed,i+35));
   const x=Math.cos(a)*d, y=Math.sin(a)*d;
   const wide=r*(.14+.19*noise(seed,i+4)), depth=wide*(.38+.24*noise(seed,i+14));
   glow(c,x,y,wide,depth,'#672915e8','#bf501ba1');
   const pieces=2+(i%3);
   for(let j=0;j<pieces;j++) {
    const k=5*i+j, phase=time*(3.8+2.1*noise(seed,k+40))+k*1.73;
    const px=x+(noise(seed,k+6)-.5)*wide*1.4,py=y+(noise(seed,k+38)-.5)*depth;
    const s=(3+r*.046)*(j===0?1.3:.39+.62*noise(seed,k+17));
    glow(c,px,py,s*1.8,s*.64,'#ffd075c9','#ef792278');
    if(textures) {
     const h=s*(2.55+.55*Math.sin(phase));
     c.save();c.globalAlpha*=.88;c.drawImage(textures.fire[k%3],px-s*1.32,py-h*.85,s*2.65,h);c.restore();
    }
    flame(c,px,py,s*(.27+.19*noise(seed,k+23)),s*(1.1+.46*Math.sin(phase)),s*.83*Math.sin(phase*.71));
    const ember=(time*(.38+.58*noise(seed,k+5))+noise(seed,k+13))%1;
    c.save();c.globalAlpha*=1-ember;
    ellipse(c,px+Math.sin(ember*4+k)*3+ember*5,py-s*(1.4+ember*2.4),1.15,.73,'#ffdb8c');c.restore();
   }
  }
  c.restore();
 }
}
function guidance(c,r,p,nuclear) {
 c.save();
 const tint=nuclear?'#ffd09c':'#ffdfac';
 const outer=(nuclear?.87:.68)*r;
 c.lineCap='round';
 for(let i=0;i<4;i++){
  const a=i*tau/4+.31;
  stroke(c,nuclear?2.2:1.5,tint,()=>c.arc(0,0,outer,a,a+.27));
  const x=Math.cos(a+.135), y=Math.sin(a+.135);
  stroke(c,1.5,tint,()=>{c.moveTo(x*(outer-4),y*(outer-4));c.lineTo(x*(outer+4),y*(outer+4));});
 }
 const ring=(nuclear?11:6)+12*(1-p);
 stroke(c,nuclear?2:1.3,tint,()=>c.arc(0,0,ring,0,tau));
 c.restore();
}
function incoming(c,e,p) {
 const nuke=e.strike==='nuke', fire=e.strike==='incendiary', seq=e.seq||0;
 guidance(c,e.radius,p,nuke);
 const flight = clamp((e.t / (nuke?.83:fire?.56:.43)));
 if(flight===1) return;
 const height=(nuke?210:135)*flight*(2-flight);
 const dx=nuke ? 0 : (fire?-24:(seq-1)*15-25)*flight;
 const bodyScale=nuke?1.34:fire?.66:.77;
 glow(c,dx*.2+4,0,bodyScale*(11+6*p),bodyScale*5,'#302b26a0','#49382e4a');
 c.save(); c.translate(dx,-height); c.rotate(nuke?0:Math.atan2(-dx,Math.max(1,height)));
 c.scale(bodyScale,bodyScale);
 const length=nuke?42:32,w=nuke?8.2:5;
 const plume=c.createLinearGradient(0,-length-24,0,-length+4);
 plume.addColorStop(0,'#e5dfbe00');plume.addColorStop(.48,'#c4beaaa8');plume.addColorStop(.86,'#ffc269');plume.addColorStop(1,'#fff7c4');
 c.fillStyle=plume;c.beginPath();c.moveTo(-w*.5,-length+2);c.quadraticCurveTo(-w,-length-6,0,-length-24);
 c.quadraticCurveTo(w,-length-6,w*.5,-length+2);c.fill();
 const shell=c.createLinearGradient(-w,0,w,0);
 shell.addColorStop(0,'#26383f');shell.addColorStop(.24,nuke?'#8d9b90':'#afbab5');
 shell.addColorStop(.52,nuke?'#616f66':'#808f8b');shell.addColorStop(1,'#27383b');
 const fin=nuke?'#a65335':fire?'#b87d38':'#596c63';
 for(const side of [-1,1]) polygon(c,[[side*w*.65,-length+2],[side*w*1.74,-length-1],[side*w*1.5,-length+9],[side*w*.64,-length+15]],fin);
 c.fillStyle=shell;c.beginPath();c.moveTo(-w*.68,-length);c.quadraticCurveTo(-w*1.15,-length*.53,-w*.85,-length*.28);
 c.quadraticCurveTo(-w*.64,-length*.09,0,0);c.quadraticCurveTo(w*.85,-length*.1,w*.91,-length*.31);
 c.quadraticCurveTo(w*1.13,-length*.62,w*.68,-length);c.closePath();c.fill();
 for(const h of [.72,.78]){c.fillStyle=nuke?'#e9ba59':'#e2c8a0';c.fillRect(-w*.9,-length*h,w*1.8,1.5);}
 c.strokeStyle='#f3ecd180';c.lineWidth=1;c.beginPath();c.moveTo(-w*.56,-length*.88);c.quadraticCurveTo(-w*.85,-length*.46,-w*.43,-length*.24);c.stroke();
 c.restore();
}
function smokeLobe(c,x,y,r,heat,textures,index=0) {
 if(r<.1)return;
 if(textures) {
  const w=r*3.4,h=r*3;
  const fire=clamp((heat-.08)*1.5),smoke=clamp(1.4-heat);
  c.save();c.globalAlpha*=smoke;c.drawImage(textures.smoke[index%3],x-w*.5,y-h*.56,w,h);c.restore();
  c.save();c.globalAlpha*=fire;c.drawImage(textures.fire[index%3],x-w*.5,y-h*.49,w,h);c.restore();
  return;
 }
 const g=c.createRadialGradient(x-r*.22,y+r*.18,0,x,y,r);
 if(heat>.58){g.addColorStop(0,'#fff4bf');g.addColorStop(.42,'#ffc366');g.addColorStop(.78,'#ce6d39');g.addColorStop(1,'#7c4b3930');}
 else if(heat>.23){g.addColorStop(0,'#ed985c');g.addColorStop(.54,'#b07854');g.addColorStop(.84,'#775846');g.addColorStop(1,'#59473735');}
 else{g.addColorStop(0,'#ac9e83');g.addColorStop(.6,'#827968');g.addColorStop(.9,'#615c50');g.addColorStop(1,'#615c5038');}
 ellipse(c,x,y,r,r*.88,g);
}
function pressure(c,r,p,nuke) {
 const strength=clamp(1-p/.79);
 if(!strength)return;
 const wave=Math.max(2,r*ease(p/.79));
 c.save(); c.globalAlpha*=strength;
 stroke(c,(nuke?6:3)*strength+1,'#fff0bfbe',()=>c.arc(0,0,wave,0,tau));
 stroke(c,1.2,'#ffcb84be',()=>c.arc(0,0,Math.max(1,wave-5),0,tau));
 c.restore();
}
function mushroom(c,e,p,textures) {
 const r=e.radius, seed=seedFor(e), size=Math.min(1.45,Math.max(.9,r/160));
 const lift=ease(p/.72), height=(16+79*lift)*size, cap=(9+40*lift)*size, heat=1-p;
 const band=ease(p/.4), wind=Math.sin(p*1.9+seed%3)*cap*.12*lift;
 const points=[];
 for(let i=0;i<21;i++){
  const q=i/20;
  const center=wind*q+Math.sin(q*8+p*2.8)*size*3.7*(.2+q);
  const width=size*(5.3+14*(1-q)**3+14*q**4+4*noise(seed,3+i))*(.54+.46*lift);
  points.push({x:center,y:-q*height,w:width});
 }
 const stem=c.createLinearGradient(-18*size,0,18*size,-height*.12);
 stem.addColorStop(0,'#725b48');stem.addColorStop(.27,heat>.6?'#bd7547':'#a48b69');
 stem.addColorStop(.57,heat>.5?'#f8b85f':'#c19463');stem.addColorStop(.83,'#86634f');stem.addColorStop(1,'#5a5047');
 c.save();
 c.beginPath();c.moveTo(-points[0].w,0);
 function edge(list,side){
  for(let i=0;i<list.length-1;i++){
   const a=list[i],b=list[i+1],ax=a.x+a.w*side,bx=b.x+b.w*side;
   c.quadraticCurveTo(ax,a.y,(ax+bx)/2,(a.y+b.y)/2);
  }
  const tip=list[list.length-1];c.lineTo(tip.x+tip.w*side,tip.y);
 }
 edge(points,-1);edge(points.slice().reverse(),1);c.closePath();c.fillStyle=stem;c.fill();c.clip();
 if(textures){
  for(let i=0;i<7;i++){
   const v=i/6, slab=points[Math.round(v*20)], w=slab.w*(2.9+.4*noise(seed,i));
   const x=slab.x-1.5*slab.w+Math.sin(i*2.1+p*2)*4*size;
   c.drawImage(textures.smoke[i%3],x,slab.y-w*.6,w,w*.96);
   if(heat>.28){
    c.save();c.globalAlpha*=heat*.74;c.drawImage(textures.fire[(i+1)%3],x+slab.w*.38,slab.y-w*.45,w*.88,w*1.2);c.restore();
   }
  }
 }else{
  for(let i=1;i<7;i++){const v=i/8,j=points[Math.floor(v*20)];
   stroke(c,2.5*size,'#e6b47a65',()=>{c.moveTo(j.x-j.w*1.2,j.y+6*size);c.bezierCurveTo(j.x+j.w*.1,j.y+5*size,j.x+j.w*.9,j.y-4*size,j.x+j.w*.1,j.y-7*size);});
  }
 }
 c.restore();
 c.save();c.translate(wind,-height);
 const contour=[],count=64;
 for(let i=0;i<count;i++){
  const a=i*tau/count,si=Math.sin(a),co=Math.cos(a);
  const turbulence=.06*Math.sin(7*a+p*2.5)+.038*Math.cos(12*a-p*2)+.025*Math.sin(17*a+seed);
  const x=co*cap*(1+turbulence);
  const y=(si<0?si*.49:si*.31)*cap*(1+2*turbulence)-.07*cap*Math.cos(2*a)+Math.sin(3*a-.4)*cap*.035;
  contour.push({x,y});
 }
 const mantle=c.createLinearGradient(0,-cap*.53,0,cap*.38);
 mantle.addColorStop(0,heat>.7?'#cf956b':'#a8977f');
 mantle.addColorStop(.30,heat>.62?'#cc8957':'#846f5f');
 mantle.addColorStop(.6,heat>.5?'#8e5235':'#624c42');
 mantle.addColorStop(.83,heat>.58?'#ffc481':'#c88b59');
 mantle.addColorStop(1,heat>.54?'#ee9f5b':'#8e6550');
 const mid=(a,b)=>[(a.x+b.x)/2,(a.y+b.y)/2];
 c.beginPath();c.moveTo(...mid(contour[count-1],contour[0]));
 for(let i=0;i<count;i++){const a=contour[i],b=contour[(i+1)%count];c.quadraticCurveTo(a.x,a.y,...mid(a,b));}
 c.closePath();c.fillStyle=mantle;c.fill();c.save();c.clip();
 if(textures){
  for(let i=0;i<14;i++){
   const v=(i+.45)/14, x=cap*(v*2-1), arc=Math.sqrt(Math.max(0,1-(x/cap)**2));
   const w=cap*(.47+.22*noise(seed,i+25));
   c.drawImage(textures.smoke[i%3],x-w*.51,-cap*(.14+.37*arc)+cap*.1*noise(seed,i),w,w*.95);
   c.save();c.globalAlpha*=heat*.83;
   c.drawImage(textures.fire[(i+1)%3],x-w*.57,cap*(.19*arc-.24),w,w*.74);c.restore();
  }
 }
 c.restore();
 // Hot material rolls out under the lip and folds back into the cooling mantle.
 const rim=c.createLinearGradient(-cap,0,cap,0);
 rim.addColorStop(0,'#daa16600');rim.addColorStop(.24,'#f9ba6eaf');rim.addColorStop(.54,'#ffe4a3c9');
 rim.addColorStop(.8,'#d5a476b0');rim.addColorStop(1,'#c39c8000');
 c.save();c.globalAlpha*=heat*.8;
 stroke(c,Math.max(1,cap*.035),rim,()=>{c.moveTo(-cap*.91,cap*.065);c.bezierCurveTo(-cap*.64,cap*.36,cap*.53,cap*.39,cap*.94,cap*.07);});c.restore();
 if(p>.19 && !quiet()){
  c.save();c.globalAlpha*=.30*band;
  for(let i=0;i<4;i++){
   const x=cap*(i-1.5)*.37, y=-cap*(.41+.08*noise(seed,i));
   stroke(c,cap*(.023+.018*noise(seed,i+3)),'#b6aa92',()=>{c.moveTo(x,y);c.bezierCurveTo(x+cap*.09,y-cap*.11,x-cap*.04,y-cap*.14,x+cap*.12,y-cap*(.12+.18*p));});
  }c.restore();
 }
 c.restore();
 if(textures){
  for(let i=0;i<9;i++){
   const a=i*2.39996, d=r*(.12+.52*ease(p)),w=r*(.21+p*.18);
   c.save();c.globalAlpha*=.6*(1-p);c.drawImage(textures.dust[i%2],Math.cos(a)*d-w*.5,Math.sin(a)*d*.57-w*.15,w,w*.32);c.restore();
  }
 }
}
function impact(c,e,p,fx) {
 const nuke=e.strike==='nuke',fire=e.strike==='incendiary',r=e.radius,seed=seedFor(e),reduced=quiet();
 if(!nuke && !reduced && fx?.drawImpactMaterial?.(c,{...e,x:0,y:0}))return;
 if(!reduced)pressure(c,r,p,nuke);
 const flash=clamp(1-p/.22);
 if(flash>0) {
  c.save();c.globalAlpha*=flash*(reduced?.3:.9);
  glow(c,0,-3,r*(.45+.35*p),r*(.38+.22*p),'#fffbd3','#ffb14b9e');c.restore();
 }
 const heat=1-p;
 c.save();c.globalAlpha*=clamp((1-p)/.3);
 if(nuke){
  mushroom(c,e,p,fx?.prepareImpactMaterials?.());
 }else{
  for(let i=0;i<(fire?7:9);i++){
   const a=i*2.39996+.4,d=(i===0?0:r*.24*ease(p/.8))*(.66+noise(seed,i)*.38);
   const x=Math.cos(a)*d,y=Math.sin(a)*d*.63-r*(.055+p*(.15+noise(seed,i+12)*.16));
   smokeLobe(c,x,y,r*(.10+.075*ease(p))*(.8+noise(seed,i)*.45),heat*(fire?1.15:1),fx?.prepareImpactMaterials?.(),i);
  }
 }
 if(!reduced){
  const count=nuke?17:9;
  for(let i=0;i<count;i++){
   const a=i*2.39996+noise(seed,i)*.55;
   const d=r*(.3+.50*noise(seed,i+34))*ease(p);
   const x=Math.cos(a)*d, y=Math.sin(a)*d*.77-Math.sin(p*Math.PI)*r*(.17+.25*noise(seed,i+12));
   stroke(c,1+noise(seed,i)*1.45,heat>.4?'#ffd387':'#a88861',()=>{c.moveTo(x-Math.cos(a)*4,y-2);c.lineTo(x,y);});
  }
 }
 c.restore();
}
function event(c,e,fx) {
 if(e.kind==='radioRoll')return true; // Heads-up result renders after units and blasts.
 if(e.kind!=='radioIncoming'&&e.kind!=='radioImpact')return false;
 const p=clamp(1-e.t/e.max);
 c.save();c.translate(e.x,e.y);
 if(e.kind==='radioIncoming')incoming(c,e,p);else impact(c,e,p,fx);
 c.restore();return true;
}
root.FrontRadioArt={event,rolls,ground};
})(typeof window==='undefined'?globalThis:window);

