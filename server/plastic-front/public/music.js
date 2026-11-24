((root) => {
 'use strict';

 const TRACKS = {
  battle: { file: 'maple-toy.mp3', gain: 1 },
  boss: { file: 'toy-survival-95bpm.mp3', gain: 1.30 }
 };
 const DEFAULT_VOLUME = 0.11;

 function musicForBattle(game, hidden = false) {
  if (hidden || !['playing', 'choice', 'resupply'].includes(game.phase)) return null;
  return game.units.some(unit =>
   unit.team !== 0 && unit.hp > 0 && unit.boss && !unit.miniBoss && !unit.roadCaptain
  ) ? 'boss' : 'battle';
 }

 class FrontMusic {
  constructor() {
   this.volume = DEFAULT_VOLUME;
   this.muted = false;
   this.scene = null;
   this.track = null;
   this.battleTime = 0;
   this.timer = null;
   this.blocked = false;
  }

  unlock(context, prime = false) {
   if (!root.Audio) return;
   if (!this.media) {
    this.media = new root.Audio();
    this.media.loop = true;
    this.media.preload = 'none';
    this.media.addEventListener('playing', () => this.applyLevel());
   }
   if (!this.gain && context?.createMediaElementSource) {
    const source = context.createMediaElementSource(this.media);
    this.context = context;
    this.gain = context.createGain();
    this.gain.gain.value = 0;
    source.connect(this.gain);
    this.gain.connect(context.destination);
   }
   this.blocked = false;
   if (prime && !this.scene && this.volume && !this.muted) {
    if (!this.track) this.select('battle');
    // The first play call needs to happen inside the start gesture on Safari.
    this.applyLevel();
    this.play(true);
   } else {
    this.refresh();
   }
  }

  sync(scene) {
   if (scene === this.scene) return;
   this.scene = scene;
   this.refresh();
  }

  setVolume(value) {
   this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;
   this.refresh();
  }

  setMuted(muted) {
   this.muted = muted;
   this.refresh();
  }

  reset() {
   this.scene = null;
   this.refresh();
   this.battleTime = 0;
   if (this.track) this.media.currentTime = 0;
  }

  refresh() {
   if (!this.media) return;
   if (!this.scene || this.muted || !this.volume) {
    this.cancelTransition();
    this.setLevel(0, 0);
    this.media.pause();
    return;
   }
   if (this.track === this.scene) {
    this.cancelTransition();
    this.applyLevel();
    this.play();
   } else if (!this.gain || this.media.paused) {
    this.cancelTransition();
    this.select(this.scene);
    this.play();
   } else if (this.timer === null) {
    this.setLevel(0, 0.05);
    this.timer = root.setTimeout(() => {
     this.timer = null;
     if (this.scene && this.track !== this.scene) this.select(this.scene);
     this.refresh();
    }, 220);
   }
  }

  cancelTransition() {
   if (this.timer === null) return;
   root.clearTimeout(this.timer);
   this.timer = null;
  }

  select(track) {
   if (this.track === 'battle') this.battleTime = this.media.currentTime;
   this.setLevel(0, 0);
   this.track = track;
   this.media.src = `assets/bgm/${TRACKS[track].file}`;
   if (track === 'battle') this.media.currentTime = this.battleTime;
  }

  play(prime = false) {
   if (this.blocked || !this.media.paused) return;
   const src = this.media.src;
   this.media.play().then(() => {
    if (prime && !this.scene && this.media.src === src) this.media.pause();
   }).catch(error => {
    if (error.name !== 'AbortError' && this.media.src === src) this.blocked = true;
   });
  }

  applyLevel() {
   const active = !this.muted && this.scene && this.scene === this.track;
   const level = active ? Math.min(1, this.volume * TRACKS[this.track].gain) : 0;
   this.setLevel(level, 0.12);
  }

  setLevel(level, timeConstant) {
   if (!this.gain) {
    this.media.volume = level;
    return;
   }
   const now = this.context.currentTime;
   const parameter = this.gain.gain;
   parameter.cancelScheduledValues(now);
   if (timeConstant) parameter.setTargetAtTime(level, now, timeConstant);
   else parameter.setValueAtTime(level, now);
  }
 }

 root.FrontMusic = FrontMusic;
 root.frontMusicForBattle = musicForBattle;
 if (typeof module !== 'undefined') module.exports = { FrontMusic, musicForBattle };
})(typeof window !== 'undefined' ? window : globalThis);
