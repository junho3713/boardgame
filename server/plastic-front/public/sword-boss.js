/* Four persistent blades shared by the room finale and isolated trial. */
(function(root){'use strict';
const api=typeof module!=='undefined'&&module.exports?require('./engine.js'):root,Game=api.FrontGame,Types=api.TYPES||api.FrontTypes,Profile=api.FrontProfile;
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const CONFIG={name:'사검의 군주',hp:140800,healthVersion:167,defense:28,damage:85,firstHitRatio:.5,overlapHitRatio:.1,shieldHalfAngle:Math.PI/4,orbit:108,modeWarning:1.5,phaseWarning:2,interval:2.4,phase2Interval:1.4,returnTime:.7,dodge:{enabled:true,patterns:['spin','vertical','horizontal'],margin:18,sprint:1.6,hold:.3},drop:{warn:1.4,duration:.16,radius:50,damage:1},rear:{warn:1.35,duration:.12,radius:43,damage:1.2},spin:{turnsPerSecond:6,rest:1.6,phase2Rest:.95,warn:2.1,duration:1,radius:62,damage:1.05,length:620,spacing:240},vertical:{withdraw:0,rest:1.6,phase2Rest:.95,warn:1.175,duration:.28,radius:40,damage:1.15,length:720,spacing:220},horizontal:{withdraw:0,rest:1.6,phase2Rest:.95,warn:1.175,duration:.28,radius:40,damage:1.15,length:720,spacing:220}};
const PATTERNS=['drop','rear','spin','vertical','horizontal'],LABELS={drop:'무작위 낙검',rear:'후열 급습',spin:'회전 비검',vertical:'세로 대열 돌진',horizontal:'가로 대열 돌진'};
Types.swordEmpress={name:CONFIG.name,hp:CONFIG.hp,damage:0,rate:100,range:0,speed:0,r:28,cost:0,role:'검4개를 조종하는 공중 보스',stationary:true};
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
function actionDistance(p,a){return ['drop','rear'].includes(a.pattern)?Math.hypot(p.x-a.end.x,p.y-a.end.y):segmentDistance(p,a.start,a.end);}
function formationCenter(value,low,high,span){return high-low>=span+90?clamp(value,low+span/2+45,high-span/2-45):value;}
function idlePoint(b,s){return{x:b.x+Math.cos(s.dir)*CONFIG.orbit,y:b.y+Math.sin(s.dir)*CONFIG.orbit};}
function blockedBlade(b,source,cfg=CONFIG){if(!source||!Number.isFinite(source.x)||!Number.isFinite(source.y)||b.swords.phase===2)return null;const a=Math.atan2(source.y-b.y,source.x-b.x);return b.swords.blades.find(s=>s.mode==='defend'&&Math.abs(delta(a,s.dir))<=cfg.shieldHalfAngle+1e-9)||null;}
class Trial extends Game{
 upgradeTrialArena(){
  this.trialConfig.firstHitRatio=CONFIG.firstHitRatio;this.trialConfig.overlapHitRatio=CONFIG.overlapHitRatio;this.trialConfig.dodge={...CONFIG.dodge,...this.trialConfig.dodge,enabled:true,patterns:[...CONFIG.dodge.patterns]};this.trialStats.dodges??=0;
  for(const key of PATTERNS)this.trialConfig[key]={...CONFIG[key]};
  for(const u of this.units)if(u.trialDodge){u.trialDodge=null;u.route=null;u.regroup=null;}
  if(this.trialScene?.version>=155)return false;
  const fresh=create({commander:this.commanderId}),dx=fresh.trialBoss.x-this.trialBoss.x,dy=fresh.trialBoss.y-this.trialBoss.y;
  const seen=new Set(),shift=p=>{if(!p||seen.has(p))return;seen.add(p);if(Number.isFinite(p.x))p.x+=dx;if(Number.isFinite(p.y))p.y+=dy;};
  for(const list of [this.units,this.shots,this.mortarShells,this.effects,this.luckyMines,this.luckyGlues,this.luckySprays])for(const u of list||[]){shift(u);if(Number.isFinite(u.homeX))u.homeX+=dx;if(Number.isFinite(u.homeY))u.homeY+=dy;u.route=null;u.regroup=null;u.trialDodge=null;}
  shift(this.moveOrder);this.world=fresh.world;this.mapId='livingroom';this.trialScene=fresh.trialScene;this.obstacles=fresh.obstacles;this.navigationCache.clear();this.trialViewport=null;
  this.bases.forEach((b,i)=>Object.assign(b,{x:fresh.bases[i].x,y:fresh.bases[i].y}));
  const old=this.trialConfig;this.trialConfig=JSON.parse(JSON.stringify(CONFIG));for(const k of ['hp','damage','defense','shieldHalfAngle'])this.trialConfig[k]=old[k]??CONFIG[k];
  for(const s of this.trialBoss.swords.blades){const p=idlePoint(this.trialBoss,s);Object.assign(s,{x:p.x,y:p.y,z:0,action:null});}
  this.trialBoss.swords.nextAttackAt=this.time+2.5;return true;
 }
 stats(u){if(u.type==='swordEmpress')return{...Types.swordEmpress,hp:this.trialConfig.hp,defense:this.trialConfig.defense,critChance:0,critDamage:1.5,heal:0,splash:0};return super.stats(u);}
 gainXP(){} levelCheck(){} awardGold(){} syncEnemyGrowth(){} updateSwarm(){} updateBosses(){} updateArtillery(){} updateGuardianRespawns(){} updateMageQuest(){} updateLaserQuest(){} income(){return 0;} hasInvulnerableHQ(){return true;}
 visible(){return true;}
 pressure(){return{...super.pressure(),tier:0};}
 canTarget(a,b){if(b?.hidden)return false;return super.canTarget(a,b);}
 impact(p){this.trialIncoming={x:p.x,y:p.y};try{return super.impact(p);}finally{this.trialIncoming=null;}}
 damage(target,amount,source){
  if(target.type==='swordEmpress'){
   const blade=blockedBlade(target,this.trialIncoming||source,this.trialConfig);if(blade){this.trialStats.blocked++;blade.blockAt=this.time;return;}
   const before=target.hp;super.damage(target,amount,source);this.trialStats.dealt+=Math.max(0,before-target.hp);
   if(target.hp<=0){this.finish('win','swordBoss');return;}
   this.checkSwordPhase(target);return;
  }
  const before=target.hp;super.damage(target,amount,source);if(source?.type==='swordEmpress'){const loss=Math.max(0,before-target.hp);this.trialStats.received+=loss;const key=source.swords.currentPattern||'other';this.trialStats.byPattern[key]=(this.trialStats.byPattern[key]||0)+loss;}
 }
 checkSwordPhase(b){const st=b.swords;if(st.phase!==1||b.hp>b.maxHp*.5)return;st.phase=2;st.phaseChanges++;st.phaseAt=this.time;st.pending=null;st.nextAttackAt=this.time+this.trialConfig.phaseWarning;for(const s of st.blades){s.mode='attack';s.action={stage:'return',started:this.time,from:{x:s.x,y:s.y,z:s.z||0},duration:this.trialConfig.returnTime};}this.notify('toast','각성 · 눈을 뜹니다! 모든 실드 해제 · 검4개 공격');}
 setSwordModes(modes){const b=this.trialBoss,st=b.swords;if(st.phase===2)return;st.pending={modes:[...modes],commitAt:this.time+this.trialConfig.modeWarning};st.nextAttackAt=st.pending.commitAt+.5;this.notify('toast','공수 전환 예고 · 파란 방향 방어 / 빨간 방향 개방');}
 startSwordPattern(name){
  const b=this.trialBoss,st=b.swords,allies=this.supportDecoyTarget?.(b)?[this.supportDecoyTarget(b)]:this.alive(0);if(!allies.length||!PATTERNS.includes(name))return false;
  const red=st.blades.filter(s=>s.mode==='attack'&&!s.action);if(!red.length)return false;
  const cfg=this.trialConfig[name],rear=[...allies].sort((a,c)=>Number(['medic','sniper','mortar'].includes(c.type))-Number(['medic','sniper','mortar'].includes(a.type))||Math.hypot(c.x-b.x,c.y-b.y)-Math.hypot(a.x-b.x,a.y-b.y));
  const leader=this.commander(0),center={x:allies.reduce((n,u)=>n+u.x,0)/allies.length,y:allies.reduce((n,u)=>n+u.y,0)/allies.length};const v=this.trialViewport||{left:center.x-900,right:center.x+900,top:center.y-650,bottom:center.y+650};st.currentPattern=name;st.commandAt=this.time;st.commandFireAt=this.time+cfg.warn;st.volleyHits={};st.volleySerial=(st.volleySerial||0)+1;st.patternsUsed[name]=(st.patternsUsed[name]||0)+1;
  red.forEach((s,i)=>{
   const target=name==='rear'?rear[i%rear.length]:allies[Math.floor(this.random()*allies.length)],safe=p=>({x:clamp(p.x,120,this.bounds().width-120),y:clamp(p.y,120,this.bounds().height-120)});let start,end;
   if(name==='drop'||name==='rear'){end=safe({x:target.x+(i?Math.cos(i*2.4)*42:0),y:target.y+(i?Math.sin(i*2.4)*42:0)});if(Math.hypot(end.x-b.x,end.y-b.y)<170){const a=Math.atan2(end.y-b.y,end.x-b.x);end=safe({x:b.x+Math.cos(a)*170,y:b.y+Math.sin(a)*170});}start={...end};}
   else if(name==='vertical'){const sign=center.x>=b.x?1:-1;start={x:clamp(center.x-sign*350,v.left+80,v.right-80),y:clamp(formationCenter(center.y,v.top,v.bottom,(red.length-1)*cfg.spacing),160+(red.length-1)*cfg.spacing/2,this.bounds().height-160-(red.length-1)*cfg.spacing/2)+(i-(red.length-1)/2)*cfg.spacing};end={x:start.x+sign*cfg.length,y:start.y};}
   else if(name==='horizontal'){const sign=center.y>=b.y?1:-1;start={x:clamp(formationCenter(center.x,v.left,v.right,(red.length-1)*cfg.spacing),160+(red.length-1)*cfg.spacing/2,this.bounds().width-160-(red.length-1)*cfg.spacing/2)+(i-(red.length-1)/2)*cfg.spacing,y:clamp(center.y-sign*350,v.top+100,v.bottom-100)};end={x:start.x,y:start.y+sign*cfg.length};}
   else{const angle=Math.atan2(center.y-b.y,center.x-b.x),dx=Math.cos(angle),dy=Math.sin(angle),lane=(i-(red.length-1)/2)*cfg.spacing;start={x:b.x+dx*95-dy*lane,y:b.y+dy*95+dx*lane};end={x:start.x+dx*cfg.length,y:start.y+dy*cfg.length};}
   const cueAt=this.time+(cfg.withdraw||0);s.action={pattern:name,stage:cfg.withdraw?'withdraw':'warn',started:this.time,cueAt,lockedAt:cueAt+.25,fireAt:cueAt+cfg.warn,from:{x:s.x,y:s.y,angle:s.angle},start,end,radius:cfg.radius,duration:cfg.duration,damage:cfg.damage,hits:[]};
  });return true;
 }
 updateBossPattern(b,dt){if(b.type!=='swordEmpress'){if(this.updateSwordDodge(b,dt))return true;return super.updateBossPattern(b,dt);}this.updateSwordBoss(b,dt);return true;}
 updateSwordBoss(b,dt){
  if(b.hp<=0)return;this.checkSwordPhase(b);const st=b.swords,cfg=this.trialConfig;
  const hadActions=st.blades.some(s=>s.action);if(st.pending&&this.time>=st.pending.commitAt){st.blades.forEach((s,i)=>{s.mode=st.pending.modes[i];});st.pending=null;}
  for(const s of st.blades){
   const a=s.action,p=idlePoint(b,s);if(!a){s.x=p.x;s.y=p.y;s.z=0;s.angle=s.dir;continue;}
   if(a.stage==='withdraw'){
    const t=clamp((this.time-a.started)/Math.max(.01,a.cueAt-a.started),0,1),e=t*t*(3-2*t);s.x=mix(a.from.x,a.start.x,e);s.y=mix(a.from.y,a.start.y,e);s.z=Math.sin(t*Math.PI)*45;s.angle=Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x);
    if(this.time>=a.cueAt)a.stage='warn';else continue;
   }
   if(a.stage==='warn'){
    const t=clamp((this.time-(a.cueAt??a.started))/.35,0,1),e=t*t*(3-2*t);s.x=a.cueAt>a.started?a.start.x:mix(a.from.x,a.start.x,e);s.y=a.cueAt>a.started?a.start.y:mix(a.from.y,a.start.y,e);s.z=['drop','rear'].includes(a.pattern)?260*e:Math.sin(e*Math.PI)*18;s.angle=['drop','rear'].includes(a.pattern)?Math.PI/2:Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x);
    if(this.time>=a.fireAt){a.stage='active';a.activeAt=a.fireAt;}else continue;
   }
   if(a.stage==='active'){
    const t=clamp((this.time-a.fireAt)/a.duration,0,1),old={x:s.x,y:s.y};s.x=mix(a.start.x,a.end.x,t);s.y=mix(a.start.y,a.end.y,t);s.z=['drop','rear'].includes(a.pattern)?260*(1-t*t*t):0;
    if(a.pattern==='spin')s.angle=Math.atan2(a.end.y-a.start.y,a.end.x-a.start.x)+(this.time-a.fireAt)*TAU*(cfg.spin.turnsPerSecond||6);
    const impact=!['drop','rear'].includes(a.pattern)||t>=1;
    if(impact)for(const u of [...this.alive(0),...this.units.filter(t=>t.type==='toyDecoy'&&t.hp>0)]){if(a.hits.includes(u.id))continue;const r=a.radius+(Types[u.type]?.r||12),d=['drop','rear'].includes(a.pattern)?Math.hypot(u.x-a.end.x,u.y-a.end.y):segmentDistance(u,old,s);if(d<=r){a.hits.push(u.id);const counts=st.volleyHits||(st.volleyHits={}),hits=counts[u.id]||0;counts[u.id]=hits+1;const ratio=hits?cfg.overlapHitRatio:cfg.firstHitRatio;this.damage(u,u.maxHp*ratio/Math.max(.0001,this.defenseFactor(u,b)),b);}}
    if(t>=1){this.trialStats.attacks++;a.stage='hold';a.impactAt=this.time;a.holdUntil=this.time+(['drop','rear'].includes(a.pattern)?.48:.25);}
   }
   if(a.stage==='hold'&&this.time>=a.holdUntil){a.stage='return';a.started=this.time;a.from={x:s.x,y:s.y,z:s.z,angle:s.angle};a.duration=cfg.returnTime;}
   if(a.stage==='return'){const t=clamp((this.time-a.started)/a.duration,0,1),e=t*t*(3-2*t);s.x=mix(a.from.x,p.x,e);s.y=mix(a.from.y,p.y,e);const drop=['drop','rear'].includes(a.pattern),turn=drop?clamp((t-.35)/.65,0,1):e;s.z=(a.from.z||0)*(1-e)+Math.sin(t*Math.PI)*(drop?155:55);s.angle=drop?Math.PI/2+delta(s.dir,Math.PI/2)*turn:(a.from.angle||0)+delta(s.dir,a.from.angle||0)*e;if(t>=1){s.action=null;s.z=0;}}
  }
  if(hadActions&&!st.blades.some(s=>s.action))st.nextAttackAt=Math.max(st.nextAttackAt,this.time+(st.phase===2?(cfg[st.currentPattern]?.phase2Rest??cfg.phase2Interval):(cfg[st.currentPattern]?.rest??cfg.interval)));
  if(st.pending||st.blades.some(s=>s.action)||this.time<st.nextAttackAt)return;
  if(st.phase===1&&st.patternIndex>0&&st.patternIndex%2===0&&st.lastModeAt!==st.patternIndex){st.lastModeAt=st.patternIndex;const opening=(++st.modeIndex)%4,modes=Array(4).fill('defend');modes[opening]='attack';if(st.modeIndex%2)modes[(opening+2)%4]='attack';this.setSwordModes(modes);return;}
  const pattern=this.trialPattern==='all'?PATTERNS[st.patternIndex%5]:this.trialPattern;if(this.startSwordPattern(pattern)){st.patternIndex++;st.nextAttackAt=this.time+(st.phase===2?(cfg[st.currentPattern]?.phase2Rest??cfg.phase2Interval):(cfg[st.currentPattern]?.rest??cfg.interval));}
 }

 // Soldiers read the same fixed warning shapes as the player. They receive real hits if late.
 swordHazards(){return this.trialBoss?.hp>0?this.trialBoss.swords.blades.map(s=>s.action).filter(a=>a&&this.trialConfig.dodge.patterns.includes(a.pattern)&&['warn','active','hold'].includes(a.stage)&&this.time<a.fireAt+a.duration+this.trialConfig.dodge.hold):[];}
 swordPointSafe(u,p,actions=this.swordHazards(),margin=this.trialConfig.dodge.margin){return actions.every(a=>actionDistance(p,a)>a.radius+this.collisionRadius(u)+margin);}
 safeSwordPoint(u,preferred,actions=this.swordHazards()){
  const r=this.collisionRadius(u),c=this.commander(0),points=[preferred,{x:u.x,y:u.y},{x:c.x,y:c.y}];
  for(const a of actions){
   const reach=a.radius+r+this.trialConfig.dodge.margin+7,dx=a.end.x-a.start.x,dy=a.end.y-a.start.y,t=clamp(((u.x-a.start.x)*dx+(u.y-a.start.y)*dy)/(dx*dx+dy*dy||1),0,1),q=['drop','rear'].includes(a.pattern)?a.end:{x:a.start.x+dx*t,y:a.start.y+dy*t};
   if(!['drop','rear'].includes(a.pattern)){const angle=Math.atan2(dy,dx)+Math.PI/2;for(const sign of [-1,1])points.push({x:q.x+Math.cos(angle)*reach*sign,y:q.y+Math.sin(angle)*reach*sign});}
   for(let i=0;i<16;i++){const angle=i*TAU/16;points.push({x:q.x+Math.cos(angle)*reach,y:q.y+Math.sin(angle)*reach});}
  }
  for(const radius of [80,160,260,400])for(let i=0;i<12;i++){const angle=i*TAU/12;points.push({x:u.x+Math.cos(angle)*radius,y:u.y+Math.sin(angle)*radius});}
  const valid=p=>p&&p.x>60+r&&p.x<this.bounds().width-60-r&&p.y>this.frontline()+r+20&&p.y<this.bounds().height-90-r&&this.freePosition(p.x,p.y,r)&&this.lineClear(u,p,r)&&this.swordPointSafe(u,p,actions);
  const routeSafe=p=>actions.every(a=>actionDistance(u,a)<=a.radius+r+this.trialConfig.dodge.margin||Array.from({length:11},(_,i)=>({x:mix(u.x,p.x,(i+1)/11),y:mix(u.y,p.y,(i+1)/11)})).every(q=>actionDistance(q,a)>a.radius+r+4));
  return points.filter(valid).filter(routeSafe).sort((a,b)=>(Math.hypot(a.x-u.x,a.y-u.y)+Math.hypot(a.x-c.x,a.y-c.y)*.12)-(Math.hypot(b.x-u.x,b.y-u.y)+Math.hypot(b.x-c.x,b.y-c.y)*.12))[0]||null;
 }
 updateSwordDodge(u,dt){
  if(!this.trialConfig.dodge.enabled){if(u.trialDodge){u.trialDodge=null;u.route=null;}return false;}
  if(u.team!==0||u.type==='leader')return false;
  const actions=this.swordHazards();if(!actions.length){if(u.trialDodge)u.route=null;u.trialDodge=null;return false;}
  let task=u.trialDodge;if(task&&!this.swordPointSafe(u,task,actions))task=null;
  const formation=task?null:super.formationPoint(u,this.commander(0));
  if(!task&&(!this.swordPointSafe(u,u,actions)||!this.swordPointSafe(u,formation,actions))){
   const goal=this.safeSwordPoint(u,formation,actions);
   if(goal){task=u.trialDodge={x:goal.x,y:goal.y};u.route=null;u.sniperAim=null;u.swordAttack=null;u.bayonetAttack=null;this.trialStats.dodges=(this.trialStats.dodges||0)+1;}
  }
  if(!task)return false;
  // Do not use generic crowd steering: it may turn a valid side-step into the marked lane.
  if(Math.hypot(task.x-u.x,task.y-u.y)>3)this.move(u,task.x-u.x,task.y-u.y,dt,this.stats(u).speed*this.trialConfig.dodge.sprint);
  u.aimFace=null;return true;
 }
 separateCrowd(live){
  if(!this.trialConfig.dodge.enabled)return super.separateCrowd(live);
  const actions=this.swordHazards(),safe=actions.length?live.filter(u=>u.team===0&&u.trialDodge&&this.swordPointSafe(u,u,actions,4)).map(u=>({u,x:u.x,y:u.y})):[];
  super.separateCrowd(live);
  // Friendly separation cannot push an already escaped soldier back into a sword.
  for(const p of safe)if(!this.swordPointSafe(p.u,p.u,actions,4)){p.u.x=p.x;p.u.y=p.y;}
 }
 finish(result,reason){if(this.phase==='ended')return;this.phase='ended';this.result=result;this.notify('end',{result,reason});}
}
function create(settings={},events={}){
 const g=new Game({},new Profile(),{map:'livingroom',commander:settings.commander||'shion',flameSkin:settings.flameSkin||'hwarin',medicSkin:settings.medicSkin||'classic'});const sourceWorld={...g.bounds()},props=g.obstacles.filter(o=>o.y<2600).map(o=>({...o}));Object.setPrototypeOf(g,Trial.prototype);g.events=events;g.mode='bosslab';g.world={...sourceWorld,height:2800};g.mapId='livingroom';g.trialScene={version:155,sourceWorld,portal:{x:1500,y:600},arenaHeight:2800};g.trialConfig=JSON.parse(JSON.stringify(CONFIG));for(const k of ['hp','damage','defense','modeWarning','phaseWarning','interval','phase2Interval','shieldHalfAngle'])if(Number.isFinite(settings[k]))g.trialConfig[k]=settings[k];
 g.units=[];g.defenses=[];g.structures=[];g.obstacles=props;g.navigationCache.clear();g.pickups=[];g.buildings=[];g.shots=[];g.effects=[];g.bases.forEach(b=>{b.hp=b.maxHp=100000;b.hidden=true;});Object.assign(g.bases[0],{x:1500,y:2350});Object.assign(g.bases[1],{x:1500,y:600});g.mission.stage=3;g.level=10;g.cash=[0,0];g.scoutUntil=Infinity;g.crisis.phase='disabled';g.formationFacing=-Math.PI/2;g.retreated=0;g.trialPattern=PATTERNS.includes(settings.pattern)?settings.pattern:'all';
 g.trialStats={dealt:0,received:0,blocked:0,attacks:0,dodges:0,byPattern:{}};for(const t of api.ROSTER||root.FrontRoster){g.tech[0][t]=clamp(settings.rank||3,1,5);g.evolved[t]=!!settings.evolved;}g.tech[1]={};
 const c=g.addUnit(0,'leader',1500,1480);const counts=settings.counts||{rifle:3,machinegun:2,rocket:1,tank:1,medic:2,sniper:2,mortar:1};let i=0;for(const [type,n]of Object.entries(counts))if((api.ROSTER||root.FrontRoster).includes(type))for(let k=0;k<clamp(n,0,8);k++){const a=i++*2.4;g.addUnit(0,type,c.x+Math.cos(a)*90,c.y+Math.sin(a)*90);}
 const b=g.addUnit(2,'swordEmpress',1500,880,true);b.boss=true;b.bossName=CONFIG.name;b.hp=b.maxHp=g.trialConfig.hp;b.swords={phase:1,phaseChanges:0,phaseAt:-100,modeIndex:0,patternIndex:0,lastModeAt:-1,nextAttackAt:2,patternsUsed:{},pending:null,blades:Array.from({length:4},(_,i)=>({id:i,dir:-Math.PI/2+i*Math.PI/2,mode:i===2?'attack':'defend',x:b.x+Math.cos(-Math.PI/2+i*Math.PI/2)*CONFIG.orbit,y:b.y+Math.sin(-Math.PI/2+i*Math.PI/2)*CONFIG.orbit,z:0,angle:-Math.PI/2+i*Math.PI/2,action:null,blockAt:-100}))};g.trialBoss=b;g.camera={x:1500,y:1210};g.phase='ready';return g;
}

// Campaign integration retains native waves, rewards, profiles, death and victory rules.
function ensure(g,b){
 if(!b||b.type!=='swordEmpress')return null;
 g.trialConfig??=JSON.parse(JSON.stringify(CONFIG));if(g.mode!=='bosslab'&&(g.trialConfig.healthVersion||0)<CONFIG.healthVersion){const ratio=b.hp>0?b.hp/Math.max(1,b.maxHp):0;g.trialConfig.hp=CONFIG.hp;g.trialConfig.healthVersion=CONFIG.healthVersion;b.maxHp=g.trialConfig.hp;b.hp=b.maxHp*ratio;}g.trialStats??={dealt:0,received:0,blocked:0,attacks:0,dodges:0,byPattern:{}};g.trialPattern??='all';
 g.trialConfig.firstHitRatio=CONFIG.firstHitRatio;g.trialConfig.overlapHitRatio=CONFIG.overlapHitRatio;
 if(!b.swords)b.swords={phase:1,phaseChanges:0,phaseAt:-100,modeIndex:0,patternIndex:0,lastModeAt:-1,nextAttackAt:g.time+2,patternsUsed:{},pending:null,blades:Array.from({length:4},(_,i)=>{const dir=-Math.PI/2+i*Math.PI/2;return{id:i,dir,mode:i===2?'attack':'defend',x:b.x+Math.cos(dir)*CONFIG.orbit,y:b.y+Math.sin(dir)*CONFIG.orbit,z:0,angle:dir,action:null,blockAt:-100};})};
 g.trialBoss=b;return b;
}
function rebind(g){const b=g.units.find(u=>u.type==='swordEmpress'&&u.hp>0);if(b)ensure(g,b);return b||null;}
function install(){
 const p=Game.prototype,native=Object.fromEntries(['stats','addUnit','updateBossPattern','damage','impact','separateCrowd','reset'].map(k=>[k,p[k]]));
 for(const k of ['checkSwordPhase','setSwordModes','startSwordPattern','updateSwordBoss','swordHazards','swordPointSafe','safeSwordPoint','updateSwordDodge'])p[k]=Trial.prototype[k];
 p.stats=function(u){if(u.type==='swordEmpress')return{...Types.swordEmpress,hp:this.trialConfig?.hp||CONFIG.hp,defense:this.trialConfig?.defense??CONFIG.defense,critChance:0,critDamage:1.5,heal:0,splash:0};return native.stats.call(this,u);};
 p.addUnit=function(...args){const u=native.addUnit.apply(this,args);if(this.mode!=='bosslab'&&u?.type==='swordEmpress')ensure(this,u);return u;};
 p.reset=function(...args){this.trialBoss=null;this.trialConfig=null;this.trialStats=null;this.trialPattern=null;return native.reset.apply(this,args);};
 p.updateBossPattern=function(u,dt){if(this.mode!=='bosslab'){if(u.type==='swordEmpress'){ensure(this,u);this.updateSwordBoss(u,dt);return true;}if(this.trialBoss?.hp>0&&this.updateSwordDodge(u,dt))return true;}return native.updateBossPattern.call(this,u,dt);};
 p.impact=function(shot){if(this.mode==='bosslab')return native.impact.call(this,shot);this.trialIncoming={x:shot.x,y:shot.y};try{return native.impact.call(this,shot);}finally{this.trialIncoming=null;}};
 p.damage=function(target,amount,source){if(this.mode==='bosslab')return native.damage.call(this,target,amount,source);if(target?.type==='swordEmpress'){ensure(this,target);const blade=blockedBlade(target,this.trialIncoming||source,this.trialConfig);if(blade){this.trialStats.blocked++;blade.blockAt=this.time;return;}const before=target.hp;native.damage.call(this,target,amount,source);this.trialStats.dealt+=Math.max(0,before-target.hp);if(target.hp>0)this.checkSwordPhase(target);return;}return native.damage.call(this,target,amount,source);};
 p.separateCrowd=function(live){if(this.mode==='bosslab'||!(this.trialBoss?.hp>0))return native.separateCrowd.call(this,live);const actions=this.swordHazards(),safe=actions.length?live.filter(u=>u.team===0&&u.trialDodge&&this.swordPointSafe(u,u,actions,4)).map(u=>({u,x:u.x,y:u.y})):[];native.separateCrowd.call(this,live);for(const v of safe)if(!this.swordPointSafe(v.u,v.u,actions,4)){v.u.x=v.x;v.u.y=v.y;}};
}
install();
root.FrontSwordBoss={ensure,rebind,CONFIG,PATTERNS,LABELS,Trial,create,blockedBlade,idlePoint,segmentDistance,actionDistance};if(typeof module!=='undefined'&&module.exports)module.exports=root.FrontSwordBoss;
})(typeof window==='undefined'?globalThis:window);
