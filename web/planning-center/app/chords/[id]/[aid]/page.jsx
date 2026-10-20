"use client";
/**
 * Editor „Lyrics & Chords" (ChordPro) — full-screen, identic PCO (screenshots 66-85).
 * Stânga: editor monospace (single source of truth). Dreapta: preview derivat (foaia albă).
 * Sus-stânga: Original Key + Options(Formatting). Mijloc: selector preview (gamă/Numbers/Numerals/Lyrics).
 * Sus-dreapta: „Create PDFs: Numerals | Numbers | Lyrics" + auto-refresh/auto-save.
 * Salvare auto în /chordchart (există pe producție). Generarea PDF-urilor stocate = pasul următor.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, songsApi } from "@/lib/api/client";
import { isAuthed } from "@/lib/auth/auth";
import { renderChordPro, ALL_KEYS, lyricToHtml, isSection } from "@/lib/songs/chordpro";
import { runAi } from "@/lib/ai/client";
import { abbreviateSequence } from "@/lib/songs/sequence";
import { paginateLines } from "@/lib/songs/paginate";
import { generateChartPdf } from "@/lib/songs/pdf";
import ChordProEditor from "@/components/songs/ChordProEditor";
import Modal from "@/components/ui/Modal";

const PDF_NAMES = { numerals: "Numerals Chart", numbers: "Numbers Chart", lyrics: "Lyrics" };

const CHORD_COLORS = { Blue: "#0921ff", Orange: "#d98a2b", Black: "#111", Green: "#2f9e5b", Red: "#d14b43" };

// ── Hotkeys configurabile (persistate în localStorage ≈ „forever") ────────────
// Structură extensibilă: adaugi aici acțiuni noi + un fn în handler-ul global.
const HOTKEY_ACTIONS = [
  { id: "beautify", label: "Aranjează", hint: "Formatează versurile și acordurile (ChordPro)" },
];
const DEFAULT_BINDINGS = [
  { id: "def-beautify", action: "beautify", combo: "ctrl+s", removable: false },
];
const HK_LS_KEY = "pc.chordEditor.hotkeys.v1";

const isModifierKey = (k) => k === "Control" || k === "Meta" || k === "Alt" || k === "Shift";

function comboFromEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  if (!isModifierKey(e.key)) parts.push(e.key === " " ? "space" : e.key.toLowerCase());
  return parts.join("+");
}
function comboLabel(combo) {
  if (!combo) return "";
  const cap = (p) => (p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1));
  return combo.split("+").map(cap).join(" + ");
}
const actionLabel = (id) => HOTKEY_ACTIONS.find((a) => a.id === id)?.label || id;
const actionHint = (id) => HOTKEY_ACTIONS.find((a) => a.id === id)?.hint || "";
const hkUid = () => Math.random().toString(36).slice(2, 9);

function loadHotkeys() {
  try {
    const raw = localStorage.getItem(HK_LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return Array.isArray(p?.bindings) ? p.bindings : null;
  } catch { return null; }
}
function saveHotkeys(bindings) {
  // localStorage nu expiră (≈ „forever"); salvăm și un savedAt informativ.
  try { localStorage.setItem(HK_LS_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), bindings })); } catch {}
}
function initBindings() {
  if (typeof window === "undefined") return DEFAULT_BINDINGS.slice();
  const stored = loadHotkeys();
  if (!stored || !stored.length) return DEFAULT_BINDINGS.slice();
  const out = stored.slice();
  // Asigură că acțiunile default (ne-ștergibile) există mereu (ex. versiuni noi de cod).
  for (const d of DEFAULT_BINDINGS) if (!out.some((b) => b.id === d.id)) out.unshift(d);
  return out;
}

export default function ChordEditor() {
  const { id, aid } = useParams();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [song, setSong] = useState(null);
  const [arr, setArr] = useState(null);
  const [text, setText] = useState("");
  const [originalKey, setOriginalKey] = useState("C");
  const [previewSel, setPreviewSel] = useState("original"); // "original" | key | "numbers" | "numerals" | "lyrics"
  const [pdfs, setPdfs] = useState({ numerals: false, numbers: true, lyrics: true });
  const [formatting, setFormatting] = useState({ font: "Courier, Monospaced", size: 16, chordColor: "Blue", columns: 1 });
  const [fmtOpen, setFmtOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState(""); // "Typing…" | "Saved"
  const [gen, setGen] = useState(""); // mesaj generare PDF
  const saveTimer = useRef(null);
  const loaded = useRef(false);
  // Options modal (taburi) + hotkeys
  const [optTab, setOptTab] = useState("fmt"); // "fmt" | "hk"
  const [bindings, setBindings] = useState(initBindings);
  const [capturingId, setCapturingId] = useState(null); // id binding | "__add__" | null
  const [capturePreview, setCapturePreview] = useState("");
  const [addingHk, setAddingHk] = useState(false);
  const [addAction, setAddAction] = useState(HOTKEY_ACTIONS[0].id);
  const capturingRef = useRef(false);

  useEffect(() => { if (!isAuthed()) { router.replace("/login"); return; } setReady(true); }, [router]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const [s, a, cc] = await Promise.all([
          songsApi.get(id), songsApi.arrangement(id, aid),
          api.get(`/songs/${id}/arrangements/${aid}/chordchart`),
        ]);
        setSong(s); setArr(a);
        setText(cc.chordpro || "");
        setOriginalKey(cc.originalKey || a.keys?.[0]?.startKey || "C");
        if (cc.formatting && Object.keys(cc.formatting).length) setFormatting((f) => ({ ...f, ...cc.formatting }));
        loaded.current = true;
      } catch (e) { /* lăsăm gol */ loaded.current = true; }
    })();
  }, [ready, id, aid]);

  // Auto-save (debounced). NU salvăm gol → nu creăm fișiere inutile (cerința ta).
  const scheduleSave = useCallback((nextText, nextKey, nextFmt) => {
    if (!loaded.current) return;
    setStatus("Typing…");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!String(nextText).trim()) { setStatus(""); return; }
      try {
        await api.put(`/songs/${id}/arrangements/${aid}/chordchart`, { chordpro: nextText, originalKey: nextKey, formatting: nextFmt });
        setStatus("Saved");
      } catch { setStatus(""); }
    }, 900);
  }, [id, aid]);

  const onText = (v) => { setText(v); scheduleSave(v, originalKey, formatting); };
  const onKey = (v) => { setOriginalKey(v); scheduleSave(text, v, formatting); };
  const onFmt = (patch) => { const nf = { ...formatting, ...patch }; setFormatting(nf); scheduleSave(text, originalKey, nf); };

  // „Aranjează" (Ctrl+S): scoate rândurile goale inutile + pune un rând gol înainte de fiecare secțiune.
  // NU atinge liniile cu acorduri (le lasă verbatim) — case/space sensitive.
  const beautify = useCallback(() => {
    const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    for (const line of lines) {
      if (line.trim() === "") continue;
      if (isSection(line) && out.length > 0) out.push("");
      out.push(line);
    }
    const next = out.join("\n");
    if (next !== text) onText(next);
  }, [text]);

  // Persistă hotkeys (localStorage ≈ „forever"). Merge și fără (try/catch în save).
  useEffect(() => { saveHotkeys(bindings); }, [bindings]);
  useEffect(() => { capturingRef.current = capturingId != null; }, [capturingId]);

  // Un singur handler global: mapează combinația tastată → acțiune (din bindings).
  useEffect(() => {
    const fns = { beautify };
    const h = (e) => {
      if (capturingRef.current) return; // suntem în modul de reasignare
      const combo = comboFromEvent(e);
      if (!combo) return;
      const hit = bindings.find((b) => b.combo === combo);
      const fn = hit && fns[hit.action];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [bindings, beautify]);

  // ── Capturare combinații (rebind / add) ─────────────────────────────────────
  const startCapture = (id) => { setCapturePreview(""); setCapturingId(id); };
  const cancelCapture = () => { setCapturingId(null); setCapturePreview(""); };
  const onCaptureKey = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (e.key === "Escape") { cancelCapture(); return; }
    if (isModifierKey(e.key)) { setCapturePreview(comboLabel(comboFromEvent(e))); return; }
    const combo = comboFromEvent(e);
    if (!combo) return;
    setBindings((bs) => bs.map((b) => (b.id === id ? { ...b, combo } : b)));
    cancelCapture();
  };
  const onAddCaptureKey = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.key === "Escape") { cancelCapture(); setAddingHk(false); return; }
    if (isModifierKey(e.key)) { setCapturePreview(comboLabel(comboFromEvent(e))); return; }
    const combo = comboFromEvent(e);
    if (!combo) return;
    setBindings((bs) => (bs.some((b) => b.action === addAction && b.combo === combo)
      ? bs : [...bs, { id: hkUid(), action: addAction, combo, removable: true }]));
    cancelCapture(); setAddingHk(false);
  };
  const removeBinding = (id) => setBindings((bs) => bs.filter((b) => b.id !== id));

  // AI pe selecție (din bara editorului). Gateway-ul server (§10) se activează la deploy.
  const aiTransform = useCallback(async (selected, prompt) => {
    const r = await runAi({ feature: "editor", action: "transform-lyrics", prompt, context: { selected } });
    if (r?.raw?.text) return r.raw.text;
    return { error: r?.message || r?.raw?.message || "AI indisponibil (verifică deploy-ul Render / cheia)." };
  }, []);

  // Modul + gama țintă pentru preview.
  const mode = ["numbers", "numerals", "lyrics"].includes(previewSel) ? previewSel : "chords";
  const targetKey = previewSel === "original" ? originalKey : (mode === "chords" ? previewSel : originalKey);
  const lines = useMemo(() => renderChordPro(text, { mode, originalKey, targetKey }),
    [text, mode, originalKey, targetKey]);
  // Paginare în puncte (ca PDF) ca împărțirea pe pagini din preview să corespundă cu PDF-ul.
  const pages = useMemo(() => paginateLines(lines, { fontSize: formatting.size * 0.9 }), [lines, formatting.size]);

  const keyLabel = mode === "lyrics" ? "Lyrics" : mode === "numbers" ? "Numbers" : mode === "numerals" ? "Numerals" : targetKey;
  const seqTokens = abbreviateSequence(arr?.sequence || []);
  const chordColor = CHORD_COLORS[formatting.chordColor] || CHORD_COLORS.Blue;

  // ── Generează PDF-urile selectate (explicit, ca să NU se adune fișiere). Șterge vechiul de același fel. ──
  async function doGenerate() {
    if (!text.trim()) { setGen("Scrie întâi versurile/acordurile."); return; }
    const types = Object.entries(pdfs).filter(([, v]) => v).map(([k]) => k);
    const keySel = ALL_KEYS.includes(previewSel) ? previewSel : null;
    if (types.length === 0 && !keySel) { setGen("Selectează cel puțin un tip (Numerals/Numbers/Lyrics)."); return; }
    setGen("Se generează…");
    try {
      const fresh = await songsApi.arrangement(id, aid); // ultimele fișiere
      const common = { title: song?.title, bpm: arr?.bpm, meter: arr?.meter, arrName: arr?.name, author: song?.author, seqTokens, chordColorHex: chordColor, fontSize: formatting.size };

      // 1) Numerals / Numbers / Lyrics → card Arrangement (independente de gamă)
      for (const t of types) {
        const lns = renderChordPro(text, { mode: t, originalKey, targetKey: originalKey });
        const blob = await generateChartPdf({ ...common, keyLabel: t[0].toUpperCase() + t.slice(1), lines: lns });
        const name = PDF_NAMES[t];
        for (const o of (fresh.arrangementFiles || []).filter((f) => f.source === "generated" && f.name === name)) {
          try { await songsApi.deleteFile(id, aid, o.id); } catch { /* endpoint nedeployat încă */ }
        }
        const up = await songsApi.uploadBlob(blob, `${name}.pdf`, "raw");
        await songsApi.addFile(id, aid, { name, url: up.url, kind: t, source: "generated" });
      }

      // 2) Chord chart (cu acorduri) → cardul GAMEI: mereu gama originală + gama de preview (dacă diferă).
      const keysToChart = [...new Set([originalKey, ...(keySel ? [keySel] : [])])];
      for (const kk of keysToChart) {
        const k = (fresh.keys || []).find((x) => x.startKey === kk);
        if (!k) continue;
        const lns = renderChordPro(text, { mode: "chords", originalKey, targetKey: kk });
        const blob = await generateChartPdf({ ...common, keyLabel: kk, lines: lns });
        const name = `Chord Chart in ${kk}`;
        for (const o of (k.files || []).filter((f) => f.source === "generated" && f.name === name)) {
          try { await songsApi.deleteFile(id, aid, o.id); } catch {}
        }
        const up = await songsApi.uploadBlob(blob, `${name}.pdf`, "raw");
        await songsApi.addFile(id, aid, { name, url: up.url, kind: "chordChart", source: "generated", keyId: k.id });
      }
      setArr(await songsApi.arrangement(id, aid));
      setGen("✓ PDF-uri generate (vezi în Files pe pagina piesei).");
    } catch (e) { setGen("Eroare: " + (e?.message || e)); }
  }

  if (!ready) return null;

  return (
    <div className="editor">
      {/* Top bar */}
      <div className="topbar">
        <button className="back" onClick={() => router.push(`/songs/${id}`)}>‹ Back</button>
        <div className="pdfs">
          <span className="pdfs-l">Create PDFs:</span>
          {["numerals", "numbers", "lyrics"].map((k) => (
            <button key={k} className={`pdf-toggle ${pdfs[k] ? "on" : ""}`} onClick={() => setPdfs((p) => ({ ...p, [k]: !p[k] }))}>
              {pdfs[k] ? "✓ " : ""}{k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
          <button className="gen-btn" onClick={doGenerate}>Generate</button>
          {gen && <span className="gen-msg">{gen}</span>}
        </div>
      </div>

      {/* Controls: stânga = gama originală (peste editor); dreapta = Options + preview/țintă + auto (peste preview) */}
      <div className="controls">
        <div className="c-left">
          <div className="ctrl">
            <span className="ctrl-l">Original Key</span>
            <select className="ctrl-sel" value={originalKey} onChange={(e) => onKey(e.target.value)}>
              {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <button className="options" onClick={() => setFmtOpen(true)}>Options ▾</button>
        </div>
        <div className="c-right">
          <div className="ctrl mid">
            <span className="ctrl-l">Preview</span>
            <button className="ctrl-sel wide" onClick={() => setPreviewOpen((v) => !v)}>
              {previewSel === "original" ? "Original Key" : mode === "chords" ? previewSel : keyLabel} ▾
            </button>
            {previewOpen && (
              <div className="preview-menu">
                <div className="pm-row" onClick={() => { setPreviewSel("original"); setPreviewOpen(false); }}>Original Key</div>
                <div className="pm-keys">
                  {ALL_KEYS.map((k) => <button key={k} onClick={() => { setPreviewSel(k); setPreviewOpen(false); }}>{k}</button>)}
                </div>
                <div className="pm-modes">
                  <button onClick={() => { setPreviewSel("numbers"); setPreviewOpen(false); }}>Numbers</button>
                  <button onClick={() => { setPreviewSel("numerals"); setPreviewOpen(false); }}>Numerals</button>
                  <button onClick={() => { setPreviewSel("lyrics"); setPreviewOpen(false); }}>Lyrics</button>
                </div>
              </div>
            )}
          </div>
          <div className="auto">
            <span className="ar">✓ Auto-refresh</span>
            {status && <span className="st">{status}</span>}
          </div>
        </div>
      </div>

      {/* Two panes */}
      <div className="panes">
        <div className="code-pane">
          <ChordProEditor value={text} onChange={onText} fontSize={formatting.size} customLabels={arr?.sequence || []} onAi={aiTransform} defaultKey={originalKey} />
        </div>
        <div className="preview-wrap">
          {pages.map((pageLines, pi) => (
            <div className="sheet" key={pi} style={{ columnCount: formatting.columns || 1 }}>
              <div className="hdr">
                <div className="hdr-title">{song?.title || "…"} <span className="hdr-key">[{keyLabel}, {arr?.bpm || "—"} bpm, {arr?.meter || "4/4"}]</span></div>
                <div className="hdr-arr">[{arr?.name}]{song?.author ? <> by <b>{song.author}</b></> : null}</div>
                {seqTokens.length > 0 && <div className="hdr-seq">{seqTokens.join(", ")}</div>}
              </div>
              <div className="body" style={{ fontSize: formatting.size, lineHeight: 1.7 }}>
                {pageLines.map((ln, i) => {
                  if (ln.kind === "empty") return <div key={i} className="pl">&nbsp;</div>;
                  if (ln.kind === "section") return <div key={i} className="psec">{ln.label}</div>;
                  const hasLyric = ln.lyricRow && ln.lyricRow.replace(/<\/?[biu]>/gi, "").trim();
                  return (
                    <div key={i} className="prow">
                      {ln.chordRow ? <pre className="pch" style={{ color: chordColor }}>{ln.chordRow}</pre> : null}
                      {hasLyric ? <pre className="ply" dangerouslySetInnerHTML={{ __html: lyricToHtml(ln.lyricRow) }} />
                        : (!ln.chordRow ? <pre className="ply">&nbsp;</pre> : null)}
                    </div>
                  );
                })}
              </div>
              <div className="pg-num">pagina {pi + 1} / {pages.length}</div>
            </div>
          ))}
        </div>
      </div>

      {fmtOpen && (
        <Modal title="Options" width={580}
          onClose={() => { setFmtOpen(false); cancelCapture(); setAddingHk(false); }}>
          <div className="opt">
            <div className="opt-tabs">
              <button className={`opt-tab ${optTab === "fmt" ? "on" : ""}`} onClick={() => setOptTab("fmt")}>Formatare</button>
              <button className={`opt-tab ${optTab === "hk" ? "on" : ""}`} onClick={() => setOptTab("hk")}>Hotkeys</button>
            </div>
            <div className="opt-panel">
              {optTab === "fmt" ? (
                <div className="opt-fade">
                  <div className="fmt-sec">Text</div>
                  <FmtRow label="Font"><select className="input" value={formatting.font} onChange={(e) => onFmt({ font: e.target.value })}>
                    <option>Courier, Monospaced</option><option>Arial, Helvetica</option><option>Georgia, Serif</option></select></FmtRow>
                  <FmtRow label="Size"><select className="input" value={formatting.size} onChange={(e) => onFmt({ size: Number(e.target.value) })}>
                    {[10,11,12,13,14,15,16,18,20,22,24,26,28,32,36,42,48].map((s) => <option key={s} value={s}>{s}</option>)}</select></FmtRow>
                  <FmtRow label="Chord Color"><select className="input" value={formatting.chordColor} onChange={(e) => onFmt({ chordColor: e.target.value })}>
                    {Object.keys(CHORD_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}</select></FmtRow>
                  <div className="fmt-sec">Layout</div>
                  <FmtRow label="Columns"><select className="input" value={formatting.columns} onChange={(e) => onFmt({ columns: Number(e.target.value) })}>
                    <option value={1}>Default: 1</option><option value={2}>2</option></select></FmtRow>
                </div>
              ) : (
                <div className="opt-fade">
                  <div className="hk-grid">
                    <div className="hk-h">Acțiune</div>
                    <div className="hk-h">Combinație</div>
                    {bindings.map((b) => (
                      <Fragment key={b.id}>
                        <div className="hk-act" title={actionHint(b.action)}>{actionLabel(b.action)}</div>
                        <div className="hk-combo">
                          <input readOnly
                            className={`hk-in ${capturingId === b.id ? "cap" : ""}`}
                            value={capturingId === b.id ? (capturePreview || "Apasă tastele…") : comboLabel(b.combo)}
                            onDoubleClick={() => startCapture(b.id)}
                            onKeyDown={(e) => capturingId === b.id && onCaptureKey(e, b.id)}
                            onBlur={() => { if (capturingId === b.id) cancelCapture(); }}
                            title="Dublu-click pentru a reasigna" />
                          {b.removable && <button className="hk-del" onClick={() => removeBinding(b.id)} title="Șterge">✕</button>}
                        </div>
                      </Fragment>
                    ))}
                  </div>

                  {addingHk ? (
                    <div className="hk-add-row">
                      <select className="input" value={addAction} onChange={(e) => setAddAction(e.target.value)}>
                        {HOTKEY_ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                      <input readOnly autoFocus
                        className={`hk-in ${capturingId === "__add__" ? "cap" : ""}`}
                        value={capturingId === "__add__" ? (capturePreview || "Apasă tastele…") : "Dublu-click pentru combinație"}
                        onDoubleClick={() => startCapture("__add__")}
                        onKeyDown={(e) => capturingId === "__add__" && onAddCaptureKey(e)}
                        onBlur={() => { if (capturingId === "__add__") cancelCapture(); }} />
                      <button className="hk-del" onClick={() => { cancelCapture(); setAddingHk(false); }} title="Renunță">✕</button>
                    </div>
                  ) : (
                    <button className="hk-add" onClick={() => { setAddingHk(true); setAddAction(HOTKEY_ACTIONS[0].id); }}>+ Adaugă hotkey</button>
                  )}
                  <div className="hk-tip">Dublu-click pe o combinație pentru a o reasigna.</div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .editor { position: fixed; inset: 0; background: #0b0d10; display: flex; flex-direction: column; z-index: 40; }
        .topbar { height: 46px; display: flex; align-items: center; padding: 0 18px; border-bottom: 1px solid var(--border-soft); }
        .back { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px; }
        .pdfs { margin-left: auto; display: flex; align-items: center; gap: 10px; }
        .pdfs-l { color: var(--text-dim); font-size: 13px; }
        .pdf-toggle { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 13px; padding: 4px 6px; border-radius: 5px; }
        .pdf-toggle.on { color: var(--text); }
        .gen-btn { background: var(--primary); border: none; color: #fff; border-radius: 5px; padding: 5px 12px; cursor: pointer; font-size: 13px; margin-left: 4px; }
        .gen-msg { color: var(--text-dim); font-size: 12px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .controls { display: grid; grid-template-columns: 1fr 1fr; padding: 12px 18px; position: relative; }
        .c-left { display: flex; align-items: center; gap: 16px; }
        .c-right { display: flex; align-items: center; gap: 16px; }
        .ctrl { display: flex; align-items: center; gap: 8px; }
        .ctrl-l { color: var(--text-dim); font-size: 12.5px; }
        .ctrl-sel { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 5px; height: 30px; padding: 0 10px; cursor: pointer; min-width: 110px; text-align: left; }
        .ctrl-sel.wide { min-width: 150px; }
        .options { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 5px; height: 30px; padding: 0 12px; cursor: pointer; }
        .mid { position: relative; }
        .preview-menu { position: absolute; top: 36px; left: 0; z-index: 10; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; padding: 8px; width: 240px; }
        .pm-row { padding: 6px 8px; color: var(--text); cursor: pointer; border-radius: 5px; text-align: center; background: var(--surface-2); }
        .pm-keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 8px 0; }
        .pm-keys button, .pm-modes button { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: 5px; height: 30px; cursor: pointer; }
        .pm-modes { display: grid; grid-template-columns: repeat(3,1fr); gap: 4px; }
        .auto { margin-left: auto; display: flex; align-items: center; gap: 12px; }
        .ar { color: var(--text-dim); font-size: 12.5px; }
        .st { color: var(--text-faint); font-size: 12px; }
        .panes { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0; min-height: 0; }
        .code-pane { border-right: 1px solid var(--border); overflow: hidden; min-height: 0; }
        .preview-wrap { background: #0b0d10; overflow-y: auto; overflow-x: hidden; padding: 22px; display: flex; flex-direction: column; align-items: center; gap: 22px; }
        .sheet { position: relative; width: 100%; max-width: 820px; min-height: 1040px; flex: 0 0 auto; background: #fff; color: #111; border-radius: 3px; padding: 20px 24px 44px; box-shadow: 0 4px 28px rgba(0,0,0,.5); }
        .pg-num { position: absolute; bottom: 14px; right: 24px; color: #aab0b6; font-size: 11px; }
        .hdr { background: #edeef0; border: 1px solid #e0e1e4; border-radius: 2px; padding: 16px 20px; margin-bottom: 18px; }
        .hdr-title { font-size: 21px; font-weight: 700; letter-spacing: -.2px; }
        .hdr-key { font-weight: 700; }
        .hdr-arr { font-size: 11px; font-weight: 700; color: #444; margin-top: 3px; }
        .hdr-arr b { color: #111; }
        .hdr-seq { font-weight: 700; margin-top: 7px; font-size: 14px; }
        .body { padding: 2px; font-family: "PcMono", "Courier New", monospace; }
        .psec { font-weight: 900; margin: 22px 0 6px; letter-spacing: .4px; font-size: 1.04em; }
        .body > .psec:first-child { margin-top: 0; }
        .prow { margin-bottom: 3px; }
        .pch, .ply { font-family: inherit; margin: 0; white-space: pre; font-size: inherit; line-height: 1.3; }
        .pch { font-weight: 700; }
        .pl { height: .7em; }
        .fmt-sec { font-size: 12px; color: var(--text-dim); margin: 6px 0 10px; }

        /* Options: taburi verticale (stânga) + conținut (dreapta) */
        .opt { display: grid; grid-template-columns: 128px 1fr; gap: 20px; min-height: 240px; }
        .opt-tabs { display: flex; flex-direction: column; gap: 4px; border-right: 1px solid var(--border); padding-right: 14px; }
        .opt-tab { background: transparent; border: none; color: var(--text-dim); text-align: left; padding: 9px 12px; border-radius: 7px; cursor: pointer; font-size: 13.5px; transition: background .18s ease, color .18s ease; }
        .opt-tab:hover { background: var(--surface-2); color: var(--text); }
        .opt-tab.on { background: var(--surface-2); color: var(--text); font-weight: 600; }
        .opt-panel { min-width: 0; }
        .opt-fade { animation: optfade .22s ease; }
        @keyframes optfade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

        /* Hotkeys */
        .hk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px 14px; align-items: center; }
        .hk-h { font-size: 10.5px; text-transform: uppercase; letter-spacing: .6px; color: var(--text-faint); padding-bottom: 2px; }
        .hk-act { color: var(--text); font-size: 13.5px; }
        .hk-combo { display: flex; align-items: center; gap: 6px; }
        .hk-in { flex: 1; min-width: 0; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 32px; padding: 0 10px; font-size: 13px; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease; }
        .hk-in:hover { border-color: var(--primary); }
        .hk-in.cap { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent); animation: capblink 1s ease infinite; }
        @keyframes capblink { 50% { opacity: .65; } }
        .hk-del { flex: 0 0 auto; background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; width: 24px; height: 24px; border-radius: 6px; transition: background .15s ease, color .15s ease; }
        .hk-del:hover { background: var(--surface-3); color: var(--text); }
        .hk-add-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; margin-top: 12px; animation: optfade .2s ease; }
        .hk-add { margin-top: 14px; width: 100%; height: 34px; background: transparent; border: 1px dashed var(--border-strong); color: var(--text-dim); border-radius: 7px; cursor: pointer; font-size: 13px; transition: border-color .18s ease, color .18s ease, background .18s ease; }
        .hk-add:hover { border-color: var(--primary); color: var(--text); background: var(--surface-2); }
        .hk-tip { margin-top: 12px; color: var(--text-faint); font-size: 11.5px; }
      `}</style>
    </div>
  );
}

function FmtRow({ label, children }) {
  return (
    <div className="fr">
      <span>{label}</span>
      <div className="fr-c">{children}</div>
      <style jsx>{`
        .fr { display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 12px; margin-bottom: 12px; }
        .fr > span { color: var(--text-dim); font-size: 13px; }
      `}</style>
    </div>
  );
}
