/* Directional support toys, chance-skill presentation and bounded skill effects. */
(function(root){'use strict';
const motion=new WeakMap();
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const drumArt={
 file:'assets/support-toys/drum-rabbit-v20261109.webp',cell:229,height:78,
 anchors:[
  [[122.5,226],[118.5,223],[112.5,227],[111,224],[112,225],[108,225]],
  [[127,223],[126,224],[119.5,224],[116.5,225],[119,225],[113.5,225]],
  [[129.5,221],[129.5,224],[122.5,221],[125,224],[124.5,224],[119.5,224]],
  [[131,218],[128,220],[124.5,217],[118.5,220],[119,220],[110.5,220]],
  [[129,214],[122.5,214],[116,213],[115,214],[113.5,214],[111.5,214]]
 ]
};
const otterArt={
 file:'assets/support-toys/otter-fishing-v20261109.webp',cell:192,height:72,columns:8,rows:5,
 anchors:[
  [[100.5,181],[94,179],[93,182],[95.5,178],[97,178],[97.5,178],[91.5,178],[88.5,179]],
  [[102,175],[93,175],[91,175],[91,176],[97,175],[97,175],[89,176],[87.5,175]],
  [[97.5,178],[90.5,174],[94,175],[90,174],[93,174],[92.5,174],[85,175],[82.5,173]],
  [[85.5,176],[90,172],[93.5,173],[91,170],[94,173],[94,173],[88,173],[84.5,173]],
  [[90.5,171],[92.5,168],[93.5,168],[91.5,168],[95,171],[95,171],[91,172],[86.5,172]]
 ]
};
const sharkArt={file:'assets/support-toys/shark-breach-v20261109.webp',cell:304,columns:4,rows:4};
const waveArt={file:'assets/support-toys/tsunami-directions-v20261109.png',cell:181,columns:6,rows:8};
const jetArt={file:'assets/support-toys/water-jet-v20261109.webp',cell:384,columns:4,rows:2,edges:[[24,359],[21,361],[21,365],[23,369],[23,364],[21,369],[21,372],[21,375]]};
const turtleArt={
 file:'assets/support-toys/water-turtle-v20261109.webp',cell:224,height:78,columns:6,rows:5,
 muzzles:[[116,55],[165,49],[209,49],[202,35],[114,25]],
 anchors:[
  [[116,203],[116,203],[116,205],[116,204],[116,202],[117,202]],
  [[111,195],[112.5,189],[112.5,198],[112,193],[112,195],[111.5,196]],
  [[110,187],[109.5,184],[110,187],[111,186],[112,187],[112,187]],
  [[112.5,200],[112,199],[114,199],[112,202],[114.5,199],[114.5,199]],
  [[112.5,192],[113,187],[113,192],[113.5,190],[114.5,191],[114.5,191]]
 ]
};
const artAssets=new Map();
const squirrelArt={
 file:'assets/support-toys/ramjwi-thunder-v20261109.webp',cell:192,height:80,columns:8,rows:5,
 anchors:[
  [[117,186],[119,185],[117.5,185],[117,185],[117.5,185],[117.5,185],[117,185],[117.5,185]],
  [[120.5,181],[114,183],[120,180],[123,181],[121,181],[121,181],[119,181],[120,181]],
  [[123.5,179],[127,178],[126.5,179],[122,175],[127,179],[127,179],[124.5,179],[127,179]],
  [[123,176],[118,168],[127,178],[124.5,172],[124.5,176],[124.5,176],[123.5,176],[124.5,176]],
  [[102.5,175],[107,174],[110.5,175],[107.5,174],[108.5,175],[108.5,175],[108.5,175],[108.5,175]]
 ]
};
const cloudArt={file:'assets/support-toys/thundercloud-v20261109.webp',cell:384,columns:4,rows:2};
const characterArt={toyDrum:drumArt,toyDecoyMaker:otterArt,toyTurtle:turtleArt,toyStunner:squirrelArt};
function prepareArt(art){
 if(artAssets.has(art.file))return artAssets.get(art.file);
 const ImageType=root.Image||(typeof Image!=='undefined'?Image:null);
 if(!ImageType)return null;
 const image=new ImageType(),asset={image,ready:false};artAssets.set(art.file,asset);
 image.onload=()=>{asset.ready=image.naturalWidth===art.cell*(art.columns||6)&&image.naturalHeight===art.cell*(art.rows||5);};
 image.onerror=()=>{asset.ready=false;};image.src=art.file;return asset;
}
function character(c,u,time,m,facing){
 const art=characterArt[u.type],asset=prepareArt(art);
 if(u.type==='toyDecoyMaker')prepareArt(sharkArt);
 if(u.type==='toyTurtle'){prepareArt(waveArt);prepareArt(jetArt);}
 if(u.type==='toyStunner')prepareArt(cloudArt);
 if(!asset?.ready)return false;
 const step=TAU/8,wanted=facing-Math.PI/2;
 if(!Number.isFinite(m.spriteAngle)||Math.abs(Math.atan2(Math.sin(wanted-m.spriteAngle),Math.cos(wanted-m.spriteAngle)))>step/2+.10)m.spriteAngle=Math.round(wanted/step)*step;
 const direction=(Math.round(m.spriteAngle/step)%8+8)%8,row=[0,1,2,3,4,3,2,1][direction],flip=direction>0&&direction<4;
 const walking=u.hp>0&&m.weight>.15&&time-(m.lastMovedAt??-Infinity)<.1;
 const casting=u.type==='toyDecoyMaker'&&u.hp>0&&time<(u.toyActionUntil||0);
 const firing=u.type==='toyTurtle'&&u.hp>0&&time<(u.toyActionUntil||0);
 const charging=u.type==='toyStunner'&&u.hp>0&&time<(u.toyActionUntil||0);
 const tempo=u.type==='toyDrum'&&time<(u.toyBoostUntil||0)?(u.toyProcTier===2?8:6):4.4;
 let frame=4+Math.floor(time*tempo)%2;
 if(u.hp<=0)frame=4;
 else if(casting)frame=time-(u.toyActionStartedAt??time)<.18?6:7;
 else if(firing)frame=4+Math.floor((time-(u.toyActionStartedAt??time))*8)%2;
 else if(charging)frame=u.toyProcTier===2?7:6;
 else if(walking)frame=Math.floor((m.phase||0)*4)%4;
 const anchor=art.anchors[row][frame],scale=art.height/art.cell;
 m.spriteDirection=direction;m.spriteFrame=frame;m.walking=walking;
 c.save();if(flip)c.scale(-1,1);
 c.drawImage(asset.image,frame*art.cell,row*art.cell,art.cell,art.cell,-anchor[0]*scale,-anchor[1]*scale,art.height,art.height);
 c.restore();return true;
}
function oval(c,x,y,rx,ry,color,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.3;c.stroke();}}
function box(c,x,y,w,h,r,color,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();if(stroke){c.lineWidth=1.4;c.strokeStyle=stroke;c.stroke();}}
function line(c,points,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();for(const [i,p]of points.entries())i?c.lineTo(...p):c.moveTo(...p);c.stroke();}
function plastic(c,x,y,r,light,dark){const g=c.createRadialGradient(x-r*.35,y-r*.45,1,x,y,r*1.2);g.addColorStop(0,light);g.addColorStop(1,dark);return g;}
function key(c,x,y,t){c.save();c.translate(x,y);c.scale(.7+Math.abs(Math.sin(t*2))*.3,1);line(c,[[0,0],[8,0]],'#9e7b2d',4);oval(c,12,-4,5,4,'#d1b25b','#765b23');oval(c,12,4,5,4,'#d1b25b','#765b23');oval(c,12,-4,2.4,1.8,'#403b2d');oval(c,12,4,2.4,1.8,'#403b2d');c.restore();}
function lure(c,time){
 c.save();c.translate(0,Math.sin(time*5)*1.2);
 c.fillStyle='#dd7436';c.beginPath();c.moveTo(8,0);c.lineTo(18,-8);c.lineTo(17,8);c.closePath();c.fill();
 oval(c,0,0,12,8,plastic(c,-3,-2,15,'#ffe879','#d68d1e'),'#9c6932');oval(c,-6,-2,2,2.4,'#342b23');oval(c,-6.6,-2.8,.6,.7,'#fff8e9');
 line(c,[[4,-5],[7,-11]],'#ed9452',3);line(c,[[4,5],[7,10]],'#ed9452',3);oval(c,-13,0,2.5,2.5,'#00000000','#c6c8b4');
 line(c,[[-13,0],[-16,-11]],'#f5e6bf',.8);oval(c,-16,-14,3.2,4.5,'#f5e3b7');line(c,[[-18.5,-14],[-13.5,-14]],'#dc7652',2);c.restore();
}
function body(c,u,time,weight=0,back=false){const step=Math.sin((u.walk||0)*.8)*weight,beat=Math.sin(time*7),action=time<(u.toyActionUntil||0);if(u.type==='toyTurtle')key(c,23,9,time);
 if(u.type==='toyTurtle'){
  for(const side of [-1,1])for(const y of [-16,17]){oval(c,side*(22+step*(y>0?1:-1)*3),y+7+step*side*(y>0?1:-1)*3,10,7,'#2a5347','#173f35');oval(c,side*(22+step*(y>0?1:-1)*2),y+3+step*side*(y>0?1:-1)*3,9,6,plastic(c,side*22,y,12,'#a7d184','#548b60'),'#315e40');}
  oval(c,0,6,25,31,'#294e3c','#173e32');oval(c,0,0,25,30,plastic(c,-3,-8,37,'#acd27b','#38644c'),'#294e3a');oval(c,0,-2,20,25,'#6c9a5d','#c2db8b');
  c.strokeStyle='#3e734d';c.lineWidth=2;for(const y of [-12,4]){line(c,[[-18,y],[0,y-6],[18,y]],'#3e734d',2);}line(c,[[0,-25],[0,23]],'#3e734d',2);oval(c,-10,-13,6,8,'#b5d78b66');
  box(c,-13,-36,26,18,8,plastic(c,-4,-35,22,'#acd98f','#5b9663'),'#325f45');for(const side of [-1,1]){oval(c,side*9,-32,4,5,'#f1f6c3');oval(c,side*9,-34,2,3,'#233c37');}
  box(c,-8,-47,16,20,4,'#879fa5','#354b53');box(c,-6,-47,12,5,2,'#d6e8d9');oval(c,0,-48,6,3,'#203a48','#b6d9de');oval(c,0,-48,3,1.5,action?'#9feaff':'#64a2b2');
  box(c,-8,12,16,12,4,'#244f59','#a5c7bd');box(c,-5,14,10,7,2,'#6dc5da');
 }else if(u.type==='toyDrum'){
  // A matching rabbit remains visible while its directional sheet downloads.
  for(const side of [-1,1])oval(c,side*10,24+side*step*3,9,6,'#f1d8b1','#ad987c');
  box(c,-17,-13,34,34,7,'#74773c','#4c542d');
  for(const side of [-1,1]){c.save();c.translate(side*9,-50);c.rotate(side*.2);oval(c,0,0,6,16,'#f6dfb9','#baa786');oval(c,0,0,3,12,'#e9a080');c.restore();}
  oval(c,0,-32,18,17,plastic(c,-5,-37,25,'#fff0d4','#d5b994'),'#b19b7c');
  oval(c,-2,-47,16,6,'#b54e37','#863f2b');
  if(!back){for(const side of [-1,1])oval(c,side*6,-34,2,3,'#543e2d');oval(c,0,-28,2.5,1.8,'#df8c69');line(c,[[-5,-24],[0,-22],[5,-25]],'#73543d',1.3);}
  else{box(c,-13,-19,26,26,4,'#6f743b','#4c542d');key(c,0,-7,time);oval(c,0,15,5,5,'#f3dcb6');}
  if(!back){box(c,-21,-3,42,25,4,'#c96745','#765532');oval(c,0,-3,21,8,'#74773c','#4c542d');oval(c,0,-4,18,6,'#f4dfb9');oval(c,0,21,21,5,'#74773c');for(const x of [-14,0,14])line(c,[[x,1],[x,18]],'#c0b9a4',2);
   for(const side of [-1,1]){line(c,[[side*18,-19],[side*24,-9],[side*7,-5+beat*3]],'#ead3ae',5);line(c,[[side*7,-5+beat*3],[side*4,-12+beat*5]],'#f8e5c2',2);oval(c,side*4,-12+beat*5,3,3,'#f8e5c2');}}
 }else if(u.type==='toyDecoyMaker'){
  for(const side of [-1,1])oval(c,side*10,23+step*side*3,8,6,'#a9653c','#6d472f');
  oval(c,-18,15,14,5,'#985b35');box(c,-16,-12,32,34,5,'#65727a','#354d55');
  box(c,-19,-26,38,34,8,'#e7d5b0','#ad9a77');
  for(const side of [-1,1])box(c,side*10-6,-7,12,11,2,'#77804d','#536140');
  oval(c,0,-35,19,18,plastic(c,-4,-40,25,'#c98a58','#94572f'),'#815235');
  for(const side of [-1,1])oval(c,side*15,-48,5,5,'#ad6e40');
  if(!back){oval(c,0,-29,15,10,'#ead2a9');for(const side of [-1,1])oval(c,side*7,-39,3,3.5,'#31251b');oval(c,0,-32,4,3,'#4d2e1b');line(c,[[-5,-26],[0,-24],[5,-27]],'#6c4730',1.1);}
  line(c,[[-10,-12],[19,-51],[27,-57]],'#6e7c40',3);oval(c,-2,-21,7,7,'#e7d6ae','#697b49');
  line(c,[[27,-57],[29,-27]],'#f7e8cd',.8);c.save();c.translate(29,-24);c.scale(.55,.55);lure(c,time);c.restore();
 }else if(u.type==='toyStunner'){
  oval(c,-12,-30,19,31,plastic(c,-18,-40,35,'#c78451','#824a2c'),'#73462d');line(c,[[-20,-51],[-27,-34],[-24,-12],[-14,-4]],'#ebcea4',6);
  for(const side of [-1,1])oval(c,side*9,23+step*side*3,8,5,'#ac6d3e');
  oval(c,0,-1,18,25,'#b77744');oval(c,2,1,12,19,'#ebcea4');
  oval(c,0,-33,19,18,plastic(c,-5,-39,25,'#c88b55','#a56639'),'#865333');for(const side of [-1,1])oval(c,side*13,-47,5,7,'#b87945');
  if(!back){oval(c,1,-27,15,10,'#f0d9b4');for(const side of [-1,1])oval(c,side*7,-35,3,4,'#422a1a');oval(c,1,-29,3,2,'#68402a');line(c,[[-4,-23],[1,-21],[6,-24]],'#825038',1.2);for(const side of [-1,1])line(c,[[side*5,-47],[side*3,-40]],'#eed4aa',3);}
  box(c,-20,-4,9,17,3,'#73733b');box(c,-18,0,4,9,1,'#ffd877');
  for(const side of [-1,1]){const y=action?-29:-9;line(c,[[side*13,-10],[side*20,y]],'#b67541',7);oval(c,side*20,y,5,5,'#e4bc88');}
 }else lure(c,time);
}
function label(c,text,x,y,color='#e8e7c1'){c.font='700 10px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#203a36dd';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);}
function draw(c,u,g){if(u.type==='toyDecoy'&&(u.hp<=0||g.time<(u.toyArrivesAt||0)||g.time>=u.toyExpires)||u.toyRetired)return;const data=root.FrontSupportToys.toys[u.type],down=u.hp<=0;
 let m=motion.get(u);if(!m||g.time<m.time)m={x:u.x,y:u.y,time:g.time,weight:0,phase:0,heading:u.face??Math.PI/2};
 const dt=Math.max(0,g.time-m.time),dx=u.x-m.x,dy=u.y-m.y,travel=Math.hypot(dx,dy);if(dt>0){const moving=travel>.05&&travel<60;m.weight+=(Number(moving)-m.weight)*Math.min(1,dt*14);if(moving&&u.hp>0){m.phase=(m.phase+travel/64)%1;m.heading=Math.atan2(dy,dx);m.lastMovedAt=g.time;}m.x=u.x;m.y=u.y;m.time=g.time;}motion.set(u,m);
 c.save();c.translate(u.x,u.y);oval(c,5,5,u.type==='toyTurtle'?31:25,11,'#142e2845');oval(c,0,0,27,10,'#9bdef010',u.coopOwner===1?'#80c8ff88':'#d9edab77');
 c.save();if(down){c.globalAlpha=.4;c.rotate(.25);}
 const hasArt=!!characterArt[u.type];
 const facing=(g.time<(u.toyActionUntil||0)?u.toyActionFace??u.face:m.weight>.15?(hasArt?m.heading:u.toyBodyFace):undefined)??u.face??Math.PI/2;
 if(!hasArt||!character(c,u,g.time,m,facing)){
  c.translate(0,-24+Math.sin((u.walk||0)*.8)*1.5*m.weight);if(u.type==='toyTurtle'){c.scale(1,.8);c.rotate(facing+Math.PI/2);}else{const profile=.78+.22*Math.abs(Math.sin(facing)),flip=Math.cos(facing)<-.15?-1:1;c.scale(flip*profile,.95);}body(c,u,g.time,m.weight,u.type!=='toyTurtle'&&Math.sin(facing)<-.35);
 }c.restore();
 if(data){const top=hasArt?-88:-80;label(c,data.name,0,top-6,down?'#c2bbb0':'#f0e8b6');box(c,-21,top,42,4,2,'#213c37');box(c,-21,top,42*clamp(u.hp/Math.max(1,u.maxHp),0,1),4,2,'#9de4cb');
  if(down)label(c,'수리 '+Math.max(0,Math.ceil(u.toyDownUntil-g.time))+'초',0,-67,'#ffd5a0');
  else{
   const remaining=Math.max(0,(u.toyNextAt||0)-g.time);box(c,-16,15,32,3,1,'#213c37');box(c,-16,15,32*(1-clamp(remaining/data.cooldown,0,1)),3,1,'#e5ce86');
   if(u.type==='toyDrum'){
    const tier=g.time<(u.toyBoostUntil||0)?u.toyProcTier||0:0,color=tier===2?'#ffe075':tier===1?'#9be9f4':'#e7d691',period=tier ? .8 : 1.5,beat=(g.time%period)/period;
    c.globalAlpha=(1-beat)*(tier ? .65 : .4);oval(c,0,-8,30+beat*(tier?50:25),12+beat*(tier?20:10),'#e7cf710a',color);c.globalAlpha=1;
    for(let i=0;i<(tier?6:3);i++){const q=(g.time*(tier?1:.65)+i/(tier?6:3))%1;label(c,i%2?'♪':'♫',34+Math.sin(i*2.4+g.time)*8,-26-q*(tier?56:34),color);}
    if(tier)label(c,(tier===2?'대박':'강화')+' '+Math.ceil(u.toyBoostUntil-g.time)+'초',0,top-22,color);
   }else if(g.time<(u.toyHighlightUntil||0))label(c,u.toyProcTier===2?'대박!':'강화!',0,top-22,u.toyProcTier===2?'#ffe075':'#9be9f4');
  }
 }else label(c,'낚시 미끼',0,-48,'#ffe2a0');c.restore();}
function sheet(c,art,frame,x,y,width,height){
 const asset=prepareArt(art);if(!asset?.ready)return false;
 const column=frame%art.columns,row=Math.floor(frame/art.columns);
 c.drawImage(asset.image,column*art.cell,row*art.cell,art.cell,art.cell,x-width/2,y-height*.9,width,height);return true;
}
function shark(c,e,g){
 const age=Math.max(0,g.time-(e.startedAt??g.time-e.max+e.t)),q=clamp(age/e.max,0,.999),frame=Math.min(7,Math.floor(q*8)),large=e.tier===2,size=e.range*(large?1.45:1.8),color=large?'#ffe9a3':'#aff8ff';
 c.save();c.globalAlpha=clamp((1-q)*7);
 oval(c,e.x+4,e.y+8,size*.29,size*.10,'#183e4830');
 if(e.source?.hp>0&&!e.source.toyRetired){
  const face=e.angle||0,sx=e.source.x+Math.cos(face)*24,sy=e.source.y-50+Math.sin(face)*12,side=Math.cos(face)<0?-1:1;
  c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+e.x)/2,Math.min(sy,e.y-size*.55)-16,e.x+side*size*.22,e.y-size*(.1+Math.sin(q*Math.PI)*.48));c.strokeStyle='#fff0c4bb';c.lineWidth=1.1;c.stroke();
 }
 c.save();c.translate(e.x,e.y);if(Math.cos(e.angle||0)<0)c.scale(-1,1);
 if(!sheet(c,sharkArt,frame+(large?8:0),0,0,size,size)){oval(c,0,0,e.range*.7,26,'#5ad7e73b','#b6f7ff');lure(c,g.time);}
 c.restore();
 const impact=(age-.48)/.5;
 if(impact>=0&&impact<=1){c.save();c.globalAlpha=(1-impact)*.72;c.lineWidth=large?3:2;c.strokeStyle=color;c.beginPath();c.arc(e.x,e.y,e.range*(.3+.7*impact),0,TAU);c.stroke();c.restore();}
 label(c,large?'메갈로돈!':'상어!',e.x,e.y-size*.82,color);c.restore();
 // Keep the fisher in front when its feet are at the same or nearer depth.
 if(e.source?.hp>0&&!e.source.toyRetired&&e.source.y>=e.y-12)draw(c,e.source,g);
 return true;
}
function tsunami(c,e,g){
 const q=clamp(1-e.t/e.max,0,.999),direction=((Math.round(e.angle/(Math.PI/4))%8)+8)%8,frame=direction*6+Math.min(5,Math.floor(q*6));
 const width=e.range*(.76+.12*Math.sin(q*Math.PI)),distance=e.range*(.14+.62*(1-(1-q)**1.4)),x=e.x+Math.cos(e.angle)*distance,y=e.y+Math.sin(e.angle)*distance;
 c.save();c.globalAlpha=clamp((1-q)*5);
 // The upright crest has its own camera-relative view. A ground-cone clip cuts
 // off its height when firing toward the camera, so bound the sprite itself.
 if(!sheet(c,waveArt,frame,x,y,width,width*.85)){oval(c,x,y,width*.45,30,'#63dfed66','#e1ffff');}
 c.restore();return true;
}
function drumBoost(c,e){
 const q=clamp(1-e.t/e.max),color=e.tier===2?'#ffe688':'#9de9ff';
 c.save();c.translate(e.source?.x??e.x,e.source?.y??e.y);c.strokeStyle=color;
 for(let i=0;i<3;i++){const t=clamp(q-i*.13);c.globalAlpha=(1-t)*.43;c.lineWidth=2-i*.4;c.beginPath();c.arc(0,0,e.range*t,0,TAU);c.stroke();}
 for(let i=0;i<10;i++){const a=i*2.399963,d=22+q*85;c.globalAlpha=(1-q)*.85;label(c,i%2?'♪':'♫',Math.cos(a)*d,-25+Math.sin(a)*d*.35-q*55,color);}
 c.restore();return true;
}
function thunder(c,e,g){
 const targets=(e.targets||[]).filter(Boolean);if(!targets.length)return true;
 const q=clamp(1-e.t/e.max,0,.999),frame=Math.min(7,Math.floor(q*8)),width=clamp(Math.max(...targets.map(t=>t.x))-Math.min(...targets.map(t=>t.x))+140,180,480),cloudY=e.y-120;
 c.save();c.globalAlpha=clamp((1-q)*5);
 if(!sheet(c,cloudArt,frame,e.x,cloudY,width,width*.55)){
  for(let i=0;i<5;i++)oval(c,e.x+(i-2)*width*.14,cloudY-30-Math.sin(i)*8,width*.22,30,'#718593');
 }
 const age=e.max-e.t;
 for(const [i,t]of targets.entries()){
  const tx=t.x,ty=t.y-(t.visualFlightHeight||0)-22,sx=e.x+(i/(Math.max(1,targets.length-1))-.5)*width*.70,sy=cloudY-width*.14;
  if(q<.78){
   const points=[[sx,sy]];for(let j=1;j<7;j++)points.push([sx+(tx-sx)*j/7+Math.sin(j*2.7+i+age*35)*8,sy+(ty-sy)*j/7]);points.push([tx,ty]);
   line(c,points,'#f6bf4b55',12);line(c,points,'#ffdb76',5);line(c,points,'#fff9da',1.8);
  }
  oval(c,tx,t.y+2,15+Math.sin(age*15+i)*2,5,'#ffe1a924','#ffe6a1');label(c,'ϟ',tx,ty-20,'#fff0ad');
 }
 label(c,'람쥐 썬더!',e.x,cloudY-width*.42,'#ffe8a0');c.restore();return true;
}
function waterMuzzle(source,face){
 const asset=artAssets.get(turtleArt.file),pose=motion.get(source);
 if(!asset?.ready||!pose)return{x:source.x+Math.cos(face)*45,y:source.y-24+Math.sin(face)*36};
 const direction=pose.spriteDirection??(Math.round((face-Math.PI/2)/(TAU/8))%8+8)%8,row=[0,1,2,3,4,3,2,1][direction],flip=direction>0&&direction<4,frame=pose.spriteFrame??4;
 const anchor=turtleArt.anchors[row][frame],point=turtleArt.muzzles[row],scale=turtleArt.height/turtleArt.cell;
 return{x:source.x+(point[0]-anchor[0])*scale*(flip?-1:1),y:source.y+(point[1]-anchor[1])*scale};
}
function waterJet(c,e,g,x,y,tx,ty){
 const asset=prepareArt(jetArt);if(!asset?.ready)return false;
 const dx=tx-x,dy=ty-y,length=Math.hypot(dx,dy),frame=Math.floor(g.time*18)%4+(e.tier?4:0),column=frame%4,row=Math.floor(frame/4),height=Math.max(60,Math.min(180,length*.48));
 c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));
 const edge=jetArt.edges[frame];
 c.drawImage(asset.image,column*jetArt.cell+edge[0],row*jetArt.cell,edge[1]-edge[0],jetArt.cell,0,-height*.52,length,height);
 c.restore();return true;
}
function event(c,e,g){
 if(e.kind==='toyShark')return shark(c,e,g);
 if(e.kind==='toyTsunami')return tsunami(c,e,g);
 if(e.kind==='toyDrumBoost')return drumBoost(c,e);
 if(e.kind==='toyThunder')return thunder(c,e,g);
 if(!['toyWater','toyZap','toyDecoyDrop'].includes(e.kind))return false;
 const k=clamp(e.t/e.max,0,1),face=e.angle??e.source?.toyActionFace??e.source?.face??0,from=e.from||e.source;
 const nozzle=e.kind==='toyWater'&&from?waterMuzzle(from,face):e.kind==='toyZap'&&from===e.source&&from?{x:from.x+Math.cos(face)*14,y:from.y-34+Math.sin(face)*6}:null;
 const x=nozzle?.x??from?.x??e.x,y=nozzle?.y??((from?.y??e.y)+(e.kind==='toyZap'?(from===e.source?-70:-22):-35)),t=e.target,tx=t?.x??e.tx??e.x,ty=(t?.y??e.ty??e.y)-(t?.visualFlightHeight??0)-22;
 c.save();c.globalAlpha=k;
 if(e.kind==='toyWater'){
  if(e.tier!==2){
   if(!waterJet(c,e,g,x,y,tx,ty))for(const [width,color]of [[21,'#249ac855'],[12,'#77d9f3bb'],[4,'#e2ffff']])line(c,[[x,y],[x+(tx-x)*.35,y+(ty-y)*.35-12],[tx,ty]],color,width*(e.tier?1.6:1));
   for(let i=0;i<8;i++){const q=((1-k)*2+i/8)%1,dx=x+(tx-x)*q+Math.sin(i*2.4)*6,dy=y+(ty-y)*q-Math.sin(q*Math.PI)*12;oval(c,dx,dy,2.2,1.4,'#c4f8ff');}
  }
  oval(c,tx,ty,14*(1-k)+4,8,'#9beaf122','#c9faff');for(let i=0;i<8;i++){const a=i*TAU/8,r=(1-k)*32;oval(c,tx+Math.cos(a)*r,ty+Math.sin(a)*r*.5,2,1.3,'#c9faff');}
 }else if(e.kind==='toyZap'){
  if(k>.5&&!e.storm){const points=[[x,y]];for(let i=1;i<7;i++)points.push([x+(tx-x)*i/7+Math.sin(i*3+g.time*50)*6,y+(ty-y)*i/7+Math.cos(i*2+g.time*40)*6]);points.push([tx,ty]);line(c,points,'#f4b94866',e.tier?10:7);line(c,points,'#ffe28c',e.tier?3:2);line(c,points,'#fffbe1',1);}
  for(let i=0;i<3;i++){const a=g.time*5+i*TAU/3;label(c,'ϟ',tx+Math.cos(a)*20,ty-24+Math.sin(a)*7,'#ffe9a2');}
 }else{
  const progress=clamp((e.max-e.t)/.35),lx=x+(e.x-x)*progress,ly=y+(e.y-y)*progress-Math.sin(progress*Math.PI)*65;
  c.beginPath();c.moveTo(x,y-15);c.quadraticCurveTo((x+lx)/2,Math.min(y,ly)-20,lx,ly);c.strokeStyle='#fff2c4cc';c.lineWidth=.9;c.stroke();
  if(progress<1){c.save();c.translate(lx,ly);c.scale(.8,.8);lure(c,g.time);c.restore();}
  oval(c,e.x,e.y,18+(1-k)*25,8+(1-k)*12,'#8ae7ec18',e.tier===2?'#ffe4a3':'#a7f2f2');
 }
 c.restore();return true;}
root.FrontSupportToyView={draw,event,motionPose:u=>motion.get(u)};
})(window);
