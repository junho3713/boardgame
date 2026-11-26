'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {FrontGame}=require('./public/engine');
test('world portal health shows clamped fill and current/max values without changing combat state',()=>{
 const calls=[],noop=()=>{},ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop}),fillRect:(...v)=>calls.push(['rect',...v]),fillText:(...v)=>calls.push(['text',...v])},{get:(t,k)=>t[k]||noop});
 const window={},context=vm.createContext({window,Image:class{},document:{createElement:()=>({getContext:()=>ctx})},Math,Promise,WeakMap});vm.runInContext(fs.readFileSync(__dirname+'/public/front-portal.js','utf8'),context);
 for(const hp of [300,0,700,-5]){calls.length=0;const b={x:200,y:400,hp,maxHp:600},before=JSON.stringify(b);window.FrontPortal.health(ctx,b);a.equal(JSON.stringify(b),before);a.equal(calls[2][3],192*Math.max(0,Math.min(1,hp/600)));a.equal(calls.find(c=>c[0]==='text')[1],`최전방 포탈 ${Math.ceil(Math.max(0,hp)).toLocaleString()} / 600`);}
});

test('closing the portal pays combat and profile gold and immediately grants 300 base XP once',()=>{
 const g=new FrontGame({},undefined,{map:'livingroom-star'});
 g.start();g.time=270;
 const open=g.roomWavePlan(),cash=g.cash[0],gold=g.profile.gold,xp=g.xp;
 g.damage(g.bases[1],1e9,g.commander(0));g.roomPortalDestroyed();
 const closed=g.roomWavePlan();
 a.equal(g.cash[0]-cash,300);a.equal(g.profile.gold-gold,100);a.equal(g.xp-xp,300);
 a.equal(g.experienceDrops.length,0);
 a.ok(closed.count<open.count&&closed.interval>open.interval);
});
