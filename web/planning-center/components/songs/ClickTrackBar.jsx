"use client";
/**
 * Container Click Track — bară dedicată jos (mai mare decât player-ul de muzică), rulează în fundal.
 * Pad de pian samplat + metronom cu accente; preia implicit gama/BPM/măsura aranjamentului,
 * dar le poți schimba LIVE aici fără să afectezi setările salvate. X = oprește + închide.
 */
import { useEffect, useRef, useState } from "react";
import { ClickTrackEngine, accentPattern, KEYS, METERS } from "@/lib/clicktrack/engine";

export default function ClickTrackBar({ defaults, playerActive, onClose }) {
  const engineRef = useRef(null);
  const [st, setSt] = useState({ keyName: "C", mode: "major", bpm: 72, meter: "4/4", playing: false, ready: false, loading: false });
  const [beat, setBeat] = useState(-1);

  useEffect(() => {
    const eng = new ClickTrackEngine();
    engineRef.current = eng;
    eng.onState = (s) => setSt(s);
    eng.onBeat = (b) => setBeat(b);
    eng.setDefaults(defaults || {});
    eng.start(); // pornește imediat (click-ul de deschidere e gestul audio)
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
          <div className="ct-sub">{st.loading ? "se încarcă pianul…" : st.ready ? "pad + metronom" : "metronom"}</div>
        </div>

        <div className="ct-controls">
          <div className="grp">
            <label>Gamă</label>
            <div className="row">
              <select value={st.keyName} onChange={(e) => eng().setKey(e.target.value)}>
                {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <div className="seg">
                <button className={st.mode === "major" ? "on" : ""} onClick={() => eng().setMode("major")}>Major</button>
                <button className={st.mode === "minor" ? "on" : ""} onClick={() => eng().setMode("minor")}>Minor</button>
              </div>
            </div>
          </div>

          <div className="grp">
            <label>BPM</label>
            <div className="row">
              <button className="step" onClick={() => eng().setBpm(st.bpm - 1)}>−</button>
              <input type="number" value={st.bpm} onChange={(e) => eng().setBpm(e.target.value)} />
              <button className="step" onClick={() => eng().setBpm(st.bpm + 1)}>+</button>
            </div>
          </div>

          <div className="grp">
            <label>Măsură</label>
            <select value={st.meter} onChange={(e) => eng().setMeter(e.target.value)}>
              {METERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="beats">
            {pattern.map((acc, i) => (
              <span key={i} className={`dot ${acc === 2 ? "strong" : acc === 1 ? "med" : ""} ${beat === i && st.playing ? "on" : ""}`} />
            ))}
          </div>

          <button className={`play ${st.playing ? "stop" : ""}`} onClick={() => eng().toggle()}>
            {st.playing ? "⏸ Pauză" : "▶ Pornește"}
          </button>
        </div>

        <button className="ct-x" onClick={onClose} aria-label="Închide">✕</button>
      </div>

      <style jsx>{`
        .ct { position: fixed; left: 0; right: 0; z-index: 78; background: linear-gradient(180deg, var(--surface-3), var(--surface-2)); border-top: 1px solid var(--border-strong); box-shadow: 0 -10px 30px rgba(0,0,0,.45); }
        .ct-inner { position: relative; max-width: 1200px; margin: 0 auto; padding: 14px 54px 14px 20px; display: flex; align-items: center; gap: 26px; }
        .ct-head { min-width: 120px; }
        .ct-title { font-size: 14px; font-weight: 700; letter-spacing: 1.2px; color: var(--text); }
        .ct-sub { font-size: 11px; color: var(--text-faint); margin-top: 2px; }
        .ct-controls { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; flex: 1; }
        .grp { display: flex; flex-direction: column; gap: 5px; }
        .grp > label { font-size: 10.5px; letter-spacing: .5px; text-transform: uppercase; color: var(--text-faint); }
        .row { display: flex; align-items: center; gap: 6px; }
        select, input { background: var(--surface); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 7px 9px; font-size: 13px; }
        input[type="number"] { width: 62px; text-align: center; }
        .seg { display: flex; border: 1px solid var(--border-strong); border-radius: 6px; overflow: hidden; }
        .seg button { background: var(--surface); border: none; color: var(--text-dim); padding: 7px 12px; cursor: pointer; font-size: 12.5px; }
        .seg button.on { background: var(--primary); color: #fff; }
        .step { background: var(--surface); border: 1px solid var(--border-strong); color: var(--text); width: 30px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 16px; }
        .step:hover { border-color: var(--primary); }
        .beats { display: flex; align-items: center; gap: 8px; padding: 0 4px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border-strong); transition: transform .05s, background .05s; }
        .dot.strong { width: 15px; height: 15px; }
        .dot.on { background: var(--primary); border-color: var(--primary); transform: scale(1.25); box-shadow: 0 0 10px var(--primary); }
        .dot.strong.on { background: #7bd0ff; border-color: #7bd0ff; box-shadow: 0 0 12px #7bd0ff; }
        .play { margin-left: auto; background: var(--primary); border: none; color: #fff; border-radius: 8px; padding: 11px 22px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .play:hover { filter: brightness(1.08); }
        .play.stop { background: var(--surface); border: 1px solid var(--border-strong); color: var(--text); }
        .ct-x { position: absolute; top: 10px; right: 14px; background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px; }
        .ct-x:hover { color: var(--text); }
        @media (max-width: 760px) {
          .ct-inner { flex-direction: column; align-items: stretch; gap: 12px; padding: 12px 44px 12px 16px; }
          .play { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}
