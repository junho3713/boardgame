/* Compact dice and roulette callouts share a budget per battle view. */
(function(root){
'use strict';
const HOLD=.52,REPEAT=.5,LIMIT=2;
const diceNames={turret:'기관포탑',incendiary:'소이탄',missile:'미사일',nuke:'전술 핵'};
const luckyNames={missiles:'777',bossKiller:'보스킬러'};
const frames=new WeakMap(),reducedMotion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
function full(mode,u,rank=u.star||1){
 return u.team!==0||mode==='full'||mode!=='minimal'&&rank<2;
}
function hotline(e){return e.kind==='evolutionLink'&&e.link==='gamblers';}
function collect(game,mode,visible){
 const entries=[],spinners=[],time=game.time;
 const enqueue=(u,id,label,at,priority=false,icon=null)=>{
  if(time<at-1e-5||time>=at+(priority?.75:HOLD))return;
  entries.push({u,id,label,at,priority,icon,until:at+(priority?.75:HOLD)});
 };
 for(const e of game.effects){
  const u=e.source||e;
  if(!visible(u))continue;
  if(hotline(e)){
   if(mode!=='full'){
    const at=effectStart(time,e);
    enqueue({x:e.x,y:e.y,type:'lucky'},'hotline:'+e.x+':'+e.y+':'+at,'행운의 핫라인',at,true,'missiles');
   }
   continue;
  }
  const rank=e.rank||u.star||1;
  if(e.kind!=='radioRoll'||full(mode,u,rank))continue;
  const pairs=e.rolls?.length?e.rolls:[{dice:[e.a,e.b],success:e.a===e.b,strike:e.strike}];
  const doubles=pairs.filter(p=>p.success),nuke=doubles.find(p=>p.strike==='nuke');
  if(!doubles.length||mode==='minimal'&&!nuke)continue;
  const lead=nuke??doubles[0],at=effectStart(time,e)+(rank===3?.16:.23);
  const names=[...new Set(doubles.map(p=>p.dice.join('–')))];
  const result=diceNames[nuke?'nuke':lead.strike??e.strike];
  const faces=nuke?lead.dice.join('–'):names.join(' · ');
  const label=result?faces+'  '+result:faces;
  enqueue(u,'radio:'+u.id+':'+at,label,at,!!nuke);
 }
 for(const u of game.units){
  if(u.type!=='lucky'||u.hp<=0||full(mode,u)||!visible(u))continue;
  const rolls=(u.luckyChannels||[{roll:u.luckyRoll}]).map(c=>c.roll).filter(Boolean);
  if(mode!=='minimal'&&rolls.some(r=>!r.resolved&&time>=r.startedAt&&time<r.endsAt))spinners.push(u);
  if(mode==='minimal')continue;
  const wins=new Map();
  for(const r of rolls){
   if(!r.resolved||!luckyNames[r.kind])continue;
   const at=r.resultAt??r.endsAt;
   if(time<at||time>=at+HOLD)continue;
   const win=wins.get(r.kind);
   if(win&&win.at===at)win.count++;
   else if(!win||at>win.at)wins.set(r.kind,{at,count:1});
  }
  for(const [kind,{at,count}] of wins){
   const label=luckyNames[kind]+(count>1?' ×'+count:'');
   enqueue(u,'lucky:'+u.id+':'+kind+':'+at,label,at,false,kind);
  }
 }
 return {entries,spinners};
}
function effectStart(time,e){return Math.round((e.at??time-(e.max-e.t))*1000)/1000;}
function plan(game,mode,visible){
 if(mode==='full')return {spinners:[],results:[]};
 const {entries,spinners}=collect(game,mode,visible);
 let frame=frames.get(game);
 if(!frame||frame.mode!==mode||game.time<frame.time){
  frame={mode,past:new Map(),recent:new Map()};frames.set(game,frame);
 }
 frame.time=game.time;
 for(const [id,row] of frame.past)if(game.time>=row.until)frame.past.delete(id);
 for(const [label,at] of frame.recent)if(game.time-at>REPEAT+HOLD)frame.recent.delete(label);
 const ordinary=entries.filter(row=>!row.priority).sort((a,b)=>a.at-b.at);
 const accepted=ordinary.filter(row=>frame.past.get(row.id)?.accepted).slice(0,LIMIT);
 for(const row of ordinary){
  if(frame.past.has(row.id))continue;
  const last=frame.recent.get(row.label)??-Infinity;
  const show=accepted.length<LIMIT&&row.at>=last+REPEAT-1e-5;
  frame.past.set(row.id,{until:row.until,accepted:show});
  if(show){
   frame.recent.set(row.label,row.at);
   accepted.push(row);
  }
 }
 return {spinners,results:accepted.concat(entries.filter(row=>row.priority))};
}
function ring(c,x,y,time){
 const angle=reducedMotion?.matches?0:time*8;
 c.strokeStyle='#d5e7cc70';c.lineWidth=1.25;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.stroke();
 c.strokeStyle='#fff0bb94';c.lineWidth=1.8;c.beginPath();c.arc(x,y,6,angle,angle+1.45);c.stroke();
}
function drawSpinners(c,game,spinners){
 if(!spinners.length)return;
 const tr=c.getTransform(),ratio=c.canvas.width/Math.max(1,c.canvas.clientWidth);
 const scale=Math.max(.1,Math.hypot(tr.a,tr.b)/ratio);
 for(const u of spinners){
  c.save();c.translate(u.x,u.y-111);c.scale(1/scale,1/scale);ring(c,0,0,game.time);c.restore();
 }
}
function draw(c,game,results,fx){
 if(!results.length)return;
 const tr=c.getTransform(),ratio=c.canvas.width/Math.max(1,c.canvas.clientWidth),width=c.canvas.width/ratio,height=c.canvas.height/ratio;
 const project=(u,rise)=>({x:(tr.a*u.x+tr.e)/ratio,y:(tr.d*(u.y-rise)+tr.f)/ratio});
 const occupied=[];
 c.save();c.setTransform(ratio,0,0,ratio,0,0);
 // Reserve space for jackpots first, then paint these callouts above the ordinary results.
 const placed=[];
 for(const row of results.slice().reverse()){
  const {u,label,priority,icon}=row;
  let rise=u.type==='lucky'?131:100;
  if(u.type==='guntruck'&&game.captainStackHpMode&&root.FrontUnitLabels){
   const labels=root.FrontUnitLabels,name=labels.evolution(game,u);
   rise=u.y-(name?.y??labels.stackStarY(u))+19*ratio/Math.max(.1,tr.d);
  }
  const p=project(u,rise);
  const h=priority?26:21;
  const font='700 '+(priority?13:11)+'px system-ui';
  c.font=font;
  const w=Math.ceil(c.measureText(label).width)+(icon?37:19);
  const x=Math.min(width-w/2-3,Math.max(w/2+3,p.x));
  const top=Math.min(56,height*.18)+h/2,bottom=Math.max(top,height-h/2-8);
  const anchor=Math.min(bottom,Math.max(top,p.y));
  const overlaps=y=>occupied.some(a=>Math.abs(a.x-x)<(a.w+w)/2+4&&Math.abs(a.y-y)<(a.h+h)/2+3);
  let y=anchor;
  for(let d=h+5;overlaps(y)&&d<=height;d+=h+5){
   if(anchor-d>=top&&!overlaps(anchor-d))y=anchor-d;
   else if(anchor+d<=bottom&&!overlaps(anchor+d))y=anchor+d;
  }
  occupied.push({x,y,w,h});placed.push({...row,x,y,w,h,font});
 }
 for(const row of placed.reverse()){
  const {x,y,w,h,font,label,icon,priority,until}=row;
  c.globalAlpha=Math.min(1,(until-game.time)/.12);
  c.fillStyle=priority?'#302621':'#20312b';c.strokeStyle=priority?'#ffd261':'#9ba98d';
  c.lineWidth=priority?1.7:1;
  c.beginPath();c.roundRect(x-w/2,y-h/2,w,h,5);c.fill();c.stroke();
  if(icon)fx.luckySymbol(c,icon,x-w/2+13,y,14);
  c.font=font;c.textBaseline='middle';c.textAlign='center';c.fillStyle=priority?'#fff0b0':'#f1f5df';
  c.fillText(label,x+(icon?8:0),y+.5);
 }
 c.restore();
}
const api={full,hotline,plan,drawSpinners,draw};
if(typeof module!=='undefined')module.exports=api;
else root.FrontRollOverlay=api;
})(typeof window==='undefined'?globalThis:window);
