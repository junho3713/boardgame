'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {FrontAudio} = require('./public/audio.js');
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

test('the music player switches tracks, resumes the field song, and saves silence for mute or pause', () => {
  let queued;
  let connected = 0;
  class Audio {
    constructor() { this.paused = true; this.currentTime = 0; }
    set src(value) { this.url = value; this.pause(); this.currentTime = 0; }
    get src() { return this.url; }
    addEventListener() {}
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
  assert.equal(player.media.src, 'assets/bgm/maple-toy.mp3');
  assert.equal(player.media.paused, false);
  player.media.currentTime = 31.4;
  player.sync('boss');
  assert.equal(parameter.value, 0);
  queued();
  assert.equal(player.media.src, 'assets/bgm/toy-survival-95bpm.mp3');
  assert.equal(player.media.currentTime, 0);
  assert.ok(Math.abs(parameter.value - .143) < 1e-12);
  player.setMuted(true);
  assert.equal(player.media.paused, true);
  player.setMuted(false);
  player.sync('battle');
  queued();
  assert.equal(player.media.currentTime, 31.4);
  assert.equal(connected, 1);
  player.setVolume(0);
  assert.equal(player.media.paused, true);
  player.setVolume(.11);
  assert.equal(player.media.paused, false);
  player.sync('boss');
  player.sync(null);
  assert.equal(queued, undefined);
  assert.equal(player.media.paused, true);
  player.reset();
  assert.equal(player.media.currentTime, 0);
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
