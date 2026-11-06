/* Distinct silhouettes and attack signatures for evolved squads; rendering never changes combat. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),colors={burst:'#ffd880',burstFinal:'#fff3b8',heat:'#ffb254',heatPierce:'#ff742e',pierce:'#97edff',ricochet:'#c0f58b',siege:'#ffbc57',cluster:'#ff9e71',mortarTwin:'#ffe0a1'};
function install(Effects){
 const p=Effects.prototype,draw=p.drawEvent,shot=p.drawShot,symbol=p.paintLuckySymbol;
 p.drawBossKiller=function(c,x,y,angle,time=0,size=1){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
  for(let i=0;i<4;i++){c.fillStyle='#263430'+['45','38','28','18'][i];c.beginPath();c.ellipse(-30-i*12,Math.sin(time*9+i)*3,8+i*2,5+i*2,0,0,TAU);c.fill();}
  const flame=24+Math.sin(time*53)*5,g=c.createLinearGradient(-52,0,-17,0);g.addColorStop(0,'#ff6c1800');g.addColorStop(.6,'#ff9d27');g.addColorStop(1,'#fff4b8');c.fillStyle=g;
  c.beginPath();c.moveTo(-17,-5);c.quadraticCurveTo(-30,-8,-17-flame,0);c.quadraticCurveTo(-30,8,-17,5);c.fill();
  c.fillStyle='#252d30';c.strokeStyle='#a1aaa3';c.lineWidth=1;c.beginPath();c.moveTo(-13,-5);c.lineTo(-24,-13);c.lineTo(-22,-2);c.lineTo(-22,2);c.lineTo(-24,13);c.lineTo(-13,5);c.closePath();c.fill();c.stroke();
  const body=c.createLinearGradient(0,-7,0,7);body.addColorStop(0,'#687276');body.addColorStop(.3,'#303a3d');body.addColorStop(.6,'#11191c');body.addColorStop(1,'#060b0d');c.fillStyle=body;c.strokeStyle='#b4beb4';
  c.beginPath();c.moveTo(25,0);c.quadraticCurveTo(19,-7,10,-7);c.lineTo(-17,-7);c.lineTo(-20,-4);c.lineTo(-20,4);c.lineTo(-17,7);c.lineTo(10,7);c.quadraticCurveTo(19,7,25,0);c.fill();c.stroke();
  c.fillStyle='#f7d347';c.fillRect(6,-6.5,5.5,13);c.fillStyle='#fff1a2';c.fillRect(6.5,-5.5,4.5,2);c.fillStyle='#a68b23';c.fillRect(6.5,4.5,4.5,1.5);c.strokeStyle='#97a8aa';c.beginPath();c.moveTo(-13,-4);c.lineTo(2,-4);c.stroke();c.restore();
 };
 p.paintLuckySymbol=function(c,kind){if(kind!=='bossKiller')return symbol.call(this,c,kind);c.save();c.translate(16,16);c.rotate(-Math.PI/4);c.scale(.62,.62);this.drawBossKiller(c,0,0,0,0,1);c.restore();};
 p.drawShot=function(c,b,evolved=false){
  if(b.kind==='bossKiller'){const angle=Math.atan2(b.target.y-b.y,b.target.x-b.x);this.drawBossKiller(c,b.x,b.y-22,angle,this.time,1.05);return;}
  if(!b.evoStyle)return shot.call(this,c,b,evolved);
  shot.call(this,c,b,true);const a=Math.atan2(b.target.y-b.y,b.target.x-b.x),color=colors[b.evoStyle]||'#ffe49a',width=b.evoStyle==='pierce'?5:b.evoStyle==='heatPierce'?3.5:b.evoStyle==='burstFinal'?3:2;
  c.save();c.globalCompositeOperation='lighter';c.lineCap='round';c.strokeStyle=color;c.lineWidth=width;c.globalAlpha=.85;c.beginPath();c.moveTo(b.x-Math.cos(a)*38,b.y-18-Math.sin(a)*38);c.lineTo(b.x,b.y-18);c.stroke();c.fillStyle='#fff7dd';c.beginPath();c.arc(b.x,b.y-18,width*.9,0,TAU);c.fill();c.restore();
 };
 p.drawEvolutionUnit=function(c,u,time){
  if(u.type==='machinegun'){
   const active=time<(u.overheatUntil||0),progress=active?clamp((u.overheatUntil-time)/4,0,1):clamp((u.evolutionHeat||0)/3,0,1);
   c.save();c.fillStyle='#263028';c.fillRect(u.x-19,u.y+16,38,5);c.fillStyle=active?'#ff8d3c':'#e6b35d';c.fillRect(u.x-18,u.y+17,36*progress,3);c.font='700 9px sans-serif';c.textAlign='center';c.fillStyle=active?'#ffdf9c':'#f0d9a8';c.fillText(active?'과열 관통 '+Math.ceil(u.overheatUntil-time)+'초':'예열',u.x,u.y+34);
   if(active){const a=u.aimFace??u.face;c.translate(u.x+Math.cos(a)*30,u.y+Math.sin(a)*25-26);c.globalCompositeOperation='lighter';c.fillStyle='#ff7b2880';c.beginPath();c.ellipse(0,0,14+Math.sin(time*28)*3,8,a,0,TAU);c.fill();}c.restore();
  }else if(u.type==='lucky'){
   c.save();c.translate(u.x+19,u.y-32);c.rotate((u.moveFace??u.face)+Math.PI/2);c.fillStyle='#1c2428';c.strokeStyle='#87948d';c.lineWidth=1;c.beginPath();c.roundRect(-5,-10,10,22,3);c.fill();c.stroke();c.fillStyle='#ebce4e';c.fillRect(-4,-5,8,4);c.fillStyle='#11191b';c.fillRect(-3,-13,6,4);c.restore();
  }
 };
 p.drawEvent=function(c,e){
  const k=clamp(e.t/e.max,0,1),q=1-k;
  if(e.kind==='cleanse'){
   const result=draw.call(this,c,e);if(!e.source)return result;
   c.save();c.strokeStyle='#b3ffeb';c.lineWidth=2*k;c.globalAlpha=k*.75;c.beginPath();c.moveTo(e.source.x,e.source.y-30);c.quadraticCurveTo((e.source.x+e.x)/2,(e.source.y+e.y)/2-65,e.x,e.y-20);c.stroke();
   if(e.wave){c.lineWidth=3*k;c.beginPath();c.ellipse(e.source.x,e.source.y,25+q*100,12+q*45,0,0,TAU);c.stroke();}
   c.fillStyle='#d4fff3';for(let i=0;i<6;i++){const a=i*TAU/6+q,rx=e.x+Math.cos(a)*(14+q*35),ry=e.y-20+Math.sin(a)*(10+q*25);c.save();c.translate(rx,ry);c.rotate(a+q*4);c.fillRect(-2,-5,4,10);c.restore();}c.restore();return true;
  }
  if(!['evoBeam','evoBlast','evoMuzzle','evoOverheat','evoAwaken','evoBossLaunch','evoBossImpact'].includes(e.kind))return draw.call(this,c,e);
  c.save();c.globalAlpha=k;
  if(e.kind==='evoBeam'){
   c.lineCap='round';c.strokeStyle=colors[e.style]||'#e1ffad';c.lineWidth=e.width+5;c.globalAlpha=k*.2;c.beginPath();c.moveTo(e.x,e.y-20);c.lineTo(e.tx,e.ty-20);c.stroke();c.globalAlpha=k;c.lineWidth=e.width;c.stroke();c.strokeStyle='#fffbe8';c.lineWidth=Math.max(.7,e.width*.25);c.stroke();
  }else if(e.kind==='evoMuzzle'){
   const reach=e.style==='siege'?45:32,x=e.x+Math.cos(e.angle)*reach,y=e.y+Math.sin(e.angle)*reach-25;c.translate(x,y);c.rotate(e.angle);c.fillStyle=colors[e.style]||'#ffdf8a';c.beginPath();c.moveTo(24*(1-q),0);c.lineTo(3,-7*k);c.lineTo(-5,-2);c.lineTo(-3,2);c.lineTo(3,7*k);c.closePath();c.fill();
  }else if(e.kind==='evoBlast'||e.kind==='evoBossImpact'){
   const boss=e.kind==='evoBossImpact',r=e.radius||60,color=boss?'#ffe86a':colors[e.style]||'#ffcd77';c.translate(e.x,e.y);c.scale(1,.76);
   const g=c.createRadialGradient(0,0,1,0,0,r);g.addColorStop(0,'#fff7d9');g.addColorStop(.18,color);g.addColorStop(.6,boss?'#f4a43090':'#ef7f3040');g.addColorStop(1,'#df6b2400');c.fillStyle=g;c.globalAlpha=k*.8;c.beginPath();c.arc(0,0,r*(.45+q*.65),0,TAU);c.fill();c.globalAlpha=k;c.strokeStyle=color;c.lineWidth=(boss?5:3)*k;c.beginPath();c.arc(0,0,r*(.2+q*.9),0,TAU);c.stroke();
   for(let i=0;i<(boss?16:9);i++){const a=i*2.39996,inner=r*(.18+q*.4),outer=r*(.35+q*.8);c.strokeStyle=i%2?'#fff2b0':color;c.lineWidth=i%3?1.5:3;c.beginPath();c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);c.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);c.stroke();}
   if(boss){c.fillStyle='#fff4ac';c.font='800 15px sans-serif';c.textAlign='center';c.fillText('보스킬러',0,-r-8);}
  }else if(e.kind==='evoAwaken'){
   const r=35+q*95;c.translate(e.x,e.y);c.strokeStyle='#ffe69a';c.lineWidth=3*k;c.beginPath();c.ellipse(0,0,r,r*.45,0,0,TAU);c.stroke();
   for(let i=0;i<12;i++){const a=i*TAU/12;c.strokeStyle=i%2?'#fff5cc':'#c4e9a6';c.beginPath();c.moveTo(Math.cos(a)*r*.65,Math.sin(a)*r*.3-15);c.lineTo(Math.cos(a)*r,Math.sin(a)*r*.45-28-q*35);c.stroke();}
   c.globalAlpha=Math.min(1,k*3);c.textAlign='center';c.font='800 19px "Noto Sans KR",sans-serif';c.lineWidth=5;c.strokeStyle='#24372eef';c.strokeText(e.name,0,-135-q*10);c.fillStyle='#fff0ac';c.fillText(e.name,0,-135-q*10);c.font='600 11px "Noto Sans KR",sans-serif';c.strokeText(e.detail,0,-115-q*10);c.fillStyle='#e8f3cd';c.fillText(e.detail,0,-115-q*10);
  }else if(e.kind==='evoOverheat'){
   const u=e.source||e;c.translate(u.x,u.y-30);c.strokeStyle='#ffb45c';c.lineWidth=3*k;c.beginPath();c.arc(0,0,20+q*30,0,TAU);c.stroke();c.font='800 13px sans-serif';c.textAlign='center';c.fillStyle='#ffe0a5';c.fillText('과열 관통!',0,-38-q*15);
  }else if(e.kind==='evoBossLaunch'){
   c.strokeStyle='#ffe569';c.lineWidth=2*k;c.beginPath();c.arc(e.target.x,e.target.y-15,28+q*15,0,TAU);c.stroke();for(let i=0;i<4;i++){const a=i*TAU/4;c.beginPath();c.moveTo(e.target.x+Math.cos(a)*20,e.target.y-15+Math.sin(a)*20);c.lineTo(e.target.x+Math.cos(a)*40,e.target.y-15+Math.sin(a)*40);c.stroke();}c.fillStyle='#ffe77f';c.font='800 12px sans-serif';c.textAlign='center';c.fillText('보스킬러',e.x,e.y-62-q*18);
  }
  c.restore();return true;
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install(root.FrontEffects);
})(typeof window==='undefined'?globalThis:window);
