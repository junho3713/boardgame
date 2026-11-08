const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'public');
function models(options={}){
 const requests=[],images=[],timers=[],w={};let rina=0;
 class Image{set src(url){this.url=url;requests.push(url);images.push(this);if(!options.hold&&!(options.holdTank&&url.includes('/tank-')))queueMicrotask(()=>this.onload());}}
 w.FrontMedicSkin=class{constructor(){rina++;this.ready=Promise.resolve();}};
 const fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8'))});
 vm.runInNewContext(fs.readFileSync(path.join(root,'models.js'),'utf8'),{window:w,Image,fetch,Math,Map,WeakMap,Promise,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){}});
 return{create:opts=>new w.FrontModels(opts),requests,images,timers,rina:()=>rina};
}
test('startup loads four core models and no unselected skin atlases',async()=>{
 const h=models(),m=h.create();await m.ready;
 assert.deepEqual([...m.assets.keys()].sort(),['ant-2','bayonet-1','leader-0','rifle-0']);
 assert.equal(h.rina(),0);assert.equal(h.requests.some(x=>/Hwarin|Shino|Kayla|Shion/i.test(x)),false);
});
test('selected skins and restored commander are prepared once, without other heroes',async()=>{
 const h=models(),m=h.create();await m.ready;
 await m.prepare({commanderId:'blaze',flameSkinId:'hwarin',medicSkinId:'rina',sniperSkinId:'kayla',units:[]});
 assert.ok(m.assets.has('commanderHwarin-0'));assert.ok(m.assets.has('sniperKayla-0'));assert.equal(h.rina(),1);
 const count=h.requests.length;await m.prepare({commanderId:'blaze',flameSkinId:'hwarin',medicSkinId:'rina',sniperSkinId:'kayla',units:[]});
 assert.equal(h.requests.length,count);assert.equal(h.rina(),1);assert.equal(h.requests.some(x=>/Shino|Shion/i.test(x)),false);
});
test('unrelated pending images do not block initial readiness',async()=>{
 const h=models({holdTank:true}),m=h.create();await m.manifestReady;
 const extra=m.ensure('tank',0);await m.ready;assert.equal(extra.ready,false);
 const count=h.requests.length;m.prefetch({phase:'playing',units:[{type:'tank',team:0,hp:1}]});assert.equal(h.requests.length,count);
});
test('startup deadline releases a slow download and late assets still become ready',async()=>{
 const h=models({hold:true}),m=h.create();await m.manifestReady;await Promise.resolve();
 assert.equal(m.assets.get('leader-0').ready,false);h.timers[0]();await m.ready;
 for(const im of h.images)im.onload();assert.equal(m.assets.get('leader-0').ready,true);
});
test('selected ultimate and its regular commander both remain available after restore',async()=>{
 const h=models(),m=h.create();await m.ready;
 await m.prepare({level:10,units:[],commander:()=>({type:'leader',team:0,appearance:'shino',ultimatePose:{active:true}})});
 assert.ok(m.assets.has('commanderShino-0'));assert.ok(m.assets.has('commanderShinoUltimate-0'));
});
test('world manifest is lightweight and drawn props load once on demand',async()=>{
 const w={},images=[],callbacks=[];let rebuilds=0;
 class Image{set src(url){this.url=url;images.push(this);}}
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/world/manifest.json'),'utf8'));
 vm.runInNewContext(fs.readFileSync(path.join(root,'world.js'),'utf8'),{window:w,Image,fetch:async()=>({ok:true,json:async()=>manifest}),Map,setTimeout:fn=>{callbacks.push(fn);return 1;}});
 const m=new w.FrontWorldModels(()=>rebuilds++);await m.ready;assert.equal(images.length,0);assert.equal(rebuilds,1);
 const key=Object.keys(manifest.models)[0];assert.equal(m.draw({},key),false);m.draw({},key);assert.equal(images.length,1);
 images[0].onload();assert.equal(callbacks.length,1);callbacks[0]();assert.equal(rebuilds,2);
 let draws=0;assert.equal(m.draw({drawImage(){draws++;},save(){},restore(){}},key),true);assert.equal(draws,1);
 assert.equal(m.draw({},'missing'),false);assert.equal(images.length,1);
});
test('menu previews are packaged WebP files instead of rendering extra games at startup',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),game=fs.readFileSync(path.join(root,'game.js'),'utf8');
 for(const id of ['backyard','livingroom','desktop']){
  const name=`assets/previews/start-${id}-v20261108.webp`,bytes=fs.readFileSync(path.join(root,name));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(html.includes(name));
 }
 assert.equal(game.includes('renderMapPreviews'),false);assert.ok(game.includes('unitModels.waitFor(['));
});
