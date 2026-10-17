"use client";
/**
 * Add Key — adaugă o gamă aranjamentului (apare o coloană nouă în Files).
 * startKey (KeyPicker) + opțional „ends in" (modulează) + descriere.
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import KeyPicker from "@/components/songs/KeyPicker";

export default function AddKeyModal({ onClose, onSubmit }) {
  const [startKey, setStartKey] = useState("");
  const [endKey, setEndKey] = useState("");
  const [description, setDescription] = useState("");
  const [pick, setPick] = useState(null); // "start" | "end" | null
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!startKey) { setErr("Alege cheia de start."); return; }
    setBusy(true); setErr("");
    try { await onSubmit({ startKey, endKey: endKey || "", description }); }
    catch (e) { setErr(e?.message || "Eroare."); setBusy(false); }
  }

  return (
    <Modal title="Add a key" onClose={onClose} width={420}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "…" : "Add"}</button>
      </>}>
      {err && <div className="err">{err}</div>}
      <div className="two">
        <div>
          <label className="lbl">Key</label>
          <button type="button" className="sel" onClick={() => setPick(pick === "start" ? null : "start")}>{startKey || "Select"} ▾</button>
          {pick === "start" && <div className="pop"><KeyPicker value={startKey} onPick={(k) => { setStartKey(k); setPick(null); }} /></div>}
        </div>
        <div>
          <label className="lbl">Ends in (opțional)</label>
          <button type="button" className="sel" onClick={() => setPick(pick === "end" ? null : "end")}>{endKey || "Same"} ▾</button>
          {pick === "end" && <div className="pop"><KeyPicker value={endKey} onPick={(k) => { setEndKey(k); setPick(null); }} /></div>}
        </div>
      </div>
      <label className="lbl">Descriere (opțional)</label>
      <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      <style jsx>{`
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .lbl { display: block; font-size: 12.5px; color: var(--text); margin: 6px 0 6px; font-weight: 500; }
        .sel { width: 100%; height: 34px; text-align: left; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 4px; color: var(--text-dim); padding: 0 10px; cursor: pointer; }
        .pop { position: relative; z-index: 5; margin-top: 6px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 8px; }
      `}</style>
    </Modal>
  );
}
