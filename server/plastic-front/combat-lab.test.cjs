'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {Lab,clean,TOYS,COMMANDERS}=require('./public/combat-lab.js'),{FrontGame,EVOLUTIONS}=require('./public/engine.js');
function advance(g,seconds){for(let i=0;i<Math.ceil(seconds/.025);i++)g.update(.025);}
test('777 and boss killer use real production attacks immediately without roulette or growth waits',()=>{
 const seven=new Lab({outcome:'missiles',count:24});a.equal(seven.cast(),true);a.equal(seven.luckySalvos[0].remaining,7);advance(seven,2);a.equal(seven.luckySalvos.length,0);a.ok(seven.result().damage>0);a.ok(seven.result().affected>8);
 const killer=new Lab({outcome:'bossKiller',count:1,evolved:false});a.equal(killer.evolved.lucky,true);a.ok(killer.labTargets[0].boss);a.equal(killer.cast(),true);a.equal(killer.shots[0].guidedFlight.hoverDuration,1);advance(killer,.9);a.equal(killer.result().damage,0);a.equal(killer.shots[0].guidedFlight.hovering,true);advance(killer,1);a.equal(killer.result().hits,1);a.ok(killer.result().damage>0);
});
test('two-star and three-star forced jackpots populate all three real independent reels',()=>{
 for(const stars of [1,2,3])for(const outcome of ['missiles','mine','bossKiller']){const g=new Lab({stars,outcome,count:1});g.cast();a.equal(g.actor.luckyChannels.length,stars===1?1:3);const items=outcome==='missiles'?g.luckySalvos:outcome==='mine'?g.luckyMines:g.shots;a.equal(items.length,stars===1?1:3);a.equal(new Set(items.map(t=>t.rouletteChannel??0)).size,outcome==='bossKiller'?1:stars===1?1:3);}
});
test('forced support tiers retain production target counts and control resistance',()=>{
 for(const toy of TOYS.filter(t=>t!=='toyDrum'))for(const tier of [0,1,2]){const g=new Lab({mode:'support',toy,tier,count:24});a.equal(g.cast(),true);advance(g,2);a.equal(g.result().affected,[3,5,24][tier],toy+' '+tier);const casts=g.result().casts;advance(g,15);a.equal(g.result().casts,casts);}
});
test('the laboratory preserves turtle insect-only push and universal jackpot wave rules',()=>{
 for(const enemy of ['rhinoBeetle','crimsonAce'])for(const tier of [0,2]){const g=new Lab({mode:'support',toy:'toyTurtle',tier,enemy,count:1}),x=g.labTargets[0].x;g.cast();advance(g,2);a.equal(g.labTargets[0].x>x,enemy==='rhinoBeetle'||tier===2);}
});
test('every evolved troop runs its production special attack or healing without further unlocking',()=>{
 for(const troop of Object.keys(EVOLUTIONS)){const g=new Lab({mode:'evolution',troop});a.equal(g.evolved[troop],true);a.equal(g.tech[0][troop],5);a.equal(g.cast(),true);advance(g,12);a.ok(troop==='medic'?g.result().healing>0:g.result().damage>0,troop);}
});
test('all commanders including Hwarin can launch a real ultimate and remain safe',()=>{
 for(const commander of Object.keys(COMMANDERS)){const g=new Lab({mode:'ultimate',commander,level:1}),hp=g.actor.hp;a.ok(g.level>=10);a.equal(g.cast(),true);a.equal(g.ultimateStatus().active,true);advance(g,5);a.ok(g.result().damage>0,commander);a.equal(g.actor.hp,hp);a.equal(g.ultimateStatus().active,false);}
});
test('dummy approach triggers a placed mine and pause freezes projectiles and metrics',()=>{
 const g=new Lab({outcome:'mine',moving:true});g.cast();advance(g,3);a.ok(g.result().damage>0);g.phase='paused';const before=g.result(),positions=g.units.map(t=>[t.x,t.y,t.hp]);advance(g,5);a.deepEqual(g.result(),before);a.deepEqual(g.units.map(t=>[t.x,t.y,t.hp]),positions);
});
test('duplicate and keep use the actual rare supply handler and expose stars/cooldowns',()=>{
 const g=new Lab({mode:'support',toy:'toyStunner'});g.duplicate();a.equal(g.supportToyStars(g.actor),2);a.equal(g.supportToyCooldown(g.actor),9);g.duplicate();a.equal(g.supportToyStars(g.actor),3);g.offer();a.ok(g.supportToyOffer());a.equal(g.resolveSupportToyOffer('keep'),true);a.equal(g.supportToyStars(g.supportToys()[1]),2);a.equal(g.supportToyCooldown(g.actor),8);
});
test('lab operations never mutate a normal profile or start new waves, and normalize hostile inputs',()=>{
 const normal=new FrontGame(),profile=normal.profile.snapshot(),g=new Lab({count:1});a.notEqual(g.profile,normal.profile);const ids=g.units.map(t=>t.id);advance(g,185);a.deepEqual(g.units.map(t=>t.id),ids);a.deepEqual(normal.profile.snapshot(),profile);a.equal(g.profile.gold,0);a.equal(g.phase,'playing');
 const c=clean({mode:'unknown',count:Infinity,stars:100,tier:50,enemy:'constructor'});a.equal(c.mode,'lucky');a.equal(c.count,24);a.equal(c.stars,3);a.equal(c.tier,-1);a.equal(c.enemy,'ant');
});
