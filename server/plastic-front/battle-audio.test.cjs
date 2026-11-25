'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {FrontAudio,SOUNDS} = require('./public/audio.js');
const {musicForBattle} = require('./public/music.js');

test('main bosses and living boss pairs change the music without switching for mid-bosses', () => {
  const units = [
    {team: 2, hp: 100, boss: true, miniBoss: true},
    {team: 2, hp: 100, boss: true, roadCaptain: true},
  ];
  const game = {phase: 'playing', units};
  assert.equal(musicForBattle(game), 'battle');
  units.push({team: 2, hp: 100, boss: true}, {team: 2, hp: 100, boss: true, finalBoss: true});
  assert.equal(musicForBattle(game), 'boss');
  units[2].hp = 0;
  game.phase = 'choice';
  assert.equal(musicForBattle(game), 'boss');
  units[3].hp = 0;
  assert.equal(musicForBattle(game), 'battle');
  assert.equal(musicForBattle(game, true), null);
  for (const phase of ['ready', 'paused', 'ended']) {
    assert.equal(musicForBattle({...game, phase}), null);
  }
});

test('the music player alternates field songs, resumes them after bosses, and resets to the opener', () => {
  let queued;
  let connected = 0;
  class Audio {
    constructor() { this.paused = true; this.currentTime = 0; this.listeners = {}; }
    set src(value) { this.url = value; this.pause(); this.currentTime = 0; this.ended = false; }
    get src() { return this.url; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    finish() { this.ended = true; this.pause(); this.listeners.ended(); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const window = {
    Audio,
    setTimeout(callback) { queued = callback; return 1; },
    clearTimeout() { queued = undefined; },
  };
  runInNewContext(readFileSync(require.resolve('./public/music.js'), 'utf8'), {window});
  const parameter = {
    value: 0,
    cancelScheduledValues() {},
    setTargetAtTime(value) { this.value = value; },
    setValueAtTime(value) { this.value = value; },
  };
  const context = {
    currentTime: 3,
    createMediaElementSource() { connected++; return {connect() {}}; },
    createGain() { return {gain: parameter, connect() {}}; },
    destination: {},
  };
  const player = new window.FrontMusic();
  player.sync('battle');
  assert.equal(player.media, undefined);
  player.unlock(context);
  assert.equal(player.media.src, 'assets/bgm/battle-opening.mp3');
  assert.equal(player.media.loop, false);
  assert.equal(player.media.paused, false);
  player.media.currentTime = 137;
  player.media.finish();
  assert.equal(player.media.src, 'assets/bgm/maple-toy.mp3');
  assert.equal(player.media.currentTime, 0);
  assert.equal(player.media.paused, false);
  player.media.currentTime = 31.4;
  player.sync('boss');
  assert.equal(parameter.value, 0);
  queued();
  assert.equal(player.media.src, 'assets/bgm/toy-survival-95bpm.mp3');
  assert.equal(player.media.loop, true);
  assert.equal(player.media.currentTime, 0);
  assert.ok(Math.abs(parameter.value - .143) < 1e-12);
  player.setMuted(true);
  assert.equal(player.media.paused, true);
  player.setMuted(false);
  player.sync('battle');
  queued();
  assert.equal(player.media.src, 'assets/bgm/maple-toy.mp3');
  assert.equal(player.media.currentTime, 31.4);
  assert.equal(connected, 1);
  player.setVolume(0);
  assert.equal(player.media.paused, true);
  player.setVolume(.11);
  assert.equal(player.media.paused, false);
  player.media.finish();
  assert.equal(player.media.src, 'assets/bgm/battle-opening.mp3');
  assert.equal(player.media.currentTime, 0);
  player.media.finish();
  assert.equal(player.media.src, 'assets/bgm/maple-toy.mp3');
  player.sync('boss');
  player.sync(null);
  assert.equal(queued, undefined);
  assert.equal(player.media.paused, true);
  player.reset();
  player.unlock(context, true);
  assert.equal(player.media.src, 'assets/bgm/battle-opening.mp3');
  assert.equal(player.media.currentTime, 0);
});

test('the Retona spin uses the original cue at a higher mix level and skips off-screen sources', () => {
  const audio = new FrontAudio(), listener = {x:0,y:0};
  audio.play = (...args) => args;
  const cue = {type:'lucky',team:0,x:400,y:0,luckySound:'slotSpin'};
  assert.deepEqual(audio.fire(cue,listener),['slotSpin',cue,listener,{exactRate:true,distantGain:.32}]);
  assert.equal(SOUNDS.slotSpin.file,'lucky-spin');
  assert.ok(SOUNDS.slotSpin.gain>.75&&SOUNDS.slotSpin.priority>SOUNDS.machinegunBurst.priority);
  assert.equal(audio.fire({...cue,x:951},listener),false);
  assert.equal(audio.fire({...cue,luckySound:'jackpot'},listener)[0],'jackpot');
});

test('the allied shotgun uses its own shot and fits the reload sample to the engine timer', () => {
  const audio = new FrontAudio();
  audio.play = (...args) => args;
  assert.equal(audio.fire({type: 'rifle', team: 0})[0], 'shotgun');
  assert.equal(audio.fire({type: 'rifle', team: 1})[0], 'rifle');
  audio.buffers.set('shotgunReload', {duration: 1.66});
  const event = {id: 3, duration: 1.8, x: 10, y: 20, team: 0};
  const [key, position, , options] = audio.reload(event);
  assert.equal(key, 'shotgunReload');
  assert.equal(position, event);
  assert.equal(options.channel, 'reload-3');
  assert.equal(options.exactRate, true);
  assert.ok(Math.abs(options.delay + 1.66 / options.rate - event.duration) < 1e-12);
});

test('allied tank shell impacts use the selected blast while firing and enemy impacts keep their own cues', () => {
  const audio = new FrontAudio();
  audio.play = (...args) => args;
  const impact = {kind: 'tank', team: 0, x: 100, y: 120};
  const camera = {x: 90, y: 100};
  assert.deepEqual(audio.explosion(impact, camera), ['tankBlast', impact, camera, {exactRate: true}]);
  assert.equal(audio.fire({type: 'tank', team: 0}, camera)[0], 'tank');
  assert.equal(audio.explosion({...impact, team: 1}, camera)[0], 'impact');
  assert.equal(audio.explosion({...impact, kind: 'rocket'}, camera)[0], 'impact');
});

test('tactical nuke impacts stay audible at long range and through the reward they trigger', () => {
  const audio = new FrontAudio();
  const sample = {duration: 1.58};
  audio.buffers.set('radioNuke', sample);
  audio.buffers.set('rifle', {duration: .2});
  const port = {connect() {}, disconnect() {}};
  audio.context = {
    state: 'running',
    currentTime: 4,
    createBufferSource() {
      return {...port, playbackRate: {}, start(at) { this.startedAt = at; }, stop() { this.stopped = true; }};
    },
    createGain: () => ({...port, gain: {}}),
    createStereoPanner: () => ({...port, pan: {}}),
  };
  audio.sync('playing');
  audio.fire({type: 'rifle', team: 1, x: 0, y: 0});
  const [rifle] = audio.voices;
  const farImpact = {strike: 'nuke', team: 0, x: 2500, y: 0};
  assert.equal(audio.radioImpact(farImpact), true);
  const nuke = [...audio.voices].find(voice => voice.channel === 'radioNuke');
  assert.equal(nuke.source.buffer, sample);
  assert.equal(nuke.source.playbackRate.value, 1);
  assert.ok(nuke.gain.gain.value > .5);
  assert.ok(nuke.pan.pan.value < .4);
  audio.sync('choice');
  assert.equal(rifle.source.stopped, true);
  assert.ok(audio.voices.has(nuke));
  assert.equal(nuke.source.stopped, undefined);
  audio.context.currentTime += .2;
  assert.equal(audio.radioImpact({...farImpact, screenFlash: false}), true);
  assert.equal(audio.voices.size, 2);
  audio.sync('paused');
  assert.equal(nuke.source.stopped, true);
  assert.equal(audio.voices.size, 0);
});
