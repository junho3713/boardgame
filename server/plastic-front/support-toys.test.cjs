'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {FrontGame}=require('./public/engine.js');require('./public/two-star.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack,FrontAutoPilot}=require('./public/autoplay.js');
const near=(x,y)=>a.ok(Math.abs(x-y)<1e-7,`${x} != ${y}`);
function scene(coop=false){const g=coop?new CoopGame():new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.units=g.units.filter(u=>u.team===0&&u.type==='leader');g.obstacles=[];g.defenses=[];g.structures=[];g.buildings=[];g.pickups=[];g.random=()=>.99;g.visible=g.lineClear=()=>true;for(const c of g.units){c.x=1500;c.y=6000;c.cooldown=1e6;}for(const m of ['updateMission','updateSwarm','updateBosses','updateArtillery','updateDefenses','updateBuildings','gainXP','levelCheck'])g[m]=()=>{};return g;}
function reward(g,type){const c=g.commander(0),p={x:c.x,y:c.y,active:true,rareSupply:true,supplyKind:type,expires:g.time+120};a.equal(g.collectFieldSupply(p),true);return p;}
test('all four support toys have exactly 25 percent fresh-drop odds; no new cash, boosts or attack troops are rolled',()=>{
 const g=scene(),counts={};for(let i=0;i<10000;i++){g.random=()=>(i+.5)/10000;const type=g.rollSupply();counts[type]=(counts[type]||0)+1;}a.deepEqual(counts,{toyDrum:2500,toyDecoyMaker:2500,toyTurtle:2500,toyStunner:2500});const cash=g.cash[0];reward(g,'toyTurtle');a.equal(g.cash[0],cash);a.equal(g.supportToys().length,1);
});
test('two independent slots do not consume recruitment capacity and duplicate drops repair rather than stack',()=>{
 const g=scene(),cap=g.capacity();reward(g,'toyDrum');reward(g,'toyTurtle');const drum=g.supportToys()[0];a.equal(g.capacity(),cap);a.equal(g.alive(0).length,1);drum.hp=1;reward(g,'toyDrum');a.equal(g.supportToys().length,2);near(drum.hp,drum.maxHp);a.equal(g.supportToyOffer(),null);
 reward(g,'toyStunner');a.equal(g.supportToys().length,2);a.equal(g.supportToyOffer().type,'toyStunner');a.equal(g.resolveSupportToyOffer(999999),false);a.equal(g.resolveSupportToyOffer(drum.id),true);a.deepEqual(g.supportToys().map(t=>t.type),['toyStunner','toyTurtle']);reward(g,'toyDecoyMaker');a.equal(g.resolveSupportToyOffer('keep'),true);a.equal(g.supportToyOffer(),null);
});
test('an unresolved replacement preserves later crates and the original offer until the player decides',()=>{
 const g=scene();for(const type of ['toyDrum','toyTurtle','toyStunner'])reward(g,type);const p={x:1500,y:6000,active:true,rareSupply:true,supplyKind:'toyDecoyMaker'};a.equal(g.collectFieldSupply(p),false);a.equal(p.active,true);a.equal(g.supportToyOffer().type,'toyStunner');g.resolveSupportToyOffer('keep');a.equal(g.collectFieldSupply(p),true);a.equal(p.active,false);
});
test('drum buffs are small, range-bounded and non-stacking; medic pulses and lucky roulette retain their clocks',()=>{
 const g=scene(),r=g.addUnit(0,'rifle',1500,6000),m=g.addUnit(0,'medic',1510,6000),l=g.addUnit(0,'lucky',1520,6000),base=g.stats(r);const d=g.addSupportToy('toyDrum');near(g.stats(r).speed,base.speed*1.05);near(g.stats(r).rate,base.rate/1.03);near(g.stats(m).rate,1);const interval=g.updateLuckyInterval(l);g.addUnit(0,'toyDrum',1500,6000,true);near(g.stats(r).speed,base.speed*1.05);a.equal(g.updateLuckyInterval(l),interval);for(const u of g.units)if(u.type==='toyDrum')u.x=2200;near(g.stats(r).speed,base.speed);
});
test('water pushes insect bosses and ordinary enemies but never human, vehicle or sword bosses',()=>{
 for(const [type,boss,allowed]of [['ant',false,true],['stagBeetle',true,true],['rhinoBeetle',true,true],['hornet',true,true],['bayonetCaptain',true,false],['bladeGuard',true,false],['bikeRaider',true,false],['crimsonAce',true,false],['swordEmpress',true,false]]){
  const g=scene(),u=g.addSupportToy('toyTurtle'),t=g.addUnit(2,type,u.x+150,u.y);t.boss=boss;const x=t.x;a.equal(g.pushSupportTarget(u,t),allowed,type);a.equal(t.x>x,allowed,type);
 }
});
test('water is a cone with at most three targets, respects walls and grants a shared control-resistance interval',()=>{
 const g=scene(),u=g.addSupportToy('toyTurtle');u.toyNextAt=0;const ts=Array.from({length:5},(_,i)=>g.addUnit(2,'ant',u.x+120+i*20,u.y));const back=g.addUnit(2,'ant',u.x-150,u.y),old=ts.map(t=>t.x);a.equal(g.useSupportToy(u),true);a.equal(ts.filter((t,i)=>t.x>old[i]).length,3);near(back.x,u.x-150);a.equal(g.pushSupportTarget(u,ts[0]),false);g.time=3;a.equal(g.pushSupportTarget(u,ts[0]),true);const w=g.addUnit(2,'ant',u.x+100,u.y);g.freePosition=()=>false;const x=w.x;g.pushSupportTarget(u,w);near(w.x,x);
});
test('stun interrupts a normal threat for one second, has a ten-second cooldown and never stuns bosses',()=>{
 const g=scene(),u=g.addSupportToy('toyStunner');u.toyNextAt=0;const t=g.addUnit(2,'bayonet',u.x+120,u.y);t.bayonetAttack={};const boss=g.addUnit(2,'hornet',u.x+80,u.y);boss.boss=true;a.equal(g.useSupportToy(u),true);a.equal(t.toyStunUntil,1);a.equal(t.bayonetAttack,null);a.equal(boss.toyStunUntil,undefined);a.equal(u.toyNextAt,10);a.equal(g.useSupportToy(u),false);const x=t.x;g.move(t,1000,0,.05,100);near(t.x,x);g.time=1;g.move(t,1000,0,.05,100);a.ok(t.x>x);a.equal(g.supportControlAllowed(t,'push'),false);g.time=4;a.equal(g.supportControlAllowed(t,'push'),true);
});
test('decoys lure at most two normal enemies, do not rewrite airborne attacks and expire after three seconds',()=>{
 const g=scene(),u=g.addSupportToy('toyDecoyMaker');u.toyNextAt=0;const ts=Array.from({length:3},(_,i)=>g.addUnit(2,'rifle',1500+i*20,5750)),boss=g.addUnit(2,'bladeGuard',1500,5800);boss.boss=true;const shot={target:g.commander(0)};g.shots=[shot];g.useSupportToy(u);g.time=.35;const d=g.units.find(t=>t.type==='toyDecoy');a.equal(d.toyLuredIds.length,2);a.equal(ts.filter(t=>g.canTarget(t,d)).length,2);a.equal(g.canTarget(boss,d),false);a.equal(g.supportDecoyTarget(ts[0]),d);a.equal(shot.target,g.commander(0));g.time=3.35;g.updateSupportToys(.05);a.equal(d.hp,0);a.equal(g.supportDecoyTarget(ts[0]),null);
});
test('destroyed support toys disable for twenty seconds without casualties or salvage and repair on the simulation clock',()=>{
 const g=scene(),u=g.addSupportToy('toyTurtle'),enemy=g.addUnit(2,'rifle',1600,6000),loss=g.losses[0],cash=g.cash[0];g.damage(u,1e9,enemy);a.equal(u.hp,0);a.equal(g.losses[0],loss);a.equal(g.cash[0],cash);a.equal(u.toyDownUntil,20);g.phase='paused';g.update(1);a.equal(g.time,0);g.phase='playing';g.time=19.99;g.updateSupportToys(.05);a.equal(u.hp,0);g.time=20;g.updateSupportToys(.05);near(u.hp,u.maxHp*.5);a.ok(g.units.includes(u));
});
test('turtle catch-up speed applies outside combat while its combat movement remains slow',()=>{
 const g=scene(),u=g.addSupportToy('toyTurtle');u.x=1000;u.y=6000;const speeds=[];g.navigate=(u,x,y,dt,speed)=>speeds.push(speed);g.updateSupportToys(.05);a.ok(speeds[0]>145);g.addUnit(2,'ant',1500,5900);g.updateSupportToys(.05);near(speeds[1],90);
});
test('saved cooperative toys, damaged states and offers retain owner identity; a player cannot replace the other squad toy',()=>{
 const g=scene(true);g.withOwner(0,()=>{reward(g,'toyDrum');reward(g,'toyTurtle');reward(g,'toyStunner');});g.withOwner(1,()=>{reward(g,'toyDecoyMaker');reward(g,'toyStunner');});const other=g.withOwner(1,()=>g.supportToys()[0]);a.equal(g.resolveSupportToyOffer(other.id),false);const copy=unpack(scene(true),JSON.parse(JSON.stringify(pack(g))));a.equal(copy.supportToyOffer().type,'toyStunner');a.equal(copy.withOwner(1,()=>copy.supportToyOffer()),null);a.equal(copy.withOwner(1,()=>copy.supportToys().length),2);a.equal(copy.supportToys().length,2);
});
test('AI resolves its own replacement without opening or consuming an upgrade choice',()=>{
 const g=scene();reward(g,'toyDrum');reward(g,'toyDecoyMaker');reward(g,'toyStunner');const xp=g.xp;g.autoSupportToyOffer();a.equal(g.supportToyOffer(),null);a.ok(g.supportToys().some(t=>t.type==='toyStunner'));a.equal(g.phase,'playing');a.equal(g.xp,xp);
});
test('all toy models and skill effects render across directions without an asset request',()=>{
 const context=vm.createContext({window:{},Math,Set});vm.runInContext(fs.readFileSync(__dirname+'/public/support-toys-view.js','utf8'),context);const g=scene(),gradient={addColorStop(){}},c=new Proxy({createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});context.window.FrontSupportToys=globalThis.FrontSupportToys;
 for(const type of Object.keys(globalThis.FrontSupportToys.toys)){const u={id:5,type,x:1500,y:6000,face:0,walk:4,hp:100,maxHp:200,toyNextAt:3,toyActionUntil:1};for(let i=0;i<8;i++){u.face=i*Math.PI/4;context.window.FrontSupportToyView.draw(c,u,g);}u.hp=0;u.toyDownUntil=20;context.window.FrontSupportToyView.draw(c,u,g);}
 for(const kind of ['toyWater','toyZap','toyDecoyDrop'])a.equal(context.window.FrontSupportToyView.event(c,{kind,x:1500,y:6000,tx:1600,ty:6000,t:.3,max:1},g),true);
});

test('walking settles on stop and a water burst keeps its firing direction while the turtle turns to follow',()=>{
 const context=vm.createContext({window:{},Math,Set});vm.runInContext(fs.readFileSync(__dirname+'/public/support-toys-view.js','utf8'),context);context.window.FrontSupportToys=globalThis.FrontSupportToys;const g=scene(),u=g.addSupportToy('toyTurtle'),gradient={addColorStop(){}},rotations=[],c=new Proxy({createRadialGradient:()=>gradient,rotate:a=>rotations.push(a)},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)}),view=context.window.FrontSupportToyView;
 view.draw(c,u,g);u.x+=5;g.time=.05;view.draw(c,u,g);a.ok(view.motionPose(u).weight>.5);for(let i=0;i<30;i++){g.time+=.05;view.draw(c,u,g);}a.ok(view.motionPose(u).weight<1e-6);
 const target=g.addUnit(2,'ant',u.x,u.y-150);u.toyNextAt=0;g.useSupportToy(u);near(u.toyActionFace,-Math.PI/2);u.face=Math.PI/2;rotations.length=0;view.draw(c,u,g);near(rotations[0],0);a.ok(target.toyControlReadyAt>g.time);
});
