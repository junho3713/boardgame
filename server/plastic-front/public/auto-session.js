/* One checkpoint contains the full original match, its profile and elapsed clock. */
(()=>{'use strict';
class FrontAutoSession{
 constructor({events,apply,message,busy,key='plastic-front-auto-v2',storage=localStorage}){this.storage=storage;this.key=key;this.leaseKey=key+'-owner';this.profileKey=key+'-profile';this.id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);this.events=events;this.apply=apply;this.message=message;this.busyUI=busy;this.pilot=null;this.owner=false;this.busy=false;this.at=Date.now();this.saved=0;this.error=false;}
 read(){try{const v=JSON.parse(this.storage.getItem(this.key)||'null');return v?.version===2&&v.snapshot?.version===2&&Number.isFinite(v.savedAt)?v:null;}catch{return null;}}
 readArmory(){try{const v=JSON.parse(this.storage.getItem(this.profileKey)||'null');return v?.profile&&Number.isFinite(v.savedAt)?v:null;}catch{return null;}}
 storeArmory(profile,at){this.storage.setItem(this.profileKey,JSON.stringify({savedAt:at,profile}));}
 saveArmory(pilot){if(this.busy||!this.claim())return false;if(this.pilot?.active){this.save();return !this.error;}try{const profile=pilot.game.profile.snapshot(),v=this.read();if(v){v.snapshot.engine.profile=profile;Object.assign(v.snapshot.pilot,{fails:profile.fails,attempts:profile.attempts,successes:profile.successes});this.storage.setItem(this.key,JSON.stringify(v));}this.storeArmory(profile,Date.now());this.error=false;return true;}catch{this.error=true;return false;}finally{this.release();}}
 claim(){if(this.owner&&Date.now()-(this.lastClaim||0)<1000)return true;this.lastClaim=Date.now();try{const v=JSON.parse(this.storage.getItem(this.leaseKey)||'null');if(v&&v.id!==this.id&&v.until>Date.now()){this.owner=false;return false;}this.storage.setItem(this.leaseKey,JSON.stringify({id:this.id,until:Date.now()+6000}));this.owner=true;return true;}catch{this.error=true;this.owner=true;return true;}}
 save(){if(!this.pilot?.active||!this.owner||this.busy)return;try{const v=JSON.parse(this.storage.getItem(this.leaseKey)||'null');if(v&&v.id!==this.id&&v.until>Date.now()){this.owner=false;return;}this.storage.setItem(this.leaseKey,JSON.stringify({id:this.id,until:Date.now()+6000}));this.storage.setItem(this.key,JSON.stringify({version:2,savedAt:this.at,snapshot:this.pilot.snapshot()}));this.storeArmory(this.pilot.game.profile.snapshot(),this.at);this.saved=Date.now();this.error=false;}catch{this.error=true;}}
 attach(pilot){if(!this.claim())return false;this.pilot=pilot;this.at=Date.now();this.save();return true;}
 load(v){const p=window.FrontAutoPilot.restore(v.snapshot,this.events);this.pilot=p;this.at=Math.min(Date.now(),v.savedAt);this.apply(p);return p;}
 async resume(){const v=this.read();if(!v)return false;this.claim();this.load(v);await this.tick(true);return true;}
 scheduleSave(){
  if(this.savePending)return;this.savePending=true;
  const commit=()=>{this.savePending=false;this.save();};
  if(document.hidden)commit();else if(typeof requestIdleCallback==='function')requestIdleCallback(commit,{timeout:1000});else setTimeout(commit,0);
 }
 cancelCatchup(){const job=this.catchup;if(!job)return false;job.finish({skipped:true});return true;}
 catchUp(p,seconds,show){
  return new Promise(resolve=>{
   const combined=p.remainder+seconds,finalRemainder=Number.isFinite(combined)?combined-Math.floor((combined+1e-9)/.05)*.05:0;
   const job={latest:p.snapshot(),processed:0,total:seconds,done:false,worker:null,local:null,watchdog:null,timer:null};this.catchup=job;
   // Retain the original checkpoint once, before committing partial catch-up results.
   try{this.storage.setItem(this.key+'-recovery',JSON.stringify({version:2,savedAt:this.at,snapshot:job.latest}));}catch{}
   job.finish=extra=>{if(job.done)return;job.done=true;clearTimeout(job.watchdog);clearTimeout(job.timer);job.worker?.terminate();if(this.catchup===job)this.catchup=null;resolve({snapshot:job.latest,processed:job.processed,total:seconds,...extra});};
   const publish=data=>{if(job.done)return;if(data.snapshot)job.latest=data.snapshot;if(Number.isFinite(data.processed))job.processed=Math.max(job.processed,Math.min(seconds,data.processed));if(!this.claim()){job.finish({abandoned:true});return;}if(show)this.busyUI(true,{processed:job.processed,total:seconds,fallback:!!job.local});};
   const fallback=()=>{if(job.done||job.local)return;clearTimeout(job.watchdog);job.worker?.terminate();job.worker=null;
    try{job.local=window.FrontAutoPilot.restore(job.latest);}catch(error){job.finish({error:String(error)});return;}
    const chunk=()=>{if(job.done)return;try{const start=Date.now();let steps=0;while(job.processed<seconds&&steps<4&&Date.now()-start<16){if(['ready','paused','ended'].includes(job.local.game.phase))break;const span=Math.min(.05,seconds-job.processed);job.local.advance(span,{silent:true});job.processed+=span;steps++;}publish({snapshot:job.local.snapshot(),processed:job.processed});if(job.done)return;if(job.processed>=seconds-1e-8||['ready','paused','ended'].includes(job.local.game.phase)){job.local.remainder=finalRemainder;job.latest=job.local.snapshot();job.finish({});return;}job.timer=setTimeout(chunk,0);}catch(error){job.finish({error:String(error)});}};
    if(show)this.busyUI(true,{processed:job.processed,total:seconds,fallback:true});job.timer=setTimeout(chunk,0);
   };
   const watch=()=>{clearTimeout(job.watchdog);job.watchdog=setTimeout(fallback,8000);};
   if(show)this.busyUI(true,{processed:0,total:seconds});
   try{job.worker=new Worker('autoplay-worker.js?v=20261109-turtle2');job.worker.onmessage=e=>{if(job.done)return;const data=e.data||{};publish(data);if(job.done)return;if(data.error){fallback();return;}if(data.type==='progress'){watch();return;}job.finish({});};job.worker.onerror=fallback;job.worker.onmessageerror=fallback;watch();job.worker.postMessage({snapshot:job.latest,seconds});}catch{fallback();}
  });
 }
 async tick(report=false){
  if(!this.pilot?.active||this.busy)return;
  if(!this.claim()){const v=this.read();if(v&&v.savedAt>this.at)this.load(v);return;}
  const now=Date.now(),seconds=Math.min(86400,Math.max(0,(now-this.at)/1000)),p=this.pilot,g=p.game,before={time:g.time,kills:g.kills,gold:g.runGold},running=!['ready','paused','ended'].includes(g.phase);let outcome=null;
  if(seconds>8&&running){const token={};this.busyToken=token;this.busy=true;
   try{outcome=await this.catchUp(p,seconds,true);if(outcome.abandoned||this.pilot!==p)return;this.pilot=window.FrontAutoPilot.restore(outcome.snapshot,this.events);this.apply(this.pilot);
    // Calculation wall time must not create a second catch-up backlog.
    this.at=Date.now();
   }finally{if(this.busyToken===token){this.busyToken=null;this.busy=false;this.busyUI(false);}}
  }else{p.advance(seconds,{silent:document.hidden||seconds>2});this.at=now;}
  if((report||seconds>8)&&running){const after=this.pilot.game,left=outcome?Math.max(0,Math.ceil(outcome.total-outcome.processed)):0;this.message(`부재중 작전 ${Math.round(after.time-before.time)}초 반영 · +${after.kills-before.kills} 처치 · +${Math.floor(after.runGold-before.gold)} 골드${after.phase==='ended'?' · 작전 종료':''}${outcome?.skipped&&left?` · 미계산 ${left}초 건너뛰고 계속`:outcome?.error?' · 계산 오류로 마지막 반영 지점부터 계속':''}`);}
  if(report||outcome)this.save();else if(now-this.saved>10000)this.scheduleSave();
 }
 release(){
  const catching=this.busy;if(catching){this.catchup?.finish({abandoned:true});this.busyToken=null;this.busy=false;this.busyUI(false);}
  if(this.pilot&&this.owner&&!catching){const gap=Math.max(0,(Date.now()-this.at)/1000);if(gap<=.25){this.pilot.advance(gap,{silent:true});this.at=Date.now();}this.save();}
  try{const v=JSON.parse(this.storage.getItem(this.leaseKey)||'null');if(v?.id===this.id)this.storage.removeItem(this.leaseKey);}catch{}this.owner=false;
 }
 detach(){this.release();this.pilot=null;}
}
window.FrontAutoSession=FrontAutoSession;
})();
