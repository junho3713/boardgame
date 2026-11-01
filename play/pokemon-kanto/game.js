(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.KantoDuel=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CONFIG={maxTurns:30,maxEnergy:4},starters=[6,9,3];
const types={fire:{name:'불꽃',color:'#bd543b'},water:{name:'물',color:'#397b99'},grass:{name:'풀',color:'#4c8055'}};
const data={
 6:{name:'리자몽',type:'fire',moves:[{name:'불꽃 견제',cost:1,power:18,kind:'pursuit'},{name:'화염방사',cost:3,power:36,kind:'burst'},{name:'화염 페인트',cost:2,power:10,kind:'pierce'}]},
 9:{name:'거북왕',type:'water',moves:[{name:'물대포',cost:1,power:16,kind:'pursuit'},{name:'하이드로펌프',cost:3,power:34,kind:'burst'},{name:'물결 페인트',cost:2,power:10,kind:'pierce'}]},
 3:{name:'이상해꽃',type:'grass',moves:[{name:'덩굴채찍',cost:1,power:17,kind:'pursuit'},{name:'솔라빔',cost:3,power:35,kind:'burst'},{name:'씨앗 페인트',cost:2,power:10,kind:'pierce'}]}
};
const clone=x=>JSON.parse(JSON.stringify(x)),active=(g,i)=>g.players[i].team[g.players[i].active];
function newGame(leads=[6,9],seed=1,names=['나','연습 AI']){
 return{schema:3,phase:'choose',turn:1,rng:seed>>>0||1,players:names.map((name,i)=>({name,active:Math.max(0,starters.indexOf(leads[i])),team:starters.map(species=>({species,hp:100,energy:3,guard:0,exposed:0}))})),pending:[null,null],ready:[false,false],replacements:[null,null],last:null,history:[],result:null};
}
function advantage(a,b){return{fire:'grass',grass:'water',water:'fire'}[a]===b?8:({fire:'grass',grass:'water',water:'fire'}[b]===a?-6:0);}
function guardRate(u){return[.75,.4,0][Math.min(2,u.guard)];}
function legal(g,i){
 if(g.phase!=='choose'||g.pending[i])return[];
 const p=g.players[i],u=active(g,i),out=data[u.species].moves.flatMap((m,move)=>u.energy>=m.cost?[{kind:'move',move}]:[]);
 out.push({kind:'guard'},{kind:'focus'});
 p.team.forEach((v,to)=>{if(to!==p.active&&v.hp>0&&v.energy>=1)out.push({kind:'switch',to});});return out;
}
function label(g,i,a){if(!a)return'선택 중';if(a.kind==='move')return data[active(g,i).species].moves[a.move].name;if(a.kind==='switch')return data[g.players[i].team[a.to].species].name+'로 교체';return a.kind==='guard'?'방어':'집중';}
function same(a,b){return a.kind===b.kind&&(a.kind!=='move'||a.move===b.move)&&(a.kind!=='switch'||a.to===b.to);}
function finish(g,reason){const alive=g.players.map(p=>p.team.filter(u=>u.hp>0).length),hp=g.players.map(p=>p.team.reduce((n,u)=>n+u.hp,0));let winner=null;if(alive[0]!==alive[1])winner=alive[0]>alive[1]?0:1;else if(hp[0]!==hp[1])winner=hp[0]>hp[1]?0:1;g.phase='finished';g.result={winner,reason,alive,hp};g.pending=[null,null];g.replacements=[null,null];}
function resolve(g){
 const actions=clone(g.pending),before=g.players.map((p,i)=>({species:active(g,i).species,hp:active(g,i).hp,energy:active(g,i).energy}));
 const names=actions.map((a,i)=>label(g,i,a)),notes=[[],[]],heavy=[false,false],rates=[0,0];
 actions.forEach((a,i)=>{
  const p=g.players[i],old=active(g,i);
  if(a.kind==='switch'){p.active=a.to;active(g,i).energy--;old.guard=0;}
  if(a.kind==='move'){const m=data[old.species].moves[a.move];old.energy-=m.cost;heavy[i]=m.kind==='burst';}
  const u=active(g,i);if(a.kind==='guard'){rates[i]=guardRate(u);u.guard++;notes[i].push('방어: 피해 '+Math.round(rates[i]*100)+'% 감소');}else u.guard=0;
 });
 const hits=actions.map((a,i)=>{
  if(a.kind!=='move')return null;
  const u=active(g,i),target=active(g,1-i),m=data[u.species].moves[a.move],opp=actions[1-i];
  let counter=0,read='none';
  if(m.kind==='pursuit'){if(opp.kind==='switch'){counter=18;read='success';notes[i].push('교체 예측 성공! 추격 피해 +18');}else{read='miss';notes[i].push('교체는 없었어요. 기본 피해만 적용');}}
  if(m.kind==='pierce'){if(opp.kind==='guard'){counter=22;read='success';notes[i].push('방어 예측 성공! +22, 방어 감소 무시');}else{read='miss';notes[i].push('방어 예측 빗나감: 낮은 기본 피해만 적용');}}
  const type=advantage(data[u.species].type,data[target.species].type),exposed=target.exposed?8:0,raw=Math.max(1,m.power+counter+type+exposed),blocked=opp.kind==='guard'&&m.kind!=='pierce'?Math.ceil(raw*rates[1-i]):0;
  return{move:m.name,base:m.power,counter,type,exposed,blocked,damage:raw-blocked,target:target.species,read};
 });
 hits.forEach((h,i)=>{if(h)active(g,1-i).hp=Math.max(0,active(g,1-i).hp-h.damage);});
 actions.forEach((a,i)=>{
  const u=active(g,i);if(a.kind==='focus'&&u.hp>0)u.energy=Math.min(4,u.energy+2);
  g.players[i].team.forEach(v=>{v.exposed=Math.max(0,v.exposed-1);if(v.hp>0)v.energy=Math.min(4,v.energy+1);});
  if(heavy[i]){u.exposed=1;notes[i].push('강공격의 빈틈: 다음 턴 이 포켓몬이 받는 피해 +8');}
  if(a.kind==='switch'){notes[i].push('교체로 행동을 사용했어요. 이번 턴에는 공격하지 않아요.');if(hits[1-i]?.type<0)notes[i].push('유리한 상성으로 받아 피해 -6');}
 });
 g.last={turn:g.turn,actions,names,before,hits,notes,after:g.players.map((p,i)=>({species:active(g,i).species,hp:active(g,i).hp,energy:active(g,i).energy}))};
 g.history.push(clone(g.last));g.history=g.history.slice(-12);g.pending=[null,null];g.ready=[false,false];g.phase='reveal';
 if(g.players.some(p=>p.team.every(u=>u.hp===0))||g.turn>=CONFIG.maxTurns)finish(g,g.turn>=CONFIG.maxTurns?'30턴 종료':'팀 전원 기절');
}
function advance(g){
 g.turn++;g.ready=[false,false];g.replacements=[null,null];
 if(g.players.some((p,i)=>active(g,i).hp===0))g.phase='replace';else g.phase='choose';
}
function act(g,i,a){
 if(i!==0&&i!==1)throw Error('플레이어를 확인해 주세요.');
 if(g.phase==='choose'&&a.type==='commit'){
  if(!a.action||!legal(g,i).some(x=>same(x,a.action)))throw Error('이미 확정했거나 사용할 수 없는 행동이에요.');
  g.pending[i]=clone(legal(g,i).find(x=>same(x,a.action)));
  if(g.pending.every(Boolean))resolve(g);
 }else if(g.phase==='reveal'&&a.type==='ready'){
  if(g.ready[i])throw Error('상대의 확인을 기다려 주세요.');g.ready[i]=true;if(g.ready.every(Boolean))advance(g);
 }else if(g.phase==='replace'&&a.type==='replace'){
  const p=g.players[i];if(active(g,i).hp>0||g.replacements[i]!==null||!Number.isInteger(a.to)||a.to===p.active||!(p.team[a.to]?.hp>0))throw Error('교체할 포켓몬을 골라 주세요.');
  g.replacements[i]=a.to;
  if(g.players.every((p,j)=>active(g,j).hp>0||g.replacements[j]!==null)){
   g.players.forEach((p,j)=>{if(g.replacements[j]!==null)p.active=g.replacements[j];});g.replacements=[null,null];g.phase='choose';
  }
 }else throw Error('상태가 바뀌었어요. 현재 화면에서 다시 선택해 주세요.');
 return g;
}
function view(g,i){const v=clone(g);delete v.rng;v.locked=g.pending.map(Boolean);v.replacementLocked=g.replacements.map(x=>x!==null);v.pending[1-i]=null;v.replacements[1-i]=null;return v;}
function random(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
function ai(g,i){
 // Commit before the human: only public state and already revealed history inform this choice.
 const clean=clone(g);clean.pending=[null,null];clean.replacements=[null,null];
 const choices=legal(clean,i);if(!choices.length)return null;
 if(random(g)<.2)return clone(choices[Math.floor(random(g)*choices.length)]);
 const opponent=legal(clean,1-i),recent=clean.history.slice(-6).map(h=>h.actions[1-i]);
 const category=(a,j)=>a.kind==='move'?data[active(clean,j).species].moves[a.move].kind:a.kind;
 const weights=opponent.map(a=>1+recent.filter(b=>{if(b.kind==='move')return a.kind==='move'&&b.move===a.move;return b.kind===a.kind;}).length*2);
 const denom=weights.reduce((x,y)=>x+y,0),score=a=>opponent.reduce((sum,b,k)=>{
  const sim=clone(clean);sim.pending[i]=a;sim.pending[1-i]=b;resolve(sim);
  const loss=j=>clean.players[j].team.reduce((n,u,t)=>n+u.hp-sim.players[j].team[t].hp+(u.hp>0&&sim.players[j].team[t].hp===0?45:0),0);
  const u=active(sim,i),value=loss(1-i)-loss(i)+u.energy*1.6-(u.exposed?3:0);
  return sum+value*weights[k]/denom;
 },0);
 let best=-Infinity,out=choices[0];for(const a of choices){const value=score(a)+random(g)*3;if(value>best){best=value;out=a;}}return clone(out);
}
function replacement(g,i){return g.players[i].team.map((u,to)=>({u,to})).filter(x=>x.u.hp>0).sort((a,b)=>b.u.hp-a.u.hp)[0]?.to;}
function assert(g){
 if(g.schema!==3||!['choose','reveal','replace','finished'].includes(g.phase)||g.players.length!==2||g.turn<1||g.turn>30)throw Error('저장된 게임 형식을 확인해 주세요.');
 g.players.forEach(p=>{if(p.team.length!==3||!Number.isInteger(p.active)||!p.team[p.active])throw Error('잘못된 팀');p.team.forEach(u=>{if(!data[u.species]||!Number.isInteger(u.hp)||u.hp<0||u.hp>100||!Number.isInteger(u.energy)||u.energy<0||u.energy>4)throw Error('잘못된 능력치');});});return true;
}
return{CONFIG,starters,types,data,newGame,active,advantage,guardRate,legal,label,act,view,ai,replacement,assert};
});

