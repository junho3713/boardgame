importScripts('waves-survival.js?v=178','waves-defense.js?v=178','room-campaign.js?v=20261108-midpace2','engine.js?v=20261109-toys2','evolution-combat.js?v=20261109-toys2','field-supplies.js?v=20261109-toys2','support-toys.js?v=20261109-toys2','evolution-links.js?v=20261108-midpace2','sword-boss.js?v=20261108-midpace2','two-star.js?v=20261108-midpace2','autoplay.js?v=20261109-toys2');
let operation=0;
self.onmessage=e=>{
 const id=++operation;let p,done=0,total=Math.min(86400,Math.max(0,Number(e.data.seconds)||0)),lastReport=0;
 try{p=FrontAutoPilot.restore(e.data.snapshot);}catch(error){self.postMessage({error:String(error)});return;}
 const combined=p.remainder+total,finalRemainder=combined-Math.floor((combined+1e-9)/.05)*.05;
 const report=type=>self.postMessage({type,snapshot:p.snapshot(),processed:done,total});
 report('progress');
 const chunk=()=>{if(id!==operation)return;try{const started=Date.now();let steps=0;while(done<total&&steps<20&&Date.now()-started<20){if(['ready','paused','ended'].includes(p.game.phase))break;const seconds=Math.min(.05,total-done);p.advance(seconds,{silent:true});done+=seconds;steps++;}const finished=done>=total-1e-8||['ready','paused','ended'].includes(p.game.phase);if(finished){p.remainder=finalRemainder;report('done');return;}if(Date.now()-lastReport>=250){report('progress');lastReport=Date.now();}setTimeout(chunk,0);}catch(error){self.postMessage({error:String(error),snapshot:p.snapshot(),processed:done,total});}};
 setTimeout(chunk,0);
};
