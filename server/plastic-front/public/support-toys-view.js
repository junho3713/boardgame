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
const sharkWaterArt={file:'assets/support-toys/pixelfx/shark-water-v20261114.png',cell:176,frameHeight:100,columns:7,rows:11};
const finArt={file:'assets/support-toys/shark-fin-v20261109.png',cell:313.5,columns:4,rows:4};
const baitArt={file:'assets/support-toys/fishing-bait-v20261110.png',cell:256,columns:1,rows:1};
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
const currentArt={file:'assets/support-toys/pixelfx/ramjwi-current-v20261114b.png',cell:144,frameHeight:112,columns:4,rows:4};
const characterArt={toyDrum:drumArt,toyDecoyMaker:otterArt,toyTurtle:turtleArt,toyStunner:squirrelArt};
function prepareArt(art){
 if(artAssets.has(art.file))return artAssets.get(art.file);
 const ImageType=root.Image||(typeof Image!=='undefined'?Image:null);
 if(!ImageType)return null;
 const image=new ImageType(),asset={image,ready:false};artAssets.set(art.file,asset);let settled;asset.loading=new Promise(resolve=>{settled=resolve;});
 image.onload=()=>{asset.ready=image.naturalWidth===art.cell*(art.columns||6)&&image.naturalHeight===(art.frameHeight||art.cell)*(art.rows||5);settled(asset.ready);};
 image.onerror=()=>{asset.ready=false;settled(false);};image.src=art.file;return asset;
}
function character(c,u,time,m,facing){
 const art=characterArt[u.type],asset=prepareArt(art);
 if(u.type==='toyDecoyMaker'){prepareArt(sharkArt);prepareArt(finArt);prepareArt(baitArt);prepareArt(sharkWaterArt);}
 if(u.type==='toyTurtle'){prepareArt(waveArt);prepareArt(jetArt);}
 if(u.type==='toyStunner'){prepareArt(cloudArt);prepareArt(currentArt);}
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
function lure(c,time,hits=0){
 c.save();c.translate(0,Math.sin(time*5)*1.2);
 const asset=prepareArt(baitArt);
 if(asset?.ready){
  c.rotate(Math.sin(time*1.7)*.045);c.drawImage(asset.image,-28,-38,56,56);
  if(hits){line(c,[[-8,-9],[-4,-5],[-7,-1],[-2,3],[-4,7]],'#714022',1.6);line(c,[[-7.2,-9],[-3.2,-5],[-6.2,-1],[-1.2,3]],'#fff0b7',.65);}
  c.restore();return;
 }
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
 }else lure(c,time,u.toyBossHits||0);
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
 if(data){const top=hasArt?-88:-80,rank=clamp(Math.floor(u.toyUpgradeLevel||0),0,2),stars='★'.repeat(rank+1);label(c,data.name+' '+stars,0,top-6,down?'#c2bbb0':rank?'#ffe28a':'#f0e8b6');box(c,-21,top,42,4,2,'#213c37');box(c,-21,top,42*clamp(u.hp/Math.max(1,u.maxHp),0,1),4,2,'#9de4cb');
  if(down)label(c,'수리 '+Math.max(0,Math.ceil(u.toyDownUntil-g.time))+'초',0,-67,'#ffd5a0');
  else{
   const remaining=Math.max(0,(u.toyNextAt||0)-g.time),cooldown=g.supportToyCooldown?.(u)||data.cooldown*(1-rank*.1);box(c,-16,15,32,3,1,'#213c37');box(c,-16,15,32*(1-clamp(remaining/cooldown,0,1)),3,1,'#e5ce86');
   if(u.type==='toyDrum'){
    const tier=g.time<(u.toyBoostUntil||0)?u.toyProcTier||0:0,color=tier===2?'#ffe075':tier===1?'#9be9f4':'#e7d691',period=tier ? .8 : 1.5,beat=(g.time%period)/period;
    c.globalAlpha=(1-beat)*(tier ? .65 : .4);oval(c,0,-8,30+beat*(tier?50:25),12+beat*(tier?20:10),'#e7cf710a',color);c.globalAlpha=1;
    for(let i=0;i<(tier?6:3);i++){const q=(g.time*(tier?1:.65)+i/(tier?6:3))%1;label(c,i%2?'♪':'♫',34+Math.sin(i*2.4+g.time)*8,-26-q*(tier?56:34),color);}
    if(tier)label(c,(tier===2?'대박':'강화')+' '+Math.ceil(u.toyBoostUntil-g.time)+'초',0,top-22,color);
   }else if(g.time<(u.toyHighlightUntil||0))label(c,u.toyProcTier===2?'대박!':'강화!',0,top-22,u.toyProcTier===2?'#ffe075':'#9be9f4');
  }
 }else label(c,'낚시 미끼',0,-65,'#ffe2a0');c.restore();}
function sheet(c,art,frame,x,y,width,height){
 const asset=prepareArt(art);if(!asset?.ready)return false;
 const column=frame%art.columns,row=Math.floor(frame/art.columns);
 c.drawImage(asset.image,column*art.cell,row*art.cell,art.cell,art.cell,x-width/2,y-height*.9,width,height);return true;
}
function sharkPose(age){
 const keys=[[0,0],[.08,1],[.18,2],[.30,3],[.40,4],[.48,5],[.70,6],[.94,7]];
 for(let i=1;i<keys.length;i++)if(age<keys[i][0]){const [at,frame]=keys[i-1],q=clamp((age-at)/(keys[i][0]-at));return frame+q*q*(3-2*q);}
 return 7;
}
function sharkWater(c,x,y,width,progress,alpha=1){
 if(progress<0||progress>=1)return false;
 const asset=prepareArt(sharkWaterArt);if(!asset?.ready)return false;
 const frame=Math.min(75,Math.floor(progress*76)),scale=width/176;
 c.save();c.globalAlpha*=alpha;c.imageSmoothingEnabled=true;
 c.drawImage(asset.image,(frame%7)*176,Math.floor(frame/7)*100,176,100,x-88*scale,y-78*scale*.78,width,100*scale*.78);c.restore();return true;
}
function waterRing(c,x,y,r,q,color,alpha=1){
 if(q<0||q>=1)return;c.save();c.globalAlpha*=alpha*(1-q);c.strokeStyle=color;c.lineWidth=2.4*(1-q)+.6;
 c.beginPath();c.ellipse(x,y,r*(.25+.75*q),r*(.25+.75*q)*.37,0,0,TAU);c.stroke();c.restore();
}
function shark(c,e,g){
 const age=Math.max(0,g.time-(e.startedAt??g.time-e.max+e.t)),q=clamp(age/e.max,0,.999),pose=sharkPose(age),frame=Math.floor(pose),mix=pose-frame,large=e.tier===2,size=e.range*(large?1.45:1.8),color=large?'#ffe9a3':'#aff8ff';
 c.save();c.globalAlpha=clamp((1-q)*7);
 oval(c,e.x+4,e.y+8,size*.29,size*.10,'#183e4830');
 oval(c,e.x,e.y+3,size*.24,size*.08,'#5ddbd526');
 sharkWater(c,e.x,e.y+5,size*1.15,age/.55,.72);
 waterRing(c,e.x,e.y+5,e.range,age/.65,color,.65);
 if(e.source?.hp>0&&!e.source.toyRetired&&age<.94){
  const face=e.angle||0,sx=e.source.x+Math.cos(face)*24,sy=e.source.y-50+Math.sin(face)*12,side=Math.cos(face)<0?-1:1;
  const anchors=[[.02,-.20],[.09,-.30],[.16,-.43],[.20,-.51],[.20,-.48],[.18,-.40],[.08,-.25],[0,-.10]],a=anchors[frame],b=anchors[Math.min(7,frame+1)],tx=e.x+side*size*(a[0]+(b[0]-a[0])*mix),ty=e.y+size*(a[1]+(b[1]-a[1])*mix);
  c.save();c.globalAlpha*=clamp((.94-age)/.24);c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+tx)/2,Math.min(sy,ty)-24,tx,ty);c.strokeStyle='#fff0c4bb';c.lineWidth=1.1;c.stroke();c.restore();
 }
 c.save();c.translate(e.x,e.y);if(Math.cos(e.angle||0)<0)c.scale(-1,1);
 c.save();c.rotate(Math.sin(Math.min(1,age/.7)*Math.PI)*(large?-.055:-.08));
 const art=prepareArt(sharkArt);
 if(art?.ready){const alpha=c.globalAlpha;c.globalAlpha=alpha*(1-mix);sheet(c,sharkArt,frame+(large?8:0),0,0,size,size);if(mix>0){c.globalAlpha=alpha*mix;sheet(c,sharkArt,Math.min(7,frame+1)+(large?8:0),0,0,size,size);}}
 else{oval(c,0,0,e.range*.7,26,'#5ad7e73b','#b6f7ff');lure(c,g.time);}c.restore();
 c.restore();
 const impact=(age-.48)/.72;
 sharkWater(c,e.x,e.y+9,size*(large?1.65:1.45),impact,large?.8:.62);
 if(impact>=0&&impact<.8)for(let i=0;i<(large?16:11);i++){
  const a=i*2.39996,delay=(i%4)*.025,t=age-.48-delay;if(t<0)continue;
  const speed=size*(.55+(i%3)*.14),x=e.x+Math.cos(a)*speed*t,y=e.y+9+Math.sin(a)*speed*t*.35-size*.65*t+size*1.2*t*t,fade=clamp((.62-t)/.22),r=(large?3.5:2.8)*(1-t*.8);
  if(r<=0||fade<=0)continue;c.save();c.globalAlpha*=fade*.85;oval(c,x,y,r,r*1.25,plastic(c,x-1,y-1,r*1.2,'#edfff3','#51bbc0'),'#9ae1db');c.restore();
 }
 waterRing(c,e.x,e.y+9,e.range*1.05,impact,color,large?1:.8);
 waterRing(c,e.x,e.y+9,e.range*.88,(age-.57)/.65,'#eafff3',.7);
 if(age>=.48&&age<.64){c.save();c.globalAlpha*=(1-(age-.48)/.16)*.65;oval(c,e.x,e.y+3,size*.13,size*.045,'#eaffed55','#f3fff4');c.restore();}
 label(c,large?'메갈로돈!':e.tier===0?'꼬마 상어!':'상어!',e.x,e.y-size*.82-Math.sin(Math.min(1,age/.48)*Math.PI)*5,color);c.restore();
 // Keep the fisher in front when its feet are at the same or nearer depth.
 if(e.source?.hp>0&&!e.source.toyRetired&&e.source.y>=e.y-12)draw(c,e.source,g);
 return true;
}
function sharkFin(c,e,g){
 const bait=e.bait;if(!bait||bait.hp<=0||g.time<(bait.toyArrivesAt||0)||g.time>=bait.toyExpires||Number.isFinite(bait.toySharkTriggeredAt)&&g.time>=bait.toySharkTriggeredAt)return true;
 const large=e.tier===2,age=Math.max(0,g.time-e.startedAt),phase=age*(large?2.6:3.5),radius=large?66:46,x=bait.x+Math.cos(phase)*radius,y=bait.y+Math.sin(phase)*radius*.55,angle=Math.atan2(Math.cos(phase)*.55,-Math.sin(phase)),direction=((Math.round(angle/(Math.PI/4))%8)+8)%8,size=large?86:62;
 c.save();c.globalAlpha=clamp(age*5,0,1);
 oval(c,x+3,y+4,size*.34,size*.12,'#123f4933');
 waterRing(c,bait.x,bait.y+6,large?85:60,(age*.65)%1,large?'#ffe9a3':'#a9f6ed',.32);
 const points=[];for(let i=0;i<10;i++){const a=phase-.65+i*.065;points.push([bait.x+Math.cos(a)*radius,bait.y+Math.sin(a)*radius*.55]);}
 line(c,points,'#348b987a',8);line(c,points,'#b8f8efb0',2);
 for(let i=0;i<9;i++){const a=phase-.9+i*.1,pulse=.5+.5*Math.sin(age*7+i*2.3);oval(c,bait.x+Math.cos(a)*radius,bait.y+Math.sin(a)*radius*.55+3,1.2+pulse,1,'#e7fff0b8');}
 sheet(c,finArt,direction+(large?8:0),x,y+5+Math.sin(age*6)*1.2,size,size);c.restore();return true;
}
function tsunami(c,e,g){
 const q=clamp(1-e.t/e.max,0,.999),direction=((Math.round(e.angle/(Math.PI/4))%8)+8)%8,frame=direction*6+Math.min(5,Math.floor(q*6));
 const width=e.range*(.76+.12*Math.sin(q*Math.PI)),motion=root.FrontSupportToys.waveMotion(e,g.time),distance=Math.max(0,motion.front-width*.42*Math.abs(Math.cos(e.angle))),x=e.x+Math.cos(e.angle)*distance,y=e.y+Math.sin(e.angle)*distance;
 c.save();c.globalAlpha=clamp((1-q)*5);
 if(e.range>=560){const front=Math.min(e.range,motion.front);c.save();c.translate(e.x,e.y);c.rotate(e.angle);const wash=c.createRadialGradient(0,0,0,0,0,e.range);wash.addColorStop(0,'#7edce509');wash.addColorStop(.7,'#83e8ef1c');wash.addColorStop(1,'#e0fff029');c.fillStyle=wash;c.beginPath();c.moveTo(0,0);c.arc(0,0,front,-e.arc/2,e.arc/2);c.closePath();c.fill();c.strokeStyle='#bcf9f04d';c.lineWidth=1.2;c.stroke();c.restore();}
 // The upright crest has its own camera-relative view. A ground-cone clip cuts
 // off its height when firing toward the camera, so bound the sprite itself.
 if(!sheet(c,waveArt,frame,x,y,width,width*.85)){oval(c,x,y,width*.45,30,'#63dfed66','#e1ffff');}
 c.restore();return true;
}
function waterCarry(c,e,g){
 const t=e.target;if(!t||t.hp<=0)return true;const q=clamp(1-e.t/e.max),direction=((Math.round(e.angle/(Math.PI/4))%8)+8)%8;
 c.save();c.globalAlpha=Math.sin(Math.PI*q)*.85;
 sheet(c,waveArt,direction*6+5,t.x-Math.cos(e.angle)*10,t.y+4,90,54);
 for(let i=0;i<7;i++){const age=(q*2+i/7)%1,side=Math.sin(i*2.4)*18,x=t.x-Math.cos(e.angle)*age*38-Math.sin(e.angle)*side,y=t.y-Math.sin(e.angle)*age*38+Math.cos(e.angle)*side-age*22;oval(c,x,y,2.5*(1-age)+.8,2,'#d9ffff');}
 c.restore();return true;
}
function drumBoost(c,e){
 const q=clamp(1-e.t/e.max),color=e.tier===2?'#ffe688':'#9de9ff';
 c.save();c.translate(e.source?.x??e.x,e.source?.y??e.y);c.strokeStyle=color;
 for(let i=0;i<3;i++){const t=clamp(q-i*.13);c.globalAlpha=(1-t)*.43;c.lineWidth=2-i*.4;c.beginPath();c.arc(0,0,e.range*t,0,TAU);c.stroke();}
 for(let i=0;i<10;i++){const a=i*2.399963,d=22+q*85;c.globalAlpha=(1-q)*.85;label(c,i%2?'♪':'♫',Math.cos(a)*d,-25+Math.sin(a)*d*.35-q*55,color);}
 c.restore();return true;
}
// Presentation randomness is independent of targeting and combat rolls.
const electricPreference=root.matchMedia?.('(prefers-reduced-motion: reduce)');
const electricNoise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const gentleElectric=g=>g.reducedMotion??electricPreference?.matches??false;
function electricPoint(u){
 const low=['ant','soldierAnt','beetle','bruteBeetle'].includes(u?.type),vehicle=['tank','crimsonAce','guntruck','lucky'].includes(u?.type);
 return{x:u.x,y:u.y-(u.visualFlightHeight||0)-(low?14:vehicle?22:32)};
}
function electricHands(u,face){
 const pose=motion.get(u),asset=artAssets.get(squirrelArt.file);if(!pose||!asset?.ready)return[{x:u.x+Math.cos(face)*20,y:u.y-28+Math.sin(face)*4}];
 const direction=pose.spriteDirection??0,row=[0,1,2,3,4,3,2,1][direction],flip=direction>0&&direction<4,frame=pose.spriteFrame??6,anchor=squirrelArt.anchors[row][frame],scale=squirrelArt.height/squirrelArt.cell;
 const palms=frame===7?[[[55,107],[178,105]],[[96,113],[181,96]],[[145,126]],[[169,92]],[[52,111],[176,110]]]:[[[71,125],[156,125]],[[122,121],[173,111]],[[170,117]],[[172,114]],[[150,125]]];
 return palms[row].map(([x,y])=>({x:u.x+(x-anchor[0])*scale*(flip?-1:1),y:u.y+(y-anchor[1])*scale}));
}
// The channel runs along the first coordinate. Two short backwards cuts and
// uneven widths give each stroke a hooked silhouette even when drawn at 50%.
const lightningCuts = [
 [[0,0,.40],[.16,-.24,.50],[.37,-1,.13],[.32,.06,1.14],[.54,-.22,.54],[.71,.78,.11],[.66,-.04,.91],[.83,.16,.48],[1,0,.025]],
 [[0,0,.42],[.13,.29,.68],[.26,.19,.54],[.44,.94,.16],[.41,-.31,1.16],[.57,-.42,.80],[.76,-.88,.13],[.74,-.36,.61],[1,0,.025]],
 [[0,0,.44],[.23,-.54,.65],[.40,-.42,.69],[.56,-.93,.09],[.49,.31,1.21],[.64,.22,.71],[.79,.61,.43],[.86,.28,.31],[1,0,.025]]
];
function electricRoute(from,to,seed){
 const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy),safe=length||1;
 const nx=-dy/safe,ny=dx/safe,pattern=lightningCuts[Math.floor(electricNoise(seed)*lightningCuts.length)];
 const swing=Math.min(length*.17,39)*(.83+.35*electricNoise(seed+11))*(electricNoise(seed+3)<.5?-1:1);
 const points=pattern.map(([along,side,width])=>({
  x:from.x+dx*along+nx*side*swing,y:from.y+dy*along+ny*side*swing,width
 }));
 return {points,nx,ny,length};
}
function electricLight(c,x,y,r,alpha,squash=1){
 if(alpha<.015)return;
 c.save();c.translate(x,y);c.scale(1,squash);c.globalAlpha*=Math.min(1,alpha);
 const glow=c.createRadialGradient(0,0,0,0,0,r);
 glow.addColorStop(0,'#fff5c8e6');glow.addColorStop(.19,'#ffdf7fa3');
 glow.addColorStop(.49,'#ffb64352');glow.addColorStop(1,'#fc8b2300');
 c.fillStyle=glow;c.fillRect(-r,-r,r*2,r*2);c.restore();
}
function traceChannel(c,points){
 c.beginPath();c.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)c.lineTo(points[i].x,points[i].y);
}
function electricRibbon(c,route,width,color){
 const {points,nx,ny}=route;
 c.beginPath();
 for(let i=0;i<points.length;i++){
  const p=points[i],w=p.width*width;
  if(i===0)c.moveTo(p.x+nx*w,p.y+ny*w);else c.lineTo(p.x+nx*w,p.y+ny*w);
 }
 for(let i=points.length-1;i>=0;i--){
  const p=points[i],w=p.width*width*.77;
  c.lineTo(p.x-nx*w,p.y-ny*w);
 }
 c.closePath();c.fillStyle=color;c.fill();
}
function lightningStrength(age,gentle){
 if(age<0||age>=.46)return 0;
 if(gentle)return .82*clamp(age/.075)*clamp((.46-age)/.20);
 return clamp(age/.035)*clamp((.46-age)/.25);
}
function steppedChannel(route,age,gentle){
 const knots=route.points,points=[knots[0]];
 const epoch=gentle?0:age<.11?0:age<.2?1:2;
 for(let i=1;i<knots.length;i++){
  const a=knots[i-1],b=knots[i],dx=b.x-a.x,dy=b.y-a.y,span=Math.hypot(dx,dy);
  if(span>17){
   const key=i*8.73+route.length*.057,at=.32+.34*electricNoise(key);
   const bend=(electricNoise(key+epoch*17)-.5)*Math.min(span*.28,11);
   points.push({x:a.x+dx*at-dy/span*bend,y:a.y+dy*at+dx/span*bend,width:(a.width+b.width)*.47});
  }
  points.push(b);
 }
 return {...route,points};
}
function electricStroke(c,route,age,width,gentle){
 const intensity=lightningStrength(age,gentle);
 if(intensity<.015||route.length<1)return;
 const joint=route.points[3],arm=route.points[4];
 route=steppedChannel(route,age,gentle);
 const points=route.points;
 c.save();c.globalAlpha*=intensity;c.lineJoin='round';c.lineCap='round';
 if(!gentle&&age<.045){
  // A thin leader finds the surface. The hot return stroke lights the entire
  // same channel on contact, so that its shape is continuous across frames.
  const reach=clamp(age/.045)*(points.length-1),end=Math.floor(reach);
  const tip=points[end],next=points[Math.min(end+1,points.length-1)],part=reach-end;
  traceChannel(c,points.slice(0,end+1));c.lineTo(tip.x+(next.x-tip.x)*part,tip.y+(next.y-tip.y)*part);
  c.strokeStyle='#ffed9c';c.lineWidth=Math.max(1.3,width*.34);c.stroke();c.restore();return;
 }
 const body=width*(.50+.50*intensity);
 if(!gentle&&width>=8&&age<.22){
  // A side channel briefly runs along the cloud's field, then splits into
  // two open ends. Its tip never pretends to strike an extra game target.
  const sign=(arm.x-joint.x)*route.nx+(arm.y-joint.y)*route.ny>0?-1:1;
  const reach=Math.min(42,route.length*.22),fx=route.ny,fy=-route.nx;
  const at=(forward,side)=>[joint.x+(fx*forward+route.nx*side*sign)*reach,
   joint.y+(fy*forward+route.ny*side*sign)*reach];
  const fork=at(.49,.65),branch=[[joint.x,joint.y],at(.27,.20),at(.23,.36),fork,at(.79,.71),at(.95,1.04)];
  line(c,branch,'#ffbd4666',4);line(c,branch,'#ffeb9d',1.7);
  line(c,[fork,at(.46,.87),at(.61,.93)],'#ffeb9d',.95);
  electricLight(c,joint.x,joint.y,body*2.5,intensity*.35);
 }
 traceChannel(c,points);
 c.strokeStyle='#e48a2130';c.lineWidth=body*3.35;c.stroke();
 c.strokeStyle='#ffc14d70';c.lineWidth=body*1.58;c.stroke();
 electricRibbon(c,route,body*1.14,'#e88a27');
 electricRibbon(c,route,body,'#ffce57');
 electricRibbon(c,route,body*.76,'#fff1a8');
 electricRibbon(c,route,body*.48,'#fffdeb');
 // A continuous white filament crosses the narrow, sideways cuts in the
 // ribbon. The brightest section races back from the point of contact.
 traceChannel(c,points);c.strokeStyle='#fff5c7';c.lineWidth=Math.max(.75,body*.20);c.stroke();
 if(!gentle&&age<.17){
  const tip=Math.round((1-clamp((age-.045)/.12))*(points.length-1));
  traceChannel(c,points.slice(Math.max(0,tip-2),Math.min(points.length,tip+3)));
  c.strokeStyle='#fffef2';c.lineWidth=Math.max(1.4,body*.42);c.stroke();
 }
 c.restore();
}
function residualCurrent(c,point,age,power,gentle){
 if(gentle||age<.12||age>=.78)return;
 const asset=prepareArt(currentArt);if(!asset?.ready)return;
 const q=clamp((age-.12)/.66),frame=Math.min(15,Math.floor(q*16)),scale=.72*power;
 c.save();c.globalAlpha*=clamp(age/.18)*clamp((.78-age)/.26)*.67;c.imageSmoothingEnabled=true;
 c.drawImage(asset.image,frame%4*144,Math.floor(frame/4)*112,144,112,point.x-76*scale,point.y-56*scale,144*scale,112*scale);c.restore();
}
function casterCircuit(c,u,hands,age,tier,gentle){
 if(age<0||age>.50||!u||u.hp<=0)return;
 const fade=clamp(age/.035)*clamp((.50-age)/.25),strength=tier===2?1.25:tier?1:.8;
 c.save();c.globalAlpha*=fade*.7;
 // Short coils stay on the palms. They never add a second hit target or move the toy.
 for(const [i,p]of hands.entries()){
  const radius=(7+Math.sin(Math.min(1,age/.16)*Math.PI)*4)*strength;
  c.strokeStyle='#dca443';c.lineWidth=2.5;c.beginPath();c.ellipse(p.x,p.y,radius,radius*.62,i*.8,-.4,Math.PI*1.5);c.stroke();
  c.strokeStyle='#fff2b9';c.lineWidth=1;c.stroke();
  if(!gentle){const a=age*11+i*2.1;c.fillStyle='#fff7cf';c.beginPath();c.ellipse(p.x+Math.cos(a)*radius,p.y+Math.sin(a)*radius*.62,2.1,1.4,a,0,TAU);c.fill();}
 }
 if(hands.length>1&&tier){const a=hands[0],b=hands.at(-1);line(c,[[a.x,a.y],[(a.x+b.x)/2,(a.y+b.y)/2-5],[b.x,b.y]],'#ffe4a375',1.2);}
 if(tier&&!gentle){const face=u.toyActionFace??u.face??0,back={x:u.x-Math.cos(face)*17,y:u.y-35-Math.sin(face)*7},count=tier===2?5:3;
  for(let i=0;i<count;i++){const a=face+Math.PI+(i-(count-1)/2)*.57,r=(tier===2?14:10)*(1-age/.7);line(c,[[back.x+Math.cos(a)*5,back.y+Math.sin(a)*5],[back.x+Math.cos(a)*r-Math.sin(a)*3,back.y+Math.sin(a)*r+Math.cos(a)*3],[back.x+Math.cos(a)*(r+5),back.y+Math.sin(a)*(r+5)]],'#ffe49a',1.3);}
 }
 c.restore();
}
function electricFlecks(c,point,age,seed,power,gentle){
 const progress=clamp(age/.46),count=gentle?2:6;
 for(let i=0;i<count;i++){
  const a=electricNoise(seed+i*13)*TAU,speed=(13+electricNoise(seed+i*19+6)*28)*power;
  const dx=Math.cos(a),dy=Math.sin(a)*.7-.3,travel=gentle?9:4+(1-(1-progress)**2)*speed;
  const x=point.x+dx*travel,y=point.y+dy*travel+progress*progress*6;
  const length=(1-progress)*(3+electricNoise(seed+i)*5)*power;
  c.beginPath();c.moveTo(x+dx*length,y+dy*length);
  c.lineTo(x-dy*1.2,y+dx*1.2);c.lineTo(x-dx*length*.6,y-dy*length*.6);
  c.lineTo(x+dy,y-dx);c.closePath();c.fillStyle=i%3?'#fff0a2':'#ffc446';c.fill();
 }
}
function contactGlint(c,x,y,size){
 // Two unequal lenses catch the light, with a short crosswise flare.
 c.beginPath();c.moveTo(x-size,y+size*.13);c.lineTo(x-2,y-1);
 c.lineTo(x+size*.20,y-size*.68);c.lineTo(x+2,y-2);
 c.lineTo(x+size*.78,y-size*.09);c.lineTo(x+2,y+1);
 c.lineTo(x-size*.12,y+size*.44);c.lineTo(x-1,y+2);
 c.closePath();c.fillStyle='#fffbd7';c.fill();
}
function electricContact(c,target,point,age,seed,power,gentle){
 residualCurrent(c,point,age,power,gentle);
 if(age<0||age>.54)return;
 const fade=clamp(1-age/.54),ground={x:target.x,y:target.y+2};
 c.save();c.globalAlpha*=fade*(gentle?.85:1);
 c.globalCompositeOperation='screen';
 electricLight(c,ground.x,ground.y,(33+12*(1-fade))*power,fade,.31);
 c.globalCompositeOperation='source-over';
 const r=(gentle?20:13+15*(1-(1-clamp(age/.30))**2))*power;
 // A low rim of ionized air hugs the floor. Keep the rear arc broken so the
 // feet stay planted inside it, and the bolts read on light oak as well as grass.
 c.beginPath();c.ellipse(ground.x,ground.y,r,r*.26,0,.02,Math.PI*.95);
 c.strokeStyle='#ffc04a';c.lineWidth=3.1*power*fade+.6;c.stroke();
 c.strokeStyle='#fff4b6';c.lineWidth=1.35*power*fade+.4;c.stroke();
 c.beginPath();c.ellipse(ground.x,ground.y,r*.93,r*.23,0,3.7,5.18);
 c.strokeStyle='#ffdf79';c.lineWidth=1.25*power;c.stroke();
 // Low angular tongues skim out over the floor in perspective. The airborne
 // contact uses its own height; the pool of reflected light stays at the feet.
 for(let side=-1;side<=1;side+=2){
  const reach=(gentle?18:10+Math.min(1,age/.15)*(14+electricNoise(seed+side)*9))*power;
  const x=ground.x,y=ground.y,tip=x+side*reach;
  c.beginPath();c.moveTo(x+side*3,y+1);c.lineTo(x+side*reach*.47,y-1);
  c.lineTo(x+side*reach*.59,y-10*power);c.lineTo(x+side*reach*.64,y-2);
  c.lineTo(tip,y-(5+electricNoise(seed+2*side)*10)*power);c.lineTo(x+side*reach*.57,y+1);
  c.lineTo(x+side*reach*.52,y-1.1);c.closePath();c.fillStyle='#ffe48a';c.fill();
 }
 c.globalCompositeOperation='screen';electricLight(c,point.x,point.y,25*power,fade);
 c.globalCompositeOperation='source-over';
 if(age<.23)contactGlint(c,point.x,point.y,(9+10*clamp(1-age/.23))*power);
 electricFlecks(c,point,age,seed,power,gentle);
 c.restore();
}
function electricCharge(c,point,age,seed,gentle){
 if(age<0||age>.32)return;
 const pulse=clamp(1-age/.32)*(gentle?.56:1);
 c.save();c.globalAlpha*=pulse;electricLight(c,point.x,point.y,24,pulse);
 if(!gentle)for(let i=0;i<3;i++){
  const a=seed+i*2.17,r=5+15*(1-clamp(age/.13)),dx=Math.cos(a),dy=Math.sin(a);
  line(c,[[point.x+dx*r,point.y+dy*r],[point.x+dx*r*.66-dy*2,point.y+dy*r*.66+dx*2],[point.x+dx*r*.4,point.y+dy*r*.4]],'#ffe28c',1.35);
 }
 contactGlint(c,point.x,point.y,8+pulse*4);c.restore();
}
function electricZap(c,e,g){
 if(e.storm||!e.target||e.target.hp<=0)return true;
 const caster=e.source||e.from;if(!caster)return true;
 const first=!e.from||e.from===caster||e.from.id!=null&&e.from.id===caster.id;
 const age=e.max-e.t,gentle=gentleElectric(g),hop=e.hop??(first?0:1);
 const local=age-(gentle?0:hop*.085),face=caster.toyActionFace??caster.face??0;
 const hands=first?electricHands(caster,face):[electricPoint(e.from)];
 const point=electricPoint(e.target),from=hands.reduce((best,p)=>
  Math.hypot(p.x-point.x,p.y-point.y)<Math.hypot(best.x-point.x,best.y-point.y)?p:best);
 const seed=(e.target.id||1)*3.17+Math.round((g.time-age)*16);
 if(first){casterCircuit(c,caster,hands,age,e.tier,gentle);for(const hand of hands)electricCharge(c,hand,age,seed,gentle);}
 const route=electricRoute(from,point,seed);
 electricStroke(c,route,local,e.tier?6.6:4.3,gentle);
 if(e.tier&&!gentle){
  const split=route.points[3],dx=point.x-from.x,dy=point.y-from.y;
  const spur={x:split.x+dx*.20+route.nx*16,y:split.y+dy*.20+route.ny*16};
  electricStroke(c,electricRoute(split,spur,seed+7),local-.015,2.2,false);
 }
 electricContact(c,e.target,point,local-(gentle?0:.045),seed,e.tier?1:.82,gentle);
 return true;
}
const stormGroups=new WeakMap();
const stormLayouts=new WeakMap();
function groupThunderTargets(e){
 let groups=stormGroups.get(e);if(groups)return groups;
 const targets=(e.targets||[]).filter(Boolean).slice().sort((a,b)=>a.x-b.x||a.y-b.y);
 // Close enemies share a trunk. Keep the groups for this cast, so units crossing
 // between animation frames cannot pull a lightning channel across the field.
 const count=Math.min(3,targets.length);
 groups=Array.from({length:count},()=>[]);
 targets.forEach((target,i)=>groups[Math.floor(i*count/targets.length)].push(target));
 for(const group of groups)group.sort((a,b)=>electricPoint(b).y-electricPoint(a).y);
 stormGroups.set(e,groups);return groups;
}
function thunder(c,e,g){
 const groups=groupThunderTargets(e),targets=groups.flat().filter(t=>t.hp>0);
 if(!targets.length)return true;
 const age=e.max-e.t,gentle=gentleElectric(g),q=clamp(age/e.max),xs=targets.map(t=>t.x);
 let layout=stormLayouts.get(e);if(!layout){const width=e.areaRadius?e.areaRadius*1.8:clamp((Math.max(...xs)-Math.min(...xs))*.95+190,280,540),height=width*.60;layout={width,height,x:e.x,y:Math.min(e.y-95,...targets.map(t=>electricPoint(t).y-36),e.source?.hp>0?e.source.y-91:Infinity)};stormLayouts.set(e,layout);}
 const {width,height}=layout,cloudY=layout.y,cloudX=layout.x,base=cloudY-height*.24;
 const frame=gentle?3:Math.min(7,Math.floor(q*8));
 const castSeed=(e.source?.id||1)*11+Math.round((g.time-age)*16);
 const sockets=[];
 c.save();c.globalAlpha*=clamp(age/.06)*clamp((1-q)*4.2);
 if(e.areaRadius){const r=e.areaRadius;c.save();c.globalAlpha*=1-q;const glow=c.createRadialGradient(e.x,e.y,0,e.x,e.y,r);glow.addColorStop(0,'#ffe1a114');glow.addColorStop(.8,'#ffeab91c');glow.addColorStop(1,'#ffeab900');c.fillStyle=glow;c.fillRect(e.x-r,e.y-r,r*2,r*2);c.strokeStyle='#ffe2a050';c.lineWidth=1.4;c.beginPath();c.arc(e.x,e.y,r,0,TAU);c.stroke();c.restore();}
 // The cloud dims only its footprint; contact light then plays against both
 // the floor texture and the toys without a full-screen flash.
 c.save();c.translate(cloudX,e.y-14);c.scale(1,.74);
 const radius=width*.72,shade=c.createRadialGradient(0,0,radius*.10,0,0,radius);
 shade.addColorStop(0,'#45364945');shade.addColorStop(.65,'#51405c26');shade.addColorStop(1,'#51405c00');
 c.fillStyle=shade;c.fillRect(-radius,-radius,radius*2,radius*2);c.restore();
 if(e.source?.hp>0){const hands=electricHands(e.source,e.source.toyActionFace??e.source.face??0);casterCircuit(c,e.source,hands,age,2,gentle);for(const p of hands)electricCharge(c,p,age,castSeed,gentle);}
 for(const [i,group] of groups.entries()){
  const living=group.filter(t=>t.hp>0);if(!living.length)continue;
  const lead=living[0],point=electricPoint(lead),seed=castSeed+(lead.id||i+1)*3.17;
  const lane=(i+.5)/groups.length-.5;
  // Put the three contact patches on separate lobes. Start each trunk inside
  // the cloud and paint the cloud over it to hide a disconnected blunt cap.
  const root={x:cloudX+lane*width*.84+(electricNoise(seed)-.5)*width*.055,
   y:base+Math.abs(lane)*height*.045};
  const route=electricRoute(root,point,seed),local=age-(gentle?.04:.055+i*.085);
  const body=i===Math.floor(groups.length/2)?11:8.7;
  const lit=lightningStrength(local,gentle);
  sockets.push({x:root.x,y:root.y+3,lit});
  for(const [j,t] of living.slice(1).entries()){
   const end=electricPoint(t),portion=clamp((end.y-root.y-30)/(point.y-root.y||1),.18,.73);
   const split=route.points[Math.min(6,Math.max(1,Math.round(portion*(route.points.length-1))))];
   const branchSeed=seed+17*(j+1),branchAge=local-(gentle?0:.018+j*.012);
   electricStroke(c,electricRoute(split,end,branchSeed),branchAge,4.6,gentle);
   electricContact(c,t,end,branchAge-(gentle?0:.045),branchSeed,.98,gentle||targets.length>12);
  }
  electricStroke(c,route,local,body,gentle);
  electricContact(c,lead,point,local-(gentle?0:.045),seed,1.22,gentle);
 }
 if(!sheet(c,cloudArt,frame,cloudX,cloudY,width,height)){
  for(let i=0;i<5;i++)oval(c,cloudX+(i-2)*width*.14,base-11-Math.sin(i)*7,width*.19,22,'#677284');
 }
 for(const {x,y,lit} of sockets)electricLight(c,x,y,width*.16,lit*.87,.39);
 label(c,'람쥐 썬더!',cloudX,cloudY-height*.67-7,'#ffeaa0');
 c.restore();return true;
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
 if(e.kind==='toySharkFin')return sharkFin(c,e,g);
 if(e.kind==='toyTsunami')return tsunami(c,e,g);
 if(e.kind==='toyWaterCarry')return waterCarry(c,e,g);
 if(e.kind==='toyDrumBoost')return drumBoost(c,e);
 if(e.kind==='toyThunder')return thunder(c,e,g);
 if(e.kind==='toyZap')return electricZap(c,e,g);
 if(!['toyWater','toyDecoyDrop'].includes(e.kind))return false;
 const k=clamp(e.t/e.max,0,1),face=e.angle??e.source?.toyActionFace??e.source?.face??0,from=e.from||e.source;
 const nozzle=e.kind==='toyWater'&&from?waterMuzzle(from,face):null;
 const x=nozzle?.x??from?.x??e.x,y=nozzle?.y??((from?.y??e.y)-35),t=e.target,tx=t?.x??e.tx??e.x,ty=(t?.y??e.ty??e.y)-(t?.visualFlightHeight??0)-22;
 c.save();c.globalAlpha=k;
 if(e.kind==='toyWater'){
  if(e.tier!==2){
   if(!waterJet(c,e,g,x,y,tx,ty))for(const [width,color]of [[21,'#249ac855'],[12,'#77d9f3bb'],[4,'#e2ffff']])line(c,[[x,y],[x+(tx-x)*.35,y+(ty-y)*.35-12],[tx,ty]],color,width*(e.tier?1.6:1));
   for(let i=0;i<8;i++){const q=((1-k)*2+i/8)%1,dx=x+(tx-x)*q+Math.sin(i*2.4)*6,dy=y+(ty-y)*q-Math.sin(q*Math.PI)*12;oval(c,dx,dy,2.2,1.4,'#c4f8ff');}
  }
  oval(c,tx,ty,14*(1-k)+4,8,'#9beaf122','#c9faff');for(let i=0;i<8;i++){const a=i*TAU/8,r=(1-k)*32;oval(c,tx+Math.cos(a)*r,ty+Math.sin(a)*r*.5,2,1.3,'#c9faff');}
 }else{
  const progress=clamp((e.max-e.t)/.35),lx=x+(e.x-x)*progress,ly=y+(e.y-y)*progress-Math.sin(progress*Math.PI)*65;
  c.beginPath();c.moveTo(x,y-15);c.quadraticCurveTo((x+lx)/2,Math.min(y,ly)-20,lx,ly);c.strokeStyle='#fff2c4cc';c.lineWidth=.9;c.stroke();
  if(progress<1){c.save();c.translate(lx,ly);c.scale(.8,.8);lure(c,g.time);c.restore();}
  oval(c,e.x,e.y,18+(1-k)*25,8+(1-k)*12,'#8ae7ec18',e.tier===2?'#ffe4a3':'#a7f2f2');
 }
 c.restore();return true;}
root.FrontSupportToyView={draw,event,motionPose:u=>motion.get(u),prepare(types){const extras={toyDecoyMaker:[sharkArt,finArt,baitArt,sharkWaterArt],toyTurtle:[waveArt,jetArt],toyStunner:[cloudArt,currentArt]};return Promise.all([...(Array.isArray(types)?types:[types])].filter(type=>characterArt[type]).flatMap(type=>[characterArt[type],...(extras[type]||[])]).map(art=>prepareArt(art)?.loading));}};
})(window);
