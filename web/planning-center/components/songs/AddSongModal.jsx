"use client";
/**
 * Add Song — modalul din PCO (screenshot 43/44/47):
 * Title, Arrangement Name (placeholder „Default Arrangement"), Key (KeyPicker), Capo, Tags,
 * „Select files to import" (seam — upload/link se fac în pagina de detaliu). Submit:
 *   POST /songs {title}  →  POST /songs/:id/arrangements {name, startKey}  →  detaliu.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import KeyPicker from "@/components/songs/KeyPicker";
import { songsApi } from "@/lib/api/client";

const CAPOS = ["None", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function AddSongModal({ onClose, onCreated }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [arrName, setArrName] = useState("");
  const [startKey, setStartKey] = useState("");
  const [capo, setCapo] = useState("None");
  const [keyOpen, setKeyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!title.trim()) { setErr("Titlul e obligatoriu."); return; }
    setBusy(true); setErr("");
    try {
      const song = await songsApi.create({ title: title.trim(), defaultKey: startKey || "" });
      await songsApi.addArrangement(song.id, {
        name: (arrName.trim() || "Default Arrangement"),
        startKey: startKey || undefined,
      });
      onCreated?.(song);
      router.push(`/songs/${song.id}`);
    } catch (e) { setErr(e?.message || "Eroare la creare."); setBusy(false); }
  }

  return (
    <Modal
      title="Add Song"
      onClose={onClose}
      width={520}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "…" : "Submit"}</button>
      </>}
    >
      {err && <div className="err">{err}</div>}

      <label className="lbl">Title</label>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

      <label className="lbl">Arrangement Name</label>
      <input className="input" placeholder="Default Arrangement" value={arrName} onChange={(e) => setArrName(e.target.value)} />

      <div className="two">
        <div>
          <label className="lbl">Key</label>
          <button type="button" className="select" onClick={() => setKeyOpen((v) => !v)}>
            {startKey || "Select a key"} <span className="car">▾</span>
          </button>
          {keyOpen && (
            <div className="pop">
              <KeyPicker value={startKey} onPick={(k) => { setStartKey(k); setKeyOpen(false); }} />
            </div>
          )}
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

      <div className="sep" />
      <div className="import-note">Select files to import</div>
      <label className="chk"><input type="checkbox" disabled /> Upload or link more files <span className="soon">(în pagina piesei)</span></label>

      <style jsx>{`
        .lbl { display: block; font-size: 12.5px; color: var(--text); margin: 14px 0 6px; font-weight: 500; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .select { width: 100%; height: 34px; text-align: left; background: var(--surface-2);
          border: 1px solid var(--border-strong); border-radius: 4px; color: var(--text-dim); padding: 0 10px; cursor: pointer; }
        .car { float: right; color: var(--text-faint); }
        .pop { position: relative; z-index: 5; margin-top: 6px; }
        .tag-add { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          height: 34px; padding: 0 14px; border-radius: 4px; cursor: pointer; }
        .sep { height: 1px; background: var(--border); margin: 18px 0 14px; }
        .import-note { font-weight: 600; margin-bottom: 8px; }
        .chk { display: flex; align-items: center; gap: 8px; color: var(--text-dim); font-size: 13px; }
        .soon { color: var(--text-faint); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; }
      `}</style>
    </Modal>
  );
}
