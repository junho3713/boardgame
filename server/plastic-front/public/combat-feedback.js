/* Readable toy combat accents. No simulation writes, timers, hit-stop or extra particles. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const sheets={hit:{file:'assets/effects/pixelfx/hit-spark-v20261114.png',w:136,h:80,frames:16,columns:4,rows:4,pivot:[44,44]},heavy:{file:'assets/effects/pixelfx/heavy-impact-v20261114.png',w:216,h:136,frames:28,columns:5,rows:6,pivot:[84,86]}};
const images=new Map();
function asset(spec){
 if(images.has(spec.file))return images.get(spec.file);const ImageType=root.Image;if(!ImageType)return null;
 const image=new ImageType(),entry={image,ready:false};images.set(spec.file,entry);
 image.onload=()=>{entry.ready=image.naturalWidth===spec.w*spec.columns&&image.naturalHeight===spec.h*spec.rows;};image.onerror=()=>{entry.ready=false;};image.src=spec.file;return entry;
}
function stamp(c,kind,x,y,q,scale,angle=0,alpha=1){
 if(q<0||q>=1)return false;const spec=sheets[kind],a=asset(spec);if(!a?.ready)return false;
 const frame=Math.min(spec.frames-1,Math.floor(q*spec.frames));c.save();c.globalAlpha*=alpha;c.translate(x,y);c.rotate(angle);c.imageSmoothingEnabled=true;
 c.drawImage(a.image,frame%spec.columns*spec.w,Math.floor(frame/spec.columns)*spec.h,spec.w,spec.h,-spec.pivot[0]*scale,-spec.pivot[1]*scale,spec.w*scale,spec.h*scale);c.restore();return true;
}
function line(c,points,color,width){c.beginPath();for(const [i,p]of points.entries())i?c.lineTo(...p):c.moveTo(...p);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
function hit(c,e){
 const age=e.max-e.t;if(age<0||e.t<=0)return true;const q=clamp(age/e.max),angle=e.angle||0,power=clamp(e.power||1,.5,1.5),x=e.x-Math.cos(angle)*6,y=e.y-(e.lift||20)-Math.sin(angle)*4;
 c.save();c.translate(x,y);c.rotate(angle);
 if(e.armor){
  if(!stamp(c,'hit',0,0,q,.88*power,0,.94)){c.globalAlpha*=1-q;line(c,[[-10*power,-5],[0,0],[-9*power,6]],'#fff0b8',2.4);line(c,[[0,0],[12*power,0]],'#fff9df',2);}
  for(let i=0;i<5;i++){const a=(i-2)*.45+Math.PI,d=(5+q*(25+i*4))*power;c.globalAlpha=(1-q)*.65;line(c,[[Math.cos(a)*d,Math.sin(a)*d*.7],[Math.cos(a)*(d+5*power),Math.sin(a)*(d+5*power)*.7]],i%2?'#f9d899':'#fff8dd',1.1);}
 }else{
  // A small matte clack and plastic chips, rather than the armored shower.
  const pulse=clamp(1-age/.075);c.globalAlpha=pulse;c.fillStyle='#fff3ce';c.beginPath();c.moveTo(-4,-2.5);c.lineTo(7*power,0);c.lineTo(-3,3.5);c.closePath();c.fill();line(c,[[-5*power,-5*power],[1,0],[-5*power,5*power]],'#f5e3ad',1.7);
  for(let i=0;i<4;i++){const a=Math.PI+(i-1.5)*.6,d=(4+q*(13+i*3))*power;c.save();c.translate(Math.cos(a)*d,Math.sin(a)*d*.7-q*5);c.rotate(i+q*4);c.globalAlpha=(1-q)*.75;c.fillStyle=i%2?'#d9d6a8':'#8d9b72';c.fillRect(-1.4,-.8,2.8,1.6);c.restore();}
 }
 c.restore();return true;
}
function heal(c,e){
 if(e.target&&e.target.hp<=0)return true;const age=e.max-e.t;if(age<0||e.t<=0)return true;const q=clamp(age/e.max),x=e.target?.x??e.x,y=e.target?.y??e.y,fade=clamp(age/.035)*(1-q),blue=e.target?.coopOwner===1,color=blue?'#a9edee':'#caf0b0';
 c.save();
 if(e.source?.hp>0){const from={x:e.source.x,y:e.source.y-25},to={x,y:y-21};c.globalAlpha=fade*.27;line(c,[[from.x,from.y],[(from.x+x)/2,(from.y+to.y)/2-8],[to.x,to.y]],color,2);const t=clamp(q*1.5);c.globalAlpha=fade*.7;c.fillStyle='#eaffd6';c.beginPath();c.ellipse(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t-Math.sin(t*Math.PI)*7,2.3,1.8,0,0,TAU);c.fill();}
 c.globalAlpha=fade*.72;c.strokeStyle='#315b46';c.lineWidth=3.8;c.beginPath();c.ellipse(x,y+2,15+q*18,6+q*7,0,-.2,Math.PI*1.75);c.stroke();c.strokeStyle=color;c.lineWidth=1.8;c.stroke();
 c.globalAlpha=fade*.13;const glow=c.createRadialGradient(x,y-12,1,x,y-12,32);glow.addColorStop(0,color);glow.addColorStop(1,'#c9edb000');c.fillStyle=glow;c.fillRect(x-32,y-44,64,64);
 for(let i=0;i<2;i++){const t=clamp((q-i*.12)/.88),px=x+(i?11:-10)+Math.sin(t*3+i)*3,py=y-22-t*32-i*7,size=(i?4:5.5)*(1-t*.25);c.globalAlpha=fade*(i?.85:1);c.fillStyle='#244c38';c.fillRect(px-size-.8,py-size*.32-.5,size*2+1.6,size*.64+1.8);c.fillRect(px-size*.32-.8,py-size-.5,size*.64+1.6,size*2+1.8);c.fillStyle=color;c.fillRect(px-size,py-size*.32,size*2,size*.64);c.fillRect(px-size*.32,py-size,size*.64,size*2);c.fillStyle='#f4ffe0';c.fillRect(px-size*.32,py-size,size*.64,1);}
 c.restore();return true;
}
function blastAccent(c,e){
 const boss=e.visualKind==='bossKiller',jackpot=e.visualKind==='jackpot';if(!boss&&!jackpot)return;
 const age=e.max-e.t;if(age<0||age>.36||e.t<=0)return;const q=age/.36,r=clamp(e.radius||60,20,160),fade=1-q;
 c.save();
 stamp(c,'heavy',e.x,e.y-5,q,boss?1.12:.50,0,boss?.72:.42);
 // Seven 777 hits stay compact; the single boss missile gets a wider ground kick.
 for(let i=0;i<(boss?10:4);i++){const a=i*2.39996+(e.x%13)*.1,d=r*(.15+q*.95),length=(boss?16:8)*fade;c.globalAlpha=fade*(boss?.65:.42);line(c,[[e.x+Math.cos(a)*d,e.y+Math.sin(a)*d*.37],[e.x+Math.cos(a)*(d+length),e.y+Math.sin(a)*(d+length)*.37]],i%3?'#e6bd78':'#fff0bd',boss?1.6:1);}
 c.restore();
}
function install(Effects){
 if(!Effects||Effects.prototype.combatFeedbackVersion)return;const p=Effects.prototype,draw=p.drawEvent;p.combatFeedbackVersion=1;
 p.drawEvent=function(c,e){if(e.kind==='hit'&&e.power)return hit(c,e);if(e.kind==='heal')return heal(c,e);const result=draw.call(this,c,e);if(e.kind==='explosion')blastAccent(c,e);return result;};
 asset(sheets.hit);asset(sheets.heavy);
}
root.FrontCombatFeedback={install};if(root.FrontEffects)install(root.FrontEffects);if(typeof module!=='undefined'&&module.exports)module.exports={install};
})(typeof window==='undefined'?globalThis:window);
