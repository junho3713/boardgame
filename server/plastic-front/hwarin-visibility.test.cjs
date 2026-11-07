'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function models(){const window={},context=vm.createContext({window,Math,Map,WeakMap});vm.runInContext(fs.readFileSync(__dirname+'/public/models.js','utf8'),context);const model=Object.create(window.FrontModels.prototype);model.motion=new WeakMap();model.manifest=JSON.parse(fs.readFileSync(__dirname+'/public/assets/models/manifest.json','utf8'));return model;}
function canvas(){const calls=[],ctx={calls};for(const name of ['save','restore','translate','rotate','scale','beginPath','rect','clip','transform'])ctx[name]=(...args)=>{for(const n of args)a.ok(Number.isFinite(n),name+' '+n);};ctx.drawImage=(image,...args)=>{a.ok(image);for(const n of args)a.ok(Number.isFinite(n),'invisible crop '+n);calls.push(args);};return ctx;}
test('Hwarin remains visible when a late-loaded skin replaces generic motion with no walk phase',()=>{
 const m=models(),spec={...m.manifest.models['commanderHwarin-0'].body,image:{}},u={id:1,x:1010,y:6000,walk:1,face:0},c=canvas();m.motion.set(u,{x:1000,y:6000,time:0,walk:0,walking:false});a.equal(m.drawHwarin(c,u,.1,{layers:{body:spec}}),true);a.ok(c.calls.length);a.ok(Number.isFinite(m.motion.get(u).walkPhase));
});
test('Hwarin recovers invalid motion and facing during walking, firing and ultimate in all eight directions',()=>{
 for(const action of ['walk','fire','ultimate'])for(let d=0;d<8;d++){const m=models(),spec={...m.manifest.models['commanderHwarin-0'].body,image:{}},c=canvas(),u={id:1,x:1010,y:6000,walk:1,face:d*Math.PI/4,flameUntil:action==='fire'?10:0,ultimatePose:action==='ultimate'?{active:true,angle:NaN}:null};m.motion.set(u,{x:1000,y:6000,time:0,walk:0,walkPhase:NaN,walking:true,bodyAngle:NaN});m.drawHwarin(c,u,.1,{layers:{body:spec}});a.ok(c.calls.length);for(const crop of c.calls){a.ok(crop[0]>=0&&crop[1]>=0);a.ok(crop[1]<spec.cell*spec.frames);}}
});
