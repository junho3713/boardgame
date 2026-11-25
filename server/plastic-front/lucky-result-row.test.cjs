'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrontEffects}=require('./public/effects.js');

function row(kinds,{time=4.7,spinning=false}={}){
 const effects=new FrontEffects({textures:{}});
 const icons=[],labels=[],panels=[],borders=[];
 effects.luckySymbol=(_ctx,kind,x,y)=>icons.push({kind,x,y});
 const ctx=new Proxy({
  globalAlpha:1,
  fillText(label,x,y){labels.push({label,x,y});},
  roundRect(x,y,w,h){if(w===46&&h===30)panels.push({x,y});},
  stroke(){borders.push(this.strokeStyle);}
 },{get:(obj,key)=>obj[key]??(()=>{})});
 const u={id:1,team:0,star:3,hp:10,x:250,y:300,luckyChannels:kinds.map(kind=>({roll:{
  kind,startedAt:4,endsAt:4.6,resultAt:spinning?undefined:4.6,resolved:!spinning
 }}))};
 effects.luckyReels(ctx,u,{time,luckySalvos:[]});
 return {icons,labels,panels,borders};
}

test('three-star Retona presents mixed results in one row and reserves gold for boss killer',()=>{
 const r=row(['glue','mine','bossKiller']);
 assert.deepEqual(r.labels.map(x=>x.label),['접착탄','섬광탄','보스킬러']);
 assert.deepEqual(r.panels.map(x=>x.x),[177,227,277]);
 assert.equal(new Set(r.panels.map(x=>x.y)).size,1);
 assert.equal(r.borders.filter(color=>color==='#f8d56e').length,1);
});

test('duplicate jackpots share a tile count and display other wins alongside',()=>{
 const r=row(['missiles','mine','missiles']);
 assert.deepEqual(r.labels.map(x=>x.label),['777','×2','섬광탄','·']);
 assert.equal(r.icons.filter(x=>x.kind==='missiles').length,1);
});

test('three-star Retona cycles symbols without revealing results before the roll settles',()=>{
 const r=row(['bossKiller','missiles','glue'],{time:4.15,spinning:true});
 assert.equal(r.panels.length,3);
 assert.equal(r.icons.length,3);
 assert.deepEqual(r.labels,[]);
});
