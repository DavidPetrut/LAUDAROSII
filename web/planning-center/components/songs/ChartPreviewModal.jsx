"use client";
/**
 * Preview „in-app" al unui chart (ca în PCO): deschide un ecran stilizat (NU PDF brut în browser),
 * cu chei/numere/numerals/lyrics randate frumos, + butoane Download / Print / X în dreapta sus.
 * Download & Print folosesc ACELAȘI generator PDF (identice cu ce se salvează).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { renderChordPro, lyricToHtml } from "@/lib/songs/chordpro";
import { abbreviateSequence } from "@/lib/songs/sequence";
import { generateChartPdf } from "@/lib/songs/pdf";

const CHORD = "#0921ff";

export default function ChartPreviewModal({ songId, arrId, song, arr, mode = "chords", targetKey = "", onClose }) {
  const [text, setText] = useState("");
  const [originalKey, setOriginalKey] = useState("C");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cc = await api.get(`/songs/${songId}/arrangements/${arrId}/chordchart`);
        setText(cc.chordpro || ""); setOriginalKey(cc.originalKey || targetKey || "C");
      } catch { /* gol */ } finally { setLoading(false); }
    })();
  }, [songId, arrId, targetKey]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tk = mode === "chords" ? (targetKey || originalKey) : originalKey;
  const lines = useMemo(() => renderChordPro(text, { mode, originalKey, targetKey: tk }), [text, mode, originalKey, tk]);
  const keyLabel = mode === "lyrics" ? "Lyrics" : mode === "numbers" ? "Numbers" : mode === "numerals" ? "Numerals" : (targetKey || originalKey);
  const seqTokens = abbreviateSequence(arr?.sequence || []);

  const buildPdf = useCallback(() => generateChartPdf({
    title: song?.title, keyLabel, bpm: arr?.bpm, meter: arr?.meter, arrName: arr?.name, author: song?.author,
    seqTokens, lines, chordColorHex: CHORD, fontSize: 16,
  }), [song, arr, keyLabel, seqTokens, lines]);

  const download = async () => {
    const blob = await buildPdf();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(song?.title || "chart")} - ${keyLabel}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const print = async () => {
    const blob = await buildPdf();
    const url = URL.createObjectURL(blob);
    const ifr = document.createElement("iframe");
    ifr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    ifr.src = url;
    ifr.onload = () => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch { window.open(url); } };
    document.body.appendChild(ifr);
    setTimeout(() => { ifr.remove(); URL.revokeObjectURL(url); }, 60000);
  };

  return (
    <div className="ov">
      <div className="top">
        <div className="ttl">{keyLabel === (targetKey || originalKey) && mode === "chords" ? `Chord Chart in ${keyLabel}` : `${keyLabel} Chart`}</div>
        <div className="acts">
          <button onClick={download} title="Descarcă PDF" aria-label="Download">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>
          </button>
          <button onClick={print} title="Printează" aria-label="Print">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/></svg>
          </button>
          <button onClick={onClose} title="Închide" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
      </div>
      <div className="scroll">
        <div className="sheet">
          <div className="hdr">
            <div className="hdr-title">{song?.title || "…"} <span className="hdr-key">[{keyLabel}, {arr?.bpm || "—"} bpm, {arr?.meter || "4/4"}]</span></div>
            <div className="hdr-arr">[{arr?.name}]{song?.author ? <> by <b>{song.author}</b></> : null}</div>
            {seqTokens.length > 0 && <div className="hdr-seq">{seqTokens.join(", ")}</div>}
          </div>
          <div className="body">
            {loading ? <div className="dim">Se încarcă…</div> : lines.map((ln, i) => {
              if (ln.kind === "empty") return <div key={i} className="pl">&nbsp;</div>;
              if (ln.kind === "section") return <div key={i} className="psec">{ln.label}</div>;
              const hasLyric = ln.lyricRow && ln.lyricRow.replace(/<\/?[biu]>/gi, "").trim();
              return (
                <div key={i} className="prow">
                  {ln.chordRow ? <pre className="pch">{ln.chordRow}</pre> : null}
                  {hasLyric ? <pre className="ply" dangerouslySetInnerHTML={{ __html: lyricToHtml(ln.lyricRow) }} /> : (!ln.chordRow ? <pre className="ply">&nbsp;</pre> : null)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .ov { position: fixed; inset: 0; z-index: 70; background: rgba(8,10,13,.72); display: flex; flex-direction: column; }
        .top { height: 50px; display: flex; align-items: center; padding: 0 20px; color: #e7e9ec; }
        .ttl { font-size: 15px; font-weight: 600; }
        .acts { margin-left: auto; display: flex; gap: 6px; }
        .acts button { background: transparent; border: none; color: #c7ccd2; width: 34px; height: 34px; border-radius: 7px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .acts button:hover { background: rgba(255,255,255,.1); color: #fff; }
        .scroll { flex: 1; overflow-y: scroll; display: flex; justify-content: center; padding: 0 16px 40px; }
        .scroll::-webkit-scrollbar { width: 12px; }
        .scroll::-webkit-scrollbar-thumb { background: #4a545f; border-radius: 6px; border: 3px solid transparent; background-clip: content-box; }
        .scroll::-webkit-scrollbar-track { background: transparent; }
        .sheet { width: 100%; max-width: 860px; background: #fff; color: #111; border-radius: 4px 4px 0 0; box-shadow: 0 6px 40px rgba(0,0,0,.5); min-height: 100%; padding: 22px 26px 60px; }
        .hdr { background: #edeef0; border: 1px solid #e0e1e4; border-radius: 10px; padding: 18px 22px; margin-bottom: 20px; }
        .hdr-title { font-size: 22px; font-weight: 700; letter-spacing: -.2px; }
        .hdr-key { font-weight: 700; }
        .hdr-arr { font-size: 11px; font-weight: 700; color: #444; margin-top: 4px; }
        .hdr-seq { font-weight: 700; margin-top: 8px; font-size: 15px; }
        .body { padding: 2px 2px; font-family: "PcMono", "Courier New", monospace; font-size: 18px; }
        .psec { font-weight: 900; margin: 22px 0 6px; letter-spacing: .4px; }
        .body > .psec:first-child { margin-top: 0; }
        .prow { margin-bottom: 3px; }
        .pch, .ply { font-family: inherit; margin: 0; white-space: pre; font-size: inherit; line-height: 1.3; }
        .pch { font-weight: 700; color: ${CHORD}; }
        .pl { height: .7em; }
        .dim { color: #888; }
      `}</style>
    </div>
  );
}
