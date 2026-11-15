'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),{Lab}=require('./public/combat-lab.js'),{FrontGame}=require('./public/engine.js'),{pose}=require('./public/hit-feedback.js'),{pack,unpack}=require('./public/autoplay.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
test('all shark tiers damage and launch on emergence, and rapidly reach the crest without extending control',()=>{
 for(const tier of [0,1,2]){const g=new Lab({mode:'support',toy:'toyDecoyMaker',tier,highHealth:true,count:1});a.equal(g.cast(),true);const b=g.supportBursts[0],t=g.labTargets[0];Object.assign(t,{x:b.x+30,y:b.y});g.time=.35;g.updateSupportBursts();near(b.impactAt-b.breachAt,.18);
  g.time=b.impactAt-.001;g.updateSupportBursts();a.equal(t.hp,t.maxHp);a.equal(t.toyKnockback,undefined);
  g.time=b.impactAt;g.updateSupportBursts();a.ok(t.hp<t.maxHp);const k=t.toyKnockback;near(k.startedAt,b.impactAt);near(k.until-k.startedAt,tier===2?.55:.42);near(k.popPeak,.22);
  a.ok(pose(t,k.startedAt+.025).y<-k.popHeight*.3);near(pose(t,k.startedAt+(k.until-k.startedAt)*.22).y,-k.popHeight);a.ok(Math.abs(pose(t,k.until-1e-8).y)<.0001);
  const visual=g.effects.find(e=>e.kind==='toyShark');near(visual.impactAt,b.impactAt);near(visual.startedAt,b.breachAt);
  const hp=t.hp;g.updateSupportBursts();a.equal(t.hp,hp);
 }
});
test('saved airborne targets retain the same fast-rise clock and cannot be damaged twice',()=>{
 const g=new Lab({mode:'support',toy:'toyDecoyMaker',tier:2,highHealth:true,count:1});g.cast();const b=g.supportBursts[0],t=g.labTargets[0];Object.assign(t,{x:b.x+30,y:b.y});g.time=.35;g.updateSupportBursts();g.time=b.impactAt;g.updateSupportBursts();g.time+=.025;
 const expected=pose(t,g.time),copy=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g)))),victim=copy.units.find(v=>v.id===t.id),hp=victim.hp;copy.visible=copy.lineClear=()=>true;a.deepEqual(pose(victim,copy.time),expected);copy.updateSupportBursts();a.equal(victim.hp,hp);near(victim.toyKnockback.popPeak,.22);
});
test('legacy generic pop arcs and ordinary water knockback keep their existing motion',()=>{
 const old={hp:100,toyKnockback:{startedAt:0,until:1,dx:10,dy:0,popHeight:28}};near(pose(old,.25).y,-28*Math.sin(Math.PI*.25));near(pose(old,.5).y,-28);
 const water={hp:100,toyKnockback:{surf:true,startedAt:0,until:1,dx:10,dy:0}};near(pose(water,.5).y,-10);
});
test('the airborne draw pass starts at the hit and ends at landing, excluding waves and dead enemies',()=>{
 const {airborne}=require('./public/hit-feedback.js'),u={hp:100,toyKnockback:{popHeight:44,startedAt:1,until:1.55}};a.equal(airborne(u,.99),false);a.equal(airborne(u,1),true);a.equal(airborne(u,1.54),true);a.equal(airborne(u,1.55),false);u.toyKnockback.surf=true;a.equal(airborne(u,1.1),false);u.toyKnockback.surf=false;u.hp=0;a.equal(airborne(u,1.1),false);
});
