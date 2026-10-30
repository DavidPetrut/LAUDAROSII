"use client";
/**
 * Alege cântece pt. Order — căutare în biblioteca de cântece, multi-select (în ordine),
 * „Nou" creează un cântec din titlul căutat. La Adaugă → onPick([{id,title}...]) în ordinea selecției.
 */
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { songsApi } from "@/lib/api/client";

export default function SongPickerModal({ onClose, onPick, mode = "songs" }) {
  const medley = mode === "medley";
  const [q, setQ] = useState("");
  const [songs, setSongs] = useState([]);
  const [sel, setSel] = useState([]);       // [{id,title}] în ordinea selecției
  const [busy, setBusy] = useState(false);
  const t = useRef(null);

  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(async () => {
      try { const r = await songsApi.list(q ? { q } : {}); setSongs(r.songs || []); } catch { setSongs([]); }
    }, 220);
    return () => clearTimeout(t.current);
  }, [q]);

  const isSel = (id) => sel.some((s) => String(s.id) === String(id));
  function toggle(song) {
    setSel((cur) => isSel(song.id) ? cur.filter((s) => String(s.id) !== String(song.id)) : [...cur, { id: song.id, title: song.title }]);
  }
  async function createNew() {
    const title = q.trim(); if (!title) return;
    setBusy(true);
    try { const r = await songsApi.create({ title }); if (r?.id) setSel((c) => [...c, { id: r.id, title }]); setQ(""); }
    catch { /* noop */ } finally { setBusy(false); }
  }

  return (
    <Modal title={medley ? "Medley — alege cântece (min. 2)" : "Adaugă cântec"} width={560} onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Anulează</button>
          <button className="btn btn-primary" disabled={(medley ? sel.length < 2 : !sel.length) || busy} onClick={() => onPick(sel)}>
            {medley ? `Creează medley${sel.length ? ` (${sel.length})` : ""}` : (sel.length ? `Adaugă ${sel.length}` : "Adaugă")}
          </button>
        </>
      }
    >
      <input className="input" autoFocus placeholder="Caută cântece…" value={q} onChange={(e) => setQ(e.target.value)} />
      {sel.length > 0 && (
        <div className="selbar">
          {sel.map((s, i) => <span key={s.id} className="selchip">{i + 1}. {s.title}<button onClick={() => setSel((c) => c.filter((x) => String(x.id) !== String(s.id)))}>✕</button></span>)}
        </div>
      )}
      <div className="list">
        {songs.map((s) => (
          <button key={s.id} className={`srow ${isSel(s.id) ? "on" : ""}`} onClick={() => toggle(s)}>
            <span className="chk">{isSel(s.id) ? "✓" : ""}</span>
            <span className="sinfo"><span className="st">{s.title}</span><span className="sa">{[s.author, (s.keys || []).join(", ")].filter(Boolean).join(" · ")}</span></span>
            {s.bpm ? <span className="bpm">{s.bpm}</span> : null}
          </button>
        ))}
        {q.trim() && !songs.some((s) => s.title.toLowerCase() === q.trim().toLowerCase()) && (
          <button className="srow new" onClick={createNew} disabled={busy}>
            <span className="chk">＋</span><span className="sinfo"><span className="st">Creează „{q.trim()}"</span><span className="sa">Cântec nou</span></span>
          </button>
        )}
        {!songs.length && !q.trim() && <div className="none">Caută un cântec după titlu.</div>}
      </div>
      <style jsx>{`
        .selbar { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 4px; }
        .selchip { display: inline-flex; align-items: center; gap: 6px; background: rgba(47,129,247,.14); border: 1px solid var(--primary); color: var(--text); border-radius: 16px; padding: 3px 10px; font-size: 12px; }
        .selchip button { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 11px; }
        .list { margin-top: 10px; max-height: 46vh; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
        .srow { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: transparent; border: none; color: var(--text); padding: 9px 8px; border-radius: 7px; cursor: pointer; }
        .srow:hover { background: var(--surface-2); }
        .srow.on { background: rgba(47,129,247,.1); }
        .srow.new { color: var(--product); }
        .chk { width: 18px; flex: none; text-align: center; color: var(--product); font-weight: 700; }
        .sinfo { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .st { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sa { font-size: 11.5px; color: var(--text-faint); }
        .bpm { color: var(--text-faint); font-size: 11.5px; flex: none; }
        .none { color: var(--text-faint); font-size: 12.5px; padding: 14px 4px; }
      `}</style>
    </Modal>
  );
}
