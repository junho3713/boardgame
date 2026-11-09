/* Support toys: separate slots, simulation clocks, owner-safe choices and bounded crowd control. */
(function(root){'use strict';
function install({FrontGame:Game,TYPES}){
 const p=Game.prototype;if(p.supportToyVersion)return;p.supportToyVersion=1;
 const rules={
  slots:2,range:300,move:1.05,haste:1.03,repair:20,controlResistance:3,duplicateMax:2,duplicateReduction:.05,
  odds:{toyDrum:.25,toyDecoyMaker:.25,toyTurtle:.25,toyStunner:.25},
  procOdds:{normal:.70,enhanced:.25,jackpot:.05},
  drum:{interval:30,duration:10,move:[1.05,1.15,1.30],haste:[1.03,1.10,1.25]},
  fishing:{arrival:.35,lifetime:30,interval:20,maxBaits:3,triggerRange:80,windup:.12,radius:[0,140,240],damage:[0,2,4],push:[0,2,10/3]},
  water:{range:[350,400,500],targets:[3,5,8],push:[2,8/3,4],duration:[.32,.38,.48],waveDuration:1.35,waveStart:60,recovery:.15,arc:[Math.PI/2,Math.PI/2,Math.PI*.78]},
  electric:{targets:[1,3,8],range:[310,310,500],duration:[1,2,3]}
 };
 const toys={
  toyDrum:{name:'태엽 북 토이',icon:'♫',hp:200,speed:145,cooldown:30,detail:'주변 이동 +5%·공속 +3% · 30초마다 추첨 · 강화 25%·대박 5%, 10초 지속'},
  toyDecoyMaker:{name:'미끼 토이',icon:'◇',hp:180,speed:145,cooldown:rules.fishing.interval,detail:'20초마다 설치 · 각 미끼 착지 후 30초 유지 · 최대 3개·각 보스 포함 적 2명 유도 · 상어 25%·메갈로돈 5%'},
  toyTurtle:{name:'물대포 거북이',icon:'≈',hp:480,speed:TYPES.rifle.speed*.9,cooldown:5,detail:'5초마다 전방 넉백 · 기본 144 / 강화 192 / 쓰나미 288 · 강화 25%·쓰나미 5%'},
  toyStunner:{name:'람쥐썬더',icon:'ϟ',hp:180,speed:140,cooldown:10,detail:'기본 1명·1초 · 연쇄 25%: 3명·2초 · 벼락 5%: 범위 500·8명·3초 · 기본 주기 10초'}
 };
 const insects=new Set(['ant','soldierAnt','beetle','bruteBeetle','stagBeetle','rhinoBeetle','honeybee','hornet','butterfly','bombBug','acidBeetle']);
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const reset=p.reset,stats=p.stats,damage=p.damage,canTarget=p.canTarget,pursuit=p.pursuitTarget,refresh=p.refreshCommanderHealth;
 for(const [type,t]of Object.entries(toys))TYPES[type]={name:t.name,icon:t.icon,hp:t.hp,speed:t.speed,damage:0,rate:100,range:0,r:type==='toyTurtle'?20:15,cost:0,role:t.detail};
 TYPES.toyDecoy={name:'낚시 미끼',icon:'◇',hp:75,speed:0,damage:0,rate:100,range:0,r:13,cost:0,stationary:true,role:'보스 포함 적 최대 2명 유도 · 착지 후 30초 유지'};
 p.reset=function(){reset.call(this);this.supportBursts=[];this.supportWaves=[];};
 p.isSupportToy=function(u){return Object.hasOwn(toys,typeof u==='string'?u:u?.type);};
 p.isSupportEntity=function(u){return this.isSupportToy(u)||u?.type==='toyDecoy';};
 p.supportToys=function(owner=this.coopOwner||0){return this.units.filter(u=>this.isSupportToy(u)&&!u.toyRetired&&(!this.coop||u.coopOwner===owner)).sort((a,b)=>(a.toySlot||0)-(b.toySlot||0)||a.id-b.id);};
 p.supportToyOffer=function(){return this.supplyState().toyOffer||null;};
 p.supportBaits=function(owner=this.coopOwner||0){return this.units.filter(u=>u.type==='toyDecoy'&&u.hp>0&&u.toyExpires>this.time&&(!this.coop||u.coopOwner===owner));};
 p.supportBait=function(owner=this.coopOwner||0){return this.supportBaits(owner)[0]||null;};
 p.supportToyUpgrades=function(u){return clamp(Math.floor(Number(u.toyUpgradeLevel)||0),0,rules.duplicateMax);};
 p.supportToyCooldown=function(u){return toys[u.type].cooldown*(1-rules.duplicateReduction*this.supportToyUpgrades(u));};
 p.refreshSupportToyCooldown=function(u){const next=this.supportToyCooldown(u),old=u.toyCooldown??(u.type==='toyDecoyMaker'?30.35:toys[u.type].cooldown);if(old!==next&&u.toyNextAt>this.time)u.toyNextAt=this.time+(u.toyNextAt-this.time)*next/old;u.toyCooldown=next;return next;};
 p.damage=function(target,amount,source){if(target?.type==='toyDecoy'&&target.hp>0&&this.time<target.toyExpires){target.flash=.13;return;}return damage.call(this,target,amount,source);};
 p.stats=function(u){const s=stats.call(this,u);if(this.isSupportEntity(u)){
  const level=this.commanderLevel(this.commander(0));s.hp=TYPES[u.type].hp*(1+.12*(level-1));s.damage=0;s.defense=u.type==='toyTurtle'?24:8;
 }
 if(u.team===0){
  const drummers=(this.units||[]).filter(t=>t.type==='toyDrum'&&t.hp>0&&!t.toyRetired&&distance(t,u)<=rules.range);
  if(drummers.length){
   const tier=Math.max(...drummers.map(t=>this.time<(t.toyBoostUntil||0)?t.toyProcTier||0:0));
   s.speed*=rules.drum.move[tier];if(u.type!=='medic')s.rate/=rules.drum.haste[tier];
  }
 }return s;};
 p.refreshCommanderHealth=function(){refresh.call(this);for(const t of this.supportToys()){const hp=this.stats(t).hp,ratio=t.hp/Math.max(1,t.maxHp);t.maxHp=hp;t.hp=hp*ratio;}};
 p.addSupportToy=function(type,slot){
  if(!this.isSupportToy(type))return null;const current=this.supportToys();if(current.length>=rules.slots)return null;
  const c=this.commander(0),u=this.addUnit(0,type,c.x+(slot===1?65:-65),c.y+80,true);u.toySlot=slot??([0,1].find(s=>!current.some(t=>t.toySlot===s))??0);u.toyUpgradeLevel=0;u.toyCooldown=this.supportToyCooldown(u);u.toyNextAt=this.time+(type==='toyDrum'?u.toyCooldown:.8);if(type==='toyDrum')u.toyBeatStartedAt=this.time;u.hp=u.maxHp=this.stats(u).hp;this.resolvePosition(u);return u;
 };
 p.collectSupportToy=function(pickup,type){
  const state=this.supplyState();if(state.toyOffer){if(this.time>=(pickup.nextToyHint||0)){pickup.nextToyHint=this.time+2;this.notify('toast','서포토이 교체를 먼저 선택하세요 · 희귀 보급은 유지됩니다');}return false;}
  const own=this.supportToys(),same=own.find(u=>u.type===type);pickup.active=false;pickup.supplyKind=type;state.collected++;this.gainXP(18);this.awardGold(5);
  if(same){const before=this.supportToyUpgrades(same);same.toyUpgradeLevel=Math.min(rules.duplicateMax,before+1);const interval=this.refreshSupportToyCooldown(same);same.toyDownUntil=0;same.diedAt=undefined;same.hp=same.maxHp=this.stats(same).hp;this.notify('toast',toys[type].name+(same.toyUpgradeLevel===2?' ★★':' ★ (2/3)')+' · '+(before===2?'최대 강화 · 완전 수리':'중복 강화 '+same.toyUpgradeLevel+'/2 · 발동 주기 '+Number(interval.toFixed(2))+'초 · 완전 수리'));}
  else if(own.length<rules.slots){this.addSupportToy(type);this.notify('toast','서포토이 합류 · '+toys[type].name+' · '+toys[type].detail);}
  else{state.toyOffer={type,at:this.time};if(this.coop)this.coopInvulnerable[this.coopOwner]=Math.max(this.coopInvulnerable[this.coopOwner]||0,this.time+5);this.notify('toast','새 서포토이 · '+toys[type].name+' · 교체할 슬롯 또는 현재 편성 유지 선택');}
  this.effects.push({kind:'fieldSupply',x:pickup.x,y:pickup.y,reward:'supportToy',t:1.2,max:1.2,team:0});this.notify('change');return true;
 };
 p.resolveSupportToyOffer=function(id){
  const state=this.supplyState(),offer=state.toyOffer;if(this.phase!=='playing'||!offer||this.commander(0).hp<=0)return false;
  if(id==='keep'){state.toyOffer=null;this.notify('change');return true;}
  if(!Number.isInteger(id))return false;const old=this.supportToys().find(t=>t.id===id);if(!old)return false;
  const slot=old.toySlot;old.toyRetired=true;old.hp=0;old.diedAt=this.time;this.units=this.units.filter(t=>t!==old);state.toyOffer=null;this.addSupportToy(offer.type,slot);this.notify('toast','서포토이 교체 · '+toys[offer.type].name);this.notify('change');return true;
 };
 p.autoSupportToyOffer=function(){const offer=this.supportToyOffer();if(!offer)return;const rank=t=>['toyTurtle','toyStunner'].includes(t.type)?2:1,own=this.supportToys().sort((a,b)=>rank(a)-rank(b)||a.hp/a.maxHp-b.hp/b.maxHp);this.resolveSupportToyOffer(own[0]&&rank({type:offer.type})>rank(own[0])?own[0].id:'keep');};
 p.disableSupportEntity=function(u){
  u.hp=0;u.diedAt=this.time;u.toyBoostUntil=0;if(this.isSupportToy(u)){u.toyDownUntil=this.time+rules.repair;this.notify('toast',toys[u.type].name+' 파손 · 20초 후 수리');}
  else u.toyExpires=this.time;this.effects.push({kind:'burst',x:u.x,y:u.y,t:.4,max:.4,team:0});
 };
 p.supportDecoyTarget=function(u){if(u.team===0)return null;return this.units.find(t=>t.type==='toyDecoy'&&t.hp>0&&(t.toyArrivesAt||0)<=this.time&&t.toyExpires>this.time&&t.toyLuredIds?.includes(u.id)&&distance(u,t)<500)||null;};
 p.canTarget=function(u,t){if(t?.type==='toyDecoy'&&(u.team===0||this.time<(t.toyArrivesAt||0)||t.toyExpires<=this.time||!t.toyLuredIds?.includes(u.id)))return false;return canTarget.call(this,u,t);};
 p.pursuitTarget=function(u){return this.supportDecoyTarget(u)||pursuit.call(this,u);};
 p.supportControlAllowed=function(t,kind){
  if(t.team===0||t.hp<=0||this.bossInvulnerable(t)||this.time<(t.toyControlReadyAt||0)||this.time<(t.toyStunUntil||0))return false;
  const boss=t.boss||t.roadCaptain||t.finalBoss;return !boss||kind==='stun'||kind==='wave'||kind==='push'&&insects.has(t.type);
 };
 p.pushSupportTarget=function(u,t,strength=1,{duration=0,surf=false,pop=0,angle=null,speed=0}={}){
  if(!this.supportControlAllowed(t,surf?'wave':'push'))return false;const a=angle??Math.atan2(t.y-u.y,t.x-u.x),n=(t.boss?40:72)*strength,b=this.bounds();let x=t.x,y=t.y;
  for(let d=8;d<=n;d+=8){const q={x:clamp(t.x+Math.cos(a)*d,45,b.width-45),y:clamp(t.y+Math.sin(a)*d,70,b.height-70)};if(!this.isFlying(t)&&!this.freePosition(q.x,q.y,this.collisionRadius(t)))break;x=q.x;y=q.y;}
  if(Math.hypot(x-t.x,y-t.y)<.1)return false;
  if(speed>0)duration=Math.hypot(x-t.x,y-t.y)/speed;
  if(duration>0){
   t.toyKnockback={dx:x-t.x,dy:y-t.y,applied:0,startedAt:this.time,until:this.time+duration,recoverUntil:this.time+duration+rules.water.recovery,surf,popHeight:pop};
   t.bayonetAttack=t.sniperAim=t.bikeAttack=null;t.bikeRecoverUntil=Math.max(t.bikeRecoverUntil||0,t.toyKnockback.recoverUntil);
  }else{t.x=x;t.y=y;if(t.bikeAttack?.origin){t.bikeAttack.origin.x=x;t.bikeAttack.origin.y=y;}}
  t.hitReaction={at:this.time,angle:a,power:1,heavy:true};t.route=t.routeGoal=null;t.toyControlReadyAt=this.time+rules.controlResistance;return true;
 };
 p.updateSupportKnockback=function(u){
  const k=u.toyKnockback;if(!k)return false;if(u.hp<=0){delete u.toyKnockback;return false;}
  const q=clamp((this.time-k.startedAt)/Math.max(.01,k.until-k.startedAt),0,1),progress=k.surf?q:1-(1-q)**2,delta=Math.max(0,progress-k.applied),length=Math.hypot(k.dx,k.dy)*delta,steps=Math.max(1,Math.ceil(length/8));
  const b=this.bounds();
  for(let i=0;i<steps;i++){
   const x=clamp(u.x+k.dx*delta/steps,45,b.width-45),y=clamp(u.y+k.dy*delta/steps,70,b.height-70);
   if(!this.isFlying(u)&&!this.freePosition(x,y,this.collisionRadius(u))){k.dx=k.dy=0;break;}u.x=x;u.y=y;
  }
  k.applied=progress;u.route=u.routeGoal=null;
  if(this.time<k.recoverUntil)return true;delete u.toyKnockback;return false;
 };
 function waveMotion(wave,time){
  const duration=wave.max||rules.water.waveDuration,age=Number.isFinite(wave.startedAt)?time-wave.startedAt:duration-wave.t,q=clamp(age/duration,0,1),push=72*rules.water.push[2],speed=(wave.range+push-rules.water.waveStart)/duration;
  return{q,speed,front:rules.water.waveStart+(wave.range+push-rules.water.waveStart)*q};
 }
 p.updateSupportWaves=function(){
  const pending=[];
  for(const wave of this.supportWaves||[]){
   const motion=waveMotion(wave,this.time),before=wave.front??0;wave.caught??=[];
   const run=()=>{
    const candidates=this.units.filter(t=>{
     if(wave.caught.includes(t.id)||!this.supportControlAllowed(t,'wave')||!this.visible(t))return false;
     const d=distance(t,wave),r=this.collisionRadius(t),a=Math.atan2(t.y-wave.y,t.x-wave.x)-wave.angle;
     return d<=wave.range+r&&d+r>=before&&d-r<=motion.front&&Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<=wave.arc/2&&this.lineClear(wave,t,0,{fireTeam:0});
    }).sort((a,b)=>distance(a,wave)-distance(b,wave)||a.id-b.id);
    for(const t of candidates){
     if(wave.caught.length>=rules.water.targets[2])break;
     if(!this.pushSupportTarget(wave,t,rules.water.push[2],{surf:true,angle:wave.angle,speed:motion.speed}))continue;
     wave.caught.push(t.id);const duration=t.toyKnockback.until-this.time+rules.water.recovery;
     this.effects.push({kind:'toyWaterCarry',x:t.x,y:t.y,source:wave.source,target:t,angle:wave.angle,startedAt:this.time,t:duration,max:duration,team:0});
    }
   };
   if(this.coop)this.withOwner(wave.owner,run);else run();wave.front=motion.front;
   if(this.time<wave.startedAt+wave.max&&wave.caught.length<rules.water.targets[2])pending.push(wave);
  }
  this.supportWaves=pending;
 };
 p.turtleSupportGoal=function(u,c){
  const facing=this.formationFacing||-Math.PI/2,side=u.toySlot===1?100:-100,r=this.collisionRadius(u),threats=this.toyThreats(u,620);
  if(!threats.length){u.toyPositionGoal=null;return{x:c.x-Math.cos(facing)*55-Math.sin(facing)*side,y:c.y-Math.sin(facing)*55+Math.cos(facing)*side};}
  const threat=threats[0],angle=Math.atan2(threat.y-c.y,threat.x-c.x),forward=clamp(distance(c,threat)-240,-150,85),near=threats.some(t=>distance(t,u)<140);
  if(u.toyPositionGoal&&this.time<(u.toyPositionNextAt||0)&&distance(u.toyPositionGoal,c)<250&&!near)return u.toyPositionGoal;
  const candidates=[];
  for(const ahead of [forward,Math.min(forward,0),-110])for(const flank of [side,side*1.4,-side]){
   const point=this.resolvePosition({team:0,x:c.x+Math.cos(angle)*ahead-Math.sin(angle)*flank,y:c.y+Math.sin(angle)*ahead+Math.cos(angle)*flank},r);
   if(!this.freePosition(point.x,point.y,r)||distance(point,c)>250)continue;
   let score=(ahead-forward)**2+(flank-side)**2*.35;
   for(const t of threats)score+=Math.max(0,190-distance(point,t))**2*4;
   for(const ally of this.units)if(ally!==u&&ally.team===0&&ally.hp>0)score+=Math.max(0,r+this.collisionRadius(ally)+16-distance(point,ally))**2*3;
   if(!this.lineClear(point,threat,0,{fireTeam:0}))score+=30000;
   candidates.push({point,score});
  }
  const goal=candidates.sort((a,b)=>a.score-b.score)[0]?.point||{x:c.x-Math.cos(angle)*110-Math.sin(angle)*side,y:c.y-Math.sin(angle)*110+Math.cos(angle)*side};
  u.toyPositionGoal=goal;u.toyPositionNextAt=this.time+.45;return goal;
 };
 p.toyThreats=function(u,range=350){const c=this.commander(0),urgent=t=>t.bikeAttack||t.bayonetAttack||t.bombFuse?0:1;return this.units.filter(t=>t.team!==0&&t.hp>0&&distance(u,t)<=range&&this.visible(t)&&this.lineClear(u,t,0,{fireTeam:0})).sort((a,b)=>urgent(a)-urgent(b)||distance(a,c)-distance(b,c)||a.id-b.id);};
 p.rollSupportToyTier=function(u){
  const roll=this.random(),tier=roll<rules.procOdds.jackpot?2:roll<rules.procOdds.jackpot+rules.procOdds.enhanced?1:0;
  u.toyProcTier=tier;u.toyHighlightUntil=this.time+(tier?1.6:0);return tier;
 };
 p.updateSupportBursts=function(){
  const pending=[];
  for(const burst of this.supportBursts||[]){
   if(burst.state==='circling'){
    const bait=burst.bait;if(!bait||bait.hp<=0||this.time>=bait.toyExpires)continue;
    if(this.time<(bait.toyArrivesAt||0)){pending.push(burst);continue;}
    const fin=this.effects.find(e=>e.kind==='toySharkFin'&&e.bait===bait);
    if(!fin){burst.finShown=true;this.effects.push({kind:'toySharkFin',x:bait.x,y:bait.y,bait,source:burst.source,tier:burst.tier,startedAt:bait.toyArrivesAt,t:bait.toyExpires-this.time,max:rules.fishing.lifetime,team:0});}
    else{fin.t=Math.max(fin.t,bait.toyExpires-this.time);fin.max=rules.fishing.lifetime;}
    const arrived=this.units.some(t=>t.team!==0&&t.hp>0&&distance(t,bait)<=rules.fishing.triggerRange);
    if(!arrived){pending.push(burst);continue;}
    burst.state='breaching';burst.breachAt=this.time+rules.fishing.windup;burst.impactAt=burst.breachAt+.48;burst.expiresAt=burst.breachAt+1.25;bait.toySharkTriggeredAt=burst.breachAt;
   }
   if(!burst.shown&&this.time>=burst.breachAt){
    burst.shown=true;const life=Math.max(.02,burst.expiresAt-this.time);
    this.effects.push({kind:'toyShark',source:burst.source,x:burst.x,y:burst.y,angle:burst.angle,tier:burst.tier,range:burst.radius,startedAt:burst.breachAt,t:life,max:burst.expiresAt-burst.breachAt,team:0});
   }
   if(!burst.hit&&this.time>=burst.impactAt){
    // Record completion before applying combat so snapshots and retries cannot hit twice.
    burst.hit=true;
    const hit=()=>{for(const target of [...this.units]){
     if(target.team===0||target.hp<=0||distance(target,burst)>burst.radius+(TYPES[target.type]?.r||0)||!this.visible(target)||!this.lineClear(burst,target,0,{fireTeam:0}))continue;
     const hp=target.hp;this.damage(target,burst.damage,burst.source);
     if(target.hp<hp&&target.hp>0&&this.pushSupportTarget(burst,target,burst.strength,{duration:burst.tier===2?.55:.42,pop:burst.tier===2?44:28})){
      const duration=target.toyKnockback.until-this.time+rules.water.recovery;
      this.effects.push({kind:'toyWaterCarry',x:target.x,y:target.y,source:burst.source,target,angle:Math.atan2(target.y-burst.y,target.x-burst.x),startedAt:this.time,t:duration,max:duration,team:0});
     }
    }};
    if(this.coop)this.withOwner(burst.owner,hit);else hit();
   }
   if(this.time<burst.expiresAt)pending.push(burst);
  }
  this.supportBursts=pending;
 };
 p.useSupportToy=function(u){
  this.refreshSupportToyCooldown(u);
  if(u.type==='toyDrum'&&!Number.isFinite(u.toyBeatStartedAt)){
   u.toyBeatStartedAt=this.time;u.toyNextAt=this.time+this.supportToyCooldown(u);
  }
  if(u.hp<=0||this.time<(u.toyNextAt||0))return false;const type=u.type;
  if(type==='toyDrum'){
   const tier=this.rollSupportToyTier(u);
   u.toyBoostUntil=this.time+(tier?rules.drum.duration:0);u.toyHighlightUntil=u.toyBoostUntil;
   if(tier)this.effects.push({kind:'toyDrumBoost',source:u,x:u.x,y:u.y,tier,range:rules.range,t:1.4,max:1.4,team:0});
  }else if(type==='toyDecoyMaker'){
   const existing=this.supportBaits();if(existing.length>=rules.fishing.maxBaits){u.toyNextAt=Math.max(u.toyNextAt||0,Math.min(...existing.map(d=>d.toyExpires)));return false;}
   const claimed=new Set(this.units.filter(t=>t.type==='toyDecoy'&&t.hp>0&&t.toyExpires>this.time).flatMap(t=>t.toyLuredIds||[]));
   const threats=this.toyThreats(u,460).filter(t=>(!this.isStationary(t)||t.boss||t.roadCaptain||t.finalBoss)&&!claimed.has(t.id));if(!threats.length)return false;
   const c=this.commander(0),a=Math.atan2(threats[0].y-c.y,threats[0].x-c.x);let point=null;
   for(const r of [150,120,90]){for(const offset of [0,.35,-.35,.7,-.7]){const q={x:c.x+Math.cos(a+offset)*r,y:c.y+Math.sin(a+offset)*r};if(this.freePosition(q.x,q.y,15)&&existing.every(d=>distance(d,q)>=35)){point=q;break;}}if(point)break;}if(!point)return false;
   const tier=this.rollSupportToyTier(u);
   const d=this.addUnit(0,'toyDecoy',point.x,point.y,true);d.toyArrivesAt=this.time+rules.fishing.arrival;d.toyExpires=d.toyArrivesAt+rules.fishing.lifetime;d.toyLifetimeVersion=2;d.toyLuredIds=threats.slice(0,2).map(t=>t.id);d.toyMakerId=u.id;
   u.face=a;this.effects.push({kind:'toyDecoyDrop',x:d.x,y:d.y,source:u,angle:a,tier,t:.7,max:.7,team:0});
   if(tier){
    this.supportBursts??=[];
    this.supportBursts.push({source:u,owner:this.coopOwner||0,bait:d,state:'circling',x:d.x,y:d.y,angle:a,tier,damage:this.stats(c).damage*rules.fishing.damage[tier],radius:rules.fishing.radius[tier],strength:rules.fishing.push[tier],shown:false,hit:false});
   }
  }else if(type==='toyTurtle'){
   if(!this.toyThreats(u,350).some(t=>this.supportControlAllowed(t,'wave')))return false;
   const tier=this.rollSupportToyTier(u),spec=rules.water;
   const threats=this.toyThreats(u,spec.range[tier]).filter(t=>this.supportControlAllowed(t,'wave')),first=threats[0],angle=Math.atan2(first.y-u.y,first.x-u.x);u.face=angle;
   const hit=threats.filter(t=>Math.abs(Math.atan2(Math.sin(Math.atan2(t.y-u.y,t.x-u.x)-angle),Math.cos(Math.atan2(t.y-u.y,t.x-u.x)-angle)))<=spec.arc[tier]/2).slice(0,spec.targets[tier]);
   if(tier===2){
    const wave={x:u.x,y:u.y,source:u,owner:this.coopOwner||0,angle,range:spec.range[2],arc:spec.arc[2],startedAt:this.time,max:spec.waveDuration,front:0,caught:[]};
    this.supportWaves??=[];this.supportWaves.push(wave);this.effects.push({...wave,kind:'toyTsunami',t:wave.max,team:0});
   }else for(const t of hit){this.effects.push({kind:'toyWater',x:u.x,y:u.y,tx:t.x,ty:t.y,target:t,source:u,angle,tier,t:.5,max:.5,team:0});this.pushSupportTarget(u,t,spec.push[tier],{duration:spec.duration[tier]});}
  }else if(type==='toyStunner'){
   const nearby=this.toyThreats(u,Math.max(...rules.electric.range)).filter(t=>this.supportControlAllowed(t,'stun'));if(!nearby.length)return false;
   const tier=this.rollSupportToyTier(u),duration=rules.electric.duration[tier],threats=nearby.filter(t=>distance(u,t)<=rules.electric.range[tier]);if(!threats.length){u.toyNextAt=this.time+this.supportToyCooldown(u);return false;}
   const targets=threats.slice(0,rules.electric.targets[tier]);let previous=u;
   u.face=Math.atan2(targets[0].y-u.y,targets[0].x-u.x);
   for(const [hop,t] of targets.entries()){
    t.toyStunUntil=this.time+duration;t.toyControlReadyAt=t.toyStunUntil+rules.controlResistance;t.sniperAim=t.bayonetAttack=null;
    this.effects.push({kind:'bossGroggy',stun:true,target:t,x:t.x,y:t.y,t:duration,max:duration,team:0});
    this.effects.push({kind:'toyZap',x:previous.x,y:previous.y,from:previous,target:t,source:u,tier,hop,storm:tier===2,t:1,max:1,team:0});previous=t;
   }
   if(tier===2){
    const x=targets.reduce((sum,t)=>sum+t.x,0)/targets.length,y=targets.reduce((sum,t)=>sum+t.y,0)/targets.length;
    this.effects.push({kind:'toyThunder',source:u,x,y,targets:[...targets],tier,t:1.2,max:1.2,team:0});
   }
  }else return false;
  const duration=type==='toyDecoyMaker' ? .7 : type==='toyStunner'&&u.toyProcTier===2 ? 1.2 : .5;
  u.toyNextAt=this.time+this.supportToyCooldown(u);u.toyActionStartedAt=this.time;u.toyActionUntil=this.time+duration;u.toyActionFace=u.face;return true;
 };
 p.updateSupportToys=function(dt){
  for(const d of this.units.filter(u=>u.type==='toyDecoy'&&u.hp>0)){
   if(d.toyLifetimeVersion!==2&&this.time<d.toyExpires){d.toyExpires=Math.max(d.toyExpires,(d.toyArrivesAt??this.time)+rules.fishing.lifetime);d.toyLifetimeVersion=2;}
   if(this.time>=d.toyExpires||this.time<(d.toyArrivesAt||0))continue;
   const refill=()=>{const others=new Set(this.units.filter(t=>t!==d&&t.type==='toyDecoy'&&t.hp>0&&this.time<t.toyExpires).flatMap(t=>t.toyLuredIds||[]));
    d.toyLuredIds=(d.toyLuredIds||[]).filter(id=>!others.has(id)&&this.units.some(t=>t.id===id&&t.team!==0&&t.hp>0&&distance(t,d)<500));
    for(const t of this.toyThreats(d,500)){if(d.toyLuredIds.length>=2)break;if((!this.isStationary(t)||t.boss||t.roadCaptain||t.finalBoss)&&!others.has(t.id)&&!d.toyLuredIds.includes(t.id))d.toyLuredIds.push(t.id);}
   };if(this.coop)this.withOwner(d.coopOwner,refill);else refill();
  }
  this.updateSupportBursts();this.updateSupportWaves();
  for(const d of this.units)if(d.type==='toyDecoy'&&d.hp>0&&this.time>=d.toyExpires){d.hp=0;d.diedAt=this.time;}
  for(const u of this.units.filter(t=>this.isSupportToy(t)&&!t.toyRetired)){
   const run=()=>{
    if(u.hp<=0){if(this.time<(u.toyDownUntil||Infinity))return;u.hp=u.maxHp*.5;u.diedAt=undefined;u.toyDownUntil=0;u.toyNextAt=this.time+(u.type==='toyDrum'?this.supportToyCooldown(u):1);}
    const c=this.commander(0),angle=this.formationFacing||-Math.PI/2,side=u.toySlot===1?80:-80,goal=u.type==='toyTurtle'?this.turtleSupportGoal(u,c):{x:c.x-Math.cos(angle)*95-Math.sin(angle)*side,y:c.y-Math.sin(angle)*95+Math.cos(angle)*side};
    const combat=this.units.some(t=>t.team!==0&&t.hp>0&&(distance(t,c)<550||distance(t,u)<300)),s=this.stats(u),speed=!combat&&distance(u,c)>240?Math.max(s.speed,this.stats(c).speed*1.4):s.speed;
    const holding=u.type==='toyTurtle'&&this.time<(u.toyActionUntil||0)&&distance(u,c)<300&&!this.units.some(t=>t.team!==0&&t.hp>0&&distance(t,u)<130);
    const oldX=u.x,oldY=u.y;if(!holding&&distance(u,goal)>18)this.navigate(u,goal.x,goal.y,dt,speed);if(Math.hypot(u.x-oldX,u.y-oldY)>.05)u.toyBodyFace=Math.atan2(u.y-oldY,u.x-oldX);
    this.useSupportToy(u);
   };if(this.coop)this.withOwner(u.coopOwner,run);else run();
  }
 };
 root.FrontSupportToys={rules,toys,insects,waveMotion};return root.FrontSupportToys;
}
if(typeof module!=='undefined'&&module.exports)module.exports=install;else install({FrontGame:root.FrontGame,TYPES:root.FrontTypes});
})(typeof window==='undefined'?globalThis:window);
