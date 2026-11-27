/* The campaign and trial share the same miniature, weapon geometry and floor cues. */
(function(root){'use strict';const SB=root.FrontSwordBoss,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
function ellipse(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function star(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.14,y-r*.14,x+r*.7,y);c.quadraticCurveTo(x+r*.14,y+r*.14,x,y+r);c.quadraticCurveTo(x-r*.14,y+r*.14,x-r*.7,y);c.quadraticCurveTo(x-r*.14,y-r*.14,x,y-r);c.fill();}
function capsule(c,a){const d=Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x),px=-Math.sin(d)*a.radius,py=Math.cos(d)*a.radius;c.beginPath();c.moveTo(a.start.x+px,a.start.y+py);c.lineTo(a.end.x+px,a.end.y+py);c.arc(a.end.x,a.end.y,a.radius,d+Math.PI/2,d-Math.PI/2,true);c.lineTo(a.start.x-px,a.start.y-py);c.arc(a.start.x,a.start.y,a.radius,d-Math.PI/2,d+Math.PI/2,true);c.closePath();}
// Four columns keep the same sword identity through every stance. Rows contain
// attack/guard faces, the recessed metal edge, the two inlays, and polished steel.
const bladeWidth=224,bladeHeight=440;
function drawSword(c,atlas,id,len,rotation,roll,pitch,guard,charge,time){
 const yaw=clamp(roll,-1.1,1.1),cb=Math.cos(yaw),sb=Math.sin(yaw),ct=Math.cos(pitch),st=Math.sin(pitch);
 const half=bladeWidth/2,top=-bladeHeight/2,sourceX=id*bladeWidth;
 c.save();c.rotate(rotation);c.scale(len/(bladeHeight-8),len/(bladeHeight-8));
 function layer(row,left,width,heightFromPlane,slope=0){
  // Project a face whose height varies across its width. The two bevels meet at the raised spine.
  c.save();
  c.transform(cb+slope*sb,(sb-slope*cb)*st,0,ct,heightFromPlane*sb,-heightFromPlane*cb*st);
  c.drawImage(atlas,sourceX+half+left,row*bladeHeight,width,bladeHeight,left,top,width,bladeHeight);
  c.restore();
 }
 for(let depth=-7;depth<=1;depth+=2)layer(2,-half,bladeWidth,depth);
 for(const left of [-half,0]){
  const slope=left<0?.075:-.075;
  layer(guard?1:0,left,half,9,slope);
  c.save();c.globalCompositeOperation='lighter';
  c.globalAlpha=guard?.29+.20*charge:.19+.65*charge;
  layer(guard?4:3,left,half,9,slope);
  c.restore();
 }
 // A narrow reflection sweeps across the metal facets; open slots stay transparent.
 const sweep=((time*.38+id*.23)%1)*1.5-.25;
 if(sweep>0&&sweep<1){
  const y=top+bladeHeight*sweep*ct;
  c.save();c.beginPath();c.moveTo(-half,y+18);c.lineTo(half,y-29);c.lineTo(half,y-18);c.lineTo(-half,y+29);c.closePath();c.clip();
  c.globalCompositeOperation='lighter';c.globalAlpha=.42*Math.sin(Math.PI*sweep);
  layer(5,-half,half,9,.075);layer(5,0,half,9,-.075);c.restore();
 }
 c.restore();
}
function groundShadow(c,x,y,rx,ry,rotation,opacity){
 c.save();c.translate(x,y);c.rotate(rotation);c.scale(rx,ry);
 const ink=c.createRadialGradient(0,0,0,0,0,1);
 ink.addColorStop(0,'rgba(35,17,29,'+opacity+')');ink.addColorStop(.46,'rgba(43,22,37,'+opacity*.65+')');ink.addColorStop(1,'rgba(43,22,37,0)');
 ellipse(c,0,0,1,1,ink);c.restore();
}
class View{
 constructor(){
  this.body=new Image();this.blades=new Image();
  const load=(image,file)=>new Promise((resolve,reject)=>{
   image.onload=resolve;image.onerror=reject;image.src='assets/sword-boss/'+file;
  });
  this.ready=Promise.all([load(this.body,'empress-figurine.webp'),load(this.blades,'empress-royal-blades.webp?v=long-blades1')]);
 }
 healthBar(c,b,x,y,width){
  if(!b||b.hp<=0||!Number.isFinite(b.maxHp)||b.maxHp<=0)return;
  const bar=root.FrontBubbleOctopusView.healthBarLayout(b.hp,b.maxHp,b.bubbleShield?.hp),phase=b.swords?.phase===2;
  const track=width*bar.track,left=x-track/2;
  c.save();c.fillStyle='#211725ed';c.fillRect(left-4,y-20,track+8,43);c.fillStyle='#493247';c.fillRect(left,y+4,track,14);
  c.fillStyle=root.FrontBubbleOctopusView.healthPaint(c,bar,left,width,phase?'#f06ca5':'#b480eb');c.fillRect(left,y+4,width*bar.filled,14);
  c.textAlign='center';c.textBaseline='middle';c.font='700 12px system-ui';c.fillStyle='#fff2fa';c.fillText('사검의 군주'+(phase?' · 각성':''),x,y-9);c.font='700 10px system-ui';c.strokeStyle='#29182c';c.lineWidth=3;const label=Math.ceil(b.hp).toLocaleString()+' / '+Math.ceil(b.maxHp).toLocaleString();c.strokeText(label,x,y+11);c.fillText(label,x,y+11);c.restore();
 }
 health(c,g){const b=g.trialBoss;if(!b||b.hp<=0||g.visible&&!g.visible(b))return;this.healthBar(c,b,b.x,b.y-221,220);}
 hud(c,g,width){const b=g.trialBoss;if(!b?.finalBoss||b.hp<=0)return;this.healthBar(c,b,width/2,80,Math.max(1,Math.min(300,(width-36)/root.FrontBubbleOctopusView.maxHealthBarTrack)));}
 shieldGeometry(b,s,g){const half=g.trialConfig.shieldHalfAngle,front=Math.sin(s.dir),rx=Math.max(18,Math.tan(Math.min(1.25,half))*(Math.abs(front)>.5?48:27));return{x:b.x+Math.cos(s.dir)*98,y:b.y+front*45-68,rx,ry:Math.abs(front)>.5?83:71,front:front>.5,half};}
 parts(g){const b=g.trialBoss;if(!b||b.hp<=0)return[];const out=[{kind:'body',depth:b.y,b}];for(const s of b.swords.blades){if(s.mode==='defend')out.push({kind:'shield',depth:b.y+Math.sin(s.dir)*60-1,s,b});out.push({kind:'blade',depth:s.y,s,b});}return out;}
 drawPart(c,p,g){if(p.kind==='body')this.bodyPart(c,p.b,g);else if(p.kind==='blade')this.bladePart(c,p.s,p.b,g);else this.shield(c,p.s,p.b,g);}
 bodyPart(c,b,g){
  const st=b.swords,rear=g.commander(0).y<b.y-40,f=(rear?2:0)+(st.phase===2?1:0),bob=Math.sin(g.time*2.1)*3,color=st.phase===2?'#ff8bba':'#9ee9ff';
  c.save();ellipse(c,b.x,b.y+1,52,16,null,color+'88',1.2);
  c.save();c.translate(b.x,b.y);c.scale(1,.32);c.rotate(g.time*.35);for(let i=0;i<8;i++){const a=i*TAU/8;star(c,Math.cos(a)*52,Math.sin(a)*52,3,color+'b0');}c.restore();
  const commandAge=g.time-(st.commandAt??-100),fireAge=g.time-(st.commandFireAt??-100),pose=commandAge>=0&&commandAge<.75?Math.min(1,commandAge/.12,(.75-commandAge)/.2):fireAge>=0&&fireAge<.6?Math.min(1,fireAge/.08,(.6-fireAge)/.2):0;
  const facing=g.commander(0).x>b.x+12?-1:1,cast=pose>.28;
  c.save();c.translate(b.x,b.y-10+bob-3*pose);c.scale(facing,1);
  c.rotate(.014*Math.sin(g.time*2.1)-.036*pose);
  c.drawImage(this.body,((f%2)+(cast?2:0))*384,Math.floor(f/2)*384,384,384,-94,-184,188,188);c.restore();
  if(cast){c.save();c.translate(b.x-facing*57,b.y-129+bob-3*pose);c.globalAlpha=pose;c.globalCompositeOperation='lighter';ellipse(c,0,0,16,5,null,'#ffd4e9aa',1.5);for(let j=0;j<3;j++){const a=g.time*5+j*TAU/3;star(c,Math.cos(a)*16,Math.sin(a)*5,3,'#fff0f8');}c.restore();}
  for(let i=0;i<4;i++){const a=g.time*.7+i*1.9;star(c,b.x+Math.cos(a)*36,b.y-75+Math.sin(a*.8)*65,1.5+Math.sin(a)*.6,color+'a0');}c.restore();
  const age=g.time-st.phaseAt;if(age>=0&&age<g.trialConfig.phaseWarning){c.save();c.translate(b.x,b.y-65);c.globalCompositeOperation='lighter';c.globalAlpha=1-age/g.trialConfig.phaseWarning;for(let i=0;i<3;i++)ellipse(c,0,0,55+age*90+i*14,55+age*90+i*14,null,i?'#ed407c':'#ffe3ee',i?1:3);for(let i=0;i<12;i++){const a=i*TAU/12;star(c,Math.cos(a)*(55+age*90),Math.sin(a)*(55+age*90),5,'#ffcbdc');}c.restore();}
 }
 shield(c,s,b,g){
  const q=this.shieldGeometry(b,s,g),age=g.time-s.blockAt,hit=age>=0&&age<.5;
  c.save();c.translate(q.x,q.y);
  const offset=Math.cos(s.dir)*5+2,bevel=c.createLinearGradient(-q.rx,0,q.rx,0);
  bevel.addColorStop(0,'#c4f8f7b0');bevel.addColorStop(.24,'#20577ea6');bevel.addColorStop(.8,'#16345ba6');bevel.addColorStop(1,'#80c9e5a8');
  c.beginPath();c.ellipse(offset,3,q.rx,q.ry,0,0,TAU);c.ellipse(0,0,q.rx,q.ry,0,0,TAU);c.fillStyle=bevel;c.fill('evenodd');
  c.shadowColor='#4c9cff';c.shadowBlur=8;
  const glass=c.createLinearGradient(-q.rx,-q.ry,q.rx,q.ry);glass.addColorStop(0,'#d8fbff2b');glass.addColorStop(.2,'#68c9ff45');glass.addColorStop(.48,'#477de51f');glass.addColorStop(.7,'#6bbfff37');glass.addColorStop(1,'#b8efff59');
  ellipse(c,0,0,q.rx,q.ry,glass,'#9ae8ffc0',1.7);c.shadowBlur=0;c.save();c.beginPath();c.ellipse(0,0,q.rx-2,q.ry-2,0,0,TAU);c.clip();
  c.strokeStyle='#a2dfff48';c.lineWidth=.9;for(const fraction of [-.63,0,.63]){c.beginPath();c.moveTo(0,-q.ry);c.bezierCurveTo(q.rx*fraction*1.55,-q.ry*.55,q.rx*fraction*1.55,q.ry*.55,0,q.ry);c.stroke();}
  const scan=(g.time*.28+s.id*.21)%1,y=-q.ry+scan*q.ry*2,shine=c.createLinearGradient(0,y-32,0,y+32);shine.addColorStop(0,'#dfffff00');shine.addColorStop(.5,'#dfffff25');shine.addColorStop(1,'#dfffff00');c.fillStyle=shine;c.fillRect(-q.rx,y-32,q.rx*2,64);
  if(hit){c.globalAlpha=1-age/.5;ellipse(c,0,0,q.rx*age*5,q.ry*age*5,null,'#ecffff',2);ellipse(c,0,0,q.rx,q.ry,'#cbf8ff30');}c.restore();ellipse(c,0,0,q.rx*.89,q.ry*.94,null,'#8fd8ff55');
  for(const side of [-1,1]){c.save();c.scale(side,1);c.strokeStyle='#c6f6ffd0';c.lineWidth=2;for(const a of [-1.25,.45]){c.beginPath();c.ellipse(0,0,q.rx+2,q.ry+2,0,a,a+.8);c.stroke();}c.restore();}
  star(c,0,-q.ry,5,'#deffff');star(c,0,q.ry,4,'#9be9ff');c.strokeStyle='#c5f4ffb0';c.lineWidth=1.2;c.beginPath();c.moveTo(0,-20);c.lineTo(10,0);c.lineTo(0,20);c.lineTo(-10,0);c.closePath();c.stroke();
  for(let i=0;i<3;i++){const t=(g.time*.2+i/3+s.id*.1)%1;star(c,Math.sin(t*12+s.id)*q.rx*.8,q.ry*(1-2*t),2,'#b6edffa0');}c.restore();
 }
 flightRibbon(c,s,a,g){
  const angle=Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x),spin=a.pattern==='spin';
  const travel=Math.hypot(s.x-a.start.x,s.y-a.start.y);
  const length=Math.min(spin?110:175,travel+8);
  c.save();c.translate(s.x,s.y-(s.z||0)-30);c.save();c.rotate(angle);
  const tail=c.createLinearGradient(-length,0,4,0);
  const recall=a.pattern==='recall';
  tail.addColorStop(0,recall?'#91611600':'#9b244500');tail.addColorStop(.50,recall?'#e98b2658':'#bf275958');tail.addColorStop(.85,recall?'#ffcf7ecd':'#ff789bcd');tail.addColorStop(1,'#fff1dbc4');
  c.fillStyle=tail;c.beginPath();c.moveTo(-length,0);
  c.quadraticCurveTo(-length*.42,-4,-9,-9);c.lineTo(8,0);c.lineTo(-9,8);c.closePath();c.fill();
  if(!spin){
   for(const side of [-1,1]){
    c.beginPath();
    for(let j=0;j<=14;j++){
     const u=j/14,x=-length*(1-u),coil=u*5+g.time*24,off=side*(3+6*u)*Math.sin(coil);
     if(j)c.lineTo(x,off);else c.moveTo(x,off);
    }
    c.strokeStyle=tail;c.lineWidth=1.5;c.stroke();
   }
   // A tilted pressure cone wraps around the moving metal.
   c.beginPath();c.ellipse(-18,0,6,15,.10,Math.PI*.35,Math.PI*1.78);c.strokeStyle='#ffd4c79c';c.lineWidth=1.7;c.stroke();
  }
  c.restore();
  if(spin){
   c.scale(1,.65);
   for(const offset of [0,Math.PI]){
    const head=s.angle+offset;
    for(let j=0;j<10;j++){
     const end=head-j*.19,start=end-.20,fade=(1-j/10)**2,outer=61,inner=outer-4-10*fade;
     c.beginPath();c.arc(0,0,outer,start,end);c.arc(0,0,inner,end,start,true);c.closePath();
     c.fillStyle='rgba(232,73,122,'+(.035+.52*fade)+')';c.fill();
     c.strokeStyle='rgba(255,216,193,'+(.06+.86*fade)+')';c.lineWidth=2;
     c.beginPath();c.arc(0,0,outer,start,end);c.stroke();
    }
   }
  }
  c.restore();
 }
 bladePose(s,b,g){
  const a=s.action,drop=!!a&&(['drop','rear'].includes(a.pattern)||a.stage==='recallWarn'),active=a?.stage==='active'||a?.stage==='recallActive',len=(drop?136:a?.pattern==='spin'?122:112)*(bladeHeight-8)/376;
  const returning=a?.stage==='return',progress=returning?clamp((g.time-a.started)/a.duration,0,1):0,turn=drop&&returning?clamp((progress-.35)/.65,0,1):0;
  const fall=active?clamp((g.time-a.fireAt)/a.duration,0,1):0,embed=drop?(a.stage==='hold'||a.stage==='recallWarn'?12:active?12*fall**3:returning?12*(1-clamp(progress/.35,0,1)):0):0;
  const guard=s.mode==='defend'?this.shieldGeometry(b,s,g):null;
  // The local blade tip points up. A half turn makes the falling tip meet the floor.
  const rotation=guard?0:drop&&!returning?Math.PI:s.angle+Math.PI/2;
  const x=guard?guard.x:s.x,y=guard?guard.y:s.y-(s.z||0)-(drop?(len/2*(1-turn)+30*turn):30)+embed;
  return{x,y,rotation,len,drop,active,guard,tip:{x:x+Math.sin(rotation)*len/2,y:y-Math.cos(rotation)*len/2},hilt:{x:x-Math.sin(rotation)*len/2,y:y+Math.cos(rotation)*len/2}};
 }
 bladePart(c,s,b,g){
  const a=s.action,q=this.bladePose(s,b,g),{x,y,len,rotation,drop,active,guard}=q;
  if(active&&!drop)this.flightRibbon(c,s,a.stage==='recallActive'?a.recall:a,g);
  if(a?.stage==='warn'&&s.mode==='attack'){
   c.save();c.globalCompositeOperation='lighter';
   if(drop){const ray=c.createLinearGradient(x,a.end.y-300,x,a.end.y);ray.addColorStop(0,'#ff486200');ray.addColorStop(1,'#ff52734a');c.fillStyle=ray;c.fillRect(x-1.5,a.end.y-300,3,300);}
   c.translate(x,y);c.rotate(drop?0:rotation);const pulse=1+.08*Math.sin(g.time*12);
   for(let j=0;j<2;j++){c.save();c.translate(0,(j-.5)*len*.55);c.rotate(Math.sin(g.time*7+j)*.22);ellipse(c,0,0,27*pulse,7,null,j?'#ff678b99':'#ffbfcebb',1.7);c.restore();}
   for(let j=0;j<3;j++){const angle=g.time*12+j*TAU/3;star(c,Math.cos(angle)*28,Math.sin(angle)*8,2.5,'#ffe0ef');}c.restore();
  }
  const spin=active&&a.pattern==='spin';
  const tilt=spin?Math.asin(.76*Math.sin(s.angle)):drop?0:guard?-.12:.34*Math.sin(s.angle);
  const aim=spin?Math.atan2(.65*Math.sin(s.angle),Math.cos(s.angle))+Math.PI/2:rotation;
  const roll=guard ? .5*Math.sin(g.time*1.6+s.id) : drop ? .25+(s.z||0)*.006 : .64*Math.sin(g.time*2.6+s.id)+(active?1.05:0);
  if(drop&&active){
   c.save();c.globalCompositeOperation='lighter';const q=c.createLinearGradient(x,y-240,x,y+len/2);q.addColorStop(0,'#ff437000');q.addColorStop(.75,'#ff356a99');q.addColorStop(1,'#fff1e8dd');c.fillStyle=q;c.beginPath();c.moveTo(x-12,y+len*.4);c.lineTo(x-3,y-240);c.lineTo(x+12,y+len*.4);c.closePath();c.fill();
   for(let j=-2;j<=2;j++){c.strokeStyle=j%2?'#fff1eaad':'#ff477c80';c.lineWidth=j?1:2;c.beginPath();c.moveTo(x+j*5,y-190-Math.abs(j)*12);c.lineTo(x+j*5,y+len*.4);c.stroke();}c.restore();
  }
  const charge=guard?clamp(1-(g.time-s.blockAt)/.35,0,1):a?.stage==='warn'?clamp(1-(a.fireAt-g.time)/.65,0,1):active?1:0;
  c.save();c.translate(x,y);drawSword(c,this.blades,s.id,len,aim,roll,tilt,guard,charge,g.time);c.restore();
 }
 impact(c,a,g){
  const age=g.time-a.impactAt;if(!Number.isFinite(age)||age<0||age>.9)return;const t=age/.9,r=a.radius;
  c.save();c.translate(a.end.x,a.end.y);c.globalAlpha=1-t;
  if(['drop','rear'].includes(a.pattern)){
   const glow=c.createRadialGradient(0,0,2,0,0,r*(1+t));glow.addColorStop(0,'#fff1dfe0');glow.addColorStop(.22,'#ff8a859e');glow.addColorStop(.6,'#ff38654f');glow.addColorStop(1,'#f7436d00');ellipse(c,0,0,r*(1+t),r*(1+t)*.58,glow);
   ellipse(c,0,0,r*(.4+t),r*(.4+t)*.55,null,'#ffd6c5',3*(1-t));
   c.strokeStyle='#5d384a';c.lineWidth=1.8;
   for(let i=0;i<7;i++){const angle=i*2.4,d=r*(.45+(i%3)*.22);c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(angle)*d*.4,Math.sin(angle)*d*.25);c.lineTo(Math.cos(angle+.13)*d,Math.sin(angle+.13)*d*.6);c.stroke();}
   for(let i=0;i<11;i++){
    const angle=i*2.4,d=r*(.15+t)*(1+i%3*.16),xx=Math.cos(angle)*d,groundY=Math.sin(angle)*d*.58;
    const height=4*t*(1-t)*(22+(i%4)*13);
    ellipse(c,xx+height*.18,groundY+height*.08,4,1.5,'#35233048');
    c.save();c.translate(xx,groundY-height);c.rotate(angle+t*(3+i%3));c.scale(1+.2*(i%3),1);
    c.fillStyle='#663e34';c.beginPath();c.moveTo(-6,0);c.lineTo(4,-3);c.lineTo(6,0);c.lineTo(-3,3);c.closePath();c.fill();
    c.fillStyle=i%3?'#c78e5a':'#ffce98';c.beginPath();c.moveTo(-6,0);c.lineTo(4,-3);c.lineTo(2,-1);c.lineTo(-3,2);c.closePath();c.fill();c.restore();
   }
   if(age<.18){c.globalCompositeOperation='lighter';c.globalAlpha=1-age/.18;star(c,0,-10,34,'#fff5da');c.fillStyle='#ffb4ab77';c.beginPath();c.moveTo(-6,0);c.lineTo(0,-180);c.lineTo(6,0);c.closePath();c.fill();}
  }else{
   const angle=Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x);
   c.translate(0,-28);c.rotate(angle);c.scale(.43,1);
   const radius=12+56*t;c.beginPath();c.arc(0,0,radius,-1.3,1.3);c.strokeStyle='#ffe2be';c.lineWidth=4*(1-t)+.5;c.stroke();
   for(let i=-2;i<=2;i++){const ray=i*.38;c.rotate(ray);c.fillStyle='#f390a5';c.beginPath();c.moveTo(radius+5,0);c.lineTo(radius+5+14*(1-t),-1);c.lineTo(radius+1,2);c.closePath();c.fill();c.rotate(-ray);}
  }c.restore();
 }
 warningCircle(c,a,g){
  const locked=g.time>=a.lockedAt,remaining=Math.max(0,a.fireAt-g.time),total=a.fireAt-(a.cueAt??a.started),progress=clamp(1-remaining/total,0,1),r=a.radius;c.save();c.translate(a.end.x,a.end.y);
  const fill=c.createRadialGradient(0,0,r*.1,0,0,r);fill.addColorStop(0,'#ff899a07');fill.addColorStop(.8,'#de314522');fill.addColorStop(1,'#ff385b55');ellipse(c,0,0,r,r,fill,locked?'#ff8c9c':'#ffd0a2',1.7);
  if(a.pattern==='rear'){
   c.strokeStyle='#ffa8dacc';c.lineWidth=2;
   for(let i=0;i<3;i++){const start=i*TAU/3-progress*.75;c.beginPath();c.arc(0,0,r*(.74-progress*.32),start,start+.9);c.stroke();}
  }
  c.strokeStyle='#ffdcbd';c.lineWidth=3;c.beginPath();c.arc(0,0,r-5,-Math.PI/2,-Math.PI/2+TAU*progress);c.stroke();for(let i=0;i<4;i++){c.save();c.rotate(i*TAU/4+g.time*.18);c.strokeStyle='#ffc6b8b0';c.lineWidth=1.3;c.beginPath();c.moveTo(r+9,-7);c.lineTo(r+2,0);c.lineTo(r+9,7);c.stroke();c.restore();}star(c,0,0,11,'#ffd4d0b0');c.restore();
  c.save();c.font='600 12px system-ui';c.textAlign='center';const label=(locked?'확정 ':'조준 ')+remaining.toFixed(1)+'s',w=c.measureText(label).width+16;c.fillStyle='#2b1827dc';c.beginPath();c.roundRect(a.end.x-w/2,a.end.y+a.radius+10,w,23,5);c.fill();c.fillStyle='#ffded1';c.fillText(label,a.end.x,a.end.y+a.radius+26);c.restore();
 }
 warningRecall(c,r,g){
  const {start,end,radius}=r,angle=Math.atan2(end.y-start.y,end.x-start.x),length=Math.hypot(end.x-start.x,end.y-start.y);
  const left=Math.max(0,r.fireAt-g.time);
  c.save();capsule(c,r);
  c.fillStyle=left<=.3?'#d6893255':'#a775212f';c.fill();
  c.strokeStyle=left<=.3?'#ffefd0':'#ffd07e';c.lineWidth=left<=.3?2.8:1.8;c.stroke();
  c.save();c.translate(start.x,start.y);c.rotate(angle);
  c.strokeStyle='#ffdb97';c.lineWidth=2;
  for(let x=24;x<length-10;x+=62){
   c.beginPath();c.moveTo(x-8,-6);c.lineTo(x,0);c.lineTo(x-8,6);c.stroke();
  }
  c.restore();
  ellipse(c,start.x,start.y,13,8,'#7a4a24','#ffcd79',2);
  const v=g.trialViewport||{left:0,top:0,right:g.bounds().width,bottom:g.bounds().height};
  const x=clamp(mix(start.x,end.x,.35),v.left+56,v.right-56),y=clamp(mix(start.y,end.y,.35)-radius-11,v.top+22,v.bottom-28);
  c.fillStyle='#44251be8';c.beginPath();c.roundRect(x-47,y-15,94,23,5);c.fill();
  c.font='700 12px system-ui';c.textAlign='center';c.fillStyle='#ffe9be';c.fillText('회수 · '+left.toFixed(1)+'초',x,y);
  c.restore();
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
  groundShadow(c,b.x+10,b.y+6,43,13,.06,.47);
  for(const s of st.blades){
   const z=s.z||0,high=clamp(z/260,0,1),standing=s.mode==='defend'||s.action?.stage==='recallWarn'||['drop','rear'].includes(s.action?.pattern);
   const angle=standing ? .13 : Math.atan2(.48*Math.sin(s.angle),Math.cos(s.angle));
   const plate=s.mode==='defend'?this.shieldGeometry(b,s,g):null;
   groundShadow(c,(plate?plate.x:s.x)+9+z*.16,(plate?plate.y+68:s.y)+5+z*.085,standing?15+high*10:54,standing?6+high*6:7,angle,.44-high*.26);
  }
  for(const s of st.blades){const a=s.action;if(!a)continue;if(Number.isFinite(a.impactAt))this.impact(c,a,g);if(a.stage==='recallWarn'){this.warningRecall(c,a.recall,g);continue;}if(!['warn','active'].includes(a.stage)||a.stage==='active'&&['drop','rear'].includes(a.pattern))continue;c.save();if(a.stage==='active')c.globalAlpha=.4;if(['drop','rear'].includes(a.pattern))this.warningCircle(c,a,g);else this.warningLane(c,a,g);c.restore();}
  if(st.pending){c.save();st.blades.forEach((s,i)=>{const p=SB.idlePoint(b,s),blue=st.pending.modes[i]==='defend';ellipse(c,p.x,p.y-35,24,35,null,blue?'#9fe7ff':'#ff91b8',2);star(c,p.x,p.y-75,5,blue?'#d2f7ff':'#ffd2e4');});c.font='600 13px system-ui';c.textAlign='center';c.fillStyle='#eed6ff';c.fillText('공수 전환 '+Math.max(0,st.pending.commitAt-g.time).toFixed(1)+'s',b.x,b.y+130);c.restore();}
 }
 scene(c,g){if(g.trialScene?.portal)root.FrontPortal.ground(c,g.bases[1],g.time);
 }
}
root.FrontSwordBossView=View;
})(window);
