/* World-space telegraphs use the same front position and lane boundaries as collision. */
(function(root){
'use strict';
const TAU=Math.PI*2,water=root.FrontTideRules;
function oval(c,x,y,rx,ry,fill){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();
}
// Cells share a foot pivot at (128,240). The last six cells interpolate the two planted steps.
const cell=256,reduce=root.matchMedia?.('(prefers-reduced-motion: reduce)');
function sheet(name){
 const art=new Image();art.decoding='async';art.fetchPriority='low';
 art.src='assets/models/'+name+'-v1.webp';return art;
}
const krakenSheet=sheet('kraken-boss'),ninjaSheet=sheet('ninja-assassin-boss');
const headings=new WeakMap();
function facing(u,time){
 const cosine=Math.cos(u.face??0);
 let h=headings.get(u);
 if(!h){h={side:cosine>0?-1:1,since:-Infinity};headings.set(u,h);}
 if(cosine*h.side>.22){h.side=-h.side;h.since=time;}
 const q=clamp((time-h.since)/.15);
 return h.side*(q<.5?-1:1)*(reduce?.matches?1:1-.25*Math.sin(q*Math.PI));
}
function clamp(n){return Math.min(1,Math.max(0,n));}
function stamp(c,sheet,frame,size){
 c.drawImage(sheet,frame%4*cell,Math.floor(frame/4)*cell,cell,cell,-size/2,-240*size/cell,size,size);
}
function stride(walk,start,between){
 const step=Math.round((1-Math.cos(walk*.78))*.5*7);
 return step===0?start:step===7?start+1:between+step-1;
}
function kraken(c,u,time,hazards){
 if(!krakenSheet.naturalWidth){krakenFallback(c,u,time);return;}
 const wave=hazards?.find(h=>h.kind==='tide'&&h.source?.id===u.id&&time<h.start+.65);
 const gathering=hazards?.some(h=>(h.kind==='foam'||h.kind==='geyser')&&h.source?.id===u.id&&time<h.at);
 const shieldAge=time-(u.bubbleInflatedAt??-Infinity),guarding=gathering||shieldAge>=0&&shieldAge<.45;
 const crest=wave&&clamp((time-wave.start+1.2)/1.2),walk=u.walk||0;
 const frame=wave?(crest>.35?3:2):guarding?2:stride(walk,0,4);
 const angry=u.hp<=u.maxHp*.5,breath=reduce?.matches?0:Math.sin(time*(angry?4:2.6));
 c.save();
 const shadow=c.createRadialGradient(0,0,2,0,0,54);shadow.addColorStop(0,'#25192aad');shadow.addColorStop(1,'#25192a00');
 c.save();c.translate(3,4);c.scale(1,.33);oval(c,0,0,55,55,shadow);c.restore();
 if(angry){const aura=c.createRadialGradient(0,-37,12,0,-37,69+breath*3);
  aura.addColorStop(0,'#ac2675a3');aura.addColorStop(.6,'#bf337e68');aura.addColorStop(1,'#892e8c00');oval(c,0,-37,73,73,aura);}
 c.scale(facing(u,time),1);
 if(!reduce?.matches){c.rotate(.018*Math.sin(walk*.78)+.026*(crest||0));c.scale(1-.012*breath,1+.014*breath);}
 stamp(c,krakenSheet,frame,u.miniBoss?130:151);c.restore();
}
let ghostArt,flashArt;
function tinted(sheet,color){
 const out=document.createElement('canvas');out.width=sheet.naturalWidth;out.height=sheet.naturalHeight;
 const ctx=out.getContext('2d');ctx.drawImage(sheet,0,0);ctx.globalCompositeOperation='source-atop';
 ctx.fillStyle=color;ctx.fillRect(0,0,out.width,out.height);return out;
}
function ninjaBase(c,u){
 const scale=u.miniBoss?.83:1,side=Math.cos(u.face||0)>0?-1:1;
 c.save();c.translate(u.x,u.y);c.scale(side*scale,scale);
 oval(c,0,4,43,9,'#19171e');
 const top=c.createLinearGradient(0,-7,0,9);top.addColorStop(0,'#454149');top.addColorStop(1,'#29272e');
 oval(c,0,1,43,9,top);
 if(u.ninjaLives>1){
  c.save();c.translate(28,-5);c.rotate(.16);
  const bark=c.createLinearGradient(0,-4,0,4);bark.addColorStop(0,'#deae71');bark.addColorStop(.55,'#ae774c');bark.addColorStop(1,'#704530');
  c.fillStyle=bark;c.beginPath();c.roundRect(-9,-4.4,18,8.8,2);c.fill();
  c.fillStyle='#835537';c.fillRect(-7,-.3,14,.8);
  oval(c,8,0,2.8,4.4,'#e2bb84');oval(c,8,0,1.8,3,'#a57049');oval(c,8,0,.95,2,'#e6c79b');c.restore();
 }
 c.restore();
}
function ninja(c,u,time){
 if(!ninjaSheet.naturalWidth){
  c.save();c.scale(1.38,1.38);root.FrontAssassinView.body(c,u,time);c.restore();return;
 }
 const clone=!!u.assassinClone,flash=clone&&time<u.cloneFlashUntil,action=u.assassinAction;
 const phase=action?.phase,throwing=phase==='throw',warn=phase==='warn',dash=phase==='dash';
 const charge=throwing||warn?clamp(1-(action.until-time)/(throwing?.45:.7)):0;
 const release=time-(u.assassinReleasedAt??-Infinity),released=release>=0&&release<.34;
 const moving=time-(u.assassinStepAt??-Infinity)<.12,walk=u.walk||0;
 const frame=dash?5:throwing?3:warn?0:released?4:moving?stride(walk,1,6):0;
 const size=u.miniBoss?117:137;
 c.save();
 if(clone){
  for(let i=0;i<3;i++){const p=(time*.8+i/3+u.id*.17)%1;
   oval(c,Math.sin(i*2+p*2)*13,-p*10,4+p*4,2+p*2,'rgba(153,116,185,'+(.19*(1-p))+')');}
  c.globalAlpha*=flash?.57:.88;
 }
 c.scale(facing(u,time),1);
 if(!reduce?.matches){
  const lift=moving&&!phase?Math.sin(walk*.78)**2:0;
  c.translate(0,-2*lift);
  if(throwing||warn){c.rotate((throwing?.08:-.075)*charge);c.scale(1+.035*charge,1-.065*charge);}
  if(released)c.rotate(-.05*(1-release/.34));
 }
 let art=ninjaSheet;
 if(flash){flashArt??=tinted(ninjaSheet,'rgba(136,92,174,.92)');art=flashArt;}
 else if(clone){ghostArt??=tinted(ninjaSheet,'rgba(158,142,174,.41)');art=ghostArt;}
 stamp(c,art,frame,size);
 if(throwing||warn){
  // Coordinates are relative to the foot pivot, on the raised star or the dagger's bevel.
  const x=(throwing?-.19:.24)*size,y=(throwing?-.66:-.24)*size;
  const radius=(4+charge*9)*size/137,glow=c.createRadialGradient(x,y,0,x,y,radius);
  glow.addColorStop(0,clone?'#e6dcee':'#ffdad3');glow.addColorStop(.3,clone?'#ccb4d772':'#ff42529a');
  glow.addColorStop(1,clone?'#d2c5df00':'#ff405000');oval(c,x,y,radius,radius,glow);
 }
 c.restore();
}
function krakenFallback(c,u,time){
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
root.FrontRotationView={kraken,ninja,ninjaBase,ground,air,event};
})(window);
