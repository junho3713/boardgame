/* Sample-based combat mixer. Files are local and decoded only after a user gesture. */
((root)=>{'use strict';
const SOUNDS={
 upgradeOpen:{file:'upgrade-cards-pop',ext:'wav',gain:.59,gap:0,priority:3,phase:'choice'},
 bikeRaider:{file:'bike-rev',ext:'wav',gain:.32,gap:.6,priority:2},
 bladeGuard:{file:'blade-swish',ext:'wav',gain:.28,gap:.12,priority:1},
 slotBlank:{file:'lucky-blank',ext:'wav',gain:.22,gap:.18,priority:1},
 slotSpin:{file:'lucky-spin',ext:'wav',gain:.24,gap:.18,priority:2},
 jackpot:{file:'lucky-jackpot',ext:'wav',gain:.46,gap:.35,priority:3},
 flame:{file:'flame',ext:'wav',gain:.40,gap:.18,priority:2},
 rifle:{file:'rifle',gain:.38,gap:.04,priority:1,revision:2},
 shotgun:{file:'shotgun',gain:.33,gap:.05,priority:1},
 shotgunReload:{file:'shotgun-reload',gain:.23,gap:.08,priority:1},
 machinegun:{file:'machinegun',gain:.29,gap:.035,priority:1,revision:2},
 machinegunBurst:{file:'machinegun-user-burst',ext:'wav',gain:.29,gap:.035,priority:1},
 guntruck:{file:'truck',gain:.36,gap:.045,priority:1},
 radioRoll:{file:'radio-roll',ext:'wav',gain:.37,gap:.12,priority:1},
 radioWarning:{file:'radio-warning',ext:'wav',gain:.55,gap:.4,priority:4},
 sniper:{file:'sniper',gain:.59,gap:.09,priority:2,revision:3},
 sniperSuppressed:{file:'sniper-suppressed',gain:.59,gap:.09,priority:2},
 crimsonAce:{file:'tank',gain:.7,gap:.1,priority:3},
 tank:{file:'tank',gain:.65,gap:.1,priority:3},
 tankBlast:{file:'tank-shell-blast',ext:'wav',gain:.50,gap:.11,priority:3},
 rocket:{file:'rocket',gain:.58,gap:.08,priority:2,revision:2},
 mortar:{file:'mortar-launch',gain:.56,gap:.09,priority:3},
 impact:{file:'impact',gain:.58,gap:.07,priority:3},
 artillery:{file:'artillery',gain:.78,gap:.12,priority:4}
};
class FrontAudio{
 constructor({contextFactory,fetcher,onStatus=()=>{}}={}){
  this.contextFactory=contextFactory||(()=>{const AC=root.AudioContext||root.webkitAudioContext;return AC?new AC():null;});
  this.fetcher=fetcher||((url)=>root.fetch(url));this.onStatus=onStatus;this.context=null;this.buffers=new Map();this.voices=new Set();this.lastKind=new Map();this.volume=.65;this.muted=false;this.phase='ready';this.loading=null;this.failures=0;this.played=0;this.dropped=0;
 }
 async unlock(){
  try{
   if(!this.context){
    this.context=this.contextFactory();if(!this.context){this.onStatus('unsupported');return;}
    const c=this.context;this.master=c.createGain();this.master.gain.value=this.muted?0:this.volume*.65;
    this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.knee.value=18;this.compressor.ratio.value=6;this.compressor.attack.value=.003;this.compressor.release.value=.18;
    this.compressor.connect(this.master);this.master.connect(c.destination);
   }
   // Called directly from start/resume/toggle, before awaiting a fetch.
   if(this.context.state==='suspended')await this.context.resume();
   if(!this.loading){this.onStatus('loading');this.loading=this.load();}
   await this.loading;
  }catch{this.onStatus('unavailable');}
 }
 async load(){
  await Promise.all(Object.entries(SOUNDS).map(async([key,s])=>{
   try{const response=await this.fetcher(`assets/sfx/${s.file}.${s.ext||'mp3'}${s.revision?'?v='+s.revision:''}`);if(!response.ok)throw new Error('audio unavailable');const bytes=await response.arrayBuffer();this.buffers.set(key,await this.context.decodeAudioData(bytes));}
   catch{this.failures++;}
  }));
  this.onStatus(this.failures?'partial':'ready');
 }
 setVolume(value){const n=Number(value);this.volume=Number.isFinite(n)?Math.max(0,Math.min(1,n)):.65;this.applyVolume();}
 setMuted(value){this.muted=!!value;this.applyVolume();if(this.muted)this.stop();}
 applyVolume(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume*.65,this.context.currentTime,.015);}
 sync(phase){if(this.phase!==phase){this.phase=phase;if(phase!=='playing')this.stop();}}
 stop(){for(const v of [...this.voices]){try{v.source.stop();}catch{}this.release(v);}this.lastKind.clear();}
 release(v){if(!this.voices.delete(v))return;v.source.disconnect();v.gain.disconnect();if(v.pan)v.pan.disconnect();}
 fire(unit,listener){
  if(unit.team===0&&unit.type==='guntruck')return this.play('radioRoll',unit,listener);
  if(unit.luckySound==='bossKiller')return this.play('rocket',unit,listener,{rate:.68,priorityBoost:2,channel:'bossKiller'});
  if(unit.luckySound)return this.play(unit.luckySound,unit,listener);
  if(unit.team===0&&unit.type==='rifle'&&!unit.ultimate)return this.play('shotgun',unit,listener,{exactRate:true});
  if(unit.team===0&&unit.type==='sniper')return this.play('sniperSuppressed',unit,listener);
  if(unit.team===0&&unit.type==='machinegun')return this.play('machinegunBurst',unit,listener);
  return this.play(unit.sword||unit.type==='leader'&&unit.appearance==='shion'?'bladeGuard':unit.flame||unit.type==='leader'&&unit.appearance==='blaze'?'flame':unit.type==='leader'||unit.type==='lucky'?'rifle':({commando:'machinegun',spectre:'sniper',titan:'rocket',pirateCannon:'mortar'})[unit.type]||unit.type,unit,listener,unit.ultimate?{channel:'ultimate',priorityBoost:2,exactRate:true}:{});
 }
 reload(event,listener){
  const sample=this.buffers.get('shotgunReload');
  if(!sample)return false;
  const delay=Math.min(.13,event.duration*.12);
  return this.play('shotgunReload',event,listener,{
   rate:sample.duration/(event.duration-delay),exactRate:true,delay,channel:`reload-${event.id}`
  });
 }
 impact(event,listener){return this.play('impact',event,listener,{rate:event.armor?1.9:1.6,gain:.15,priorityBoost:-2,channel:'hitFeedback'});}
 radioWarning(event,listener){return this.play('radioWarning',event,listener,{exactRate:true});}
 radioImpact(event,listener){
  if(event.strike==='nuke')return this.play('artillery',event,listener,{channel:'radioNuke',rate:.72,priorityBoost:2,gain:.93});
  if(event.strike==='incendiary')return this.play('impact',event,listener,{channel:'radioFire',rate:.79,gain:.76});
  return this.play('tankBlast',event,listener,{channel:'radioMissile',rate:.93,gain:.85});
 }
 explosion(event,listener){
  if(event.kind==='tank'&&event.team===0)return this.play('tankBlast',event,listener,{exactRate:true});
  const key=['artillery','bossKiller','evolution','pirateCannon'].includes(event.kind)?'artillery':'impact';
  return this.play(key,event,listener,{rate:event.kind==='bossKiller'?.68:event.kind==='evolution'?1.3:event.kind==='tank'?.8:event.kind==='mortar'?.85:event.kind==='rocket'?1.12:1});
 }
 upgradeOpen(){return this.play('upgradeOpen',undefined,undefined,{exactRate:true});}
 play(key,position={x:0,y:0},listener={x:0,y:0},options={}){
  const c=this.context,s=SOUNDS[key],preview=!!options.preview;
  if(!s||!c||c.state!=='running'||this.muted||!this.volume||(!preview&&this.phase!==(s.phase||'playing'))||!this.buffers.has(key))return false;
  const distance=preview?0:Math.hypot(position.x-listener.x,position.y-listener.y);if(distance>950)return false;
  const now=c.currentTime,channel=options.channel||key,stamp=this.lastKind.get(channel);
  if(!preview&&stamp!==undefined&&now-stamp<s.gap){this.dropped++;return false;}
  // Keep room for impacts even in a large infantry firefight. Prefer nearby sounds.
  const priority=s.priority+(options.priorityBoost||0)+(distance<260?.5:0);
  if(this.voices.size>=18||(priority<2&&[...this.voices].filter(v=>v.priority<2).length>=12)){
   const victim=[...this.voices].sort((a,b)=>a.priority-b.priority||a.started-b.started)[0];
   if(!victim||victim.priority>=priority){this.dropped++;return false;}
   try{victim.source.stop();}catch{}this.release(victim);
  }
  const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner?c.createStereoPanner():null;
  source.buffer=this.buffers.get(key);source.playbackRate.value=(options.rate||1)*(options.exactRate?1:1+(Math.random()-.5)*.07);
  const attenuation=Math.pow(Math.max(0,1-distance/1000),1.45),teamScale=position.team===1?.72:1;
  gain.gain.value=s.gain*attenuation*teamScale*(options.gain??1);source.connect(gain);
  if(pan){pan.pan.value=preview?0:Math.max(-.85,Math.min(.85,(position.x-listener.x)/550));gain.connect(pan);pan.connect(this.compressor);}else gain.connect(this.compressor);
  const voice={source,gain,pan,priority,started:now};this.voices.add(voice);source.onended=()=>this.release(voice);this.lastKind.set(channel,now);source.start(now+(options.delay||0));this.played++;return true;
 }
 async audition(key){await this.unlock();this.stop();return this.play(key,undefined,undefined,{preview:true});}
 diagnostics(){return{state:this.context?.state||'locked',loaded:this.buffers.size,failures:this.failures,active:this.voices.size,played:this.played,dropped:this.dropped,muted:this.muted,volume:this.volume};}
}
root.FrontAudio=FrontAudio;
if(typeof module!=='undefined')module.exports={FrontAudio,SOUNDS};
})(typeof window!=='undefined'?window:globalThis);
