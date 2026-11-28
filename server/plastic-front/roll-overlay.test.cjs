'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {plan,full}=require('./public/roll-overlay.js');
const display=require('./public/display.js');

const visible=()=>true;
const unit=(id,type,star)=>({id,type,star,hp:120,team:0,x:id*20,y:100});
const radio=(u,at,a,b,strike)=>({kind:'radioRoll',source:u,rank:u.star,at,a,b,strike,t:.85,max:.85});
const luck=(u,at,kind,resolved=true)=>{
 u.luckyRoll={kind,resolved,resultAt:at,startedAt:at-.8,endsAt:at};
 return u;
};
const hotline=at=>({kind:'evolutionLink',team:0,link:'gamblers',at,x:100,y:100,t:.65,max:.65});
const labels=({results})=>results.map(r=>r.label);

test('display preference validates the three modes and preserves old settings',()=>{
 const disk=new Map([['plastic-front-display-v1','{"zoom":120,"resolution":"high"}']]);
 const storage={getItem:key=>disk.get(key),setItem:(key,value)=>disk.set(key,value)};
 assert.deepEqual(display.read(storage),{zoom:120,resolution:'high',rollDisplay:'default'});
 assert.equal(display.clean({rollDisplay:'invalid'}).rollDisplay,'default');
 for(const rollDisplay of ['default','full','minimal']){
  assert.ok(display.save(storage,{zoom:120,resolution:'high',rollDisplay}));
  assert.equal(display.read(storage).rollDisplay,rollDisplay);
 }
});

test('default keeps 1-star full displays and only promotes compact wins',()=>{
 const scout=unit(1,'guntruck',1),miss=unit(2,'guntruck',2),double=unit(3,'guntruck',3);
 const spinning=luck(unit(4,'lucky',2),20.5,'blank',false);
 const glue=luck(unit(5,'lucky',2),20,'glue');
 const game={time:20,units:[spinning,glue],effects:[
  radio(scout,19.75,1,1,'turret'),radio(miss,19.75,2,3),radio(double,19.8,4,4,'incendiary')
 ]};
 assert.equal(full('default',scout),true);assert.equal(full('default',miss),false);
 assert.equal(full('full',double),true);assert.equal(full('minimal',scout),false);
 const out=plan(game,'default',visible);
 assert.deepEqual(out.spinners,[spinning]);
 assert.deepEqual(labels(out),['4–4  소이탄']);
 assert.deepEqual(plan(game,'full',visible),{results:[],spinners:[]});
});

test('two ordinary calls are shared across families, with critical calls painted last',()=>{
 const game={time:10,units:[luck(unit(4,'lucky',3),9.9,'missiles'),luck(unit(5,'lucky',2),9.95,'bossKiller')],effects:[
  radio(unit(1,'guntruck',2),9.65,1,1,'turret'),
  radio(unit(2,'guntruck',2),9.7,5,5,'missile'),
  radio(unit(3,'guntruck',3),9.74,6,6,'nuke'),
  hotline(9.96)
 ]};
 const result=plan(game,'default',visible);
 assert.deepEqual(labels(result),['1–1  기관포탑','777','6–6  전술 핵','행운의 핫라인']);
 assert.deepEqual(result.results.map(r=>r.priority),[false,false,true,true]);
 assert.deepEqual(labels(plan(game,'minimal',visible)),['6–6  전술 핵','행운의 핫라인']);
});

test('an identical result within half a second is suppressed even after the first expires',()=>{
 const first=radio(unit(1,'guntruck',2),2,4,4,'incendiary');
 const repeated=radio(unit(2,'guntruck',2),2.3,4,4,'incendiary');
 const next=radio(unit(3,'guntruck',2),2.55,4,4,'incendiary');
 const game={time:2.25,units:[],effects:[first]};
 assert.equal(plan(game,'default',visible).results.length,1);
 game.time=2.54;game.effects=[first,repeated];
 assert.equal(plan(game,'default',visible).results.length,1);
 game.time=2.76;game.effects=[repeated];
 assert.equal(plan(game,'default',visible).results.length,0);
 game.time=2.81;game.effects=[repeated,next];
 assert.equal(plan(game,'default',visible).results[0].u.id,3);
});

test('three admitted results reentering the viewport never exceed two normal calls',()=>{
 const game={time:4,units:[],effects:[
  radio(unit(1,'guntruck',2),3.6,1,1,'turret'),
  radio(unit(2,'guntruck',2),3.6,4,4,'incendiary'),
  radio(unit(3,'guntruck',2),3.6,5,5,'missile')
 ]};
 assert.equal(plan(game,'default',u=>u.id<3).results.length,2);
 game.time+=.03;
 assert.equal(plan(game,'default',u=>u.id===3).results.length,1);
 assert.equal(plan(game,'default',visible).results.length,2);
});
