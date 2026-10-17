"use client";
/**
 * Add Arrangement (screenshot 64): Name, Key, Capo, Tags, „Select files to import".
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import KeyPicker from "@/components/songs/KeyPicker";

const CAPOS = ["None", "1", "2", "3", "4", "5", "6", "7"];

export default function AddArrangementModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [startKey, setStartKey] = useState("");
  const [capo, setCapo] = useState("None");
  const [keyOpen, setKeyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!name.trim()) { setErr("Numele aranjamentului e obligatoriu."); return; }
    setBusy(true); setErr("");
    try { await onSubmit({ name: name.trim(), startKey: startKey || undefined }); }
    catch (e) { setErr(e?.message || "Eroare."); setBusy(false); }
  }

  return (
    <Modal title="Add Arrangement" onClose={onClose} width={520}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "…" : "Submit"}</button>
      </>}>
      {err && <div className="err">{err}</div>}
      <label className="lbl">Name</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="two">
        <div>
          <label className="lbl">Key</label>
          <button type="button" className="sel" onClick={() => setKeyOpen((v) => !v)}>{startKey || "Select a key"} ▾</button>
          {keyOpen && <div className="pop"><KeyPicker value={startKey} onPick={(k) => { setStartKey(k); setKeyOpen(false); }} /></div>}
        </div>
        <div>
          <label className="lbl">Capo</label>
          <select className="input" value={capo} onChange={(e) => setCapo(e.target.value)}>
            {CAPOS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <label className="lbl">Tags</label>
      <button type="button" className="tag-add">Add Tag</button>
      <style jsx>{`
        .lbl { display: block; font-size: 12.5px; color: var(--text); margin: 14px 0 6px; font-weight: 500; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .sel { width: 100%; height: 34px; text-align: left; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 4px; color: var(--text-dim); padding: 0 10px; cursor: pointer; }
        .pop { position: relative; z-index: 5; margin-top: 6px; }
        .tag-add { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); height: 34px; padding: 0 14px; border-radius: 4px; cursor: pointer; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; }
      `}</style>
    </Modal>
  );
}
