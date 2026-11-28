importScripts('waves-survival.js?v=178','waves-defense.js?v=178','room-campaign.js?v=20261128-kraken-health1','battle-systems.js?v=20261128-tier-rotation1','engine.js?v=20261128-boss-charge1','assassin.js?v=20261128-ninja-appearance1','rotation-bosses.js?v=20261128-kraken-health1','evolution-combat.js?v=20261128-direct-aim1','block-mines.js?v=20261126-threat-ranks1','roster-combat.js?v=20261127-radio-three-pairs1','lucky-flash.js?v=20261127-finale-fusion1','pirate-cannon.js?v=20261127-stack-ranged1','bubble-octopus.js?v=20261128-tier-rotation1','support-drone.js?v=20261127-captain-stack2','combat-drone.js?v=20261128-direct-aim1','field-supplies.js?v=20261128-ambush-tells1','support-toys.js?v=20261127-captain-stack1','evolution-links.js?v=20261126-drone-pair2','sword-boss.js?v=20261128-tier-rotation1','two-star.js?v=20261128-tier-rotation1','autoplay.js?v=20261128-boss-charge1');
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
