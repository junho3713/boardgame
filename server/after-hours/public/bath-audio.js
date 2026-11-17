import {basinOutflow} from './basin-water.js';

// Independent filtered bands let the same stream change from porcelain hiss to
// a rounder pool splash. The drain can keep sounding after the tap is shut.
export function createBathAudio(ctx) {
  const ear = ctx.createBiquadFilter();
  ear.type = 'lowpass';
  const pan = ctx.createStereoPanner?.();
  if (pan) ear.connect(pan).connect(ctx.destination);
  else ear.connect(ctx.destination);
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
  function band(hz, q) {
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass';
    filter.frequency.value = hz; filter.Q.value = q;
    const gain = ctx.createGain(); gain.gain.value = 0;
    noise.connect(filter).connect(gain).connect(ear);
    return {gain: gain.gain, frequency: filter.frequency};
  }
  const jet = band(3400, .72), splash = band(1200, .95), drain = band(320, 2.3);
  noise.start();
  let nextUpdate = -1;
  return function update(state, player, yaw, inBath, audible) {
    const now = ctx.currentTime;
    if (now < nextUpdate || ctx.state !== 'running') return;
    nextUpdate = now + .045;
    const dx = 7.825 - player.x, dz = -.2 - player.z, distance = Math.hypot(dx, dz);
    const proximity = audible ? 1 / (1 + .53 * distance * distance) : 0;
    const wall = inBath ? 1 : state.bathDoorOpen ? .44 : .17;
    const level = proximity * wall, flow = Number(state.faucetOn), depth = Math.sqrt(state.basinVolume);
    const tune = (param, target) => param.setTargetAtTime(target, now, .075);
    tune(ear.frequency, inBath ? 7400 : state.bathDoorOpen ? 2100 : 680);
    if (pan) tune(pan.pan, Math.max(-1, Math.min(1, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(.8, distance))) * .8);
    tune(jet.gain, level * flow * (.065 + .02 * (1 - depth)));
    tune(splash.gain, level * flow * (state.basinWetting ? .055 : .17) * (1 + .10 * Math.sin(now * 15.7)));
    tune(splash.frequency, state.basinWetting ? 760 : 2100 - 1380 * depth);
    const swallowed = Math.min(1, basinOutflow(state) / .18);
    tune(drain.gain, level * swallowed * (.16 + .06 * Math.sin(now * 11.9) * Math.sin(now * 3.7)));
    tune(drain.frequency, 270 + 100 * depth + 65 * Math.sin(now * 9.3));
  };
}
