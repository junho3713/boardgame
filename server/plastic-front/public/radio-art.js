/* World-space paint for the signal corps. All animation follows the combat clock. */
(function (root) {
'use strict';
const sky=root.FrontRadioAirspace;
const tau = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => 1 - (1 - clamp(n)) ** 3;
const preference = root.matchMedia?.('(prefers-reduced-motion: reduce)');
const quiet = game => game?.reducedMotion ?? preference?.matches ?? false;
const displayFrames=new WeakMap();
// Network games receive the battle clock in snapshots. Animate between confirmations
// on the canvas only, and stop advancing if the server stops sending snapshots.
function beginFrame(c,game){
 let view=displayFrames.get(c);
 if(!view||view.game!==game){
  view={game,snapshot:-Infinity,time:game.time};displayFrames.set(c,view);
 }
 view.reduced=quiet(game);
 if(!game.coop||!root.FrontCoopClient?.active||game.phase!=='playing'||game.bossIntro?.remaining>0){
  view.time=game.time;view.snapshot=-Infinity;
 }else{
  const now=root.performance.now()/1000;
  if(view.snapshot!==game.time){
   if(game.time<view.snapshot||view.snapshot===-Infinity)view.time=game.time;
   view.snapshot=game.time;view.received=now;
  }
  view.time=Math.max(view.time,game.time+Math.min(.125,Math.max(0,now-view.received)));
 }
 view.offset=view.time-game.time;
 return view;
}
const pipLayout = [[], [[0,0]], [[-1,-1],[1,1]], [[-1,-1],[0,0],[1,1]],
 [[-1,-1],[-1,1],[1,-1],[1,1]], [[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],
 [[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]];
function ellipse(c, x, y, w, h, color) {
 if (w <= 0 || h <= 0) return;
 c.fillStyle = color;
 c.beginPath(); c.ellipse(x, y, w, h, 0, 0, tau); c.fill();
}
function gradient(c, x, y, radius, ...stops) {
 const g = c.createRadialGradient(x, y, 0, x, y, radius);
 for (const [at, color] of stops) g.addColorStop(at, color);
 return g;
}
function glow(c, x, y, r, h, center, edge) {
 if (r <= 0 || h <= 0) return;
 c.save(); c.translate(x,y); c.scale(1,h/r);
 ellipse(c,0,0,r,r,gradient(c,0,0,r,[0,center],[.53,edge],[1,'rgba(100,55,30,0)']));
 c.restore();
}
function stroke(c, width, color, path) {
 c.lineWidth = width; c.strokeStyle = color; c.beginPath(); path(); c.stroke();
}
function polygon(c, points, color) {
 c.beginPath(); c.moveTo(...points[0]);
 for (let i = 1; i < points.length; i++) c.lineTo(...points[i]);
 c.closePath(); c.fillStyle = color; c.fill();
}
function seedFor(e) { return Math.floor(e.x * .67 + e.y * .41 + (e.seq || 0) * 71); }
function noise(seed, i) {
 let h = Math.imul(seed + Math.imul(i, 1597334677), 2246822519);
 return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
function face(c,x,y,n,rim,angle,gold) {
 c.save(); c.translate(x,y); c.rotate(angle);
 c.fillStyle=gold?'#9e611e':'#434543';c.beginPath();c.roundRect(-8,-8,18,20,3.5);c.fill();
 c.fillStyle='#fff';c.beginPath();c.roundRect(-9,-9,18,18,3.5);c.fill();
 stroke(c,1.6,gold?'#c28a2f':'#191918',()=>c.roundRect(-9,-9,18,18,3.5));
 if(rim)stroke(c,2.3,rim,()=>c.roundRect(-10,-10,20,20,4.2));
 for (const [a,b] of pipLayout[n] || []) {
  const r=n===1?2.45:1.7;
  ellipse(c,a*4.6,b*4.6,r,r,'#0e0e0e');
 }
 c.restore();
}
const pairGap=2,pairTrayWidth=46;
function rollPairPose(roll,popup,reduced){
 const accented=roll.success&&popup>=0&&popup<1;
 const zoom=accented?1+(reduced?.09:.5)*Math.min(1,popup/.22,(1-popup)/.30):1;
 return {roll,accented,zoom,width:(pairTrayWidth+(accented?2:1.2))*zoom};
}
function drawRollPair(c,pose,rank,age,spinning,reduced,duration,grouped) {
 const {roll,accented,zoom}=pose;
 const golden=rank===3;
 const twist=spinning&&!reduced?.34*Math.sin(age*38):0;
 const jump=spinning&&!reduced?2.6*Math.sin(age/duration*Math.PI):0;
 c.save();c.scale(zoom,zoom);
 const rim=accented?'#ffbf33':null;
 if(grouped){
  c.fillStyle='#25241ef0';c.beginPath();c.roundRect(-23,-13,46,26,5);c.fill();
  stroke(c,accented?2:1.2,rim||(golden?'#c28a2f':'#928b72'),()=>c.roundRect(-23,-13,46,26,5));
 }
 if(spinning&&!reduced)c.scale(.55+.33*Math.abs(Math.sin(age*35)),1);
 face(c,-10.6,-jump,spinning?0:roll.dice[0],rim,twist-.035,golden);
 face(c,10.6,-jump*.55,spinning?0:roll.dice[1],rim,-twist+.035,golden);
 c.restore();
}
function rollLabel(c,label,roll,u,tr,top) {
 c.font='bold 12px sans-serif';
 c.textAlign='center';c.textBaseline='bottom';c.lineJoin='round';
 c.strokeStyle='#382115';c.lineWidth=3;c.strokeText(label,0,top);
 c.fillStyle='#ffdb89';c.fillText(label,0,top);
 if(roll.strike!=='incendiary'&&roll.strike!=='turret')return;
 const {tx,ty}=roll;
 if(Number.isFinite(tx)&&Number.isFinite(ty)){
  const sx=tr.a*tx+tr.c*ty+tr.e,sy=tr.b*tx+tr.d*ty+tr.f;
  if(sx<0||sx>c.canvas.width||sy<0||sy>c.canvas.height){
   c.translate(c.measureText(label).width/2+7,top-7);c.rotate(Math.atan2(ty-u.y,tx-u.x));
   polygon(c,[[5,0],[-4,-4],[-2,0],[-4,4]],'#ffc568');
  }
 }
}
function rolls(c,game,visible) {
 const rolling = new Map();
 for(const e of game.effects){
  if(e.kind==='radioRoll'&&visible(e.source||e))rolling.set(e.source?.id??e,e);
 }
 if(!rolling.size)return;
 const tr = c.getTransform();
 const pixelRatio=c.canvas?.clientWidth?c.canvas.width/c.canvas.clientWidth:root.devicePixelRatio||1;
 const scale = Math.max(.15, Math.hypot(tr.a,tr.b) / pixelRatio);
 const lanes = [], offset=displayFrames.get(c)?.offset||0, reduced=quiet(game);
 for (const e of rolling.values()) {
  const u=e.source || e, age=e.max-e.t+offset, rank=e.rank||1;
  const pairs=e.rolls?.length?e.rolls:[{dice:[e.a,e.b],success:e.a===e.b}];
  const lead=pairs.find(pair=>pair.success)??pairs[0];
  const roll={tx:e.tx,ty:e.ty,strike:e.strike,...lead};
  const grouped=pairs.length>1;
  const duration=rank===3?.16:.23,spinning=age<duration;
  let label='';
  if(roll.strike==='turret')label='기관포탑';
  if(roll.strike==='nuke')label='전술 핵';
  if(roll.strike==='incendiary')label=e.golden?'강화 소이탄':'소이탄';
  if(roll.strike==='missile'){
   const count=roll.missileCount??(e.golden?4:roll.dice[0]-2);
   label=count===6?'강화 미사일 6발':`미사일 ${count}발`;
  }
  if(e.sync)label='SYNC x2!';
  if(e.jackpot)label='TRIPLE JACKPOT!';
  const x=u.x*scale;
  let y=(u.y-57)*scale-10;
  const poses=pairs.map(pair=>rollPairPose(pair,(age-duration)/.25,reduced));
  const rowWidth=poses.reduce((span,pose)=>span+pose.width,0)+(poses.length-1)*pairGap;
  const peak=Math.max(...poses.map(pose=>pose.zoom));
  const labelY=grouped?-14*peak-7:-21;
  const width=grouped?rowWidth/2:label?48:35,bottom=Math.max(19,14*peak);
  const top=label?Math.max(41,15-labelY):bottom;
  const labels=root.FrontUnitLabels;
  if(game.captainStackHpMode&&u.team===0&&labels){
   const starY=labels.stackStarY(u),name=labels.evolution(game,u);
   y=(name?.y??starY)*scale-bottom-14*scale;
  }
  let overlap;
  while((overlap=lanes.find(lane=>Math.abs(lane.x-x)<lane.width+width
   && y+bottom>lane.y-lane.top && y-top<lane.y+lane.bottom))){
   y=overlap.y-overlap.top-bottom-3;
  }
  lanes.push({x,y,width,top,bottom});
  c.save();
  if (roll.success && !spinning) {
   const lampX=u.x+7, lampY=u.y-38;
   glow(c,lampX,lampY,15,15,'#fff9b6','#ffc44772');
   ellipse(c,lampX,lampY,2.3,2.3,'#fffdee');
   const wave=clamp((age-duration)/.52), r=5+wave*(reduced?5:17);
   c.save(); c.globalAlpha*=1-wave;
   stroke(c,1.6,'#ffdb85',()=>c.arc(lampX,lampY,r,-1.5,-.22));
   stroke(c,1.2,'#ffeab0',()=>c.arc(lampX,lampY,r+4,-1.5,-.22)); c.restore();
  }
  c.translate(x/scale,y/scale); c.scale(1/scale,1/scale);
  let left=-rowWidth/2;
  for(const pose of poses){
   c.save();
   if(grouped)c.translate(left+pose.width/2,0);
   drawRollPair(c,pose,rank,age,spinning,reduced,duration,grouped);
   c.restore();
   left+=pose.width+pairGap;
  }
  if(label&&!spinning)rollLabel(c,label,e.sync||e.jackpot?{}:roll,u,tr,labelY);
  c.restore();
 }
}

const fireFloorDepth = .62;
const fireFlameCount = 14;
const fireImpactTime = .15;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));

function fireFloor(c, r, age, seed, reduced) {
 const flash = 1 - clamp(age / fireImpactTime);
 const pulse = Math.sin(age * 5.1 + noise(seed, 1) * tau) * (reduced ? .4 : 1);
 c.save();
 c.scale(1, fireFloorDepth);
 const soot = r * 1.13;
 ellipse(c, 0, 0, soot, soot, gradient(c, 0, 0, soot,
  [0, 'rgba(42,23,18,.4)'], [.55, 'rgba(42,23,18,.34)'],
  [.79, 'rgba(48,27,22,.18)'], [1, 'rgba(48,27,22,0)']));

 // A single pool with a soft, uneven edge and a few flecks of hot plastic.
 const points = Array.from({length: 18}, (_, i) => {
  const angle = i * tau / 18;
  const edge = r * (.80 + .23 * noise(seed, i + 20));
  return [Math.cos(angle) * edge, Math.sin(angle) * edge];
 });
 c.fillStyle = gradient(c, 0, 0, r * 1.03,
  [0, '#c04c21c4'], [.36, '#8e2f21d9'], [.69, '#51221fcf'],
  [.87, '#742e1f60'], [1, '#742e1f00']);
 c.beginPath();
 const last = points.at(-1);
 c.moveTo((last[0] + points[0][0]) / 2, (last[1] + points[0][1]) / 2);
 for (let i = 0; i < points.length; i++) {
  const [x, y] = points[i], [nextX, nextY] = points[(i + 1) % points.length];
  c.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
 }
 c.closePath();
 c.fill();
 for (let i = 0; i < 19; i++) {
  const angle = i * goldenAngle + noise(seed, i + 50);
  const distance = r * .83 * Math.sqrt(noise(seed, i + 70));
  const size = r * (.009 + .017 * noise(seed, i + 91));
  const heat = .34 + .17 * Math.sin(age * 4 + i * goldenAngle);
  ellipse(c, Math.cos(angle) * distance, Math.sin(angle) * distance,
   size, size * .66, `rgba(255,138,51,${heat})`);
 }

 const reach = r * 1.25 * (1 + .018 * pulse);
 c.globalCompositeOperation = 'lighter';
 ellipse(c, 0, 0, reach, reach, gradient(c, 0, 0, reach,
  [0, `rgba(255,177,68,${.25 + .028 * pulse + .46 * flash})`],
  [.36, `rgba(255,119,33,${.18 + .019 * pulse + .30 * flash})`],
  [.72, 'rgba(243,95,25,.047)'], [1, 'rgba(243,95,25,0)']));
 c.restore();
}

function fireFlames(c, r, age, seed, fade, reduced) {
 const particles = [];
 for (let i = 0; i < fireFlameCount; i++) {
  const life = .63 + .52 * noise(seed, i + 119);
  const clock = age / life + (i + noise(seed, i + 148)) / fireFlameCount;
  const generation = Math.floor(clock), phase = clock - generation;
  const sample = seed + generation * 181 + i * 223;
  const angle = i * goldenAngle + (noise(sample, 1) - .5) * 1.85;
  const orbit = r * .88 * Math.sqrt((i + noise(sample, 2)) / fireFlameCount);
  const x = Math.cos(angle) * orbit, y = Math.sin(angle) * orbit * fireFloorDepth;
  const sway = Math.sin(age * 6 + i * goldenAngle) * (reduced ? .21 : .60);
  particles.push({
   x, y, tip: sway,
   lift: r * .27 * phase * (.42 + .58 * fade),
   height: r * (.23 + .22 * noise(sample, 3)) * (1 - .54 * phase) * (.23 + .77 * fade),
   width: r * (.052 + .057 * noise(sample, 4)) * (1 - .57 * phase),
   opacity: clamp(phase / .12) * clamp((1 - phase) / .31) * .91,
  });
 }
 particles.sort((a, b) => a.y - b.y);
 for (const {x, y, tip, lift, height, width, opacity} of particles) {
  c.save();
  c.translate(x + width * tip * .35, y - lift);
  c.scale(width, height);
  c.globalAlpha *= opacity;
  c.fillStyle = gradient(c, .10, -.25, 1.27,
   [0, '#FFF3B0'], [.22, '#FFF3B0'], [.54, '#FF7A18'], [1, '#C8281C']);
  c.beginPath();
  c.moveTo(-.96, -.23);
  c.bezierCurveTo(-.86, -.54, tip - .43, -.67, tip, -1);
  c.bezierCurveTo(tip + .08, -.70, .91, -.49, .98, -.23);
  c.bezierCurveTo(1, .02, -.99, .10, -.96, -.23);
  c.closePath();
  c.fill();
  c.restore();
 }
}

function fireAir(c, r, age, seed, fade, reduced) {
 for (let i = 0; i < 8; i++) {
  const clock = age * (.73 + .42 * noise(seed, i + 160)) + noise(seed, i + 190);
  const phase = clock % 1, sample = seed + 29 * i + 137 * Math.floor(clock);
  const sway = Math.sin(phase * 5.4 + i) * (reduced ? .038 : .09);
  const x = r * ((noise(sample, 7) - .5) * 1.47 + sway);
  const y = r * ((noise(sample, 8) - .47) * .43 - phase * .70 * (.42 + .58 * fade));
  const size = Math.max(.55, r * (.007 + .011 * noise(sample, 9))) * (1 - .43 * phase);
  c.save();
  c.globalAlpha *= Math.sin(phase * Math.PI) * .83;
  ellipse(c, x, y, size, size * 1.25, '#FFE48D');
  c.restore();
 }
 for (let i = 0; i < 3; i++) {
  const phase = (age * .45 + i / 3) % 1;
  const x = r * ((i - 1) * .37 + phase * (reduced ? .07 : .18));
  const y = -r * (.37 + .45 * phase) * (.46 + .54 * fade);
  const alpha = .044 * Math.sin(phase * Math.PI) * clamp(age / .35);
  const size = r * (.22 + .17 * phase);
  ellipse(c, x, y, size, size, gradient(c, x, y, size,
   [0, `rgba(84,67,62,${alpha})`], [1, 'rgba(84,67,62,0)']));
 }
}

function fireZone(c, zone, view) {
 const age = view.time - zone.startedAt, fade = clamp(zone.until - view.time);
 if (age < 0 || !fade) return;
 const r = zone.radius * (.32 + .68 * ease(age / fireImpactTime));
 const seed = seedFor(zone) + Math.floor(zone.startedAt * 1000);
 c.save();
 c.translate(zone.x, zone.y);
 c.globalAlpha *= fade;
 fireFloor(c, r, age, seed, view.reduced);
 fireFlames(c, r, age, seed, fade, view.reduced);
 fireAir(c, r, age, seed, fade, view.reduced);
 c.restore();
}

// Match the projection and muzzle anchors in tools/build-signal-turret.py.
const turretModelScale=1.18,turretCell=144,turretViews=24,turretColumns=8;
const turretMuzzles=[null,[[38,0,25]],[[40,-6.1,25],[40,6.1,25]],
 [[42,-5.9,22.1],[42,5.9,22.1],[42,0,31.6]]];
const turretSheets=new Map();
function turretSheet(owner){
 const color=owner===1?'blue':'green';
 if(!turretSheets.has(color)&&typeof root.Image==='function'){
  const sprite=new root.Image();
  sprite.decoding='async';
  sprite.src='assets/models/signal-turret-'+color+'-v1.webp';
  turretSheets.set(color,sprite);
 }
 return turretSheets.get(color);
}
turretSheet(0);
if(root.location&&new URLSearchParams(root.location.search).has('coop'))turretSheet(1);

function turretPose(angle,age,reduced){
 const heading=Math.atan2(Math.sin(angle)/.8,Math.cos(angle));
 const dir=(Math.round(heading*turretViews/tau)+turretViews)%turretViews;
 const snap=dir*tau/turretViews;
 const recoil=reduced?0:2.7*(1-clamp(age/.10))**2;
 return {dir,co:Math.cos(snap),si:Math.sin(snap),recoil};
}
function turretFrame(c,sheet,col,row,x=0,y=0){
 c.drawImage(sheet,col*turretCell,row*turretCell,turretCell,turretCell,
  x-turretCell/2,y-turretCell*.7,turretCell,turretCell);
}
function turretModel(c,t,view){
 const pose=turretPose(t.angle,view.time-(t.turnedAt??-1),view.reduced);
 const sheet=turretSheet(t.owner),rows=turretViews/turretColumns;
 const x=-pose.co*pose.recoil,y=-pose.si*pose.recoil*.8;
 if(sheet?.complete&&sheet.naturalWidth){
  turretFrame(c,sheet,0,rows*3);
  turretFrame(c,sheet,pose.dir%turretColumns,((t.mountRank??t.rank)-1)*rows+Math.floor(pose.dir/turretColumns),x,y);
  return;
 }
 // Immediate silhouette while the WebP decodes.
 const paint=t.owner===1?'#5989a1':'#68844a';
 ellipse(c,0,-2,21,13,'#354735');
 c.save();c.translate(x,y-15);c.scale(1,.8);c.rotate(Math.atan2(pose.si,pose.co));
 polygon(c,[[-14,-12],[11,-15],[22,-7],[35,-4],[35,4],[22,7],[11,15],[-14,12]],'#374641');
 polygon(c,[[-14,-12],[11,-15],[19,-8],[11,11],[-14,12]],paint);
 c.restore();
}

function turretBody(c,t,view){
 const descent=clamp((view.time-t.startedAt)/(t.landAt-t.startedAt));
 const height=158*(1-descent**2.4);
 const scale=t.scale*turretModelScale;
 c.save();
 c.translate(t.x,t.y);
 c.scale(scale,scale);
 c.save();
 c.globalAlpha*=.46+.54*descent;
 const radius=24+4*(1-descent);
 const shadow=gradient(c,2,6,radius,[0,'#221b15ac'],[.55,'#2c28196e'],[1,'#39271100']);
 c.translate(2,6);c.scale(1,.61);c.translate(-2,-6);
 ellipse(c,2,6,radius,radius,shadow);
 c.restore();
 c.translate(0,-height);
 if(descent<1&&!view.reduced){
  c.save();c.globalAlpha=.43*Math.sin(descent*Math.PI);
  for(const x of [-15,4,15])stroke(c,1.7,'#fff2ba',()=>{c.moveTo(x,-24);c.lineTo(x,-43-descent*12);});
  c.restore();
 }
 turretModel(c,t,view);
 if(descent===1&&t.maxHp>0){
  const health=clamp(t.hp/t.maxHp);
  c.fillStyle='#203029';c.fillRect(-15,-43,30,5);
  c.fillStyle=t.owner===1?'#9edaf4':'#d3eba0';c.fillRect(-14,-42,28*health,3);
 }
 c.restore();
}

function turretEvent(c,e,p,view){
 const scale=e.scale*turretModelScale;
 c.save();
 c.translate(e.x,e.y);
 c.globalAlpha*=1-p;
 if(e.kind==='radioTurretShot'){
  const pose=turretPose(e.angle,p*e.max,view?.reduced??quiet());
  const [reach,side,height]=turretMuzzles[e.rank][e.barrel];
  const x=(pose.co*(reach-pose.recoil)-pose.si*side)*scale;
  const y=((pose.si*(reach-pose.recoil)+pose.co*side)*.8-height*.6)*scale;
  const tx=e.tx-e.x,ty=e.ty-e.y-11;
  const speed=e.pierced?'#ffb96c':'#ffe174';
  stroke(c,3*scale,speed,()=>{c.moveTo(x,y);c.lineTo(tx,ty);});
  stroke(c,1*scale,'#fff4b3',()=>{c.moveTo(x,y);c.lineTo(tx,ty);});
  glow(c,x,y,13*scale,7*scale,'#fff5be',e.pierced?'#ff74399a':'#ffaa429a');
  c.save();c.translate(x,y);c.rotate(Math.atan2(pose.si*.8,pose.co));c.scale(scale,scale);
  polygon(c,[[-2,0],[3,-2],[2,-6],[7,-3],[12,0],[6,3],[2,6],[3,2]],'#fff1b2');
  c.restore();
  ellipse(c,tx,ty,2.4*scale,1.7*scale,'#ffdda0');
 }else if(e.kind==='radioTurretEnd'&&e.radius>0){
  const reach=Math.max(1,e.radius*ease(p)),spark=e.radius*(.18+.60*p);
  stroke(c,1.1+3*(1-p),'#ffc782',()=>c.ellipse(0,0,reach,reach*.58,0,0,tau));
  if(p<.5)glow(c,0,-9*scale,scale*(22+40*p),scale*(11+18*p),'#fff1bb','#e87640a0');
  for(let i=0;i<8;i++){
   const angle=i*2.4+seedFor(e),x=Math.cos(angle)*spark,y=Math.sin(angle)*spark*.58;
   const lift=Math.sin(Math.PI*p)*(14+6*(i%3))*scale;
   glow(c,x,y-lift,scale*(7+9*p),scale*(4+6*p),'#ad785eb8','#61493813');
   if(p<.55)ellipse(c,x,y-lift-4*scale,1.7*scale,1.1*scale,'#ffda94');
  }
 }else{
  const landed=e.kind==='radioTurretLand',reach=scale*(7+20*ease(p));
  stroke(c,1.7*scale,landed?'#dbc295':'#d69255',()=>c.ellipse(0,0,reach,reach*.52,0,0,tau));
  for(let i=0;i<5;i++){
   const a=i*tau/5+seedFor(e),x=Math.cos(a)*reach,y=Math.sin(a)*reach*.5;
   glow(c,x,y-(landed?4:14)*p*scale,scale*(5+5*p),scale*(3+4*p),
    landed?'#d8c2a488':'#8d7b6488',landed?'#b49a7850':'#574c4235');
  }
  if(!landed&&p<.32)glow(c,0,-6*scale,16*scale,8*scale,'#ffe3a8','#e97635a0');
 }
 c.restore();
}

function ground(c,game,visible=()=>true) {
 const view=beginFrame(c,game);
 sky.syncOrigins(c,game);
 const events=game.effects||[];
 for(const e of events){
  if(e.kind!=='radioCrater'||!visible(e))continue;
  const life=e.t/e.max;
  c.save();c.translate(e.x,e.y);c.globalAlpha*=Math.min(1,life*1.65);
  sky.scorch(c,e.radius*.79,true);c.restore();
 }
 for (const zone of game.radioFireZones || []) {
  if (visible(zone)) fireZone(c, zone, view);
 }
 flyovers(c,game);
 groundPasses(c,game,visible,view);
}

// Paint the solid turret after grease, landing splashes and other translucent effects.
function turrets(c,game,visible=()=>true){
 const view=displayFrames.get(c);
 if(!view)return;
 for(const turret of game.radioTurrets||[]){
  if(turret.hp!==0&&view.time<turret.until&&visible(turret))turretBody(c,turret,view);
 }
}

function secondsToImpact(e,view){
 return Number.isFinite(e.landAt)?e.landAt-view.time:
  (e.kind==='radioIncoming'?e.t:e.t-e.max)-view.offset;
}
function flyovers(c,game,timeline=c){
 const view=displayFrames.get(timeline);
 if(!view)return;
 for(const e of game.effects||[]){
  if(e.kind==='radioIncoming'||e.kind==='radioImpact'&&e.strike==='incendiary'){
   sky.aircraft(c,e,secondsToImpact(e,view),view.reduced);
  }
 }
}

function groundPasses(c,game,visible,view){
 for(const e of game.effects||[]){
  if(e.kind!=='radioIncoming'||!visible(e))continue;
  const left=secondsToImpact(e,view);
  c.save();c.translate(e.x,e.y);
  sky.shadow(c,e,left);sky.marker(c,e,left,view.reduced);
  if(e.strike==='incendiary'&&left>0){
   const closing=clamp(1-left/e.max);
   glow(c,0,0,15+12*closing,7+6*closing,'#ffdd7ece','#f2762866');
   for(let i=0;i<3;i++){
    const a=i*tau/3+.4,d=6+16*(1-closing);
    ellipse(c,Math.cos(a)*d,Math.sin(a)*d*.55,2.4,1.4,'#ffc169');
   }
  }
  c.restore();
 }
}

const CELL_WIDTH=144,CELL_HEIGHT=216;
const atlas=typeof root.Image==='function'?new root.Image():null;
if(atlas)atlas.src='assets/effects/radio-strike-models-v214.webp';
// Prepare the flipbook after the initial page load. A first roll can also request it
// immediately. The procedural flames keep animating while a cold download finishes.
const TILE=192,FRAMES=24,COLUMNS=6,ROWS=FRAMES/COLUMNS;
let volumeAtlas;
function impactSheet(){
 if(!volumeAtlas&&typeof root.Image==='function'){
  volumeAtlas=new root.Image();
  volumeAtlas.decoding='async';
  volumeAtlas.src='assets/effects/radio-impact-volume-v1.webp';
  volumeAtlas.decode?.().catch(()=>{});
 }
 return volumeAtlas?.complete&&volumeAtlas.naturalWidth===TILE*COLUMNS&&volumeAtlas.naturalHeight===TILE*ROWS*4?volumeAtlas:null;
}
if(root.document&&typeof root.addEventListener==='function'){
 const warm=()=>impactSheet();
 const afterLoad=()=>root.requestIdleCallback?root.requestIdleCallback(warm,{timeout:900}):root.setTimeout(warm,0);
 if(root.document.readyState==='complete')afterLoad();
 else root.addEventListener('load',afterLoad,{once:true});
}
function paintVolume(c,sheet,band,p,x,y,width,height){
 const f=Math.min(FRAMES-1,Math.floor(clamp(p)*FRAMES));
 c.save();c.translate(x,y);if(width<0)c.scale(-1,1);
 const w=Math.abs(width);
 c.drawImage(sheet,(f%COLUMNS)*TILE,(band*ROWS+Math.floor(f/COLUMNS))*TILE,TILE,TILE,-w/2,-height*151/TILE,w,height);
 c.restore();
}
const prop={
 incendiary:{column:0,size:59,tail:.60,ink:'#ffd483',glare:'#fff0a9',wake:'#ff984f'},
 missile:{column:1,size:65,tail:.79,ink:'#c1eeef',glare:'#e3ffff',wake:'#8bc6cf'},
 nuke:{column:2,size:95,tail:.97,ink:'#ffd390',glare:'#fff4cf',wake:'#efaa61'}
};
function assetReady(){
 return atlas?.complete&&atlas.naturalWidth===CELL_WIDTH*3&&atlas.naturalHeight===CELL_HEIGHT*4;
}
function flash(c,r,alpha,color){
 if(alpha<=0)return;
 c.save();c.globalAlpha*=alpha;c.globalCompositeOperation='screen';
 glow(c,0,-2,r,r*.51,'#ffffeb',color);
 c.restore();
}
// Smoke starts at the nozzle. It stays on the same axis as the accelerated body.
function exhaust(c,length,t,nuke,fx,reduced){
 const white=fx?.textures?.whiteSmoke;
 const reach=(nuke?150:91)*(.45+.55*t),base=nuke?6:2.6,spread=nuke?17:6;
 c.save();c.translate(0,-length+2);
 const plume=c.createLinearGradient(0,0,0,-reach);
 plume.addColorStop(0,'#fffdf6f0');plume.addColorStop(.23,'#fffdf5cf');
 plume.addColorStop(.70,'#fffcf399');plume.addColorStop(1,'#f6f4ee00');
 c.beginPath();c.moveTo(-base,0);
 c.bezierCurveTo(-base,-reach*.22,-spread,-reach*.8,-spread,-reach);
 c.lineTo(spread,-reach);c.bezierCurveTo(spread,-reach*.8,base,-reach*.25,base,0);
 c.closePath();c.fillStyle=plume;c.fill();
 if(nuke&&white&&!reduced){
  for(let i=0;i<9;i++){
   const u=i/9,w=11+u*32;
   heatCloud(c,white,Math.sin(i*1.9+t*5)*4*u,-reach*u,w,w*1.3,(1-u)*.67);
  }
 }
 c.restore();
}
function drawFallback(c,width,length,style){
 const metal=c.createLinearGradient(-width/2,0,width/2,0);
 metal.addColorStop(0,'#273333');metal.addColorStop(.39,style.wake);metal.addColorStop(1,'#283531');
 const half=width*.32;
 polygon(c,[[-half,-length*.93],[-width*.5,-length],[-width*.44,-length*.77],[-half,-length*.66]],style.ink);
 polygon(c,[[half,-length*.93],[width*.5,-length],[width*.44,-length*.77],[half,-length*.66]],style.ink);
 polygon(c,[[-half,-length],[half,-length],[half,-length*.19],[0,0],[-half,-length*.19]],metal);
 c.fillStyle=style.glare;c.fillRect(-half,-length*.39,width*.64,2);
}
function incoming(c,e,fx){
 const view=displayFrames.get(c),style=prop[e.strike],reduced=view?.reduced??quiet(),nuke=e.strike==='nuke';
 const time=view?.time??fx?.time;
 const left=Number.isFinite(e.landAt)&&Number.isFinite(time)?e.landAt-time:e.t-(view?.offset||0);
 if(left>sky.flightSeconds[e.strike])return;
 const point=sky.pose(c,e,left),travel=point.t;
 c.save();c.translate(point.x,point.y);c.rotate(point.angle);
 const length=style.size*style.tail,w=style.size*CELL_WIDTH/CELL_HEIGHT;
 const jet=nuke?51:27;
 if(e.strike!=='incendiary')exhaust(c,length,travel,nuke,fx,reduced);
 const plume=c.createLinearGradient(0,-length-jet,0,-length+3);
 plume.addColorStop(0,'#d8a87900');plume.addColorStop(.38,style.wake+'a0');
 plume.addColorStop(.76,style.glare);plume.addColorStop(1,'#ffffed');
 const nozzle=w*(nuke?.12:.092),delta=reduced?0:Math.sin(travel*44)*3;
 c.beginPath();c.moveTo(-nozzle,-length+4);
 c.bezierCurveTo(-nozzle*1.7,-length-12,nozzle*.2,-length-jet*.72,delta,-length-jet);
 c.bezierCurveTo(nozzle*.32,-length-jet*.65,nozzle*1.6,-length-11,nozzle,-length+4);
 c.closePath();c.fillStyle=plume;c.fill();
 if(assetReady()){
  const frame=Math.min(3,Math.floor(travel*4));
  c.drawImage(atlas,style.column*CELL_WIDTH,frame*CELL_HEIGHT,CELL_WIDTH,CELL_HEIGHT,-w/2,-style.size,w,style.size);
 }else drawFallback(c,w,length,style);
 c.restore();
}
// A ring reaches the actual damage radius before it fades, while the plume rises above it.
function missilePressure(c,r,p,style,reduced){
 const q=clamp(p/.72),radius=r*((reduced?.55:.18)+(reduced?.45:.82)*ease(q));
 if(q===1)return;
 c.save();c.globalAlpha*=clamp(1-q)*(reduced?.46:.86);
 stroke(c,3.5,style.wake+'99',()=>c.arc(0,0,radius,0,tau));
 stroke(c,1.2,style.glare,()=>c.arc(0,0,radius,0,tau));
 if(!reduced)stroke(c,1.05,style.ink+'a8',()=>c.arc(0,0,radius*(.82+.10*q),0,tau));
 c.restore();
}
function heatCloud(c,image,x,y,w,h,alpha){
 if(!image||alpha<=0)return;
 c.save();c.globalAlpha*=alpha;c.drawImage(image,x-w*.5,y-h*.55,w,h);c.restore();
}
function groundSurge(c,e,p,textures){
 const nuke=e.strike==='nuke',seed=seedFor(e),life=nuke?.73:.60;
 if(p>=life)return;
 const t=p/life,d=e.radius*(.13+.87*ease(t));
 c.save();c.globalAlpha*=Math.sin(Math.PI*Math.sqrt(t))*(nuke?.86:.66);
 const count=nuke?18:8;
 for(let i=0;i<count;i++){
  const a=tau*(i+noise(seed,i)*.48)/count;
  const x=Math.cos(a)*d,y=Math.sin(a)*d;
  const w=e.radius*(.13+.12*noise(seed,i+3))*(.5+.8*t);
  heatCloud(c,textures?.dust?.[i%2],x,y,w,w*.5,.83);
  if(nuke&&i%3!==1){
   stroke(c,1.5+1.6*(1-t),'#fff1c48c',()=>c.arc(0,0,d,a-.088,a+.072));
  }
 }
 c.restore();
}
function secondaryBurst(c,e,p,style,textures,reduced){
 const r=e.radius,fire=e.strike==='incendiary',seed=seedFor(e),bloom=ease(p/.46),heat=clamp(1-p/.76);
 c.save();
 if(fire){
  const width=r*(.27+.48*bloom);
  glow(c,0,0,width,width*.65,'#ec6b29d0','#be431b70');
  for(let i=0;i<(reduced?4:9);i++){
   const a=i*2.39996+seed*.09,d=r*(.12+.5*noise(seed,i))*bloom;
   const x=Math.cos(a)*d,y=Math.sin(a)*d-(6+r*.17)*bloom*noise(seed,i+11);
   const w=r*(.18+.14*noise(seed,i+7))*(.58+bloom*.77),h=w*(.92+noise(seed,i+20)*.69);
   heatCloud(c,textures?.fire?.[i%3],x,y,w,h,heat*.95);
   const tongue=w*.37*(1-.4*p);
   flame(c,x,y,tongue*.62,tongue,Math.cos(a)*tongue*.45);
  }
 }else{
  // The cool plastic shell breaks away from the warm impact core.
  for(let i=0;i<(reduced?3:7);i++){
   const a=i*2.39996+(e.angle||0),d=r*(.14+.29*noise(seed,i))*bloom;
   const x=Math.cos(a)*d,y=Math.sin(a)*d-bloom*r*.24;
   const w=r*(.23+.21*noise(seed,i+22))*(.6+bloom*.9);
   heatCloud(c,textures?.smoke?.[i%3],x,y,w,w*.91,.76);
   heatCloud(c,textures?.fire?.[i%3],x,y+4,w*.78,w*.65,heat*.76);
  }
  glow(c,0,-9,r*(.22+.22*bloom),r*.22,'#fff1bb','#ff992575');
 }
 c.restore();
}
function cloudDepth(c,r,p,seed,textures,reduced){
 // The expanding cap is widest at the lit underside, connected by the tapered stem.
 const rise=ease(p/.75),h=r*(.23+.42*rise),width=r*(.13+.24*rise),hot=clamp(1-p/.82),wind=Math.sin(seed)*r*.055*rise;
 c.save();
 const column=c.createLinearGradient(-r*.13,0,r*.1,-h*.22);
 column.addColorStop(0,'#644031');column.addColorStop(.42,'#d17a43');column.addColorStop(.64,'#ffd590');
 column.addColorStop(.82,'#a15c3b');column.addColorStop(1,'#64453a');
 c.beginPath();c.moveTo(-r*.18,2);
 c.bezierCurveTo(-r*.07,-h*.12,-r*.13,-h*.34,wind-r*.058,-h*.52);
 c.bezierCurveTo(wind-r*.03,-h*.66,wind-r*.12,-h*.82,wind-width*.42,-h*.99);
 c.lineTo(wind+width*.44,-h*.99);
 c.bezierCurveTo(wind+r*.22,-h*.78,wind+r*.02,-h*.69,wind+r*.065,-h*.52);
 c.bezierCurveTo(wind+r*.103,-h*.31,r*.04,-h*.16,r*.16,1);
 c.quadraticCurveTo(0,r*.05,-r*.18,2);c.closePath();c.fillStyle=column;c.fill();c.clip();
 for(let i=0;i<6;i++){
  const q=(i+.5)/6, x=wind*q+Math.sin(q*11+p*3)*r*.047,y=-h*(.13+q*.83),w=r*(.19+.16*noise(seed,i));
  heatCloud(c,textures?.smoke?.[i%3],x,y,w,w*.84,.8);
  heatCloud(c,textures?.fire?.[i%3],x,y+5,w*.94,w*1.1,hot*.84);
 }
 c.restore();
 c.save();c.translate(wind,-h);
 const puff=[[-1.00,.01],[-.99,-.24],[-.81,-.40],[-.73,-.60],[-.49,-.57],[-.32,-.81],[-.03,-.78],[.15,-.87],[.42,-.69],[.64,-.65],[.76,-.42],[.96,-.39],[1.01,-.16],[.97,.07],[.78,.15],[.62,.30],[.36,.27],[.15,.43],[-.09,.34],[-.34,.42],[-.56,.27],[-.78,.24]];
 const points=puff.map(([x,y],i)=>[width*(x+(noise(seed,i)-.5)*.10),width*(y+(noise(seed,i+7)-.5)*.12)]);
 c.beginPath();c.moveTo((points[0][0]+points.at(-1)[0])/2,(points[0][1]+points.at(-1)[1])/2);
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i],[nx,ny]=points[(i+1)%points.length];
  c.quadraticCurveTo(x,y,(x+nx)/2,(y+ny)/2);
 }
 c.closePath();
 const mantle=c.createLinearGradient(0,-width*.82,0,width*.42);
 mantle.addColorStop(0,'#b49e86');mantle.addColorStop(.36,'#956f57');
 mantle.addColorStop(.67,'#6b4d42');mantle.addColorStop(.88,hot>.38?'#ffd7a0':'#b8825f');
 mantle.addColorStop(1,'#9d6045');
 c.fillStyle=mantle;c.fill();c.clip();
 for(let i=0;i<(reduced?7:12);i++){
  const band=i%2,x=width*((i+.5)/6%1*2-1), span=Math.sqrt(Math.max(0,1-(x/width)**2));
  const y=width*((band?-.28:-.48)*span+(noise(seed,i+17)-.5)*.29),w=width*(.56+.34*noise(seed,i+11));
  heatCloud(c,textures?.smoke?.[i%3],x,y,w,w*.9,.87);
  heatCloud(c,textures?.fire?.[i%3],x,y+width*.36,w*.96,w*.72,hot*.87);
  if(!textures)glow(c,x,y,w*.45,w*.37,'#d3b69a70','#ad968e64');
 }
 c.restore();
 if(!reduced){
  for(let i=0;i<6;i++){
   const q=i/6,a=i*2.39996,d=r*(.21+q*.58)*ease(p/.7),w=r*(.23+q*.22);
   heatCloud(c,textures?.dust?.[i%2],Math.cos(a)*d,Math.sin(a)*d,w,w*.46,clamp(1-p/.9)*.92);
  }
 }
}
function embers(c,e,p,nuke){
 const r=e.radius,seed=seedFor(e),reach=ease(p/.83);
 c.save();c.globalAlpha*=clamp(1-p/.9)*.95;c.lineCap='round';
 for(let i=0;i<(nuke?22:10);i++){
  const a=i*2.39996+noise(seed,i)*.54,dx=Math.cos(a),dy=Math.sin(a);
  const d=r*(.30+.67*noise(seed,i+34))*reach,lift=Math.sin(p*Math.PI)*r*(.14+.37*noise(seed,i+12));
  const x=dx*d,y=dy*d-lift,size=2+noise(seed,i+4)*(nuke?12:8);
  stroke(c,1+noise(seed,i)*1.8,i%3?'#ffbd6c':'#fffad7',()=>{c.moveTo(x-dx*size*.8,y-dy*size*.52+size*.36);c.lineTo(x,y);});
 }
 c.restore();
}
function impact(c,e,p,fx,reduced){
 const style=prop[e.strike],nuke=e.strike==='nuke',r=e.radius;
 const textures=fx?.prepareImpactMaterials?.(),heat=clamp(1-p/(nuke?.28:.25));
 if(nuke){
  const age=p*e.max,q=clamp(age/.32),radius=r*(1-(1-q)**2);
  if(age<.44&&radius>0){
   c.save();c.globalAlpha*=clamp((.44-age)/.16)*(reduced?.30:.92);
   stroke(c,4+8*(1-q),'#fffdf2',()=>c.arc(0,0,radius,0,tau));c.restore();
  }
 }else if(e.strike==='missile')missilePressure(c,r,p,style,reduced);
 if(!reduced)groundSurge(c,e,p,textures);
 flash(c,r*(.40+.17*p),heat*(reduced?.46:.85),style.wake+'b8');
 c.save();c.globalAlpha*=clamp((1-p)/(nuke?.32:.23));
 const sheet=impactSheet();
 if(sheet){
  const size=r*(nuke?1.58:1.92);
  const mirrored=e.strike==='missile'&&e.seq===1;
  // Expand along the floor, then lift the plume while keeping its base on the impact point.
  const rise=ease(p/.73),lift=reduced?.075:(nuke?.25:.18);
  const height=size*(1-lift+lift*rise),width=size*(1-.1*(1-ease(p/.31)));
  paintVolume(c,sheet,style.column,p,0,0,mirrored?-width:width,height);
 }else if(nuke)cloudDepth(c,r,p,seedFor(e),textures,reduced);
 else secondaryBurst(c,e,p,style,textures,reduced);
 if(!reduced)embers(c,e,p,nuke);
 c.restore();
}

function event(c,e,fx) {
 if(e.kind==='radioTurretShot'||e.kind==='radioTurretLand'||e.kind==='radioTurretEnd'){
  const view=displayFrames.get(c);
  const age=view?view.time-e.at:e.max-e.t;
  if(age>=0&&age<e.max)turretEvent(c,e,age/e.max,view);
  return true;
 }
 if(e.kind==='radioCrater')return true; // Painted under units until the soot dissipates.
 if(e.kind==='radioRoll'){impactSheet();return true;} // Heads-up result renders after units and blasts.
 if((e.kind!=='radioIncoming'&&e.kind!=='radioImpact')||!Object.hasOwn(prop,e.strike))return false;
 if(e.kind==='radioImpact'&&e.strike==='incendiary')return true; // The fire zone draws its own flash.
 const view=displayFrames.get(c);
 const age=view&&Number.isFinite(e.at)?view.time-e.at:e.max-e.t+(view?.offset||0);
 const p=clamp(age/e.max);
 c.save();c.translate(e.x,e.y);
 if(e.kind==='radioIncoming')incoming(c,e,fx);else impact(c,e,p,fx,view?.reduced??quiet());
 c.restore();return true;
}
root.FrontRadioArt={event,rolls,ground,turrets,flyovers};
})(typeof window==='undefined'?globalThis:window);

