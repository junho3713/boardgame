/* World-space telegraphs use the same front position and lane boundaries as collision. */
(function(root){
'use strict';
const TAU=Math.PI*2,water=root.FrontTideRules;
function oval(c,x,y,rx,ry,fill){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();
}
// Cells share a foot pivot at (128,240). The last six cells interpolate the two planted steps.
const figureScale=1.22,cell=256,reduce=root.matchMedia?.('(prefers-reduced-motion: reduce)');
function sheet(name,version=1){
 const art=new Image();art.decoding='async';art.fetchPriority='low';
 art.src='assets/models/'+name+'-v'+version+'.webp';return art;
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
 loadSurfArt();
 c.save();c.scale(figureScale,figureScale);
 if(!krakenSheet.naturalWidth){krakenFallback(c,u,time);c.restore();return;}
 const wave=hazards?.find(h=>h.kind==='tide'&&h.source?.id===u.id&&time<h.start+.65);
 const gathering=hazards?.some(h=>(h.kind==='foam'||h.kind==='geyser')&&h.source?.id===u.id&&time<h.at);
 const shieldAge=time-(u.bubbleInflatedAt??-Infinity),guarding=gathering||shieldAge>=0&&shieldAge<.45;
 const crest=wave&&clamp((time-wave.start+1.2)/1.2),walk=u.walk||0;
 const frame=wave?(crest>.35?3:2):guarding?2:stride(walk,0,4);
 const angry=u.hp<=u.maxHp*.5,breath=reduce?.matches?0:Math.sin(time*(angry?4:2.6));
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
 const scale=figureScale*(u.miniBoss?.83:1),side=Math.cos(u.face||0)>0?-1:1;
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
  c.save();c.scale(1.38*figureScale,1.38*figureScale);root.FrontAssassinView.body(c,u,time);c.restore();return;
 }
 const clone=!!u.assassinClone,flash=clone&&time<u.cloneFlashUntil,action=u.assassinAction;
 const phase=action?.phase,throwing=phase==='throw',warn=phase==='warn',dash=phase==='dash';
 const charge=throwing||warn?clamp(1-(action.until-time)/(throwing?.45:.7)):0;
 const release=time-(u.assassinReleasedAt??-Infinity),released=release>=0&&release<.34;
 const moving=time-(u.assassinStepAt??-Infinity)<.12,walk=u.walk||0;
 const frame=dash?5:throwing?3:warn?0:released?4:moving?stride(walk,1,6):0;
 const size=(u.miniBoss?117:137)*figureScale;
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
 else if(clone){ghostArt??=tinted(ninjaSheet,'rgba(158,142,174,.63)');art=ghostArt;}
 stamp(c,art,frame,size);
 if(throwing||warn){
  // Coordinates are relative to the foot pivot, on the raised star or the dagger's bevel.
  const x=(throwing?-.19:.24)*size,y=(throwing?-.66:-.24)*size;
  const radius=(4+charge*9)*size/137,glow=c.createRadialGradient(x,y,0,x,y,radius);
  glow.addColorStop(0,'#ffdad3');glow.addColorStop(.3,'#ff42529a');
  glow.addColorStop(1,'#ff405000');oval(c,x,y,radius,radius,glow);
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
let breakerSheet;
function loadSurfArt(){
 if(breakerSheet)return;
 breakerSheet=sheet('kraken-surf',2);
 const prepare=()=>root.FrontKrakenSwash.prepare(breakerSheet);
 if(root.requestIdleCallback)root.requestIdleCallback(prepare,{timeout:900});
 else root.setTimeout(prepare,0);
}
function tideWarning(c,left,right,low,high,h,time){
 const progress=clamp(1-(h.start-time)/1.2),middle=(low+high)/2;
 c.fillStyle='rgba(56,176,255,'+(.45+.12*progress)+')';c.fillRect(left,low,right-left,high-low);
 c.strokeStyle='#9dddff';c.lineWidth=2;
 c.beginPath();c.moveTo(left,low+1);c.lineTo(right,low+1);c.moveTo(left,high-1);c.lineTo(right,high-1);c.stroke();
 c.strokeStyle='#d2f1ff';c.lineWidth=2.4;c.lineJoin='round';c.beginPath();
 const spacing=116,drift=time*54*h.sign%spacing;
 for(let x=Math.floor(left/spacing)*spacing+drift-spacing;x<right+12;x+=spacing){
  c.moveTo(x-8*h.sign,middle-7);c.lineTo(x,middle);c.lineTo(x-8*h.sign,middle+7);
 }
 c.stroke();
}
let refraction;
function refractFloor(c,h,mid,phase,terrain,bounds){
 if(!terrain?.width||!terrain.height)return;
 const span=water.wet,depth=140,half=span/2,sign=h.sign;
 if(!refraction){
  const tile=document.createElement('canvas');tile.width=depth;tile.height=span;
  const ctx=tile.getContext('2d');
  ctx.save();ctx.scale(depth/2,half);
  const mask=ctx.createRadialGradient(1,1,.05,1,1,1);
  mask.addColorStop(0,'#fff');mask.addColorStop(.55,'#ffffffdc');mask.addColorStop(1,'#ffffff00');
  // Rasterize the soft edge once so it never cuts a hard notch into a floorboard.
  ctx.fillStyle=mask;ctx.fillRect(0,0,2,2);ctx.restore();
  const feather=document.createElement('canvas');feather.width=depth;feather.height=span;
  feather.getContext('2d').drawImage(tile,0,0);
  refraction={tile,ctx,feather};
 }
 const {tile,ctx,feather}=refraction;
 const start=h.front+(sign>0?-101:-39),rx=terrain.width/bounds.width,ry=terrain.height/bounds.height;
 ctx.clearRect(0,0,depth,span);ctx.save();
 if(!h.horizontal)ctx.transform(0,1,1,0,0,0);
 // Refract a small patch of map texture in four-pixel strips. The simulation and
 // fog continue in world space and the browser never has to read screen pixels.
 for(let across=0;across<span;across+=4){
  const u=(across+2)/span,y=mid-half+across,w=Math.sin(Math.PI*u);
  const offset=(5+6*Math.sin(9*u+phase*TAU))*w*sign,lateral=2*w*Math.sin(15*u-phase*TAU);
  const dw=h.horizontal?depth:4,dh=h.horizontal?4:depth;
  const sx=h.horizontal?start+offset:y+lateral,sy=h.horizontal?y+lateral:start+offset;
  ctx.drawImage(terrain,sx*rx,sy*ry,dw*rx,dh*ry,h.horizontal?0:across,h.horizontal?across:0,dw,dh);
 }
 ctx.restore();ctx.globalCompositeOperation='destination-in';ctx.drawImage(feather,0,0);
 ctx.globalCompositeOperation='source-over';
 c.save();c.globalAlpha*=.68;c.drawImage(tile,start,mid-half);c.restore();
}
function smooth01(t){
 t=clamp(t);return t*t*(3-2*t);
}
function drawBreakerFace(c,h,mid,phase,motion,mirrored){
 const {height,fall}=motion,sign=h.sign,span=water.wet;
 const opacity=1-smooth01((fall-.62)/.38);
 if(opacity<=0)return;
 const turn=smooth01(fall/.91),reach=68*turn-19*height;
 const tile=288,frame=reduce?.matches?0:Math.floor(phase*16)%16;
 const direction=h.direction??(h.horizontal?(sign>0?0:2):(sign>0?1:3));
 const tx=(frame%8)*tile,ty=(direction*2+Math.floor(frame/8))*tile;
 const depth=h.horizontal?span*.53:60+18*(1-height);
 const footY=h.horizontal?mid+span*.43:h.front+(sign>0?20:84);
 const lift=(h.horizontal?78:132)*height;
 c.save();
 // Undo the lane transform: water height always projects up the screen.
 if(!h.horizontal)c.transform(0,1,1,0,0,0);
 c.globalAlpha*=opacity;
 if(!breakerSheet?.naturalWidth){
  const footX=h.horizontal?h.front:mid;
  const fallback=c.createLinearGradient(0,footY-depth-lift,0,footY);
  fallback.addColorStop(0,'#deffff');fallback.addColorStop(.24,'#43bfc7');fallback.addColorStop(1,'#128d9e44');
  oval(c,footX,footY-(depth+lift)*.5,h.horizontal?45:span*.49,(depth+lift)*.5,fallback);
  c.restore();return;
 }
 // Project a vertical section of the water sheet. The foot stays on the floor.
 // Its lip first leans upstream, then overtakes the middle of the falling face.
 const bands=24,srcH=tile/bands;
 if(mirrored){c.translate(2*mid,0);c.scale(-1,1);}
 function rowY(upper){
  const projection=footY-depth*upper-lift*upper*(.72+.28*upper);
  if(h.horizontal)return projection;
  return projection+sign*reach*upper**2.6;
 }
 let previous=rowY(0);
 for(let row=bands-1;row>=0;row--){
  const upper=1-row/bands,center=upper-.5/bands,next=rowY(upper);
  const w=h.horizontal?111+43*height+43*turn*(1-center):span*(.99-.035*height*center);
  const x=h.horizontal?h.front-w*(sign>0?.84:.16)+sign*reach*center**2.6:mid-w/2;
  // Paint from the foot toward the lip so overturned water covers the hollow.
  const y=Math.min(next,previous),dh=Math.abs(next-previous)+.45;
  c.drawImage(breakerSheet,tx,ty+row*srcH,tile,srcH,x,y,w,dh);
  previous=next;
 }
 c.restore();
}
function tideCrest(c,h,laneStart,time,terrain,bounds,motion){
 const mid=laneStart+water.wet/2,sign=h.sign;
 const phase=(time-h.start)*1.15+.5+.5*Math.sin(laneStart*.071);
 const mirrored=!h.horizontal&&Math.round((laneStart-h.offset)/water.period)%2!==0;
 refractFloor(c,h,mid,phase,terrain,bounds);
 c.save();c.translate(h.front,mid);c.scale(sign,1);
 // A darkening trough anchors the rising wall. Its shadow contracts at impact.
 c.translate(-27-16*motion.height,0);c.scale(.72,1);
 const shade=c.createRadialGradient(0,0,3,0,0,water.wet*.5);
 shade.addColorStop(0,'rgba(5,62,76,'+(.16+.26*motion.height)+')');
 shade.addColorStop(.68,'#489ea02e');shade.addColorStop(1,'#76cdd600');
 oval(c,0,0,water.wet*.5,water.wet*.5,shade);
 c.restore();
 drawBreakerFace(c,h,mid,phase,motion,mirrored);
 c.save();c.translate(h.front,mid);c.scale(sign,1);
 root.FrontKrakenSwash.draw(c,{span:water.wet,phase,sign,horizontal:h.horizontal,
  fall:motion.fall,wash:motion.wash,impact:motion.impact});
 c.restore();
}
function tide(c,g,h,terrain){
 loadSurfArt();
 const bounds=g.bounds(),horizontal=h.horizontal,cross=horizontal?bounds.height:bounds.width;
 const pos=horizontal?g.camera.x:g.camera.y,view=g.viewport||{width:1200,height:860};
 const half=(horizontal?view.width:view.height)/2+40,left=pos-half,right=pos+half;
 const crossPos=horizontal?g.camera.y:g.camera.x,crossHalf=(horizontal?view.height:view.width)/2+50;
 const lo=Math.max(0,crossPos-crossHalf),hi=Math.min(cross,crossPos+crossHalf);
 const warning=g.time<h.start;
 // The warning stays on the approaching side while the breaker crosses a large map.
 const crestVisible=!warning&&h.front>=left-225&&h.front<=right+225;
 const warnLeft=warning||h.sign<0?left:Math.max(left,h.front+water.width);
 const warnRight=warning||h.sign>0?right:Math.min(right,h.front-water.width);
 if(!crestVisible&&warnRight<=warnLeft)return;
 const motion=crestVisible?water.motion(h):null;
 c.save();if(!horizontal)c.transform(0,1,1,0,0,0);
 for(let y=h.offset+Math.floor((lo-h.offset)/water.period)*water.period;y<hi;y+=water.period){
  const low=Math.max(0,y),high=Math.min(cross,y+water.wet);
  if(high<=lo||low>=high)continue;
  c.save();c.beginPath();c.rect(left,low,right-left,high-low);c.clip();
  if(warnRight>warnLeft){
   c.save();if(!warning)c.globalAlpha*=.48;
   c.beginPath();c.rect(warnLeft,low,warnRight-warnLeft,high-low);c.clip();
   tideWarning(c,warnLeft,warnRight,low,high,h,g.time);c.restore();
  }
  if(crestVisible)tideCrest(c,h,y,g.time,terrain,bounds,motion);
  c.restore();
 }
 c.restore();
}
function ground(c,g,terrain){
 for(const h of g.roomCampaign?.rotation?.hazards||[]){
  if(h.source?.hp<=0)continue;
  if(h.kind==='tide'){tide(c,g,h,terrain);continue;}
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
  c.save();c.translate(a.point.x,a.point.y);c.strokeStyle=root.FrontAssassinView.warningColor;c.lineWidth=3+charge*2;
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
root.FrontRotationView={kraken,ninja,ninjaBase,ground,air,event,figureScale};
})(window);
