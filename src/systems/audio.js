import { Save } from './save.js';

// Everything is synthesized with WebAudio: no audio files to load, tiny footprint.

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [0, 2, 4, 7, 9]; // major pentatonic, used for rising catch chimes

// Song: 8 bars of 8 eighth-notes. Chords as MIDI roots + chord tones.
const CHORDS = [
  [48, [60, 64, 67]], // C
  [45, [57, 60, 64]], // Am
  [41, [57, 60, 65]], // F
  [43, [55, 59, 62]], // G
  [48, [60, 64, 67]], // C
  [40, [55, 59, 64]], // Em
  [41, [57, 60, 65]], // F
  [43, [55, 59, 62]], // G
];
// [step, midi, lengthInSteps]
const MELODY = [
  [[0, 76, 2], [2, 79, 2], [4, 81, 1], [5, 79, 1], [6, 76, 2]],
  [[0, 72, 2], [2, 76, 2], [4, 74, 4]],
  [[0, 77, 2], [2, 81, 2], [4, 79, 1], [5, 77, 1], [6, 76, 2]],
  [[0, 74, 3], [4, 71, 2], [6, 74, 2]],
  [[0, 76, 1], [1, 77, 1], [2, 79, 2], [4, 84, 2], [6, 81, 2]],
  [[0, 79, 2], [2, 76, 2], [4, 71, 2], [6, 72, 2]],
  [[0, 74, 2], [2, 77, 2], [4, 76, 2], [6, 74, 2]],
  [[0, 71, 2], [2, 74, 2], [4, 72, 4]],
];
// Sparse counter-melody for the B pass so the loop doesn't get tiresome.
const COUNTER = [
  [[4, 79, 2]], [[2, 76, 2]], [[4, 81, 2]], [[2, 79, 2], [6, 74, 1]],
  [[4, 84, 2]], [[2, 79, 2]], [[4, 77, 2]], [[0, 74, 2], [4, 79, 2]],
];

class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicOn = false;
    this.energetic = false;
    this.duck = 1;
    this._step = 0;
    this._nextTime = 0;
    this._timer = null;
    this._lastPlayed = {};
  }

  /** Must be called from a user gesture (iOS/Android autoplay rules). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      // Compressor evens out overlapping chimes, make-up gain brings the level up for small
      // phone speakers, and a fast limiter at the end prevents clipping.
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 12;
      comp.ratio.value = 5;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      const makeup = this.ctx.createGain();
      makeup.gain.value = 2.6;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -1.5;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(comp).connect(makeup).connect(limiter).connect(this.ctx.destination);
      this._noise = this._makeNoise();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = Save.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.03);
    // Gentler curve than squared so mid slider positions aren't nearly silent.
    this.musicBus.gain.setTargetAtTime(Math.pow(s.music, 1.4) * 0.8 * this.duck, t, 0.08);
    this.sfxBus.gain.setTargetAtTime(Math.pow(s.sfx, 1.4) * 1.3, t, 0.03);
  }

  setDuck(v) {
    this.duck = v;
    this.applyVolumes();
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  // ---------- music ----------

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this._step = 0;
    this._nextTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._schedule(), 30);
  }

  stopMusic() {
    this.musicOn = false;
    clearInterval(this._timer);
  }

  setEnergetic(on) { this.energetic = on; }

  _schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const bpm = this.energetic ? 132 : 112;
    const stepDur = 60 / bpm / 2;
    while (this._nextTime < this.ctx.currentTime + 0.15) {
      this._playStep(this._step, this._nextTime, stepDur);
      this._nextTime += stepDur;
      this._step = (this._step + 1) % (64 * 2);
    }
  }

  _playStep(step, t, sd) {
    const pass = Math.floor(step / 64); // 0 = A pass (melody), 1 = B pass (counter-melody)
    const bar = Math.floor(step / 8) % 8;
    const s = step % 8;
    const [root, tones] = CHORDS[bar];
    const out = this.musicBus;

    // Plucked bass on beats 1 and 3.
    if (s === 0 || s === 4) this._pluck(midiHz(root + (s === 4 ? 7 : 0)), t, 0.32, 0.22, out);
    if (this.energetic && (s === 2 || s === 6)) this._pluck(midiHz(root + 12), t, 0.16, 0.1, out);

    // Soft marimba arpeggio.
    const arp = [0, 1, 2, 1, 0, 1, 2, 1];
    const tone = tones[arp[s]] + (s >= 4 && s % 2 === 0 ? 12 : 0);
    this._marimba(midiHz(tone), t, s % 2 === 0 ? 0.08 : 0.05, out);

    // Light percussion.
    if (s % 2 === 1 || this.energetic) this._shaker(t, s % 4 === 3 ? 0.05 : 0.03, out);
    if (this.energetic && s % 2 === 0) this._kick(t, 0.12, out);
    else if (s === 0) this._kick(t, 0.09, out);

    // Bells.
    const notes = pass === 0 ? MELODY[bar] : COUNTER[bar];
    for (const [st, m, len] of notes) {
      if (st === s) this._bell(midiHz(m), t, len * sd * 1.6, pass === 0 ? 0.11 : 0.08, out);
    }
  }

  // ---------- instruments ----------

  _env(gainNode, t, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  _osc(type, freq, t, dur, peak, out, attack = 0.005) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    this._env(g, t, peak, attack, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }

  _marimba(f, t, v, out) {
    this._osc('sine', f, t, 0.35, v, out, 0.003);
    this._osc('sine', f * 4, t, 0.06, v * 0.35, out, 0.002);
  }

  _bell(f, t, dur, v, out) {
    this._osc('sine', f, t, Math.max(0.4, dur), v, out, 0.004);
    this._osc('sine', f * 2.76, t, 0.25, v * 0.25, out, 0.002);
    this._osc('sine', f * 5.4, t, 0.1, v * 0.12, out, 0.001);
  }

  _pluck(f, t, dur, v, out) {
    const o = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(f * 6, t);
    filt.frequency.exponentialRampToValueAtTime(f * 1.2, t + dur);
    this._env(g, t, v, 0.004, dur);
    o.connect(filt).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseBurst(t, dur, v, out, type = 'highpass', freq = 6000, freqEnd = null, q = 0.8) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain();
    this._env(g, t, v, Math.min(0.02, dur * 0.3), dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.05);
  }

  _shaker(t, v, out) { this._noiseBurst(t, 0.05, v, out, 'highpass', 7000); }

  _kick(t, v, out) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    this._env(g, t, v, 0.003, 0.14);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.2);
  }

  // ---------- sound effects ----------

  _ok(name, minGapMs = 30) {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    const now = performance.now();
    if (now - (this._lastPlayed[name] || 0) < minGapMs) return false;
    this._lastPlayed[name] = now;
    return true;
  }

  /** Soft pop + chime that climbs the pentatonic scale with the combo. */
  catch(combo = 0) {
    if (!this._ok('catch', 20)) return;
    const t = this.ctx.currentTime;
    const out = this.sfxBus;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.06);
    this._env(g, t, 0.32, 0.004, 0.09);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.15);
    const idx = Math.min(combo, 14);
    const m = 72 + Math.floor(idx / 5) * 12 + PENTA[idx % 5];
    this._bell(midiHz(m), t + 0.02, 0.35, 0.17, out);
  }

  rare() {
    if (!this._ok('rare')) return;
    const t = this.ctx.currentTime;
    [79, 83, 86, 91].forEach((m, i) => this._bell(midiHz(m), t + i * 0.055, 0.5, 0.11, this.sfxBus));
  }

  golden() {
    if (!this._ok('golden')) return;
    const t = this.ctx.currentTime;
    [84, 88, 91, 96, 100, 103].forEach((m, i) => this._bell(midiHz(m), t + i * 0.045, 0.6, 0.1, this.sfxBus));
    this._noiseBurst(t, 0.6, 0.06, this.sfxBus, 'highpass', 9000);
  }

  swoosh() {
    if (!this._ok('swoosh', 80)) return;
    const t = this.ctx.currentTime;
    this._noiseBurst(t, 0.35, 0.18, this.sfxBus, 'bandpass', 400, 4000, 1.5);
  }

  powerUp() {
    if (!this._ok('power', 80)) return;
    const t = this.ctx.currentTime;
    this.swoosh();
    [67, 71, 74, 79, 83].forEach((m, i) => this._marimba(midiHz(m), t + 0.05 + i * 0.05, 0.13, this.sfxBus));
  }

  miss() {
    if (!this._ok('miss', 60)) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(190, t + 0.32);
    lfo.frequency.value = 18;
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain).connect(o.frequency);
    this._env(g, t, 0.16, 0.01, 0.33);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.4);
    lfo.stop(t + 0.4);
    this._noiseBurst(t, 0.08, 0.06, this.sfxBus, 'bandpass', 2500);
  }

  splat() {
    if (!this._ok('splat', 60)) return;
    const t = this.ctx.currentTime;
    this._noiseBurst(t, 0.22, 0.25, this.sfxBus, 'lowpass', 1400, 200);
    this._kick(t, 0.2, this.sfxBus);
  }

  comboUp(level) {
    if (!this._ok('combo', 60)) return;
    const t = this.ctx.currentTime;
    const base = 76 + level * 2;
    this._marimba(midiHz(base), t, 0.12, this.sfxBus);
    this._marimba(midiHz(base + 7), t + 0.07, 0.12, this.sfxBus);
    this._bell(midiHz(base + 12), t + 0.14, 0.4, 0.08, this.sfxBus);
  }

  fanfare() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const seq = [[72, 0], [76, 0.12], [79, 0.24], [84, 0.38], [79, 0.56], [84, 0.68]];
    seq.forEach(([m, d]) => {
      this._bell(midiHz(m), t + d, 0.6, 0.12, this.sfxBus);
      this._marimba(midiHz(m - 12), t + d, 0.1, this.sfxBus);
    });
    [60, 64, 67, 72].forEach((m) => this._pluck(midiHz(m), t + 0.68, 1.1, 0.08, this.sfxBus));
    this._noiseBurst(t + 0.68, 0.8, 0.05, this.sfxBus, 'highpass', 8000);
  }

  gameOver() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [[72, 0], [67, 0.22], [64, 0.44], [60, 0.7]].forEach(([m, d]) => this._bell(midiHz(m), t + d, 0.7, 0.11, this.sfxBus));
  }

  click() {
    if (!this._ok('click', 40)) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 1250, t, 0.04, 0.12, this.sfxBus, 0.002);
    this._osc('sine', 1900, t, 0.025, 0.05, this.sfxBus, 0.002);
  }

  unlockJingle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [84, 88, 91].forEach((m, i) => this._bell(midiHz(m), t + i * 0.08, 0.5, 0.09, this.sfxBus));
  }
}

export const Audio = new AudioManager();
