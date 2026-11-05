/* Warm the small UI image set once, including decoding, before first combat. */
(function(root){'use strict';
 const cache=new Map();
 function load(src){
  if(cache.has(src))return cache.get(src).promise;
  if(typeof root.Image!=='function')return Promise.resolve(false);
  let resolve,done=false,timer;const promise=new Promise(r=>{resolve=r;}),entry={image:new root.Image(),promise,state:'loading'};cache.set(src,entry);
  const finish=(ok)=>{entry.state=ok?'ready':'failed';if(done)return;done=true;root.clearTimeout(timer);resolve(ok);};
  // A broken or stalled image must not prevent the player from starting.
  timer=root.setTimeout(()=>finish(false),4000);
  entry.image.decoding='async';entry.image.onload=()=>{Promise.resolve().then(()=>entry.image.decode?.()).then(()=>finish(true),()=>finish(true));};
  entry.image.onerror=()=>finish(false);entry.image.src=src;return promise;
 }
 const preload=sources=>Promise.all([...new Set(sources)].map(load));
 const api={preload};root.FrontArtLoader=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
