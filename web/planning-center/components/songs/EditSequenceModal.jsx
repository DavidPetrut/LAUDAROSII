"use client";
/**
 * Edit Sequence (screenshot 51/52/53): stânga = secvența curentă (reordonabilă prin drag,
 * × pentru ștergere); dreapta = paleta de secțiuni (click => adaugă) + „Add a new label" (custom).
 * Salvează un array de stringuri (label-uri) — identic cu ce stochează/mobilul citește.
 * Drag & drop nativ HTML5 (fără librării — regula „nimic crazy").
 */
import { useState, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { SECTION_TYPES } from "@/lib/songs/sequence";

export default function EditSequenceModal({ initial = [], onClose, onSave }) {
  const [seq, setSeq] = useState(Array.isArray(initial) ? [...initial] : []);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const dragFrom = useRef(null);

  const add = (label) => setSeq((s) => [...s, label]);
  const removeAt = (i) => setSeq((s) => s.filter((_, idx) => idx !== i));

  function onDrop(i) {
    const from = dragFrom.current;
    if (from == null || from === i) return;
    setSeq((s) => { const c = [...s]; const [m] = c.splice(from, 1); c.splice(i, 0, m); return c; });
    dragFrom.current = null;
  }

  async function save() {
    setBusy(true);
    try { await onSave(seq); } finally { setBusy(false); }
  }

  return (
    <Modal title="Edit Sequence" onClose={onClose} width={620}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "…" : "Save"}</button>
      </>}>
      <div className="lbl">Sequence</div>
      <div className="cols">
        <div className="seq">
          {seq.length === 0 && <div className="hint">Adaugă secțiuni din dreapta →</div>}
          {seq.map((label, i) => (
            <div key={i} className="srow" draggable
              onDragStart={() => (dragFrom.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}>
              <span className="grip">⠿</span>
              <span className="slabel">{label}</span>
              <button className="rx" onClick={() => removeAt(i)}>✕</button>
            </div>
          ))}
        </div>
        <div className="palette">
          {SECTION_TYPES.map((t) => (
            <button key={t} className="ptile" onClick={() => add(t)}>⠿ {t}</button>
          ))}
          <div className="newlabel">
            <input className="input" placeholder="Add a new label" value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) { add(custom.trim()); setCustom(""); } }} />
            <button className="plus" onClick={() => { if (custom.trim()) { add(custom.trim()); setCustom(""); } }}>＋</button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .lbl { font-size: 12.5px; color: var(--text-dim); margin-bottom: 10px; }
        .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 320px; }
        .seq { border: 1px solid var(--border); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .hint { color: var(--text-faint); font-size: 13px; padding: 10px; }
        .srow { display: flex; align-items: center; gap: 8px; background: var(--surface-2);
          border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; cursor: grab; }
        .grip, .rx { color: var(--text-faint); }
        .slabel { flex: 1; font-size: 13px; }
        .rx { background: transparent; border: none; cursor: pointer; }
        .palette { display: flex; flex-wrap: wrap; align-content: flex-start; gap: 8px; }
        .ptile { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px;
          color: var(--text); padding: 7px 11px; cursor: pointer; font-size: 13px; height: fit-content; }
        .ptile:hover { border-color: var(--primary); }
        .newlabel { display: flex; gap: 6px; width: 100%; margin-top: 6px; }
        .plus { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; width: 36px; cursor: pointer; color: var(--text); }
      `}</style>
    </Modal>
  );
}
