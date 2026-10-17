"use client";
/**
 * Song Information (screenshot 49): Title, CCLI#, Authors, Copyright, Administration, Notes, Themes.
 * Submit => PATCH /songs/:id (vezi backend). Pentru americani (CCLI) — la noi opțional.
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";

export default function SongInfoModal({ song, onClose, onSubmit }) {
  const [f, setF] = useState({
    title: song?.title || "", ccli: song?.ccli || "", author: song?.author || "",
    copyrightYear: song?.copyrightYear || "", administration: song?.administration || "",
    notes: song?.notes || "", themes: (song?.themes || []).join(", "),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit() {
    if (!f.title.trim()) { setErr("Titlul e obligatoriu."); return; }
    setBusy(true); setErr("");
    try {
      await onSubmit({
        title: f.title.trim(), ccli: f.ccli.trim(), author: f.author.trim(),
        copyrightYear: f.copyrightYear.trim(), administration: f.administration.trim(),
        notes: f.notes, themes: f.themes.split(",").map((t) => t.trim()).filter(Boolean),
      });
    } catch (e) { setErr(e?.message || "Eroare."); setBusy(false); }
  }

  return (
    <Modal title="Song Information" onClose={onClose} width={520}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "…" : "Submit"}</button>
      </>}>
      {err && <div className="err">{err}</div>}
      <div className="two">
        <div><label className="lbl">Song Title</label><input className="input" value={f.title} onChange={set("title")} /></div>
        <div><label className="lbl">CCLI #</label><input className="input" value={f.ccli} onChange={set("ccli")} /></div>
      </div>
      <label className="lbl">Authors</label>
      <input className="input" value={f.author} onChange={set("author")} />
      <label className="lbl">Copyright</label>
      <input className="input" value={f.copyrightYear} onChange={set("copyrightYear")} />
      <label className="lbl">Administration</label>
      <input className="input" value={f.administration} onChange={set("administration")} />
      <div className="two">
        <div><label className="lbl">Notes</label><textarea className="input ta" value={f.notes} onChange={set("notes")} /></div>
        <div><label className="lbl">Themes</label><textarea className="input ta" value={f.themes} onChange={set("themes")} placeholder="ex: Închinare, Har" /></div>
      </div>
      <style jsx>{`
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .lbl { display: block; font-size: 12.5px; color: var(--text); margin: 14px 0 6px; font-weight: 500; }
        .ta { height: 72px; padding: 8px 10px; resize: vertical; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; }
      `}</style>
    </Modal>
  );
}
