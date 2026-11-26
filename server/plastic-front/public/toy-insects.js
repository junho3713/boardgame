/* Matching lightweight fallback while the baked toy meshes load. */
(()=>{'use strict';
const colors={bombBug:'#b84529',acidBeetle:'#457d73',ant:'#cf5e2d',soldierAnt:'#ad3f24',beetle:'#84954c',bruteBeetle:'#567158',stagBeetle:'#3a6f86',rhinoBeetle:'#914d35'},scales={bombBug:1.12,acidBeetle:.96,ant:.72,soldierAnt:.95,beetle:1.05,bruteBeetle:1.35,stagBeetle:1.2,rhinoBeetle:1.4};
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const tau=Math.PI*2;
function bombPulse(u,time){
 if(reducedMotion?.matches)return .65;
 const phase=u.bombFuse?(time-u.bombFuse.startedAt)*2.4:time*.9+(u.id||0)*.21;
 return .5+.5*Math.cos(phase*tau);
}
function bombTint(u,time){
 const strength=bombPulse(u,time)*(u.bombFuse?1:.58);
 return `hue-rotate(${-13*strength}deg) saturate(${1.28+1.72*strength}) brightness(${.94+.36*strength})`;
}
function draw(ctx,u,time=0){
 const color=colors[u.type];if(!color)return false;
 const ant=['bombBug','ant','soldierAnt'].includes(u.type);ctx.save();ctx.scale(scales[u.type],scales[u.type]);
 if(u.type==='bombBug')ctx.filter=bombTint(u,time);
 const oval=(x,y,rx,ry,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();},piece=(points,width,c)=>{ctx.strokeStyle=c;ctx.lineWidth=width;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
 oval(4,6,ant?27:32,ant?31:36,'#17231a38');
 for(const side of [-1,1])for(let i=0;i<3;i++){const y=-12+i*11,w=Math.sin((u.walk||0)*2)*side*(i%2?-3:3),x=ant?24:29;piece([[side*7,y],[side*(ant?17:21),y-3+w],[side*x,y+5+w]],5,color);oval(side*x,y+5+w,4,3.2,color);}
 const body=(x,y,rx,ry)=>{const g=ctx.createRadialGradient(x-rx*.3,y-ry*.4,1,x,y,Math.max(rx,ry));g.addColorStop(0,color);g.addColorStop(.6,color);g.addColorStop(1,'#293a34');oval(x,y,rx,ry,g);oval(x-rx*.3,y-ry*.35,rx*.28,ry*.16,'#ffffff1f');};
 body(0,ant?17:11,ant?13:17.5,ant?17:23);body(0,ant?-4:-10,ant?8:16,ant?9:13);body(0,-26,11.5,10.5);
 if(!ant)piece([[0,-10],[0,30]],.9,'#23372b99');
 if(ant||!['stagBeetle','rhinoBeetle'].includes(u.type))for(const side of [-1,1]){piece([[side*6,-32],[side*10,-39],[side*16,-43]],3,color);oval(side*16,-43,2,2.8,color);}
 if(u.type==='stagBeetle')for(const side of [-1,1]){ctx.strokeStyle=color;ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(side*7,-32);ctx.bezierCurveTo(side*25,-37,side*24,-56,side*6.5,-60);ctx.stroke();piece([[side*19,-46],[side*12,-48]],4,color);}
 if(u.type==='rhinoBeetle'){piece([[0,-30],[0,-38],[0,-48]],7,color);for(const side of [-1,1])piece([[0,-47],[side*5.5,-55]],4,color);}
 for(const side of [-1,1]){oval(side*9,-31,3,3,'#182323');oval(side*9-.5,-32,.8,.8,'#e7eed9');}
 if(u.type==='bombBug'){body(0,21,18,23);oval(0,23,3.8,5.5,'#e9ad45');}
 if(u.type==='acidBeetle'){oval(0,-14,13,11,'#b8a35d');const y=u.acidWindup?-40:-35;for(const side of [-1,1])piece([[side*9,-13],[side*17,-25],[side*6,y]],4,color);if(!(time<(u.toyThrowUntil||0))){oval(0,y,7.5,7.5,'#a56f3d');piece([[-2,y-6],[-3,y],[-2,y+6]],.8,'#754c29');}}
 ctx.restore();return true;
}
function bombWarning(c,u,time){
 const fuse=u.bombFuse,flash=bombPulse(u,time);
 if(fuse){
  const r=window.FrontBombBugRules.radius;
  const progress=Math.max(0,Math.min(1,(time-fuse.startedAt)/(fuse.explodeAt-fuse.startedAt)));
  const wash=c.createRadialGradient(u.x,u.y,r*.52,u.x,u.y,r);
  wash.addColorStop(0,'#ed392515');wash.addColorStop(1,'#ff523659');
  c.fillStyle=wash;c.strokeStyle='#a53224';c.lineWidth=3.8;c.beginPath();c.arc(u.x,u.y,r,0,tau);c.fill();c.stroke();
  c.strokeStyle='#ff8960';c.lineWidth=1.5;c.stroke();
  c.strokeStyle='#ffe4a8';c.lineWidth=3;c.beginPath();c.arc(u.x,u.y,r,-Math.PI/2,-Math.PI/2+tau*progress);c.stroke();
 }
 c.translate(u.x,u.y-76);
 const width=fuse?14:11;
 c.beginPath();c.moveTo(0,-width);c.lineTo(width,0);c.lineTo(0,width);c.lineTo(-width,0);c.closePath();
 c.strokeStyle='#3a211b';c.lineWidth=4;c.lineJoin='round';c.stroke();
 c.fillStyle=fuse&&flash>.45?'#f56742':'#b33a29';c.fill();
 c.strokeStyle='#ffb178';c.lineWidth=1.2;c.stroke();
 c.fillStyle='#fff4d2';c.font='900 17px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('!',0,.7);
}
function warning(c,u,time){
 if(u.hp<=0||u.type!=='bombBug'&&u.type!=='acidBeetle')return;
 c.save();
 if(u.type==='bombBug'){bombWarning(c,u,time);c.restore();return;}
 const a=u.acidWindup;
 if(a){c.strokeStyle='#f3da83';c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();c.moveTo(u.x,u.y);c.lineTo(a.x,a.y);c.stroke();c.setLineDash([]);}
 c.shadowColor='#14241f';c.shadowBlur=3;c.shadowOffsetY=1;c.font='bold 12px sans-serif';c.textAlign='center';c.fillStyle='#ebd980';c.fillText('투석 딱정벌레',u.x,u.y-49);
 c.shadowBlur=0;c.shadowOffsetY=0;c.fillStyle='#25352b';c.fillRect(u.x-21,u.y-44,42,4);c.fillStyle='#dfcb6f';c.fillRect(u.x-21,u.y-44,42*Math.max(0,u.hp/u.maxHp),4);c.restore();
}
window.FrontToyInsects={draw,warning,bombTint};
})();
