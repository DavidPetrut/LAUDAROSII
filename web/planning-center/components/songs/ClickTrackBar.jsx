"use client";
/**
 * Container Click Track — bară dedicată jos (peste player-ul de muzică), rulează în fundal.
 * PLAY = pad worship (Soundfont) + metronom. „Tonalitate" = pian: acord→arpegiu→acord (o dată).
 * Două board-uri (Gamă / BPM+Măsură). Mute separat pe pad și pe metronom (iconițe notă).
 * Controale LIVE care NU modifică setările salvate ale aranjamentului.
 */
import { useEffect, useRef, useState } from "react";
import { ClickTrackEngine, accentPattern, KEYS, METERS, PADS } from "@/lib/clicktrack/engine";

function NoteMute({ muted, onClick, title }) {
  return (
    <button className={`notemute ${muted ? "muted" : ""}`} onClick={onClick} title={title} aria-label={title}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        {muted && <line x1="3" y1="3" x2="21" y2="21" stroke="#f0776f" />}
      </svg>
      <style jsx>{`
        .notemute { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 2px; display: inline-flex; border-radius: 5px; }
        .notemute:hover { color: var(--text); }
        .notemute.muted { color: #f0776f; }
      `}</style>
    </button>
  );
}

export default function ClickTrackBar({ defaults, playerActive, onClose }) {
  const engineRef = useRef(null);
  const [st, setSt] = useState({ keyName: "C", mode: "major", bpm: 72, meter: "4/4", playing: false, padReady: false, loadingPad: false, padMuted: false, clickMuted: false, padIndex: 0 });
  const [beat, setBeat] = useState(-1);
  const [keyOpen, setKeyOpen] = useState(false);
  const [padOpen, setPadOpen] = useState(false);

  useEffect(() => {
    const eng = new ClickTrackEngine();
    engineRef.current = eng;
    eng.onState = (s) => setSt(s);
    eng.onBeat = (b) => setBeat(b);
    eng.setDefaults(defaults || {});
    eng.start();
    return () => { eng.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eng = () => engineRef.current;
  const pattern = accentPattern(st.meter);

  return (
    <div className="ct" style={{ bottom: playerActive ? 64 : 0 }}>
      <div className="ct-inner">
        <div className="ct-head">
          <div className="ct-title">CLICK TRACK</div>
          <div className="ct-sub">{st.loadingPad ? "se încarcă pad-ul…" : st.padReady ? "pad + metronom" : "metronom"}</div>
        </div>

        {/* Board 1 — Pad (sunet + gamă) */}
        <div className="board">
          <div className="board-h">
            <div className="padwrap">
              <button className="pad-title" onClick={() => { setPadOpen((o) => !o); setKeyOpen(false); }} title="Alege sunetul de pad">
                PAD <span className="pt-dash">—</span> <b>Pad {st.padIndex + 1}</b>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {padOpen && (
                <>
                  <div className="keybackdrop" onClick={() => setPadOpen(false)} />
                  <div className="padgrid">
                    {PADS.map((p, i) => (
                      <button key={i} className={`keyopt ${i === st.padIndex ? "on" : ""}`} title={p.label} onClick={() => { eng().setPadIndex(i); setPadOpen(false); }}>Pad {i + 1}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <NoteMute muted={st.padMuted} onClick={() => eng().setPadMuted(!st.padMuted)} title="Mut pad" />
          </div>
          <div className="row">
            {/* selector GAMĂ */}
            <div className="keywrap">
              <button className="keybtn" onClick={() => { setKeyOpen((o) => !o); setPadOpen(false); }} title="Alege gama">
                <span>{st.keyName}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {keyOpen && (
                <>
                  <div className="keybackdrop" onClick={() => setKeyOpen(false)} />
                  <div className="keygrid">
                    {KEYS.map((k) => (
                      <button key={k} className={`keyopt ${k === st.keyName ? "on" : ""}`} onClick={() => { eng().setKey(k); setKeyOpen(false); }}>{k}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="seg">
              <button className={st.mode === "major" ? "on" : ""} onClick={() => eng().setMode("major")}>Major</button>
              <button className={st.mode === "minor" ? "on" : ""} onClick={() => eng().setMode("minor")}>Minor</button>
            </div>
          </div>
        </div>

        {/* Board 2 — BPM + Măsură */}
        <div className="board">
          <div className="board-h"><span>BPM</span><NoteMute muted={st.clickMuted} onClick={() => eng().setClickMuted(!st.clickMuted)} title="Mut metronom (BPM)" /></div>
          <div className="row">
            <button className="step" onClick={() => eng().setBpm(st.bpm - 1)}>−</button>
            <input type="number" value={st.bpm} onChange={(e) => eng().setBpm(e.target.value)} />
            <button className="step" onClick={() => eng().setBpm(st.bpm + 1)}>+</button>
            <div className="meterwrap">
              <span className="mlabel">Măsură</span>
              <select value={st.meter} onChange={(e) => eng().setMeter(e.target.value)}>
                {METERS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="beats">
          {pattern.map((acc, i) => (
            <span key={i} className={`dot ${acc === 2 ? "strong" : acc === 1 ? "med" : ""} ${beat === i && st.playing ? "on" : ""}`} />
          ))}
        </div>

        <div className="transport">
          <button className="tonal" onClick={() => eng().playTonalitate()} title="Sună tonalitatea: acord → arpegiu → acord">Tonalitate</button>
          <button className="play" onClick={() => eng().toggle()} aria-label={st.playing ? "Pauză" : "Play"}>
            {st.playing
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <button className="ct-x" onClick={onClose} aria-label="Închide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        .ct { position: fixed; left: 0; right: 0; z-index: 78; background: linear-gradient(180deg, var(--surface-3), var(--surface-2)); border-top: 1px solid var(--border-strong); box-shadow: 0 -10px 30px rgba(0,0,0,.5); }
        .ct-inner { max-width: 1200px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; gap: 18px; }
        .ct-head { min-width: 110px; }
        .ct-title { font-size: 14px; font-weight: 700; letter-spacing: 1.2px; color: var(--text); }
        .ct-sub { font-size: 11px; color: var(--text-faint); margin-top: 2px; }
        .board { background: var(--surface); border: 1px solid var(--border-strong); border-radius: 10px; padding: 9px 13px; }
        .board-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 7px; }
        .board-h > span { font-size: 10.5px; letter-spacing: .5px; text-transform: uppercase; color: var(--text-faint); }
        .row { display: flex; align-items: center; gap: 6px; }
        select, input { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 7px 9px; font-size: 13px; }
        .keywrap { position: relative; }
        .keybtn { display: inline-flex; align-items: center; justify-content: space-between; gap: 5px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 7px 9px; cursor: pointer; font-size: 13px; min-width: 54px; }
        .keybtn.wide { min-width: 74px; }
        .keybtn svg { color: var(--text-dim); }
        .keybackdrop { position: fixed; inset: 0; z-index: 90; }
        .keygrid { position: absolute; left: 100%; bottom: 0; margin-left: 8px; z-index: 91; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; padding: 10px; box-shadow: 0 12px 34px rgba(0,0,0,.55); }
        .keyopt { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 8px 10px; cursor: pointer; font-size: 13px; min-width: 42px; white-space: nowrap; }
        .keyopt:hover { border-color: var(--primary); }
        .keyopt.on { background: var(--primary); color: #fff; border-color: var(--primary); }
        .padwrap { position: relative; }
        .pad-title { display: inline-flex; align-items: center; gap: 5px; background: transparent; border: none; cursor: pointer; color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; text-transform: uppercase; padding: 2px 4px; border-radius: 5px; }
        .pad-title b { color: var(--text); font-size: 12.5px; text-transform: none; letter-spacing: 0; }
        .pad-title svg { color: var(--text-dim); }
        .pad-title:hover { background: var(--surface-2); }
        .pad-title:hover b { text-decoration: underline; }
        .pt-dash { color: var(--text-faint); }
        .padgrid { position: absolute; left: 0; bottom: 100%; margin-bottom: 8px; z-index: 91; display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; padding: 11px; box-shadow: 0 12px 34px rgba(0,0,0,.55); }
        .padgrid .keyopt { min-width: 60px; padding: 10px 14px; text-align: center; }
        input[type="number"] { width: 58px; text-align: center; }
        .seg { display: flex; border: 1px solid var(--border-strong); border-radius: 6px; overflow: hidden; }
        .seg button { background: var(--surface-2); border: none; color: var(--text-dim); padding: 7px 12px; cursor: pointer; font-size: 12.5px; }
        .seg button.on { background: var(--primary); color: #fff; }
        .step { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); width: 30px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 16px; }
        .step:hover { border-color: var(--primary); }
        .meterwrap { display: flex; align-items: center; gap: 6px; margin-left: 8px; padding-left: 10px; border-left: 1px solid var(--border); }
        .mlabel { font-size: 10.5px; letter-spacing: .5px; text-transform: uppercase; color: var(--text-faint); }
        .beats { display: flex; align-items: center; gap: 8px; padding: 0 4px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border-strong); transition: transform .05s, background .05s; }
        .dot.strong { width: 15px; height: 15px; }
        .dot.on { background: var(--primary); border-color: var(--primary); transform: scale(1.25); box-shadow: 0 0 10px var(--primary); }
        .dot.strong.on { background: #7bd0ff; border-color: #7bd0ff; box-shadow: 0 0 12px #7bd0ff; }
        .transport { margin-left: auto; display: flex; align-items: center; gap: 12px; }
        .tonal { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 999px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .tonal:hover { background: var(--surface-3); border-color: var(--text-faint); }
        .play { width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--primary); color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .play:hover { filter: brightness(1.08); }
        .ct-x { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--text-dim); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .ct-x:hover { color: var(--text); border-color: var(--primary); }
        @media (max-width: 860px) {
          .ct-inner { flex-wrap: wrap; gap: 12px; }
          .transport { margin-left: auto; }
        }
      `}</style>
    </div>
  );
}
