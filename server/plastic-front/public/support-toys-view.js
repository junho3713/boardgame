/* Small glossy, articulated toy models and their bounded skill effects. No external assets. */
(function(root){'use strict';
const motion=new WeakMap();
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function oval(c,x,y,rx,ry,color,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.3;c.stroke();}}
function box(c,x,y,w,h,r,color,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();if(stroke){c.lineWidth=1.4;c.strokeStyle=stroke;c.stroke();}}
function line(c,points,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();for(const [i,p]of points.entries())i?c.lineTo(...p):c.moveTo(...p);c.stroke();}
function plastic(c,x,y,r,light,dark){const g=c.createRadialGradient(x-r*.35,y-r*.45,1,x,y,r*1.2);g.addColorStop(0,light);g.addColorStop(1,dark);return g;}
function key(c,x,y,t){c.save();c.translate(x,y);c.scale(.7+Math.abs(Math.sin(t*2))*.3,1);line(c,[[0,0],[8,0]],'#9e7b2d',4);oval(c,12,-4,5,4,'#d1b25b','#765b23');oval(c,12,4,5,4,'#d1b25b','#765b23');oval(c,12,-4,2.4,1.8,'#403b2d');oval(c,12,4,2.4,1.8,'#403b2d');c.restore();}
function duck(c,t,small=false,back=false){const k=small?.75:1;c.save();c.scale(k,k);oval(c,0,4,17,13,plastic(c,0,0,22,'#fff5a0','#d89a20'),'#7b6027');oval(c,0,-12,13,13,plastic(c,0,-12,17,'#fff4a0','#e5af32'),'#8c6a28');if(!back){oval(c,0,-3,8,4,'#f4a63d','#a16623');for(const s of [-1,1]){oval(c,s*6,-15,3.7,4.3,'#fffcef');oval(c,s*6,-15,1.8,2.6,'#243c3c');}}else oval(c,-4,-17,5,3,'#fff4a455');oval(c,-7,5,5,8,'#f4cd55');line(c,[[-9,4],[-10,9]],'#c1932c',1);c.restore();}
function body(c,u,time,weight=0,back=false){const step=Math.sin((u.walk||0)*.8)*weight,beat=Math.sin(time*7),action=time<(u.toyActionUntil||0);key(c,23,9,time);
 if(u.type==='toyTurtle'){
  for(const side of [-1,1])for(const y of [-16,17]){oval(c,side*(22+step*(y>0?1:-1)*3),y+7+step*side*(y>0?1:-1)*3,10,7,'#2a5347','#173f35');oval(c,side*(22+step*(y>0?1:-1)*2),y+3+step*side*(y>0?1:-1)*3,9,6,plastic(c,side*22,y,12,'#a7d184','#548b60'),'#315e40');}
  oval(c,0,6,25,31,'#294e3c','#173e32');oval(c,0,0,25,30,plastic(c,-3,-8,37,'#acd27b','#38644c'),'#294e3a');oval(c,0,-2,20,25,'#6c9a5d','#c2db8b');
  c.strokeStyle='#3e734d';c.lineWidth=2;for(const y of [-12,4]){line(c,[[-18,y],[0,y-6],[18,y]],'#3e734d',2);}line(c,[[0,-25],[0,23]],'#3e734d',2);oval(c,-10,-13,6,8,'#b5d78b66');
  box(c,-13,-36,26,18,8,plastic(c,-4,-35,22,'#acd98f','#5b9663'),'#325f45');for(const side of [-1,1]){oval(c,side*9,-32,4,5,'#f1f6c3');oval(c,side*9,-34,2,3,'#233c37');}
  box(c,-8,-47,16,20,4,'#879fa5','#354b53');box(c,-6,-47,12,5,2,'#d6e8d9');oval(c,0,-48,6,3,'#203a48','#b6d9de');oval(c,0,-48,3,1.5,action?'#9feaff':'#64a2b2');
  box(c,-8,12,16,12,4,'#244f59','#a5c7bd');box(c,-5,14,10,7,2,'#6dc5da');
 }else if(u.type==='toyDrum'){
  for(const side of [-1,1])oval(c,side*13,25+side*step*3,9,6,'#233d4c','#122b31');
  box(c,-22,-4,44,27,5,plastic(c,-8,2,35,'#e7664c','#9e302c'),'#602b2b');for(const x of [-15,0,15])box(c,x-2,-2,4,23,1,'#e9bd54');oval(c,0,21,22,7,'#d5aa46','#755b2c');oval(c,0,-4,23,10,'#f3cf6b','#71542a');oval(c,0,-6,19,7,'#fcf0c4','#c6ac73');
  for(const side of [-1,1]){line(c,[[side*17,-26],[side*28,-19],[side*9,-8+beat*3]],'#cfbca2',5);line(c,[[side*9,-8+beat*3],[side*3,-1+beat*2]],'#eee4bd',2.4);oval(c,side*3,-1+beat*2,2,2,'#fff6d3');}
  oval(c,0,-34,15,14,plastic(c,-3,-38,20,'#ffe0a4','#c18d55'),'#6e503a');box(c,-17,-47,34,10,4,'#466b82','#233f51');oval(c,0,-49,8,3,'#ddbc63');if(!back){for(const side of [-1,1])oval(c,side*5,-35,1.8,2.8,'#2d4143');line(c,[[-4,-28],[0,-26],[5,-29]],'#805847',1.4);}else{line(c,[[-8,-37],[8,-37]],'#c29a67',1.5);oval(c,0,-29,2,2,'#8d744f');}
 }else if(u.type==='toyDecoyMaker'){
  for(const side of [-1,1])oval(c,side*12,24+step*side*3,10,6,'#483f66','#2b2a41');
  box(c,-22,-7,44,32,5,plastic(c,-10,-7,42,'#c6b4e2','#685b9c'),'#423854');box(c,-19,-5,38,7,2,'#eac474');box(c,-5,2,10,15,3,'#eecb80','#7c6c43');oval(c,0,8,2,2,'#6c6a82');
  line(c,[[0,-8],[-6,-12],[6,-16],[-5,-20],[5,-24],[0,-28]],'#c7d4cd',3);c.save();c.translate(0,-39+(action?Math.sin(time*22)*3:Math.sin(time*3)));duck(c,time,true,back);c.restore();box(c,-23,-11,46,5,2,'#e4b961','#715a35');
 }else if(u.type==='toyStunner'){
  for(const side of [-1,1]){box(c,side*12-7,10+step*side*3,14,17,4,'#4c758a','#2d4858');oval(c,side*12,27+step*side*3,10,5,'#335468');}
  box(c,-19,-20,38,36,9,plastic(c,-9,-18,34,'#ffe797','#b58b30'),'#67532a');box(c,-12,-9,24,15,4,'#305264','#203d4a');for(let i=0;i<3;i++)box(c,-8+i*6,-6,3,7,1,'#96d9df');
  box(c,-16,-43,32,25,8,plastic(c,-6,-40,29,'#90c2ce','#4a768c'),'#2e4a59');box(c,-12,-36,24,10,5,back?'#5a8293':'#233b48');if(!back){for(const side of [-1,1])oval(c,side*6,-31,3,3,action?'#fff5ab':'#9debf0');}else{for(let i=0;i<3;i++)line(c,[[-7,-34+i*3],[7,-34+i*3]],'#2f5969',1.5);}line(c,[[0,-42],[0,-51]],'#8aa8ac',3);oval(c,0,-53,3,3,action?'#fff6a3':'#d5db9b');
  for(const side of [-1,1]){line(c,[[side*17,-11],[side*26,-20],[side*12,-35]],'#6c969c',7);line(c,[[side*12,-35],[side*12,-48]],'#c4d9d7',4);oval(c,side*12,-48,3,3,'#e5f3d5');}if(action)line(c,[[-12,-48],[-5,-53],[0,-46],[6,-52],[12,-48]],'#eeffd2',2);
 }else duck(c,time,false,back);
}
function label(c,text,x,y,color='#e8e7c1'){c.font='700 10px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#203a36dd';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);}
function draw(c,u,g){if(u.type==='toyDecoy'&&(u.hp<=0||g.time>=u.toyExpires)||u.toyRetired)return;const data=root.FrontSupportToys.toys[u.type],down=u.hp<=0;
 let m=motion.get(u);if(!m)m={x:u.x,y:u.y,time:g.time,weight:0};const dt=Math.max(0,g.time-m.time),travel=Math.hypot(u.x-m.x,u.y-m.y);if(dt>0){const moving=travel>.05&&travel<60;m.weight+=(Number(moving)-m.weight)*Math.min(1,dt*14);m.x=u.x;m.y=u.y;m.time=g.time;}motion.set(u,m);
 c.save();c.translate(u.x,u.y);oval(c,5,5,u.type==='toyTurtle'?31:25,11,'#142e2845');oval(c,0,0,27,10,'#9bdef010',u.coopOwner===1?'#80c8ff88':'#d9edab77');
 c.save();if(down){c.globalAlpha=.4;c.rotate(.25);}c.translate(0,-24+Math.sin((u.walk||0)*.8)*1.5*m.weight);const facing=(g.time<(u.toyActionUntil||0)?u.toyActionFace??u.face:m.weight>.15?u.toyBodyFace:undefined)??u.face??Math.PI/2;if(u.type==='toyTurtle'){c.scale(1,.8);c.rotate(facing+Math.PI/2);}else{const profile=.78+.22*Math.abs(Math.sin(facing)),flip=Math.cos(facing)<-.15?-1:1;c.scale(flip*profile,.95);}body(c,u,g.time,m.weight,u.type!=='toyTurtle'&&Math.sin(facing)<-.35);c.restore();
 if(data){label(c,data.name,0,-86,down?'#c2bbb0':'#f0e8b6');box(c,-21,-80,42,4,2,'#213c37');box(c,-21,-80,42*clamp(u.hp/Math.max(1,u.maxHp),0,1),4,2,'#9de4cb');
  if(down)label(c,'수리 '+Math.max(0,Math.ceil(u.toyDownUntil-g.time))+'초',0,-67,'#ffd5a0');
  else if(data.cooldown){const remaining=Math.max(0,(u.toyNextAt||0)-g.time);box(c,-16,15,32,3,1,'#213c37');box(c,-16,15,32*(1-clamp(remaining/data.cooldown,0,1)),3,1,'#e5ce86');}
  else{const beat=(g.time%1.5)/1.5;c.globalAlpha=(1-beat)*.4;oval(c,0,-8,30+beat*25,12+beat*10,'#e7cf710a','#e7d691');c.globalAlpha=1;for(let i=0;i<3;i++){const q=(g.time*.65+i/3)%1;label(c,i%2?'♪':'♫',Math.sin(i*2.4+g.time)*20,-50-q*34,'#f5db8f');}}
 }else label(c,'미끼',0,-60,'#ddc5f5');c.restore();}
function event(c,e,g){if(!['toyWater','toyZap','toyDecoyDrop'].includes(e.kind))return false;const k=clamp(e.t/e.max,0,1),face=e.source?.toyActionFace??e.source?.face??0,x=(e.source?.x??e.x)+(e.kind==='toyWater'?Math.cos(face)*45:0),y=(e.source?.y??e.y)+(e.kind==='toyWater'?-24+Math.sin(face)*36:e.kind==='toyZap'?-70:-35),t=e.target,tx=t?.x??e.tx??e.x,ty=(t?.y??e.ty??e.y)-(t?.visualFlightHeight??0)-22;
 c.save();c.globalAlpha=k;
 if(e.kind==='toyWater'){
  const a=Math.atan2(ty-y,tx-x);for(const [width,color]of [[15,'#249ac855'],[8,'#77d9f3bb'],[3,'#e2ffff']])line(c,[[x,y],[x+(tx-x)*.35,y+(ty-y)*.35-12],[tx,ty]],color,width);
  for(let i=0;i<8;i++){const q=((1-k)*2+i/8)%1,dx=x+(tx-x)*q+Math.sin(i*2.4)*6,dy=y+(ty-y)*q-Math.sin(q*Math.PI)*12;oval(c,dx,dy,2.2,1.4,'#c4f8ff');}
  oval(c,tx,ty,14*(1-k)+4,8,'#9beaf122','#c9faff');for(let i=0;i<8;i++){const a=i*TAU/8,r=(1-k)*32;oval(c,tx+Math.cos(a)*r,ty+Math.sin(a)*r*.5,2,1.3,'#c9faff');}
 }else if(e.kind==='toyZap'){
  if(k>.5){const points=[[x,y]];for(let i=1;i<7;i++)points.push([x+(tx-x)*i/7+Math.sin(i*3+g.time*50)*6,y+(ty-y)*i/7+Math.cos(i*2+g.time*40)*6]);points.push([tx,ty]);line(c,points,'#71cfe777',7);line(c,points,'#fff6b4',2);}
  for(let i=0;i<3;i++){const a=g.time*5+i*TAU/3;label(c,'ϟ',tx+Math.cos(a)*20,ty-24+Math.sin(a)*7,'#ffe9a2');}
 }else{c.translate(e.x,e.y);oval(c,0,0,18+(1-k)*25,8+(1-k)*12,'#c6a5ed22','#dac5f3');}
 c.restore();return true;}
root.FrontSupportToyView={draw,event,motionPose:u=>motion.get(u)};
})(window);
