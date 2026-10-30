"use client";
/**
 * Chart COMBINAT pt. un medley — randează chord chart-ul fiecărui snippet, în ordine, cu săgeți jos.
 * Derivat (nu se stochează nimic): pt. fiecare copil cu arrangement, aduce ChordPro-ul și îl transpune
 * în gama snippet-ului (renderChordPro). Reutilizează motorul `lib/songs/chordpro`.
 */
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import { renderChordPro } from "@/lib/songs/chordpro";

const CHORD = "#4b8bff";

function ChartLines({ lines }) {
  return (
    <div className="cc-chart">
      {lines.map((l, i) => {
        if (l.kind === "empty") return <div key={i} className="cc-empty" />;
        if (l.kind === "section") return <div key={i} className="cc-section">{l.label}</div>;
        return (
          <div key={i} className="cc-row">
            {l.chordRow ? <pre className="cc-chords">{l.chordRow}</pre> : null}
            <pre className="cc-lyric">{l.lyricRow || " "}</pre>
          </div>
        );
      })}
      <style jsx>{`
        .cc-chart { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
        .cc-empty { height: 10px; }
        .cc-section { color: var(--text-faint); font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: .5px; margin: 10px 0 4px; }
        .cc-row { margin: 0; }
        .cc-chords { margin: 0; color: ${CHORD}; font-weight: 700; font-size: 12.5px; white-space: pre; line-height: 1.35; }
        .cc-lyric { margin: 0; color: var(--text); font-size: 12.5px; white-space: pre; line-height: 1.4; }
      `}</style>
    </div>
  );
}

export default function CombinedChartView({ children = [], title = "Medley", onClose }) {
  const [charts, setCharts] = useState([]); // [{title, keyName, lines|null, note, sequence}]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = [];
      for (const c of children) {
        let lines = null;
        if (c.songId && c.arrangementId) {
          try {
            const cc = await api.get(`/songs/${c.songId}/arrangements/${c.arrangementId}/chordchart`);
            if (cc?.chordpro) lines = renderChordPro(cc.chordpro, { mode: "chords", originalKey: cc.originalKey || c.keyName || "C", targetKey: c.keyName || cc.originalKey || "" });
          } catch { /* fără chart */ }
        }
        res.push({ title: c.title || "—", keyName: c.keyName || "", lines, note: c.note || "", sequence: c.sequence || [] });
      }
      if (alive) { setCharts(res); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [children]);

  return (
    <Modal title={`Chart combinat — ${title}`} width={760} onClose={onClose}>
      {loading ? <div className="cc-load">Se asamblează chartul…</div> : (
        <div className="cc">
          {charts.map((c, i) => (
            <div key={i} className="cc-block">
              <div className="cc-head"><span className="cc-t">{c.title}</span>{c.keyName && <span className="cc-k">{c.keyName}</span>}</div>
              {c.sequence?.length ? <div className="cc-seq">{c.sequence.join(" · ")}</div> : null}
              {c.note ? <div className="cc-note">{c.note}</div> : null}
              {c.lines ? <ChartLines lines={c.lines} /> : <div className="cc-nochart">Fără chord chart în editor pt. acest cântec.</div>}
              {i < charts.length - 1 && <div className="cc-arrow">↓</div>}
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .cc-load { padding: 30px; color: var(--text-faint); text-align: center; }
        .cc-block { }
        .cc-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .cc-t { color: var(--text); font-size: 15px; font-weight: 600; }
        .cc-k { color: var(--product); border: 1px solid var(--product); border-radius: 4px; font-size: 11.5px; font-weight: 600; padding: 0 6px; }
        .cc-seq { color: var(--text-dim); font-size: 12px; margin-bottom: 6px; }
        .cc-note { color: var(--text-dim); font-size: 12.5px; background: var(--surface-2); border-radius: 6px; padding: 7px 10px; margin-bottom: 8px; }
        .cc-nochart { color: var(--text-faint); font-size: 12.5px; padding: 8px 0; }
        .cc-arrow { text-align: center; color: var(--primary); font-size: 22px; margin: 14px 0; }
      `}</style>
    </Modal>
  );
}
