/**
 * Motor Click Track.
 *  - PLAY = PAD worship (Soundfont „pad_2_warm", sample real, cu loop → ține la infinit) + METRONOM.
 *    Pad-ul susține acordul gamei (major/minor), fade-in lin. NU pian aici.
 *  - BUTON „Tonalitate" = pianul samplat (SplendidGrandPiano): o singură dată acord → arpegiu → acord.
 *  - MUTE separat: pad (gamă) și metronom (BPM), live.
 *  - Editabil live (gamă/mod/BPM/măsură) fără a atinge setările salvate ale aranjamentului.
 */
import { SplendidGrandPiano, Soundfont } from "smplr";

const PC = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

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

const PAD_VOL = 0.9;

export class ClickTrackEngine {
  constructor() {
    this.ctx = null; this.pad = null; this.piano = null;
    this.padGain = null; this.clickGain = null; this.pianoGain = null;
    this.padReady = false; this.loadingPad = false; this.pianoReady = false; this.loadingPiano = false;
    this.state = { keyPc: 0, keyName: "C", mode: "major", bpm: 72, meter: "4/4", playing: false, padMuted: false, clickMuted: false };
    this.timer = null; this.nextTime = 0; this.beat = 0;
    this.onBeat = null; this.onState = null;
  }

  _emit() { this.onState && this.onState({ ...this.state, padReady: this.padReady, loadingPad: this.loadingPad }); }

  _ensureCtx() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.padGain = this.ctx.createGain(); this.padGain.gain.value = 0; this.padGain.connect(this.ctx.destination);
    this.clickGain = this.ctx.createGain(); this.clickGain.gain.value = 0.9; this.clickGain.connect(this.ctx.destination);
    this.pianoGain = this.ctx.createGain(); this.pianoGain.gain.value = 1; this.pianoGain.connect(this.ctx.destination);
  }

  _loadPad() {
    if (this.pad || this.loadingPad) return;
    this.loadingPad = true; this._emit();
    try {
      this.pad = new Soundfont(this.ctx, { instrument: "pad_2_warm", kit: "MusyngKite", loadLoopData: true, destination: this.padGain });
      this.pad.load.then(() => { this.padReady = true; this.loadingPad = false; this._emit(); if (this.state.playing && !this.state.padMuted) this._startPadChord(this.ctx.currentTime + 0.05, true); })
        .catch(() => { this.loadingPad = false; this._emit(); });
    } catch { this.loadingPad = false; this._emit(); }
  }
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
  setKey(name) { if (PC[name] == null) return; this.state.keyPc = PC[name]; this.state.keyName = name; this._emit(); this._retriggerPadIfPlaying(); }
  setMode(m) { this.state.mode = m; this._emit(); this._retriggerPadIfPlaying(); }
  setBpm(b) { this.state.bpm = Math.max(30, Math.min(300, Number(b) || 72)); this._emit(); }
  setMeter(m) { this.state.meter = m; this.beat = 0; this._emit(); }

  setPadMuted(b) {
    this.state.padMuted = b; this._emit();
    if (!this.ctx) return;
    if (b) { this._rampPad(0, 0.25); setTimeout(() => this._stopPad(), 300); }
    else if (this.state.playing) { this._startPadChord(this.ctx.currentTime + 0.02, false); }
  }
  setClickMuted(b) { this.state.clickMuted = b; this._emit(); }

  _retriggerPadIfPlaying() { if (this.state.playing && !this.state.padMuted && this.padReady && this.ctx) this._startPadChord(this.ctx.currentTime + 0.02, false); }

  // acorduri
  _padChord() { const r = 48 + this.state.keyPc; const th = this.state.mode === "minor" ? 3 : 4; return [r, r + th, r + 7, r + 12]; }
  _pianoChord() { const r = 60 + this.state.keyPc; const th = this.state.mode === "minor" ? 3 : 4; return [r, r + th, r + 7, r + 12]; }

  _rampPad(target, dur = 0.3) {
    if (!this.padGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.padGain.gain.cancelScheduledValues(t);
    this.padGain.gain.setValueAtTime(Math.max(0.0001, this.padGain.gain.value), t);
    this.padGain.gain.linearRampToValueAtTime(Math.max(0.0001, target), t + dur);
  }
  _stopPad() { if (this.pad) { try { this.pad.stop(); } catch {} } }
  _startPadChord(time, fadeIn) {
    if (!this.pad || !this.padReady) return;
    this._stopPad();
    for (const n of this._padChord()) { try { this.pad.start({ note: n, velocity: 80, time, duration: null }); } catch {} }
    this._rampPad(PAD_VOL, fadeIn ? 1.3 : 0.25);
  }

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
    this._ensureCtx();
    if (this.ctx.state === "suspended") { try { await this.ctx.resume(); } catch {} }
    this.state.playing = true; this.beat = 0; this.nextTime = this.ctx.currentTime + 0.1;
    this._loadPad(); // pad intră când e gata; metronomul pornește imediat
    if (this.padReady && !this.state.padMuted) this._startPadChord(this.ctx.currentTime + 0.1, true);
    clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 25);
    this._emit();
  }

  stop() {
    this.state.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this._rampPad(0, 0.4);
    setTimeout(() => this._stopPad(), 450);
    this._emit();
  }
  toggle() { this.state.playing ? this.stop() : this.start(); }

  // „Tonalitate": pian — acord → arpegiu (major/minor) → acord. O singură dată.
  async playTonalitate() {
    this._ensureCtx();
    if (this.ctx.state === "suspended") { try { await this.ctx.resume(); } catch {} }
    if (!this.pianoReady) await this._loadPiano();
    if (!this.piano) return;
    const t = this.ctx.currentTime + 0.06;
    const ch = this._pianoChord();
    const strike = (time, dur, vel) => { for (const n of ch) { try { this.piano.start({ note: n, velocity: vel, time, duration: dur, ampRelease: 1.2 }); } catch {} } };
    strike(t, 1.6, 78);                                   // 1) acordul
    const arpStart = t + 0.95, step = 0.19;                // 2) arpegiu do-mi-sol-do
    ch.forEach((n, i) => { try { this.piano.start({ note: n, velocity: 70, time: arpStart + i * step, duration: 0.5, ampRelease: 0.6 }); } catch {} });
    strike(arpStart + ch.length * step + 0.12, 2.4, 82);   // 3) acordul din nou
  }

  dispose() {
    try { this.stop(); } catch {}
    try { this._stopPad(); } catch {}
    if (this.piano) { try { this.piano.stop(); } catch {} }
    if (this.ctx) { try { this.ctx.close(); } catch {} }
    this.ctx = null; this.pad = null; this.piano = null; this.padReady = false; this.pianoReady = false;
  }
}

export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const METERS = ["2/4", "3/4", "4/4", "5/4", "6/4", "2/2", "3/8", "6/8", "7/8", "9/8", "12/8"];
