"use client";
/**
 * Add a file (screenshot 56-63). Trei moduri, ca în PCO:
 *   - Upload:    drag & drop / browse → Cloudinary (/uploads) → creează fișier (audio etc.).
 *   - Streaming: YouTube/Vimeo/Apple/Spotify/Amazon → link.
 *   - File Link: Link + Name.
 * Comun: „Attach to" (Arrangement SAU o anumită cheie) + „Tags" (Chord Chart / Lyrics / Capo Chart)
 * care setează felul fișierului. (Integrations/MultiTracks = OMIS intenționat — nu le folosim.)
 */
import { useState, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { api, songsApi } from "@/lib/api/client";
import { detectKey } from "@/lib/songs/keyDetect";

const STREAMS = ["YouTube", "Vimeo", "Apple Music", "Spotify", "Amazon Music"];
const TAGS = [
  { v: "", label: "— fără —" },
  { v: "chordChart", label: "Chord Chart" },
  { v: "lyrics", label: "Lyrics" },
  { v: "capoChart", label: "Capo Chart" },
];

export default function AddFileModal({ songId, arrangementId, keys = [], onClose, onDone }) {
  const [mode, setMode] = useState("upload"); // upload | streaming | link
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [attachKey, setAttachKey] = useState(""); // "" = Arrangement (global), altfel keyId
  const [tag, setTag] = useState("");
  const [stream, setStream] = useState("YouTube");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [uploaded, setUploaded] = useState(null); // {url,name}
  const [detected, setDetected] = useState(null); // { display, label, conf }
  const [detecting, setDetecting] = useState(false);
  const fileRef = useRef(null);

  async function doUpload(file) {
    if (!file) return;
    setBusy(true); setErr(""); setDetected(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await api.post("/uploads", fd);
      setUploaded({ url: r.url, name: r.name || file.name, resourceType: r.resourceType });
      if (!name) setName(r.name || file.name);
      // Detecție gamă (doar audio) — estimare în browser, în fundal.
      const isAudio = /^audio\//.test(file.type) || /\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(file.name);
      if (isAudio) {
        setDetecting(true);
        try { const ab = await file.arrayBuffer(); const d = await detectKey(ab); if (d) setDetected(d); }
        catch {} finally { setDetecting(false); }
      }
    } catch (e) { setErr(e?.message || "Upload eșuat."); }
    finally { setBusy(false); }
  }

  async function submit() {
    setErr("");
    let url = "", kind = tag || "link", source = "link";
    if (mode === "upload") {
      if (!uploaded) { setErr("Încarcă un fișier întâi."); return; }
      url = uploaded.url; source = "upload";
      kind = tag || (/(audio|video)/.test(uploaded.resourceType || "") ? "audio" : "file");
    } else {
      url = link.trim();
      if (!url) { setErr("Pune un link."); return; }
      source = mode === "streaming" ? stream.toLowerCase().replace(/\s+/g, "") : "link";
    }
    let finalName = (name.trim() || url.split("/").pop() || "Fișier");
    // Dacă estimarea e sigură, pune eticheta „in X" direct în nume (varianta preferată).
    if (detected && detected.conf >= 0.6 && !/\bin\s+\S+\s*$/i.test(finalName)) finalName = `${finalName} in ${detected.label}`;
    setBusy(true);
    try {
      await songsApi.addFile(songId, arrangementId, {
        name: finalName, url, kind, source, keyId: attachKey || undefined,
        detectedKey: detected?.display || "", detectedLabel: detected?.label || "", detectedConf: detected?.conf || 0,
      });
      onDone?.();
    } catch (e) { setErr(e?.message || "Eroare la salvare."); setBusy(false); }
  }

  return (
    <Modal title="Add a file" onClose={onClose} width={560}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Done</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "…" : "Submit"}</button>
      </>}>
      {err && <div className="err">{err}</div>}

      <div className="tabs">
        <button className={mode === "upload" ? "on" : ""} onClick={() => setMode("upload")}>Upload</button>
        <button className={mode === "streaming" ? "on" : ""} onClick={() => setMode("streaming")}>Streaming Services</button>
        <button className={mode === "link" ? "on" : ""} onClick={() => setMode("link")}>File Link</button>
      </div>

      {mode === "upload" && (
        <div className="drop" onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); doUpload(e.dataTransfer.files?.[0]); }}>
          <input ref={fileRef} type="file" hidden onChange={(e) => doUpload(e.target.files?.[0])} />
          {busy ? "Se încarcă…" : uploaded ? `✓ ${uploaded.name}` : "Drag & drop un fișier, sau click pentru browse"}
        </div>
      )}
      {mode === "upload" && (detecting || detected) && (
        <div className="detk">
          {detecting ? "Detectez gama…" : (
            <>Gamă detectată: <b>{detected.display}</b> · estimare {Math.round(detected.conf * 100)}%
              {detected.conf >= 0.6 ? <span className="ok"> — se adaugă „in {detected.label}" la nume</span>
                : <span className="dim"> — nesigur, o găsești la „info" pe fișier</span>}</>
          )}
        </div>
      )}

      {mode === "streaming" && (
        <>
          <div className="streams">
            {STREAMS.map((s) => <button key={s} className={stream === s ? "on" : ""} onClick={() => setStream(s)}>{s}</button>)}
          </div>
          <label className="lbl">Link {stream}</label>
          <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
        </>
      )}

      {mode === "link" && (
        <>
          <label className="lbl">Link</label>
          <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
        </>
      )}

      <label className="lbl">Name</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nume fișier" />

      <div className="two">
        <div>
          <label className="lbl">Attach to</label>
          <select className="input" value={attachKey} onChange={(e) => setAttachKey(e.target.value)}>
            <option value="">Arrangement (toate cheile)</option>
            {keys.map((k) => <option key={k.id} value={k.id}>Key [{k.label || k.startKey}]</option>)}
          </select>
        </div>
        <div>
          <label className="lbl">Tags</label>
          <select className="input" value={tag} onChange={(e) => setTag(e.target.value)}>
            {TAGS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <style jsx>{`
        .tabs { display: flex; gap: 6px; margin-bottom: 14px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        .tabs button { background: transparent; border: none; color: var(--text-dim); padding: 6px 10px; cursor: pointer; border-radius: 6px; font-size: 13px; }
        .tabs button.on { color: var(--primary); background: rgba(47,129,247,.12); }
        .drop { border: 1px dashed var(--border-strong); border-radius: 8px; padding: 26px; text-align: center; color: var(--text-dim); cursor: pointer; }
        .drop:hover { border-color: var(--primary); }
        .detk { margin-top: 10px; font-size: 12.5px; color: var(--text-dim); background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; }
        .detk b { color: var(--text); }
        .detk .ok { color: #7bd88f; }
        .detk .dim { color: var(--text-faint); }
        .streams { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .streams button { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12.5px; }
        .streams button.on { color: var(--primary); border-color: var(--primary); }
        .lbl { display: block; font-size: 12.5px; color: var(--text); margin: 14px 0 6px; font-weight: 500; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; }
      `}</style>
    </Modal>
  );
}
