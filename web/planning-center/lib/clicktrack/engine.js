/**
 * Motor Click Track.
 *  - PAD = synth Tone.js (oscilatoare dezacordate → lowpass cu LFO lent → chorus → reverb).
 *    Acordul e ținut CONTINUU (triggerAttack, fără release) → fără pulsație, sunet lin worship.
 *    9 presete („Pad 1..9"). Auto-stop la 30 min.
 *  - METRONOM = Web Audio (scheduler lookahead, accente pe măsură).
 *  - „Tonalitate" = pian samplat (smplr SplendidGrandPiano): acord → arpegiu → acord, o dată.
 *  - MUTE separat pad/metronom, live. Gamă/mod/BPM/măsură editabile live, fără a atinge melodia.
 */
import * as Tone from "tone";
import { SplendidGrandPiano } from "smplr";

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

// 9 presete de pad (synth Tone) — toate soft/worship, variază timbrul (osc/dezacord/filtru/atac).
export const PADS = [
  { label: "Strings 2", osc: "fatsawtooth", count: 4, spread: 40, cutoff: 1700, attack: 1.0 },
  { label: "Halo", osc: "fatsine", count: 3, spread: 32, cutoff: 2300, attack: 1.3 },
  { label: "Synth Strings 2", osc: "fatsawtooth", count: 3, spread: 26, cutoff: 1600, attack: 0.9 },
  { label: "Sweep", osc: "fatsawtooth", count: 2, spread: 22, cutoff: 1500, attack: 1.5 },
  { label: "Bowed", osc: "fattriangle", count: 3, spread: 30, cutoff: 1500, attack: 1.1 },
  { label: "Warm", osc: "fatsine", count: 4, spread: 22, cutoff: 1300, attack: 0.8 },
  { label: "Choir", osc: "fattriangle", count: 4, spread: 42, cutoff: 2000, attack: 1.0 },
  { label: "Strings", osc: "fatsawtooth", count: 3, spread: 34, cutoff: 1800, attack: 1.0 },
  { label: "Synth Strings", osc: "fatsawtooth", count: 2, spread: 16, cutoff: 1700, attack: 0.9 },
];
const PAD_VOL = 0.9;
const AUTO_STOP_MS = 30 * 60 * 1000;

export class ClickTrackEngine {
  constructor() {
    this.ctx = null; this.piano = null; this.clickGain = null; this.pianoGain = null;
    this.pad = null; this.padOut = null; this.filter = null; this.chorus = null; this.reverb = null; this.filterLfo = null;
    this.padReady = false; this.pianoReady = false; this.loadingPiano = false; this.held = []; this.disposed = false;
    this.state = { keyPc: 0, keyName: "C", mode: "major", bpm: 72, meter: "4/4", playing: false, padMuted: false, clickMuted: false, padIndex: 0 };
    this.timer = null; this.autoStop = null; this.nextTime = 0; this.beat = 0;
    this.onBeat = null; this.onState = null;
  }

  _emit() { this.onState && this.onState({ ...this.state, padReady: this.padReady, loadingPad: false }); }

  _ensureCtx() {
    if (this.ctx) return;
    this.ctx = Tone.getContext().rawContext; // o singură bază audio pt. tot
    this.clickGain = this.ctx.createGain(); this.clickGain.gain.value = 0.9; this.clickGain.connect(this.ctx.destination);
    this.pianoGain = this.ctx.createGain(); this.pianoGain.gain.value = 1; this.pianoGain.connect(this.ctx.destination);
    this._buildPad();
  }

  _buildPad() {
    const p = PADS[this.state.padIndex] || PADS[0];
    this.padOut = new Tone.Gain(0).toDestination();
    this.reverb = new Tone.Reverb({ decay: 7, preDelay: 0.02, wet: 0.5 }).connect(this.padOut);
    // chorus discret (shimmer), NU throb — altfel se aude ca o pulsație la ~2s
    this.chorus = new Tone.Chorus({ frequency: 0.25, delayTime: 3, depth: 0.2, spread: 160, wet: 0.18 }).connect(this.reverb).start();
    this.filter = new Tone.Filter({ type: "lowpass", frequency: p.cutoff, rolloff: -12, Q: 0.2 }).connect(this.chorus);
    // mișcare foarte lentă și discretă pe filtru (nu pulsație)
    this.filterLfo = new Tone.LFO({ frequency: 0.05, min: p.cutoff - 250, max: p.cutoff + 250 }).start();
    this.filterLfo.connect(this.filter.frequency);
    this.pad = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 16,
      oscillator: { type: p.osc, count: p.count, spread: p.spread },
      envelope: { attack: p.attack, decay: 0.4, sustain: 1, release: 3 },
      volume: -12,
    }).connect(this.filter);
    this.padReady = true;
  }
  _disposePad() {
    this.held = [];
    for (const n of ["pad", "filterLfo", "filter", "chorus", "reverb", "padOut"]) { try { this[n] && this[n].dispose(); } catch {} this[n] = null; }
    this.padReady = false;
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

  setPadIndex(i) {
    if (i === this.state.padIndex) return;
    this.state.padIndex = i; this._emit();
    if (!this.ctx) return;
    this._disposePad(); this._buildPad();
    if (this.state.playing && !this.state.padMuted) this._startPadChord();
  }

  setPadMuted(b) {
    this.state.padMuted = b; this._emit();
    if (!this.padOut) return;
    if (b) this.padOut.gain.rampTo(0, 0.25);
    else if (this.state.playing) { if (!this.held.length) this._startPadChord(); else this.padOut.gain.rampTo(PAD_VOL, 0.25); }
  }
  setClickMuted(b) { this.state.clickMuted = b; this._emit(); }

  _retriggerPadIfPlaying() { if (this.state.playing && !this.state.padMuted && this.pad) this._startPadChord(); }

  _padNotes() {
    const r = 48 + this.state.keyPc; const th = this.state.mode === "minor" ? 3 : 4;
    return [r, r + th, r + 7, r + 12].map((m) => Tone.Frequency(m, "midi").toNote());
  }
  _pianoChord() { const r = 60 + this.state.keyPc; const th = this.state.mode === "minor" ? 3 : 4; return [r, r + th, r + 7, r + 12]; }

  // Acord ținut CONTINUU (fără release) → sunet lin, fără pulsație. Schimbarea gamei face crossfade.
  _startPadChord() {
    if (!this.pad) return;
    try { this.pad.releaseAll(); } catch {}
    const notes = this._padNotes();
    try { this.pad.triggerAttack(notes); } catch {}
    this.held = notes;
    this.padOut.gain.rampTo(this.state.padMuted ? 0 : PAD_VOL, 0.3);
  }
  _releasePad() { if (this.pad) { try { this.pad.releaseAll(); } catch {} } this.held = []; }

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
    if (this.disposed) return; // a fost oprit cât am așteptat (StrictMode / remount)
    this._ensureCtx();
    if (this.ctx.state === "suspended") { try { await this.ctx.resume(); } catch {} }
    if (this.disposed) return;
    this.state.playing = true; this.beat = 0; this.nextTime = this.ctx.currentTime + 0.1;
    if (!this.state.padMuted) this._startPadChord();
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
    this._releasePad();
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
    try { this._disposePad(); } catch {}
    if (this.piano) { try { this.piano.stop(); } catch {} }
    this.ctx = null; this.piano = null; this.pianoReady = false;
  }
}

export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const METERS = ["2/4", "3/4", "4/4", "5/4", "6/4", "2/2", "3/8", "6/8", "7/8", "9/8", "12/8"];
