"use client";
/**
 * Editor „Words" — pentru că AI-ul nu e 100% exact, userul corectează manual versurile pentru public.
 * Se deschide POPULAT (din wordsText salvat, sau derivat din ChordPro dacă încă nu există) + preview live
 * care arată exact ca PDF-ul. La Save: persistă + REGENEREAZĂ PDF-ul Words. Fără acorduri — doar cuvinte.
 */
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { api, songsApi } from "@/lib/api/client";
import { buildWords, wordsTextToLines } from "@/lib/songs/chordpro";
import { generateChartPdf } from "@/lib/songs/pdf";

const linesToText = (lines) => lines.map((l) => (l.kind === "section" ? l.label : l.kind === "empty" ? "" : l.lyricRow)).join("\n");

export default function WordsEditorModal({ songId, arrId, song, arr, onClose, onSaved }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState(arr?.wordsTitle || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Populează: din textul salvat, altfel derivă din ChordPro (ca să nu fie gol).
  useEffect(() => {
    (async () => {
      if ((arr?.wordsText || "").trim()) { setText(arr.wordsText); return; }
      try {
        const cc = await api.get(`/songs/${songId}/arrangements/${arrId}/chordchart`);
        setText(linesToText(buildWords(cc.chordpro || "", { translate: arr?.wordsTranslate !== false }).lines));
      } catch { setText(""); }
    })();
  }, [songId, arrId, arr]);

  const previewLines = wordsTextToLines(text);
  const pdfTitle = title.trim() || song?.title;

  async function save() {
    setBusy(true); setErr("");
    try {
      await songsApi.updateArrangement(songId, arrId, { wordsText: text, wordsTitle: title.trim() });
      const blob = await generateChartPdf({
        title: pdfTitle, keyLabel: "Words", bpm: arr?.bpm, meter: arr?.meter, arrName: arr?.name, author: song?.author,
        seqTokens: [], lines: wordsTextToLines(text), variant: "words", fontSize: 16,
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
    <Modal title="Editează Words" width={900} onClose={() => !busy && onClose()}
      footer={<>
        <button className="btn btn-link" onClick={onClose} disabled={busy}>Anulează</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Se salvează…" : "Salvează & regenerează"}</button>
      </>}>
      {err && <div className="werr">{err}</div>}
      <label className="wlbl">Titlu <span className="sub">(cum apare pe PDF)</span></label>
      <input className="wtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={song?.title || "Titlul melodiei"} />

      <div className="wsplit">
        <div className="wcol">
          <div className="wch">Editează</div>
          <textarea className="wta" value={text} onChange={(e) => setText(e.target.value)} spellCheck
            placeholder={"Strofa 1\nprimul vers…"} />
        </div>
        <div className="wcol">
          <div className="wch">Preview</div>
          <div className="wprev">
            <div className="wprev-title">{pdfTitle || "…"}</div>
            {previewLines.map((ln, i) => (
              ln.kind === "section" ? <div key={i} className="wpsec">{ln.label}</div>
                : ln.kind === "empty" ? <div key={i} className="wpempty">&nbsp;</div>
                  : <div key={i} className="wprow">{ln.lyricRow || " "}</div>
            ))}
          </div>
        </div>
      </div>
      <p className="whint">Doar cuvinte. Etichetele (Strofa, Refren, Bridge…) stau pe rândul lor. Repetiție: <b>/: … :/ ×N</b> inline pe un rând, sau <b>/:</b> și <b>:/ ×N</b> pe rânduri proprii pt. toată secțiunea.</p>
      <style jsx>{`
        .wlbl { display: block; font-size: 12.5px; color: var(--text); margin: 4px 0 6px; font-weight: 500; }
        .wlbl .sub { color: var(--text-faint); font-weight: 400; }
        .wtitle { width: 100%; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 36px; padding: 0 11px; font-size: 14px; }
        .wtitle:focus { outline: none; border-color: var(--primary); }
        .wsplit { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .wcol { display: flex; flex-direction: column; min-width: 0; }
        .wch { font-size: 11.5px; color: var(--text-faint); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
        .wta { width: 100%; min-height: 360px; resize: vertical; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text);
          border-radius: 8px; padding: 12px; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; line-height: 1.6; white-space: pre; }
        .wta:focus { outline: none; border-color: var(--primary); }
        .wprev { min-height: 360px; max-height: 480px; overflow: auto; background: #fff; color: #111; border-radius: 8px; padding: 16px 18px;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; }
        .wprev-title { font-weight: 800; font-size: 17px; margin-bottom: 12px; overflow-wrap: anywhere; }
        .wpsec { font-weight: 800; margin: 14px 0 4px; }
        .wprev > .wpsec:first-of-type { margin-top: 0; }
        .wprow { white-space: pre-wrap; }
        .wpempty { height: .6em; }
        .whint { font-size: 12px; color: var(--text-faint); margin: 12px 0 0; }
        .werr { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 8px; }
      `}</style>
    </Modal>
  );
}
