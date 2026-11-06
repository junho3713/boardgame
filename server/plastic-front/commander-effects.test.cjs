'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {FrontGame,TYPES,ULTIMATE,FLAME,SWORD}=require('./public/engine.js');
const {CoopGame}=require('./public/coop-engine.js'),{pack,unpack}=require('./public/autoplay.js'),{applySnapshot}=require('./public/coop-state.js');
const variants=[['sarge','classic',20,'ultimateVolley'],['shino','classic',20,'ultimateVolley'],['blaze','classic',34,'flame'],['blaze','hwarin',34,'flame'],['shion','classic',8,'shionSpin']];

function renderer({materials=true,budget=240}={}){
 const window={FrontTypes:TYPES,FrontUltimate:ULTIMATE,FrontFlame:FLAME,FrontSword:SWORD},context=vm.createContext({window,Math,Map,Set,WeakMap,WeakSet,Promise});
 for(const file of ['effects.js','impact-materials.js','projectile-materials.js','evolution-effects.js','commander-effects.js'])vm.runInContext(fs.readFileSync(__dirname+'/public/'+file,'utf8'),context,{filename:file});
 const textures=Object.fromEntries(['glow','flame','fire','smoke','whiteSmoke','dust','scorch'].map(k=>[k,{name:k}])),fx=new window.FrontEffects({budget,textures});
 if(materials){const atlas={fire:[{},{},{}],smoke:[{},{},{}],dust:[{},{}],flash:{}};fx.prepareImpactMaterials=()=>atlas;}
 return fx;
}
function canvas(){
 const calls=[],stack=[],ctx={calls,globalAlpha:1,globalCompositeOperation:'source-over'};
 const record=(name,args)=>{for(const n of args)if(typeof n==='number')a.ok(Number.isFinite(n),name+' received '+n);calls.push([name,...args]);};
 for(const name of ['translate','rotate','scale','beginPath','closePath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','ellipse','arc','fill','stroke','fillRect','roundRect','fillText','strokeText','setLineDash'])ctx[name]=(...args)=>record(name,args);
 ctx.save=()=>{stack.push({globalAlpha:ctx.globalAlpha,globalCompositeOperation:ctx.globalCompositeOperation});record('save',[]);};
 ctx.restore=()=>{a.ok(stack.length,'unbalanced canvas restore');Object.assign(ctx,stack.pop());record('restore',[]);};
 ctx.drawImage=(image,...args)=>{a.ok(image,'missing material');record('drawImage',args);};
 ctx.createLinearGradient=ctx.createRadialGradient=(...args)=>{record('gradient',args);return{addColorStop(n,color){a.ok(Number.isFinite(n)&&n>=0&&n<=1);a.equal(typeof color,'string');}};};
 ctx.assertRestored=()=>{a.equal(stack.length,0);a.equal(ctx.globalAlpha,1);a.equal(ctx.globalCompositeOperation,'source-over');};return ctx;
}
function battle(appearance,flameSkin='classic'){
 const g=new FrontGame({},undefined,{map:'livingroom-star'});g.setCommander(appearance);g.flameSkinId=flameSkin;g.start();
 const c=g.commander(0);Object.assign(c,{x:1000,y:6000,face:0,flameSkin});g.units=[c];g.obstacles=[];g.buildings=[];g.defenses=[];g.structures=[];g.effects=[];g.level=10;g.random=()=>.99;
 const target=g.addUnit(2,'ant',1100,6000);target.hp=target.maxHp=1e6;
 return{g,c,target};
}
function visualState(fx){return JSON.stringify({particles:fx.particles,scorches:fx.scorches,seed:fx.seed,serial:fx.serial,actors:[...fx.ultimateActors],cues:fx.ultimateCues,emissions:[...fx.ultEmissionTimes]});}

test('actual commander ultimates retain their attack counts, damage, duration and cooldown through rendering',()=>{
 for(const [appearance,skin,count,kind]of variants){
  const {g,c,target}=battle(appearance,skin),fx=renderer(),ctx=canvas(),hp=target.hp,perHit=g.stats(c).damage*2*g.defenseFactor(target,c);
  a.equal(g.useUltimate(),true);a.equal(g.ultimate.activeUntil,4);a.equal(g.ultimate.readyAt,60);
  for(let tick=0;tick<=200;tick++){g.time=tick*.02;g.updateUltimate();fx.update(g);for(const e of g.effects)if(e.kind===kind)fx.drawEvent(ctx,e);fx.drawParticles(ctx);}
  const emitted=g.effects.filter(e=>e.kind===kind);a.equal(emitted.length,count,appearance+' / '+skin);a.equal(g.ultimate.shots,count);a.ok(Math.abs(hp-target.hp-perHit*count)<.00001,appearance+' damage changed');
  a.equal(c.ultimatePose.active,false);a.equal(g.ultimateStatus().active,false);a.equal(g.ultimateStatus().cooldown,56);a.equal(g.useUltimate(),false);
  a.ok(emitted.every(e=>Number.isFinite(e.at)&&e.sourceId===c.id),'stable event metadata required');ctx.assertRestored();
 }
});

test('all commander skins draw finite geometry in eight directions with materials available or unavailable',()=>{
 for(const materials of [true,false])for(const [appearance,skin,,kind]of variants)for(let direction=0;direction<8;direction++){
  const {g,c}=battle(appearance,skin),fx=renderer({materials}),ctx=canvas();g.useUltimate();g.updateUltimate();const original=g.effects.find(e=>e.kind===kind);a.ok(original);
  const e={...original,angle:direction*Math.PI/4};fx.emit(e);
  for(const progress of [0,.2,.55,.95,1]){e.t=e.max*(1-progress);fx.time=.25;const before=ctx.calls.length;a.equal(fx.drawEvent(ctx,e),true);a.ok(ctx.calls.length>before);fx.drawUltimateArea(ctx,c,{angle:e.angle},.25);ctx.assertRestored();}
  // Normal attacks still use the existing renderer after the ultimate wrapper.
  a.equal(fx.drawEvent(ctx,{kind:'heal',x:10,y:20,t:.2,max:.5}),true);ctx.assertRestored();
 }
});

test('repeated ultimate renders and a paused simulation neither alter combat nor advance the effect state',()=>{
 for(const [appearance,skin]of variants){
  const {g,c}=battle(appearance,skin),fx=renderer(),ctx=canvas();g.useUltimate();g.updateUltimate();fx.update(g);
  const before=visualState(fx),combat=JSON.stringify(pack(g));
  for(let i=0;i<15;i++){for(const e of g.effects)fx.drawEvent(ctx,e);fx.drawUltimateArea(ctx,c,g.ultimate,g.time);fx.drawParticles(ctx);fx.update(g);}
  a.equal(visualState(fx),before);a.equal(JSON.stringify(pack(g)),combat);g.phase='paused';
  for(let i=0;i<15;i++){fx.update(g);fx.drawParticles(ctx);}a.equal(visualState(fx),before);ctx.assertRestored();
  g.phase='playing';g.time=.05;fx.update(g);a.notEqual(visualState(fx),before);a.ok(fx.particles.some(p=>p.age>0));
 }
});

test('co-op snapshot clones do not replay sparks or casings and both commanders receive one activation cue',()=>{
 for(const pair of [['shion','blaze'],['sarge','shino']]){
  const server=new CoopGame(),client=new CoopGame(),fx=renderer();server.start();server.time=30;server.units=server.units.filter(u=>u.team===0&&u.type==='leader');server.effects=[];server.defenses=[];server.structures=[];server.buildings=[];
  for(const owner of [0,1])server.withOwner(owner,()=>{server.level=10;const c=server.commander(0);c.appearance=pair[owner];c.face=0;a.equal(server.useUltimate(),true);});
  server.updateUltimate();applySnapshot(client,pack(server),unpack);fx.update(client);const first=visualState(fx),actors=client.units.filter(u=>u.team===0&&u.type==='leader'),oldEvents=client.effects;
  a.equal(fx.ultimateCues.length,2);a.equal(new Set(fx.ultimateCues.map(e=>e.source.id)).size,2);
  for(let i=0;i<5;i++){applySnapshot(client,pack(server),unpack);a.notEqual(client.effects[0],oldEvents[0]);fx.update(client);a.equal(visualState(fx),first);}
  for(const actor of actors)a.equal(client.units.find(u=>u.id===actor.id),actor);
  const flame=client.effects.find(e=>e.kind==='flame');if(flame)a.equal(fx.flameJets.get(flame.sourceId),flame,'dedup must still rebind the latest flame snapshot');
  server.time+=.2;server.updateUltimate();applySnapshot(client,pack(server),unpack);fx.update(client);a.equal(fx.ultimateCues.length,2);a.notEqual(visualState(fx),first);
 }
});

test('rewinding clears ultimate activation and emission history so replayed attacks display again',()=>{
 const {g}=battle('shion'),fx=renderer();g.time=10;g.useUltimate();g.updateUltimate();fx.update(g);a.ok(fx.particles.length);a.equal(fx.ultimateCues.length,1);a.ok(fx.ultEmissionTimes.size);
 fx.update({time:0,phase:'ready',units:[],effects:[],shots:[],mortarShells:[]});a.equal(fx.particles.length,0);a.equal(fx.ultimateCues.length,0);a.equal(fx.ultimateActors.size,0);a.equal(fx.ultEmissionTimes.size,0);
 fx.update(g);a.ok(fx.particles.length);a.equal(fx.ultimateCues.length,1);a.ok(fx.ultEmissionTimes.size);
});

test('simultaneous and catch-up ultimate events respect the mobile particle and emission history limits',()=>{
 const fx=renderer({budget:240}),events=[],units=[];
 for(const [appearance,skin,,kind]of variants){const {g,c}=battle(appearance,skin);c.id=units.length+100;g.useUltimate();for(let tick=0;tick<200;tick++){g.time=tick*.02;g.updateUltimate();}events.push(...g.effects.filter(e=>e.kind===kind));units.push(c);}
 const game={time:4,phase:'playing',effects:events,units,shots:[],mortarShells:[]};fx.update(game);a.equal(fx.particles.length,240);a.ok(fx.ultEmissionTimes.size<=128);
 // Sustained new events exercise bounded identity storage beyond one activation.
 for(let batch=1;batch<=4;batch++){game.time+=.05;game.effects=events.map(e=>({...e,at:e.at+batch*60}));fx.update(game);a.ok(fx.particles.length<=240);a.ok(fx.ultEmissionTimes.size<=128);}
 fx.update({...game,time:game.time+.05,effects:[],units:[]});a.equal(fx.ultimateActors.size,0);
});
