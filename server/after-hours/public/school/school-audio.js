export function schoolAudio(){
  let ctx,master,bed,noise,on=true;
  function wake(){
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    if(!ctx){ctx=new C();master=ctx.createGain();master.gain.value=on?.54:0;master.connect(ctx.destination);
      noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=noise.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const rain=ctx.createBufferSource();rain.buffer=noise;rain.loop=true;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;
      bed=ctx.createGain();bed.gain.value=.032;rain.connect(filter).connect(bed).connect(master);rain.start();}
    if(ctx.state==='suspended'&&!document.hidden)ctx.resume().catch(()=>{});
  }
  function tone(hz,to,duration,volume,delay=0,type='sine'){
    if(!ctx||!on)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;
    o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(to,t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function rustle(hz,duration,volume,delay=0){if(!ctx||!on)return;const t=ctx.currentTime+delay,n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    n.buffer=noise;f.type='bandpass';f.frequency.value=hz;f.Q.value=.8;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    n.connect(f).connect(g).connect(master);n.start(t);n.stop(t+duration);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};}
  function sound(kind){
    if(kind==='step'){rustle(330,.14,.16);tone(86,48,.11,.085);}
    if(kind==='slide')rustle(820,.5,.15);
    if(kind==='key'){tone(1180,810,.17,.12);tone(770,650,.2,.10,.07);}
    if(kind==='click')tone(210,93,.057,.14,0,'triangle');
    if(kind==='bell'){tone(587,584,1,.13);tone(740,738,.9,.085,.22);}
    if(kind==='wrong'){tone(134,103,.19,.10,0,'triangle');}
    if(kind==='tape')rustle(1700,.24,.14);
  }
  function field(index){
    if(index===2){tone(1660,1620,.54,.16);tone(2220,2150,.45,.13,.21);}
    if(index===0)for(const delay of [0,.28,.51]){tone(190,55,.15,.33,delay);rustle(450,.11,.14,delay);}
    if(index===1){rustle(2600,.35,.31);rustle(1900,.37,.27,.48);}
  }
  function enable(v){on=v;if(ctx)master.gain.setTargetAtTime(on?.54:0,ctx.currentTime,.035);}
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend().catch(()=>{});else if(on)wake();});
  return {wake,enable,sound,field,ambience(dark){if(ctx)bed.gain.setTargetAtTime(dark?.043:.027,ctx.currentTime,.14);}};
}
