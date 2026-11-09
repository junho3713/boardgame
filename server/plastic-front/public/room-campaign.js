/* Living-room campaign only. Times are simulation seconds; weights replace enemies, never add a second spawner. */
(function(root){'use strict';
const config={version:116,duration:1200,enemyLuckyInterval:5,recoverySeconds:16,
 combat:{healthVersion:139,hpScale:1.2,openingHp:{until:300,restoreAt:480,scale:.75},bossHpScale:1.35,bossHpExtra:{rhinoBeetle:1.3,hornet:1.3,crimsonAce:1.3},damageScale:1.25,bossDamageScale:1.3,bossArmorPenetration:{hornet:.3,crimsonAce:.4},bikeDamageScale:1.05},
 evolutionPacing:{enabled:true,expectedAt:600,reliefSeconds:60,rampSeconds:120,reliefDensity:.8,spawnIncrease:.70,capExtra:10,eliteWeight:.8,eliteHp:.45,eliteTypes:['bayonet','bladeGuard','soldierAnt','bruteBeetle','stagBeetle','rhinoBeetle','tank','guntruck']},
 fences:{version:129,hp:12000,y:4550,postWidth:56,postDepth:32,threadDepth:22,lanes:[{id:'left',xs:[70,490,905,1360],colors:['blue','teal','coral','blue'],guns:[{id:'mg',kind:'bunker',x:960,y:4440},{id:'missile',kind:'missileTower',x:150,y:4410},{id:'inner-missile',kind:'missileTower',x:750,y:4370}]},{id:'right',xs:[1640,2095,2510,2930],colors:['coral','blue','teal','coral'],guns:[{id:'mg',kind:'bunker',x:2040,y:4440},{id:'missile',kind:'missileTower',x:2900,y:4440},{id:'inner-missile',kind:'missileTower',x:2250,y:4370}]}]},
 start:{x:1500,y:7560},
 finalBoss:{x:1500,offset:580,positionVersion:168,introSeconds:2.5},
 attrition:{from:600,lateAt:900,soloTwoStarWaveDamage:1.2,lateWaveDamage:.85,mortarDamage:.6,lateMortarDamage:.45},
 lateWaves:{from:900,closedCount:.8,closedInterval:1.15,openExtra:2,openInterval:.8},
 bossRush:{from:960,extraBosses:{crimsonAce:{type:'crimsonAce',name:'진홍 전차 에이스',pattern:'rearBarrage'}},pairs:[{at:960,types:['stagBeetle','bayonetCaptain']},{at:1020,types:['bladeGuard','rhinoBeetle']},{at:1080,types:['bikeRaider','hornet']},{at:1140,types:['crimsonAce','stagBeetle']}],troops:{boss:{openCount:3,closedCount:2,openInterval:3.6,closedInterval:4.2,cap:28},between:{openCount:5,closedCount:4,openInterval:3,closedInterval:3.6,cap:36}}},
 midgame:{from:660,bossDensity:.8,quietDensity:.8},
 rhythm:{lateAt:240,cycle:120,crisisAt:60,recoveryAt:90,recoveryEnd:115,quietDensity:.3},
 surges:{enabled:true,from:120,extra:4,maxBatch:9,growthFrom:360,growthUntil:600,growthMaxBatch:7,intervalScale:.8,lanes:[-1,0,1],frontWidth:420,rosters:[{at:120,types:['machinegun','bayonet','butterfly']},{at:240,types:['stagBeetle','machinegun','sniper','butterfly']},{at:360,types:['hornet','bikeRaider','machinegun','sniper']},{at:480,types:['rhinoBeetle','bikeRaider','butterfly','machinegun']},{at:600,types:['stagBeetle','machinegun','sniper','butterfly']},{at:720,types:['stagBeetle','hornet','sniper','machinegun']},{at:900,types:['rhinoBeetle','butterfly','machinegun','sniper']},{at:1080,types:['hornet','rhinoBeetle','bikeRaider','sniper']}]},
 layout:{version:6,oldWidth:2400,oldHeight:4200,width:3000,height:8400,extraProps:[{kind:'books',label:'쌓인 책',x:250,y:4321.071428571428,w:240,h:165,color:'#6c8582'},{kind:'plant',label:'화분',x:2760,y:6616.428571428572,w:210,h:210,color:'#a87350'},{kind:'plant',label:'화분',x:350,y:3187.8571428571427,w:210,h:210,color:'#a87350'},{kind:'blocks',label:'나무 블록',x:2280,y:2460.714285714286,w:210,h:150,color:'#b68b58'},{kind:'sofa',label:'시작 구역 소파',x:450,y:6850,w:900,h:420,color:'#727c72'},{kind:'blocks',label:'장난감 부품',x:1730,y:7070,w:210,h:150,color:'#b68b58'},{kind:'blocks',label:'장난감 블록',x:2120,y:7270,w:180,h:130,color:'#b68b58'},{kind:'books',label:'시작 구역 책',x:800,y:7510,w:240,h:165,color:'#6c8582'},{kind:'cushion',label:'소파 쿠션',x:2220,y:6680,w:250,h:170,color:'#bc8e70'},{kind:'plant',label:'거실 화분',x:2650,y:7130,w:210,h:210,color:'#a87350'}]},
 laser:{range:370,opacity:.3,color:'#ec443b'},
 opening:[{type:'ant',x:760,y:2240},{type:'ant',x:860,y:2240},{type:'ant',x:855,y:2110},{type:'bayonet',x:740,y:2050},{type:'bladeGuard',x:950,y:2020}],
 roadCaptains:[['road-soldier','bayonet','길목 장난감 병정',5600,1],['road-blade','bladeGuard','블랙 실드 검병 대장',3600,2],['road-bike','bikeRaider','바이크 돌격대장',2160,2]],
 mageEscort:{from:360,mortars:4,spacing:60,depth:80,interval:60},
 insects:{from:180,intervals:{bombBug:24,acidBeetle:14}},
 caps:{bombBug:2,acidBeetle:2,blizzardMage:2,mortar:4,butterfly:2,sniper:2,machinegun:4,hornet:3,honeybee:8,bikeRaider:3,rhinoBeetle:4,stagBeetle:5,crimsonAce:3,lucky:4},
 guardians:{version:142,midLaser:{id:'room-threequarter-laser',x:1500,fraction:.5},midMage:{id:'room-half-mage',x:1500,fraction:.75},finalMage:{id:'room-final-mage',x:1340,offset:280},finalMages:[{id:'room-final-mage',x:1340,offset:280},{id:'room-final-mage-right',x:1660,offset:280}],rearLasers:[{id:'room-final-rear-laser-left',x:950,offset:-400},{id:'room-final-rear-laser-right',x:2050,offset:-400}],finalLasers:[{id:'room-final-laser',x:1225,offset:260},{id:'room-final-laser-right',x:1775,offset:260}]},
 fortifications:{version:121,missiles:[{id:'room-hq-missile-left',x:980,y:1040},{id:'room-hq-missile-right',x:2020,y:1040},{id:'room-hq-missile-rear-left',x:1050,y:300},{id:'room-hq-missile-rear-right',x:1950,y:300}],guardian:{midLaser:{hp:2.6,defense:20},finalLaser:{hp:3.2,defense:30},midMage:{hp:3.2,damage:1.25,rate:.9,defense:18},finalMage:{hp:4,damage:1.35,rate:.9,defense:24},post:{hp:1.8,damage:1.25,defense:15},hq:{hp:1.75,damage:1.3,defense:20},garrison:{hp:1.5,damage:1,defense:8}},
  lines:[{id:'first-patrol',y:6200,roster:['ant','ant','bayonet']},{id:'laser-approach',y:4800,roster:['ant','ant','bladeGuard']},{id:'laser-left',x:450,y:4300,roster:['bladeGuard','machinegun']},{id:'laser-right',x:2550,y:4300,roster:['bladeGuard','machinegun']},{id:'approach',y:5600,roster:['bladeGuard','bayonet','machinegun']},{id:'laser',y:4200,roster:['bayonet','bladeGuard','machinegun','machinegun','sniper']},{id:'witch',y:2400,roster:['stagBeetle','bladeGuard','machinegun','sniper']},{id:'final',y:1600,roster:['stagBeetle','bladeGuard','bladeGuard','machinegun','machinegun','sniper']}],leash:600,engage:650},
 lessons:{laser:{field:'laserExposureQuest',unlock:'mortar',hits:1},mage:{field:'mageShieldQuest',unlock:'sniper',uses:2}},
 phases:[
 {at:0,name:'초반 적응',interval:6,batch:1,cap:10,mix:{ant:8,bayonet:2,bladeGuard:1}},
 {at:60,name:'분대 성장',interval:5.5,batch:2,cap:16,mix:{ant:8,bayonet:2,bladeGuard:1}},
 {at:120,name:'첫 특수 위기',interval:4,batch:4,cap:34,mix:{ant:3,bayonet:3,bladeGuard:2,honeybee:3,machinegun:2,butterfly:.8}},
 {at:180,name:'폭탄개미·투석 딱정벌레 합류',interval:4,batch:4,cap:34,mix:{ant:2,bombBug:.45,acidBeetle:.55,bayonet:3,bladeGuard:2,honeybee:3,machinegun:2,butterfly:.8}},
 {at:240,name:'장갑·저격 혼합',interval:3.84,batch:5,cap:38,mix:{ant:2,bombBug:.45,acidBeetle:.55,bayonet:3,stagBeetle:2,sniper:1.5,honeybee:2,bladeGuard:2,machinegun:1.5,butterfly:.6}},
 {at:360,name:'기동·원거리 위기',interval:4,batch:5,cap:41,mix:{blizzardMage:.7,ant:2,bombBug:.45,acidBeetle:.55,bayonet:2,bladeGuard:3,hornet:1,bikeRaider:1,machinegun:2,sniper:1,honeybee:2}},
 {at:480,name:'돌진·치유 약화',interval:4.16,batch:5,cap:41,mix:{blizzardMage:.7,ant:4,bombBug:.45,acidBeetle:.55,bayonet:2,rhinoBeetle:1,butterfly:.8,bikeRaider:1,bladeGuard:1,honeybee:2}},
 {at:600,name:'재편성·혼합 공세',interval:3.9,batch:6,cap:46,mix:{blizzardMage:1.4,ant:3,bombBug:.45,acidBeetle:.55,bayonet:3,bladeGuard:2,honeybee:2,machinegun:1.5,stagBeetle:1,sniper:1,butterfly:.6}},
 {at:720,name:'중장갑 방어선',interval:3.6,batch:6,cap:50,mix:{blizzardMage:1.4,ant:3,bombBug:.45,acidBeetle:.55,bayonet:2,stagBeetle:2,hornet:1,sniper:1,machinegun:2,honeybee:2,bikeRaider:.6,lucky:.5}},
 {at:900,name:'맹독·장갑 혼합',interval:3.6,batch:6,cap:50,mix:{blizzardMage:1.4,ant:3,bombBug:.45,acidBeetle:.55,bayonet:2,stagBeetle:2,rhinoBeetle:1,butterfly:.8,hornet:1,machinegun:1,sniper:1,lucky:.5}},
 {at:1080,name:'최종 공세',interval:3.4,batch:6,cap:52,mix:{blizzardMage:1.4,ant:2,bombBug:.45,acidBeetle:.55,bayonet:3,bladeGuard:2,rhinoBeetle:1,stagBeetle:2,butterfly:.8,hornet:1,machinegun:2,sniper:1,bikeRaider:1,lucky:.5}}
 ],
 tanks:[780,930,1020],
 encirclement:{from:180,intervalScale:2.25,pressureFrom:300,pressureUntil:600,lateIntervalScale:2},
 miniBoss:{from:180,interval:60,until:960,hp:.3,damage:.3,spawnWindow:50,withdrawBefore:8},
 bosses:[{at:240,type:'stagBeetle',name:'거대 사슴벌레',pattern:null},{at:360,type:'bayonetCaptain',name:'장난감 병정 보스',pattern:'soldierDash'},{at:480,type:'bladeGuard',name:'검병 대장',pattern:'wideSlash'},{at:600,type:'rhinoBeetle',name:'장수풍뎅이 보스',pattern:'rhinoCharge'},{at:720,type:'bikeRaider',name:'오토바이병 대장',pattern:'rapidBike'},{at:900,type:'hornet',name:'장수말벌',pattern:'venomDive'},{at:1200,type:'swordEmpress',name:'사검의 군주',pattern:'fourSwords'}],
 patterns:{soldierDash:{hpScale:1.75,every:2,duration:1,speed:2.2,damageMultiplier:3},wideSlash:{range:220,arc:1.9,windup:.7,damageMultiplier:2},rhinoCharge:{range:420,cooldown:8,windup:1,distance:360,speed:800,halfWidth:30,recovery:3,vulnerable:1.3,damageScale:.6,infantryHpDamage:.5},rapidBike:{cooldown:4.2},venomDive:{cooldown:8,rise:.25,warning:.6,descent:.1,recovery:2,height:145,lowHeight:24,damage:1.6,maxHpDamage:.5,poisonDuration:4,poisonRate:.25,poisonPerSecond:.12},rearBarrage:{cooldown:7,warning:1.5,radius:100,damage:1.35,bossDamageMultiplier:.85,range:650,shots:3,spacing:220}}
};
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const methods={
 isRoomCampaign(){return this.mode==='pve'&&(this.world?.id==='livingroom'||this.mapId==='livingroom');},
 roomPortalAlive(){return this.bases[1].hp>0;},
 roomPortalDestroyed(){const s=this.roomCampaign;if(s.portalRewarded)return;s.portalRewarded=true;s.portalDestroyedAt=this.time;this.cash[0]+=300;this.awardGold(100);this.bossState.rewards++;this.notify('toast','최전방 포탈 폐쇄 · +300자원 / +100골드 / 강화 보상 · 증원 감소');},
 roomPhase(){return config.phases.filter(p=>p.at<=this.time).at(-1)||config.phases[0];},
 evolutionPace(){
  const r=config.evolutionPacing,enabled=r.enabled&&this.mode==='pve'&&(this.isRoomCampaign()||this.isDesktopDefense()),after=this.time-r.expectedAt,progress=enabled?clamp((after-r.reliefSeconds)/r.rampSeconds,0,1):0;
  return{relief:enabled&&after>=0&&after<r.reliefSeconds,progress,spawnScale:1+r.spawnIncrease*progress,capExtra:Math.round(r.capExtra*progress)};
 },
 evolutionWaveMix(mix=this.roomPhase().mix){const pace=this.evolutionPace(),r=config.evolutionPacing;return Object.fromEntries(Object.entries(mix).map(([type,weight])=>[type,weight*(r.eliteTypes.includes(type)?1+r.eliteWeight*pace.progress:1)]));},
 stampEvolutionWave(u){
  if(!u||u.team===0||u.boss||!config.evolutionPacing.eliteTypes.includes(u.type))return u;
  const progress=this.evolutionPace().progress;if(progress<=0)return u;
  const ratio=u.hp/Math.max(1,u.maxHp);u.evolutionWaveHp=1+config.evolutionPacing.eliteHp*progress;u.maxHp=this.stats(u).hp;u.hp=u.maxHp*ratio;return u;
 },
 roomBeat(){const s=this.roomCampaign,p=this.roomPhase();if(this.time<(s?.recoveryUntil||0))return{name:'보스 격파 후 회복',density:.3};if(this.units.some(u=>u.boss&&!u.miniBoss&&!u.roadCaptain&&u.hp>0))return{name:'보스 전투',density:this.time>=config.midgame.from?config.midgame.bossDensity:.5};if(this.time<120)return{name:'초반 적응',density:1};if(this.time>=450&&this.time<510)return{name:'포병 특수 위기',density:.55};if(this.evolutionPace().relief)return{name:'전력 전환 · 돌파',density:config.evolutionPacing.reliefDensity};const r=config.rhythm,cycle=(this.time-p.at)%r.cycle,postBoss=s?.recoveryUntil>0&&this.time<s.recoveryUntil+30;if(this.time>=r.lateAt)return !postBoss&&cycle>=r.recoveryAt&&cycle<r.recoveryEnd?{name:'전진·재정비',density:this.time>=config.midgame.from?config.midgame.quietDensity:r.quietDensity}:cycle>=r.crisisAt&&cycle<r.recoveryAt?{name:'특수 혼합 공세',density:1.3}:{name:'일반 전투',density:1};return !postBoss&&cycle>=90&&cycle<110?{name:'재정비',density:.45}:cycle>=65&&cycle<90?{name:'특수 혼합 공세',density:1.3}:{name:'일반 전투',density:1};},
 roomPressure(){const p=this.roomPhase(),plan=this.roomWavePlan(),tier=Math.floor(this.time/60);return{tier,late:true,hp:1+.12*tier,damage:1.25*(1+.10*tier),defense:3*tier,combatCap:this.roomWaveCap(),soldierCap:this.roomWaveCap(),swarmCap:this.roomWaveCap(),postCap:0,baseCap:0,postBatch:0,baseBatch:0,postInterval:30,baseInterval:30,swarmBatch:plan.count,swarmInterval:plan.interval,assaultBatch:0,assaultInterval:30};},
 upgradeRoomCampaign(){
  if(!this.isRoomCampaign())return false;this.upgradeRoomMidBosses();if(this.roomCampaign&&!this.roomCampaign.endgame153){this.roomCampaign.endgame153=true;for(const u of this.units)if(u.finalBoss){u.finalBoss=false;}this.finalBattle={spawned:false,killed:false};this.roomCampaign.bossCursor=Math.min(this.roomCampaign.bossCursor,config.bosses.length-1);}let updated=this.setupRoomFences();if(this.upgradeRoomEncounters())updated=true;if(this.setupRoomFortifications())updated=true;if(this.roomCampaign?.version===config.version){this.upgradeRoomFinalBossPosition();if(this.refreshRoomEnemyHealth())updated=true;return updated;}
  const old=this.time>0,cursor=old?config.bosses.findIndex(b=>b.at>=this.time):0;
  this.roomCampaign={endgame153:true,version:config.version,nextSpawnAt:this.time+4,spawned:0,miniScheduleVersion:2,miniMinute:Math.floor(this.time/60),bossCursor:cursor<0?config.bosses.length:cursor,recoveryUntil:0,bossReadyAt:this.time,tanksDone:config.tanks.map(at=>old&&at<this.time),tankSpawned:0,phaseAt:this.roomPhase().at};
  this.mission.stage=3;this.mission.nextAssault=Infinity;this.mission.nextWave=Infinity;
  // Road encounters keep their IDs and positions, but are local elites, not extra scheduled bosses.
  for(const u of this.units)if(u.roadCaptain){u.boss=false;u.roadStage=1;u.missionStage=1;}
  this.bossState.nextAt=config.bosses[this.roomCampaign.bossCursor]?.at??Infinity;this.bossState.warned=false;
  for(const u of this.units)if(u.boss&&!u.roadCaptain){const b=config.bosses.find(b=>b.type===u.type);if(b)u.bossPattern=b.pattern;}
  this.finalBattle=this.finalBattle||{spawned:false,killed:false};this.refreshRoomEnemyHealth();return true;
 },
 upgradeRoomEncounters(){
  if(!this.isRoomCampaign()||this.roomEncounterVersion===117)return false;
  for(const u of this.units){
   if(u.guardianId==='road-soldier'&&u.type==='bayonetCaptain'){const ratio=u.hp>0?u.hp/Math.max(1,u.maxHp):0;u.type='bayonet';u.boss=false;u.bossPattern=null;u.bossName='길목 장난감 병정';u.maxHp=this.stats(u).hp;u.hp=u.maxHp*ratio;}
   else if(u.boss&&!u.roadCaptain&&u.type==='bayonetCaptain'){u.bossPattern='soldierDash';const ratio=u.hp>0?u.hp/Math.max(1,u.maxHp):0;u.maxHp=this.stats(u).hp;u.hp=u.maxHp*ratio;}
  }this.roomEncounterVersion=117;return true;
 },
 expandRoomLayout(){
  if(this.bounds().id!=='livingroom'||this.world.layoutVersion>=config.layout.version)return false;
  const l=config.layout,sx=l.width/(this.world.width||l.oldWidth),sy=l.height/(this.world.height||l.oldHeight),seen=new Set();
  const scale=o=>{if(!o||seen.has(o))return;seen.add(o);for(const [x,y]of [['x','y'],['homeX','homeY'],['guardianSpawnX','guardianSpawnY'],['fromX','fromY'],['tx','ty'],['aimX','aimY']]){if(Number.isFinite(o[x]))o[x]*=sx;if(Number.isFinite(o[y]))o[y]*=sy;}if(Number.isFinite(o.angle))o.angle=Math.atan2(Math.sin(o.angle)*sy,Math.cos(o.angle)*sx);};
  const nodes=[...this.units,...this.bases,...this.structures,...this.defenses,...this.buildings,...this.pickups];
  for(const u of nodes){scale(u);for(const key of ['guardArrival','aiEvade','regroup','repairGoal','repairEvadeGoal','blizzardCast','bossAction','bossBarrage','sniperAim'])scale(u[key]);if(u.bikeAttack){const a=u.bikeAttack,k=Math.hypot(Math.cos(a.angle)*sx,Math.sin(a.angle)*sy);scale(a.origin);scale(a);for(const key of ['distance','remaining','traveled'])if(Number.isFinite(a[key]))a[key]*=k;}
   u.route=null;u.routeGoal=null;u.regroup=null;if(u.mobile){u.repairPath=null;u.repairReplanAt=0;}
  }
  for(const list of [this.shots,this.mortarShells,this.barrages,this.effects,this.butterflyGusts,this.luckyMines,this.luckyGlues,this.luckyGlueHistory,this.luckySprays])for(const o of list||[])scale(o);
  scale(this.camera);scale(this.moveOrder);scale(this.ultimate);scale(this.constructionLine?.anchor);
  this.obstacles=this.obstacles.map(o=>({...o,x:(o.x+o.w/2)*sx-o.w/2,y:(o.y+o.h/2)*sy-o.h/2}));
  this.world.width=l.width;this.world.height=l.height;this.world.layoutVersion=l.version;
  for(const p of l.extraProps)if(!this.obstacles.some(o=>o.kind===p.kind&&Math.hypot(o.x-p.x,o.y-p.y)<1)&&!nodes.some(u=>u.hp>0&&u.x>p.x-70&&u.x<p.x+p.w+70&&u.y>p.y-70&&u.y<p.y+p.h+70))this.obstacles.push({...p});
  this.navigationCache.clear();for(const u of nodes)if(u.hp>0&&!u.base&&!u.structure)this.resolvePosition(u);return true;
 },
 roomDefenseRules(u){
  if(!this.isRoomCampaign()||u?.team===0)return null;const r=config.fortifications.guardian,id=u.guardianId||u.id;
  if(u.fencePost)return null;
  if(u.roomGarrison)return r.garrison;
  if(id==='room-half-mage')return r.midMage;
  if(typeof id==='string'&&id.startsWith('room-final-mage'))return r.finalMage;
  if(id==='room-threequarter-laser')return r.midLaser;
  if(typeof id==='string'&&(id.startsWith('room-final-laser')||id.startsWith('room-final-rear-laser')))return r.finalLaser;
  if(u===this.bases[1])return r.hq;
  if(this.structures.includes(u)||this.defenses.includes(u))return r.post;
  return null;
 },
 roomTowerHp(u){return 1500*(this.roomDefenseRules(u)?.hp||1);},
 setupRoomFences(){
  if(!this.isRoomCampaign()||this.roomFenceVersion===config.fences.version)return false;
  const f=config.fences;
  for(const lane of f.lanes){
   for(let i=0;i<lane.xs.length;i++){
    const id='room-fence-'+lane.id+'-'+i,existing=this.defenses.find(p=>p.id===id);if(existing){Object.assign(existing,{x:lane.xs[i],y:f.y,color:lane.colors[i]});continue;}
    this.defenses.push({id,name:'집게 철조망',team:1,structure:true,defenseKind:'clothFence',fencePost:true,lane:lane.id,slot:i,color:lane.colors[i],x:lane.xs[i],y:f.y,r:28,hp:f.hp,maxHp:f.hp,activeStage:1,cooldown:0});
   }
   for(const site of lane.guns){
    const id='room-fence-guard-'+lane.id+'-'+site.id,existing=this.defenses.find(p=>p.id===id);if(existing){Object.assign(existing,{x:site.x,y:site.y});continue;}
    const hp=site.kind==='bunker'?2700:2520;
    this.defenses.push({id,name:site.kind==='bunker'?'측면 기관총 포탑':'측면 미사일 포탑',team:1,structure:true,defenseKind:site.kind,x:site.x,y:site.y,r:42,hp,maxHp:hp,roomBaseHp:site.kind==='bunker'?1500:1400,roomDefenseVersion:config.fortifications.version,activeStage:1,cooldown:1.5,face:Math.PI/2});
   }
  }
  // Keep the original western bunker off the laser's central approach as well.
  const west=this.defenses.find(p=>p.id==='west-mg');if(west)Object.assign(west,{x:640,y:4370});
  this.roomFenceVersion=f.version;this.navigationCache.clear();
  for(const u of this.units)if(u.hp>0&&!this.isFlying(u))this.resolvePosition(u);
  for(const p of this.pickups)if(p.active)this.resolvePosition(p,24);
  return true;
 },
 roomFenceLinks(){
  if(!this.isRoomCampaign())return [];
  const posts=new Map(this.defenses.filter(p=>p.fencePost&&p.hp>0).map(p=>[p.id,p])),links=[];
  for(const lane of config.fences.lanes)for(let i=0;i<lane.xs.length-1;i++){
   const a=posts.get('room-fence-'+lane.id+'-'+i),b=posts.get('room-fence-'+lane.id+'-'+(i+1));if(a&&b)links.push({id:lane.id+'-'+i,a,b});
  }
  return links;
 },
 roomFenceBodies(){
  if(!this.isRoomCampaign())return [];
  const f=config.fences,posts=this.defenses.filter(p=>p.fencePost&&p.hp>0).map(p=>({x:p.x-f.postWidth/2,y:p.y-f.postDepth/2,w:f.postWidth,h:f.postDepth,kind:'fencePostBody',firePass:true}));
  return [...posts,...this.roomFenceLinks().map(({a,b})=>({x:a.x,y:a.y-f.threadDepth/2,w:b.x-a.x,h:f.threadDepth,kind:'fenceThreadBody',firePass:true}))];
 },
 setupRoomDressing(){
  if(!this.isRoomCampaign()||this.world.dressingVersion===121)return;
  for(const p of config.layout.extraProps){
   if(this.obstacles.some(o=>o.kind===p.kind&&Math.hypot(o.x-p.x,o.y-p.y)<1))continue;
   if(this.buildings.some(b=>b.hp>0&&!b.mobile&&b.x>p.x-60&&b.x<p.x+p.w+60&&b.y>p.y-60&&b.y<p.y+p.h+60))continue;
   this.obstacles.push({...p});
  }
  this.world.dressingVersion=121;this.navigationCache.clear();
  for(const u of [...this.units,...this.pickups.filter(p=>p.active)])this.resolvePosition(u);
 },
 setupRoomFortifications(){
  if(!this.isRoomCampaign())return false;this.setupRoomDressing();if(this.roomFortificationVersion===config.fortifications.version)return false;
  const old=this.time>0,c=this.commander(0),rules=config.fortifications;
  for(const line of rules.lines){
   if(old&&c.y<line.y-rules.engage)continue;
   for(let i=0;i<line.roster.length;i++){
    const id='room-garrison-'+line.id+'-'+i;if(this.units.some(u=>u.guardianId===id))continue;
    const x=(line.x??config.layout.width/2)+(i-(line.roster.length-1)/2)*125,y=line.y+(i<2?130:-100);
    const u=this.addUnit(1,line.roster[i],x,y,true);Object.assign(u,{guardianId:id,roomGarrison:true,missionStage:1,homeX:u.x,homeY:u.y});u.hp=u.maxHp=this.stats(u).hp;
   }
  }
  const template=this.defenses.find(u=>u.defenseKind==='missileTower');
  if(template)for(const site of rules.missiles)if(!this.defenses.some(u=>u.id===site.id)){
   const hp=template.roomBaseHp??template.maxHp,p={id:site.id,name:'HQ 방어 미사일 포탑',x:site.x,y:site.y,team:1,structure:true,defenseKind:'missileTower',activeStage:1,hp,maxHp:hp,r:42,cooldown:1.5+(site.x%3)*.4};this.resolvePosition(p,50);this.defenses.push(p);
  }
  for(const u of [...this.units,...this.structures,...this.defenses,this.bases[1]]){
   const r=this.roomDefenseRules(u);if(!r||u.roomDefenseVersion===rules.version)continue;
   const ratio=u.hp>0?u.hp/Math.max(1,u.maxHp):0;
   u.roomBaseHp??=u.maxHp;
   u.maxHp=u.type?this.stats(u).hp:u.defenseKind==='laserTower'?this.roomTowerHp(u):u.roomBaseHp*r.hp;u.hp=u.maxHp*ratio;u.roomDefenseVersion=rules.version;
  }
  this.roomFortificationVersion=rules.version;return true;
 },
 refreshRoomEnemyHealth(){
  if(!this.isRoomCampaign()||this.roomHealthVersion===config.combat.healthVersion)return false;
  for(const u of this.units){if(u.team===0)continue;const ratio=u.hp>0?clamp(u.hp/Math.max(1,u.maxHp),0,1):0;u.maxHp=this.stats(u).hp;u.hp=u.maxHp*ratio;}
  this.roomHealthVersion=config.combat.healthVersion;return true;
 },
 roomEnemyCount(type=null){return this.units.filter(u=>u.hp>0&&u.team!==0&&!u.boss&&!u.fixedGuard&&!u.roomGarrison&&u.type!=='artillery'&&(!type||u.type===type)).length;},
 roomWaveCap(){const boss=this.units.some(u=>u.boss&&!u.miniBoss&&!u.roadCaptain&&u.hp>0),base=this.time>=config.bossRush.from?config.bossRush.troops[boss?'boss':'between'].cap:this.roomPhase().cap;return base+(boss?0:this.evolutionPace().capExtra);},
 roomCanSpawn(type){if(type==='sniper'&&this.enemySniperCount()>=2)return false;if(config.insects.intervals[type]&&(this.time<config.insects.from||this.time<(this.roomCampaign?.insectNext?.[type]||0)))return false;return this.roomEnemyCount()<this.roomWaveCap()&&this.roomEnemyCount(type)<(config.caps[type]??Infinity);},
 roomWavePlan(){
  const p=this.roomPhase(),beat=this.roomBeat(),r=config.surges,surge=r.enabled&&this.time>=r.from&&beat.density>1;
  const portal=this.roomPortalAlive(),late=portal&&this.time>=900;const plan={surge,count:beat.density<.6?1:surge?Math.min(this.time>=r.growthFrom&&this.time<r.growthUntil?r.growthMaxBatch:r.maxBatch,p.batch+r.extra):Math.min(6,p.batch+(beat.density>1&&this.time>=240?1:0)),interval:p.interval/beat.density*(surge?r.intervalScale:1),forced:surge?(r.rosters.filter(row=>row.at<=this.time).at(-1)?.types||[]):[],window:p.at+':'+Math.floor((this.time-p.at)/config.rhythm.cycle)};if(!portal){const late=this.time>=config.lateWaves.from;plan.count=Math.max(1,Math.ceil(plan.count*(late?config.lateWaves.closedCount:.65)));plan.interval*=late?config.lateWaves.closedInterval:1.4;}else if(late&&beat.density>=.6){plan.count=Math.min(10,plan.count+config.lateWaves.openExtra);plan.interval*=config.lateWaves.openInterval;plan.surge=true;plan.forced=['machinegun','sniper','butterfly','bikeRaider'];}if(this.time>=config.bossRush.from&&this.time>=(this.roomCampaign?.recoveryUntil||0)){const row=config.bossRush.troops[this.units.some(u=>u.boss&&!u.miniBoss&&!u.roadCaptain&&u.hp>0)?'boss':'between'];plan.count=portal?row.openCount:row.closedCount;plan.interval=portal?row.openInterval:row.closedInterval;plan.surge=false;plan.forced=[];}if(!this.units.some(u=>u.boss&&!u.miniBoss&&!u.roadCaptain&&u.hp>0)){if(this.time>=config.encirclement.from){const r=config.encirclement,q=clamp((this.time-r.pressureFrom)/Math.max(1,r.pressureUntil-r.pressureFrom),0,1);plan.interval*=r.intervalScale+(r.lateIntervalScale-r.intervalScale)*q;}if(beat.density>=1)plan.interval/=this.evolutionPace().spawnScale;}return plan;
 },
 spawnRoomEnemy(type,lane=null){if(!this.roomCanSpawn(type))return null;const cursor=this.roomCampaign.entryCursor||0,p=this.roomEntry(this.serial+1+(lane||0)*3,55,cursor%4);if(!p)return null;this.roomCampaign.entryCursor=Number.isInteger(p.entrySide)?p.entrySide+1:cursor+1;const team=['machinegun','sniper','crimsonAce','lucky'].includes(type)?1:2,u=this.addUnit(team,type,p.x,p.y,true);if(config.insects.intervals[type]){const next=this.roomCampaign.insectNext??={};next[type]=this.time+config.insects.intervals[type];}u.roomEntrySide=p.entrySide;u.assault=true;u.roomWave=true;this.stampEvolutionWave(u);if(type==='blizzardMage')Object.assign(u,{mobileMage:true,activeStage:1,cooldown:1.2});return u;},
 roomCanSpawnMageGroup(){
  const r=config.mageEscort,scale=this.coop?this.coopSpawnScale:1;
  return this.time>=r.from&&this.time>=(this.roomCampaign?.nextMageEscortAt||0)&&this.roomCanSpawn('blizzardMage')&&this.roomEnemyCount()+1+r.mortars<=this.roomWaveCap()&&this.roomEnemyCount('mortar')+r.mortars<=Math.ceil(config.caps.mortar*scale);
 },
 spawnRoomMageGroup(lane=null){
  if(!this.roomCanSpawnMageGroup())return null;const mage=this.spawnRoomEnemy('blizzardMage',lane);if(!mage)return null;
  const r=config.mageEscort,group=[mage];mage.roomEscortGroup=mage.id;this.roomCampaign.nextMageEscortAt=this.time+r.interval;
  for(let i=0;i<r.mortars;i++){const u=this.addUnit(mage.team,'mortar',mage.x+(i-(r.mortars-1)/2)*r.spacing,mage.y-r.depth,true);Object.assign(u,{assault:true,roomWave:true,roomEscortGroup:mage.id,roomEscortLeaderId:mage.id,roomEscortSlot:i});group.push(u);}
  return group;
 },
 followRoomEscort(u,dt,s){
  if(!u.roomEscortLeaderId)return false;const mage=this.units.find(v=>v.id===u.roomEscortLeaderId&&v.hp>0);if(!mage)return false;
  const r=config.mageEscort,angle=mage.aimFace??mage.face,side=(u.roomEscortSlot-(r.mortars-1)/2)*r.spacing;
  const goal={x:mage.x-Math.cos(angle)*r.depth-Math.sin(angle)*side,y:mage.y-Math.sin(angle)*r.depth+Math.cos(angle)*side};
  if(d(u,goal)>18)this.navigate(u,goal.x,goal.y,dt,s.speed);return true;
 },
 updateRoomScheduledTanks(){
  const s=this.roomCampaign;if(s.tankScheduleVersion!==170){const actual=Math.max(0,Math.min(config.tanks.length,Math.max(Math.floor(s.tankSpawned||0),this.units.filter(u=>u.type==='crimsonAce'&&!u.boss&&u.roomWave&&u.hp>0).length)));s.tankSpawned=actual;s.tanksDone=config.tanks.map((_,i)=>i<actual);s.tankScheduleVersion=170;}
  if(this.time<(s.nextTankAttemptAt||0))return;
  const slot=config.tanks.findIndex((at,i)=>!s.tanksDone[i]&&this.time>=at);if(slot<0)return;
  const u=this.spawnRoomEnemy('crimsonAce');s.nextTankAttemptAt=this.time+(u?.5:1);if(!u)return;
  u.roomTankSlot=slot;s.tanksDone[slot]=true;s.tankSpawned++;this.notify('toast',`적 전차 증원 ${s.tankSpawned}/${config.tanks.length} · 화면 밖에서 접근`);
 },
 updateRoomWaves(){
  if(this.phase!=='playing')return;this.upgradeRoomCampaign();const s=this.roomCampaign,p=this.roomPhase(),plan=this.roomWavePlan();
  if(s.phaseAt!==p.at){s.phaseAt=p.at;this.notify('toast',p.name+' · '+this.roomBeat().name);}
  if(plan.surge&&s.surgeWindow!==plan.window){s.surgeWindow=plan.window;this.notify('toast','집중 공세 · 혼합 병력 접근');}
  this.updateRoomScheduledTanks();
  if(this.time>=config.midgame.from)s.nextSpawnAt=Math.min(s.nextSpawnAt,this.time+plan.interval);
  if(this.time<s.nextSpawnAt)return;s.nextSpawnAt=this.time+plan.interval;
  const debt=s.waveSpawnDebt||0,count=Math.max(0,plan.count-debt);s.waveSpawnDebt=Math.max(0,debt-plan.count);
  const mix=this.evolutionWaveMix(p.mix),eligible=type=>type==='blizzardMage'?this.roomCanSpawnMageGroup():this.roomCanSpawn(type);
  const melee=['bombBug','ant','bayonet','bladeGuard','stagBeetle','rhinoBeetle'];
  for(let i=0;i<count;i++){
   const forced=i===0&&this.roomCanSpawnMageGroup()&&p.mix.blizzardMage>0?'blizzardMage':plan.forced[i];let type=forced&&p.mix[forced]>0&&eligible(forced)?forced:null;
   if(!type){const pool=Object.entries(mix).filter(([t])=>eligible(t)&&(i<4||melee.includes(t))),total=pool.reduce((n,[,w])=>n+w,0);if(!total)break;let roll=this.random()*total;type=pool.at(-1)[0];for(const [t,w]of pool){roll-=w;if(roll<0){type=t;break;}}}
   const lane=plan.surge?config.surges.lanes[(i+s.spawned)%config.surges.lanes.length]:null;
   if(type==='blizzardMage'){const group=this.spawnRoomMageGroup(lane);if(!group){s.nextSpawnAt=this.time+2;break;}s.spawned+=group.length;s.waveSpawnDebt+=Math.max(0,group.length-(count-i));i+=group.length-1;continue;}
   if(!this.spawnRoomEnemy(type,lane)){s.nextSpawnAt=this.time+2;break;}s.spawned++;
  }
 },
 upgradeRoomFinalBossPosition(){
  const u=this.units.find(u=>u.type==='swordEmpress'&&u.finalBoss&&u.hp>0),r=config.finalBoss;if(!u||u.roomFinalPositionVersion===r.positionVersion)return false;
  const at=this.resolvePosition({x:r.x,y:this.bases[1].y+r.offset},60),dx=at.x-u.x,dy=at.y-u.y;u.x=u.homeX=at.x;u.y=u.homeY=at.y;u.roomFinalPositionVersion=r.positionVersion;
  if(u.swords){u.swords.pending=null;u.swords.nextAttackAt=this.time+2.5;for(const blade of u.swords.blades){blade.x+=dx;blade.y+=dy;blade.action=null;}}
  this.bossIntro={bossId:u.id,name:u.bossName||'사검의 군주',x:u.x,y:u.y,from:{x:this.camera.x,y:this.camera.y},remaining:r.introSeconds,total:r.introSeconds};return true;
 },
 roomRushEntry(){const s=this.roomCampaign;if(this.finalBattle.spawned||this.units.some(u=>u.finalBoss)){s.rushCursor=config.bossRush.pairs.length;return null;}if(!Number.isInteger(s.rushCursor))s.rushCursor=0;return config.bossRush.pairs[s.rushCursor]||null;},
 roomNextBossAt(){const b=config.bosses[this.roomCampaign.bossCursor],rush=this.roomRushEntry();return b?.type==='swordEmpress'&&rush?rush.at:b?.at??Infinity;},
 updateRoomBossRush(){
  const s=this.roomCampaign,r=this.roomRushEntry();if(!r)return false;this.bossState.nextAt=Math.max(r.at,s.bossReadyAt||0);
  if(this.units.some(u=>u.boss&&!u.miniBoss&&!u.roadCaptain&&u.hp>0)||this.time<(s.bossReadyAt||0))return true;
  const entries=r.types.map(type=>config.bosses.find(b=>b.type===type)||config.bossRush.extraBosses[type]);
  if(!this.bossState.warned&&this.time>=r.at-8){this.bossState.warned=true;this.notify('toast','보스 연전 · '+entries.map(b=>b.name).join(' + ')+' 접근');}
  if(this.time<r.at)return true;
  const points=entries.map((_,i)=>this.northernSpawn(this.serial+i*7+1,55));if(points.some(p=>!p))return true;
  const pair='room-rush-'+s.rushCursor;for(const [i,b]of entries.entries()){const p=points[i],u=this.addUnit(2,b.type,p.x,p.y,true);Object.assign(u,{boss:true,bossName:b.name,bossPattern:b.pattern,bossRushPair:pair,assault:true,finalBoss:false,bossNumber:++this.bossState.spawned});u.hp=u.maxHp=this.stats(u).hp;u.homeX=u.x;u.homeY=u.y;}
  s.rushCursor++;s.recoveryUntil=0;this.bossState.warned=false;this.bossState.nextAt=this.roomNextBossAt();this.notify('toast','보스 2기 출현 · '+entries.map(b=>b.name).join(' + '));return true;
 },
 withdrawRoomMiniBosses(){
  for(const u of this.units)if(u.miniBoss&&u.hp>0){u.hp=0;u.diedAt=this.time;u.miniBossWithdrawn=true;u.bikeAttack=u.bossAction=u.bossBarrage=null;
   for(const key of ['shots','mortarShells','effects'])this[key]=this[key].filter(e=>e.source!==u);
  }
 },
 upgradeRoomMidBosses(){
  for(const u of this.units)if(u.miniBoss&&u.midBossVersion!==1){
   const ratio=u.hp>0?clamp(u.hp/Math.max(1,u.maxHp),0,1):0;u.maxHp=this.stats(u).hp;u.hp=u.maxHp*ratio;
   u.bossName=(u.bossName||'중간 보스').replace(/^중간 보스/,'미드 보스');u.midBossVersion=1;
  }
 },
 updateRoomMiniBosses(){
  this.upgradeRoomMidBosses();
  if(this.phase!=='playing'||!this.isRoomCampaign())return;
  const r=config.miniBoss,s=this.roomCampaign,minute=Math.floor((this.time+1e-8)/r.interval),at=minute*r.interval;
  if(s.miniScheduleVersion!==2){s.miniScheduleVersion=2;s.miniMinute=this.units.some(u=>u.miniBossMinute===minute)?minute:minute-1;}
  if(!Number.isInteger(s.miniMinute))s.miniMinute=minute-1;
  const next=config.bosses.find(b=>b.at>=this.time);
  if(this.time>=r.until||next&&next.at-this.time<=r.withdrawBefore){this.withdrawRoomMiniBosses();s.miniMinute=minute;return;}
  if(this.time<r.from){this.withdrawRoomMiniBosses();s.miniMinute=minute;return;}
  if(minute<=s.miniMinute)return;
  const boss=config.bosses.find(b=>b.at>at);
  if(!boss||this.time-at>r.spawnWindow||config.bosses.some(b=>b.at===at)||this.units.some(u=>u.boss&&!u.roadCaptain&&u.hp>0)||this.time<(s.recoveryUntil||0)){s.miniMinute=minute;return;}
  const point=this.roomEntry(this.serial+1,55,minute%4);if(!point)return;
  const u=this.addUnit(2,boss.type,point.x,point.y,true);Object.assign(u,{boss:true,miniBoss:true,midBossVersion:1,miniBossMinute:minute,bossName:'미드 보스 · '+boss.name,bossPattern:boss.pattern,assault:true,homeX:point.x,homeY:point.y});u.hp=u.maxHp=this.stats(u).hp;
  s.miniMinute=minute;this.notify('toast',u.bossName+' 접근 · 체력·공격력 30%');
 },
 updateRoomBosses(){
  this.upgradeRoomCampaign();this.updateRoomMiniBosses();const s=this.roomCampaign,b=config.bosses[s.bossCursor];if(!b)return;if(b.type==='swordEmpress'&&this.roomRushEntry()){this.updateRoomBossRush();return;}
  this.bossState.nextAt=Math.max(b.at,s.bossReadyAt||0);
  // Every scheduled group waits for the previous group; finale cannot start before 20:00.
  if((this.units.some(u=>u.boss&&!u.miniBoss&&!u.roadCaptain&&u.hp>0)||this.time<(s.bossReadyAt||0)))return;
  if(!this.bossState.warned&&this.time>=b.at-8){this.bossState.warned=true;this.notify('toast',b.name+' 접근 · 처치 시 추가 강화');}
  if(this.time<b.at)return;this.withdrawRoomMiniBosses();const p=b.type==='swordEmpress'?{x:config.finalBoss.x,y:this.bases[1].y+config.finalBoss.offset}:this.northernSpawn(this.serial+1,55);if(!p)return;
  const u=this.addUnit(2,b.type,p.x,p.y,true);Object.assign(u,{boss:true,bossName:b.name,bossPattern:b.pattern,bossScheduleIndex:s.bossCursor,assault:true,finalBoss:s.bossCursor===config.bosses.length-1,bossNumber:++this.bossState.spawned});u.hp=u.maxHp=this.stats(u).hp;u.homeX=u.x;u.homeY=u.y;
  if(u.finalBoss){this.finalBattle.spawned=true;this.upgradeRoomFinalBossPosition();}s.bossCursor++;this.bossState.warned=false;this.bossState.nextAt=this.roomNextBossAt();this.notify('toast',u.bossName+' 출현 · 처치 시 추가 강화');
 },
 roomBossKilled(u){if(!this.isRoomCampaign()||!u.boss||u.miniBoss||u.roadCaptain)return;if(u.bossRushPair&&this.units.some(v=>v!==u&&v.hp>0&&v.bossRushPair===u.bossRushPair))return;const s=this.roomCampaign;s.recoveryUntil=this.time+config.recoverySeconds;s.bossReadyAt=s.recoveryUntil;this.bossState.nextAt=Math.max(this.roomNextBossAt(),s.bossReadyAt);},
 updateRoomMission(dt){this.upgradeRoomCampaign();this.bases[1].name='최전방 포탈';if(this.time>=900&&this.roomPortalAlive()&&!this.roomCampaign.portalWarned){this.roomCampaign.portalWarned=true;this.notify('toast','최전방 포탈 폭주 · 후반 증원 대폭 증가! 포탈을 파괴하세요.');}for(const p of [...this.structures,this.bases[1]])this.fireDefense(p,dt);},
 roomObjective(){const b=this.bases[1],boss=this.units.find(u=>u.finalBoss&&u.hp>0);return{title:'거실 생존 / 최종 보스 처치',progress:`${this.time<1200?'20분 이후 최종 보스 · '+Math.ceil(1200-this.time)+'초':this.roomRushEntry()?'보스 연전 완료 후 최종 보스':'최종 보스 처치'} · 최전방 포탈 ${b.hp>0?'가동 중'+(this.time>=900?' · 증원 폭주':' · 15분부터 폭주'):'폐쇄 · 증원 감소'}`,target:boss||(b.hp>0?b:this.commander(0)),targetName:boss?boss.bossName:b.hp>0?'최전방 포탈':'20분 최종 보스 대비'};},
 bossPatternRules(u){const p=u.boss&&u.bossPattern?config.patterns[u.bossPattern]:null;if(!p||!u.miniBoss)return p;return{...p,...(p.infantryHpDamage===undefined?{}:{infantryHpDamage:p.infantryHpDamage*config.miniBoss.damage}),...(p.maxHpDamage===undefined?{}:{maxHpDamage:p.maxHpDamage*config.miniBoss.damage})};},
 bossFlightHeight(u){const p=this.bossPatternRules(u),a=u.bossAction;if(u.bossPattern!=='venomDive'||!p)return null;if(!a)return 48;if(a.phase==='rise')return 48+(p.height-48)*clamp((this.time-a.started)/p.rise,0,1);if(a.phase==='high')return p.height;if(a.phase==='dive')return p.height+(p.lowHeight-p.height)*clamp((this.time-a.started)/p.descent,0,1);return p.lowHeight;},
 bossInvulnerable(u){return u.hp>0&&u.bossPattern==='venomDive'&&u.bossAction?.phase==='high';},
 updateBossPattern(u,dt){
  if(u.team!==0&&u.type==='crimsonAce'&&!u.boss){this.updateBossBarrage(u,{...config.patterns.rearBarrage,shots:1});return false;}
  const p=this.bossPatternRules(u);if(!p)return false;
  if(u.bossPattern==='rhinoCharge'){
   if(this.time<(u.groggyUntil||0))return true;
   const had=!!u.bikeAttack;this.updateBike(u,dt,p);if(had&&!u.bikeAttack){u.groggyUntil=this.time+p.recovery;u.bikeRecoverUntil=u.groggyUntil;this.effects.push({kind:'bossGroggy',bonus:Math.round((p.vulnerable-1)*100),target:u,x:u.x,y:u.y,t:p.recovery,max:p.recovery,team:u.team});}return true;
  }
  if(u.bossPattern==='wideSlash')return this.updateBossSlash(u,p);
  if(u.bossPattern==='venomDive')return this.updateVenomDive(u,p);
  if(u.bossPattern==='rearBarrage')this.updateBossBarrage(u,p);
  return false;
 },
 updateBossSlash(u,p){
  const a=u.bossAction;if(a){if(this.time<a.hitAt)return true;u.bossAction=null;u.bayonetAttack=null;u.bayonetThrustUntil=this.time+.2;u.bayonetRecoverUntil=this.time+.4;
   for(const t of [...this.alive(0),...this.buildings.filter(b=>b.hp>0)]){const angle=Math.atan2(t.y-u.y,t.x-u.x),delta=Math.abs(Math.atan2(Math.sin(angle-a.angle),Math.cos(angle-a.angle)));if(this.canTarget(u,t)&&this.targetDistance(u,t)<=p.range&&delta<=p.arc/2&&this.lineClear(u,t,0,{fireTeam:u.team}))this.damage(t,this.attackRoll(u).damage,u);}
   this.effects.push({kind:'bladeSlash',x:u.x,y:u.y,angle:a.angle,range:p.range,t:.3,max:.3,team:u.team});this.notify('fire',u);return true;
  }
  if(this.time<(u.bayonetRecoverUntil||0))return true;
  const target=this.alive(0).filter(t=>this.canTarget(u,t)&&this.targetDistance(u,t)<=p.range&&this.lineClear(u,t,0,{fireTeam:u.team})).sort((a,b)=>d(u,a)-d(u,b))[0];
  if(!target||u.cooldown>0)return false;u.face=u.aimFace=Math.atan2(target.y-u.y,target.x-u.x);u.cooldown=this.stats(u).rate;u.bossAction={angle:u.face,hitAt:this.time+p.windup};u.bayonetAttack={angle:u.face,target,startedAt:this.time,hitAt:u.bossAction.hitAt};this.effects.push({kind:'bossSlashWarn',source:u,x:u.x,y:u.y,angle:u.face,range:p.range,arc:p.arc,t:p.windup,max:p.windup,team:u.team});return true;
 },
 updateVenomDive(u,p){
  let a=u.bossAction;
  if(!a){if(this.time<(u.nextBossSkillAt||0))return false;const t=this.alive(0).filter(t=>this.canTarget(u,t)&&d(u,t)<=420).sort((a,b)=>d(u,a)-d(u,b))[0];if(!t)return false;a=u.bossAction={phase:'rise',started:this.time,until:this.time+p.rise,target:t,x:t.x,y:t.y,fromX:u.x,fromY:u.y};u.flightStrikeUntil=this.time+p.rise+p.warning+p.descent;return true;}
  if(a.phase==='rise'&&this.time>=a.until){a.phase='high';a.started=this.time;a.until=this.time+p.warning;this.effects.push({kind:'bossDiveWarn',source:u,x:a.x,y:a.y,radius:38,t:p.warning,max:p.warning,team:u.team});}
  else if(a.phase==='high'&&this.time>=a.until){a.phase='dive';a.started=this.time;a.until=this.time+p.descent;u.flightStrikeUntil=this.time+p.descent+.2;}
  else if(a.phase==='dive'){
   const q=clamp((this.time-a.started)/p.descent,0,1);u.x=a.fromX+(a.x-a.fromX)*q;u.y=a.fromY+(a.y-a.fromY)*q;
   if(this.time>=a.until){const t=a.target;if(t?.hp>0&&this.canTarget(u,t)&&d(t,a)<=38+(t.r||12)){const damage=this.stats(u).damage,impact=p.maxHpDamage===undefined?damage*p.damage:t.maxHp*p.maxHpDamage/this.defenseFactor(t,u);this.damage(t,impact,u);if(t.hp>0)this.applyPoison(t,u,damage*p.poisonPerSecond,p);}
    this.effects.push({kind:'sting',x:u.x,y:u.y,tx:a.x,ty:a.y,flightHeight:24,t:.25,max:.25,team:u.team});a.phase='low';a.started=this.time;a.until=this.time+p.recovery;u.cooldown=p.recovery;
   }
  }else if(a.phase==='low'&&this.time>=a.until){u.bossAction=null;u.visualFlightHeight=48;u.nextBossSkillAt=this.time+p.cooldown;}
  u.visualFlightHeight=this.bossFlightHeight(u);return true;
 },
 applyPoison(target,source,dps,p=config.patterns.venomDive){if(this.commanderReviveProtected(target))return;target.poisonUntil=Math.max(target.poisonUntil||0,this.time+p.poisonDuration);target.poisonDps=Math.max(target.poisonDps||0,dps);target.poisonSource=source;target.poisonNextAt=Math.max(this.time+p.poisonRate,target.poisonNextAt||0);},
 updatePoisons(){for(const u of [...this.alive(0),...this.buildings.filter(b=>b.kind==='repairBot'&&b.hp>0)]){const end=u.poisonUntil||0;if(!end)continue;if(u.hp<=0||this.time>end+1e-8){u.poisonUntil=0;u.poisonDps=0;u.poisonSource=null;continue;}if(this.time+1e-8>=(u.poisonNextAt||0)){u.poisonNextAt=this.time+.25;this.damage(u,u.poisonDps*.25,u.poisonSource||{team:2,type:'hornet'});}}},
 updateBossBarrage(u,p){
  const a=u.bossBarrage;
  if(a){if(this.time<a.hitAt)return;u.bossBarrage=null;if(u.hp<=0)return;
   for(const target of a.targets||[a])this.mortarShells.push({kind:'bossShell',damageType:'tank',x:target.x,y:target.y,fromX:u.x,fromY:u.y,radius:p.radius,landAt:this.time+.25,delay:.25,source:u,team:u.team,damage:this.stats(u).damage*p.damage*(u.boss?(p.bossDamageMultiplier??1):1),critical:false});u.recoil=.3;this.notify('fire',u);return;
  }
  if(this.time<(u.nextBossSkillAt||0))return;
  const candidates=this.alive(0).filter(t=>this.canTarget(u,t)&&d(u,t)<=p.range);if(!candidates.length)return;
  candidates.sort((a,b)=>Number(['medic','sniper','mortar'].includes(b.type))-Number(['medic','sniper','mortar'].includes(a.type))||d(u,b)-d(u,a));const t=candidates[0],targets=[{x:t.x,y:t.y}],spacing=p.spacing||p.radius*2+20,count=p.shots||1;
  const add=point=>{if(targets.length<count&&targets.every(v=>d(v,point)>=spacing-1e-6))targets.push({x:point.x,y:point.y});};
  for(const candidate of candidates.slice(1))add(candidate);
  // If rear troops are bunched together, spread the remaining shells across their rear line.
  const angle=Math.atan2(t.y-u.y,t.x-u.x)+Math.PI/2,margin=p.radius+45;
  for(const radius of [spacing,spacing*2])for(const offset of [0,Math.PI,Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4,3*Math.PI/4,-3*Math.PI/4]){
   if(targets.length>=count)break;add({x:clamp(t.x+Math.cos(angle+offset)*radius,margin,this.bounds().width-margin),y:clamp(t.y+Math.sin(angle+offset)*radius,margin,this.bounds().height-margin)});
  }
  u.nextBossSkillAt=this.time+p.cooldown;u.bossBarrage={x:t.x,y:t.y,targets,hitAt:this.time+p.warning};
  for(const point of targets)this.effects.push({kind:'bossBarrageWarn',source:u,x:point.x,y:point.y,radius:p.radius,t:p.warning+.25,max:p.warning+.25,team:u.team});
 },
 updateEnemyLucky(u){
  if(u.hp<=0||u.team===0)return;u.nextLuckyAt??=this.time+config.enemyLuckyInterval;
  const roll=u.luckyRoll;
  if(roll&&!roll.resolved&&this.time>=roll.endsAt){roll.resolved=true;roll.resultAt=this.time;this.castEnemyLucky(u,roll.kind);}
  if(this.time>=u.nextLuckyAt){u.nextLuckyAt=this.time+config.enemyLuckyInterval;u.luckyRoll={kind:this.luckyOutcome(this.random(),root.FrontLucky.normal),startedAt:this.time,endsAt:this.time+.6,resolved:false};this.notify('fire',{...u,luckySound:'slotSpin'});}
  // Seven missiles share one per-victim budget. A volley is capped at half max HP; wounded soldiers can still die.
  this.enemyLuckySalvos??=[];
  for(const v of this.enemyLuckySalvos){if(v.source!==u||v.remaining<=0||this.time<v.nextAt)continue;const target=this.luckyMissileTarget(u,v,600);if(!target)continue;
   this.mortarShells.push({kind:'missile',damageType:'rocket',x:target.x,y:target.y,fromX:u.x,fromY:u.y,radius:90,landAt:this.time+1,delay:1,source:u,team:u.team,damage:root.FrontLucky.missileDamage,luckyRulesVersion:130,enemyJackpot:v,critical:false});this.recordLuckyMissile(v,target.target);v.remaining--;v.nextAt=this.time+.12;
  }
  this.enemyLuckySalvos=this.enemyLuckySalvos.filter(v=>v.source.hp>0&&(v.remaining>0||this.mortarShells.some(p=>p.enemyJackpot===v)));
 },
 castEnemyLucky(u,kind){
  const target=this.alive(0).filter(t=>this.canTarget(u,t)&&d(u,t)<480).sort((a,b)=>d(u,a)-d(u,b))[0];
  if(kind==='missiles'){this.enemyLuckySalvos??=[];this.enemyLuckySalvos.push({source:u,remaining:7,nextAt:this.time,spent:{}});this.effects.push({kind:'luckyJackpot',x:u.x,y:u.y,t:1,max:1,team:u.team});return;}
  if(kind==='glue'){const t=target||{x:u.x+Math.cos(u.face)*120,y:u.y+Math.sin(u.face)*120};this.luckyGlues.push({x:t.x,y:t.y,fromX:u.x,fromY:u.y,source:u,team:u.team,radius:100,landAt:this.time+.55,expires:this.time+10.55,rulesVersion:78,hitIds:[]});this.effects.push({kind:'luckyGlueThrow',x:u.x,y:u.y,tx:t.x,ty:t.y,t:.55,max:.55,team:u.team});return;}
  if(kind==='mine'){const p={x:u.x+Math.cos(u.moveFace??u.face)*28,y:u.y+Math.sin(u.moveFace??u.face)*28};this.luckyMines.push({...p,ownerId:u.id,source:u,team:u.team,damage:100,armAt:this.time+.35,placedAt:this.time,expires:this.time+60,rulesVersion:85});return;}
  // Existing spray is insect-only; human/vehicle allies are not insects.
  if(kind==='spray'){this.luckySprays.push({x:u.x,y:u.y,angle:u.face,target:null,emitting:true,source:u,team:u.team,damage:0,nextAt:this.time,nextAimAt:this.time,startedAt:this.time,expires:this.time+6,rulesVersion:99});}
 },
 damageEnemyJackpot(target,raw,shell){
  if(target.hp<=0||target.team!==0)return;
  const v=shell.enemyJackpot,spent=v.spent[target.id]||0,budget=Math.max(0,target.maxHp*.5-spent),damage=Math.max(0,Math.min(raw*this.defenseFactor(target),budget));if(!damage)return;
  const before=target.hp;this.damage(target,damage/this.defenseFactor(target),shell.source);v.spent[target.id]=spent+Math.max(0,before-target.hp);
 },
 bossHazards(){const result=[];for(const u of this.units){if(u.hp<=0)continue;if(u.bombFuse)result.push({x:u.x,y:u.y,radius:125,landAt:u.bombFuse.explodeAt});if(!u.boss&&!u.bossBarrage)continue;if(u.bossBarrage)for(const point of u.bossBarrage.targets||[u.bossBarrage])result.push({x:point.x,y:point.y,radius:config.patterns.rearBarrage.radius,landAt:u.bossBarrage.hitAt+.25});const a=u.bossAction;if(u.bossPattern==='venomDive'&&a&&a.phase!=='low')result.push({x:a.x,y:a.y,radius:55,landAt:a.until});if(u.bossPattern==='wideSlash'&&a)result.push({x:u.x+Math.cos(a.angle)*70,y:u.y+Math.sin(a.angle)*70,radius:85,landAt:a.hitAt});}return result;}
};
root.FrontRoomCampaign={config,methods};if(typeof module!=='undefined')module.exports={config,methods};
})(typeof window!=='undefined'?window:globalThis);
