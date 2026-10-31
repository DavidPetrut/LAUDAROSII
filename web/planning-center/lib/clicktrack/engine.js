/**
 * Motor Click Track.
 *  - PAD = fișier audio REAL (înregistrările worship), transpus OFFLINE pe fiecare gamă × Major/Minor
 *    (/pads.json → Cloudinary). Redare cu <audio> (streaming, fără decode în memorie) + CROSSFADE pe 2
 *    elemente la schimbarea gamei/modului. Fără synth, fără „Pad 1..9" — doar Major/Minor.
 *  - METRONOM = Web Audio (scheduler lookahead, accente pe măsură).
 *  - „Tonalitate" = pian samplat (smplr SplendidGrandPiano): acord → arpegiu → acord, o dată.
 *  - MUTE separat pad/metronom, live. Gamă/mod/BPM/măsură editabile live, fără a atinge melodia.
 */
import * as Tone from "tone";
import { SplendidGrandPiano } from "smplr";
import PAD_URLS from "./pads.json";

const PC = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const SHARP2FLAT = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };

const ACCENTS = {
  "2/4": [2, 0], "3/4": [2, 0, 0], "4/4": [2, 0, 1, 0], "5/4": [2, 0, 0, 1, 0], "6/4": [2, 0, 0, 1, 0, 0],
  "2/2": [2, 0], "3/8": [2, 0, 0], "6/8": [2, 0, 0, 1, 0, 0], "7/8": [2, 0, 1, 0, 1, 0, 0],
  "9/8": [2, 0, 0, 1, 0, 0, 1, 0, 0], "12/8": [2, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
};
export function accentPattern(meter) {
  if (ACCENTS[meter]) return ACCENTS[meter];
  const num = parseInt(String(meter || "4/4").split("/")[0], 10) || 4;
  const p = new Array(num).fill(0); p[0] = 2; return p;
}

const PAD_VOL = 0.85;
const AUTO_STOP_MS = 30 * 60 * 1000;

export class ClickTrackEngine {
  constructor() {
    this.ctx = null; this.piano = null; this.clickGain = null; this.pianoGain = null;
    this.padEls = null; this.padCur = 0; this.padFades = [null, null];
    this.padReady = false; this.pianoReady = false; this.loadingPiano = false; this.disposed = false;
    this.state = { keyPc: 0, keyName: "C", mode: "major", bpm: 72, meter: "4/4", playing: false, padMuted: false, clickMuted: false };
    this.timer = null; this.autoStop = null; this.nextTime = 0; this.beat = 0;
    this.onBeat = null; this.onState = null;
  }

  _emit() { this.onState && this.onState({ ...this.state, padReady: this.padReady, loadingPad: false }); }

  _ensureCtx() {
    if (this.ctx) return;
    this.ctx = Tone.getContext().rawContext; // o singură bază audio pt. metronom + pian
    this.clickGain = this.ctx.createGain(); this.clickGain.gain.value = 0.9; this.clickGain.connect(this.ctx.destination);
    this.pianoGain = this.ctx.createGain(); this.pianoGain.gain.value = 1; this.pianoGain.connect(this.ctx.destination);
    this._ensurePadEls();
  }

  /* ── PAD = fișier audio real, 2 elemente <audio> pt. crossfade la schimbarea gamei/modului ── */
  _ensurePadEls() {
    if (this.padEls) return;
    this.padEls = [0, 1].map(() => { const a = new Audio(); a.loop = true; a.preload = "auto"; a.crossOrigin = "anonymous"; a.volume = 0; return a; });
    this.padReady = true;
  }
  _padUrl() {
    const k = SHARP2FLAT[this.state.keyName] || this.state.keyName;
    const m = PAD_URLS[this.state.mode] || PAD_URLS.major || {};
    return m[k] || m.C || "";
  }
  _fadeEl(el, to, ms) {
    const i = this.padEls ? this.padEls.indexOf(el) : -1;
    if (i >= 0 && this.padFades[i]) { clearInterval(this.padFades[i]); this.padFades[i] = null; }
    const from = el.volume || 0; const steps = Math.max(1, Math.round(ms / 30)); let s = 0;
    const iv = setInterval(() => {
      s++; const v = from + (to - from) * (s / steps);
      try { el.volume = Math.max(0, Math.min(1, v)); } catch {}
      if (s >= steps) { clearInterval(iv); if (i >= 0) this.padFades[i] = null; if (to === 0) { try { el.pause(); } catch {} } }
    }, 30);
    if (i >= 0) this.padFades[i] = iv;
  }
  _playPad() {
    this._ensurePadEls();
    const url = this._padUrl(); if (!url) return;
    const el = this.padEls[this.padCur];
    if (el.src !== url) el.src = url;
    try { el.currentTime = 0; } catch {}
    const p = el.play(); if (p && p.catch) p.catch(() => {});
    this._fadeEl(el, this.state.padMuted ? 0 : PAD_VOL, 450);
  }
  _crossfadePad() {
    if (!this.padEls) return;
    const url = this._padUrl(); if (!url) return;
    const cur = this.padEls[this.padCur]; const next = this.padEls[1 - this.padCur];
    next.src = url; next.volume = 0; try { next.currentTime = 0; } catch {}
    const p = next.play(); if (p && p.catch) p.catch(() => {});
    this._fadeEl(next, this.state.padMuted ? 0 : PAD_VOL, 500);
    this._fadeEl(cur, 0, 500);
    this.padCur = 1 - this.padCur;
  }
  _stopPad() { if (!this.padEls) return; for (const el of this.padEls) this._fadeEl(el, 0, 300); }

  _loadPiano() {
    if (this.piano || this.loadingPiano) return Promise.resolve();
    this.loadingPiano = true;
    try {
      this.piano = new SplendidGrandPiano(this.ctx, { destination: this.pianoGain });
      return this.piano.load.then(() => { this.pianoReady = true; this.loadingPiano = false; }).catch(() => { this.loadingPiano = false; });
    } catch { this.loadingPiano = false; return Promise.resolve(); }
  }

  setDefaults({ key, mode, bpm, meter }) {
    if (key && PC[key] != null) { this.state.keyPc = PC[key]; this.state.keyName = key; }
    if (mode) this.state.mode = mode;
    if (bpm) this.state.bpm = Math.max(30, Math.min(300, Number(bpm)));
    if (meter) this.state.meter = meter;
    this._emit();
  }
  setKey(name) { if (PC[name] == null) return; this.state.keyPc = PC[name]; this.state.keyName = name; this._emit(); if (this.state.playing) this._crossfadePad(); }
  setMode(m) { if (m === this.state.mode) return; this.state.mode = m; this._emit(); if (this.state.playing) this._crossfadePad(); }
  setBpm(b) { this.state.bpm = Math.max(30, Math.min(300, Number(b) || 72)); this._emit(); }
  setMeter(m) { this.state.meter = m; this.beat = 0; this._emit(); }

  setPadMuted(b) {
    this.state.padMuted = b; this._emit();
    if (!this.padEls) return;
    const el = this.padEls[this.padCur];
    if (b) this._fadeEl(el, 0, 250);
    else if (this.state.playing) { if (el.paused) { if (el.src !== this._padUrl()) el.src = this._padUrl(); const p = el.play(); if (p && p.catch) p.catch(() => {}); } this._fadeEl(el, PAD_VOL, 250); }
  }
  setClickMuted(b) { this.state.clickMuted = b; this._emit(); }

  _pianoChord() { const r = 60 + this.state.keyPc; const th = this.state.mode === "minor" ? 3 : 4; return [r, r + th, r + 7, r + 12]; }

  _tick(beat, time) {
    const acc = accentPattern(this.state.meter)[beat] || 0;
    if (!this.state.clickMuted) {
      const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = acc === 2 ? 2000 : acc === 1 ? 1500 : 1050;
      const vol = acc === 2 ? 1 : acc === 1 ? 0.66 : 0.46;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      osc.connect(g); g.connect(this.clickGain);
      osc.start(time); osc.stop(time + 0.06);
    }
    if (this.onBeat) { const dt = Math.max(0, (time - this.ctx.currentTime) * 1000); setTimeout(() => this.onBeat(beat, acc), dt); }
  }

  _schedule() {
    const ahead = 0.15;
    while (this.nextTime < this.ctx.currentTime + ahead) {
      const pattern = accentPattern(this.state.meter);
      if (this.beat >= pattern.length) this.beat = 0;
      this._tick(this.beat, this.nextTime);
      this.nextTime += 60 / this.state.bpm;
      this.beat = (this.beat + 1) % pattern.length;
    }
  }

  async start() {
    if (this.disposed) return;
    try { await Tone.start(); } catch {}
    if (this.disposed) return;
    this._ensureCtx();
    if (this.ctx.state === "suspended") { try { await this.ctx.resume(); } catch {} }
    if (this.disposed) return;
    this.state.playing = true; this.beat = 0; this.nextTime = this.ctx.currentTime + 0.1;
    this._playPad();
    clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 25);
    clearTimeout(this.autoStop);
    this.autoStop = setTimeout(() => this.stop(), AUTO_STOP_MS);
    this._emit();
  }

  stop() {
    this.state.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    clearTimeout(this.autoStop); this.autoStop = null;
    this._stopPad();
    this._emit();
  }
  toggle() { this.state.playing ? this.stop() : this.start(); }

  async playTonalitate() {
    try { await Tone.start(); } catch {}
    this._ensureCtx();
    if (this.ctx.state === "suspended") { try { await this.ctx.resume(); } catch {} }
    if (!this.pianoReady) await this._loadPiano();
    if (!this.piano) return;
    const t = this.ctx.currentTime + 0.06;
    const ch = this._pianoChord();
    const strike = (time, dur, vel) => { for (const n of ch) { try { this.piano.start({ note: n, velocity: vel, time, duration: dur, ampRelease: 1.2 }); } catch {} } };
    strike(t, 1.6, 78);
    const arpStart = t + 0.95, step = 0.19;
    ch.forEach((n, i) => { try { this.piano.start({ note: n, velocity: 70, time: arpStart + i * step, duration: 0.5, ampRelease: 0.6 }); } catch {} });
    strike(arpStart + ch.length * step + 0.12, 2.4, 82);
  }

  dispose() {
    this.disposed = true;
    try { this.stop(); } catch {}
    if (this.padEls) { for (const el of this.padEls) { try { el.pause(); el.src = ""; } catch {} } this.padEls = null; }
    for (const iv of this.padFades) { if (iv) clearInterval(iv); } this.padFades = [null, null];
    if (this.piano) { try { this.piano.stop(); } catch {} }
    this.ctx = null; this.piano = null; this.pianoReady = false;
  }
}

export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const METERS = ["2/4", "3/4", "4/4", "5/4", "6/4", "2/2", "3/8", "6/8", "7/8", "9/8", "12/8"];
