"use client";
/**
 * „Add a song" — importă UN cântec din bibliotecă într-un item de Order.
 * Pas 1: caută (autocomplete) + alege un cântec. Pas 2: alege aranjamentul (default + altele) + gama. → Import.
 * La import: onImport({ songId, arrangementId, keyId, title, lengthSec }). Titlul + length se iau din cântec.
 */
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { songsApi } from "@/lib/api/client";
import Skeleton from "@/components/ui/Skeleton";

export default function LinkSongModal({ onClose, onImport }) {
  const [q, setQ] = useState("");
  const [songs, setSongs] = useState([]);
  const [picked, setPicked] = useState(null);   // { id, title }
  const [song, setSong] = useState(null);        // songsApi.get (arrangements)
  const [arrId, setArrId] = useState("");
  const [arr, setArr] = useState(null);          // songsApi.arrangement (keys + length)
  const [keyId, setKeyId] = useState("");
  const [busy, setBusy] = useState(false);
  const t = useRef(null);

  useEffect(() => {
    if (picked) return;
    clearTimeout(t.current);
    t.current = setTimeout(async () => {
      try { const r = await songsApi.list(q ? { q } : {}); setSongs(r.songs || []); } catch { setSongs([]); }
    }, 220);
    return () => clearTimeout(t.current);
  }, [q, picked]);

  async function pick(s) {
    setPicked({ id: s.id, title: s.title }); setSong(null); setArr(null); setArrId(""); setKeyId("");
    try { const full = await songsApi.get(s.id); setSong(full); const aid = full.arrangements?.[0]?.id || ""; setArrId(aid); }
    catch { /* noop */ }
  }
  async function createNew() {
    const title = q.trim(); if (!title) return;
    setBusy(true);
    try { const r = await songsApi.create({ title }); if (r?.id) await pick({ id: r.id, title }); }
    catch { /* noop */ } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!picked || !arrId) { setArr(null); return; }
    songsApi.arrangement(picked.id, arrId).then((a) => { setArr(a); setKeyId((a.keys || [])[0]?.id || ""); }).catch(() => setArr(null));
  }, [picked, arrId]);

  function doImport() {
    if (!picked || !arrId) return;
    onImport({ songId: picked.id, arrangementId: arrId, keyId: keyId || "", title: picked.title, lengthSec: arr?.lengthSec || 0 });
  }

  return (
    <Modal title="Add a song" width={560} onClose={onClose}
      footer={picked ? (
        <>
          <button className="btn btn-ghost" onClick={() => { setPicked(null); setSong(null); setArr(null); }}>Înapoi</button>
          <button className="btn btn-primary" disabled={!arrId || busy} onClick={doImport}>Import</button>
        </>
      ) : <button className="btn btn-ghost" onClick={onClose}>Anulează</button>}
    >
      {!picked ? (
        <>
          <input className="input" autoFocus placeholder="Caută cântec după titlu…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="list">
            {songs.map((s) => (
              <button key={s.id} className="srow" onClick={() => pick(s)}>
                <span className="sinfo"><span className="st">{s.title}</span><span className="sa">{[s.author, (s.keys || []).join(", ")].filter(Boolean).join(" · ")}</span></span>
                {s.bpm ? <span className="bpm">{s.bpm}</span> : null}
              </button>
            ))}
            {q.trim() && !songs.some((s) => s.title.toLowerCase() === q.trim().toLowerCase()) && (
              <button className="srow new" onClick={createNew} disabled={busy}>
                <span className="sinfo"><span className="st">Creează „{q.trim()}"</span><span className="sa">Cântec nou</span></span>
              </button>
            )}
            {!songs.length && !q.trim() && <div className="none">Caută un cântec după titlu.</div>}
          </div>
        </>
      ) : (
        <div className="pick">
          <div className="picked-ttl">{picked.title}</div>
          {!song ? <Skeleton lines={3} /> : (
            <>
              <label className="pl">Aranjament</label>
              <select className="input" value={arrId} onChange={(e) => setArrId(e.target.value)}>
                {(song.arrangements || []).map((a, i) => <option key={a.id} value={a.id}>{a.name}{i === 0 ? " (default)" : ""}</option>)}
              </select>
              <label className="pl">Gamă</label>
              <select className="input" value={keyId} onChange={(e) => setKeyId(e.target.value)} disabled={!arr}>
                <option value="">— fără gamă —</option>
                {(arr?.keys || []).map((k) => <option key={k.id} value={k.id}>{k.label || k.startKey}</option>)}
              </select>
              <div className="pmeta">{arr ? `Length ${arr.lengthLabel || "0:00"}${arr.bpm ? ` · BPM ${arr.bpm}` : ""}${arr.meter ? ` · ${arr.meter}` : ""}` : "…"}</div>
            </>
          )}
        </div>
      )}
      <style jsx>{`
        .list { margin-top: 10px; max-height: 46vh; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
        .srow { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: transparent; border: none; color: var(--text); padding: 9px 8px; border-radius: 7px; cursor: pointer; }
        .srow:hover { background: var(--surface-2); }
        .srow.new { color: var(--product); }
        .sinfo { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .st { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sa { font-size: 11.5px; color: var(--text-faint); }
        .bpm { color: var(--text-faint); font-size: 11.5px; flex: none; }
        .none { color: var(--text-faint); font-size: 12.5px; padding: 14px 4px; }
        .picked-ttl { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
        .pl { display: block; color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; margin: 10px 0 5px; }
        .pmeta { color: var(--text-dim); font-size: 12px; margin-top: 12px; }
      `}</style>
    </Modal>
  );
}
