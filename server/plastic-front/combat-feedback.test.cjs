'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(){
 const requests=[],calls=[],stack=[];let delegated=0;
 class Image{constructor(){requests.push(this);}load(ok=true){if(ok){const b=fs.readFileSync(__dirname+'/public/'+this.src);this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.onload();}else this.onerror();}}
 class Effects{drawEvent(){delegated++;return 'base';}}
 const window={Image,FrontEffects:Effects};vm.runInNewContext(fs.readFileSync(__dirname+'/public/combat-feedback.js','utf8'),{window,Map,Math});
 const ctx=new Proxy({globalAlpha:1,globalCompositeOperation:'source-over',save(){stack.push([this.globalAlpha,this.globalCompositeOperation]);},restore(){a.ok(stack.length);[this.globalAlpha,this.globalCompositeOperation]=stack.pop();},createRadialGradient(){return{addColorStop(){}};},drawImage(image,x,y,w,h,...rest){a.ok([x,y,w,h,...rest].every(Number.isFinite));a.ok(x>=0&&y>=0&&x+w<=image.naturalWidth&&y+h<=image.naturalHeight);calls.push(['image',image.src,x,y,w,h,...rest]);}},{get:(o,k)=>k in o?o[k]:(...args)=>{a.ok(args.filter(x=>typeof x==='number').every(Number.isFinite),k);calls.push([k,...args]);}});
 return{requests,calls,ctx,fx:new Effects(),delegated:()=>delegated,check(){a.equal(stack.length,0);a.equal(ctx.globalAlpha,1);a.equal(ctx.globalCompositeOperation,'source-over');}};
}
test('actual exported atlases are shared and bounded for armor, 777 and boss impacts; base explosion draws once',()=>{
 const h=harness();a.equal(h.requests.length,2);for(const im of h.requests)im.load();
 for(const q of [0,.1,.4,.8,.999])for(const e of [{kind:'hit',power:1,armor:true,angle:.7,lift:20,x:50,y:60,max:.16,t:.16*(1-q)},{kind:'explosion',visualKind:'jackpot',radius:45,x:80,y:90,max:.7,t:.7-.3*q},{kind:'explosion',visualKind:'bossKiller',radius:110,x:80,y:90,max:.9,t:.9-.3*q}]){const before=JSON.stringify(e),n=h.delegated();h.fx.drawEvent(h.ctx,e);a.equal(h.delegated()-n,e.kind==='explosion'?1:0);a.equal(JSON.stringify(e),before);h.check();}
 a.ok(h.calls.some(x=>x[0]==='image'&&x[1].includes('hit-spark')));a.ok(h.calls.some(x=>x[0]==='image'&&x[1].includes('heavy-impact')));a.equal(h.requests.length,2);
});
test('missing effect images retain finite feedback without requests repeating or changing rendering state',()=>{
 const h=harness();h.requests.forEach(im=>im.load(false));for(let i=0;i<20;i++){h.fx.drawEvent(h.ctx,{kind:'hit',power:1,armor:i%2===0,x:20,y:30,angle:i,max:.16,t:.1});h.check();}a.equal(h.requests.length,2);a.ok(!h.calls.some(c=>c[0]==='image'));
});
test('healing follows a moving patient, stops at death, and keeps source and patient untouched',()=>{
 const h=harness(),target={x:100,y:200,hp:50,coopOwner:1},source={x:20,y:200,hp:100},e={kind:'heal',target,source,max:.5,t:.25,x:0,y:0};
 for(const x of [100,180]){target.x=x;h.calls.length=0;const before=JSON.stringify(e);h.fx.drawEvent(h.ctx,e);a.equal(JSON.stringify(e),before);a.ok(h.calls.some(c=>c[0]==='ellipse'&&c[1]===x&&c[2]===202));h.check();}target.hp=0;h.calls.length=0;h.fx.drawEvent(h.ctx,e);a.equal(h.calls.length,0);
});
test('paused and rewound feedback is deterministic and unrelated effects still reach the original renderer',()=>{
 const h=harness();h.requests.forEach(im=>im.load());const e={kind:'hit',armor:true,power:1,x:20,y:30,angle:.4,max:.16,t:.09};
 h.fx.drawEvent(h.ctx,e);const first=JSON.stringify(h.calls);h.calls.length=0;h.fx.drawEvent(h.ctx,e);a.equal(JSON.stringify(h.calls),first);e.t=.14;h.fx.drawEvent(h.ctx,e);e.t=.09;h.calls.length=0;h.fx.drawEvent(h.ctx,e);a.equal(JSON.stringify(h.calls),first);a.equal(h.fx.drawEvent(h.ctx,{kind:'toyUnrelated'}),'base');h.check();
});
