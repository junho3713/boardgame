/* Battlefield presentation for snap-block mines and the Retona flash-grenade reel. */
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
const brickPaint=[
 {side:[75,119,48],top:['#c0d77a','#7da84c'],stud:['#586d34','#bed27b','#99b854'],band:'#465e35'},
 {side:[104,135,59],top:['#dfe892','#94b754'],stud:['#697b37','#e2e796','#afc365'],band:'#946d28'}
];
const brickFrames=new Map(),brickDirections=16,brickTilt=.32;
function brickView(angle){
 const index=((Math.round(angle/TAU*brickDirections)%brickDirections)+brickDirections)%brickDirections;
 const a=index*TAU/brickDirections+brickTilt,cs=Math.cos(a),sn=Math.sin(a);
 return {index,cs,sn,project:(x,y,z)=>[x*cs-y*sn,(x*sn+y*cs)*.56-z*.86]};
}
function brickFace(c,points,color){
 c.fillStyle=color;c.beginPath();
 points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
 c.closePath();c.fill();
}
function brickShade(rgb,light){return 'rgb('+rgb.map(v=>Math.round(v*light)).join(',')+')';}
function brickRim(w,d,bevel){
 return [[-w+bevel,-d],[w-bevel,-d],[w,-d+bevel],[w,d-bevel],
         [w-bevel,d],[-w+bevel,d],[-w,d-bevel],[-w,-d+bevel]];
}
function paintBrick(c,view,grade){
 const {cs,sn,project}=view,p=brickPaint[grade];
 const rings=[
  {rim:brickRim(16.1,9.75,2.6),z:.25},
  {rim:brickRim(17.25,10.8,2.95),z:1.4},
  {rim:brickRim(17.25,10.8,2.95),z:10.35},
  {rim:brickRim(16.2,9.68,2.6),z:11.7}
 ];
 const points=rings.map(({rim,z})=>rim.map(([x,y])=>project(x,y,z)));
 for(let i=0;i<8;i++){
  const j=(i+1)%8,[x,y]=rings[1].rim[i],[nx,ny]=rings[1].rim[j];
  const dx=nx-x,dy=ny-y,d=Math.hypot(dx,dy);
  const normalX=(dy*cs+dx*sn)/d,normalY=(dy*sn-dx*cs)/d;
  if(normalY<=0)continue;
  for(let z=0;z<3;z++){
   const lo=points[z],hi=points[z+1];
   const tint=z===0?.58:z===1?.76-normalX*.21:1.12-normalX*.18;
   brickFace(c,[lo[i],lo[j],hi[j],hi[i]],brickShade(p.side,tint));
  }
  const seamY=rings[1].z+.95;
  if(grade){
   brickFace(c,[project(x,y,seamY),project(nx,ny,seamY),project(nx,ny,seamY+1.05),project(x,y,seamY+1.05)],p.band);
  }
 }
 const top=c.createLinearGradient(-14,-19,14,-4);
 top.addColorStop(0,p.top[0]);top.addColorStop(1,p.top[1]);brickFace(c,points[3],top);
 const pegs=[[-8,-4.55],[8,-4.55],[-8,4.55],[8,4.55]].map(([x,y])=>project(x,y,11.7)).sort((a,b)=>a[1]-b[1]);
 for(const [x,y] of pegs){
  ellipse(c,x+.55,y+.65,4.25,2.55,'#25350d61');
  const barrel=c.createLinearGradient(x-4,y,x+4,y);
  barrel.addColorStop(0,p.stud[2]);barrel.addColorStop(.5,p.stud[2]);barrel.addColorStop(1,p.stud[0]);
  ellipse(c,x,y+.1,4,2.27,barrel);c.fillStyle=barrel;c.fillRect(x-4,y-3.18,8,3.28);
  ellipse(c,x,y-3.3,4,2.28,p.stud[0]);
  ellipse(c,x-.13,y-3.56,3.67,2.01,p.stud[1]);
  ellipse(c,x-.92,y-4.31,1.84,.44,'#f4f4c785');
 }
}
function brick(c,angle,grade){
 const view=brickView(angle),key=view.index+grade*brickDirections;
 let canvas=brickFrames.get(key);
 if(!canvas&&root.document?.createElement){
  const tile=root.document.createElement('canvas');tile.width=88;tile.height=76;
  const ctx=tile.getContext('2d');
  if(ctx){ctx.translate(44,50);ctx.scale(2,2);paintBrick(ctx,view,grade);brickFrames.set(key,tile);canvas=tile;}
 }
 if(canvas)c.drawImage(canvas,-22,-25,44,38);else paintBrick(c,view,grade);
}
function miniature(c,x,y,angle,row,size=1,tilt=0){
 const index=((Math.round(angle/TAU*8)%8)+8)%8,cell=96;
 c.save();c.translate(x,y);c.rotate(tilt);c.scale(size,size);
 if(row<2)brick(c,angle,row);
 else if(atlas?.complete&&atlas.naturalWidth){
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
  const age=game.time-m.landAt,ready=game.time>=m.armAt,linked=Number.isFinite(m.chainAt),arming=clamp(age/Math.max(.04,m.armAt-m.landAt));
  const bounce=age<.18?Math.sin(age/.18*Math.PI)*3:0;
  ellipse(c,m.x+1.5,m.y+3.4,17.4,6.9,'#26302162');
  ellipse(c,m.x,m.y+2.1,13.5,4.8,'#1d2b2652');
  const angle=m.angle||0;
  miniature(c,m.x,m.y-bounce,angle,Number(!!m.evolved));
  const view=brickView(angle),frontOnX=Math.abs(view.sn)>Math.abs(view.cs);
  const [lx,ly]=view.project(frontOnX?Math.sign(view.sn)*17.35:0,frontOnX?0:Math.sign(view.cs)*10.85,5.3);
  const x=m.x+lx,y=m.y+ly-bounce,wave=linked?1:.5+.5*Math.sin((game.time-m.armAt)*3.5+(m.index||0));
  const lamp=linked?'#ffd273':m.evolved?'#ffe49a':'#d2f596';
  ellipse(c,x,y,2.55,1.40,'#303c2a');
  if(ready){
   c.save();c.globalAlpha*=.29+wave*.2;glow(c,x,y,3.5,lamp,linked?'#e9a75555':'#88c95645');c.restore();
   ellipse(c,x,y,1.65,.87,lamp);
  }else if(arming>.3)ellipse(c,x,y,1.25,.72,'#bfa264');
 }
}
function air(c,game,visible=()=>true){
 for(const m of game.blockMines||[]){
  if(game.time>=m.landAt||!visible(m))continue;
  const p=clamp((game.time-m.startedAt)/Math.max(.01,m.landAt-m.startedAt)),lift=Math.sin(p*Math.PI)*(36+(m.index||0)*4)+(1-p)*22;
  ellipse(c,m.x+1,m.y+2,6+4*p,2+2*p,'#26372643');
  miniature(c,m.x,m.y-lift,(m.angle||0)+p*TAU,Number(!!m.evolved),1,Math.sin(p*TAU)*.35);
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
 if(!['blockMineBlast','blockMineChain','luckyFlashBurst'].includes(e.kind))return false;
 const k=clamp(e.t/e.max),p=1-k;c.save();c.globalAlpha*=k;
 if(e.kind==='blockMineChain')chain(c,e,k,p);else if(e.kind==='blockMineBlast')blast(c,e,k,p);else flash(c,e,k,p);
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
root.FrontBlockFlashView={grounded,air,event,enemyStatuses,reel};
})(typeof window==='undefined'?globalThis:window);

