/* Hand-drawn magic layers. Each persistent sword owns exactly one weapon sprite. */
(function(root){'use strict';const SB=root.FrontSwordBoss,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ellipse(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function star(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.14,y-r*.14,x+r*.7,y);c.quadraticCurveTo(x+r*.14,y+r*.14,x,y+r);c.quadraticCurveTo(x-r*.14,y+r*.14,x-r*.7,y);c.quadraticCurveTo(x-r*.14,y-r*.14,x,y-r);c.fill();}
function capsule(c,a){const d=Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x),px=-Math.sin(d)*a.radius,py=Math.cos(d)*a.radius;c.beginPath();c.moveTo(a.start.x+px,a.start.y+py);c.lineTo(a.end.x+px,a.end.y+py);c.arc(a.end.x,a.end.y,a.radius,d+Math.PI/2,d-Math.PI/2,true);c.lineTo(a.start.x-px,a.start.y-py);c.arc(a.start.x,a.start.y,a.radius,d-Math.PI/2,d+Math.PI/2,true);c.closePath();}
class View{
 constructor(){this.body=new Image();this.blade=new Image();this.command=new Image();this.ready=Promise.all([[this.body,'body.webp'],[this.blade,'blade.webp'],[this.command,'command.webp']].map(([im,file])=>new Promise((yes,no)=>{im.onload=yes;im.onerror=no;im.src='assets/sword-boss/'+file+'?v=160';})));}
 shieldGeometry(b,s,g){const half=g.trialConfig.shieldHalfAngle,front=Math.sin(s.dir),rx=Math.max(18,Math.tan(Math.min(1.25,half))*(Math.abs(front)>.5?48:27));return{x:b.x+Math.cos(s.dir)*98,y:b.y+front*45-68,rx,ry:Math.abs(front)>.5?83:71,front:front>.5,half};}
 parts(g){const b=g.trialBoss;if(!b||b.hp<=0)return[];const out=[{kind:'body',depth:b.y,b}];for(const s of b.swords.blades){if(s.mode==='defend')out.push({kind:'shield',depth:b.y+Math.sin(s.dir)*60-1,s,b});out.push({kind:'blade',depth:s.y,s,b});}return out;}
 drawPart(c,p,g){if(p.kind==='body')this.bodyPart(c,p.b,g);else if(p.kind==='blade')this.bladePart(c,p.s,p.b,g);else this.shield(c,p.s,p.b,g);}
 bodyPart(c,b,g){
  const st=b.swords,rear=g.commander(0).y<b.y-40,f=(rear?2:0)+(st.phase===2?1:0),bob=Math.sin(g.time*2.1)*3,color=st.phase===2?'#ff8bba':'#9ee9ff';
  c.save();const shade=c.createRadialGradient(b.x+4,b.y+2,1,b.x+4,b.y+2,43);shade.addColorStop(0,'#22203570');shade.addColorStop(1,'#22203500');ellipse(c,b.x+4,b.y+2,43,14,shade);ellipse(c,b.x,b.y+1,52,16,null,color+'88',1.2);
  c.save();c.translate(b.x,b.y);c.scale(1,.32);c.rotate(g.time*.35);for(let i=0;i<8;i++){const a=i*TAU/8;star(c,Math.cos(a)*52,Math.sin(a)*52,3,color+'b0');}c.restore();
  const commandAge=g.time-(st.commandAt??-100),fireAge=g.time-(st.commandFireAt??-100),pose=commandAge>=0&&commandAge<.75?Math.min(1,commandAge/.12,(.75-commandAge)/.2):fireAge>=0&&fireAge<.6?Math.min(1,fireAge/.08,(.6-fireAge)/.2):0;
  if(pose<1){c.globalAlpha=1-pose;c.drawImage(this.body,(f%2)*384,Math.floor(f/2)*384,384,384,b.x-94,b.y-188+bob,188,188);}if(pose>0){c.globalAlpha=pose;c.drawImage(this.command,(f%2)*384,Math.floor(f/2)*384,384,384,b.x-94,b.y-188+bob,188,188);}c.globalAlpha=1;
  if(pose>0){c.save();c.globalAlpha=pose;c.globalCompositeOperation='lighter';ellipse(c,b.x-35,b.y-117+bob,20,6,null,'#ffd4e9aa',1.5);for(let j=0;j<3;j++){const a=g.time*5+j*TAU/3;star(c,b.x-35+Math.cos(a)*20,b.y-117+bob+Math.sin(a)*6,3,'#fff0f8');}c.restore();}
  for(let i=0;i<4;i++){const a=g.time*.7+i*1.9;star(c,b.x+Math.cos(a)*36,b.y-75+Math.sin(a*.8)*65,1.5+Math.sin(a)*.6,color+'a0');}c.restore();
  const age=g.time-st.phaseAt;if(age>=0&&age<g.trialConfig.phaseWarning){c.save();c.translate(b.x,b.y-65);c.globalCompositeOperation='lighter';c.globalAlpha=1-age/g.trialConfig.phaseWarning;for(let i=0;i<3;i++)ellipse(c,0,0,55+age*90+i*14,55+age*90+i*14,null,i?'#ed407c':'#ffe3ee',i?1:3);for(let i=0;i<12;i++){const a=i*TAU/12;star(c,Math.cos(a)*(55+age*90),Math.sin(a)*(55+age*90),5,'#ffcbdc');}c.restore();}
 }
 shield(c,s,b,g){
  const q=this.shieldGeometry(b,s,g),age=g.time-s.blockAt,hit=age>=0&&age<.5;
  c.save();c.translate(q.x,q.y);c.shadowColor='#4c9cff';c.shadowBlur=15;
  const glass=c.createLinearGradient(-q.rx,-q.ry,q.rx,q.ry);glass.addColorStop(0,'#d8fbff2b');glass.addColorStop(.2,'#68c9ff45');glass.addColorStop(.48,'#477de51f');glass.addColorStop(.7,'#6bbfff37');glass.addColorStop(1,'#b8efff59');
  ellipse(c,0,0,q.rx,q.ry,glass,'#9ae8ffc0',1.7);c.shadowBlur=0;c.save();c.beginPath();c.ellipse(0,0,q.rx-2,q.ry-2,0,0,TAU);c.clip();
  c.strokeStyle='#a2dfff35';c.lineWidth=.9;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*q.rx*.65,-q.ry);c.lineTo((i-1)*q.rx*.65,q.ry);c.stroke();}
  const scan=(g.time*.28+s.id*.21)%1,y=-q.ry+scan*q.ry*2,shine=c.createLinearGradient(0,y-32,0,y+32);shine.addColorStop(0,'#dfffff00');shine.addColorStop(.5,'#dfffff25');shine.addColorStop(1,'#dfffff00');c.fillStyle=shine;c.fillRect(-q.rx,y-32,q.rx*2,64);
  if(hit){c.globalAlpha=1-age/.5;ellipse(c,0,0,q.rx*age*5,q.ry*age*5,null,'#ecffff',2);ellipse(c,0,0,q.rx,q.ry,'#cbf8ff30');}c.restore();ellipse(c,0,0,q.rx*.89,q.ry*.94,null,'#8fd8ff55');
  for(const side of [-1,1]){c.save();c.scale(side,1);c.strokeStyle='#c6f6ffd0';c.lineWidth=2;for(const a of [-1.25,.45]){c.beginPath();c.ellipse(0,0,q.rx+2,q.ry+2,0,a,a+.8);c.stroke();}c.restore();}
  star(c,0,-q.ry,5,'#deffff');star(c,0,q.ry,4,'#9be9ff');c.strokeStyle='#c5f4ffb0';c.lineWidth=1.2;c.beginPath();c.moveTo(0,-20);c.lineTo(10,0);c.lineTo(0,20);c.lineTo(-10,0);c.closePath();c.stroke();
  for(let i=0;i<3;i++){const t=(g.time*.2+i/3+s.id*.1)%1;star(c,Math.sin(t*12+s.id)*q.rx*.8,q.ry*(1-2*t),2,'#b6edffa0');}c.restore();
 }
 flightRibbon(c,s,a,g){
  const angle=Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x),tx=Math.cos(angle),ty=Math.sin(angle),y=s.y-(s.z||0)-30,length=a.pattern==='spin'?130:200,px=-ty,py=tx;
  c.save();c.globalCompositeOperation='lighter';const tail=c.createLinearGradient(s.x-tx*length,y-ty*length,s.x,y);tail.addColorStop(0,'#f9357000');tail.addColorStop(.7,'#ff397b45');tail.addColorStop(1,'#ffe5f3c0');c.fillStyle=tail;
  c.beginPath();c.moveTo(s.x+px*7,y+py*7);c.quadraticCurveTo(s.x-tx*length*.4+px*15,y-ty*length*.4+py*15,s.x-tx*length,y-ty*length);c.quadraticCurveTo(s.x-tx*length*.4-px*15,y-ty*length*.4-py*15,s.x-px*7,y-py*7);c.closePath();c.fill();
  c.strokeStyle=tail;c.lineWidth=2;c.beginPath();c.moveTo(s.x-tx*length*.9,y-ty*length*.9);c.lineTo(s.x,y);c.stroke();
  if(a.pattern==='spin'){c.translate(s.x,y);c.rotate(s.angle);ellipse(c,0,0,65,65,null,'#f94b8d35',5);for(let j=0;j<2;j++){c.save();c.rotate(j*Math.PI);c.strokeStyle='#ffe9f5b0';c.lineWidth=2;c.beginPath();c.arc(0,0,58,-2.6,-.7);c.stroke();star(c,Math.cos(-.7)*58,Math.sin(-.7)*58,4,'#fff0fc');c.restore();}const grad=c.createLinearGradient(-68,0,68,0);grad.addColorStop(0,'#fa367900');grad.addColorStop(.6,'#fc629d80');grad.addColorStop(1,'#ffe8f8f0');c.fillStyle=grad;c.beginPath();c.arc(0,0,62,-2.8,.15);c.arc(0,0,40,.15,-2.8,true);c.closePath();c.fill();c.strokeStyle='#ffe3f3aa';c.lineWidth=1.5;c.beginPath();c.arc(0,0,60,-1.8,.15);c.stroke();}c.restore();
 }
 bladePose(s,b,g){
  const a=s.action,drop=!!a&&['drop','rear'].includes(a.pattern),active=a?.stage==='active',len=drop?136:a?.pattern==='spin'?122:112;
  const returning=a?.stage==='return',progress=returning?clamp((g.time-a.started)/a.duration,0,1):0,turn=drop&&returning?clamp((progress-.35)/.65,0,1):0;
  const fall=active?clamp((g.time-a.fireAt)/a.duration,0,1):0,embed=drop?(a.stage==='hold'?12:active?12*fall**3:returning?12*(1-clamp(progress/.35,0,1)):0):0;
  const guard=s.mode==='defend'?this.shieldGeometry(b,s,g):null;
  // Sprite asset points UP. A PI rotation makes the real metal tip point DOWN.
  const rotation=guard?0:drop&&!returning?Math.PI:s.angle+Math.PI/2;
  const x=guard?guard.x:s.x,y=guard?guard.y:s.y-(s.z||0)-(drop?(len/2*(1-turn)+30*turn):30)+embed;
  return{x,y,rotation,len,drop,active,guard,tip:{x:x+Math.sin(rotation)*len/2,y:y-Math.cos(rotation)*len/2},hilt:{x:x-Math.sin(rotation)*len/2,y:y+Math.cos(rotation)*len/2}};
 }
 bladePart(c,s,b,g){
  const a=s.action,q=this.bladePose(s,b,g),{x,y,len,rotation,drop,active,guard}=q,w=len*this.blade.naturalWidth/this.blade.naturalHeight,color=guard?'#64bfff':'#ff427e';
  if(active&&!drop)this.flightRibbon(c,s,a,g);
  if(!guard){c.save();c.globalAlpha=.23;ellipse(c,s.x+5,s.y+3,drop?17:28,7,'#262537');c.restore();}
  if(a?.stage==='warn'&&s.mode==='attack'){
   c.save();c.globalCompositeOperation='lighter';
   if(drop){const ray=c.createLinearGradient(x,a.end.y-300,x,a.end.y);ray.addColorStop(0,'#ff486200');ray.addColorStop(1,'#ff52734a');c.fillStyle=ray;c.fillRect(x-1.5,a.end.y-300,3,300);}
   c.translate(x,y);c.rotate(drop?0:rotation);const pulse=1+.08*Math.sin(g.time*12);
   for(let j=0;j<2;j++){c.save();c.translate(0,(j-.5)*len*.55);c.rotate(Math.sin(g.time*7+j)*.22);ellipse(c,0,0,27*pulse,7,null,j?'#ff678b99':'#ffbfcebb',1.7);c.restore();}
   for(let j=0;j<3;j++){const angle=g.time*12+j*TAU/3;star(c,Math.cos(angle)*28,Math.sin(angle)*8,2.5,'#ffe0ef');}c.restore();
  }
  c.save();c.translate(x,y);c.rotate(rotation);c.shadowColor=color;c.shadowBlur=active?25:13;
  // Exactly one sprite per persistent blade; glow/trails are procedural shapes.
  c.drawImage(this.blade,-w/2,-len/2,w,len);c.shadowBlur=0;c.globalCompositeOperation='lighter';c.strokeStyle=guard?'#b9f2ff80':'#ffc4e0b0';c.lineWidth=1.3;c.beginPath();c.moveTo(0,-len*.47);c.lineTo(0,len*.14);c.stroke();star(c,0,len*.2,active?5:3,color);c.restore();
  if(drop&&active){
   c.save();c.globalCompositeOperation='lighter';const q=c.createLinearGradient(x,y-240,x,y+len/2);q.addColorStop(0,'#ff437000');q.addColorStop(.75,'#ff356a99');q.addColorStop(1,'#fff1e8dd');c.fillStyle=q;c.beginPath();c.moveTo(x-12,y+len*.4);c.lineTo(x-3,y-240);c.lineTo(x+12,y+len*.4);c.closePath();c.fill();
   for(let j=-2;j<=2;j++){c.strokeStyle=j%2?'#fff1eaad':'#ff477c80';c.lineWidth=j?1:2;c.beginPath();c.moveTo(x+j*5,y-190-Math.abs(j)*12);c.lineTo(x+j*5,y+len*.4);c.stroke();}c.restore();
  }
 }
 impact(c,a,g){
  const age=g.time-a.impactAt;if(!Number.isFinite(age)||age<0||age>.9)return;const t=age/.9,r=a.radius;
  c.save();c.translate(a.end.x,a.end.y);c.globalAlpha=1-t;
  if(['drop','rear'].includes(a.pattern)){
   const glow=c.createRadialGradient(0,0,2,0,0,r*(1+t));glow.addColorStop(0,'#fff1dfe0');glow.addColorStop(.22,'#ff8a859e');glow.addColorStop(.6,'#ff38654f');glow.addColorStop(1,'#f7436d00');ellipse(c,0,0,r*(1+t),r*(1+t)*.58,glow);
   ellipse(c,0,0,r*(.4+t),r*(.4+t)*.55,null,'#ffd6c5',3*(1-t));
   c.strokeStyle='#5d384a';c.lineWidth=1.8;
   for(let i=0;i<7;i++){const angle=i*2.4,d=r*(.45+(i%3)*.22);c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(angle)*d*.4,Math.sin(angle)*d*.25);c.lineTo(Math.cos(angle+.13)*d,Math.sin(angle+.13)*d*.6);c.stroke();}
   for(let i=0;i<14;i++){const angle=i*2.4,d=(12+t*70)*(1+i%3*.16),xx=Math.cos(angle)*d,yy=Math.sin(angle)*d*.55-Math.sin(t*Math.PI)*24;
    c.save();c.translate(xx,yy);c.rotate(angle+t*4);c.fillStyle=i%3?'#86605a':'#ffd3c4';c.beginPath();c.moveTo(-3,-2);c.lineTo(4,-3);c.lineTo(2,3);c.closePath();c.fill();c.restore();}
   if(age<.18){c.globalCompositeOperation='lighter';c.globalAlpha=1-age/.18;star(c,0,-10,34,'#fff5da');c.fillStyle='#ffb4ab77';c.beginPath();c.moveTo(-6,0);c.lineTo(0,-180);c.lineTo(6,0);c.closePath();c.fill();}
  }else ellipse(c,0,-25,35+t*50,35+t*50,null,'#ffb3ce',2);c.restore();
 }
 warningCircle(c,a,g){
  const locked=g.time>=a.lockedAt,remaining=Math.max(0,a.fireAt-g.time),total=a.fireAt-(a.cueAt??a.started),progress=clamp(1-remaining/total,0,1),r=a.radius;c.save();c.translate(a.end.x,a.end.y);
  const fill=c.createRadialGradient(0,0,r*.1,0,0,r);fill.addColorStop(0,'#ff899a07');fill.addColorStop(.8,'#de314522');fill.addColorStop(1,'#ff385b55');ellipse(c,0,0,r,r,fill,locked?'#ff8c9c':'#ffd0a2',1.7);
  c.strokeStyle='#ffdcbd';c.lineWidth=3;c.beginPath();c.arc(0,0,r-5,-Math.PI/2,-Math.PI/2+TAU*progress);c.stroke();for(let i=0;i<4;i++){c.save();c.rotate(i*TAU/4+g.time*.18);c.strokeStyle='#ffc6b8b0';c.lineWidth=1.3;c.beginPath();c.moveTo(r+9,-7);c.lineTo(r+2,0);c.lineTo(r+9,7);c.stroke();c.restore();}star(c,0,0,11,'#ffd4d0b0');c.restore();
  c.save();c.font='600 12px system-ui';c.textAlign='center';const label=(locked?'확정 ':'조준 ')+remaining.toFixed(1)+'s',w=c.measureText(label).width+16;c.fillStyle='#2b1827dc';c.beginPath();c.roundRect(a.end.x-w/2,a.end.y+a.radius+10,w,23,5);c.fill();c.fillStyle='#ffded1';c.fillText(label,a.end.x,a.end.y+a.radius+26);c.restore();
 }
 warningLane(c,a,g){
  const locked=g.time>=a.lockedAt,dir=Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x),length=Math.hypot(a.end.x-a.start.x,a.end.y-a.start.y);c.save();capsule(c,a);
  const gradient=c.createLinearGradient(a.start.x,a.start.y,a.end.x,a.end.y);gradient.addColorStop(0,'#fa456a3b');gradient.addColorStop(.5,'#e22e4c18');gradient.addColorStop(1,'#f54b642d');c.fillStyle=gradient;c.fill();c.strokeStyle=locked?'#ff869a':'#e4ac96';c.lineWidth=1.6;c.setLineDash(locked?[]:[7,7]);c.stroke();c.setLineDash([]);
  c.save();capsule(c,a);c.clip();c.translate(a.start.x,a.start.y);c.rotate(dir);c.strokeStyle='#ffafba37';c.lineWidth=1;for(let x=-80+(g.time*25)%40;x<length+80;x+=40){c.beginPath();c.moveTo(x,-a.radius);c.lineTo(x-50,a.radius);c.stroke();}c.strokeStyle='#ffcfcc9a';c.lineWidth=2;for(let x=(g.time*65)%110;x<length;x+=110){c.beginPath();c.moveTo(x-7,-6);c.lineTo(x,0);c.lineTo(x-7,6);c.stroke();}c.restore();
  const v=g.trialViewport||{left:0,right:g.bounds().width,top:0,bottom:g.bounds().height},gate={x:clamp(a.start.x,v.left+30,v.right-30),y:clamp(a.start.y,v.top+30,v.bottom-30)};
  c.translate(gate.x,gate.y);c.rotate(dir);c.shadowColor='#ff5b89';c.shadowBlur=12;c.strokeStyle='#ff94b0';c.lineWidth=3;c.beginPath();c.ellipse(0,0,10,a.radius*.82,0,0,TAU);c.stroke();c.shadowBlur=0;for(const side of [-1,1]){c.beginPath();c.moveTo(-9,side*a.radius);c.lineTo(10,side*(a.radius-8));c.lineTo(-2,side*(a.radius-17));c.stroke();}c.restore();
 }
 warnings(c,g){
  const b=g.trialBoss;if(!b||b.hp<=0)return;const st=b.swords;
  for(const s of st.blades){const a=s.action;if(!a)continue;if(Number.isFinite(a.impactAt))this.impact(c,a,g);if(!['warn','active'].includes(a.stage)||a.stage==='active'&&['drop','rear'].includes(a.pattern))continue;c.save();if(a.stage==='active')c.globalAlpha=.4;if(['drop','rear'].includes(a.pattern))this.warningCircle(c,a,g);else this.warningLane(c,a,g);c.restore();}
  if(st.pending){c.save();st.blades.forEach((s,i)=>{const p=SB.idlePoint(b,s),blue=st.pending.modes[i]==='defend';ellipse(c,p.x,p.y-35,24,35,null,blue?'#9fe7ff':'#ff91b8',2);star(c,p.x,p.y-75,5,blue?'#d2f7ff':'#ffd2e4');});c.font='600 13px system-ui';c.textAlign='center';c.fillStyle='#eed6ff';c.fillText('공수 전환 '+Math.max(0,st.pending.commitAt-g.time).toFixed(1)+'s',b.x,b.y+130);c.restore();}
 }
 scene(c,g){if(g.trialScene?.portal)root.FrontPortal.ground(c,g.bases[1],g.time);
 }
}
root.FrontSwordBossView=View;
})(window);
