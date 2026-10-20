"use client";
/**
 * Editor ChordPro „premium": textarea transparentă peste overlay colorat.
 *  - [ ] = verde; acordul dinăuntru = albastru; secțiuni = bold; <b>/<i>/<u> → text stilizat
 *    în editor, cu tag-urile estompate (dim) ca să nu deranjeze. Alinierea acordurilor se păstrează.
 *  - Autocomplete sequence (numerotare după POZIȚIE: inserezi după Verse 1 → Verse 2).
 *  - Picker acorduri la click într-un [acord]: BARĂ cu populare (maj/min/7/sus4) + „⋯ mai multe",
 *    apare DEASUPRA liniei (nu o acoperă), animat, se închide la alegere.
 *  - Bară de selecție: B/I/U (toggle — al doilea click scoate), simboluri muzicale ♪, buton AI ✦.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getCaretCoordinates } from "@/lib/songs/caret";
import { chordVariations, STANDARD_SECTIONS, sectionBaseName } from "@/lib/songs/chordVariations";
import { MUSIC_SYMBOLS } from "@/lib/songs/symbols";
import { diatonicDegrees, chordRootToken } from "@/lib/songs/chordpro";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SEC_RE = /^(?:verse|chorus|pre-?chorus|post-?chorus|refrain|bridge|intro|outro|ending|instrumental|interlude|tag|turnaround|vamp|breakdown|solo|coda)\s*\d*\s*:?\s*$/i;
const isSec = (line) => {
  const t = line.trim(); if (!t) return false;
  if (SEC_RE.test(t.replace(/<\/?[biu]>/gi, ""))) return true;
  const bare = t.replace(/<\/?[biu]>/gi, "");
  return /^[A-ZĂÂÎȘȚ0-9][A-ZĂÂÎȘȚ0-9 ._()/#&-]{0,22}:?$/.test(bare) && /[A-ZĂÂÎȘȚ]/.test(bare) && !/[a-zăâîșț]/.test(bare);
};

function highlightLine(line) {
  if (isSec(line)) return `<span class="hl-sec">${esc(line) || "&nbsp;"}</span>`;
  let s = esc(line);
  // formatare: text stilizat + tag-uri estompate
  s = s
    .replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/gi, '<span class="hl-fmt">&lt;b&gt;</span><span class="hl-b">$1</span><span class="hl-fmt">&lt;/b&gt;</span>')
    .replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/gi, '<span class="hl-fmt">&lt;i&gt;</span><span class="hl-i">$1</span><span class="hl-fmt">&lt;/i&gt;</span>')
    .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<span class="hl-fmt">&lt;u&gt;</span><span class="hl-u">$1</span><span class="hl-fmt">&lt;/u&gt;</span>');
  // acorduri [..] — numeric (Nashville): cifra de bază normală, sufixul (7, m7, 2, /5…) ca EXPONENT (superscript)
  s = s.replace(/(\[)([^\]]*)(\])/g, (mm, b1, inner, b2) => {
    const num = /^(\s*[1-7][#b]?)([\s\S]*)$/.exec(inner);
    if (num && /^\s*[1-7]/.test(inner)) {
      const sup = num[2] ? `<span class="hl-sup">${num[2]}</span>` : "";
      return `<span class="hl-bk">${b1}</span><span class="hl-ch hl-num">${num[1]}${sup}</span><span class="hl-bk">${b2}</span>`;
    }
    return `<span class="hl-bk">${b1}</span><span class="hl-ch">${inner}</span><span class="hl-bk">${b2}</span>`;
  });
  // orice tag rămas (nepereche) → dim
  s = s.replace(/(&lt;\/?[biu]&gt;)/gi, '<span class="hl-fmt">$1</span>');
  return s;
}
const highlight = (value) => value.split("\n").map(highlightLine).join("\n") + "\n";

const POPULAR = ["", "m", "7", "sus4"];
const isMod = (k) => k === "Control" || k === "Meta" || k === "Alt" || k === "Shift";

const PX_PER_MEASURE = 46; // cât drag = o măsură „----|"

export default function ChordProEditor({ value, onChange, fontSize = 16, customLabels = [], onAi, defaultKey = "C", meter = "4/4", chordMode = "chords", addChordCombo = "ctrl+d", precisePrefix = "ctrl+shift" }) {
  const measureBeats = Math.max(1, Math.min(16, parseInt(String(meter).split("/")[0], 10) || 4)); // nr. liniuțe/măsură = numărătorul măsurii
  const measureUnit = "-".repeat(measureBeats) + "|";
  const lastChord = useRef(null); // { start, end, letter, minor } pt. „apasă din nou litera → minor"
  const taRef = useRef(null);
  const preRef = useRef(null);
  const [ac, setAc] = useState(null);
  const [pick, setPick] = useState(null);
  const [tb, setTb] = useState(null);
  const [symOpen, setSymOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [selHl, setSelHl] = useState(null); // highlight vizual al selecției (cât timp AI e deschis)
  const [draw, setDraw] = useState(null); // { x, y, n } ghost constructor de măsuri
  const [choice, setChoice] = useState(null); // { n, x, y, pos } alegere după release
  const press = useRef({ timer: null, active: false, startX: 0, startY: 0, pos: 0 });
  const aiSel = useRef(null); // range-ul selectat când deschizi AI

  const allLabels = useMemo(() => {
    const seen = new Set(); const out = [];
    [...customLabels, ...STANDARD_SECTIONS].forEach((l) => {
      const base = sectionBaseName(l); const k = base.toUpperCase();
      if (base && !seen.has(k)) { seen.add(k); out.push(base); }
    });
    return out;
  }, [customLabels]);

  const syncScroll = () => { if (preRef.current && taRef.current) { preRef.current.scrollTop = taRef.current.scrollTop; preRef.current.scrollLeft = taRef.current.scrollLeft; } };
  useLayoutEffect(syncScroll, [value]);

  const countBefore = useCallback((base, idx) => {
    const re = new RegExp(`^\\s*${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\d*\\s*:?\\s*$`, "i");
    return value.slice(0, idx).split("\n").filter((l) => re.test(l.replace(/<\/?[biu]>/gi, ""))).length;
  }, [value]);

  function updateAutocomplete() {
    const ta = taRef.current; if (!ta) return;
    const pos = ta.selectionStart;
    if (pos !== ta.selectionEnd) { setAc(null); return; }
    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const frag = value.slice(lineStart, pos);
    const m = /^(\p{L}[\p{L}-]*)$/u.exec(frag);
    if (!m) { setAc(null); return; }
    const word = m[1];
    const matches = allLabels.filter((l) => l.toLowerCase().startsWith(word.toLowerCase()));
    if (!matches.length) { setAc(null); return; }
    const items = matches.slice(0, 6).map((base) => ({ base, label: `${base.toUpperCase()} ${countBefore(base, lineStart) + 1}` }));
    const c = getCaretCoordinates(ta, pos);
    setAc({ items, idx: 0, x: c.x, y: c.y + c.height + 2, range: [lineStart, pos] });
    setPick(null); setTb(null);
  }

  function acceptAc(item) {
    const [s, e] = ac.range;
    const next = value.slice(0, s) + item.label + value.slice(e);
    onChange(next);
    const caret = s + item.label.length;
    setAc(null);
    requestAnimationFrame(() => { const ta = taRef.current; if (ta) { ta.focus(); ta.setSelectionRange(caret, caret); } });
  }

  // Construiește obiectul picker (toolbar): 4 butoane (major/minor/⋯/game diatonice), dinamic după cifră/nume.
  function makePick(innerStart, innerEnd, content, x, y) {
    const { token, minor } = chordRootToken(content);
    const numeric = /^[1-7]/.test(String(token).trim());
    return {
      x, y, bracket: [innerStart, innerEnd], content: String(content), minor, numeric,
      major: token, minorForm: token + "m",
      degrees: diatonicDegrees(defaultKey || "C", numeric),
      items: chordVariations(content || "C"), view: "bar",
    };
  }
  function openPickerAtCaret() {
    const ta = taRef.current; if (!ta) return false;
    const pos = ta.selectionStart;
    if (pos !== ta.selectionEnd) return false;
    const lb = value.lastIndexOf("[", pos - 1);
    const rb = value.indexOf("]", pos);
    if (lb < 0 || rb < 0 || value.slice(lb, pos).includes("]") || value.slice(pos, rb).includes("[")) return false;
    const c = getCaretCoordinates(ta, lb + 1);
    setPick(makePick(lb + 1, rb, value.slice(lb + 1, rb), c.x, c.y));
    setAc(null); setTb(null);
    return true;
  }

  function pickChord(ch) {
    const [s, e] = pick.bracket;
    const next = value.slice(0, s) + ch + value.slice(e);
    onChange(next);
    const caret = s + ch.length;
    setPick(null);
    requestAnimationFrame(() => { const ta = taRef.current; if (ta) { ta.focus(); ta.setSelectionRange(caret, caret); } });
  }

  // Selectează acordul dinăuntru + deschide picker-ul (toolbar) deasupra lui. Păstrează scroll-ul.
  function selectAndPick(innerStart, innerEnd, chordText, scrollTop) {
    requestAnimationFrame(() => {
      const ta = taRef.current; if (!ta) return;
      ta.focus({ preventScroll: true }); ta.setSelectionRange(innerStart, innerEnd);
      if (scrollTop != null) ta.scrollTop = scrollTop;
      const c = getCaretCoordinates(ta, innerStart);
      setPick(makePick(innerStart, innerEnd, chordText, c.x, c.y));
      setAc(null); setTb(null);
    });
  }
  // Inserează [chordText] FIX la cursor (fără spațiu) → acordul selectat + picker deschis.
  function insertChordAtCaret(chordText) {
    const ta = taRef.current; if (!ta) return;
    const pos = ta.selectionStart; const st = ta.scrollTop;
    const str = `[${chordText}]`;
    onChange(value.slice(0, pos) + str + value.slice(pos));
    const innerStart = pos + 1, innerEnd = pos + 1 + String(chordText).length;
    lastChord.current = { start: innerStart, end: innerEnd, letter: String(chordText).replace(/m$/, ""), minor: /m$/.test(chordText) };
    selectAndPick(innerStart, innerEnd, chordText, st);
  }
  // A doua apăsare a literei (prefix ținut) → transformă acordul tocmai pus în minor.
  function makeLastMinor() {
    const lc = lastChord.current; if (!lc || lc.minor) return false;
    const ta = taRef.current; if (!ta) return false;
    if (ta.selectionStart !== lc.start || ta.selectionEnd !== lc.end) return false; // trebuie să fie încă selectat
    const st = ta.scrollTop;
    onChange(value.slice(0, lc.start) + lc.letter + "m" + value.slice(lc.end));
    const ns = lc.start, ne = lc.start + (lc.letter + "m").length;
    lastChord.current = { start: ns, end: ne, letter: lc.letter, minor: true };
    selectAndPick(ns, ne, lc.letter + "m", st);
    return true;
  }

  // ── Constructor de măsuri: long-press (~0.5s) + drag dreapta → măsuri; la release alegi modul ──
  function commitMeasures(n, mode, posArg) {
    const key = defaultKey || "C";
    const pos = Number.isInteger(posArg) ? posArg : (taRef.current ? taRef.current.selectionStart : 0);
    // slash de început (|) înainte de primul acord; nr. liniuțe/măsură = numărătorul măsurii.
    // „single" = o gamă la început; „each" = o gamă pe fiecare măsură.
    const body = mode === "single" ? `|[${key}]` + measureUnit.repeat(n) : "|" + `[${key}]${measureUnit}`.repeat(n);
    // Inserează pe ACELAȘI rând, la poziția cursorului, cu un spațiu dacă nu e deja la început/după spațiu.
    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const needSpace = pos > lineStart && !/\s$/.test(value.slice(lineStart, pos));
    const ins = (needSpace ? " " : "") + body;
    const next = value.slice(0, pos) + ins + value.slice(pos);
    const caret = pos + ins.length;
    const st = taRef.current ? taRef.current.scrollTop : 0;
    onChange(next);
    setChoice(null);
    requestAnimationFrame(() => { const ta = taRef.current; if (ta) { ta.focus({ preventScroll: true }); ta.setSelectionRange(caret, caret); ta.scrollTop = st; } });
  }

  // Ctrl+Click (sau combinația configurată) = „Adaugă gamă" la locul click-ului.
  function clickComboMatches(e) {
    const mc = []; if (e.ctrlKey || e.metaKey) mc.push("ctrl"); if (e.altKey) mc.push("alt"); if (e.shiftKey) mc.push("shift"); mc.push("click");
    return mc.join("+") === addChordCombo;
  }

  function onMouseDownTextarea(e) {
    const ta = taRef.current; if (!ta) return;
    if (clickComboMatches(e)) return; // lasă caret-ul la click; inserăm pe onClick
    setChoice(null); setSelHl(null); // o nouă apăsare închide chooser/highlight
    press.current.startX = e.clientX; press.current.startY = e.clientY; press.current.active = false;
    clearTimeout(press.current.timer);
    press.current.timer = setTimeout(() => {
      press.current.active = true; press.current.pos = ta.selectionStart;
      setDraw({ x: e.clientX, y: e.clientY, n: 0 }); setAc(null); setPick(null); setTb(null);
    }, 500);
    const move = (ev) => {
      if (!press.current.active) {
        if (Math.abs(ev.clientX - press.current.startX) > 8 || Math.abs(ev.clientY - press.current.startY) > 8) clearTimeout(press.current.timer);
        return;
      }
      const n = Math.max(0, Math.round((ev.clientX - press.current.startX) / PX_PER_MEASURE));
      setDraw((d) => (d ? { ...d, n } : d));
    };
    const up = (ev) => {
      document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
      clearTimeout(press.current.timer);
      if (press.current.active) {
        const n = Math.max(0, Math.round((ev.clientX - press.current.startX) / PX_PER_MEASURE));
        setDraw(null);
        if (n >= 1) setChoice({ n, x: press.current.startX, y: press.current.startY, pos: press.current.pos });
        setTimeout(() => { press.current.active = false; }, 0);
        ev.preventDefault();
      }
    };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }

  function onMouseUpTextarea(e) {
    if (e && clickComboMatches(e)) return; // Ctrl+Click → tratat pe onClick
    if (press.current.active) return; // a fost un draw de măsuri
    const ta = taRef.current; if (!ta) return;
    if (ta.selectionStart !== ta.selectionEnd) {
      const c = getCaretCoordinates(ta, ta.selectionStart);
      setTb({ x: c.x, y: c.y }); setAc(null); setPick(null); setSymOpen(false); setAiOpen(false);
    } else { setTb(null); setSymOpen(false); setAiOpen(false); if (!openPickerAtCaret()) setPick(null); }
  }

  // Toggle: dacă selecția e deja înfășurată în tag → scoate; altfel adaugă.
  function wrapSel(tag) {
    const ta = taRef.current; let s = ta.selectionStart, e = ta.selectionEnd;
    if (s === e) return;
    const open = `<${tag}>`, close = `</${tag}>`;
    const inner = value.slice(s, e);
    let next, ns, ne;
    if (inner.startsWith(open) && inner.endsWith(close)) {
      const stripped = inner.slice(open.length, inner.length - close.length);
      next = value.slice(0, s) + stripped + value.slice(e); ns = s; ne = s + stripped.length;
    } else if (value.slice(s - open.length, s) === open && value.slice(e, e + close.length) === close) {
      next = value.slice(0, s - open.length) + inner + value.slice(e + close.length); ns = s - open.length; ne = ns + inner.length;
    } else {
      next = value.slice(0, s) + open + inner + close + value.slice(e); ns = s + open.length; ne = ns + inner.length;
    }
    onChange(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ns, ne); });
  }

  function insertText(str) {
    const ta = taRef.current; const s = ta.selectionStart, e = ta.selectionEnd;
    onChange(value.slice(0, s) + str + value.slice(e));
    const caret = s + str.length; setSymOpen(false);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(caret, caret); });
  }

  async function runAiOnSelection() {
    const ta = taRef.current;
    const [s, e] = aiSel.current || [ta.selectionStart, ta.selectionEnd];
    const sel = value.slice(s, e);
    if (!sel || !aiText.trim() || !onAi) return;
    const st = ta.scrollTop; // păstrează poziția (nu teleporta jos)
    setAiBusy(true); setAiErr("");
    const out = await onAi(sel, aiText.trim());
    setAiBusy(false);
    if (typeof out === "string") {
      onChange(value.slice(0, s) + out + value.slice(e));
      requestAnimationFrame(() => { if (ta) { ta.focus({ preventScroll: true }); ta.setSelectionRange(s, s + out.length); ta.scrollTop = st; } });
      setAiOpen(false); setAiText(""); setTb(null); setSelHl(null); aiSel.current = null;
    } else {
      setAiErr(out?.error || "Eroare AI.");
    }
  }

  function computeSelHl(s, e) {
    const ta = taRef.current; if (!ta || s === e) return null;
    const a = getCaretCoordinates(ta, s), b = getCaretCoordinates(ta, e);
    const w = ta.clientWidth - 36;
    if (Math.abs(a.y - b.y) < 3) return [{ left: a.x, top: a.y, width: Math.max(3, b.x - a.x), height: a.height }];
    const rects = [{ left: a.x, top: a.y, width: Math.max(3, w + 18 - a.x), height: a.height }];
    for (let yy = a.y + a.height; yy < b.y - 1; yy += a.height) rects.push({ left: 18, top: yy, width: w, height: a.height });
    rects.push({ left: 18, top: b.y, width: Math.max(3, b.x - 18), height: a.height });
    return rects;
  }

  function onKeyDown(e) {
    // ── Hotkeys acorduri (configurabile din pagină) ──
    const mods = []; if (e.ctrlKey || e.metaKey) mods.push("ctrl"); if (e.altKey) mods.push("alt"); if (e.shiftKey) mods.push("shift");
    const keyLow = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const combo = [...mods, isMod(e.key) ? null : (e.key === " " ? "space" : keyLow)].filter(Boolean).join("+");
    const prefix = mods.join("+");
    // „Adaugă gamă" (default Ctrl+D): inserează gama originală [X] la cursor, selectată + picker.
    if (combo === addChordCombo && !isMod(e.key)) { e.preventDefault(); insertChordAtCaret(chordMode === "numbers" ? "1" : (defaultKey || "C")); return; }
    // „Adaugă gamă precisă" (default prefix Ctrl+Shift + literă A-G): [Literă]; a 2-a apăsare → minor.
    if (precisePrefix && prefix === precisePrefix && /^[a-g]$/.test(keyLow)) {
      e.preventDefault();
      const L = keyLow.toUpperCase();
      if (lastChord.current && lastChord.current.letter === L && makeLastMinor()) return;
      insertChordAtCaret(L);
      return;
    }
    if (ac) {
      if (e.key === "ArrowDown") { e.preventDefault(); setAc((a) => ({ ...a, idx: (a.idx + 1) % a.items.length })); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setAc((a) => ({ ...a, idx: (a.idx - 1 + a.items.length) % a.items.length })); return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); acceptAc(ac.items[ac.idx]); return; }
      if (e.key === "Escape") { setAc(null); return; }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = taRef.current; const s = ta.selectionStart, en = ta.selectionEnd;
      const ins = "    "; // indentație (4 spații)
      onChange(value.slice(0, s) + ins + value.slice(en));
      requestAnimationFrame(() => { ta.setSelectionRange(s + ins.length, s + ins.length); });
      return;
    }
    if (e.key === "Escape") { setPick(null); setTb(null); setChoice(null); setAiOpen(false); setSelHl(null); }
  }

  const fontStyle = { fontSize, lineHeight: 1.6, fontFamily: '"Courier New", monospace' };

  return (
    <div className="cpe">
      <pre ref={preRef} className="hl" style={fontStyle} aria-hidden dangerouslySetInnerHTML={{ __html: highlight(value) }} />
      {aiOpen && selHl && selHl.map((r, i) => <div key={i} className="selhl" style={{ left: r.left, top: r.top, width: r.width, height: r.height }} />)}
      <textarea
        ref={taRef} className="ta" style={fontStyle} value={value} spellCheck={false}
        onChange={(e) => { onChange(e.target.value); setPick(null); setSelHl(null); requestAnimationFrame(updateAutocomplete); }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => { if (!["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(e.key)) updateAutocomplete(); }}
        onMouseDown={onMouseDownTextarea}
        onMouseUp={onMouseUpTextarea}
        onClick={(e) => { if (clickComboMatches(e)) { e.preventDefault(); insertChordAtCaret(chordMode === "numbers" ? "1" : (defaultKey || "C")); } }}
        onScroll={() => { syncScroll(); setAc(null); setPick(null); setTb(null); setSelHl(null); }}
        onBlur={() => { setTimeout(() => { setAc(null); setPick(null); if (!aiOpen) setTb(null); setSymOpen(false); }, 180); }}
        placeholder={"VERSE 1:\n[C]Cine-i ca [Am]Tine în uni[F]vers,\n..."}
      />

      {ac && (
        <ul className="pop ac" style={{ left: ac.x, top: ac.y }}>
          {ac.items.map((it, i) => (
            <li key={it.base} className={i === ac.idx ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); acceptAc(it); }}>
              {it.label} <span className="hint">Tab</span>
            </li>
          ))}
        </ul>
      )}

      {pick && (
        <div className="pop picker" style={{ left: pick.x, top: Math.max(4, pick.y - (pick.view === "more" ? 228 : pick.view === "deg" ? 60 : 52)) }}>
          {pick.view === "bar" ? (
            <div className="pick-bar">
              <button className={!pick.minor ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); pickChord(pick.major); }} title="Acord major (activ)">{pick.major}</button>
              <button className={pick.minor ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); pickChord(pick.minorForm); }} title="Acord minor">{pick.minorForm}</button>
              <button className="more" onMouseDown={(e) => { e.preventDefault(); setPick((p) => ({ ...p, view: "more" })); }} title="Mai multe variații">⋯</button>
              <button className="more" onMouseDown={(e) => { e.preventDefault(); setPick((p) => ({ ...p, view: "deg" })); }} title="Game diatonice (1-7)">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="18" r="2.3" /><circle cx="17" cy="16" r="2.3" /><path d="M8.3 18V6.5l10.7-2.3V16" /><path d="M8.3 9.2l10.7-2.3" /></svg>
              </button>
            </div>
          ) : pick.view === "deg" ? (
            <div className="pick-grid deg">
              {pick.degrees.map((d) => (
                <button key={d} onMouseDown={(e) => { e.preventDefault(); pickChord(d); }}>{d}</button>
              ))}
            </div>
          ) : (
            <div className="pick-grid">
              {pick.items.map((ch) => (
                <button key={ch} onMouseDown={(e) => { e.preventDefault(); pickChord(ch); }}>{ch}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {tb && (
        <div className="pop toolbar" style={{ left: tb.x, top: Math.max(4, tb.y - 52) }}>
          <button onMouseDown={(e) => { e.preventDefault(); wrapSel("b"); }}><b>B</b></button>
          <button onMouseDown={(e) => { e.preventDefault(); wrapSel("i"); }}><i>I</i></button>
          <button onMouseDown={(e) => { e.preventDefault(); wrapSel("u"); }}><u>U</u></button>
          <span className="tb-sep" />
          <button className={symOpen ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); setSymOpen((v) => !v); setAiOpen(false); }} title="Simboluri">♪</button>
          <button className={`ai ${aiOpen ? "on" : ""}`} onMouseDown={(e) => { e.preventDefault(); const ta = taRef.current; if (!aiOpen) { aiSel.current = [ta.selectionStart, ta.selectionEnd]; setSelHl(computeSelHl(ta.selectionStart, ta.selectionEnd)); setAiOpen(true); } else { setAiOpen(false); setSelHl(null); } setSymOpen(false); }} title="AI">✦</button>
          {symOpen && (
            <div className="sympanel">
              {MUSIC_SYMBOLS.map((m) => (<button key={m.s} title={m.n} onMouseDown={(e) => { e.preventDefault(); insertText(m.s); }}>{m.s}</button>))}
            </div>
          )}
          {aiOpen && (
            <div className="aipanel">
              <div className="airow">
                <input autoFocus placeholder="Ce să fac cu textul selectat? (ex: corectează gramatical)" value={aiText}
                  onChange={(e) => setAiText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runAiOnSelection(); } }} />
                <button onMouseDown={(e) => { e.preventDefault(); runAiOnSelection(); }} disabled={aiBusy}>{aiBusy ? "…" : "✦"}</button>
              </div>
              {aiErr && <div className="aierr">{aiErr}</div>}
            </div>
          )}
        </div>
      )}

      {draw && (
        <div className="drawghost" style={{ left: draw.x + 12, top: draw.y - 44 }}>
          <div className="dg-measures">{draw.n >= 1 ? measureUnit.repeat(draw.n) : "trage spre dreapta →"}</div>
          <div className="dg-label">{draw.n >= 1 ? `${draw.n} ${draw.n === 1 ? "măsură" : "măsuri"} · [${defaultKey}]` : "constructor măsuri"}</div>
        </div>
      )}

      {choice && (
        <div className="pop choice" style={{ left: Math.min(choice.x, (typeof window !== "undefined" ? window.innerWidth - 240 : choice.x)), top: Math.max(6, choice.y - 78) }}>
          <span className="choice-n">{choice.n}🎵</span>
          <button className="choice-b" onClick={(e) => { e.stopPropagation(); commitMeasures(choice.n, "single", choice.pos); }} title="O singură gamă la început">1 gamă</button>
          <button className="choice-b" onClick={(e) => { e.stopPropagation(); commitMeasures(choice.n, "each", choice.pos); }} title="Gamă pe fiecare măsură">fiecare</button>
          <button className="choice-x" onClick={(e) => { e.stopPropagation(); setChoice(null); }} title="Închide">✕</button>
        </div>
      )}

      <style jsx>{`
        .cpe { position: relative; height: 100%; overflow: hidden; background: #0b0d10; }
        .drawghost { position: fixed; z-index: 20; pointer-events: none; background: rgba(28,34,43,.96); border: 1px solid #3a434e; border-radius: 8px; padding: 8px 10px; box-shadow: 0 10px 28px rgba(0,0,0,.5); }
        .dg-measures { font-family: "Courier New", monospace; color: #5aa2ff; opacity: .55; font-size: 15px; white-space: nowrap; max-width: 60vw; overflow: hidden; }
        .dg-label { color: #c7ccd2; font-size: 11.5px; margin-top: 3px; }
        .choice { position: fixed; z-index: 45; display: flex; flex-direction: row; align-items: center; gap: 6px; padding: 6px 8px; }
        .choice-n { color: #9aa4b0; font-size: 12px; padding: 0 2px; white-space: nowrap; }
        .choice-b { background: #2a3340; border: 1px solid #343e4a; color: #e7e9ec; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12.5px; white-space: nowrap; }
        .choice-b:hover { background: #34506e; border-color: #5aa2ff; }
        .choice-x { background: transparent; border: none; color: #6b7580; cursor: pointer; font-size: 12px; padding: 4px; }
        .choice-x:hover { color: #e7e9ec; }
        .hl, .ta { position: absolute; inset: 0; margin: 0; padding: 18px; border: 0; white-space: pre-wrap; word-break: break-word; overflow: auto; font-variant-ligatures: none; tab-size: 2; }
        .hl { color: #d6dae0; pointer-events: none; z-index: 1; }
        .selhl { position: absolute; background: rgba(90,162,255,.30); border-radius: 2px; pointer-events: none; z-index: 0; }
        .ta { color: transparent; caret-color: #e7e9ec; background: transparent; resize: none; outline: none; z-index: 2; }
        .ta::placeholder { color: #55606b; }
        .hl :global(.hl-bk) { color: #1f8a4c; font-weight: 700; }
        .hl :global(.hl-ch) { color: #5aa2ff; font-weight: 700; }
        .hl :global(.hl-num) { font-style: italic; }
        .hl :global(.hl-sup) { font-size: .72em; vertical-align: super; line-height: 0; font-style: italic; }
        .hl :global(.hl-sec) { color: #d6dae0; font-weight: 800; }
        .hl :global(.hl-fmt) { color: #55606b; }
        .hl :global(.hl-b) { font-weight: 800; color: #eef0f2; }
        .hl :global(.hl-i) { font-style: italic; }
        .hl :global(.hl-u) { text-decoration: underline; }
        .pop { position: absolute; z-index: 10; background: #1c222b; border: 1px solid #2d3640; border-radius: 9px; box-shadow: 0 14px 36px rgba(0,0,0,.55); animation: pop .13s cubic-bezier(.2,.8,.3,1); transform-origin: bottom left; }
        .ac { list-style: none; margin: 0; padding: 4px; min-width: 150px; transform-origin: top left; }
        .ac li { padding: 7px 10px; border-radius: 5px; color: #e7e9ec; cursor: pointer; font-size: 13px; display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .ac li.on, .ac li:hover { background: #2a3340; }
        .ac .hint { color: #6b7580; font-size: 11px; border: 1px solid #3a434e; border-radius: 3px; padding: 0 4px; }
        .pick-bar { display: flex; align-items: center; gap: 4px; padding: 5px; }
        .pick-bar button { background: #2a3340; border: 1px solid #343e4a; color: #e7e9ec; border-radius: 6px; padding: 7px 12px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .pick-bar button:hover { background: #34506e; border-color: #5aa2ff; }
        .pick-bar button.on { background: #34506e; border-color: #5aa2ff; box-shadow: inset 0 0 0 1px #5aa2ff; }
        .pick-bar .more { font-weight: 700; padding: 7px 10px; display: inline-flex; align-items: center; justify-content: center; }
        .pick-grid.deg { grid-template-columns: repeat(7, 1fr); max-width: 360px; }
        .pick-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; max-width: 320px; padding: 8px; }
        .pick-grid button { background: #2a3340; border: 1px solid #343e4a; color: #e7e9ec; border-radius: 5px; padding: 6px 4px; cursor: pointer; font-size: 12.5px; }
        .pick-grid button:hover { background: #34506e; border-color: #5aa2ff; }
        .toolbar { display: flex; align-items: center; gap: 2px; padding: 4px; }
        .toolbar > button { background: transparent; border: none; color: #e7e9ec; width: 30px; height: 30px; border-radius: 5px; cursor: pointer; font-size: 14px; }
        .toolbar > button:hover, .toolbar > button.on { background: #2a3340; }
        .toolbar > button.ai { color: #9a7bff; }
        .tb-sep { width: 1px; height: 20px; background: #343e4a; margin: 0 3px; }
        .sympanel { position: absolute; top: 40px; left: 0; background: #1c222b; border: 1px solid #2d3640; border-radius: 8px; padding: 6px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; width: 230px; box-shadow: 0 12px 32px rgba(0,0,0,.5); }
        .sympanel button { background: #2a3340; border: 1px solid #343e4a; color: #e7e9ec; border-radius: 5px; height: 30px; cursor: pointer; font-size: 15px; }
        .sympanel button:hover { background: #34506e; border-color: #5aa2ff; }
        .aipanel { position: absolute; top: 40px; left: 0; display: flex; flex-direction: column; gap: 6px; background: #1c222b; border: 1px solid #2d3640; border-radius: 8px; padding: 6px; width: 340px; box-shadow: 0 12px 32px rgba(0,0,0,.5); }
        .airow { display: flex; gap: 6px; }
        .aipanel input { flex: 1; background: #10151c; border: 1px solid #343e4a; color: #e7e9ec; border-radius: 5px; padding: 6px 8px; font-size: 12.5px; outline: none; }
        .aipanel button { background: #6a5cff; border: none; color: #fff; border-radius: 5px; width: 34px; cursor: pointer; }
        .aierr { color: #e8c468; font-size: 11.5px; line-height: 1.35; }
        @keyframes pop { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
