"use client";
/**
 * Transpose — alegi gama țintă; se creează un fișier nou în cardul acelei game: {nume}-{gamă}.
 * (Pentru chart-uri generate din ChordPro. Audio/YouTube = în curând.)
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { ALL_KEYS } from "@/lib/songs/chordpro";

export default function TransposeModal({ file, onClose, onPick, askSource = false, defaultSource = "" }) {
  const [key, setKey] = useState("");
  const [src, setSrc] = useState(defaultSource || "");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!key || busy || (askSource && !src)) return;
    setBusy(true);
    await onPick(key, src);
  }

  return (
    <Modal title={`Transpune: ${file?.name || ""}`} onClose={onClose} width={420}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Anulează</button>
        <button className="btn btn-primary" onClick={go} disabled={!key || busy || (askSource && !src)}>{busy ? "Se transpune…" : "Transpune"}</button>
      </>}>
      {askSource && (
        <>
          <div className="lbl">Gama actuală <span className="sub">(în ce gamă e fișierul acum)</span></div>
          <div className="grid">
            {ALL_KEYS.map((k) => (
              <button key={k} className={`k ${src === k ? "on" : ""}`} onClick={() => setSrc(k)}>{k}</button>
            ))}
          </div>
          <div className="sep" />
        </>
      )}
      <div className="lbl">Gama țintă</div>
      <div className="grid">
        {ALL_KEYS.map((k) => (
          <button key={k} className={`k ${key === k ? "on" : ""}`} onClick={() => setKey(k)}>{k}</button>
        ))}
      </div>
      <p className="hint">
        {askSource
          ? <>Din <b>{src || "…"}</b> în <b>{key || "…"}</b>. Se creează „{(file?.name || "").replace(/\s*in\s+\S+\s*$/i, "").replace(/-[A-G][b#]?m?$/i, "").replace(/\.[^.]+$/, "")}-{key || "…"}.mp3" în cardul gamei {key || "alese"}.</>
          : <>Se creează „{(file?.name || "").replace(/\s*in\s+\S+$/i, "").replace(/-\S+$/, "")}-{key || "…"}" în cardul gamei {key || "alese"}.</>}
      </p>
      <style jsx>{`
        .lbl { font-size: 12.5px; color: var(--text); margin-bottom: 10px; font-weight: 500; }
        .lbl .sub { color: var(--text-faint); font-weight: 400; }
        .sep { height: 1px; background: var(--border); margin: 16px 0; }
        .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
        .k { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 36px; cursor: pointer; font-size: 13px; }
        .k:hover { border-color: var(--primary); }
        .k.on { background: var(--primary); border-color: var(--primary); color: #fff; }
        .hint { color: var(--text-faint); font-size: 12px; margin-top: 14px; }
      `}</style>
    </Modal>
  );
}
