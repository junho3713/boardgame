/* A disposable fork of the existing living-room simulation. No alternate combat or wave rules. */
(function(root){'use strict';
const node=typeof module!=='undefined'&&module.exports,engine=node?require('./engine.js'):root,state=node?require('./autoplay.js'):root.FrontGameState,room=node?require('./room-campaign.js').config:root.FrontRoomCampaign.config;
function memoryStorage(){const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
const roster=node?engine.ROSTER:root.FrontRoster,abilities=node?engine.ABILITIES:root.FrontAbilities;
function slots(game,count){return !game.starExperiment?count:game.starMax===3&&count===9?1:Math.floor(count/3)+count%3;}
function capacity(game,levels){return 20+game.profile.upgrades.capacity+(game.starExperiment?[1,1,2,2,3].slice(0,levels.capacity).reduce((a,b)=>a+b,0):levels.capacity*2);}
function current(game){return{level:game.level,cash:Math.floor(game.cash[0]),tech:{...game.tech[0]},abilities:{...game.abilities},counts:Object.fromEntries(roster.map(t=>[t,game.alive(0).filter(u=>u.type===t).reduce((n,u)=>n+(game.starExperiment?3**((u.star||1)-1):1),0)]))};}
function recommended(game,seconds){
 if(!Number.isFinite(seconds)||seconds<0||seconds>1200)throw Error('0:00부터 20:00 사이를 선택하세요.');
 const minutes=seconds/60,level=1+Math.floor(minutes*2),pastBosses=room.bosses.filter(b=>b.at<seconds).length+room.bossRush.pairs.filter(b=>b.at<seconds).length*2;
 const tech=Object.fromEntries(roster.map(t=>[t,t==='rifle'?1:0])),growth=Object.fromEntries(Object.keys(abilities).map(k=>[k,0]));let budget=level-1+pastBosses;
 const unlocks={rocket:1,medic:2,lucky:3,machinegun:4,tank:5,sniper:6,mortar:7,guntruck:9};
 for(const [type,at]of Object.entries(unlocks))if(minutes>=at&&budget>0){tech[type]=1;budget--;}
 const focus=['rifle','lucky','tank','medic','mortar'],keys=['damage','health','speed','defense','capacity'];
 for(let rank=1;rank<=5;rank++){
  for(const key of keys)if(budget>0){growth[key]++;budget--;}
  for(const type of focus)if(tech[type]>0&&tech[type]<rank&&budget>0){tech[type]++;budget--;}
 }
 for(const type of roster)while(budget>0&&tech[type]>0&&tech[type]<5){tech[type]++;budget--;}
 const counts=Object.fromEntries(roster.map(t=>[t,0])),limit=game.starExperiment?9:8,max=capacity(game,growth),weights=['rifle','medic','rocket','lucky','rifle','tank','machinegun','mortar','sniper','guntruck'];
 // Recruits use the same 3-to-1 fusion as the real operation. Limit the final
 // standing army, rather than comparing raw recruit copies to capacity.
 const desired=game.starExperiment?Math.min(roster.length*9,2+Math.floor(minutes*4)):Math.min(max,2+Math.floor(minutes*1.5));
 for(let i=0,added=0;i<1000&&added<desired;i++){const type=weights[i%weights.length];if(!tech[type]||counts[type]>=limit)continue;counts[type]++;if(roster.reduce((n,t)=>n+slots(game,counts[t]),0)>max){counts[type]--;continue;}added++;}
 return{level,cash:Math.round(minutes*25+135),tech,abilities:growth,counts};
}
function validateLoadout(game,loadout){
 const whole=(n,min,max,label)=>{if(!Number.isInteger(n)||n<min||n>max)throw Error(label+' 값을 확인하세요.');return n;};
 const result={level:whole(loadout?.level,1,100,'대장 레벨'),cash:whole(loadout?.cash,0,100000,'자원'),tech:{},abilities:{},counts:{}};
 for(const type of roster){result.tech[type]=whole(loadout?.tech?.[type],0,5,'병과 강화');result.counts[type]=whole(loadout?.counts?.[type],0,game.starExperiment?9:8,'투입 수');if(result.counts[type]&&!result.tech[type])throw Error('투입할 병과는 Lv.1 이상으로 해금하세요.');}
 for(const key of Object.keys(abilities))result.abilities[key]=whole(loadout?.abilities?.[key],0,5,'작전 능력');
 if(Object.values(result.abilities).filter(Boolean).length>5)throw Error('작전 능력은 최대 5종까지 선택하세요.');
 const count=roster.reduce((n,t)=>n+slots(game,result.counts[t]),0),cap=capacity(game,result.abilities);
 if(count>cap)throw Error(`합성 후 병력 ${count}기가 편성 한도 ${cap}기를 넘습니다.`);
 return{...result,size:count,capacity:cap};
}
function applyLoadout(game,loadout){
 if(!game.waveTest||game.coop)throw Error('개인 웨이브 테스트에서 편성을 조절하세요.');
 const config=validateLoadout(game,loadout),events=game.events;game.events={};
 try{
  game.tech[0]={...config.tech};game.abilities={...config.abilities};game.evolved=Object.fromEntries(roster.map(t=>[t,false]));game.level=config.level;game.xp=0;game.cash[0]=config.cash;
  game.units=game.units.filter(u=>u.team!==0||u.type==='leader');const leader=game.commander(0);leader.hp=leader.maxHp=game.stats(leader).hp;leader.deadUntil=0;leader.diedAt=undefined;
  for(const key of ['poisonUntil','rootedUntil','slowUntil','windUntil','luckyRootUntil','luckySlowUntil','healingReductionUntil','hurtUntil'])leader[key]=0;leader.poisonSource=null;leader.poisonDps=0;
  for(const type of roster)for(let i=0;i<config.counts[type];i++)game.addUnit(0,type,leader.x,leader.y);
  game.autoFuseUnits();game.checkEvolutions();game.refreshSquadHealth();game.refreshBuildingStats();
  for(const u of game.alive(0)){u.hp=u.maxHp=game.stats(u).hp;if(u.type!=='leader'){Object.assign(u,game.formationPoint(u,leader));game.resolvePosition(u);}}
  game.ultimate.readyAt=game.time;game.waveTestLoadout=current(game);
 }finally{game.events=events;}
 return config;
}
function fork(game,events={}){if(game.coop||!game.isRoomCampaign()||game.mode!=='pve')throw Error('개인 거실 작전에서 사용할 수 있습니다.');const copy=state.unpack(new engine.FrontGame(),state.pack(game));copy.events=events;copy.waveTest=true;return copy;}
function shiftTimers(value,delta,seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
 for(const [key,v]of Object.entries(value)){if(typeof v==='number'&&Number.isFinite(v)&&(/(?:At|Until)$/.test(key)||['started','until','since'].includes(key)))value[key]=v+delta;else if(v&&typeof v==='object')shiftTimers(v,delta,seen);}
}
function describe(seconds){
 if(!Number.isFinite(seconds)||seconds<0||seconds>1200)return '';
 const phase=room.phases.filter(p=>p.at<=seconds).at(-1),boss=room.bosses.find(b=>b.at===seconds),pair=room.bossRush.pairs.find(b=>b.at===seconds);
 const names=pair?pair.types.map(t=>(room.bosses.find(b=>b.type===t)||room.bossRush.extraBosses[t]).name).join(' + '):boss?.name;
 return phase.name+(names?' · '+names+' 등장':' · 해당 시간대 혼합 공세')+(room.tanks.includes(seconds)?' · 일반 전차 증원':'');
}
function seek(game,seconds,{heal=false}={}){
 if(!game.waveTest||!game.isRoomCampaign()||game.mode!=='pve')throw Error('웨이브 테스트를 먼저 시작하세요.');
 if(!Number.isFinite(seconds)||seconds<0||seconds>1200)throw Error('0분부터 20분 사이를 선택하세요.');
 const target=Math.round(seconds),delta=target-game.time,seen=new Set();
 // Keep local defenders and scenery. Scheduled bosses and roaming waves are discarded, without kills/rewards.
 game.units=game.units.filter(u=>u.team===0||!u.boss&&(u.fixedGuard||u.roomGarrison||u.roadCaptain));
 for(const u of [...game.units,...game.buildings,...game.bases,...game.structures,...game.defenses]){shiftTimers(u,delta,seen);u.target=null;u.aiEvade=null;u.bikeAttack=null;u.bossAction=null;u.bossBarrage=null;u.bayonetAttack=null;u.sniperAim=null;u.blizzardCast=null;u.ultimatePose=null;if(heal&&u.team===0&&u.hp>0)u.hp=u.maxHp;}
 shiftTimers(game.ultimate,delta,seen);game.ultimate.activeUntil=target;game.ultimate.nextShotAt=target;game.nextRecoveryAt+=delta;game.mission.stageStarted+=delta;
 game.time=target;game.waveTestTarget=target;game.result=null;game.phase='paused';game.focusTarget=null;game.focusAutomatic=false;game.formationEnemy=null;game.aiHQTarget=null;game.bossIntro=null;game.guardianSiege=null;game.navigationCache=new Map();
 for(const key of ['shots','effects','pickups','barrages','mortarShells','butterflyGusts','luckyMines','luckyGlues','luckyGlueHistory','luckySprays','luckySalvos','enemyLuckySalvos'])game[key]=[];
 game.trialBoss=null;game.currentOptions=[];game.pendingChoice=null;game.turnChoice=null;game.choiceKind='level';game.bossState.claimed=Math.max(0,game.bossState.claimed||0);game.bossState.rewards=game.bossState.claimed;
 const s=game.roomCampaign,index=room.bosses.findIndex(b=>b.at>=target),rush=room.bossRush.pairs.findIndex(b=>b.at>=target);
 Object.assign(s,{bossCursor:index<0?room.bosses.length:index,rushCursor:rush<0?room.bossRush.pairs.length:rush,bossReadyAt:target,recoveryUntil:0,waveSpawnDebt:0,nextMageEscortAt:target,nextSpawnAt:target+.2,phaseAt:game.roomPhase().at,surgeWindow:null,tankScheduleVersion:170,tanksDone:room.tanks.map(at=>at<target),tankSpawned:room.tanks.filter(at=>at<target).length,nextTankAttemptAt:target});
 game.finalBattle={spawned:false,killed:false};game.bossState.warned=false;game.bossState.nextAt=game.roomNextBossAt();
 // The 7:30 warning / 8:00 artillery event is testable, but is not replayed after its crisis window.
 Object.assign(game.crisis,{phase:target<510?'idle':'cleared',warnAt:450,startAt:Math.max(480,target),nextSalvo:target,nextEscort:target,battery:[]});
 const tier=game.pressure().tier;game.lastPressure=tier;game.lastEnemyGrowth=tier;
 for(const u of game.units){if(u.team===0||u.hp<=0)continue;const ratio=u.hp/Math.max(1,u.maxHp);u.threat=tier;u.maxHp=game.stats(u).hp;u.hp=u.maxHp*ratio;}
 return{time:target,phase:game.roomPhase().name,nextBoss:game.bossState.nextAt,tier};
}
const api={fork,seek,describe,shiftTimers,memoryStorage,current,recommended,validateLoadout,applyLoadout,slots};root.FrontWaveTest=api;if(node)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
