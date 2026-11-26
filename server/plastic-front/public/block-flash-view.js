/* Battlefield presentation for round mines and the Retona flash-grenade reel. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=n=>Math.max(0,Math.min(1,n)),asset='assets/effects/block-flash-toys-v212.webp';
const atlas=typeof root.Image==='function'?new root.Image():null;
if(atlas)atlas.src=asset;
function ellipse(c,x,y,rx,ry,color){
 c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.05,rx),Math.max(.05,ry),0,0,TAU);c.fill();
}
function stroke(c,x1,y1,x2,y2,color,width){
 c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
}
function circle(c,x,y,r,color,width){
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();
}
function glow(c,x,y,r,center,color){
 const grad=c.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,center);grad.addColorStop(.4,color);grad.addColorStop(1,'#ffffff00');
 ellipse(c,x,y,r,r,grad);
}
const mineSprites=[];
function mineBody(c,evolved){
 const radius=evolved?16.6:13.4,height=evolved?5.6:4.2,depth=radius*.54;
 const side=c.createLinearGradient(-radius,0,radius,0);
 side.addColorStop(0,'#343b2a');side.addColorStop(.34,'#5d6846');
 side.addColorStop(.73,'#353c29');side.addColorStop(1,'#252b22');
 ellipse(c,0,0,radius,depth,'#1d231b');
 c.fillStyle=side;c.fillRect(-radius,-height,radius*2,height);
 ellipse(c,0,-.7,radius,depth,side);
 ellipse(c,0,-height,radius,depth,'#222922');
 ellipse(c,0,-height-.45,radius-.6,depth-.35,evolved?'#8a7951':'#5e6a49');
 const top=c.createLinearGradient(-9,-10,11,2);
 top.addColorStop(0,evolved?'#859064':'#778258');top.addColorStop(.42,'#576142');top.addColorStop(1,'#303929');
 ellipse(c,0,-height-.9,radius-1.6,depth-1,top);
 const inset=radius*.68;
 ellipse(c,0,-height-1.2,inset,inset*.54,'#273124');
 ellipse(c,0,-height-1.52,inset-.55,inset*.54-.35,'#4a5338');
 c.strokeStyle='#aeba7a8e';c.lineWidth=.55;c.beginPath();
 c.ellipse(0,-height-.9,radius-1.82,depth-1.08,0,Math.PI*1.04,Math.PI*1.74);c.stroke();
 for(let i=0;i<6;i++){
  const angle=i*TAU/6+.25,dx=Math.cos(angle),dy=Math.sin(angle),r=radius*.8;
  stroke(c,dx*(r-1),-height-.8+dy*(r-1)*.54,dx*(r+1),-height-.8+dy*(r+1)*.54,'#233023',.78);
 }
 ellipse(c,0,-height-2,4.35,2.44,'#252d21');
 ellipse(c,0,-height-2.38,3.25,1.85,'#69744f');
 ellipse(c,0,-height-2.53,2.12,1.36,'#642b27');
}
function mine(c,x,y,evolved,bright=0,scale=1){
 c.save();c.translate(x,y);c.scale(scale,scale);
 const key=Number(evolved);
 let sprite=mineSprites[key];
 if(!sprite&&root.document?.createElement){
  const tile=root.document.createElement('canvas');tile.width=160;tile.height=120;
  const ctx=tile.getContext('2d');
  if(ctx){ctx.translate(80,68);ctx.scale(3,3);mineBody(ctx,evolved);mineSprites[key]=sprite=tile;}
 }
 if(sprite)c.drawImage(sprite,-80/3,-68/3,160/3,40);else mineBody(c,evolved);
 if(bright>0){
  const ledY=evolved?-8.13:-6.73;
  c.globalAlpha*=bright;
  glow(c,0,ledY,evolved?7.6:6,'#ff634a','#ff402a76');
  ellipse(c,0,ledY,2.05,1.25,'#ff5137');
  ellipse(c,-.43,ledY-.31,.91,.55,'#fff3c3');
 }
 c.restore();
}
function miniature(c,x,y,angle,row,size=1,tilt=0){
 const index=((Math.round(angle/TAU*8)%8)+8)%8,cell=96;
 c.save();c.translate(x,y);c.rotate(tilt);c.scale(size,size);
 if(atlas?.complete&&atlas.naturalWidth){
  c.drawImage(atlas,index*cell,row*cell,cell,cell,-24,-33.6,48,48);
 }else{
  c.fillStyle='#c2c8a9';c.strokeStyle='#3e513c';c.lineWidth=1.5;c.beginPath();c.roundRect(-5,-15,10,15,3);c.fill();c.stroke();
  c.fillStyle='#637c45';c.fillRect(-5,-12,10,3);c.fillRect(-5,-4,10,2);
 }
 c.restore();
}
function ring(c,x,y,r,color,width,flat=1){
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(x,y,Math.max(.1,r),Math.max(.1,r*flat),0,0,TAU);c.stroke();
}
function grounded(c,game,visible=()=>true){
 for(const m of game.blockMines||[]){
  if(game.time<m.landAt||!visible(m))continue;
  const age=game.time-m.landAt,ready=game.time>=m.armAt,linked=Number.isFinite(m.chainAt);
  const radius=m.evolved?16.6:13.4,phase=linked?Math.max(0,m.chainAt-game.time)%.18:age%1.16;
  const blink=ready?(phase<(linked?.105:.16)?1:.12):.18+.56*Math.max(0,Math.sin(age*32));
  ellipse(c,m.x+1.6,m.y+2.2,radius+1.8,radius*.42,'#25291c58');
  ellipse(c,m.x,m.y+1.4,radius*.88,radius*.33,'#1d2b2646');
  const squash=age<.1?.065*Math.sin(age/.1*Math.PI):0;
  mine(c,m.x,m.y,m.evolved,blink,1+squash);
 }
}
function air(c,game,visible=()=>true){
 for(const m of game.blockMines||[]){
  if(game.time>=m.landAt||!visible(m))continue;
  const progress=clamp((game.time-m.startedAt)/Math.max(.01,m.landAt-m.startedAt));
  const lift=23*(1-progress*progress);
  ellipse(c,m.x+1,m.y+2,7+6*progress,2+3*progress,'#26372643');
  mine(c,m.x,m.y-lift,m.evolved,.2);
 }
 for(const g of game.luckyFlashes||[]){
  const p=clamp((game.time-g.startedAt)/Math.max(.01,g.landAt-g.startedAt)),x=g.fromX+(g.x-g.fromX)*p,y=g.fromY+(g.y-g.fromY)*p;
  if(!visible({x,y}))continue;
  const lift=(1-p)*22+Math.sin(p*Math.PI)*54;
  ellipse(c,x+1,y+1,4+p*2,2,'#25372e45');
  miniature(c,x,y-lift,p*TAU,g.evolved?3:2,1.17,Math.sin(p*TAU)*.85);
  if(p>.74)ellipse(c,x,y-lift-15,2.1,1.3,g.evolved?'#e9baff':'#fff0a8');
 }
}
function chain(c,e,k,p){
 const dx=e.tx-e.x,dy=e.ty-e.y,f=clamp(p*1.5),x=e.x+dx*f,y=e.y+dy*f,back=Math.max(0,f-.35);
 stroke(c,e.x,e.y-3,e.tx,e.ty-3,'#cbb66370',1.5);
 c.globalCompositeOperation='lighter';stroke(c,e.x+dx*back,e.y+dy*back-3,x,y-3,'#ffac4390',5);
 stroke(c,e.x+dx*back,e.y+dy*back-3,x,y-3,'#ffeaa1',1.6);glow(c,x,y-3,7,'#ffebb8','#e2ad5c80');
}
function plant(c,e,k,p){
 const progress=clamp((p-.40)/.60);
 if(!progress)return;
 c.translate(e.x,e.y);
 const size=e.evolved?22:17,reach=size+progress*12;
 c.globalAlpha*=1-progress;
 for(let i=0;i<6;i++){
  const angle=(i+.24)*TAU/6,dx=Math.cos(angle),dy=Math.sin(angle),dust=2+progress*1.6;
  ellipse(c,dx*reach,dy*reach*.48-progress*3,dust,dust*.47,i%2?'#a88454':'#d6ac71');
 }
}
function blast(c,e,k,p){
 const radius=e.radius||65,r=radius*(1-(1-p)*(1-p)),seed=e.x*.014+e.y*.023;
 c.translate(e.x,e.y);ring(c,0,0,r,'#fff0af',.7+3.4*k);
 if(p<.7){const wave=clamp(p/.7);c.globalAlpha*=1-wave;ring(c,0,0,Math.max(2,r-4),'#ffc279',2.5);c.globalAlpha=k;}
 c.save();c.globalCompositeOperation='lighter';const core=10+Math.sin(Math.min(1,p*1.7)*Math.PI)*17;
 glow(c,0,-5,core,'#fff4b7','#ffa84580');c.restore();
 for(let i=0;i<8;i++){
  const a=seed+i*2.4,len=radius*(.3+(i%3)*.11)*p,x=Math.cos(a)*len,y=Math.sin(a)*len*.82-15*Math.sin(p*Math.PI);
  c.save();c.translate(x,y);c.rotate(a+p*(i%2?4:-6));c.fillStyle=['#758f55','#9fb46c','#cda964'][i%3];c.fillRect(-2.4,-1.6,4.8,3.2);
  c.fillStyle='#d4dc9c';c.fillRect(-2.2,-1.6,4.3,.8);c.restore();
 }
}
function flash(c,e,k,p){
 const r=(e.radius||120)*(1-(1-p)*(1-p)),a=e.evolved?'#f0c5ff':'#fff4b4',b=e.evolved?'#b88dfa':'#ffdf88';
 c.translate(e.x,e.y);ring(c,0,0,r,b,1+2.5*k);
 c.globalCompositeOperation='lighter';if(p<.65)glow(c,0,-8,Math.max(4,(e.radius||120)*(.2+.29*p)),a,e.evolved?'#c290ff4a':'#ffe7a353');
 c.translate(0,-8);
 for(let i=0;i<8;i++){
  const angle=i*TAU/8+.13,l=(i%2?11:24)*(1+1.5*p)*k;
  c.save();c.rotate(angle);c.fillStyle=i%2?b:a;c.beginPath();c.moveTo(1,-1.8*k);c.lineTo(l,0);c.lineTo(1,1.8*k);c.closePath();c.fill();c.restore();
 }
 ellipse(c,0,0,2+5*k,2+5*k,'#fffdeb');
}
function event(c,e){
 if(!['blockMinePlant','blockMineBlast','blockMineChain','luckyFlashBurst'].includes(e.kind))return false;
 const k=clamp(e.t/e.max),p=1-k;c.save();c.globalAlpha*=k;
 if(e.kind==='blockMinePlant')plant(c,e,k,p);else if(e.kind==='blockMineChain')chain(c,e,k,p);else if(e.kind==='blockMineBlast')blast(c,e,k,p);else flash(c,e,k,p);
 c.restore();return true;
}
function enemyStatuses(c,game,visible=()=>true){
 for(const u of game.units){
  const status=u.luckyFlash;if(!status||status.until<=game.time||u.hp<=0||!visible(u))continue;
  const lift=u.visualFlightHeight??root.FrontTypes?.[u.type]?.flightHeight??0,base=u.boss?85:38,x=u.x,y=u.y-base-lift;
  const confused=status.confused,color=confused?'#eed0ff':'#fff2b1',t=clamp((status.until-game.time)/2);
  c.save();c.translate(x,y);c.globalAlpha*=clamp(t*9);
  ellipse(c,0,0,9.3,9.3,confused?'#573b62':'#514b34');c.strokeStyle=color;c.lineWidth=1.35;
  c.beginPath();c.arc(0,0,8.7,-Math.PI/2,-Math.PI/2+TAU*t);c.stroke();
  if(confused){
   c.rotate(game.time*1.4);for(let i=0;i<2;i++){
    c.beginPath();c.arc(0,0,4.4,.25,2.65);c.stroke();stroke(c,-3.8,2.1,-.7,2.1,color,1.25);c.rotate(Math.PI);
   }
  }else{stroke(c,-3,-4,-3,4,color,2.2);stroke(c,3,-4,3,4,color,2.2);}
  c.restore();
 }
}
function reel(c){
 // At the reel's 24px size use the flash canister's bright sleeve and a four-ray flash.
 c.save();c.translate(13,20);c.rotate(-.34);
 c.fillStyle='#d1d6b9';c.strokeStyle='#435744';c.lineWidth=1.6;c.beginPath();c.roundRect(-5.9,-9,11.8,17,3);c.fill();c.stroke();
 c.fillStyle='#73874c';c.fillRect(-5.7,-6,11.4,3);c.fillRect(-5.7,3,11.4,2.5);
 for(const x of [-2.4,0,2.4])stroke(c,x,-1.8,x,1.2,'#516350',1.15);
 stroke(c,-2,-10,3,-10,'#586651',2);stroke(c,3,-10,6,-7,'#586651',1.7);c.restore();
 c.save();c.translate(23,7);for(let i=0;i<4;i++){c.rotate(Math.PI/2);stroke(c,1.9,0,5.5,0,'#795b25',1.8);stroke(c,2.2,0,5,0,'#f6cf69',.9);}ellipse(c,0,0,2.15,2.15,'#fff4c1');c.restore();
}
root.FrontBlockFlashView={mine,grounded,air,event,enemyStatuses,reel};
})(typeof window==='undefined'?globalThis:window);

