"use client";
/**
 * Import PCO PDF → preview. Urcă un PDF exportat din PlanningCenter, îl parsează pe server
 * (acorduri peste silabe + titlu/gamă/BPM/măsură/sequence) și arată un preview editabil.
 * Starea parsată e „ridicată" la părinte (prop `value` + `onChange`) ca butonul Submit al
 * modalului să poată face commit-ul. Gama e pre-completată din PDF, dar editabilă (important!).
 */
import { useRef, useState } from "react";
import { songsApi } from "@/lib/api/client";
import { ALL_KEYS } from "@/lib/songs/chordpro";

export default function ImportPcoPdf({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  async function doParse(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { setErr("Alege un fișier PDF."); return; }
    setBusy(true); setErr("");
    try {
      const r = await songsApi.importPcoParse(file);
      onChange({ ...r, fileName: file.name }); // key vine pre-completat din PDF
    } catch (e) { setErr(e?.message || "Nu am putut citi PDF-ul."); }
    finally { setBusy(false); }
  }

  if (!value) {
    return (
      <>
        {err && <div className="err">{err}</div>}
        <div className="drop" onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); doParse(e.dataTransfer.files?.[0]); }}>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => doParse(e.target.files?.[0])} />
          <div className="drop-ic">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /><path d="M12 11v6" /><path d="m9 14 3-3 3 3" /></svg>
          </div>
          {busy ? "Se citește PDF-ul…" : "Trage un PDF exportat din Planning Center, sau click pt. browse"}
          <div className="hint">Acordurile se vor așeza automat peste silabe, exact ca în PCO.</div>
        </div>
      </>
    );
  }

  const v = value;
  return (
    <>
      {err && <div className="err">{err}</div>}
      <div className="row">
        <label className="lbl">Titlu</label>
        <input className="input" value={v.title || ""} onChange={(e) => onChange({ ...v, title: e.target.value })} />
      </div>

      <div className="meta">
        {v.bpm ? <span className="chip">{v.bpm} BPM</span> : null}
        {v.meter ? <span className="chip">{v.meter}</span> : null}
        {v.sequence ? <span className="chip seq" title={v.sequence}>Sequence ✓</span> : null}
        <button className="relink" onClick={() => onChange(null)}>↺ alt PDF</button>
      </div>

      <label className="lbl">Gama originală <span className="sub">(verific-o — din ea se transpune corect)</span></label>
      <div className="keys">
        {ALL_KEYS.map((k) => (
          <button key={k} className={`k ${v.key === k ? "on" : ""}`} onClick={() => onChange({ ...v, key: k })}>{k}</button>
        ))}
      </div>

      <label className="lbl">Preview</label>
      <pre className="preview">{v.chordpro}</pre>

      {Array.isArray(v.warnings) && v.warnings.length > 0 && (
        <div className="warn">{v.warnings.join(" ")}</div>
      )}

      <style jsx>{`
        .row { margin-bottom: 4px; }
        .lbl { display: block; font-size: 12.5px; color: var(--text); margin: 12px 0 6px; font-weight: 500; }
        .lbl .sub { color: var(--text-faint); font-weight: 400; }
        .meta { display: flex; align-items: center; gap: 6px; margin: 10px 0 2px; flex-wrap: wrap; }
        .chip { font-size: 11.5px; color: var(--text-dim); background: var(--surface-2); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; }
        .chip.seq { color: #7bd88f; }
        .relink { margin-left: auto; background: transparent; border: none; color: var(--primary); font-size: 12px; cursor: pointer; }
        .keys { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
        .k { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 34px; cursor: pointer; font-size: 13px; }
        .k:hover { border-color: var(--primary); }
        .k.on { background: var(--primary); border-color: var(--primary); color: #fff; }
        .preview { background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; max-height: 260px; overflow: auto;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; color: var(--text); white-space: pre; margin: 0; }
        .drop { border: 1px dashed var(--border-strong); border-radius: 10px; padding: 30px 20px; text-align: center; color: var(--text-dim); cursor: pointer; }
        .drop:hover { border-color: var(--primary); }
        .drop-ic { color: var(--primary); display: flex; justify-content: center; margin-bottom: 10px; }
        .hint { color: var(--text-faint); font-size: 12px; margin-top: 8px; }
        .warn { margin-top: 10px; font-size: 12px; color: #e7b04b; background: rgba(231,176,75,.1); border: 1px solid rgba(231,176,75,.3); border-radius: 6px; padding: 8px 10px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; }
      `}</style>
    </>
  );
}
