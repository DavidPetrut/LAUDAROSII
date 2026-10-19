/**
 * Motor Click Track — pad de pian SAMPLAT (smplr/SplendidGrandPiano) + metronom cu accente pe măsură.
 * - Pad: acord (major/minor) în gama setată, pornit cu fade-in lin, re-lovit discret pe fiecare măsură
 *   ca să „țină" ca un pad; se oprește cu fade-out.
 * - Metronom: scheduler Web Audio cu lookahead; accente diferite după măsură (4/4, 6/8, 3/4…).
 * - Totul editabil live (gamă/mod/BPM/măsură) FĂRĂ a atinge setările salvate ale aranjamentului.
 */
import { SplendidGrandPiano } from "smplr";

const PC = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

// Accente per măsură: 2 = tare (downbeat), 1 = mediu, 0 = slab. Lungimea = nr. de bătăi/măsură.
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

export class ClickTrackEngine {
  constructor() {
    this.ctx = null; this.piano = null; this.padGain = null; this.clickGain = null;
    this.ready = false; this.loading = false;
    this.state = { keyPc: 0, keyName: "C", mode: "major", bpm: 72, meter: "4/4", playing: false };
    this.timer = null; this.nextTime = 0; this.beat = 0;
    this.onBeat = null; this.onState = null;
  }

  _emit() { this.onState && this.onState({ ...this.state, ready: this.ready, loading: this.loading }); }

  _ensureCtx() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.padGain = this.ctx.createGain(); this.padGain.gain.value = 0; this.padGain.connect(this.ctx.destination);
    this.clickGain = this.ctx.createGain(); this.clickGain.gain.value = 0.9; this.clickGain.connect(this.ctx.destination);
  }

  _loadPiano() {
    if (this.piano || this.loading) return;
    this.loading = true; this._emit();
    try {
      this.piano = new SplendidGrandPiano(this.ctx, { destination: this.padGain });
      this.piano.load.then(() => { this.ready = true; this.loading = false; this._emit(); })
        .catch(() => { this.loading = false; this._emit(); });
    } catch { this.loading = false; this._emit(); }
  }

  setDefaults({ key, mode, bpm, meter }) {
    if (key && PC[key] != null) { this.state.keyPc = PC[key]; this.state.keyName = key; }
    if (mode) this.state.mode = mode;
    if (bpm) this.state.bpm = Math.max(30, Math.min(300, Number(bpm)));
    if (meter) this.state.meter = meter;
    this._emit();
  }
  setKey(name) { if (PC[name] == null) return; this.state.keyPc = PC[name]; this.state.keyName = name; this._emit(); if (this.state.playing) this._strikePad(this.ctx.currentTime + 0.02, 72, this._barDur() * 1.3); }
  setMode(m) { this.state.mode = m; this._emit(); if (this.state.playing) this._strikePad(this.ctx.currentTime + 0.02, 72, this._barDur() * 1.3); }
  setBpm(b) { this.state.bpm = Math.max(30, Math.min(300, Number(b) || 72)); this._emit(); }
  setMeter(m) { this.state.meter = m; this.beat = 0; this._emit(); }

  _barDur() { return (60 / this.state.bpm) * accentPattern(this.state.meter).length; }
  _chord() { const root = 48 + this.state.keyPc; const third = this.state.mode === "minor" ? 3 : 4; return [root, root + third, root + 7, root + 12]; }
  _strikePad(time, vel = 55, dur = 6) {
    if (!this.piano || !this.ready) return;
    for (const n of this._chord()) { try { this.piano.start({ note: n, velocity: vel, time, duration: dur, ampRelease: 1.4 }); } catch {} }
  }

  _click(beat, time) {
    const acc = accentPattern(this.state.meter)[beat] || 0;
    const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = acc === 2 ? 2000 : acc === 1 ? 1500 : 1050;
    const vol = acc === 2 ? 1 : acc === 1 ? 0.66 : 0.46;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(g); g.connect(this.clickGain);
    osc.start(time); osc.stop(time + 0.06);
    if (this.onBeat) { const dt = Math.max(0, (time - this.ctx.currentTime) * 1000); setTimeout(() => this.onBeat(beat, acc), dt); }
  }

  _schedule() {
    const ahead = 0.15;
    while (this.nextTime < this.ctx.currentTime + ahead) {
      const pattern = accentPattern(this.state.meter);
      if (this.beat >= pattern.length) this.beat = 0;
      this._click(this.beat, this.nextTime);
      if (this.beat === 0) this._strikePad(this.nextTime, 50, this._barDur() * 1.35); // re-lovire discretă pt. sustain
      this.nextTime += 60 / this.state.bpm;
      this.beat = (this.beat + 1) % pattern.length;
    }
  }

  async start() {
    this._ensureCtx();
    if (this.ctx.state === "suspended") { try { await this.ctx.resume(); } catch {} }
    this._loadPiano(); // în fundal; metronomul pornește imediat, pad-ul intră când sunt gata sample-urile
    this.state.playing = true; this.beat = 0; this.nextTime = this.ctx.currentTime + 0.1;
    // fade-in pad
    const t = this.ctx.currentTime;
    this.padGain.gain.cancelScheduledValues(t);
    this.padGain.gain.setValueAtTime(0.0001, t);
    this.padGain.gain.linearRampToValueAtTime(0.85, t + 1.3);
    this._strikePad(t + 0.15, 70, 7);
    clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 25);
    this._emit();
  }

  stop() {
    this.state.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.padGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.padGain.gain.cancelScheduledValues(t);
      this.padGain.gain.setValueAtTime(this.padGain.gain.value, t);
      this.padGain.gain.linearRampToValueAtTime(0, t + 0.4);
    }
    if (this.piano) setTimeout(() => { try { this.piano.stop(); } catch {} }, 450);
    this._emit();
  }

  toggle() { this.state.playing ? this.stop() : this.start(); }

  dispose() {
    try { this.stop(); } catch {}
    if (this.ctx) { try { this.ctx.close(); } catch {} }
    this.ctx = null; this.piano = null; this.ready = false; this.loading = false;
  }
}

export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const METERS = ["2/4", "3/4", "4/4", "5/4", "6/4", "2/2", "3/8", "6/8", "7/8", "9/8", "12/8"];
