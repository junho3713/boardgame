const {test}=require('node:test'),a=require('node:assert/strict');
const {FrontEffects}=require('./public/effects.js'),{FrontGame,TYPES}=require('./public/engine.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7);
test('wooden balls make two visible hops, finish at the unchanged landing point and freeze on a paused clock',()=>{
 const fx=new FrontEffects({textures:{}}),p={kind:'toyBall',x:200,y:80,fromX:0,fromY:0,delay:.4,landAt:10.4,team:2},before=JSON.stringify(p);
 near(fx.mortarPose(p,10).height,0);a.ok(fx.mortarPose(p,10.11).height>30);near(fx.mortarPose(p,10.22).height,0);a.ok(fx.mortarPose(p,10.31).height>10);
 const end=fx.mortarPose(p,10.4);near(end.x,200);near(end.y,80);near(end.height,0);a.deepEqual(fx.mortarPose(p,10.15),fx.mortarPose(p,10.15));a.equal(JSON.stringify(p),before);
 a.deepEqual(fx.mortarPose({...p,kind:'acid'},10.15),fx.mortarPose(p,10.15));
});
test('new and legacy beetle impacts emit only bounded toy stars and bypass liquid or fire materials',()=>{
 const fx=new FrontEffects({textures:{},budget:40});
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
 fx.drawImpactMaterial=()=>{throw Error('Unexpected generic explosion material');};
 for(const kind of ['toyBall','acid']){const e={kind:'explosion',visualKind:kind,x:10,y:20,radius:34,t:.7,max:.7,team:2};fx.emit(e);a.equal(fx.drawEvent(ctx,e),true);fx.drawMortar(ctx,{kind,x:20,y:20,fromX:0,fromY:0,delay:.4,landAt:1,team:2},.8);}
 a.equal(fx.particles.length,16);a.ok(fx.particles.every(p=>p.kind==='toyStar'));a.equal(fx.scorches.length,0);
 for(let i=0;i<20;i++)fx.emit({kind:'explosion',visualKind:'toyBall',radius:34,x:0,y:0});a.ok(fx.particles.length<=40);
});
test('the same midrange beetle launches from its front and keeps combat numbers, timings and damage type',()=>{
 const g=new FrontGame({},undefined,{map:'livingroom'});g.start();g.obstacles=[];g.units=g.units.filter(u=>u.type==='leader'&&u.team===0);const c=g.commander(0),u=g.addUnit(2,'acidBeetle',c.x-180,c.y,true);u.assault=true;u.cooldown=0;g.lineClear=()=>true;
 const stats=g.stats(u);g.updateAcidBeetle(u,.05);near(u.face,0);g.time+=.3;g.updateAcidBeetle(u,.05);const p=g.mortarShells[0];a.equal(p.kind,'toyBall');a.equal(p.damageType,'acidBeetle');a.ok(p.fromX>u.x);near(p.landAt-g.time,.4);near(p.damage,stats.damage);a.ok(u.toyThrowUntil>g.time);
 a.deepEqual([TYPES.acidBeetle.hp,TYPES.acidBeetle.damage,TYPES.acidBeetle.rate,TYPES.acidBeetle.range,TYPES.acidBeetle.speed],[220,28,2.3,210,66]);
});
