import {createBathAudio} from '../bath-audio.js';
export function schoolAudio(){
  let ctx,master,bed,noise,on=true,taps,tankHiss,boots,tape;
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
  function tone(hz,to,duration,volume,delay=0,type='sine',output=master){
    if(!ctx||!on)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;
    o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(to,t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(output);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function rustle(hz,duration,volume,delay=0,output=master){if(!ctx||!on)return;const t=ctx.currentTime+delay,n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    n.buffer=noise;f.type='bandpass';f.frequency.value=hz;f.Q.value=.8;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    n.connect(f).connect(g).connect(output);n.start(t);n.stop(t+duration);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};}
  function guardStep(dx,dz,yaw,muffled){
    const distance=Math.hypot(dx,dz);
    if(!ctx||!on||distance>14)return;
    if(!boots){boots=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();boots.connect(master);}
    if(boots.pan)boots.pan.value=Math.max(-1,Math.min(1,(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/Math.max(.5,distance)));
    const gain=(muffled?.58:1)/(1+.065*distance*distance);
    tone(116,44,.19,.36*gain,0,'sine',boots);rustle(muffled?410:780,.12,.24*gain,.038,boots);
    tone(940,740,.07,.046*gain,.10,'triangle',boots);
  }
  function sound(kind){
    if(kind==='step'){rustle(330,.14,.16);tone(86,48,.11,.085);}
    if(kind==='tileStep'){rustle(680,.12,.18);tone(155,74,.09,.11);tone(145,85,.16,.039,.09);}
    if(kind==='hinge'){rustle(1050,.29,.12);tone(540,386,.24,.038,0,'triangle');}
    if(kind==='china'){rustle(930,.30,.11);tone(1200,710,.09,.075,.26);}
    if(kind==='flush'){rustle(680,1.42,.48);rustle(270,.93,.39,.25);tone(125,52,.62,.075,.8);}
    if(kind==='rattle'){tone(1390,840,.18,.14,.71);tone(1190,780,.22,.11,1.03);}
    if(kind==='slide')rustle(820,.5,.15);
    if(kind==='key'){tone(1180,810,.17,.12);tone(770,650,.2,.10,.07);}
    if(kind==='click')tone(210,93,.057,.14,0,'triangle');
    if(kind==='locker'){rustle(810,.25,.13);tone(310,110,.19,.11,.12,'triangle');}
    if(kind==='spotted'){tone(235,185,.22,.10,0,'triangle');tone(175,92,.34,.15,.19);}
    if(kind==='bell'){tone(587,584,1,.13);tone(740,738,.9,.085,.22);}
    if(kind==='wrong'){tone(134,103,.19,.10,0,'triangle');}
    if(kind==='tape')rustle(1700,.24,.14);
  }
  function cassette(){
    if(!tape)tape=new Audio(new URL('handover-tape.mp3',import.meta.url).href);
    tape.muted=!on;return tape;
  }
  function enable(v){on=v;if(tape)tape.muted=!v;if(ctx)master.gain.setTargetAtTime(on?.54:0,ctx.currentTime,.035);}
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend().catch(()=>{});else if(on)wake();});
  function plumbing(s,player,yaw,inside,audible){
    if(!ctx||(!taps&&!inside))return;
    if(!taps){
      taps=[4.48,5.92].map(z=>createBathAudio(ctx,{x:-13.36,z,output:master}));
      const src=ctx.createBufferSource(),band=ctx.createBiquadFilter();src.buffer=noise;src.loop=true;
      band.type='bandpass';band.frequency.value=1480;band.Q.value=.85;tankHiss=ctx.createGain();tankHiss.gain.value=0;
      src.connect(band).connect(tankHiss).connect(master);src.start();
    }
    taps.forEach((update,i)=>update(s.basins[i],player,yaw,inside,audible));
    const filling=s.tanks.some((v,i)=>v<.995&&!s.flushing[i]&&(i===0||s.supply));
    const distance=Math.hypot(player.x+11,player.z-1.12);
    tankHiss.gain.setTargetAtTime(filling&&audible?(inside?.16:.015)/(1+.30*distance*distance):0,ctx.currentTime,.08);
  }
  return {wake,enable,sound,cassette,guardStep,plumbing,ambience(dark){if(ctx)bed.gain.setTargetAtTime(dark?.043:.027,ctx.currentTime,.14);}};
}
