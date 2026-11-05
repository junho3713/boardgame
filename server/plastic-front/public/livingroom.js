/* Code-native room props: the visible footprint is the same rectangle used by navigation. */
(()=>{'use strict';
const rr=(c,x,y,w,h,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}},ellipse=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();};
function fallbackFurniture(c,o){const {x,y,w,h,kind}=o;c.save();c.shadowColor='#30231e70';c.shadowBlur=24;c.shadowOffsetX=16;c.shadowOffsetY=24;rr(c,x,y,w,h,16,'#403a32');c.shadowColor='transparent';
 const gradient=c.createLinearGradient(x,y,x+w,y+h);gradient.addColorStop(0,'#ffffff30');gradient.addColorStop(.45,'#ffffff00');gradient.addColorStop(1,'#11151940');
 if(kind==='sofa'||kind==='cushion'){
  rr(c,x,y,w,h,kind==='sofa'?22:32,o.color);rr(c,x+10,y+7,w-20,h-20,18,gradient,'#dfd8c34a');
  if(kind==='sofa'){rr(c,x+15,y+10,w-30,h*.28,18,'#909b8b');for(let i=0;i<3;i++){const bw=(w-90)/3;rr(c,x+42+i*(bw+3),y+h*.33,bw,h*.55,14,'#879281','#d8deca33');}for(const sx of [x+6,x+w-40])rr(c,sx,y+16,34,h-30,14,'#98a18e');}
  else{rr(c,x+14,y+14,w-28,h-28,25,null,'#ead4b888');for(let i=0;i<7;i++){c.strokeStyle='#efd5b72b';c.beginPath();c.moveTo(x+20+i*32,y+17);c.lineTo(x+20+i*32,y+h-16);c.stroke();}}
 }else if(kind==='table'||kind==='cabinet'){
  rr(c,x+8,y+8,w-16,h-16,10,o.color);rr(c,x+8,y+8,w-16,h-16,10,gradient,'#e2c49c80');
  for(let i=0;i<18;i++){c.strokeStyle=i%3?'#e7c39328':'#573c2928';c.lineWidth=1+i%3;c.beginPath();c.moveTo(x+12,y+18+i*(h-36)/18);c.bezierCurveTo(x+w*.25,y+i*(h-36)/18,x+w*.7,y+30+i*(h-36)/18,x+w-12,y+20+i*(h-36)/18);c.stroke();}
  if(kind==='cabinet'){for(let i=1;i<4;i++){c.fillStyle='#4c362a66';c.fillRect(x+i*w/4,y+30,2,h-50);rr(c,x+i*w/4-30,y+h*.56,15,6,3,'#cfb184');}rr(c,x+w*.22,y+15,w*.56,h*.38,8,'#202a2c','#687777');const screen=c.createLinearGradient(x,y,x+w,y+h);screen.addColorStop(0,'#657f8833');screen.addColorStop(1,'#15272ccc');rr(c,x+w*.23,y+20,w*.54,h*.31,5,screen);}
  else{ellipse(c,x+w*.73,y+h*.38,45,34,'#4a30233a');ellipse(c,x+w*.72,y+h*.35,42,31,'#e0d9bf');ellipse(c,x+w*.72,y+h*.35,33,24,'#8e7353');ellipse(c,x+w*.72,y+h*.35,24,17,'#493a2d');}
 }else if(kind==='remote'){
  c.save();c.translate(x,y);c.scale(w/112,h/270);rr(c,0,0,112,270,12,'#1c201f','#68716b');rr(c,5,4,102,260,9,'#303532');ellipse(c,28,25,12,10,'#922d30');ellipse(c,83,25,12,10,'#161c1a');
  for(let row=0;row<5;row++)for(let col=0;col<3;col++)ellipse(c,29+col*27,53+row*19,9,7,'#111715');ellipse(c,56,176,36,30,'#111715');ellipse(c,56,176,16,13,'#4a534c');
  for(let i=0;i<4;i++)ellipse(c,24+i*22,239,8,7,['#b94640','#58a565','#c0a649','#4789af'][i]);c.restore();
 }else{rr(c,x,y,w,h,Math.min(w,h)*.4,'#697c78');rr(c,x+12,y+18,w-24,h-35,Math.min(w,h)*.35,'#a3b2a8');rr(c,x+9,y+h*.15,w-18,h*.38,32,'#718b85');rr(c,x+20,y+h*.18,w-40,h*.28,25,gradient,'#bfcbc177');}
 c.restore();}
const assets=new Map(),fieldAssets=new Map();let failures=0;
// The same approved, shadowed mechanical-pencil asset used on the desk.
const floorPencil=new Image();let floorPencilLoaded=false;
const floorPencilReady=new Promise(resolve=>{floorPencil.onload=()=>{floorPencilLoaded=true;resolve();window.dispatchEvent(new Event('front-room-art-ready'));};floorPencil.onerror=()=>{failures++;resolve();};});
floorPencil.src='assets/desktop/mechanical-pencil-shadowed.png';
// Approved wood image, projected onto the same flat world plane as the furniture.
const floorWood=new Image();let floorWoodLoaded=false,floorWoodTile=null;
const floorWoodReady=new Promise(resolve=>{floorWood.onload=()=>{floorWoodTile=document.createElement('canvas');floorWoodTile.width=floorWood.naturalWidth*2;floorWoodTile.height=floorWood.naturalHeight*2;const c=floorWoodTile.getContext('2d');for(let row=0;row<2;row++)for(let col=0;col<2;col++){c.save();c.translate(col?floorWoodTile.width:0,row?floorWoodTile.height:0);c.scale(col?-1:1,row?-1:1);c.drawImage(floorWood,0,0);c.restore();}floorWoodLoaded=true;resolve();window.dispatchEvent(new Event('front-room-art-ready'));};floorWood.onerror=()=>{failures++;resolve();};});
floorWood.src='assets/room/floor-toy-oak-soft-seams-v104.webp';
const fieldReady=fetch('assets/field/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('field');return r.json();}).then(m=>Promise.all(Object.entries(m.models).map(([key,s])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{fieldAssets.set(key,{...s,image:im});resolve();};im.onerror=()=>{failures++;resolve();};im.src='assets/field/'+s.file+'?v='+m.version;})))).catch(()=>{failures++;});
function field(c,key,x=0,y=0,angle=0,frame=0){const s=fieldAssets.get(key);if(!s)return false;const n=s.directions,i=((Math.round(angle/(Math.PI*2)*n)%n)+n)%n,z=s.scale||1,index=i+Math.max(0,Math.min((s.frames||1)-1,frame))*n;c.drawImage(s.image,(index%s.columns)*s.cell,Math.floor(index/s.columns)*s.cell,s.cell,s.cell,x-s.anchorX*z,y-s.anchorY*z,s.cell*z,s.cell*z);return true;}
function projectile(c,x,y,angle,kind,team=0){return field(c,(kind==='missile'?'missile':'shell')+(team===0?'':'-enemy'),x,y,Math.atan2(Math.sin(angle)/.8,Math.cos(angle)));}
const ready=fetch('assets/room/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('room');return r.json();}).then(m=>Promise.all(Object.entries(m.models).map(([key,s])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{assets.set(key,{...s,image:im});resolve();};im.onerror=()=>{failures++;resolve();};im.src='assets/room/'+s.file+'?v='+m.version;})))).catch(()=>{failures++;});
function furniture(c,o,opacity=1){const key=o.kind==='sofa'&&o.label==='암체어'?'armchair':o.kind,s=assets.get(key);c.save();c.globalAlpha=opacity;if(s){if(key==='remote'&&s.source==='uploaded'&&!s.bakedShadow){c.shadowColor='#15221d66';c.shadowBlur=4;c.shadowOffsetX=3;c.shadowOffsetY=6;}const fit=s.uniformFit?Math.min(o.w/s.footprintW,o.h/s.footprintH):null,sx=fit??o.w/s.footprintW,sy=fit??o.h/s.footprintH;c.drawImage(s.image,o.x+o.w/2-s.anchorX*sx,o.y+o.h/2-s.anchorY*sy,s.width*sx,s.height*sy);}else fallbackFurniture(c,o);c.restore();}
function depth(o){return o.y+o.h;}
function furnitureOpacity(o,units){
 if(o.kind!=='table'){const k=o.kind==='sofa'&&o.label==='암체어'?'armchair':o.kind,s=assets.get(k),customCover=s?.bodyBounds?Math.max(0,(s.anchorY-s.footprintH/2-s.bodyBounds[1])*Math.min(o.w/s.footprintW,o.h/s.footprintH)):null,cover=customCover??({plant:280,lamp:420,books:90,blocks:110,remote:65,cushion:110,slipper:110}[o.kind]||440);return units.some(u=>u.hp>0&&u.x>o.x-20&&u.x<o.x+o.w+20&&u.y<o.y&&u.y>o.y-cover)?.48:1;}
 const spec=assets.get('table'),lift=(spec?.surfaceLift??235.2)*o.h/(spec?.footprintH||360);
 return units.some(u=>{if(u.hp<=0)return false;const r=u.r||(['tank','guntruck'].includes(u.type)?28:14),under=u.y+r>o.y&&u.y-r<o.y+o.h,covered=u.y>o.y-lift&&u.y-55<o.y+o.h-lift;return u.x+r>o.x&&u.x-r<o.x+o.w&&(under||covered);})?.3:1;
}
function furnitureVisible(o,camera,halfW,halfH){return o.x+o.w+180>camera.x-halfW&&o.x-180<camera.x+halfW&&o.y+o.h+200>camera.y-halfH&&o.y-550<camera.y+halfH;}
function wovenRug(c,r,rand){
 // Broad felt shapes read as a miniature play mat at the gameplay camera height.
 const {x,y,w,h,color,trim}=r;c.save();c.shadowColor='#51433538';c.shadowBlur=16;c.shadowOffsetX=5;c.shadowOffsetY=10;
 rr(c,x,y+7,w,h,29,'#465e5b');c.shadowColor='transparent';rr(c,x,y,w,h-3,29,trim);
 const face=c.createLinearGradient(x,y,x+w*.45,y+h);face.addColorStop(0,color);face.addColorStop(1,r.shade||'#719491');rr(c,x+12,y+10,w-24,h-28,23,face);
 c.lineWidth=3;rr(c,x+29,y+26,w-58,h-60,17,null,'#f6ead258');c.lineWidth=9;rr(c,x+48,y+45,w-96,h-98,13,null,trim+'66');
 // Sparse quilting; no noisy fibers or frayed edge that competes with the units.
 for(let py=y+120;py<y+h-80;py+=130)for(let px=x+110;px<x+w-80;px+=150){c.fillStyle='#fff5df0c';rr(c,px,py,62,35,14,'#fff5df0c');}
 c.setLineDash([7,10]);c.lineWidth=2;c.strokeStyle='#f9efd18a';rr(c,x+20,y+18,w-40,h-44,21,null,c.strokeStyle);c.setLineDash([]);
 const motif=(px,py,sz)=>{c.save();c.translate(px,py);c.rotate(Math.PI/4);rr(c,-sz/2,-sz/2,sz,sz,sz*.2,trim+'30');rr(c,-sz*.24,-sz*.24,sz*.48,sz*.48,sz*.1,null,trim+'70');c.restore();};
 for(let py=y+180;py<y+h-120;py+=240)for(let px=x+190;px<x+w-120;px+=280)motif(px,py,52);
 c.restore();
}
function toyFloorboard(c,x,y,w,h,col,rand){
 // Rounded, softly bevelled lacquered toy wood. All detail is baked only once.
 rr(c,x+1,y+3,w-2,h-2,9,'#9c7c584f');
 const face=c.createLinearGradient(x,y,x,y+h);face.addColorStop(0,'#f3d5ac');face.addColorStop(.06,col);face.addColorStop(.82,col);face.addColorStop(1,'#c39b6c');
 rr(c,x+3,y+3,w-6,h-6,8,face);c.lineWidth=2;rr(c,x+5,y+5,w-10,h-10,7,null,'#ffeac34d');
 c.lineCap='round';
 for(let i=0;i<3;i++){const yy=y+29+i*(h-43)/3+rand()*6,start=x+35+rand()*60,end=x+w-35-rand()*70;c.lineWidth=i===1?2.8:1.7;c.strokeStyle=i===1?'#a77b4d26':'#fff0ce40';c.beginPath();c.moveTo(start,yy);c.bezierCurveTo(start+w*.22,yy-9,start+w*.49,yy+8,end,yy+2);c.stroke();}
 if(rand()>.76){const kx=x+w*(.25+rand()*.5),ky=y+h*.53;c.lineWidth=2;c.strokeStyle='#ab80501f';c.beginPath();c.ellipse(kx,ky,22,5,0,0,Math.PI*2);c.stroke();}
 c.lineCap='butt';
}
function windowLight(c,w,y,length){
 c.save();const g=c.createLinearGradient(w,y,w-1100,y+600);g.addColorStop(0,'#fff5cb30');g.addColorStop(.7,'#ffe4ad16');g.addColorStop(1,'#ffe4ad00');c.fillStyle=g;
 for(let row=0;row<3;row++)for(let col=0;col<2;col++){const yy=y+row*length/3,span=length/3-22,shift=col*440;c.beginPath();c.moveTo(w-32-shift,yy+shift*.5);c.lineTo(w-445-shift,yy+215+shift*.5);c.lineTo(w-445-shift,yy+215+span+shift*.5);c.lineTo(w-32-shift,yy+span+shift*.5);c.closePath();c.fill();}
 rr(c,w-28,y-35,23,length+70,3,'#d6c6a5','#f8e7c6');rr(c,w-24,y-20,8,length+40,2,'#8a9b93');
 for(let i=0;i<4;i++){c.fillStyle='#efe0be';c.fillRect(w-30,y+i*length/3-8,26,12);}c.restore();
}
function terrain(c,game){
 const {width:w,height:h}=game.bounds();let seed=42;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 c.fillStyle='#c6a276';c.fillRect(0,0,w,h);
 const plankW=670,plankH=178,colors=['#dfbd91','#e4c59b','#d9b68a','#e8cba3','#ddba90'];
 if(floorWoodLoaded){const pattern=c.createPattern(floorWoodTile,'repeat');if(pattern){const sx=1600/floorWood.naturalWidth,sy=1060/floorWood.naturalHeight;let sourceY=0;c.fillStyle=pattern;for(let y=0;y<h;y+=8){const depth=.9+.2*y/h,band=Math.min(8,h-y);pattern.setTransform(new DOMMatrix([sx*depth,0,0,sy*depth,w/2*(1-depth),y-sourceY*sy*depth]));c.fillRect(0,y,w,band);sourceY+=band/(sy*depth);}}}
 else for(let y=0,row=0;y<h;y+=plankH,row++)for(let x=-(row%3)*plankW/3;x<w;x+=plankW)toyFloorboard(c,x,y,plankW,plankH,colors[Math.floor(rand()*colors.length)],rand);
 wovenRug(c,{x:900*w/2400,y:2990*h/4200,w:1030,h:850,color:'#86aaa3',shade:'#71958f',trim:'#ead8b3'},rand);
 wovenRug(c,{x:650*w/2400,y:920*h/4200,w:1450,h:1050,color:'#a4b8b9',shade:'#8ca7aa',trim:'#ebddbe'},rand);
 // Flat paper and the mechanical pencil are traversable details beside the reading area.
 c.save();c.translate(695*w/2400,3665*h/4200);c.rotate(.13);c.shadowColor='#392d2633';c.shadowBlur=7;c.shadowOffsetY=4;rr(c,-58,-42,116,84,2,'#d6c9a5');c.shadowColor='transparent';rr(c,-49,-32,32,25,1,'#798f84');for(let i=0;i<5;i++){c.fillStyle='#9e997c66';c.fillRect(i<3?-8:-48,-30+i*12,i<3?49:89,2);}c.restore();
 // Keep the small floor decoration traversable and in its original position/orientation.
 if(floorPencilLoaded){c.save();c.translate(1800*w/2400,3160*h/4200);c.rotate(-Math.PI/3);const pw=224,ph=pw*floorPencil.naturalHeight/floorPencil.naturalWidth;c.drawImage(floorPencil,-pw/2,-ph/2,pw,ph);c.restore();}
 // Low-contrast cable hugs the wall; it never adds a collision body.
 c.strokeStyle='#473e324a';c.lineWidth=5;c.beginPath();c.moveTo(2030*w/2400,1050*h/4200);c.bezierCurveTo(2335*w/2400,1110*h/4200,2270*w/2400,1500*h/4200,2340*w/2400,1740*h/4200);c.stroke();c.strokeStyle='#c6b08c55';c.lineWidth=1.2;c.stroke();
 const wash=c.createLinearGradient(0,0,w,h);wash.addColorStop(0,'#fff2d51c');wash.addColorStop(.55,'#f1d4a100');wash.addColorStop(1,'#607d7510');c.fillStyle=wash;c.fillRect(0,0,w,h);
 windowLight(c,w,2980*h/4200,630);windowLight(c,w,1030*h/4200,620);
 for(const lamp of game.obstacles.filter(o=>o.kind==='lamp')){const x=lamp.x+lamp.w/2,y=lamp.y+lamp.h/2,g=c.createRadialGradient(x,y,12,x,y,310);g.addColorStop(0,'#f9d68c24');g.addColorStop(1,'#f9d68c00');c.fillStyle=g;c.fillRect(x-310,y-310,620,620);}
 // Bevelled skirting, edge ambient occlusion and two quiet wall panels.
 for(const x of [0,w-27]){const g=c.createLinearGradient(x,0,x+27,0);g.addColorStop(0,'#b3936c');g.addColorStop(.4,'#dfc69f');g.addColorStop(.6,'#f4dfbb');g.addColorStop(1,'#bb9970');rr(c,x,0,27,h,2,g);}
 for(const side of [0,1]){const x=side?w-115:27,g=c.createLinearGradient(x,0,x+88,0);g.addColorStop(side?1:0,'#302a2336');g.addColorStop(side?0:1,'#302a2300');c.fillStyle=g;c.fillRect(x,0,88,h);}
 rr(c,27,0,w-54,45,6,'#ceb28a');c.fillStyle='#f0dbb6';c.fillRect(27,41,w-54,3);
}
function gardenTerrain(c){
 let seed=816;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};c.save();
 // Broken canopy shadows and small flowers are baked once, away from the path.
 for(let i=0;i<46;i++){const right=i%2,x=right?1470+rand()*140:rand()*130,y=rand()*2800;c.save();c.translate(x+55,y+45);c.scale(1.25,.55);c.rotate(-.55);c.shadowColor='#27433420';c.shadowBlur=18;ellipse(c,0,0,35+rand()*65,20+rand()*40,'#304d3415');c.restore();}
 for(let i=0;i<64;i++){const side=i%2,x=side?1380+rand()*150:70+rand()*140,y=60+rand()*2660;c.strokeStyle='#576e3f77';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y+7);c.quadraticCurveTo(x-3,y-4,x+2,y-10);c.stroke();for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ellipse(c,x+2+Math.cos(a)*3.2,y-10+Math.sin(a)*3.2,2.5,2,i%3?'#e6d8a9b0':'#bf957fad');}ellipse(c,x+2,y-10,1.8,1.8,'#c1a058');}
 // Old wooden edge gets endgrain, nailheads, weathered moss and contact shade.
 for(const x of [10,1593])for(let y=75;y<2800;y+=265){ellipse(c,x+2,y+2,3.5,3,'#413e2c77');ellipse(c,x,y,2.5,2,'#c3b18a');for(let i=0;i<6;i++)ellipse(c,x+(rand()-.5)*13,y+15+rand()*210,2+rand()*4,2,'#62764955');}
 c.restore();
}
function repairRobot(c,b,time){
 if(b.repairing&&b.repairPatient?.hp>0){const t=b.repairPatient,dx=t.x-b.x,dy=t.y-b.y;c.save();c.strokeStyle='#8fe6b877';c.lineWidth=5;c.beginPath();c.moveTo(0,-15);c.lineTo(dx,dy-7);c.stroke();c.strokeStyle='#e8ffcd';c.lineWidth=1.5;c.stroke();for(let i=0;i<3;i++){const p=(time*1.8+i/3)%1;ellipse(c,dx*p,-15+(dy+8)*p,2.4,2.4,'#dfffbd');}c.restore();}
 const travel=b.repairEvadeGoal||b.repairGoal,walking=travel&&Math.hypot(travel.x-b.x,travel.y-b.y)>5,frame=b.repairing?3:walking?1+Math.floor(b.walk||0)%2:0;
 if(!field(c,'repairBot',0,0,b.face||0,frame)){
 ellipse(c,3,6,22,11,'#1b302b55');c.save();c.rotate((b.face||0)+Math.PI/2);
 for(const side of [-1,1]){rr(c,side*15-5,-11,10,25,4,'#293f3a','#6c8172');for(let i=0;i<4;i++)rr(c,side*15-4,-8+i*5,8,2,1,'#7d9180');}
 const body=c.createLinearGradient(-14,-20,14,10);body.addColorStop(0,'#d8e7bb');body.addColorStop(.45,'#92b58c');body.addColorStop(1,'#456a59');rr(c,-13,-18,26,30,6,body,'#baceac');rr(c,-10,3,20,7,3,'#3d6050');
 rr(c,-9,-23,18,14,4,'#dbe9ca','#7a9c84');rr(c,-6,-21,12,6,2,'#253f3d');ellipse(c,-2,-18,2,2,'#a9f6e3');ellipse(c,3,-18,2,2,'#a9f6e3');
 c.strokeStyle='#566f5b';c.lineWidth=3;c.beginPath();c.moveTo(10,-6);c.lineTo(22,-13);c.lineTo(24,-24);c.stroke();rr(c,20,-29,8,8,2,b.repairing?'#9aeda6':'#95b9a1');
 c.fillStyle='#f3f3da';c.fillRect(-2,-6,4,12);c.fillRect(-6,-2,12,4);c.restore();
 }
 c.font='9px sans-serif';c.textAlign='center';c.fillStyle=b.repairing?'#dff2b1':'#c7d9c0';c.fillText(b.repairing?'수리 중':b.repairEvadeGoal?'위험 회피':walking?'수리 지점 이동':b.repairAnchor?'건물 옆 대기':'건물 대기',0,29);
}
function building(c,b,time){const assembling=b.buildUntil>time,progress=Math.max(0,Math.min(1,(time-b.buildAt)/(b.buildUntil-b.buildAt))),x=b.x,y=b.y;c.save();c.translate(x,y);c.shadowColor='#172e2555';c.shadowBlur=9;c.shadowOffsetY=8;if(b.kind!=='repairBot'&&(!fieldAssets.has(b.kind)||b.hp<=0))rr(c,-b.w/2,-b.h/2,b.w,b.h,6,b.hp>0?'#465d43':'#656352');c.shadowColor='transparent';if(b.hp<=0){if(b.kind==='repairBot')rr(c,-11,-7,22,14,4,'#59665a');c.restore();return;}
 c.globalAlpha=assembling?.35+.55*progress:1;
 if(b.kind==='repairBot')repairRobot(c,b,time);
 else if(field(c,b.kind,0,0,b.face||0)){}
 else if(b.kind==='barricade'){for(let i=0;i<5;i++){rr(c,-50+i*20,-17,19,34,6,i%2?'#4c8053':'#659962','#b2dea277');}c.fillStyle='#355d40';c.fillRect(-49,-3,99,4);}
 else if(b.kind==='repair'){rr(c,-35,-38,70,66,7,'#7c9666','#c0cba5');rr(c,-22,-25,44,37,4,'#536c49');c.fillStyle='#e3e2b8';c.fillRect(-4,-24,8,32);c.fillRect(-16,-12,32,8);rr(c,-24,19,48,7,2,'#83b47d');}
 else if(b.kind==='missileBase'){ellipse(c,0,0,30,22,'#334b3b');c.save();c.rotate(b.face+Math.PI/2);rr(c,-25,-42,50,55,4,'#769060','#bec7a2');for(const x of [-13,13]){rr(c,x-8,-46,16,43,3,'#304638');ellipse(c,x,-44,7,5,'#c9d0b3');}c.restore();}
 else{rr(c,-27,-25,54,48,6,'#78935e','#afbe91');ellipse(c,0,-4,19,15,'#405d42');c.save();c.rotate(b.face+Math.PI/2);for(const x of [-9,9])rr(c,x-3,-46,6,46,2,'#344c38');rr(c,-11,-13,22,20,4,'#92aa70');c.restore();}
 c.globalAlpha=1;c.fillStyle='#23372a';c.fillRect(-b.w/2,-b.h/2-48,b.w,5);c.fillStyle=assembling?'#8fe39c':'#a4dfa3';c.fillRect(-b.w/2,-b.h/2-48,b.w*(assembling?progress:b.hp/b.maxHp),5);if(assembling){c.font='11px sans-serif';c.textAlign='center';c.fillStyle='#c5f3ba';c.fillText('조립 중',0,b.h/2+17);}c.restore();}
window.FrontLivingRoom={terrain,gardenTerrain,furniture,building,field,projectile,depth,furnitureOpacity,furnitureVisible,ready:Promise.all([ready,fieldReady,floorPencilReady,floorWoodReady]),diagnostics:()=>({loaded:assets.size,field:fieldAssets.size,floor:floorWoodLoaded,failures})};
})();
