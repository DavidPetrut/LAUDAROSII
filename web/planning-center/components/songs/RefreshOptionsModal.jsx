"use client";
/**
 * „Update" (fostul refresh) — o modală cu opțiuni combinabile peste ChordPro-ul din editor.
 * Explicația e pe stânga rândului, bifa pe dreapta. Se pot bifa oricâte; se aplică în ordine la Update.
 *   1. Simplifică acordurile  2. Corectează cuvintele (AI, fără a atinge acordurile)  3. Elimină acordurile
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";

const OPTS = [
  { id: "simplify", title: "Simplifică acordurile", desc: "Scoate extensiile (7, 9, sus, add, dim…) și păstrează doar forma simplă (rădăcină + major/minor). Diezii/bemolii rămân. Acordurile identice consecutive se unesc." },
  { id: "fixWords", title: "Corectează cuvintele și spațierea", desc: "Repară cuvintele rupte și spațiile greșite (ex. «Du m ne zeu» → «Dumnezeu»), prin AI. Nu atinge acordurile dintre paranteze, nici pozițiile lor." },
  { id: "stripChords", title: "Elimină toate acordurile", desc: "Șterge toate acordurile din paranteze pătrate împreună cu spațiul pe care-l ocupau, lăsând doar versurile curate." },
];

export default function RefreshOptionsModal({ onClose, onApply, busy = false }) {
  const [sel, setSel] = useState({ simplify: false, fixWords: false, stripChords: false });
  const any = sel.simplify || sel.fixWords || sel.stripChords;
  const toggle = (id) => setSel((s) => ({ ...s, [id]: !s[id] }));

  return (
    <Modal title="Update text & acorduri" width={500} onClose={() => !busy && onClose()}
      footer={<>
        <button className="btn btn-link" onClick={onClose} disabled={busy}>Anulează</button>
        <button className="btn btn-primary" onClick={() => onApply(sel)} disabled={!any || busy}>{busy ? "Se aplică…" : "Update"}</button>
      </>}>
      <div className="list">
        {OPTS.map((o) => (
          <button key={o.id} type="button" className={`row ${sel[o.id] ? "on" : ""}`} onClick={() => toggle(o.id)} disabled={busy}>
            <div className="txt">
              <div className="t">{o.title}</div>
              <div className="d">{o.desc}</div>
            </div>
            <div className={`chk ${sel[o.id] ? "on" : ""}`} aria-hidden>
              {sel[o.id] && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
            </div>
          </button>
        ))}
      </div>
      <p className="hint">Se pot combina. Rezultatul se poate anula oricând cu <b>Ctrl+Z</b>.</p>

      <style jsx>{`
        .list { display: flex; flex-direction: column; gap: 8px; }
        .row { display: flex; align-items: center; gap: 14px; text-align: left; width: 100%;
          background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: border-color .12s, background .12s; }
        .row:hover { border-color: var(--border-strong); }
        .row.on { border-color: var(--primary); background: rgba(47,129,247,.08); }
        .txt { flex: 1; }
        .t { font-size: 13.5px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
        .d { font-size: 12px; color: var(--text-dim); line-height: 1.45; }
        .chk { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid var(--border-strong);
          display: flex; align-items: center; justify-content: center; color: #fff; }
        .chk.on { background: var(--primary); border-color: var(--primary); }
        .hint { font-size: 12px; color: var(--text-faint); margin: 14px 0 0; }
      `}</style>
    </Modal>
  );
}
