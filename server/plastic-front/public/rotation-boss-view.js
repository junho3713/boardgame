/* World-space telegraphs use the same front position and lane boundaries as collision. */
(function(root){
'use strict';
const TAU=Math.PI*2,water=root.FrontTideRules;
function oval(c,x,y,rx,ry,fill){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();
}
function kraken(c,u,time){
 c.save();c.scale(1.95,1.95);
 const angry=u.hp<=u.maxHp*.5,pulse=Math.sin(time*5);
 if(angry){
  const aura=c.createRadialGradient(0,-17,7,0,-17,40+pulse*2);
  aura.addColorStop(0,'#b3226aa0');aura.addColorStop(.68,'#ab22616a');aura.addColorStop(1,'#6f1eb900');
  oval(c,0,-17,42,42,aura);
 }
 for(const side of [-1,1]){
  const bend=3*Math.sin(time*3+side);
  c.lineCap='round';c.lineWidth=6;c.strokeStyle=angry?'#9c508e':'#9671b0';
  c.beginPath();c.moveTo(side*10,-5);c.bezierCurveTo(side*29,2,side*31,-24+bend,side*23,-19+bend);c.stroke();
  for(let i=0;i<3;i++)oval(c,side*(20+i*2.8),-6-i*2.1+bend*.25,1.3,1.6,'#e9b6d0');
 }
 root.FrontBubbleOctopusView.model(c,u,time);
 c.translate(-1,-37-Math.abs(Math.sin((u.walk||0)+time*2+(u.id||0)))*1.65);
 c.rotate(-.1);
 const gold=c.createLinearGradient(-10,-8,10,3);gold.addColorStop(0,'#ad701c');gold.addColorStop(.32,'#fff2ac');gold.addColorStop(.68,'#e8af40');gold.addColorStop(1,'#a46027');
 c.fillStyle=gold;c.beginPath();c.moveTo(-10,-10);c.lineTo(-5,-5);c.lineTo(0,-14);c.lineTo(5,-5);c.lineTo(10,-10);c.lineTo(8,0);c.quadraticCurveTo(0,4,-8,0);c.closePath();c.fill();
 oval(c,0,-2,2.6,2.8,'#b92454');oval(c,-.7,-3,1,.8,'#ffe0ce');c.restore();
}
function tide(c,g,h){
 const horizontal=h.horizontal,cross=horizontal?g.bounds().height:g.bounds().width;
 const pos=horizontal?g.camera.x:g.camera.y,view=g.viewport||{width:1200,height:860};
 const half=(horizontal?view.width:view.height)/2+40;
 const crossPos=horizontal?g.camera.y:g.camera.x,crossHalf=(horizontal?view.height:view.width)/2+50;
 const lo=Math.max(0,crossPos-crossHalf),hi=Math.min(cross,crossPos+crossHalf);
 const warning=g.time<h.start,visibleEdge=Math.max(pos-half,Math.min(pos+half,h.front));
 c.save();if(!horizontal)c.transform(0,1,1,0,0,0);
 for(let y=h.offset+Math.floor((lo-h.offset)/water.period)*water.period;y<hi;y+=water.period){
  const a=Math.max(0,y),b=Math.min(cross,y+water.wet);if(b<=lo||a>=b)continue;
  if(warning){
   c.fillStyle='#429ad31f';c.fillRect(pos-half,a,2*half,b-a);
   c.strokeStyle='#8de8fa';c.lineWidth=2;c.setLineDash([8,10]);c.beginPath();
   c.moveTo(pos-half,a);c.lineTo(pos+half,a);c.moveTo(pos-half,b);c.lineTo(pos+half,b);c.stroke();c.setLineDash([]);
   for(let x=pos-half+36;x<pos+half;x+=125){
    const cy=(a+b)/2;c.beginPath();c.moveTo(x-8*h.sign,cy-7);c.lineTo(x,cy);c.lineTo(x-8*h.sign,cy+7);c.stroke();
   }
  }
  if(!warning&&Math.abs(h.front-visibleEdge)>65)continue;
  const x=warning?visibleEdge:h.front;
  const grad=c.createLinearGradient(x-32*h.sign,0,x+15*h.sign,0);grad.addColorStop(0,'#127cbd00');grad.addColorStop(.57,'#268bc6bb');grad.addColorStop(1,'#91f7ffff');
  c.beginPath();c.moveTo(x-32*h.sign,a);
  for(let cy=a;cy<=b;cy+=6)c.lineTo(x+Math.sin(cy*.075-g.time*8)*5,cy);
  c.lineTo(x,b);c.lineTo(x-32*h.sign,b);c.closePath();c.fillStyle=grad;c.fill();
  c.beginPath();for(let cy=a;cy<=b;cy+=4){const px=x+Math.sin(cy*.075-g.time*8)*5;
   if(cy===a)c.moveTo(px,cy);else c.lineTo(px,cy);}
  c.strokeStyle='#d4ffff';c.lineWidth=3;c.stroke();
 }
 c.restore();
}
function ground(c,g){
 for(const h of g.roomCampaign?.rotation?.hazards||[]){
  if(h.kind==='tide'){tide(c,g,h);continue;}
  if(h.kind!=='foam'&&h.kind!=='geyser')continue;
  const q=Math.max(0,Math.min(1,(g.time-h.start)/(h.at-h.start))),r=h.kind==='foam'?180:water.bombRadius;
  for(const p of h.points||[h]){
   c.save();c.translate(p.x,p.y);oval(c,0,0,r,r,'#176ca73a');oval(c,0,0,r*q,r*q,'#54dce64f');
   c.strokeStyle='#c2f8ff';c.lineWidth=2;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();c.restore();
  }
 }
 for(const u of g.units){
  const a=u.assassinAction;
  if(u.type!=='ninjaAssassin'||u.hp<=0||a?.phase!=='cross')continue;
  const charge=Math.max(0,1-(a.until-g.time)/.55),r=28-10*charge;
  c.save();c.translate(a.point.x,a.point.y);c.strokeStyle=u.assassinClone?'#cdbfda':'#ff365d';c.lineWidth=3+charge*2;
  c.beginPath();c.moveTo(-r,-r);c.lineTo(r,r);c.moveTo(r,-r);c.lineTo(-r,r);c.stroke();c.restore();
 }
}
function air(c,g){
 for(const h of g.roomCampaign?.rotation?.hazards||[]){
  if(h.kind!=='windmill'&&h.kind!=='star')continue;
  const clone=h.source.assassinClone;
  c.save();c.translate(h.x,h.y-14);const size=h.kind==='windmill'?2.6:1.2;c.scale(size,size);
  c.globalAlpha=clone?.64:1;
  c.shadowColor=clone?'#c6b5d8':'#ff364d';c.shadowBlur=clone?2:6;
  root.FrontAssassinView.throwingStar(c,0,0,g.time*14+h.angle,clone);c.restore();
 }
}
function event(c,e){
 if(!['substitutionLog','waterColumn','ninjaCut'].includes(e.kind))return false;
 const q=1-e.t/e.max;c.save();c.translate(e.x,e.y);
 if(e.kind==='substitutionLog'){
  const x=Math.cos(e.angle)*47*q,y=Math.sin(e.angle)*22*q;
  oval(c,x+3,y+3,19,5,'#33232a55');
  c.translate(x,y-7-16*Math.abs(Math.sin(q*9))*(1-q));c.rotate(.24+q*2);
  c.globalAlpha=Math.min(1,(1-q)*7);const wood=c.createLinearGradient(0,-8,0,8);
  wood.addColorStop(0,'#edc38b');wood.addColorStop(.4,'#b77742');wood.addColorStop(1,'#704332');
  c.fillStyle=wood;c.fillRect(-15,-8,30,16);oval(c,15,0,4.5,8,'#f2c794');oval(c,15,0,2.9,5.6,'#a26946');oval(c,15,0,1.6,3.5,'#edbd88');
  if(q>.72){c.save();c.globalAlpha=(q-.72)/.28;for(let i=0;i<5;i++){const a=i*2.4;oval(c,Math.cos(a)*19*q,Math.sin(a)*11*q,3+6*q,3+4*q,'#9173a2aa');}c.restore();}
  c.strokeStyle='#835130';c.beginPath();c.moveTo(-13,-2);c.quadraticCurveTo(-3,-5,10,-2);c.stroke();
 }else if(e.kind==='waterColumn'){
  const z=Math.sin(q*Math.PI)*93;c.globalAlpha=1-q*q;
  for(let i=0;i<7;i++){
   const a=i*2.4,x=Math.cos(a)*(10+q*16),y=Math.sin(a)*8;
   const grad=c.createLinearGradient(0,y-z-4,0,y+4);grad.addColorStop(0,'#e6ffff');grad.addColorStop(.45,'#68e0f2cf');grad.addColorStop(1,'#2789c78c');
   oval(c,x,y-z*.48,4+i%4,Math.max(2,z*(.38+i%3*.07)),grad);
   oval(c,x*1.5,y-z-5,2+i%3,3,'#b8f6ff');
  }
 }else{
  c.rotate(e.angle);c.globalAlpha=1-q;c.fillStyle=e.clone?'#bcaec9':'#f34c77';
  c.beginPath();c.moveTo(-48,-4);c.quadraticCurveTo(0,16,55,-29);c.quadraticCurveTo(8,26,-48,-4);c.fill();
 }
 c.restore();return true;
}
root.FrontRotationView={kraken,ground,air,event};
})(window);
