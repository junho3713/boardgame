/* Compact dice and roulette results share a budget per battle view. */
(function(root){
'use strict';
const HOLD=.52,MISS_HOLD=.34,REPEAT=.5,LIMIT=2,STEP=26;
const luckyFaces=new Set(['bossKiller','missiles','mine','spray','glue']);
const diceOrder=['turret','incendiary','missile','nuke'];
const pips=[[],[[0,0]],[[-1,-1],[1,1]],[[-1,-1],[0,0],[1,1]],
 [[-1,-1],[1,-1],[-1,1],[1,1]],[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],
 [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]];
const frames=new WeakMap();
function full(mode,u,rank=u.star||1){
 return u.team!==0||mode==='full'||mode!=='minimal'&&rank<2;
}
function hotline(e){return e.kind==='evolutionLink'&&e.link==='gamblers';}
function effectStart(time,e){return Math.round((e.at??time-(e.max-e.t))*1000)/1000;}
function badgeOrder(a,b){
 return diceOrder.indexOf(b.strike)-diceOrder.indexOf(a.strike)||b.dice[0]-a.dice[0];
}
function collect(game,mode,visible){
 const entries=[],time=game.time;
 const enqueue=(u,id,key,at,badge)=>{
  const end=at+(badge.priority?.75:badge.miss?MISS_HOLD:HOLD);
  if(time>=at-1e-5&&time<end)entries.push({u,id,key,at,until:end,...badge});
 };
 for(const e of game.effects){
  if(e.kind!=='radioRoll'&&!hotline(e))continue;
  const u=e.source||e;
  if(!visible(u))continue;
  if(hotline(e)){
   const at=effectStart(time,e);
   enqueue({x:e.x,y:e.y,type:'lucky'},'hotline:'+e.x+':'+e.y+':'+at,'hotline',at,{kind:'hotline',priority:true});
   continue;
  }
  const rank=e.rank||u.star||1;
  if(full(mode,u,rank))continue;
  const pairs=e.rolls?.length?e.rolls:[{dice:[e.a,e.b],success:e.a===e.b,strike:e.strike}];
  const best=pairs.filter(p=>p.success&&p.dice?.[0]>=1&&p.dice[0]<=6).sort(badgeOrder)[0];
  const priority=best?.strike==='nuke';
  if(mode==='minimal'&&!priority)continue;
  const at=effectStart(time,e)+(rank===3?.16:.23),face=best?.dice[0];
  enqueue(u,'radio:'+u.id+':'+at,'dice:'+(face??'blank'),at,{kind:'dice',face,priority,miss:!best});
 }
 if(mode==='minimal')return entries;
 for(const u of game.units){
  if(u.type!=='lucky'||u.hp<=0||full(mode,u)||!visible(u))continue;
  const rolls=(u.luckyChannels||[{roll:u.luckyRoll}]).map(c=>c.roll);
  const resolved=rolls.filter(r=>{
   if(!r?.resolved)return false;
   const age=time-(r.resultAt??r.endsAt);
   return age>=0&&age<(luckyFaces.has(r.kind)?HOLD:MISS_HOLD);
  });
  if(!resolved.length)continue;
  const at=Math.max(...resolved.map(r=>r.resultAt??r.endsAt));
  const slots=resolved.slice(0,3).map(r=>luckyFaces.has(r.kind)?
   {kind:r.kind,glow:Math.max(0,1-(time-(r.resultAt??r.endsAt))/.22)}:{blank:true});
  const key=slots.map(slot=>slot.kind??'').join(',');
  enqueue(u,'lucky:'+u.id+':'+at,'lucky:'+key,at,{kind:'lucky',slots,priority:false,miss:slots.every(slot=>slot.blank)});
 }
 return entries;
}
function plan(game,mode,visible){
 if(mode==='full')return {results:[]};
 const entries=collect(game,mode,visible);
 let frame=frames.get(game);
 if(!frame||frame.mode!==mode||game.time<frame.time){
  frame={mode,past:new Map(),recent:new Map()};frames.set(game,frame);
 }
 frame.time=game.time;
 for(const [id,row] of frame.past)if(game.time>=row.until)frame.past.delete(id);
 for(const [key,at] of frame.recent)if(game.time-at>REPEAT+HOLD)frame.recent.delete(key);
 // A visible win takes a slot before a miss, including when the next result arrives during a miss.
 const ordinary=entries.filter(row=>!row.priority).sort((a,b)=>Number(a.miss)-Number(b.miss)||a.at-b.at);
 const accepted=[];
 for(const row of ordinary){
  if(!frame.past.has(row.id)){
   const last=frame.recent.get(row.key)??-Infinity;
   const show=accepted.length<LIMIT&&row.at>=last+REPEAT-1e-5;
   frame.past.set(row.id,{until:row.until,accepted:show});
   if(show)frame.recent.set(row.key,row.at);
  }
  if(accepted.length<LIMIT&&frame.past.get(row.id).accepted)accepted.push(row);
 }
 return {results:accepted.concat(entries.filter(row=>row.priority))};
}
function plate(c,x,y,w,h,fill,stroke){
 c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=1.3;
 c.beginPath();c.roundRect(x,y,w,h,4);c.fill();c.stroke();
}
function fallout(c){
 c.save();c.translate(9,-10);
 c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fillStyle='#f9d577';c.fill();
 c.strokeStyle='#69431e';c.lineWidth=1;c.stroke();
 c.fillStyle='#543018';
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3-Math.PI/2;
  c.beginPath();c.arc(0,0,4,a-.43,a+.43);c.arc(0,0,1.8,a+.43,a-.43,true);c.closePath();c.fill();
 }
 c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();c.restore();
}
function diceBadge(c,row,fx){
 plate(c,-7,-13,19,20,'#acaa8b',row.priority?'#98612b':'#595d4d');
 const enamel=c.createLinearGradient(0,-9,0,11);
 enamel.addColorStop(0,row.priority?'#fff2b5':'#fff9e9');enamel.addColorStop(1,row.priority?'#e4af59':'#dfdcc8');
 plate(c,-11,-9,21,20,enamel,row.priority?'#a77526':'#454b3e');
 c.translate(-.5,1);
 if(row.miss)fx.rollMiss(c,0,0);
 else{
  c.fillStyle='#29342a';
  for(const [x,y] of pips[row.face]){c.beginPath();c.arc(x*4.7,y*4.7,row.face===1?2.45:1.48,0,Math.PI*2);c.fill();}
 }
 if(row.priority)fallout(c);
}
function rouletteBadge(c,row,fx){
 const offset=(row.slots.length-1)/2;
 row.slots.forEach((slot,i)=>fx.luckyResultTile(c,slot,(i-offset)*STEP,0,true));
}
function hotlineBadge(c){
 plate(c,-12,-12,24,24,'#3c3526','#e8bd65');
 c.rotate(-Math.PI/4);
 c.strokeStyle='#ffe49a';c.lineWidth=1.7;
 for(const x of [-8,1]){c.beginPath();c.roundRect(x,-3,8,6,2.7);c.stroke();}
 c.beginPath();c.moveTo(-2,0);c.lineTo(3,0);c.stroke();
}
function draw(c,game,results,fx){
 if(!results.length)return;
 const tr=c.getTransform(),ratio=c.canvas.width/Math.max(1,c.canvas.clientWidth);
 const width=c.canvas.width/ratio,height=c.canvas.height/ratio,placed=[];
 c.save();c.setTransform(ratio,0,0,ratio,0,0);
 // Give jackpots the first choice of location, then paint them last.
 for(const row of results.slice().reverse()){
  const {u}=row;
  let rise=u.type==='lucky'?131:100;
  if(u.type==='guntruck'&&game.captainStackHpMode&&root.FrontUnitLabels){
   const labels=root.FrontUnitLabels,name=labels.evolution(game,u);
   rise=u.y-(name?.y??labels.stackStarY(u))+21*ratio/Math.max(.1,tr.d);
  }
  const w=row.kind==='lucky'?STEP*row.slots.length:29,h=row.priority?29:25;
  const x=Math.min(width-w/2-3,Math.max(w/2+3,(tr.a*u.x+tr.e)/ratio));
  const top=Math.min(56,height*.18)+h/2,bottom=Math.max(top,height-h/2-8);
  const anchor=Math.min(bottom,Math.max(top,(tr.d*(u.y-rise)+tr.f)/ratio));
  const overlaps=y=>placed.some(a=>Math.abs(a.x-x)<(a.w+w)/2+4&&Math.abs(a.y-y)<(a.h+h)/2+3);
  let y=anchor;
  for(let d=h+5;overlaps(y)&&d<=height;d+=h+5){
   if(anchor-d>=top&&!overlaps(anchor-d))y=anchor-d;
   else if(anchor+d<=bottom&&!overlaps(anchor+d))y=anchor+d;
  }
  placed.push({row,x,y,w,h});
 }
 for(const {row,x,y} of placed.reverse()){
  c.save();c.translate(x,y);c.globalAlpha*=Math.min(1,(row.until-game.time)/.12)*(row.miss?.82:1);
  if(row.kind==='dice')diceBadge(c,row,fx);
  else if(row.kind==='lucky')rouletteBadge(c,row,fx);
  else hotlineBadge(c);
  c.restore();
 }
 c.restore();
}
const api={full,hotline,plan,draw};
if(typeof module!=='undefined')module.exports=api;
else root.FrontRollOverlay=api;
})(typeof window==='undefined'?globalThis:window);
