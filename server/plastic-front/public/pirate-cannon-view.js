/* Pirate parrot telegraphs. World-space aim, fuse and projectile timing come from combat. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=n=>Math.max(0,Math.min(1,n));
function disk(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function line(c,x0,y0,x1,y1,color,width){
 c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();
}
function glow(c,x,y,r,inner,edge){
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(.38,edge);g.addColorStop(1,'#ffffff00');disk(c,x,y,r,g);
}
function ring(c,x,y,r,color,width,start=0,end=TAU){
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,Math.max(.2,r),start,end);c.stroke();
}
// Match the baked atlas' 16 discrete headings, orthographic projection and scale.
function anchor(angle,point){
 const heading=Math.round((angle+Math.PI/2)*16/TAU)*TAU/16,co=Math.cos(heading),si=Math.sin(heading),[x,y,z]=point;
 return {x:x*co-y*si,y:.8*(x*si+y*co)-.6*z};
}
const muzzlePoint=[0,-38,34],fusePoint=[0,-1,59];
function danger(c,target,p,flying,left=null){
 const x=target.x,y=target.y,r=target.radius;const beat=.5+.5*Math.sin(p*TAU*(flying?1:2.5));
 c.save();c.translate(x,y);
 const wash=c.createRadialGradient(0,0,r*.72,0,0,r);wash.addColorStop(0,'#d0392106');wash.addColorStop(1,flying?'#ff854336':'#f7834520');disk(c,0,0,r,wash);
 ring(c,0,0,r,'#763328d9',3.6);ring(c,0,0,r,flying?'#ffc186':'#ff8c64',1.7+.7*beat);
 c.setLineDash([5,8]);ring(c,0,0,r-4,'#fff0bd8c',1);c.setLineDash([]);
 for(let i=0;i<8;i++){
  const a=i*TAU/8,dx=Math.cos(a),dy=Math.sin(a);line(c,dx*(r-8),dy*(r-8),dx*(r-2),dy*(r-2),'#ffb880',i%2?1:2);
 }
 ring(c,0,0,8,'#64372ed9',2);ring(c,0,0,8,'#ffe4a8',1.6,-Math.PI/2,-Math.PI/2+p*TAU);
 const space=11+3*(1-p);for(let i=0;i<4;i++){const a=i*Math.PI/2;line(c,Math.cos(a)*space,Math.sin(a)*space,Math.cos(a)*(space+4),Math.sin(a)*(space+4),'#ffcf91',1.5);}
 if(left!==null){
  c.fillStyle=left<=.4?'#fff0c8':'#ffc58f';c.font='bold 13px sans-serif';c.textAlign='center';
  c.fillText('앵무새 · '+left.toFixed(1)+'초',0,-r-9);
 }
 c.restore();
}
function ground(c,game,visible=()=>true){
 for(const u of game.units||[]){
  const f=u.pirateFuse;if(u.hp<=0||!f||!visible(f))continue;
  const end=f.landAt??f.fireAt;
  danger(c,f,clamp((game.time-f.startedAt)/Math.max(.01,end-f.startedAt)),false,f.landAt==null?null:Math.max(0,end-game.time));
 }
 for(const s of game.pirateShells||[])if(visible(s))danger(c,s,clamp((game.time-(s.warningAt??s.startedAt))/Math.max(.01,s.landAt-(s.warningAt??s.startedAt))),true,s.warningAt==null?null:Math.max(0,s.landAt-game.time));
}
function fuse(c,u,time){
 const f=u.pirateFuse;if(!f||u.hp<=0)return;
 const q=clamp((time-f.startedAt)/Math.max(.01,f.fireAt-f.startedAt)),offset=anchor(f.angle,fusePoint);
 const x=u.x+offset.x,y=u.y+offset.y;
 c.save();c.globalCompositeOperation='lighter';glow(c,x,y,4+q*3,'#fff4af','#ff902d9c');
 for(let i=0;i<5;i++){
  const phase=(time*(3+i*.15)+i*.212)%1,a=i*2.4+Math.floor(time*11)*.12,r=2+phase*(5+q*5),dx=Math.cos(a),dy=Math.sin(a);
  c.globalAlpha=1-phase;line(c,x+dx*r,y+dy*r-phase*3,x+dx*(r+2.2),y+dy*(r+2.2)-phase*3,i%2?'#fff2af':'#ffb75b',1.1);
 }c.restore();
 const width=50,left=-width/2,filled=width*q;
 const color=q<.45?'#e7cc54':q<.8?'#ff943c':'#ff5441';
 c.save();c.translate(u.x,u.y-77);
 c.fillStyle='#372923';c.strokeStyle=q>=.8?'#ffd4a0':'#c1a77d';c.lineWidth=1.2;
 c.beginPath();c.roundRect(left-2,-5,width+4,10,3);c.fill();c.stroke();
 c.fillStyle='#554238';c.fillRect(left,-3,width,6);
 c.fillStyle=color;c.fillRect(left,-3,filled,6);
 for(const fraction of [.25,.5,.75])line(c,left+width*fraction,-2.5,left+width*fraction,2.5,'#37292388',1);
 if(filled>1)line(c,left+filled-1,-2.5,left+filled-1,2.5,'#fff2b5',1.5);
 c.restore();
}
function shellPose(s,p){
 const tip=anchor(s.angle,muzzlePoint),fromX=s.fromX+tip.x,fromY=s.fromY+tip.y;
 const h=Math.min(128,Math.max(64,Math.hypot(s.x-s.fromX,s.y-s.fromY)*.23));
 return {x:fromX+(s.x-fromX)*p,y:fromY+(s.y-fromY)*p-h*4*p*(1-p),
  floorX:s.fromX+(s.x-s.fromX)*p,floorY:s.fromY+(s.y-s.fromY)*p};
}
function air(c,game,visible=()=>true){
 for(const u of game.units||[])if(u.pirateFuse&&u.hp>0&&visible(u))fuse(c,u,game.time);
 for(const s of game.pirateShells||[]){
  const p=clamp((game.time-s.startedAt)/Math.max(.01,s.landAt-s.startedAt)),pos=shellPose(s,p);
  if(!visible(pos)&&!visible(s))continue;
  c.save();const shadow=3.5+2.2*p;c.fillStyle='#332c235c';c.beginPath();c.ellipse(pos.floorX,pos.floorY,shadow*1.4,shadow*.55,0,0,TAU);c.fill();
  for(let i=3;i>=1;i--){const a=Math.max(0,p-i*.021),last=shellPose(s,a);
   glow(c,last.x,last.y,3+i,'#e9c69748','#c58e5052');
  }
  const r=6.2+1.1*Math.sin(p*Math.PI),x=pos.x,y=pos.y;
  const material=c.createRadialGradient(x-r*.38,y-r*.45,0,x,y,r);
  material.addColorStop(0,'#b0aca0');material.addColorStop(.25,'#66645e');material.addColorStop(.72,'#363632');material.addColorStop(1,'#191d1b');
  disk(c,x,y,r,material);ring(c,x,y,r,'#393b32',.8);
  c.translate(x,y);c.rotate(p*TAU*1.5+s.angle);c.strokeStyle='#98968a80';c.lineWidth=.7;c.beginPath();c.ellipse(0,0,r*.5,r*.92,0,-1.3,1.3);c.stroke();c.restore();
 }
}
function edgeWarnings(c,game,width,height,project,reducedMotion=false){
 if(game.phase==='ready'||game.phase==='ended'||game.bossIntro?.remaining>0)return;
 const shortSide=Math.min(width,height),edge=Math.min(78,shortSide*.16);
 const halfWidth=width/2,halfHeight=height/2,overscan=Math.max(50,shortSide*.22);
 const sideInset=Math.min(31,width*.23),topInset=Math.min(61,height*.24),bottomInset=Math.min(59,height*.24);
 const cannons=(game.units||[]).filter(u=>u.type==='pirateCannon'&&u.hp>0&&!u.hidden&&game.visible(u));
 cannons.sort((a,b)=>(a.pirateFuse?.fireAt??Infinity)-(b.pirateFuse?.fireAt??Infinity));
 const markers=[];
 for(const u of cannons){
  const {x,y}=project({x:u.x,y:u.y-33});
  if(x>edge&&x<width-edge&&y>edge&&y<height-edge)continue;
  if(!u.pirateFuse&&(x<-overscan||x>width+overscan||y<-overscan||y>height+overscan))continue;
  const dx=x-halfWidth,dy=y-halfHeight;
  if(!dx&&!dy)continue;
  const sx=dx?(halfWidth-sideInset)/Math.abs(dx):Infinity;
  const sy=dy?(halfHeight-(dy<0?topInset:bottomInset))/Math.abs(dy):Infinity;
  const step=Math.min(sx,sy),px=halfWidth+dx*step,py=halfHeight+dy*step;
  if(markers.some(m=>Math.hypot(m.x-px,m.y-py)<39))continue;
  markers.push({x:px,y:py});
  const angle=Math.atan2(dy,dx),charging=!!u.pirateFuse;
  const pulse=charging&&!reducedMotion?(1+Math.cos(game.time*TAU*2))/2:1;
  c.save();c.translate(px,py);c.rotate(angle);
  c.beginPath();c.moveTo(-14,-10);c.lineTo(5,-10);c.lineTo(17,0);c.lineTo(5,10);c.lineTo(-14,10);c.closePath();
  c.fillStyle=charging?'#79241b':'#54221f';c.fill();
  c.strokeStyle=charging?'#ff9a7f':'#f7695b';c.lineWidth=1.6;c.stroke();
  c.globalAlpha*=.7+.3*pulse;
  line(c,4,-5,10,0,'#ffb6a0',1.9);line(c,10,0,4,5,'#ffb6a0',1.9);
  c.rotate(-angle);
  const markX=-5*Math.cos(angle),markY=-5*Math.sin(angle);
  c.fillStyle='#fff1d7';c.fillRect(markX-1,markY-4,2,5);c.fillRect(markX-1,markY+2.6,2,1.8);
  c.restore();
 }
}
function smoke(c,x,y,r,k,light){
 const g=c.createRadialGradient(x-r*.28,y-r*.32,0,x,y,r);
 g.addColorStop(0,light?'#c1b69c':'#a89e86');g.addColorStop(.6,light?'#948a79':'#776f60');g.addColorStop(1,'#625c4d00');
 c.save();c.globalAlpha*=k;disk(c,x,y,r,g);c.restore();
}
function muzzle(c,e,p){
 const tip=anchor(e.angle,muzzlePoint),x=e.x+tip.x,y=e.y+tip.y,angle=Math.atan2(.8*Math.sin(e.angle),Math.cos(e.angle));
 c.translate(x,y);c.rotate(angle);const k=1-p;
 for(let i=0;i<5;i++){const dist=8+p*(14+i*4),side=Math.sin(i*2.4)*p*12;smoke(c,dist,side,3.5+p*6,k*.7,i%2);}
 if(p>.56)return;const light=1-p/.56;c.globalCompositeOperation='lighter';c.globalAlpha*=light;
 for(let i=0;i<5;i++){
  c.save();c.rotate((i-2)*.16);const len=(i%2?30:23)*(light*.6+.4);c.fillStyle=i===2?'#fff3bd':'#ffb052';
  c.beginPath();c.moveTo(-2,-2.3);c.lineTo(len*.45,-2);c.lineTo(len,0);c.lineTo(len*.44,2.4);c.lineTo(-2,2);c.closePath();c.fill();c.restore();
 }
}
function impact(c,e,p){
 const r=e.radius||170,k=1-p,seed=(e.x+e.y)*.012,reach=Math.max(2,r*(1-Math.pow(1-p,3)));
 c.translate(e.x,e.y);c.save();c.globalAlpha*=k*k;ring(c,0,0,reach,'#ffe4aa',2+3*k);ring(c,0,0,Math.max(1,reach-4),'#bd7553',2*k);c.restore();
 for(let i=0;i<9;i++){
  const a=seed+i*2.4,len=r*(.12+(i%3)*.075)*p,x=Math.cos(a)*len,y=Math.sin(a)*len*.75-((i%3)*2+9)*p;
  smoke(c,x,y,5+Math.sin(Math.PI*Math.min(.82,p))*12+i%3,k*.77,i%3===0);
 }
 if(p<.4){
  c.save();c.globalCompositeOperation='lighter';const f=1-p/.4;
  for(let i=0;i<7;i++){const a=i*2.4+seed,l=(i%2?14:24)*(1-f*.35);line(c,Math.cos(a)*3,Math.sin(a)*3-3,Math.cos(a)*l,Math.sin(a)*l-4,'#ffa657',2*f+.6);}
  glow(c,0,-4,8+18*f,'#fff9cb','#ffab4dbe');c.restore();
 }
 for(let i=0;i<7;i++){
  const a=i*2.4+seed,dist=r*(.18+.07*(i%4))*p,x=Math.cos(a)*dist,y=Math.sin(a)*dist-13*Math.sin(p*Math.PI);c.save();c.globalAlpha*=k;c.translate(x,y);c.rotate(p*5+a);c.fillStyle=i%2?'#7b6850':'#a48960';c.fillRect(-1.9,-1.1,3.8,2.2);c.restore();
 }
}
function intercept(c,e,p){
 if(p<.72){
  c.save();impact(c,{x:e.gunX,y:e.gunY,radius:47},p/.72);c.restore();
 }
 const fold=Math.min(1,p/.48);
 if(fold<1){
  c.save();c.globalAlpha*=1-fold;const radius=e.radius*(1-fold)**2;
  for(let i=0;i<4;i++){const a=i*Math.PI/2;ring(c,e.x,e.y,radius,'#a7f4be',2,a+.09,a+Math.PI/2-.09);}
  c.restore();
 }
 c.globalAlpha*=Math.min(1,(1-p)*4);c.textAlign='center';c.font='bold 15px system-ui';c.lineWidth=3;c.lineJoin='round';
 const y=e.gunY-62-9*Math.min(1,p*2);c.strokeStyle='#204536';c.fillStyle='#dcffc2';c.strokeText('포격 차단!',e.gunX,y);c.fillText('포격 차단!',e.gunX,y);
}
function event(c,e){
 if(e.kind!=='pirateMuzzle'&&e.kind!=='pirateImpact'&&e.kind!=='pirateIntercept')return false;
 const p=1-clamp(e.t/e.max);c.save();
 if(e.kind==='pirateMuzzle')muzzle(c,e,p);else if(e.kind==='pirateImpact')impact(c,e,p);else intercept(c,e,p);
 c.restore();return true;
}
root.FrontPirateCannonView={ground,air,event,edgeWarnings};
})(typeof window==='undefined'?globalThis:window);

