/* A player controller for FrontGame. No alternate spawns, damage or economy. */
(function(root){'use strict';
const api=typeof module!=='undefined'?require('./engine.js'):null,T=root.FrontTypes||api.TYPES,ROLES=root.FrontRoster||api.ROSTER,Game=root.FrontGame||api.FrontGame,Profile=root.FrontProfile||api.FrontProfile;
const BIKE=root.FrontBike||api.BIKE,GUARDIANS=root.FrontGuardians||api.GUARDIANS;
const STRATEGIES={balanced:{name:'균형 성장',keys:['damage','haste','defense','critChance','gold']},fire:{name:'화력 집중',keys:['damage','critDamage','critChance','defense','capacity']},rapid:{name:'연사 중심',keys:['haste','damage','speed','critChance','gold']},durable:{name:'생존 중심',keys:['defense','damage','haste','capacity','gold']}};
const GROWTH=['damage','speed','haste','critChance','critDamage','gold','capacity','defense','health'];
const PRESETS={balanced:{name:'균형 분대',counts:{rifle:3,machinegun:2,rocket:2,tank:1,medic:2},strategy:'balanced'},roomBalanced:{name:'거실 균형 분대',counts:{rifle:2,machinegun:2,rocket:1,tank:1,medic:2,mortar:1,sniper:1},strategy:'balanced'},rapid:{name:'기동 화력',counts:{rifle:2,guntruck:2,sniper:2,rocket:2,medic:2},strategy:'rapid'},siege:{name:'중장갑 공성',counts:{rifle:2,tank:2,mortar:2,rocket:2,medic:2},strategy:'durable'}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),finite=(v,d=0)=>Number.isFinite(v)?v:d;
// AI progress owns its wallet, ranks and pity counters. Normal profiles stay deterministic.
class FrontAutoProfile extends Profile{
 constructor(data={}){super(data);this.mode='idle';this.fails=Object.fromEntries(Object.keys(root.FrontPermanent||api.PERMANENT).map(k=>[k,clamp(Math.floor(finite(data?.fails?.[k])),0,100)]));this.attempts=Math.max(0,Math.floor(finite(data?.attempts)));this.successes=Math.min(this.attempts,Math.max(0,Math.floor(finite(data?.successes))));}
 chance(key){return Math.min(1,Math.max(.25,1-this.upgrades[key]*.045)+(this.fails[key]||0)*.15);}
 purchase(key,random){const cost=this.cost(key);if(!Number.isFinite(cost)||this.gold<cost)return null;const chance=this.chance(key),success=random()<chance;this.gold=Math.round((this.gold-cost)*100)/100;this.attempts++;if(success){this.upgrades[key]++;this.fails[key]=0;this.successes++;}else this.fails[key]++;return{success,cost,chance,level:this.upgrades[key]};}
 snapshot(){return{...super.snapshot(),mode:'idle',fails:{...this.fails},attempts:this.attempts,successes:this.successes};}
}
function cleanPlan(plan=PRESETS.balanced){const counts=Object.fromEntries(ROLES.map(t=>[t,clamp(Math.floor(finite(plan?.counts?.[t])),0,5)]));if(!ROLES.some(t=>counts[t]))counts.rifle=1;const strategy=STRATEGIES[plan?.strategy]?plan.strategy:'balanced',growth={};let selected=0;for(const k of GROWTH){const n=clamp(Math.floor(finite(plan?.growth?plan.growth[k]:(STRATEGIES[strategy].keys.includes(k)?3:0))),0,5);growth[k]=n&&selected++<5?n:0;}return{counts,strategy,growth,construction:['balanced','defense','siege','off'].includes(plan?.construction)?plan.construction:'balanced'};}
// Pilot routes must not share mutable arrays with a checkpoint or restored pilot.
function copyState(v){return Array.isArray(v)?v.map(copyState):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,copyState(x)])):v;}
function pack(game){
 const nodes=[...game.bases,...game.structures,...game.defenses,...(game.buildings||[]),...game.units,...new Set([...(game.enemyLuckySalvos||[]),...(game.mortarShells||[]).filter(p=>p.enemyJackpot).map(p=>p.enemyJackpot)])],ids=new Map(nodes.map((v,i)=>[v,'n'+i]));
 const encode=value=>JSON.parse(JSON.stringify(value,(k,v)=>{if(v&&ids.has(v))return{$ref:ids.get(v)};if(typeof v==='number'&&!Number.isFinite(v))return{$number:String(v)};return v;}));
 const fields={};for(const [k,v]of Object.entries(game))if(!['events','profile','random','navigationCache'].includes(k)&&typeof v!=='function')fields[k]=v;
 return{nodes:nodes.map((v,i)=>['n'+i,encode({...v})]),fields:encode(fields),profile:game.profile.snapshot()};
}
function unpack(game,data){
 if(!data||!Array.isArray(data.nodes)||data.nodes.length>1000||!data.fields)throw new Error('Invalid saved operation');
 const map=new Map(data.nodes.map(([id])=>[id,{}]));
 const decode=v=>{if(v===null||typeof v!=='object')return v;if(v.$ref)return map.get(v.$ref)||null;if(v.$number)return v.$number==='Infinity'?Infinity:v.$number==='-Infinity'?-Infinity:0;if(Array.isArray(v))return v.map(decode);const out={};for(const [k,x]of Object.entries(v))if(!['__proto__','prototype','constructor'].includes(k))out[k]=decode(x);return out;};
 for(const [id,v]of data.nodes)Object.assign(map.get(id),decode(v));Object.assign(game,decode(data.fields));game.starMax=data.fields.starMax===3?3:2;game.abilities={...Object.fromEntries(Object.keys(root.FrontAbilities||api.ABILITIES).map(k=>[k,0])),...game.abilities};game.roomHealthVersion=Number.isFinite(data.fields.roomHealthVersion)?data.fields.roomHealthVersion:0;game.roomGuardianVersion=Number.isFinite(data.fields.roomGuardianVersion)?data.fields.roomGuardianVersion:0;game.roomFenceVersion=Number.isFinite(data.fields.roomFenceVersion)?data.fields.roomFenceVersion:0;game.roomFortificationVersion=Number.isFinite(data.fields.roomFortificationVersion)?data.fields.roomFortificationVersion:0;game.balanceVersion=Number.isFinite(data.fields.balanceVersion)?data.fields.balanceVersion:0;game.evolutionAttacks=Object.hasOwn(data.fields,'evolutionAttacks')?game.evolutionAttacks:[];game.evolutionBlasts=Object.hasOwn(data.fields,'evolutionBlasts')?game.evolutionBlasts:[];game.evolutionLinkState=Object.hasOwn(data.fields,'evolutionLinkState')?game.evolutionLinkState:{owners:[]};game.nextRareSupply=Number.isFinite(data.fields.nextRareSupply)?data.fields.nextRareSupply:(Math.floor(game.time/120)+1)*120;game.buildings=game.buildings||[];game.butterflyGusts=game.butterflyGusts||[];game.luckyMines=game.luckyMines||[];game.luckyGlues=game.luckyGlues||[];game.luckyGlueHistory=game.luckyGlueHistory||[];game.luckySprays=game.luckySprays||[];game.luckySalvos=game.luckySalvos||[];for(let team=0;team<2;team++)game.tech[team].lucky=game.tech[team].lucky||0;game.evolved.lucky=game.evolved.lucky||false;game.world=game.world||{id:'backyard',width:1600,height:2800,scale:1};game.finalBattle=game.finalBattle||{spawned:false,killed:false};game.buildSerial=game.buildSerial||0;game.profile=data.profile?.mode==='idle'?new FrontAutoProfile(data.profile):new Profile(data.profile);game.navigationCache=new Map();if(game.sniperSkinId==='hayeon')game.sniperSkinId='kayla';for(const u of game.units)if(u.team===0&&u.type==='sniper'&&u.appearance==='hayeon')u.appearance='kayla';game.medicSkinId=game.medicSkinId==='rina'?'rina':'classic';game.flameSkinId=game.flameSkinId==='hwarin'?'hwarin':'classic';const skinCommander=game.commander(0);if(skinCommander?.type==='leader')skinCommander.flameSkin=game.flameSkinId;for(const u of game.units)u.spawnedAt??=game.time;game.enforceEnemySniperLimit();game.upgradeBalance();game.refreshBuildingStats();game.migrateLuckyObjects();game.upgradeLivingRoomLayout();game.setupRoomGuardians();game.setupRoadCaptains();game.upgradeRoomCampaign();game.repairLaserLessonReward();if(game.coop)for(const owner of [0,1])game.withOwner(owner,()=>game.refreshCommanderHealth());else game.refreshCommanderHealth();game.scoutUntil=0;game.report=null;if(game.pendingChoice?.type==='scout')game.pendingChoice=null;if(game.turnChoice==='scout')game.turnChoice=null;root.FrontSwordBoss?.rebind(game);return game;
}
class FrontAutoPilot{
 constructor(game,plan,seed=0x61c88647){plan??=game.isRoomCampaign()?PRESETS.roomBalanced:PRESETS.balanced;this.tacticsVersion=88;this.game=game;if(!(game.profile instanceof FrontAutoProfile))game.profile=new FrontAutoProfile(game.profile.snapshot());this.plan=cleanPlan(plan);this.seed=seed>>>0||1;this.remainder=0;this.nextThink=0;this.nextBuild=0;this.nextPermanent=0;this.dodgeUntil=0;this.escape=null;this.motion=null;this.supply=null;this.supplyPauseUntil=0;this.baseDefense=null;this.hqGuardUntil=0;this.advanceState=null;this.nextAdvance=0;this.lineAnchor=null;this.lastScoutStage=0;this.lastEnd=null;this.active=false;this.action='AI 출격 대기';this.history=[];this.fails=game.profile.fails;this.attempts=game.profile.attempts;this.successes=game.profile.successes;game.random=()=>this.random();}
 get fails(){return this.game.profile.fails;}
 set fails(value){this.game.profile.fails=value;}
 get attempts(){return this.game.profile.attempts;}
 set attempts(value){this.game.profile.attempts=value;}
 get successes(){return this.game.profile.successes;}
 set successes(value){this.game.profile.successes=value;}
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 log(message){if(this.history.at(-1)?.message===message)return;this.history.push({time:this.game.time,message});if(this.history.length>10)this.history.shift();}
 prepare(plan=this.plan){this.plan=cleanPlan(plan);this.remainder=0;this.nextThink=0;this.nextBuild=0;this.nextPermanent=0;this.dodgeUntil=0;this.escape=null;this.motion=null;this.supply=null;this.supplyPauseUntil=0;this.baseDefense=null;this.hqGuardUntil=0;this.advanceState=null;this.nextAdvance=0;this.lineAnchor=null;this.lastScoutStage=0;this.lastEnd=null;this.active=false;this.history=[];this.game.reset('pve');this.action='AI 출격 대기';}
 start(plan=this.plan){this.prepare(plan);this.active=true;this.game.start();this.log(this.game.isDesktopDefense()?'책상 디펜스 · 20분 기지 방어':'동일한 돌파 작전 · AI 지휘 시작');}
 desired(){const g=this.game;if(g.reinforcementPlan?.().enabled)return {...g.reinforcementPlan().targets};const total=Object.values(this.plan.counts).reduce((a,b)=>a+b,0),counts=Object.fromEntries(ROLES.map(t=>[t,Math.floor(g.capacity()*this.plan.counts[t]/total)]));let left=g.capacity()-Object.values(counts).reduce((a,b)=>a+b,0);const order=ROLES.filter(t=>this.plan.counts[t]).sort((a,b)=>(g.capacity()*this.plan.counts[b]/total%1)-(g.capacity()*this.plan.counts[a]/total%1));for(let i=0;i<left;i++)counts[order[i%order.length]]++;return counts;}
 reinforcementStatus(){
  const g=this.game,c=g.commander(0),troops=g.alive(0).filter(u=>u.type!=='leader'),cap=g.capacity(),fighters=troops.filter(u=>T[u.type].damage>0).length;
  const pressured=g.units.some(u=>u.team!==0&&u.hp>0&&g.visible(u)&&(dist(u,c)<480||dist(u,g.bases[0])<400));
  const target=Math.min(cap,Math.max(6,Math.ceil(cap*(pressured?.8:.6))));
  return{alive:troops.length,fighters,target,pressured,understrength:troops.length<target,urgent:troops.length<Math.min(6,cap)||fighters<Math.min(4,cap)||pressured&&troops.length<target};
 }
 queue(){
  if(this.game.reinforcementPlan?.().enabled)return Object.fromEntries(ROLES.map(t=>[t,0]));
  const g=this.game,goal=this.desired(),status=this.reinforcementStatus(),troops=g.alive(0).filter(u=>u.type!=='leader'),owned=Object.fromEntries(ROLES.map(t=>[t,troops.filter(u=>u.type===t).length])),q=Object.fromEntries(ROLES.map(t=>[t,0]));
  let cash=g.cash[0],slots=g.capacity()-troops.length;
  const needed=['medic','tank','guntruck'].find(t=>goal[t]>0&&g.tech[0][t]&&!owned[t]);
  if(needed&&troops.length>=4&&slots>0){
   // Save for an expensive specialist only after a viable fighting force exists.
   if(cash<T[needed].cost){if(status.fighters>=4&&!status.urgent)return q;}
   else{q[needed]++;cash-=T[needed].cost;slots--;}
  }
  for(let n=0;n<40&&slots>0;n++){
   const types=ROLES.filter(t=>goal[t]>0&&g.tech[0][t]&&T[t].cost<=cash&&owned[t]+q[t]<Math.min(goal[t],g.unitTypeCap())&&q[t]<g.recruitmentRemaining(t)).sort((a,b)=>(owned[a]+q[a])/goal[a]-(owned[b]+q[b])/goal[b]);
   if(!types.length)break;const t=types[0];q[t]++;cash-=T[t].cost;slots--;
  }
  // A full wallet does not authorize troops outside the configured build.
  return q;
 }
 growthKeys(){return GROWTH.filter(k=>this.plan.growth[k]>0).sort((a,b)=>this.plan.growth[b]-this.plan.growth[a]||STRATEGIES[this.plan.strategy].keys.indexOf(a)-STRATEGIES[this.plan.strategy].keys.indexOf(b));}
 choice(){const g=this.game;if(g.phase!=='choice')return;if(['supply','periodic'].includes(g.choiceKind)){const q=this.queue();if(Object.values(q).some(Boolean)&&g.stageChoice('support',q)&&g.confirmChoice()){g.phase='playing';g.pendingChoice=null;g.turnChoice=null;}else g.cancelRecovery();return;}let q=this.queue();const count=Object.values(q).reduce((a,b)=>a+b,0),alive=g.alive(0).length-1,goal=this.desired(),keys=this.growthKeys(),options=(g.currentOptions||[]).filter(t=>g.eligibleCard(t));
  const troops=g.alive(0).filter(u=>u.type!=='leader'),wounded=troops.filter(u=>u.hp/u.maxHp<.65),armor=g.units.some(u=>u.team!==0&&u.hp>0&&g.visible(u)&&['stagBeetle','rhinoBeetle','hornet','tank','crimsonAce','guntruck'].includes(u.type));
  const score=t=>{const key=g.abilityKey(t);if(key)return keys.includes(key)?({damage:117,haste:114,defense:110,health:108,critChance:96,critDamage:96,speed:101,capacity:89,gold:g.time<300?70:87}[key])+9+(this.plan.growth[key]-3)*15-g.abilities[key]*10:-40;if(ROLES.includes(t)){if(!goal[t])return -30;const owned=troops.filter(u=>u.type===t).length;if(!g.tech[0][t])return t==='medic'&&alive>=3?118:armor&&['rocket','tank'].includes(t)?108:82;return !owned&&g.isFlameCommander(g.commander(0))&&['machinegun','rocket'].includes(t)?105-g.tech[0][t]*10:owned?(t==='medic'?85:105)+Math.sqrt(owned)*10-g.tech[0][t]*12+(armor&&['rocket','tank'].includes(t)?10:0):25;}if(t==='fieldRepair')return wounded.length>=2||g.commander(0).hp/g.commander(0).maxHp<.45?145:5;if(t==='fieldSupply')return alive<6?70:40;return 20;};
  const unlock=options.filter(t=>ROLES.includes(t)&&goal[t]>0&&!g.tech[0][t]).sort((a,b)=>score(b)-score(a))[0],best=[...options].sort((a,b)=>score(b)-score(a))[0],unwanted=!options.some(t=>{const key=g.abilityKey(t);return key?keys.includes(key):ROLES.includes(t)?goal[t]>0:score(t)>=25;});
  const reinforcement=this.reinforcementStatus();
  const coreReady=alive>=Math.min(8,g.capacity())&&reinforcement.fighters>=Math.min(4,g.capacity())&&troops.reduce((n,u)=>n+u.hp/u.maxHp,0)/Math.max(1,alive)>=.6;
  const growthCard=options.filter(t=>{const k=g.abilityKey(t);return k?keys.includes(k):ROLES.includes(t)&&goal[t]>0&&troops.some(u=>u.type===t)&&g.tech[0][t]>0;}).sort((a,b)=>score(b)-score(a))[0];
  const essentialReady=['tank','guntruck'].some(t=>q[t]>0&&!g.alive(0).some(u=>u.type===t)),missingMedic=goal.medic>0&&g.tech[0].medic&&!g.alive(0).some(u=>u.type==='medic')&&g.cash[0]>=T.medic.cost;
  let type,cheap=false;
  // Stabilize a depleted squad before spending the opportunity on cards or a token recruit.
  const reinforce=g.choiceKind!=='boss'&&count>0&&(g.choiceKind==='recovery'||!coreReady&&reinforcement.urgent||reinforcement.understrength&&g.cash[0]>=360);
  if(reinforce)type='support';
  else if(coreReady&&!unlock&&growthCard)type=growthCard;
  // A healthy squad can still reject a bad draw for one cheap soldier.
  else if(g.choiceKind!=='boss'&&g.choiceKind!=='recovery'&&unwanted&&alive<g.capacity()&&g.tech[0].rifle&&g.recruitmentRemaining('rifle')>0&&g.cash[0]>=T.rifle.cost){q=Object.fromEntries(ROLES.map(t=>[t,t==='rifle'?1:0]));type='support';cheap=true;}
  else if(g.choiceKind==='recovery'||g.choiceKind!=='boss'&&count>0&&(alive<4||missingMedic||essentialReady||!unlock&&alive<Math.min(6,g.capacity())||count>=3&&(!best||score(best)<100)))type='support';
  else if(unlock)type=unlock;
  else type=best;
  if(g.mode==='pve'&&g.choiceKind==='level'){type=unlock||growthCard||best;cheap=false;}
  if(type==='support'&&!Object.values(q).some(Boolean)){if(g.choiceKind==='recovery')g.nextRecoveryAt=g.time+5;g.cancelRecovery();this.action='AI 지정 병과 해금 대기 · 자원 보존';return;}
  if(type&&g.stageChoice(type,type==='support'?q:undefined)&&g.confirmChoice()){this.action=cheap?'AI 카드 대신 소총병 1기 · 45 자원':type==='support'?'AI 병력 충원':'AI 강화 선택';this.log(this.action);g.phase='playing';g.pendingChoice=null;g.turnChoice=null;}
 }
 attemptPermanent(key){const g=this.game;if(!['ready','paused','choice','resupply','ended'].includes(g.phase)||!Number.isFinite(g.profile.cost(key))||g.profile.gold<g.profile.cost(key))return null;g.buyPermanent(key);this.fails=g.profile.fails;this.attempts=g.profile.attempts;this.successes=g.profile.successes;return g.lastPermanentAttempt;}
 permanent(){const g=this.game;if(g.time<this.nextPermanent||!['ready','choice','resupply','ended'].includes(g.phase))return;this.nextPermanent=g.time+5;const keys=this.growthKeys().filter(k=>g.profile.upgrades[k]<10).sort((a,b)=>g.profile.upgrades[a]/this.plan.growth[a]-g.profile.upgrades[b]/this.plan.growth[b]);if(keys[0])this.attemptPermanent(keys[0]);}
 bikeLanes(){const g=this.game;return g.units.filter(u=>u.team!==0&&u.hp>0&&u.bikeAttack).map(u=>{const a=u.bikeAttack,start=a.phase==='charge'?u:a.origin,length=a.phase==='charge'?a.remaining:a.distance,speed=BIKE.speed*(g.time<(u.luckySlowUntil||0)?.7:1);return{x:start.x,y:start.y,dx:Math.cos(a.angle),dy:Math.sin(a.angle),length,source:u.id,until:Math.max(g.time,a.chargeAt)+length/speed+.15};});}
 laneGap(p,l){const along=clamp((p.x-l.x)*l.dx+(p.y-l.y)*l.dy,0,l.length);return Math.hypot(p.x-l.x-l.dx*along,p.y-l.y-l.dy*along);}
 evadeBikes(){
  const g=this.game,lanes=this.bikeLanes(),allies=g.alive(0),enemies=g.units.filter(e=>e.team!==0&&e.hp>0&&g.visible(e));let count=0;
  for(const u of allies){
   const r=g.collisionRadius(u),padding=BIKE.halfWidth+r+20,task=u.aiEvade;
   if(!lanes.length){if(task){u.aiEvade=null;u.route=null;u.regroup=null;}continue;}
   const goal=g.formationPoint(u,g.moveOrder?g.squadMoveAnchor(u):g.commander(0)),length=dist(u,goal),look=length?Math.min(1,g.stats(u).speed*.35/length):0,future={x:u.x+(goal.x-u.x)*look,y:u.y+(goal.y-u.y)*look};
   const risks=lanes.filter(l=>this.laneGap(u,l)<padding||this.laneGap(future,l)<padding),until=Math.max(...lanes.map(l=>l.until));
   if(task&&lanes.every(l=>this.laneGap(task,l)>=padding)&&g.freePosition(task.x,task.y,r)&&g.lineClear(u,task,r)){task.until=until;count++;continue;}
   if(!risks.length){if(task){u.aiEvade=null;u.route=null;u.regroup=null;}continue;}
   const lane=risks.sort((a,b)=>this.laneGap(u,a)-this.laneGap(u,b))[0],side=(u.x-lane.x)*(-lane.dy)+(u.y-lane.y)*lane.dx,candidates=[];
   for(const sign of [-1,1])for(const extra of [0,35,75])for(const along of [0,-35,35,-75,75]){
    const shift=sign*(padding+12+extra)-side,p={x:u.x-lane.dy*shift+lane.dx*along,y:u.y+lane.dx*shift+lane.dy*along};
    if(p.y<g.frontline()+r||!g.freePosition(p.x,p.y,r)||!g.lineClear(u,p,r)||lanes.some(l=>this.laneGap(p,l)<padding))continue;
    const crossing=enemies.reduce((n,e)=>{const dx=p.x-u.x,dy=p.y-u.y,t=clamp(((e.x-u.x)*dx+(e.y-u.y)*dy)/Math.max(1,dx*dx+dy*dy),0,1),d=dist(e,{x:u.x+dx*t,y:u.y+dy*t});return n+Math.max(0,70-d)*3;},0);
    const crowded=allies.filter(v=>v!==u&&dist(v.aiEvade||v,p)<r+g.collisionRadius(v)+4).length;
    candidates.push({p,score:dist(u,p)+crossing+crowded*18+(task?dist(task,p)*.4:0)});
   }
   const chosen=candidates.sort((a,b)=>a.score-b.score)[0];
   if(chosen){u.aiEvade={...chosen.p,until};u.route=null;u.regroup=null;count++;}
  }
  if(count){this.supply=null;this.advanceState=null;this.escape=null;g.input={x:0,y:0};this.action='AI 돌진 경로 회피 · 병사별 측면 이동';this.log(this.action);}
  return count>0;
 }
 // Incoming attacks and recent real HQ hits remain observable even outside squad vision.
 baseAttackSources(){
  const g=this.game,b=g.bases[0],sources=new Set((b.recentAttackers||[]).filter(h=>g.time-h.at<8).map(h=>h.source));
  for(const p of g.shots)if(p.team!==0&&p.target===b&&p.life>0)sources.add(p.source);
  for(const p of [...g.mortarShells,...g.barrages])if(p.source?.team!==0&&p.landAt>g.time&&dist(p,b)<(p.radius||0)+(b.r||0))sources.add(p.source);
  for(const u of g.units)if(u.team!==0&&u.hp>0&&u.bayonetAttack?.target===b)sources.add(u);
  for(const u of g.units)if(u.team!==0&&u.hp>0&&u.bikeAttack?.target===b)sources.add(u);
  return sources;
 }
 baseThreats(){
  const g=this.game,b=g.bases[0],sources=this.baseAttackSources(),candidates=new Set([...g.units,...sources]);
  return [...candidates].filter(u=>{
   if(!u||u.team===0||u.hp<=0||!Number.isFinite(u.x)||!Number.isFinite(u.y)||!T[u.type]&&!sources.has(u))return false;
   const stats=u.defenseKind?g.defenseStats(u):T[u.type]?g.stats(u):{range:500,damage:0},distance=dist(u,b);
   if(sources.has(u)&&(!T[u.type]||u.type==='artillery'||distance<Math.max(330,stats.range+160)))return true;
   if(stats.damage<=0)return false;
   if(!g.visible(u)||distance>=stats.range+100||!g.lineClear(u,b,0,{fireTeam:u.team}))return false;
   // Enemies already intercepted by the advancing squad do not pin it to HQ.
   return !g.alive(0).some(a=>g.canTarget(u,a)&&dist(u,a)<distance-40);
  }).sort((a,c)=>Number(sources.has(c))-Number(sources.has(a))||dist(a,b)-dist(c,b));
 }
 defendBase(){
  const g=this.game,c=g.commander(0),home=g.bases[0],threats=this.baseThreats();
  if(g.hasInvulnerableHQ()||!threats.length){const stale=g.aiHQTarget;g.aiHQTarget=null;if(this.baseDefense||stale&&g.focusTarget===stale){this.baseDefense=null;g.focusTarget=null;g.moveOrder=null;}this.hqGuardUntil=0;return false;}
  const target=threats[0];this.baseDefense={target:target.id};this.hqGuardUntil=g.time+3;g.aiHQTarget=target;this.advanceState=null;this.supply=null;this.escape=null;g.input={x:0,y:0};
  if(g.visible(target)&&g.focusTarget!==target)g.setFocus(target,true);
  const fighters=g.alive(0).filter(u=>g.stats(u).damage>0),firing=fighters.filter(u=>{const s=g.stats(u),d=dist(u,target);return g.visible(target)&&d<s.range-8&&d>=(s.minRange||0)&&g.lineClear(u,target,0,{fireTeam:0});});
  const ready=Math.max(1,Math.ceil(fighters.length*.6)),close=dist(c,target)<clamp(Math.min(...fighters.map(u=>g.stats(u).range-25)),175,270)+35;
  if(close&&firing.length>=ready){g.formationFacing=Math.atan2(target.y-c.y,target.x-c.x);return this.holdLine('AI 본진 방어 · HQ 공격 적 집중 사격');}
  const range=clamp(Math.min(...fighters.map(u=>g.stats(u).range-30)),165,280),toward=Math.atan2(c.y-target.y,c.x-target.x),hazards=this.threats(),candidates=[];
  for(const r of [range,range-30,range+15])for(const offset of [0,-.4,.4,-.8,.8,-1.2,1.2,-1.6,1.6,Math.PI]){const a=toward+offset,p={x:target.x+Math.cos(a)*r,y:target.y+Math.sin(a)*r};if(p.x<80||p.x>g.bounds().width-80||p.y<g.frontline()+100||p.y>g.bounds().height-140||!g.freePosition(p.x,p.y,32)||!g.lineClear(p,target,0,{fireTeam:0}))continue;const score=dist(c,p)+dist(home,p)*.12+this.dangerAt(p,hazards)*30+(g.lineClear(c,p,32)?0:70);candidates.push({p,score});}
  for(const {p}of candidates.sort((a,b)=>a.score-b.score).slice(0,4)){this.move(p,'AI 본진 방어 · HQ 공격 적에게 이동',target);if(g.moveOrder)return true;}
  this.action='AI 본진 방어 · 우회 사격 경로 탐색';this.log(this.action);return true;
 }
 desktopBuildingThreats(enemies){
  const g=this.game,buildings=g.buildings.filter(b=>b.team===0&&b.hp>0&&!b.mobile&&(b.buildUntil||0)<=g.time),hits=new Map();
  for(const p of g.shots)if(p.team!==0&&buildings.includes(p.target))hits.set(p.source,p.target);
  return enemies.map(u=>{const s=g.stats(u),building=hits.get(u)||buildings.filter(b=>g.targetDistance(u,b)<=s.range+24).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||dist(u,a)-dist(u,b))[0];return{u,building,active:hits.has(u)};}).filter(t=>t.building).sort((a,b)=>Number(b.active)-Number(a.active)||a.building.hp/a.building.maxHp-b.building.hp/b.building.maxHp||dist(a.u,g.bases[0])-dist(b.u,g.bases[0]));
 }
 defendDesktop(enemies){
  const g=this.game,c=g.commander(0),home=g.bases[0],line={x:home.x,y:home.y-370},attacks=this.desktopBuildingThreats(enemies),attack=attacks[0],threat=attack?.u||enemies.filter(u=>dist(u,home)<850).sort((a,b)=>dist(a,home)-dist(b,home))[0];
  if(threat){
   this.supply=null;this.advanceState=null;g.input={x:0,y:0};if(g.focusTarget!==threat)g.setFocus(threat,true);
   const fighters=g.alive(0).filter(u=>g.stats(u).damage>0),firing=fighters.filter(u=>{const s=g.stats(u),d=dist(u,threat);return d<s.range-8&&d>=(s.minRange||0)&&g.lineClear(u,threat,0,{fireTeam:0});});
   if(firing.length>=Math.min(2,fighters.length)){g.formationFacing=Math.atan2(threat.y-c.y,threat.x-c.x);return this.holdLine(attack?'AI 건설 방어 · 공격 중인 적 요격':'AI 책상 방어 · 사거리 안에서 요격');}
   const range=Math.max(170,Math.min(270,...fighters.map(u=>g.stats(u).range-25))),rear=Math.atan2(home.y-threat.y,home.x-threat.x),floor=Math.max(home.y-850,attack?attack.building.y+attack.building.h/2+55:line.y-140),candidates=[],hazards=this.threats();
   for(const r of [range,range-30,range+10])for(const offset of [0,-.35,.35,-.7,.7,-1,1]){const a=rear+offset,p={x:threat.x+Math.cos(a)*r,y:threat.y+Math.sin(a)*r};if(p.y<floor||p.y>home.y-130||!g.freePosition(p.x,p.y,32)||!g.lineClear(p,threat,0,{fireTeam:0}))continue;const score=dist(c,p)+dist(p,line)*.15+this.dangerAt(p,hazards)*40+(g.lineClear(c,p,32)?0:80);candidates.push({p,score});}
   for(const {p}of candidates.sort((a,b)=>a.score-b.score).slice(0,4)){this.move(p,attack?'AI 건설 방어 · 사격 위치로 이동':'AI 책상 방어 · 요격 위치로 이동',threat);if(g.moveOrder)return true;}
   // If cover blocks every shot, move along the protected side of the structure.
   if(attack){const b=attack.building,flanks=[-1,1].map(side=>({x:b.x+side*(b.w/2+95),y:Math.max(floor,b.y+b.h/2+95)})).filter(p=>g.freePosition(p.x,p.y,32)).sort((a,b)=>dist(c,a)-dist(c,b));for(const p of flanks){this.move(p,'AI 건설 방어 · 엄폐 옆 사선 확보',threat);if(g.moveOrder)return true;}}
  }
  if(!threat&&this.collectSupply(enemies))return true;
  if(dist(c,line)>110){g.focusTarget=null;this.move(line,'AI 책상 방어선 복귀');return true;}
  return this.holdLine('AI 책상 방어선 유지 · 20분 생존');
 }
 measuredAdvance(){const g=this.game;return g.mode==='pve'&&g.time>=240;}
 pushReady(){const g=this.game,c=g.commander(0),troops=g.alive(0).filter(u=>u.type!=='leader'),fighters=troops.filter(u=>g.stats(u).damage>0);return !g.isDesktopDefense()&&g.mode==='pve'&&g.time>=240&&troops.length>=Math.min(8,g.capacity())&&fighters.length>=4&&c.hp/c.maxHp>=.65&&troops.reduce((n,u)=>n+u.hp/u.maxHp,0)/troops.length>=.65&&!g.units.some(u=>u.team!==0&&u.hp>0&&g.visible(u)&&dist(u,c)<140);}
 squadReady(){const g=this.game,c=g.commander(0),troops=g.alive(0).filter(u=>u.type!=='leader');if(troops.filter(u=>g.stats(u).damage>0).length<2)return false;return c.hp/c.maxHp>=.6&&troops.filter(u=>u.type==='medic'||u.type==='sniper').every(u=>dist(u,c)<230&&dist(u,g.formationPoint(u,c))<140)&&troops.filter(u=>dist(u,g.formationPoint(u,c))<140).length>=Math.ceil(troops.length*.75);}
 holdLine(message='AI 전열 유지 · 적 정리'){const g=this.game;g.moveOrder=null;g.input={x:0,y:0};this.advanceState=null;this.action=message;this.log(message);return true;}
 engageLine(enemies,target){
  if(!this.measuredAdvance())return false;
  const g=this.game,c=g.commander(0),fighters=g.alive(0).filter(u=>u.type!=='leader'&&g.stats(u).damage>0&&dist(u,c)<350),near=enemies.filter(u=>dist(u,c)<450),primary=near[0]||(target?.hp>0&&g.visible(target)&&(target.structure||target.base)&&dist(target,c)<480?target:null);
  if(!primary)return false;if(primary.type&&g.stats(primary).range<70&&dist(c,primary)<240)return false;
  if(!this.lineAnchor||this.lineAnchor.stage!==g.mission.stage||g.time-this.lineAnchor.lastThreat>8)this.lineAnchor={x:c.x,y:c.y,stage:g.mission.stage,lastThreat:g.time};this.lineAnchor.lastThreat=g.time;
  if(fighters.length<3||c.hp<c.maxHp*.6||near.some(e=>dist(e,c)<110)||near.length>fighters.length+2)return false;
  const angle=Math.atan2(primary.y-c.y,primary.x-c.x),front=fighters.filter(u=>['tank','guntruck','rifle','machinegun','rocket'].includes(u.type)&&(u.x-c.x)*Math.cos(angle)+(u.y-c.y)*Math.sin(angle)>40&&Math.abs((u.x-c.x)*Math.sin(angle)-(u.y-c.y)*Math.cos(angle))<130);
  if(!front.length||front.reduce((v,u)=>v+u.hp,0)/front.reduce((v,u)=>v+u.maxHp,0)<.45)return false;
  const firing=fighters.filter(u=>dist(u,primary)<=g.stats(u).range-8&&dist(u,primary)>=(g.stats(u).minRange||0));if(firing.length<Math.max(2,Math.ceil(fighters.length*.45)))return false;
  this.escape=null;this.supply=null;if(primary.boss||primary.structure||primary.base){if(g.focusTarget!==primary)g.setFocus(primary,true);}else g.focusTarget=null;
  return this.holdLine();
 }
 advanceStep(goal,label,target){
  if(!this.measuredAdvance()){this.move(goal,label);return !!this.game.moveOrder;}
  const g=this.game,c=g.commander(0);let state=this.advanceState;
  if(state&&(state.stage!==g.mission.stage||dist(state.target,goal)>180||g.time>state.expires)){this.advanceState=null;state=null;}
  if(state&&dist(c,state.goal)<20){this.nextAdvance=g.time+.8;this.lineAnchor={x:c.x,y:c.y,stage:g.mission.stage,lastThreat:g.time};this.advanceState=null;state=null;}
  if(!this.squadReady()&&!(this.pushReady()&&g.alive(0).filter(u=>dist(u,c)<320).length>=Math.ceil(g.alive(0).length*.75)))return this.holdLine('AI 전열 유지 · 분대 합류 대기');
  if(state){g.setMoveOrder(state.goal.x,state.goal.y,false);if(target&&g.moveOrder)g.moveOrder.facing=Math.atan2(target.y-c.y,target.x-c.x);this.action=label;return true;}
  if(g.time<this.nextAdvance)return this.holdLine('AI 전열 유지 · 다음 전진 준비');
  const route=this.route(goal);if(!route.points.length)return this.holdLine('AI 안전 경로 탐색 · 전열 유지');
  const waypoint=route.points[0],length=dist(c,waypoint),step=Math.min(85,length),point={x:c.x+(waypoint.x-c.x)/Math.max(1,length)*step,y:c.y+(waypoint.y-c.y)/Math.max(1,length)*step};
  if(length<8)return this.holdLine();
  if(!g.setMoveOrder(point.x,point.y,false))return false;if(target)g.moveOrder.facing=Math.atan2(target.y-c.y,target.x-c.x);
  this.advanceState={goal:{x:g.moveOrder.x,y:g.moveOrder.y},target:{x:goal.x,y:goal.y},stage:g.mission.stage,expires:g.time+4};this.action=label;this.log(label+' · 짧은 전진');return true;
 }
 lineEscapePenalty(p){const g=this.game,a=this.lineAnchor;if(!this.measuredAdvance()||!a||a.stage!==g.mission.stage||g.time-a.lastThreat>8)return 0;return Math.max(0,a.y-p.y-140)*1.2;}
 guardLineY(){const g=this.game;return Math.max(g.frontline()+140,g.bases[0].y-520*g.bounds().scale);}
 needsGuardAdvance(){const g=this.game,c=g.commander(0);return g.mode==='pve'&&g.time>=240&&c.hp>0&&c.y>this.guardLineY()+60;}
 guardRearLimit(){const g=this.game;return g.mode==='pve'&&g.time>=240&&!this.baseDefense?Math.min(g.bounds().height-160,g.bases[0].y-220*g.bounds().scale):g.bounds().height-160;}
 advanceGuardLine(){const g=this.game,c=g.commander(0);this.supply=null;g.focusTarget=null;const goal={x:clamp(c.x,110,g.bounds().width-110),y:this.guardLineY()};return this.advanceStep(goal,'AI 전진 방어선 확보 · 본진 앞에서 요격');}
 construct(){const g=this.game,c=g.commander(0);if(g.time<(this.nextBuild||0)||this.plan.construction==='off')return;this.nextBuild=g.time+20;
  const nearby=this.baseThreats().length,home=dist(c,g.bases[0])<650,safe=g.alive(0).length>=6&&c.hp/c.maxHp>.7&&!g.units.some(u=>u.team!==0&&u.hp>0&&g.visible(u)&&dist(u,c)<650);
  if(!home&&(!safe||g.mission.stage<2))return;g.beginConstructionLine();
  const robotGoal=Math.min(g.buildingCap('repairBot'),g.buildings.filter(b=>b.hp>0&&!b.mobile&&dist(b,c)<500).length);
  if(g.buildingCount('repairBot')<robotGoal&&g.cash[0]>=310&&g.build('repairBot')){this.log('AI 수리로봇 배치 · 건물 옆 대기');return;}
  const order=this.plan.construction==='siege'?['missileBase','mgTower','repair','barricade']:this.plan.construction==='defense'?['barricade','mgTower','repair','missileBase']:['mgTower','repair','barricade','missileBase'];
  const cap=g.isDesktopDefense()?Infinity:nearby?2:1;for(const kind of order){const spec=(root.FrontBuildings||api.BUILDINGS)[kind];if(g.buildingCount(kind)>=Math.min(cap,g.buildingCap(kind))||g.cash[0]<spec.cost+260)continue;if(g.build(kind)){this.log('AI '+spec.name+' 건설 · '+(home?'본진 방어':'안전한 전진 거점'));return;}}
 }
 siegeGuardians(){
  const g=this.game,c=g.commander(0),guards=[...g.units.filter(u=>u.type==='blizzardMage'&&u.hp>0&&g.mission.stage>=(u.activeStage||2)),...g.activeDefenses().filter(u=>u.defenseKind==='laserTower')].filter(u=>g.visible(u)&&dist(c,u)<1000).sort((a,b)=>dist(c,a)-dist(c,b));
  const target=guards[0];if(!target||g.units.some(e=>e.hp>0&&e.team!==0&&!e.fixedGuard&&g.alive(0).some(a=>dist(a,e)<160))){g.guardianSiege=null;return false;}
  const shooters=g.alive(0).filter(u=>target.type==='blizzardMage'?u.type==='sniper':['sniper','mortar'].includes(u.type));if(!shooters.length){g.guardianSiege=null;return false;}
  // One forward soldier must not freeze a whole ranged squad outside firing range.
  const firing=shooters.filter(u=>dist(u,target)<g.stats(u).range-12&&g.lineClear(u,target,0,{fireTeam:0}));
  const inRange=firing.length>=Math.max(1,Math.ceil(shooters.length*.6));
  if(g.focusTarget!==target)g.setFocus(target,true);g.guardianSiege=target;this.escape=null;this.supply=null;
  // Keep the commander and non-siege troops behind the guardian firing radius.
  const danger=g.alive(0).some(u=>dist(u,target)<(target.defenseKind?g.defenseStats(target).range:g.stats(target).range)+20),d=dist(c,target)||1;
  if(inRange&&!danger){g.moveOrder=null;g.input={x:0,y:0};this.action='AI 장거리 공략 · 저격·박격포 사거리 유지';return true;}
  const rear=Math.min(...shooters.map(u=>g.stats(u).range))+20;
  const goal={x:target.x+(c.x-target.x)/d*rear,y:target.y+(c.y-target.y)/d*rear};
  if(danger||!inRange)this.move(goal,'AI 방어선 밖 저격·박격포 배치',target);
  return true;
 }
 formationMargin(){const g=this.game,c=g.commander(0);return clamp(Math.max(70,...g.alive(0).map(u=>dist(g.formationPoint(u,c),c)+(T[u.type]?.r||12))),70,190);}
 threats(){const g=this.game,c=g.commander(0),margin=this.formationMargin();return [...g.units.filter(u=>u.team!==0&&u.hp>0&&g.visible(u)),...g.activeDefenses().filter(u=>g.visible(u))].filter(u=>dist(c,u)<1250).map(u=>{const s=u.type?g.stats(u):u.defenseKind?g.defenseStats(u):{range:280,damage:15,rate:1};return{x:u.x,y:u.y,radius:(s.range||30)+(u.r||20)+margin+25,weight:clamp(s.damage/Math.max(.2,s.rate)/16,.6,3)};});}
 dangerAt(p,threats){let danger=0;for(const h of threats){const depth=1-dist(p,h)/h.radius;if(depth>0)danger+=depth*depth*26*h.weight;}return danger;}
 segmentCost(a,b,threats){const length=dist(a,b),n=Math.max(1,Math.ceil(length/40));let risk=0;for(let i=0;i<n;i++)risk+=this.dangerAt({x:a.x+(b.x-a.x)*(i+.5)/n,y:a.y+(b.y-a.y)*(i+.5)/n},threats);return length*(1+risk/n);}
 route(goal,threats=this.threats(),frontPad=100){
  const g=this.game,c=g.resolvePosition({...g.commander(0)},32),end=g.resolvePosition({x:clamp(goal.x,80,g.bounds().width-80),y:clamp(goal.y,g.frontline()+frontPad,g.bounds().height-140)},32);
  if(g.lineClear(c,end,32)&&this.segmentCost(c,end,threats)<dist(c,end)*1.04)return{points:[end],cost:dist(c,end)};
  // A bounded eight-neighbour graph: terrain blocks edges; hostile attack
  // envelopes raise their cost. The start may already be under attack, so
  // escaping is allowed instead of treating all threatened cells as walls.
  const points=[{x:c.x,y:c.y},end],cells=new Map(),floor=g.frontline()+frontPad;
  for(let ix=0;ix<Math.floor((g.bounds().width-100)/100);ix++)for(let iy=0;floor+iy*100<=g.bounds().height-140;iy++){const p={x:100+ix*100,y:floor+iy*100};if(g.bounds().id==='livingroom'&&(p.x<Math.min(c.x,end.x)-450||p.x>Math.max(c.x,end.x)+450||p.y<Math.min(c.y,end.y)-450||p.y>Math.max(c.y,end.y)+450))continue;if(g.freePosition(p.x,p.y,32)){cells.set(ix+','+iy,points.length);points.push({...p,ix,iy});}}
  const gridEnd=points.length,corners=g.navigationGraph(32).points.filter(p=>p.x>=80&&p.x<=g.bounds().width-80&&p.y>=floor&&p.y<=g.bounds().height-140);points.push(...corners.map(p=>({...p})));
  const edges=points.map(()=>[]),join=(i,j)=>{if(g.lineClear(points[i],points[j],32)){const cost=this.segmentCost(points[i],points[j],threats);edges[i].push([j,cost]);edges[j].push([i,cost]);}};
  if(g.lineClear(c,end,32))join(0,1);
  for(let i=2;i<gridEnd;i++){const p=points[i];for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){const j=cells.get((p.ix+dx)+','+(p.iy+dy));if(j!==undefined)join(i,j);}for(const j of [0,1])if(dist(p,points[j])<180)join(i,j);}
  for(let i=gridEnd;i<points.length;i++)for(let j=0;j<i;j++)if(j<2||j>=gridEnd||dist(points[i],points[j])<220)join(i,j);
  const scores=points.map(()=>Infinity),previous=points.map(()=>-1),open=new Set([0]),closed=new Set();scores[0]=0;
  while(open.size){let next=-1,best=Infinity;for(const i of open){const f=scores[i]+dist(points[i],end);if(f<best){best=f;next=i;}}if(next===1){const path=[];for(let i=1;i!==0;i=previous[i])path.unshift({x:points[i].x,y:points[i].y});return{points:path,cost:scores[1]};}open.delete(next);closed.add(next);for(const [j,cost] of edges[next])if(!closed.has(j)&&scores[next]+cost<scores[j]){scores[j]=scores[next]+cost;previous[j]=next;open.add(j);}}
  return{points:[],cost:Infinity};
 }
 move(goal,label,target){const g=this.game,c=g.commander(0),threats=this.threats(),route=this.route(goal,threats);if(!route.points.length){g.moveOrder=null;this.action='AI 안전 경로 탐색 · 전열 유지';return;}
  let waypoint=route.points[0],length=0,previous=c;for(const p of route.points){length+=this.segmentCost(previous,p,threats);previous=p;if(g.lineClear(c,p,32)&&this.segmentCost(c,p,threats)<=length*1.03)waypoint=p;else break;}
  if(g.setMoveOrder(waypoint.x,waypoint.y,false)){if(target)g.moveOrder.facing=Math.atan2(target.y-waypoint.y,target.x-waypoint.x);this.action=label;this.log(label);}
 }
 wallClearance(p){const g=this.game;return Math.min(p.x-80,g.bounds().width-80-p.x,p.y-g.frontline()-100,g.bounds().height-140-p.y);}
 wallCost(p){const g=this.game,room=this.formationMargin()+65;return [p.x-80,g.bounds().width-80-p.x,p.y-g.frontline()-100,g.bounds().height-140-p.y].reduce((cost,n)=>cost+Math.max(0,1-n/room)**2*180,0);}
 safePoint(hazards,previous=null){const g=this.game,c=g.commander(0),threats=this.threats(),candidates=[];for(const radius of [180,280,380,470])for(let i=0;i<16;i++){const a=i*Math.PI/8,p=g.resolvePosition({x:clamp(c.x+Math.cos(a)*radius,110,g.bounds().width-110),y:clamp(c.y+Math.sin(a)*radius,g.frontline()+120,this.guardRearLimit())},32),clear=Math.min(...hazards.map(h=>dist(p,h)-h.radius));
   if(dist(p,c)<150)continue;
   let exits=0;for(let j=0;j<8;j++){const b=j*Math.PI/4,q={x:p.x+Math.cos(b)*130,y:p.y+Math.sin(b)*130};if(this.wallClearance(q)>0&&g.freePosition(q.x,q.y,32)&&this.dangerAt(q,threats)<this.dangerAt(p,threats)+2)exits++;}
   const continuity=previous?((p.x-c.x)*(previous.x-c.x)+(p.y-c.y)*(previous.y-c.y))/Math.max(1,dist(p,c)*dist(previous,c))*65:0;
   candidates.push({p,score:Math.min(clear,220)*2-Math.max(0,dist(p,c)-340)*.5-this.segmentCost(c,p,threats)*.65-this.dangerAt(p,threats)*70-this.wallCost(p)+exits*12+continuity-this.lineEscapePenalty(p)-(g.lineClear(c,p,32)?0:180)});
  }return candidates.sort((a,b)=>b.score-a.score)[0]?.p||c;
 }
 observeMotion(){const g=this.game,c=g.commander(0);if(!this.motion){this.motion={x:c.x,y:c.y,at:g.time,blocked:false};return;}if(g.time-this.motion.at>=2.25){const blocked=!!g.moveOrder&&dist(c,g.moveOrder)>60&&dist(c,this.motion)<24;this.motion={x:c.x,y:c.y,at:g.time,blocked};}}
 beginEscape(enemies,previous=null){const g=this.game,c=g.commander(0),hazards=enemies.slice(0,12).map(u=>({x:u.x,y:u.y,radius:180})),goal=this.safePoint(hazards,previous?.goal),route=this.route(goal);if(!route.points.length)return false;g.focusTarget=null;
  const threat=enemies[0];this.escape={goal,points:route.points,until:g.time+Math.max(3.5,Math.min(14,route.points.reduce((n,p,i)=>n+dist(p,i?route.points[i-1]:c),0)/85+1.5)),started:g.time,progressAt:g.time,progressPosition:{x:c.x,y:c.y},facing:previous?.facing??(threat?Math.atan2(threat.y-c.y,threat.x-c.x):g.formationFacing),replans:(previous?.replans||0)+1};return true;
 }
 followEscape(enemies){const g=this.game,c=g.commander(0),nearest=enemies[0],nearWall=this.wallClearance(c)<this.formationMargin()+75,close=nearest&&dist(nearest,c)<185,boxed=nearest&&nearWall&&dist(nearest,c)<430,blocked=this.motion?.blocked&&nearest&&dist(nearest,c)<650;
  let e=this.escape;if(e&&(!enemies.length||!e.goal||!Array.isArray(e.points))){this.escape=null;e=null;}if(e&&(dist(c,e.goal)<20&&g.time-e.started>=1.25||(dist(c,e.goal)<55||g.time>=e.until)&&g.time-e.started>=2.5)){this.escape=null;e=null;}
  if(!e){if(!close&&!boxed&&!blocked)return false;if(!this.beginEscape(enemies))return false;e=this.escape;}
  if(dist(c,e.progressPosition)>24){e.progressAt=g.time;e.progressPosition={x:c.x,y:c.y};}
  while(e.points.length>1&&dist(c,e.points[0])<45)e.points.shift();let waypoint=e.points[0],threats=this.threats();
  const obstructed=waypoint&&!g.lineClear(c,waypoint,32),stalled=g.time-e.progressAt>2.5,unsafe=waypoint&&[waypoint,{x:(c.x+waypoint.x)/2,y:(c.y+waypoint.y)/2}].some(p=>this.dangerAt(p,threats)>this.dangerAt(c,threats)+6);
  if((obstructed||stalled||unsafe)&&g.time-e.started>1.25){const old=e;if(this.beginEscape(enemies,old)){e=this.escape;waypoint=e.points[0];}}
  if(!waypoint)return false;
  // Keep the chosen route and formation bearing while escaping. The closest
  // bug changing every tick must not reverse the entire army.
  if(g.setMoveOrder(waypoint.x,waypoint.y,false))g.moveOrder.facing=e.facing;
  this.action=nearWall?'AI 구석 탈출 · 경로 유지':'AI 거리 벌리며 사격';this.log(this.action);return true;
 }

 supplyThreats(){const g=this.game;return [...g.units.filter(u=>u.team!==0&&u.hp>0&&g.visible(u)),...g.activeDefenses().filter(u=>g.visible(u))].map(u=>{const s=u.type?g.stats(u):u.defenseKind?g.defenseStats(u):{range:280,damage:15,rate:1};return{x:u.x,y:u.y,radius:(s.range||30)+(T[u.type]?.r||20)+45,weight:clamp(s.damage/Math.max(.2,s.rate)/16,.6,3)};});}
 supplyCandidates(){const g=this.game,c=g.commander(0),threats=this.supplyThreats();return g.pickups.map((p,index)=>({p,index})).filter(({p})=>p.active&&p.y>=g.frontline()-15&&p.y<=this.guardRearLimit()&&dist(p,c)<1100&&this.dangerAt(p,threats)<1.2).sort((a,b)=>dist(a.p,c)-dist(b.p,c));}
 supplyGoal(){return this.supplyCandidates().find(({p})=>{const route=this.route(p,this.supplyThreats(),40);return route.points.length&&route.cost<dist(this.game.commander(0),p)*2+140;})?.p;}
 collectSupply(enemies){const g=this.game,c=g.commander(0),nearest=enemies[0],threats=this.supplyThreats();if(g.time<this.supplyPauseUntil)return false;
  let task=this.supply,pickup=task&&g.pickups[task.index];
  if(task&&(!pickup?.active||g.time-task.started>18)){this.supply=null;task=null;}
  if(task&&(this.dangerAt(pickup,threats)>3||nearest&&dist(nearest,c)<105||g.time-task.progressAt>3)){
   this.supply=null;this.supplyPauseUntil=g.time+2;return false;
  }
  if(!task){
   if(nearest&&dist(nearest,c)<115)return false;
   for(const {p,index} of this.supplyCandidates().slice(0,5)){
    if(this.escape&&dist(p,c)>180&&nearest&&dist(nearest,c)<240){const v=this.escape.goal,a=(p.x-c.x)*(v.x-c.x)+(p.y-c.y)*(v.y-c.y);if(a<dist(p,c)*Math.max(1,dist(v,c))*.25)continue;}
    const length=dist(p,c),goal={x:p.x+(c.x-p.x)/Math.max(1,length)*35,y:p.y+(c.y-p.y)/Math.max(1,length)*35},route=this.route(goal,threats,40);
    if(!route.points.length||route.cost>length*2+140)continue;
    task=this.supply={index,goal,points:route.points,started:g.time,progressAt:g.time,position:{x:c.x,y:c.y},facing:g.formationFacing};pickup=p;this.escape=null;break;
   }
  }
  if(!task)return false;
  if(dist(c,task.position)>24){task.progressAt=g.time;task.position={x:c.x,y:c.y};}
  while(task.points.length>1&&dist(c,task.points[0])<42)task.points.shift();
  const waypoint=task.points[0];if(!waypoint)return false;
  if(!g.lineClear(c,waypoint,32)){const route=this.route(task.goal,threats,40);if(!route.points.length){this.supply=null;return false;}task.points=route.points;}
  g.focusTarget=null;
  // The original joystick can approach the frontline more closely than a
  // formation order. Use that same input for the final, clear collection step.
  if(dist(c,pickup)<115&&g.lineClear(c,pickup,g.collisionRadius(c))){const d=dist(c,pickup);g.moveOrder=null;g.input={x:(pickup.x-c.x)/Math.max(1,d),y:(pickup.y-c.y)/Math.max(1,d)};}
  else if(g.setMoveOrder(task.points[0].x,task.points[0].y,false))g.moveOrder.facing=task.facing;
  this.action='AI 보급품 수집 · 목표 유지';this.log(this.action);return true;
 }

 avoidExposure(enemies){const g=this.game,c=g.commander(0),near=enemies.filter(e=>dist(e,c)<650),rear=g.alive(0).filter(u=>['sniper','medic'].includes(u.type)&&dist(u,c)<230),exposed=near.some(e=>rear.some(u=>dist(e,u)<(g.stats(e).range<100?110:Math.min(260,g.stats(e).range))&&!g.screeningUnit(e,u))),wounded=c.hp<c.maxHp*.55&&near.some(e=>dist(c,e)<420);
  if(!exposed&&!wounded)return false;this.supply=null;this.advanceState=null;if(!this.escape&&!this.beginEscape(near))return false;if(!this.followEscape(enemies))return false;this.action='AI 피격 위험 회피 · 안전거리 확보';this.log(this.action);return true;
 }

 think(){const g=this.game,c=g.commander(0);if(c.hp<=0){this.advanceState=null;this.lineAnchor=null;this.nextAdvance=g.time+.8;this.escape=null;this.motion=null;this.supply=null;this.supplyPauseUntil=0;this.baseDefense=null;return;}if(g.phase!=='playing')return;if(g.time<this.nextThink)return;this.nextThink=g.time+.45;g.guardianSiege=null;g.input={x:0,y:0};this.observeMotion();
  if(g.ultimateStatus().ready){const nearby=g.ultimateTargets();if(nearby.length>=4||nearby.some(u=>u.boss||u.type==='tank'||u.type==='artillery')||c.hp<c.maxHp*.5&&nearby.length>=2){g.useUltimate();this.log(g.isSwordCommander(c)?'AI 궁극기 · 홍련 회전베기':g.isFlameCommander(c)?'AI 궁극기 · 지옥불 분사':'AI 궁극기 · 쌍권총 난사');}}
  const dodging=this.evadeBikes(),allies=g.alive(0),hazards=[...g.barrages,...g.mortarShells.filter(p=>p.team!==0),...g.bossHazards()].filter(h=>h.landAt>g.time&&allies.some(u=>dist(u,h)<h.radius+35));
  if(hazards.length){this.supply=null;this.escape=null;if(g.time<this.dodgeUntil&&g.moveOrder&&hazards.every(h=>dist(g.moveOrder,h)>h.radius+120))return;this.dodgeUntil=Math.max(...hazards.map(h=>h.landAt))+.2;this.move(this.safePoint(hazards),hazards.some(h=>h.bike)?'AI 돌진 경로 회피':'AI 포격 범위 회피');return;}if(g.time<this.dodgeUntil)return;
  const supply=g.supplyState();if(supply.medkits&&g.supplySquad().some(u=>u.hp/u.maxHp<.4))g.useMedkit();const strike=g.units.find(u=>u.team!==0&&u.hp>0&&g.visible(u)&&dist(u,c)<700);if(supply.artillery&&strike)g.useArtilleryTicket(strike.x,strike.y);
  if(g.recoveryReady()){g.beginRecovery();this.choice();return;}
  const enemies=g.units.filter(u=>u.team!==0&&u.hp>0&&g.visible(u)).sort((a,b)=>dist(a,c)-dist(b,c)),nearest=enemies[0];
  if(this.defendBase())return;
  if(dodging)return;
  if(this.siegeGuardians())return;
  if(this.avoidExposure(enemies)||this.followEscape(enemies))return;
  this.construct();if(g.isDesktopDefense()){this.defendDesktop(enemies);return;}
  const objective=g.objective(),push=this.pushReady();let target=objective.target;
  const guns=g.artilleryUnits();if(g.crisis.phase==='active'&&guns.length)target=[...guns].sort((a,b)=>dist(a,c)-dist(b,c))[0];
  else {
   const defense=g.activeDefenses().filter(d=>g.visible(d)&&dist(d,c)<650&&(!target||dist(d,target)<500||dist(d,c)<380)).sort((a,b)=>dist(a,c)-dist(b,c))[0];
   if(defense)target=defense;
   else if(!push&&nearest&&!target?.structure&&!target?.base&&dist(nearest,c)<450)target=nearest;
  }
  // Release an armored boss lock when nearby bugs are already attacking the squad.
  const screened=locked=>locked&&(locked.boss||locked.structure||locked.base)&&enemies.some(e=>e!==locked&&g.stats(e).range<70&&g.alive(0).some(u=>u.type!=='leader'&&dist(e,u)<155));
  if(screened(g.focusTarget))g.focusTarget=null;
  if(g.alive(0).some(u=>u.type!=='leader'&&u.regroup&&g.time-u.regroup.startedAt<6&&dist(u,c)>240)){g.moveOrder=null;this.action='AI 이탈 병력 합류 대기 · 엄호 사격';this.log(this.action);return;}
  if(g.isSwordCommander(c)&&c.hp/c.maxHp>.6&&nearest&&dist(c,nearest)<330&&!nearest.fixedGuard&&(!nearest.boss||g.ultimateStatus().active)&&enemies.filter(e=>dist(e,c)<180).length<=3){const d=dist(c,nearest),reach=g.stats(c).range*.78;if(d>reach+8){const a=Math.atan2(c.y-nearest.y,c.x-nearest.x),goal={x:nearest.x+Math.cos(a)*reach,y:nearest.y+Math.sin(a)*reach};if(g.freePosition(goal.x,goal.y,g.collisionRadius(c))&&g.lineClear(c,goal,g.collisionRadius(c))){this.advanceStep(goal,'AI 시온 · 근접 베기 접근',nearest);return;}}else{g.moveOrder=null;this.action='AI 시온 · 근접 베기';return;}}
  if(!push&&this.engageLine(enemies,target))return;
  const advanceGuard=this.needsGuardAdvance();
  if(!advanceGuard&&(!push||g.pickups.some(p=>p.active&&dist(p,c)<140))&&this.collectSupply(enemies))return;
  if(advanceGuard&&this.advanceGuardLine())return;
  if((!nearest||dist(nearest,c)>300)&&g.alive(0).some(u=>u.type!=='leader'&&dist(u,g.formationPoint(u,c))>230)){g.moveOrder=null;this.action='AI 분대 재집결 · 후열 합류 대기';this.log(this.action);return;}
  if(target&&target!==c&&Number.isFinite(target.x)){
   if(!screened(target)&&(target.structure||target.base||target.type==='artillery'||target.boss)&&g.visible(target)&&g.focusTarget!==target)g.setFocus(target,true);
   const d=dist(c,target),dx=d?(c.x-target.x)/d:0,dy=d?(c.y-target.y)/d:1,melee=target.team===2;
   if(melee&&d<200){const goal=this.safePoint([{x:target.x,y:target.y,radius:180}]);this.move(goal,'AI 거리 벌리며 사격',target);}
   else{const standoff=this.measuredAdvance()?(target.structure||target.base||target.boss?290:270):(target.structure||target.base||target.type==='artillery'?210:225),goal={x:target.x+dx*standoff,y:target.y+dy*standoff};if(d>standoff+25)this.advanceStep(goal,target.structure||target.base?'AI 목표 시설 공략':target.type==='artillery'?'AI 포병 돌파':'AI 적 추적·진격',target);else{this.action='AI 전열 유지·자동 사격';if(g.moveOrder&&dist(g.moveOrder,c)<30)g.moveOrder=null;}}
  }else{const pickup=this.supplyGoal();if(pickup)this.move(pickup,'AI 다음 무리 대비·보급');}
 }
 step(){const g=this.game;if(!this.active||['ready','paused','ended'].includes(g.phase))return;g.autoSupportToyOffer?.();this.permanent();this.choice();this.evadeBikes();this.think();g.update(.05);if(this.supply&&!g.pickups[this.supply.index]?.active){this.supply=null;g.input={x:0,y:0};g.moveOrder=null;}this.permanent();this.choice();if(g.phase==='resupply')g.phase='playing';if(g.phase==='ended')this.lastEnd=this.lastEnd||{result:g.result,reason:'base'};}
 advance(seconds,{silent=false}={}){const g=this.game;if(!this.active||g.phase==='paused'||g.phase==='ready'||g.phase==='ended')return 0;this.remainder+=clamp(finite(seconds),0,86400);let steps=Math.floor((this.remainder+1e-9)/.05);this.remainder-=steps*.05;const events=g.events;if(silent)g.events={end:data=>{this.lastEnd=data;}};let n=0;try{while(n<steps&&g.phase!=='ended'){this.step();n++;}}finally{g.events=events;}return n*.05;}
 snapshot(){return{version:2,engine:pack(this.game),pilot:copyState({tacticsVersion:this.tacticsVersion,plan:this.plan,seed:this.seed,remainder:this.remainder,nextThink:this.nextThink,nextBuild:this.nextBuild,nextPermanent:this.nextPermanent,dodgeUntil:this.dodgeUntil,escape:this.escape,motion:this.motion,supply:this.supply,supplyPauseUntil:this.supplyPauseUntil,baseDefense:this.baseDefense,hqGuardUntil:this.hqGuardUntil,advanceState:this.advanceState,nextAdvance:this.nextAdvance,lineAnchor:this.lineAnchor,lastScoutStage:this.lastScoutStage,lastEnd:this.lastEnd,active:this.active,action:this.action,history:this.history,fails:this.fails,attempts:this.attempts,successes:this.successes})};}
 static restore(saved,events={}){if(saved?.version!==2)throw new Error('Unsupported operation');saved={...saved,pilot:copyState(saved.pilot)};const migratedRoom=saved.engine.fields.world?.id==='livingroom'&&(saved.engine.fields.world.layoutVersion||0)<6;const game=new Game(events,new Profile(saved.engine.profile));unpack(game,saved.engine);if(game.focusTarget&&saved.engine.fields.focusAutomatic===undefined)game.focusAutomatic=true;const p=new FrontAutoPilot(game,saved.pilot.plan,saved.pilot.seed);for(const k of ['remainder','nextThink','nextBuild','nextPermanent','dodgeUntil','escape','motion','supply','supplyPauseUntil','baseDefense','hqGuardUntil','advanceState','nextAdvance','lineAnchor','lastScoutStage','lastEnd','active','action','history','fails','attempts','successes'])if(saved.pilot[k]!==undefined)p[k]=saved.pilot[k];if(migratedRoom||game.upgradeLivingRoomLayout()||game.upgradeDesktopLayout()){p.escape=null;p.motion=null;p.supply=null;p.advanceState=null;p.lineAnchor=null;p.nextAdvance=game.time;p.nextThink=game.time;}game.profile.fails={...game.profile.fails,...p.fails};game.profile.attempts=p.attempts;game.profile.successes=p.successes;p.fails=game.profile.fails;if(saved.pilot.tacticsVersion!==88){p.escape=null;p.motion=null;p.baseDefense=null;p.hqGuardUntil=0;game.aiHQTarget=null;for(const u of game.alive(0))u.aiEvade=null;p.supply=null;p.advanceState=null;p.lineAnchor=null;p.nextAdvance=0;p.nextThink=game.time;game.moveOrder=null;game.input={x:0,y:0};}return p;}
}
root.FrontGameState={pack,unpack};root.FrontAutoProfile=FrontAutoProfile;root.FrontAutoPilot=FrontAutoPilot;root.FrontAutoPresets=PRESETS;root.FrontAutoStrategies=STRATEGIES;root.FrontAutoCleanPlan=cleanPlan;root.FrontAutoGrowth=GROWTH;
if(typeof module!=='undefined')module.exports={FrontAutoProfile,FrontAutoPilot,PRESETS,STRATEGIES,GROWTH,cleanPlan,pack,unpack};
})(typeof window==='undefined'?globalThis:window);
