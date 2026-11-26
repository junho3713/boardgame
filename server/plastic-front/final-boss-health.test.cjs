'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {FrontGame}=require('./public/engine.js'),sword=require('./public/sword-boss.js'),{pack,unpack}=require('./public/autoplay.js');
test('new campaign finale has 140800 HP while damage and phase rules retain their existing values',()=>{
 const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();g.time=1200;const b=g.addUnit(2,'swordEmpress',1500,1100,true);b.finalBoss=b.boss=true;a.equal(b.maxHp,140800);a.equal(g.stats(b).hp,140800);a.equal(g.trialConfig.damage,85);a.equal(g.trialConfig.firstHitRatio,.5);a.equal(g.trialConfig.overlapHitRatio,.1);
 const lab=sword.create();a.equal(lab.trialBoss.maxHp,140800);const custom=sword.create({hp:9000});a.equal(custom.trialBoss.maxHp,9000);
});
test('old finale saves upgrade HP once, preserve damage ratio and never revive a dead boss',()=>{
 for(const [version,hp]of [[165,64000],[164,32000],[0,16000]])for(const ratio of [.6,0]){const g=new FrontGame({},undefined,{map:'livingroom-star'});g.start();const b=g.addUnit(2,'swordEmpress',1500,1100,true);b.boss=b.finalBoss=true;g.trialConfig.hp=hp;g.trialConfig.healthVersion=version;b.hp=hp*ratio;b.maxHp=hp;sword.ensure(g,b);a.equal(b.maxHp,140800);a.equal(b.hp,140800*ratio);sword.ensure(g,b);a.equal(b.hp,140800*ratio);const copy=unpack(new FrontGame(),JSON.parse(JSON.stringify(pack(g)))),u=copy.units.find(u=>u.type==='swordEmpress');a.equal(u.hp,b.hp);a.equal(u.maxHp,b.maxHp);}
});
test('finale world and pinned health bars show current/max HP, clamp fills and preserve combat state',()=>{
 const window={},context=vm.createContext({window,Math,Promise,Image:class{}});for(const name of ['bubble-octopus-view.js','sword-boss-view.js'])vm.runInContext(fs.readFileSync(__dirname+'/public/'+name,'utf8'),context);const view=Object.create(window.FrontSwordBossView.prototype),calls=[],noop=()=>{},c={save:noop,restore:noop,fillRect:(...v)=>calls.push(['rect',...v]),strokeText:noop,fillText:(...v)=>calls.push(['text',...v])},b={x:600,y:800,hp:70400,maxHp:140800,finalBoss:true,swords:{phase:2}},g={trialBoss:b,visible:()=>true},before=JSON.stringify(b);
 view.health(c,g);a.equal(calls.filter(v=>v[0]==='rect')[2][3],110);a.ok(calls.some(v=>v[0]==='text'&&v[1]==='70,400 / 140,800'));calls.length=0;view.hud(c,g,390);const rect=calls.find(v=>v[0]==='rect');a.ok(rect[1]>=0&&rect[1]+rect[3]<=390);a.equal(JSON.stringify(b),before);b.hp=0;calls.length=0;view.health(c,g);view.hud(c,g,390);a.equal(calls.length,0);
});
test('the left shield segment shrinks without changing the width of the right health segment',()=>{
 const window={},context=vm.createContext({window,Math});
 for(const name of ['bubble-octopus-view.js','sword-boss-view.js'])vm.runInContext(fs.readFileSync(__dirname+'/public/'+name,'utf8'),context);
 const view=Object.create(window.FrontSwordBossView.prototype);
 for(const hp of [60,100])for(const shield of [35,12,0]){
  const fills=[],stops=[];
  const c={save(){},restore(){},strokeText(){},fillText(){},
   fillRect(x,y,w,h){fills.push({x,y,w,h});},
   createLinearGradient(){return {addColorStop(offset,color){stops.push([offset,color]);}};}};
  view.healthBar(c,{hp,maxHp:100,bubbleShield:shield?{hp:shield}:null},100,20,100);
  a.equal(fills.length,3); // Frame, track and a single fill.
  const fill=fills[2];a.equal(fill.y,24);a.equal(fill.h,14);a.ok(Math.abs(fill.w-hp-shield)<1e-8);
  if(shield){
   a.deepEqual(stops.map(([,color])=>color),['#72d8ff','#72d8ff','#b480eb','#b480eb']);
   a.equal(stops[1][0],stops[2][0]);
   a.ok(Math.abs(fill.w*stops[1][0]-shield)<1e-8);
   a.ok(Math.abs(fill.w*(1-stops[2][0])-hp)<1e-8);
  }else a.equal(stops.length,0);
 }
});
