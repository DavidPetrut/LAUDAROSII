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
import { renderChordPro, ALL_KEYS, lyricToHtml, isSection, convertBrackets, simplifyBrackets, stripAllBrackets, buildWords, wordsTextToLines, sequenceFromChordpro } from "@/lib/songs/chordpro";
import RefreshOptionsModal from "@/components/songs/RefreshOptionsModal";
import { runAi } from "@/lib/ai/client";
import { abbreviateSequence } from "@/lib/songs/sequence";
import { paginateLines } from "@/lib/songs/paginate";
import { generateChartPdf } from "@/lib/songs/pdf";
import ChordProEditor from "@/components/songs/ChordProEditor";
import Modal from "@/components/ui/Modal";

const PDF_NAMES = { numerals: "Numerals Chart", numbers: "Numbers Chart", lyrics: "Lyrics", words: "Words" };

// ── Words: pas AI cu reguli (goluri / repetare→bis / adnotări band) la generare ──
const wordsLinesToText = (lines) => lines.map((l) => (l.kind === "section" ? l.label : l.kind === "empty" ? "" : l.lyricRow)).join("\n");
// Pentru Words: corectăm DOAR spațierea cuvintelor pe SURSĂ (ca versurile repetate să iasă identice →
// potrivirea „Repetare"→bis se face determinist după). Structura (bis, secțiuni) o face buildWords.
const WORDS_SRC_AI_PROMPT = "Ești corector de SPAȚIERE pentru un text ChordPro. Ai voie să modifici DOAR spațiile albe dintre litere/cuvinte (elimină-le sau adaugă-le) și, dacă e nevoie, să adaugi o cratimă «-». REGULĂ ABSOLUTĂ: NU adăuga, șterge sau schimba NICIO literă — secvența de litere trebuie să rămână identică după ce ignori spațiile (ex. «Du m ne zeu»→«Dumnezeu» ✓; «cer un treg» rămâne «cer un treg»). Nu atinge acordurile dintre paranteze pătrate [..] și pozițiile lor, rândurile, secțiunile și punctuația. Nu traduce. Returnează DOAR textul rezultat.";

const CHORD_COLORS = { Blue: "#0921ff", Orange: "#d98a2b", Black: "#111", Green: "#2f9e5b", Red: "#d14b43" };

// ── Hotkeys configurabile (persistate în localStorage ≈ „forever") ────────────
// Structură extensibilă: adaugi aici acțiuni noi + un fn în handler-ul global.
const HOTKEY_ACTIONS = [
  { id: "beautify", label: "Aranjează", hint: "Formatează versurile și acordurile (ChordPro)" },
  { id: "addChord", label: "Adaugă gamă", hint: "Ctrl+Click în editor → inserează gama originală [X] acolo, selectată + picker" },
  { id: "addChordPrecise", label: "Adaugă gamă precisă", hint: "Prefix + literă (A-G) = [Literă]; apasă litera din nou = minor. Se schimbă doar prefixul." },
  { id: "undo", label: "Undo", hint: "Anulează ultima acțiune (istoric de sesiune)" },
];
const DEFAULT_BINDINGS = [
  { id: "def-beautify", action: "beautify", combo: "ctrl+s", removable: false },
  { id: "def-addchord", action: "addChord", combo: "ctrl+click", removable: false },
  { id: "def-precise", action: "addChordPrecise", combo: "ctrl+shift", removable: false },
  { id: "def-undo", action: "undo", combo: "ctrl+z", removable: false },
];
const HK_LS_KEY = "pc.chordEditor.hotkeys.v2"; // v2: addChord = ctrl+click (re-seed defaults)

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
  const [previewSel, setPreviewSel] = useState("original"); // "original" | key | "numbers" | "numerals" | "lyrics" | "words"
  const [pdfs, setPdfs] = useState({ numerals: false, numbers: true, lyrics: true, words: false });
  const [wordsTranslate, setWordsTranslate] = useState(true); // Words: tradu sequence-urile în RO (doar acest PDF)
  const [wordsTitle, setWordsTitle] = useState("");           // Words: titlu custom (gol = titlul piesei)
  const [wordsAiRules, setWordsAiRules] = useState(true);     // Words: corectează cu reguli (AI) la generare
  const [wordsTbOpen, setWordsTbOpen] = useState(false);      // toolbar-ul care iese din bifa Words
  const [wordsAiConfirm, setWordsAiConfirm] = useState(false); // confirmare inline la debifarea AI-regulilor
  const [formatting, setFormatting] = useState({ font: "Courier, Monospaced", size: 16, chordColor: "Blue", columns: 1 });
  const [fmtOpen, setFmtOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false); // grila pt. Original Key
  const [chordMode, setChordMode] = useState("chords"); // "chords" | "numbers" (afișare acorduri în editor)
  const [refreshOpen, setRefreshOpen] = useState(false); // modala Update (simplifică/corectează/elimină)
  const [refreshBusy, setRefreshBusy] = useState(false);
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
        // Words: încarcă setările salvate; dacă există deja un Words generat, bifează-l (pare generat).
        setWordsTitle(a.wordsTitle || "");
        setWordsTranslate(a.wordsTranslate !== false);
        setWordsAiRules(a.wordsAiRules !== false);
        if ((a.wordsText || "").trim()) setPdfs((p) => ({ ...p, words: true }));
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

  // Undo de sesiune (în memorie, până la refresh): istoric al textului, max 200 pași.
  const textRef = useRef(text); useEffect(() => { textRef.current = text; }, [text]);
  const histRef = useRef([]);
  const onText = (v) => { setText(v); scheduleSave(v, originalKey, formatting); };
  const onTextTracked = (v) => { // folosit de editor: salvează starea anterioară în istoric
    const h = histRef.current;
    if (h[h.length - 1] !== textRef.current) { h.push(textRef.current); if (h.length > 200) h.shift(); }
    onText(v);
  };
  const undo = useCallback(() => {
    const h = histRef.current; if (!h.length) return;
    const prev = h.pop();
    setText(prev); scheduleSave(prev, originalKey, formatting);
  }, [originalKey, formatting, scheduleSave]);
  const onKey = (v) => { setOriginalKey(v); scheduleSave(text, v, formatting); };
  const onFmt = (patch) => { const nf = { ...formatting, ...patch }; setFormatting(nf); scheduleSave(text, originalKey, nf); };
  // Comută afișarea acordurilor în editor între nume (Chords) și cifre Nashville (Numbers) — rescrie textul.
  const setChordModeAndConvert = (m) => {
    if (m === chordMode) return;
    setChordMode(m);
    const nt = convertBrackets(text, m, originalKey);
    if (nt !== text) onTextTracked(nt);
  };
  // Update: aplică opțiunile bifate în ordine (simplifică → corectează cuvinte(AI) → elimină acorduri).
  const doUpdateChords = async ({ simplify, fixWordsAuto, fixWords, stripChords }) => {
    setRefreshBusy(true);
    try {
      let t = text;
      if (simplify) t = simplifyBrackets(t);
      if (fixWordsAuto) {
        try { const r = await songsApi.fixWordsAuto(t); if (r?.text) t = r.text; }
        catch (e) { setToast("Reîntregire indisponibilă: " + (e?.message || "")); setTimeout(() => setToast(""), 4000); }
      }
      if (fixWords) {
        const res = await aiTransform(t, "Ești corector de SPAȚIERE. În textul ChordPro de mai jos ai voie să modifici DOAR spațiile albe dintre litere/cuvinte (să le elimini sau să le adaugi) și, dacă chiar e nevoie, să adaugi o cratimă «-». REGULĂ ABSOLUTĂ: NU ai voie să adaugi, să ștergi sau să schimbi NICIO literă — secvența de litere trebuie să rămână identică după ce ignori spațiile (ex. «Du m ne zeu» → «Dumnezeu» ✓; dar «cer un treg» NU devine «cerul întreg», rămâne «cer un treg» sau cel mult «cer-un-treg»). Nu atinge sufixele/prefixele cuvintelor. Păstrează EXACT acordurile dintre paranteze pătrate [..] și pozițiile lor, rândurile, secțiunile și punctuația. Nu adăuga/șterge/muta acorduri. Nu traduce. Returnează DOAR textul rezultat, fără explicații.");
        if (typeof res === "string" && res.trim()) t = res;
        else { setToast(typeof res === "object" ? (res.error || "AI indisponibil.") : "AI indisponibil."); setTimeout(() => setToast(""), 4000); }
      }
      if (stripChords) t = stripAllBrackets(t);
      if (t !== text) onTextTracked(t);
      setRefreshOpen(false);
    } finally { setRefreshBusy(false); }
  };

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
    if (next !== text) onTextTracked(next);
  }, [text]);

  // Persistă hotkeys (localStorage ≈ „forever"). Merge și fără (try/catch în save).
  useEffect(() => { saveHotkeys(bindings); }, [bindings]);
  useEffect(() => { capturingRef.current = capturingId != null; }, [capturingId]);

  // Un singur handler global: mapează combinația tastată → acțiune (din bindings).
  useEffect(() => {
    // beautify + undo sunt la nivel de pagină; addChord/addChordPrecise le tratează editorul (are cursorul).
    const fns = { beautify, undo };
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
  }, [bindings, beautify, undo]);

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
  const isWords = previewSel === "words";
  const lines = useMemo(() => (isWords ? buildWords(text, { translate: wordsTranslate }).lines : renderChordPro(text, { mode, originalKey, targetKey })),
    [text, isWords, wordsTranslate, mode, originalKey, targetKey]);
  // Paginare în puncte (ca PDF) ca împărțirea pe pagini din preview să corespundă cu PDF-ul.
  const pages = useMemo(() => paginateLines(lines, { fontSize: formatting.size * 0.9 }), [lines, formatting.size]);

  const keyLabel = isWords ? "Words" : mode === "lyrics" ? "Lyrics" : mode === "numbers" ? "Numbers" : mode === "numerals" ? "Numerals" : targetKey;
  // Sequence DINAMIC: din secțiunile reale din chart (nu din sequence-ul standard al melodiei).
  const seqTokens = useMemo(() => sequenceFromChordpro(text), [text]);
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

      // 1) Numerals / Numbers / Lyrics / Words → card Arrangement (independente de gamă)
      for (const t of types) {
        let lns, extra = {};
        if (t === "words") {
          // AI corectează DOAR spațierea pe SURSĂ (versuri identice → potrivirea bis merge); structura o face buildWords.
          let src = text;
          if (wordsAiRules) {
            try { const res = await aiTransform(src, WORDS_SRC_AI_PROMPT); if (typeof res === "string" && res.trim()) src = res; } catch { /* best-effort */ }
          }
          lns = buildWords(src, { translate: wordsTranslate }).lines;
          extra = { variant: "words", seqTokens: [], title: (wordsTitle.trim() || song?.title) };
          // Persistă textul + setările Words (pt. preview fidel și editare manuală ulterioară).
          try { await songsApi.updateArrangement(id, aid, { wordsText: wordsLinesToText(lns), wordsTitle: wordsTitle.trim(), wordsTranslate, wordsAiRules }); } catch { /* best-effort */ }
        } else {
          lns = renderChordPro(text, { mode: t, originalKey, targetKey: originalKey });
        }
        const blob = await generateChartPdf({ ...common, keyLabel: t[0].toUpperCase() + t.slice(1), lines: lns, ...extra });
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
          {["numerals", "numbers", "lyrics", "words"].map((k) => (
            <button key={k} className={`pdf-toggle ${pdfs[k] ? "on" : ""}`}
              onClick={() => { const turnOn = !pdfs[k]; setPdfs((p) => ({ ...p, [k]: !p[k] })); if (k === "words") { setWordsTbOpen(turnOn); setWordsAiConfirm(false); } }}>
              {pdfs[k] ? "✓ " : ""}{k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
          <button className="gen-btn" onClick={doGenerate}>Generate</button>
          {gen && <span className="gen-msg">{gen}</span>}

          {wordsTbOpen && pdfs.words && (
            <>
              <div className="wtb-back" onClick={() => { setWordsTbOpen(false); setWordsAiConfirm(false); }} />
              <div className="wtb">
                <div className="wtb-row">
                  <span className="wtb-l">Limbă secțiuni</span>
                  <div className="wtb-flags">
                    <button className={wordsTranslate ? "on" : ""} onClick={() => setWordsTranslate(true)} title="Română">
                      <svg width="22" height="15" viewBox="0 0 22 15"><rect x="0" y="0" width="7.33" height="15" fill="#002B7F"/><rect x="7.33" y="0" width="7.33" height="15" fill="#FCD116"/><rect x="14.66" y="0" width="7.34" height="15" fill="#CE1126"/></svg>
                    </button>
                    <button className={!wordsTranslate ? "on" : ""} onClick={() => setWordsTranslate(false)} title="Fără conversie — denumirile ca în editor">
                      <svg width="22" height="15" viewBox="0 0 22 15"><rect x="0.5" y="0.5" width="21" height="14" rx="2" fill="none" stroke="currentColor" opacity=".5"/><line x1="2" y1="13" x2="20" y2="2" stroke="#CE1126" strokeWidth="2"/></svg>
                    </button>
                  </div>
                </div>
                <div className="wtb-row col">
                  <span className="wtb-l">Titlu nou <i>(cum apare pe PDF)</i></span>
                  <input className="wtb-in" value={wordsTitle} onChange={(e) => setWordsTitle(e.target.value)} placeholder={song?.title || "Titlul melodiei"} />
                </div>
                <div className="wtb-air">
                  <button className={`wtb-ai ${wordsAiRules ? "on" : ""}`}
                    onClick={() => { if (wordsAiRules) setWordsAiConfirm(true); else { setWordsAiRules(true); setWordsAiConfirm(false); } }}>
                    <span className="wtb-chk">{wordsAiRules && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}</span>
                    <span>Corectează cu reguli (AI) <i>recomandat</i></span>
                  </button>
                  {wordsAiConfirm && (
                    <div className="wtb-cf">
                      Fără AI, fișierul poate ieși cu goluri, repetări sau adnotări tehnice. Dezactivezi?
                      <div className="wtb-cf-b">
                        <button onClick={() => { setWordsAiRules(false); setWordsAiConfirm(false); }}>Da, dezactivează</button>
                        <button className="keep" onClick={() => setWordsAiConfirm(false)}>Nu</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls: stânga = gama originală (peste editor); dreapta = Options + preview/țintă + auto (peste preview) */}
      <div className="controls">
        <div className="c-left">
          <div className="ctrl">
            <span className="ctrl-l">Original Key</span>
            <div className="keywrap">
              <button className="keybtn" onClick={() => setKeyOpen((o) => !o)} title="Alege gama originală">
                <span>{originalKey}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {keyOpen && (
                <>
                  <div className="keyback" onClick={() => setKeyOpen(false)} />
                  <div className="keygrid">
                    {ALL_KEYS.map((k) => (
                      <button key={k} className={k === originalKey ? "on" : ""} onClick={() => { onKey(k); setKeyOpen(false); }}>{k}</button>
                    ))}
                    <div className="keymode">
                      <button className={chordMode === "chords" ? "on" : ""} onClick={() => { setChordModeAndConvert("chords"); setKeyOpen(false); }}>Chords</button>
                      <button className={chordMode === "numbers" ? "on" : ""} onClick={() => { setChordModeAndConvert("numbers"); setKeyOpen(false); }}>Numbers</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <button className="options" onClick={() => setFmtOpen(true)}>Options ▾</button>
          <button className="reset-ch" onClick={() => setRefreshOpen(true)} title="Update: simplifică acorduri / corectează cuvinte / elimină acorduri">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3L3 16" /><path d="M8 16H3v5" /></svg>
          </button>
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
                  <button onClick={() => { setPreviewSel("words"); setPreviewOpen(false); }}>Words</button>
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
          <ChordProEditor value={text} onChange={onTextTracked} fontSize={formatting.size} customLabels={arr?.sequence || []} onAi={aiTransform} defaultKey={originalKey} meter={arr?.meter || "4/4"} chordMode={chordMode}
            addChordCombo={(bindings.find((b) => b.action === "addChord") || {}).combo || "ctrl+d"}
            precisePrefix={(bindings.find((b) => b.action === "addChordPrecise") || {}).combo || "ctrl+shift"} />
        </div>
        <div className="preview-wrap">
          {pages.map((pageLines, pi) => (
            <div className="sheet" key={pi} style={{ columnCount: formatting.columns || 1 }}>
              {isWords ? (
                pi === 0 ? <div className="hdr-words">{wordsTitle.trim() || song?.title || "…"}</div> : null
              ) : (
                <div className="hdr">
                  <div className="hdr-title">{song?.title || "…"} <span className="hdr-key">[{keyLabel}, {arr?.bpm || "—"} bpm, {arr?.meter || "4/4"}]</span></div>
                  <div className="hdr-arr">[{arr?.name}]{song?.author ? <> by <b>{song.author}</b></> : null}</div>
                  {seqTokens.length > 0 && <div className="hdr-seq">{seqTokens.join(", ")}</div>}
                </div>
              )}
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

      {refreshOpen && (
        <RefreshOptionsModal onClose={() => setRefreshOpen(false)} onApply={doUpdateChords} busy={refreshBusy} />
      )}
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
        .pdfs { margin-left: auto; display: flex; align-items: center; gap: 10px; position: relative; }
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
        .keywrap { position: relative; display: inline-block; }
        .keybtn { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 30px; padding: 0 9px; cursor: pointer; font-size: 13px; }
        .keybtn svg { color: var(--text-dim); }
        .keybtn:hover { border-color: var(--primary); }
        .keyback { position: fixed; inset: 0; z-index: 40; }
        .keygrid { position: absolute; top: calc(100% + 6px); left: 0; z-index: 41; display: grid; grid-template-columns: repeat(3, 44px); gap: 6px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; padding: 10px; box-shadow: 0 14px 36px rgba(0,0,0,.55); }
        .keygrid button { height: 36px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 7px; cursor: pointer; font-size: 13px; }
        .keygrid button:hover { border-color: var(--primary); }
        .keygrid button.on { background: var(--primary); color: #fff; border-color: var(--primary); }
        .keymode { grid-column: 1 / -1; display: flex; gap: 6px; margin-top: 6px; padding-top: 9px; border-top: 1px solid var(--border); }
        .keymode button { flex: 1; height: 32px; }
        .ctrl-sel { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 5px; height: 30px; padding: 0 10px; cursor: pointer; min-width: 110px; text-align: left; }
        .ctrl-sel.wide { min-width: 150px; }
        .hdr-words { font-weight: 700; font-size: 18px; color: #111; background: #fff; padding: 2px 0 14px; overflow-wrap: anywhere; }
        /* Toolbar-ul care iese din bifa Words */
        .wtb-back { position: fixed; inset: 0; z-index: 44; }
        .wtb { position: absolute; top: calc(100% + 8px); right: 0; z-index: 45; width: 300px; background: var(--surface-3); border: 1px solid var(--border-strong);
          border-radius: 10px; padding: 12px; box-shadow: 0 16px 40px rgba(0,0,0,.55); display: flex; flex-direction: column; gap: 12px; }
        .wtb-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .wtb-row.col { flex-direction: column; align-items: stretch; gap: 6px; }
        .wtb-l { font-size: 12.5px; color: var(--text); font-weight: 500; }
        .wtb-l i { color: var(--text-faint); font-weight: 400; font-style: normal; font-size: 11.5px; }
        .wtb-flags { display: inline-flex; gap: 4px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 7px; padding: 3px; }
        .wtb-flags button { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 26px; background: transparent; border: none; border-radius: 5px; cursor: pointer; color: var(--text-dim); opacity: .5; }
        .wtb-flags button:hover { opacity: .85; }
        .wtb-flags button.on { background: var(--surface-3); opacity: 1; box-shadow: 0 0 0 1px var(--primary) inset; }
        .wtb-in { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 32px; padding: 0 10px; font-size: 13px; }
        .wtb-in:focus { outline: none; border-color: var(--primary); }
        .wtb-air { border-top: 1px solid var(--border); padding-top: 10px; }
        .wtb-ai { display: flex; align-items: center; gap: 9px; width: 100%; background: transparent; border: none; color: var(--text); cursor: pointer; font-size: 12.5px; text-align: left; padding: 0; }
        .wtb-ai i { color: var(--text-faint); font-style: normal; font-size: 11px; }
        .wtb-chk { flex: 0 0 auto; width: 20px; height: 20px; border-radius: 5px; border: 1.5px solid var(--border-strong); display: flex; align-items: center; justify-content: center; color: #fff; }
        .wtb-ai.on .wtb-chk { background: var(--primary); border-color: var(--primary); }
        .wtb-cf { margin-top: 10px; font-size: 11.5px; color: #e7b04b; background: rgba(231,176,75,.1); border: 1px solid rgba(231,176,75,.3); border-radius: 7px; padding: 9px 10px; }
        .wtb-cf-b { display: flex; gap: 8px; margin-top: 8px; }
        .wtb-cf-b button { flex: 1; height: 28px; border-radius: 6px; border: 1px solid var(--border-strong); background: var(--surface-2); color: var(--text); cursor: pointer; font-size: 12px; }
        .wtb-cf-b button.keep { background: var(--primary); border-color: var(--primary); color: #fff; }
        .options { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 5px; height: 30px; padding: 0 12px; cursor: pointer; }
        .reset-ch { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 5px; height: 30px; width: 34px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
        .reset-ch:hover { color: var(--text); border-color: var(--primary); }
        .reset-p { font-size: 13.5px; color: var(--text-dim); line-height: 1.55; margin: 0 0 18px; }
        .reset-p b { color: var(--text); }
        .reset-foot { display: flex; justify-content: flex-end; gap: 12px; }
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
