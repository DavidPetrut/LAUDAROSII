"use client";
/**
 * Editor „Words" — pentru că AI-ul nu e 100% exact, userul poate corecta manual versurile pentru public.
 * Editează textul Words salvat (wordsText) + titlul PDF-ului. La Save: persistă + REGENEREAZĂ PDF-ul Words.
 * Nu sunt acorduri/game aici — doar cuvinte, deci e un simplu editor de text (monospace), curat.
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { songsApi } from "@/lib/api/client";
import { wordsTextToLines } from "@/lib/songs/chordpro";
import { generateChartPdf } from "@/lib/songs/pdf";

export default function WordsEditorModal({ songId, arrId, song, arr, onClose, onSaved }) {
  const [text, setText] = useState(arr?.wordsText || "");
  const [title, setTitle] = useState(arr?.wordsTitle || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    try {
      await songsApi.updateArrangement(songId, arrId, { wordsText: text, wordsTitle: title.trim() });
      // Regenerează PDF-ul Words din textul editat (fără AI — e deja corectat manual).
      const blob = await generateChartPdf({
        title: title.trim() || song?.title, keyLabel: "Words", bpm: arr?.bpm, meter: arr?.meter,
        arrName: arr?.name, author: song?.author, seqTokens: [], lines: wordsTextToLines(text), variant: "words", fontSize: 16,
      });
      for (const o of (arr?.arrangementFiles || []).filter((f) => f.source === "generated" && f.name === "Words")) {
        try { await songsApi.deleteFile(songId, arrId, o.id); } catch { /* ignore */ }
      }
      const up = await songsApi.uploadBlob(blob, "Words.pdf", "raw");
      await songsApi.addFile(songId, arrId, { name: "Words", url: up.url, kind: "words", source: "generated" });
      onSaved?.();
    } catch (e) { setErr(e?.message || "Eroare la salvare."); setBusy(false); }
  }

  return (
    <Modal title="Editează Words" width={620} onClose={() => !busy && onClose()}
      footer={<>
        <button className="btn btn-link" onClick={onClose} disabled={busy}>Anulează</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Se salvează…" : "Salvează & regenerează"}</button>
      </>}>
      {err && <div className="werr">{err}</div>}
      <label className="wlbl">Titlu <span className="sub">(cum apare pe PDF)</span></label>
      <input className="wtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={song?.title || "Titlul melodiei"} />
      <label className="wlbl">Versuri</label>
      <textarea className="wta" value={text} onChange={(e) => setText(e.target.value)} spellCheck
        placeholder={"Strofa 1\nprimul vers…\n\nRefren\n/: versuri…\n:/  ×2"} />
      <p className="whint">Doar cuvinte — fără acorduri. Etichetele de secțiune (Strofa, Refren, Bridge…) stau pe rândul lor. Marcajele de repetiție: <b>/:</b> înainte de vers și <b>:/ ×N</b> dedesubt.</p>
      <style jsx>{`
        .wlbl { display: block; font-size: 12.5px; color: var(--text); margin: 12px 0 6px; font-weight: 500; }
        .wlbl .sub { color: var(--text-faint); font-weight: 400; }
        .wtitle { width: 100%; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 36px; padding: 0 11px; font-size: 14px; }
        .wtitle:focus { outline: none; border-color: var(--primary); }
        .wta { width: 100%; min-height: 320px; resize: vertical; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text);
          border-radius: 8px; padding: 12px; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; line-height: 1.6; white-space: pre; }
        .wta:focus { outline: none; border-color: var(--primary); }
        .whint { font-size: 12px; color: var(--text-faint); margin: 10px 0 0; }
        .werr { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 8px; }
      `}</style>
    </Modal>
  );
}
