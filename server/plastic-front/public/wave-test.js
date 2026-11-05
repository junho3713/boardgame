/* A disposable fork of the existing living-room simulation. No alternate combat or wave rules. */
(function(root){'use strict';
const node=typeof module!=='undefined'&&module.exports,engine=node?require('./engine.js'):root,state=node?require('./autoplay.js'):root.FrontGameState,room=node?require('./room-campaign.js').config:root.FrontRoomCampaign.config;
function memoryStorage(){const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
function fork(game,events={}){if(!game.isRoomCampaign()||game.mode!=='pve')throw Error('거실 작전에서 사용할 수 있습니다.');const copy=state.unpack(new engine.FrontGame(),state.pack(game));copy.events=events;copy.waveTest=true;return copy;}
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
 Object.assign(s,{bossCursor:index<0?room.bosses.length:index,rushCursor:rush<0?room.bossRush.pairs.length:rush,bossReadyAt:target,recoveryUntil:0,nextSpawnAt:target+.2,phaseAt:game.roomPhase().at,surgeWindow:null,tankScheduleVersion:170,tanksDone:room.tanks.map(at=>at<target),tankSpawned:room.tanks.filter(at=>at<target).length,nextTankAttemptAt:target});
 game.finalBattle={spawned:false,killed:false};game.bossState.warned=false;game.bossState.nextAt=game.roomNextBossAt();
 // The 7:30 warning / 8:00 artillery event is testable, but is not replayed after its crisis window.
 Object.assign(game.crisis,{phase:target<510?'idle':'cleared',warnAt:450,startAt:Math.max(480,target),nextSalvo:target,nextEscort:target,battery:[]});
 const tier=game.pressure().tier;game.lastPressure=tier;game.lastEnemyGrowth=tier;
 for(const u of game.units){if(u.team===0||u.hp<=0)continue;const ratio=u.hp/Math.max(1,u.maxHp);u.threat=tier;u.maxHp=game.stats(u).hp;u.hp=u.maxHp*ratio;}
 return{time:target,phase:game.roomPhase().name,nextBoss:game.bossState.nextAt,tier};
}
const api={fork,seek,describe,shiftTimers,memoryStorage};root.FrontWaveTest=api;if(node)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
