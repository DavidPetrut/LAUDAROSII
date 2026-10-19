/**
 * Detecție gamă din audio — ESTIMARE (nu e exactă 100%).
 * Decodează fișierul (Web Audio) → cromagramă (12 clase de înălțime, via Goertzel pe cadre)
 * → corelație Krumhansl-Schmuckler cu profilele major/minor → cea mai bună gamă + încredere.
 *
 * Totul rulează în browser, o singură dată la upload. Analizăm primele ~90s (destul pt. gamă).
 * Returnează { key, mode, display, label, conf } sau null dacă nu reușește.
 */

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// Profile Krumhansl-Schmuckler (medii pe clase de înălțime)
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function pearson(a, b) {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

export async function detectKey(arrayBuffer) {
  try {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    const ctx = new AC();
    let buf;
    try { buf = await ctx.decodeAudioData(arrayBuffer.slice(0)); }
    catch { try { ctx.close?.(); } catch {} return null; }
    const sr = buf.sampleRate;
    const chN = buf.numberOfChannels;
    const limit = Math.min(buf.length, Math.floor(sr * 90)); // max 90s
    // mix mono
    const mono = new Float32Array(limit);
    for (let c = 0; c < chN; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < limit; i++) mono[i] += d[i] / chN;
    }
    try { ctx.close?.(); } catch {}

    // frecvențe pe clase de înălțime, C2(MIDI36)..B6(MIDI95), sub Nyquist
    const freqs = [];
    for (let midi = 36; midi <= 95; midi++) {
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      if (f < sr / 2 - 100) freqs.push({ pc: midi % 12, f });
    }

    const chroma = new Float64Array(12);
    const frameSize = 8192;
    const hop = frameSize; // cadre non-suprapuse (rapid)
    for (let start = 0; start + frameSize <= limit; start += hop) {
      for (let q = 0; q < freqs.length; q++) {
        const { pc, f } = freqs[q];
        const w = 2 * Math.PI * (f / sr);
        const coeff = 2 * Math.cos(w);
        let s1 = 0, s2 = 0;
        for (let i = 0; i < frameSize; i++) {
          const s0 = mono[start + i] + coeff * s1 - s2;
          s2 = s1; s1 = s0;
        }
        chroma[pc] += s1 * s1 + s2 * s2 - coeff * s1 * s2;
      }
    }

    let max = 0;
    for (let i = 0; i < 12; i++) max = Math.max(max, chroma[i]);
    if (max <= 0) return null;
    for (let i = 0; i < 12; i++) chroma[i] /= max;

    // corelează cu toate cele 24 game (12 rotații × major/minor)
    const ranked = [];
    for (let rot = 0; rot < 12; rot++) {
      const rotated = [];
      for (let i = 0; i < 12; i++) rotated.push(chroma[(i + rot) % 12]);
      ranked.push({ key: NAMES[rot], mode: "major", score: pearson(rotated, MAJOR) });
      ranked.push({ key: NAMES[rot], mode: "minor", score: pearson(rotated, MINOR) });
    }
    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0], second = ranked[1];
    const margin = best.score - second.score;
    // încredere: scor bun ȘI detașare clară de următoarea candidată
    const conf = Math.max(0, Math.min(1, (best.score - 0.4) / 0.5)) * Math.max(0, Math.min(1, margin / 0.15));

    return {
      key: best.key,
      mode: best.mode,
      display: `${best.key} ${best.mode === "minor" ? "minor" : "major"}`,
      label: best.key + (best.mode === "minor" ? "m" : ""),
      conf,
    };
  } catch { return null; }
}

/** Fetch un URL audio → ArrayBuffer (pt. detecție pe fișiere deja încărcate). */
export async function fetchAudioBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return res.arrayBuffer();
}
