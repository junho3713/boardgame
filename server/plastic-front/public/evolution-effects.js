/* Distinct silhouettes and attack signatures for evolved squads; rendering never changes combat. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),colors={burst:'#ffd880',burstFinal:'#fff3b8',heat:'#ffb254',heatPierce:'#ff742e',pierce:'#97edff',ricochet:'#c0f58b',siege:'#ffbc57',cluster:'#ff9e71',mortarTwin:'#ffe0a1'};
function glint(c,x,y,r,color,alpha=1){c.save();c.translate(x,y);c.globalAlpha*=alpha;c.fillStyle=color;c.beginPath();c.moveTo(-r,0);c.quadraticCurveTo(-r*.13,-r*.12,0,-r*1.8);c.quadraticCurveTo(r*.12,-r*.12,r,0);c.quadraticCurveTo(r*.13,r*.12,0,r*1.8);c.quadraticCurveTo(-r*.12,r*.12,-r,0);c.fill();c.restore();}
function crystal(c,x,y,size,angle,alpha){c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;c.fillStyle='#7fdec0';c.beginPath();c.moveTo(0,-size);c.lineTo(size*.44,-size*.25);c.lineTo(size*.34,size*.5);c.lineTo(0,size);c.lineTo(-size*.35,size*.36);c.lineTo(-size*.43,-size*.2);c.closePath();c.fill();c.fillStyle='#edfff4';c.beginPath();c.moveTo(0,-size);c.lineTo(size*.44,-size*.25);c.lineTo(0,size*.7);c.closePath();c.fill();c.fillStyle='#b6f7d9';c.beginPath();c.moveTo(0,-size);c.lineTo(-size*.43,-size*.2);c.lineTo(0,size*.7);c.closePath();c.fill();c.restore();}
function material(c,image,x,y,width,height,angle,alpha,blend='source-over'){if(!image||alpha<=0)return;c.save();c.globalAlpha*=clamp(alpha,0,1);c.globalCompositeOperation=blend;c.translate(x,y);c.rotate(angle);c.drawImage(image,-width/2,-height/2,width,height);c.restore();}
function bossCaption(c,text,x,y,alpha=1){c.save();c.globalAlpha*=clamp(alpha,0,1);c.translate(x,y);const width=text.length*12.6+18;c.fillStyle='#17201ee8';c.beginPath();c.roundRect(-width/2,-16,width,23,3);c.fill();c.fillStyle='#e7bf45';c.fillRect(-width/2,-16,3,23);c.textAlign='center';c.font='800 14px "Noto Sans KR",sans-serif';c.strokeStyle='#131c18';c.lineWidth=3;c.strokeText(text,2,0);c.fillStyle='#fff0ac';c.fillText(text,2,0);c.restore();}
function install(Effects){
 const p=Effects.prototype,draw=p.drawEvent,shot=p.drawShot,symbol=p.paintLuckySymbol;
 p.drawBossKiller=function(c,x,y,angle,time=0,size=1,{anchor='tip'}={}){
  if(this.drawMaterialMissile?.(c,x,y,angle,time,'boss',size,{anchor}))return;
  const visualSize=size*(this.missileGeometry?.('boss',1,anchor).scale??1);
  c.save();c.translate(x,y);c.rotate(angle);c.scale(visualSize,visualSize);if(anchor==='tip')c.translate(-25,0);
  for(let i=0;i<4;i++){c.fillStyle='#263430'+['45','38','28','18'][i];c.beginPath();c.ellipse(-30-i*12,Math.sin(time*9+i)*3,8+i*2,5+i*2,0,0,TAU);c.fill();}
  const flame=24+Math.sin(time*53)*5,g=c.createLinearGradient(-52,0,-17,0);g.addColorStop(0,'#ff6c1800');g.addColorStop(.6,'#ff9d27');g.addColorStop(1,'#fff4b8');c.fillStyle=g;
  c.beginPath();c.moveTo(-17,-5);c.quadraticCurveTo(-30,-8,-17-flame,0);c.quadraticCurveTo(-30,8,-17,5);c.fill();
  c.fillStyle='#252d30';c.strokeStyle='#a1aaa3';c.lineWidth=1;c.beginPath();c.moveTo(-13,-5);c.lineTo(-24,-13);c.lineTo(-22,-2);c.lineTo(-22,2);c.lineTo(-24,13);c.lineTo(-13,5);c.closePath();c.fill();c.stroke();
  const body=c.createLinearGradient(0,-7,0,7);body.addColorStop(0,'#687276');body.addColorStop(.3,'#303a3d');body.addColorStop(.6,'#11191c');body.addColorStop(1,'#060b0d');c.fillStyle=body;c.strokeStyle='#b4beb4';
  c.beginPath();c.moveTo(25,0);c.quadraticCurveTo(19,-7,10,-7);c.lineTo(-17,-7);c.lineTo(-20,-4);c.lineTo(-20,4);c.lineTo(-17,7);c.lineTo(10,7);c.quadraticCurveTo(19,7,25,0);c.fill();c.stroke();
  c.fillStyle='#f7d347';c.fillRect(6,-6.5,5.5,13);c.fillStyle='#fff1a2';c.fillRect(6.5,-5.5,4.5,2);c.fillStyle='#a68b23';c.fillRect(6.5,4.5,4.5,1.5);c.strokeStyle='#97a8aa';c.beginPath();c.moveTo(-13,-4);c.lineTo(2,-4);c.stroke();c.restore();
 };
 p.paintLuckySymbol=function(c,kind){if(kind!=='bossKiller')return symbol.call(this,c,kind);c.save();c.translate(16,16);c.rotate(-Math.PI/4);if(!this.drawMaterialMissile?.(c,0,0,0,0,'boss',.42,{exhaust:false})){c.scale(.62,.62);this.drawBossKiller(c,0,0,0,0,1,{anchor:'center'});}c.restore();};
 p.drawShot=function(c,b,evolved=false){
  if(b.kind==='bossKiller'){const q=this.materialShotPose?.(b)||{x:b.x,y:b.y-22,angle:Math.atan2(b.target.y-b.y,b.target.x-b.x)};if(b.guidedFlight?.hovering){c.save();c.globalAlpha=.65;c.strokeStyle='#ffe196';c.lineWidth=1.5;c.beginPath();c.ellipse(q.x,q.y+22,28+Math.sin(this.time*9)*3,8,0,0,TAU);c.stroke();bossCaption(c,'보스킬러',q.x,q.y-45);c.restore();}this.drawBossKiller(c,q.x,q.y,q.angle,this.time,1);return;}
  if(!b.evoStyle)return shot.call(this,c,b,evolved);
  if(this.drawMaterialTracer&&!['cluster','siege'].includes(b.evoStyle)){this.drawMaterialTracer(c,b);return;}
  if(this.drawPropulsion&&b.evoStyle==='cluster'){shot.call(this,c,b,true);const q=this.materialShotPose(b);c.save();c.translate(q.x,q.y);c.rotate(q.angle);this.drawPropulsion(c,-9,0,this.time,.45);c.restore();return;}
  if(this.drawMaterialTracer&&b.evoStyle==='siege'){shot.call(this,c,b,true);return;}
  shot.call(this,c,b,true);const a=Math.atan2(b.target.y-b.y,b.target.x-b.x),color=colors[b.evoStyle]||'#ffe49a',width=b.evoStyle==='pierce'?5:b.evoStyle==='heatPierce'?3.5:b.evoStyle==='burstFinal'?3:2;
  c.save();c.globalCompositeOperation='lighter';c.lineCap='round';c.strokeStyle=color;c.lineWidth=width;c.globalAlpha=.85;c.beginPath();c.moveTo(b.x-Math.cos(a)*38,b.y-18-Math.sin(a)*38);c.lineTo(b.x,b.y-18);c.stroke();c.fillStyle='#fff7dd';c.beginPath();c.arc(b.x,b.y-18,width*.9,0,TAU);c.fill();c.restore();
 };
 p.drawEvolutionUnit=function(c,u,time){
  if(u.type==='machinegun'){
   const active=time<(u.overheatUntil||0),progress=active?clamp((u.overheatUntil-time)/4,0,1):clamp((u.evolutionHeat||0)/3,0,1);
   c.save();c.fillStyle='#263028';c.fillRect(u.x-19,u.y+16,38,5);c.fillStyle=active?'#ff8d3c':'#e6b35d';c.fillRect(u.x-18,u.y+17,36*progress,3);c.font='700 9px sans-serif';c.textAlign='center';c.fillStyle=active?'#ffdf9c':'#f0d9a8';c.fillText(active?'과열 관통 '+Math.ceil(u.overheatUntil-time)+'초':'예열',u.x,u.y+34);
   if(active){const a=u.aimFace??u.face;c.translate(u.x+Math.cos(a)*30,u.y+Math.sin(a)*25-26);c.globalCompositeOperation='lighter';c.fillStyle='#ff7b2880';c.beginPath();c.ellipse(0,0,14+Math.sin(time*28)*3,8,a,0,TAU);c.fill();}c.restore();
  }else if(u.type==='lucky'){
   if(this.drawMaterialMissile?.(c,u.x+19,u.y-32,u.moveFace??u.face,time,'boss',.27,{exhaust:false}))return;
   c.save();c.translate(u.x+19,u.y-32);c.rotate((u.moveFace??u.face)+Math.PI/2);c.fillStyle='#1c2428';c.strokeStyle='#87948d';c.lineWidth=1;c.beginPath();c.roundRect(-5,-10,10,22,3);c.fill();c.stroke();c.fillStyle='#ebce4e';c.fillRect(-4,-5,8,4);c.fillStyle='#11191b';c.fillRect(-3,-13,6,4);c.restore();
  }
 };
 p.drawEvent=function(c,e){
  const k=clamp(e.t/e.max,0,1),q=1-k;
  if(e.kind==='evolve'){
   const m=this.prepareImpactMaterials?.(),r=22+q*33;c.save();c.translate(e.x,e.y);c.globalCompositeOperation='lighter';
   if(m){c.globalAlpha=k*.36;c.drawImage(m.flash,-r,-r*.42,r*2,r*.84);c.globalAlpha=Math.sin(q*Math.PI)*.23;c.drawImage(m.flash,-21,-88,42,100);}
   c.globalAlpha=k;for(let i=0;i<11;i++){const a=i*2.399+q*.5;glint(c,Math.cos(a)*(15+i%4*5),Math.sin(a)*9-10-q*(30+i%3*14),1.1+i%3*.6,i%2?'#ffe1a1':'#fff5cc',k);}
   c.globalCompositeOperation='source-over';c.textAlign='center';c.font='700 12px sans-serif';c.strokeStyle='#36442a';c.lineWidth=3;c.strokeText('진화!',0,-56-q*13);c.fillStyle='#ffe8a9';c.fillText('진화!',0,-56-q*13);c.restore();return true;
  }
  if(e.kind==='evoMuzzle'&&this.drawMuzzleMaterial?.(c,e))return true;
  if((e.kind==='evoBlast'||e.kind==='evoBossImpact')&&this.drawImpactMaterial?.(c,e,{boss:e.kind==='evoBossImpact',style:e.style,accentOnly:true})){
   if(e.kind==='evoBossImpact'){const m=this.prepareImpactMaterials?.(),age=Math.max(0,e.max-e.t),heat=clamp(1-age/.28,0,1);if(m){material(c,m.fire[2],e.x,e.y,38+age*110,29+age*82,-.3,heat*.8);material(c,m.flash,e.x,e.y,94,62,0,heat*heat*.85,'lighter');material(c,m.flash,e.x,e.y,128,13,0,heat*heat*.6,'lighter');}bossCaption(c,'보스킬러 적중',e.x,e.y-80-q*16,Math.min(1,k*2));}return true;
  }
  if(e.kind==='cleanse'){
   const result=draw.call(this,c,e);if(!e.source)return result;
   const sx=e.source.x,sy=e.source.y-29,tx=e.target?.x??e.x,ty=(e.target?.y??e.y)-25,cx=(sx+tx)/2,cy=Math.min(sy,ty)-38;
   c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(sx,sy,tx,ty);g.addColorStop(0,'#9cffe800');g.addColorStop(.3,'#82e4c9');g.addColorStop(1,'#e2ffed');c.strokeStyle=g;c.lineCap='round';
   c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo(cx,cy,tx,ty);c.globalAlpha=k*.13;c.lineWidth=9;c.stroke();c.globalAlpha=k*.8;c.lineWidth=1.5;c.stroke();
   for(let i=0;i<4;i++){const t=clamp(q*1.5-i*.16,0,1),r=1-t;glint(c,r*r*sx+2*r*t*cx+t*t*tx,r*r*sy+2*r*t*cy+t*t*ty,2+i%2,'#d4fff1',k*.7);}
   if(e.wave){const r=25+(1-Math.pow(1-q,3))*120;c.save();c.translate(sx,e.source.y);c.scale(1,.44);const wash=c.createRadialGradient(0,0,r*.1,0,0,r);wash.addColorStop(0,'#b5ffe900');wash.addColorStop(.65,'#8decd50c');wash.addColorStop(.87,'#99ffe85c');wash.addColorStop(1,'#b8ffef00');c.globalAlpha=k*.65;c.fillStyle=wash;c.fillRect(-r,-r,r*2,r*2);c.restore();}
   c.globalCompositeOperation='source-over';c.globalAlpha=k;
   for(let i=0;i<8;i++){const a=i*2.399+q*.65,rx=tx+Math.cos(a)*(18+q*27),ry=ty+Math.sin(a)*(8+q*12)-q*(18+i*2);crystal(c,rx,ry,3.5+i%3*.8,a*.3-q,Math.sin(Math.PI*clamp(q*1.15,0,1)));if(i%3===0)glint(c,rx+3,ry-4,2,'#edfff3',k);}
   c.restore();return true;
  }
  if(!['evoBeam','evoBlast','evoMuzzle','evoOverheat','evoAwaken','evoBossLaunch','evoBossImpact'].includes(e.kind))return draw.call(this,c,e);
  c.save();c.globalAlpha=k;
  if(e.kind==='evoBeam'){
   const color=e.style==='ricochet'?'#e3d9a0':e.style==='heatPierce'?'#ffaf57':'#b4e2f1',g=c.createLinearGradient(e.x,e.y-20,e.tx,e.ty-20);g.addColorStop(0,color+'00');g.addColorStop(.25,color+'70');g.addColorStop(.88,color);g.addColorStop(1,'#fff8d8');c.globalCompositeOperation='lighter';c.lineCap='round';c.strokeStyle=g;c.beginPath();c.moveTo(e.x,e.y-20);c.lineTo(e.tx,e.ty-20);c.lineWidth=Math.max(3,e.width*1.7);c.globalAlpha=k*k*.16;c.stroke();c.lineWidth=Math.max(.7,e.width*.48);c.globalAlpha=k*.85;c.stroke();
   for(let i=0;i<5;i++){const a=i*2.399+(e.tx||0),d=3+q*(14+i*2);c.strokeStyle=i%2?color:'#fff1bb';c.lineWidth=.7+i%2*.4;c.beginPath();c.moveTo(e.tx+Math.cos(a)*d,e.ty-20+Math.sin(a)*d*.7);c.lineTo(e.tx+Math.cos(a)*(d+5*k),e.ty-20+Math.sin(a)*(d+5*k)*.7);c.stroke();}glint(c,e.tx,e.ty-20,4*k,'#fff3ca',k);
  }else if(e.kind==='evoMuzzle'){
   const reach=e.style==='siege'?45:32,x=e.x+Math.cos(e.angle)*reach,y=e.y+Math.sin(e.angle)*reach-25;c.translate(x,y);c.rotate(e.angle);c.fillStyle=colors[e.style]||'#ffdf8a';c.beginPath();c.moveTo(24*(1-q),0);c.lineTo(3,-7*k);c.lineTo(-5,-2);c.lineTo(-3,2);c.lineTo(3,7*k);c.closePath();c.fill();
  }else if(e.kind==='evoBlast'||e.kind==='evoBossImpact'){
   const boss=e.kind==='evoBossImpact',r=e.radius||60,color=boss?'#ffe86a':colors[e.style]||'#ffcd77';c.translate(e.x,e.y);c.scale(1,.76);
   const g=c.createRadialGradient(0,0,1,0,0,r);g.addColorStop(0,'#fff7d9');g.addColorStop(.18,color);g.addColorStop(.6,boss?'#f4a43090':'#ef7f3040');g.addColorStop(1,'#df6b2400');c.fillStyle=g;c.globalAlpha=k*.8;c.beginPath();c.arc(0,0,r*(.45+q*.65),0,TAU);c.fill();c.globalAlpha=k;c.strokeStyle=color;c.lineWidth=(boss?5:3)*k;c.beginPath();c.arc(0,0,r*(.2+q*.9),0,TAU);c.stroke();
   for(let i=0;i<(boss?16:9);i++){const a=i*2.39996,inner=r*(.18+q*.4),outer=r*(.35+q*.8);c.strokeStyle=i%2?'#fff2b0':color;c.lineWidth=i%3?1.5:3;c.beginPath();c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);c.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);c.stroke();}
   if(boss){c.fillStyle='#fff4ac';c.font='800 15px sans-serif';c.textAlign='center';c.fillText('보스킬러',0,-r-8);}
  }else if(e.kind==='evoAwaken'){
   const r=30+(1-Math.pow(k,3))*85,m=this.prepareImpactMaterials?.();c.translate(e.x,e.y);c.globalCompositeOperation='lighter';
   if(m){c.globalAlpha=k*.4;c.drawImage(m.flash,-r,-r*.44,r*2,r*.88);c.globalAlpha=Math.sin(Math.PI*q)*.24;c.drawImage(m.flash,-43,-165,86,190);}
   for(let lane=0;lane<3;lane++){const a0=q*2.5+lane*2.1;c.strokeStyle=lane===1?'#fff4cd':'#eac879';c.lineWidth=1.2;c.globalAlpha=k*.55;c.beginPath();for(let i=0;i<22;i++){const a=a0+i*.055,rx=Math.cos(a)*r,ry=Math.sin(a)*r*.4-q*lane*9;if(i)c.lineTo(rx,ry);else c.moveTo(rx,ry);}c.stroke();}
   c.globalAlpha=k;for(let i=0;i<20;i++){const a=i*2.399+q*.65,spread=20+(i%5)*9,x=Math.cos(a)*spread,y=Math.sin(a)*spread*.35-15-q*(65+i%4*17);glint(c,x,y,1.2+(i%3)*.8,i%3?'#ffe2a3':'#fff9df',k*(.45+.55*Math.sin((q+i*.16)*Math.PI)**2));}
   c.globalCompositeOperation='source-over';
   c.globalAlpha=Math.min(1,k*3);c.textAlign='center';c.font='800 19px "Noto Sans KR",sans-serif';c.lineWidth=5;c.strokeStyle='#24372eef';c.strokeText(e.name,0,-135-q*10);c.fillStyle='#fff0ac';c.fillText(e.name,0,-135-q*10);c.font='600 11px "Noto Sans KR",sans-serif';c.strokeText(e.detail,0,-115-q*10);c.fillStyle='#e8f3cd';c.fillText(e.detail,0,-115-q*10);
  }else if(e.kind==='evoOverheat'){
   const u=e.source||e,m=this.prepareImpactMaterials?.();c.translate(u.x,u.y-30);if(m){c.globalCompositeOperation='lighter';c.globalAlpha=k*.45;c.drawImage(m.flash,-40,-25,80,50);c.globalCompositeOperation='source-over';}c.globalAlpha=k;for(let i=0;i<10;i++){const a=i*2.399,d=15+q*28;c.strokeStyle=i%2?'#ff9b43':'#ffe8ab';c.lineWidth=1;c.beginPath();c.moveTo(Math.cos(a)*d,Math.sin(a)*d*.6-q*18);c.lineTo(Math.cos(a)*(d+4),Math.sin(a)*(d+4)*.6-q*18-4);c.stroke();}c.font='800 13px sans-serif';c.textAlign='center';c.strokeStyle='#4f2a16';c.lineWidth=3;c.strokeText('과열 관통!',0,-38-q*15);c.fillStyle='#ffe0a5';c.fillText('과열 관통!',0,-38-q*15);
  }else if(e.kind==='evoBossLaunch'){
   const age=Math.max(0,e.max-e.t),m=this.prepareImpactMaterials?.(),angle=e.angle||0,launchY=e.launchY??e.y-30,flare=clamp(1-age/.19,0,1),smoke=clamp(1-age/.43,0,1);c.globalAlpha=1;
   // A brief textured backblast identifies the launch without hiding the missile.
   if(m){c.save();c.translate(e.x,launchY);c.rotate(angle);for(let i=0;i<3;i++){const travel=age*(36+i*16),size=19+i*5+age*40;material(c,m.smoke[i],-13-i*10-travel,(i-1)*5-age*12,size,size*.76,i*.6,smoke*(.31-i*.05));material(c,m.fire[i],-8-i*9-age*21,(i-1)*2,25+i*9,11+i*3,i*.08,flare*(.7-i*.13),'lighter');}material(c,m.flash,0,0,58,37,0,flare*.88,'lighter');c.restore();}
   if(e.target?.hp>0){const tx=e.target.x,ty=e.target.y-16-(e.target.visualFlightHeight??root.FrontTypes?.[e.target.type]?.flightHeight??0),settle=1-clamp(age/.2,0,1),width=21+settle*10,height=17+settle*7,fade=Math.min(1,k*3);c.save();c.globalAlpha=fade;c.lineCap='square';
    // Four compact brackets converge on the same height as the missile nose.
    for(const [color,lineWidth]of [['#15201ed9',4],['#ffe58b',1.6]]){c.strokeStyle=color;c.lineWidth=lineWidth;c.beginPath();for(const sx of [-1,1])for(const sy of [-1,1]){c.moveTo(tx+sx*(width-7),ty+sy*height);c.lineTo(tx+sx*width,ty+sy*height);c.lineTo(tx+sx*width,ty+sy*(height-6));}c.stroke();}
    if(m)material(c,m.flash,tx,ty,43,27,0,(.07+.025*Math.sin(age*12))*fade,'lighter');c.restore();
   }
   let nx=Math.sin(angle),ny=-Math.cos(angle);if(ny>.001||(Math.abs(ny)<=.001&&nx<0)){nx=-nx;ny=-ny;}bossCaption(c,'보스킬러 발사',e.x+nx*85,launchY-35+ny*85,Math.min(1,k*3));
  }
  c.restore();return true;
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install(root.FrontEffects);
})(typeof window==='undefined'?globalThis:window);
