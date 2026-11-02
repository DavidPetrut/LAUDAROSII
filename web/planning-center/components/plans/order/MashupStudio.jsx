"use client";
/**
 * Mashup Studio — editorul de melodii din tabul Order (ORDER_EDITOR_PLAN.md).
 *
 * FAZA 2 = EDITARE LOCALĂ (temporară, în state — încă NU scrie în DB; salvarea reală vine în Faza 3+):
 *   • reordonare (drag&drop + butoane sus/jos pt. accesibilitate), ștergere, duplicare
 *   • redenumire secțiune cu autocomplete ÎNTEMEIAT PE DB (lib/songs/sectionTypes)
 *   • editare versuri inline (format ChordPro ca în Songs — o singură sursă de adevăr)
 *   • adăugare secțiune nouă (cu autocomplete)
 *   • Undo / Redo (Ctrl+Z / Ctrl+Shift+Z) — istoric local
 *   • secvența se recalculează LIVE din blocuri (motorul existent)
 *
 * AI (D6/§10, MANDATORIU devreme): ecranul se înregistrează ca SUPRAFAȚĂ AI (useAiSurface) — AI-ul
 * VEDE tot (titlu, game, bpm, secvență, fiecare bloc + versuri) și POATE FACE tot (aceleași transformări
 * ca butoanele umane, prin registry). Composer-ul trimite la gateway; AI PROPUNE → omul CONFIRMĂ → se
 * execută prin ACELAȘI runAction. Human-in-the-loop.
 *
 * Toate transformările sunt pure (lib/songs/snapshotEdits) — originalul din DB NU e atins.
 */
import { useEffect, useMemo, useState, useCallback, useRef, Fragment } from "react";
import { DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, plansApi, songsApi, transitionPresetsApi } from "@/lib/api/client";
import { renderChordPro } from "@/lib/songs/chordpro";
import { snapshotFromSource, keysLabel, sequenceUnderHeader, sequenceFromBlocks } from "@/lib/songs/snapshot";
import {
  moveBlock, reorderBlocks, removeBlock, duplicateBlock, renameBlock, setLyrics, addSection, setTitle as setSnapTitle,
  addTransitionSong, removeHeader, setHeader, applyMixedOrder,
} from "@/lib/songs/snapshotEdits";
import { suggestSections } from "@/lib/songs/sectionTypes";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import { useAi } from "@/lib/ai/AiProvider";
import { aiLessons } from "@/lib/ai/client";
import orderEditorRules from "@/lib/ai/rules/orderEditor.rules.json";
import Skeleton from "@/components/ui/Skeleton";
import {
  X, FloppyDisk, GitBranch, GitMerge, MusicNotes, PencilSimple, Plus, Trash, CopySimple,
  DotsSixVertical, Check, ArrowUUpLeft, ArrowUUpRight, ArrowBendDownRight, ArrowElbowDownRight,
  Warning, ArrowsClockwise, ThumbsUp, ThumbsDown, ArrowUp, MagnifyingGlassPlus, MagnifyingGlassMinus,
  Eye, EyeSlash,
} from "@phosphor-icons/react";

// Versuri curate (fără acorduri) ale unui bloc — pt. preview leader-friendly + context AI.
function cleanLyrics(chordpro) {
  return renderChordPro(chordpro || "", { mode: "lyrics" })
    .filter((l) => l.kind === "row")
    .map((l) => l.lyricRow)
    .join("\n");
}

// Rezolvă un item de tip „song" (din itemDetail) → { source, chordpro, arr } (aranjament + chart).
// Reutilizat la încărcarea inițială ȘI la „Transition next song".
async function loadSongSource(detail) {
  let aid = detail.arrangementId;
  let arr = null;
  if (!aid && detail.songId) { try { const song = await songsApi.get(detail.songId); aid = song?.arrangements?.[0]?.id || null; } catch { /* fallback */ } }
  if (aid) { try { arr = await songsApi.arrangement(detail.songId, aid); } catch { /* fără meta */ } }
  let cc = { chordpro: "", originalKey: "" };
  if (aid) { try { cc = await api.get(`/songs/${detail.songId}/arrangements/${aid}/chordchart`); } catch { /* fără chart */ } }
  const source = {
    songId: detail.songId, arrangementId: aid, keyId: detail.keyId,
    keyName: detail.keyName || arr?.keys?.[0]?.startKey || "", title: detail.title || "",
    bpm: arr?.bpm ?? null, meter: arr?.meter || "",
  };
  return { source, chordpro: cc.chordpro || "", arr, originalKey: cc.originalKey || arr?.chordChart?.originalKey || "" };
}

/* ── Input de secțiune cu autocomplete (folosit la redenumire + adăugare) ───────────────── */
function SectionInput({ initial = "", placeholder = "Nume secțiune…", onConfirm, onCancel, autoFocus = true }) {
  const [v, setV] = useState(initial);
  const [hi, setHi] = useState(0);
  const ref = useRef(null);
  const sugs = useMemo(() => suggestSections(v, { limit: 6 }), [v]);
  useEffect(() => { if (autoFocus && ref.current) { ref.current.focus(); ref.current.select(); } }, [autoFocus]);
  useEffect(() => { setHi(0); }, [v]);

  const confirm = (label) => {
    const out = String(label ?? v).trim();
    if (out) onConfirm?.(out); else onCancel?.();
  };
  const onKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); confirm(sugs[hi]?.label ?? v); }
    else if (e.key === "Escape") { e.preventDefault(); onCancel?.(); }
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, sugs.length - 1)); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
  };
  // Sugestiile sunt chips IN-FLOW (nu dropdown absolut) → nu ies niciodată din ecran. Scrii liber,
  // iar numele recomandate apar dedesubt ca pastile pe care poți da click (sau Enter pe cea evidențiată).
  return (
    <div className="si">
      <input
        ref={ref} className="si-in" value={v} placeholder={placeholder}
        onChange={(e) => setV(e.target.value)} onKeyDown={onKey}
        onBlur={() => setTimeout(() => onCancel?.(), 160)}
        aria-label={placeholder}
      />
      {sugs.length > 0 && (
        <div className="si-chips" role="listbox" aria-label="Nume recomandate">
          {sugs.map((s, i) => (
            <button
              key={s.label} type="button" role="option" aria-selected={i === hi}
              className={`si-chip ${i === hi ? "is-hi" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); confirm(s.label); }}
              onMouseEnter={() => setHi(i)}
              title={s.ro && s.ro !== s.label ? s.ro : undefined}
            >
              <span className="si-en">{s.label}</span>
              <span className="si-abbr">{s.type.abbr}</span>
            </button>
          ))}
        </div>
      )}
      <style jsx>{`
        .si { display: flex; flex-direction: column; gap: 7px; }
        .si-in { width: 100%; height: 34px; padding: 0 11px; background: #fff;
                 border: 1px solid var(--pg-line-2, #d3d7dd); border-radius: 8px; color: var(--pg-ink, #15181c);
                 font-size: 13px; font-weight: 700; font-family: inherit; }
        .si-in::placeholder { color: var(--pg-faint, #8a8f98); font-weight: 600; }
        .si-in:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
        .si-chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .si-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px;
                   background: var(--pg-soft, #f3f4f6); border: 1px solid var(--pg-line-2, #d3d7dd); cursor: pointer;
                   transition: all .12s ease; }
        .si-chip:hover, .si-chip.is-hi { background: #fff; border-color: #aeb4bd; box-shadow: 0 1px 2px rgba(16,20,26,.06); }
        .si-chip.is-hi { outline: 2px solid var(--primary); outline-offset: 1px; }
        .si-en { color: var(--pg-ink, #15181c); font-size: 12.5px; font-weight: 700; }
        .si-abbr { color: var(--pg-faint, #8a8f98); font-size: 10px; font-weight: 800; font-variant-numeric: tabular-nums;
                   background: var(--pg-soft, #eef0f3); border: 1px solid var(--pg-line, #e2e5ea); border-radius: 5px; padding: 0 5px; }
      `}</style>
    </div>
  );
}

/* ── Lyrics-only: ascunde acordurile din AFIȘAJ (brackete [Em], rânduri de acorduri „Em  G",
   progresii |Em---|, directive „INTRO:/ENDING: G"). NU atinge datele salvate — acordurile rămân
   în chordpro pentru foaia de producție; aici doar NU le arătăm (liderii n-au treabă cu muzica). */
const CHORD_TOK = /^[A-G](?:#|b|♯|♭)?(?:m|maj|min|dim|aug|sus|add|M)?\d{0,2}(?:sus\d)?(?:add\d)?(?:\/[A-G](?:#|b|♯|♭)?)?$/;
const isChordTok = (w) => CHORD_TOK.test(w);
function isChordLine(raw) {
  let t = String(raw || "").trim();
  if (!t) return false;
  if (/^[/\\|\-–—\s]+$/.test(t)) return true;                // ritm pur: „//////\\\\\\|" sau „|---|---|"
  const m = t.match(/^[\p{L}\d .]+:\s*(.*)$/u);              // „INTRO:", „VERSE 1:", „ENDING: G"
  if (m) { const rest = m[1].trim(); if (!rest) return true; t = rest; }
  if (t.includes("|")) {                                      // progresie: |Em---|G---|
    const toks = t.replace(/[|\-–]+/g, " ").split(/\s+/).filter(Boolean);
    return toks.length === 0 || toks.every(isChordTok);
  }
  const toks = t.split(/\s+/).filter(Boolean);                // rând doar cu acorduri: „Em   G"
  return toks.length > 0 && toks.every(isChordTok);
}
function prettyLabel(s) {
  const t = String(s || "").replace(/:\s*$/, "").trim();
  if (!t) return "";
  return t.toLowerCase().replace(/(^|[\s(])([a-zăâîșț])/gu, (mm, p, c) => p + c.toUpperCase());
}
function firstDirective(chordpro) {
  for (const ln of String(chordpro || "").split(/\r?\n/)) {
    const mm = ln.match(/^\s*([\p{L}][\p{L}\d ]*?)\s*:/u);
    if (mm) return mm[1].trim();
  }
  return "";
}

/* ── Un bloc de secțiune (editabil) ─────────────────────────────────────────────────────── */
function Block({ block, canEdit, onDup, onDelete, onRename, onLyrics, onInsertAfter, autoRename = false, onRenameClose }) {
  const [renaming, setRenaming] = useState(!!autoRename);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(block.chordpro || "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, disabled: !canEdit });
  // Secțiune tocmai adăugată din „+" → deschide direct scrierea numelui (fără dropdown, cu chips in-flow).
  useEffect(() => { if (autoRename) setRenaming(true); }, [autoRename]);
  const closeRename = () => { setRenaming(false); onRenameClose?.(); };

  // Doar versurile reale (fără acorduri/progresii/etichete scăpate), cu golurile normalizate.
  const lines = useMemo(() => {
    const rows = renderChordPro(block.chordpro || "", { mode: "lyrics" });
    const out = [];
    for (const l of rows) {
      if (l.kind === "section") continue;
      if (l.kind === "empty") { out.push(l); continue; }
      if (isChordLine(l.lyricRow)) continue;
      out.push(l);
    }
    while (out.length && out[0].kind === "empty") out.shift();
    while (out.length && out[out.length - 1].kind === "empty") out.pop();
    return out;
  }, [block.chordpro]);
  // Eticheta vine din LYRICS (ex. „Verse 1", „Chorus", „Interlude") — NU tradusă în română.
  const label = prettyLabel(block.label) || prettyLabel(firstDirective(block.chordpro)) || "Secțiune";
  const hasBody = lines.some((l) => l.kind === "row" && (l.lyricRow || "").trim());

  const saveLyrics = () => { setEditing(false); if (draft !== block.chordpro) onLyrics(block.id, draft); };
  const cancelLyrics = () => { setEditing(false); setDraft(block.chordpro || ""); };
  useEffect(() => { if (!editing) setDraft(block.chordpro || ""); }, [block.chordpro, editing]);

  // Când e ACTIV (se trage), nu aplicăm transform-ul de sortare → slot-ul fantomă stă pe loc; overlay-ul se mișcă.
  const style = isDragging ? { transition } : { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`blk ${isDragging ? "is-placeholder" : ""}`}
    >
      <div className="blk-h">
        {canEdit && (
          <button className="blk-grip" aria-label="Trage pentru a reordona" title="Trage pentru a reordona" {...attributes} {...listeners}>
            <DotsSixVertical size={17} weight="bold" />
          </button>
        )}
        {renaming ? (
          <div className="blk-rename">
            <SectionInput
              initial={block.label || ""} placeholder="Scrie numele secțiunii…"
              onConfirm={(lab) => { closeRename(); onRename(block.id, lab); }}
              onCancel={closeRename}
            />
          </div>
        ) : (
          <button className="blk-label" onClick={() => canEdit && setRenaming(true)} disabled={!canEdit} title={canEdit ? "Redenumește" : undefined}>
            {label}
          </button>
        )}

        {canEdit && !renaming && (
          <div className="blk-tools">
            <button className="bt bt-edit" onClick={() => setEditing((e) => !e)} aria-label="Editează versuri" title="Editează versuri" aria-pressed={editing}><PencilSimple size={17} weight="duotone" /></button>
            <button className="bt bt-dup" onClick={() => onDup(block.id)} aria-label="Duplică" title="Duplică"><CopySimple size={17} weight="duotone" /></button>
            <button className="bt bt-ins" onClick={() => onInsertAfter(block.id, "")} aria-label="Adaugă secțiune dedesubt" title="Adaugă secțiune dedesubt"><Plus size={17} weight="bold" /></button>
            <button className="bt bt-del" onClick={() => onDelete(block.id)} aria-label="Șterge" title="Șterge"><Trash size={17} weight="duotone" /></button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="blk-edit">
          <textarea
            className="blk-ta" value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveLyrics(); } if (e.key === "Escape") { e.preventDefault(); cancelLyrics(); } }}
            spellCheck={false} rows={Math.max(4, (draft.match(/\n/g) || []).length + 2)}
            aria-label="Editează versurile secțiunii"
          />
          <div className="blk-edit-foot">
            <span className="blk-edit-hint">Scrie versurile pe rânduri · Ctrl+Enter salvează</span>
            <div className="blk-edit-btns">
              <button className="be be-ok" onClick={saveLyrics}><Check size={13} weight="bold" /> Gata</button>
              <button className="be" onClick={cancelLyrics}>Anulează</button>
            </div>
          </div>
        </div>
      ) : hasBody ? (
        <div className="blk-body">
          {lines.map((l, i) => (
            l.kind === "empty" ? <div key={i} className="blk-gap" />
              : <div key={i} className="blk-line">{l.lyricRow || " "}</div>
          ))}
        </div>
      ) : (
        <div className="blk-empty" />
      )}

      <style jsx>{`
        /* Secțiune = container minimal, pătrățos, pe hârtie albă — ca în PDF-ul de lyrics.
           Doar un border + etichetă mică + grip în stânga. Fără bară închisă, fără colțuri rotunjite. */
        .blk { position: relative; background: var(--pg, #fff); border: 1px solid var(--pg-line-2, #d3d7dd); border-radius: 8px; transition: border-color .15s ease, box-shadow .15s ease; }
        .blk:hover { border-color: #b9bec6; box-shadow: 0 1px 2px rgba(16,20,26,.05); }
        /* În timpul drag-ului elementul-sursă rămâne ca „slot" fantomă (își PĂSTREAZĂ mărimea),
           iar cardul care se mișcă e un DragOverlay curat → zero resize/flicker. */
        .blk.is-placeholder { opacity: .4; border-style: dashed; border-color: #b4b9c1; box-shadow: none; }
        .blk.is-placeholder * { visibility: hidden; }
        .blk-h { display: flex; align-items: center; gap: 9px; padding: 10px 10px 3px 9px; }
        /* Grip = „colțul" de drag, chip tentat (vizibil mereu) ca să se vadă că blocul se trage. */
        .blk-grip { width: 26px; height: 26px; flex: none; padding: 0; background: rgba(47,129,247,.09); border: 1px solid rgba(47,129,247,.20);
                    color: #3b73d6; cursor: grab; display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; touch-action: none;
                    transition: all .15s ease; }
        .blk-grip:hover { background: rgba(47,129,247,.16); border-color: rgba(47,129,247,.38); color: #2f6fe0; }
        .blk-grip:active { cursor: grabbing; background: rgba(47,129,247,.22); }
        .blk-label { font-size: 11px; font-weight: 700; letter-spacing: .3px; color: var(--pg-dim, #5a6069);
                     background: var(--pg-soft, #f3f4f6); border: 1px solid var(--pg-line-2, #d3d7dd); border-radius: 3px; padding: 2px 9px; cursor: pointer; }
        .blk-label:hover:not(:disabled) { border-color: #b9bec6; color: var(--pg-ink, #15181c); }
        .blk-label:disabled { cursor: default; }
        .blk-rename { flex: 1; max-width: 280px; }
        .blk-tools { margin-left: auto; display: flex; align-items: center; gap: 3px; padding: 3px;
                     border-radius: 9px; background: var(--pg-soft, #f3f4f6); border: 1px solid var(--pg-line, #e2e5ea);
                     opacity: .82; transition: opacity .15s ease, border-color .15s ease; }
        .blk:hover .blk-tools, .blk:focus-within .blk-tools { opacity: 1; border-color: var(--pg-line-2, #d3d7dd); }
        /* Iconuri colorate (Phosphor duotone) — fiecare acțiune are culoarea ei, cu profunzime; hover = tentă de aceeași nuanță. */
        .bt { width: 29px; height: 29px; border-radius: 7px; background: transparent; border: 1px solid transparent;
              display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .13s ease; }
        .bt:disabled { opacity: .3; cursor: default; }
        .bt:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
        .bt-edit { color: #2f6fe0; } .bt-edit:hover:not(:disabled) { background: rgba(47,111,224,.12); border-color: rgba(47,111,224,.30); }
        .bt-dup  { color: #7a5cf0; } .bt-dup:hover:not(:disabled)  { background: rgba(122,92,240,.12); border-color: rgba(122,92,240,.30); }
        .bt-ins  { color: #3f9142; } .bt-ins:hover:not(:disabled)  { background: rgba(63,145,66,.14);  border-color: rgba(63,145,66,.32); }
        .bt-del  { color: #c2362e; } .bt-del:hover:not(:disabled)  { background: rgba(194,54,46,.12);  border-color: rgba(194,54,46,.32); }

        .blk-body { display: flex; flex-direction: column; padding: 4px 14px 12px 14px; }
        .blk-line { color: var(--pg-ink, #15181c); font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
        .blk-gap { height: 10px; }
        .blk-empty { height: 8px; }

        .blk-edit { display: flex; flex-direction: column; gap: 9px; padding: 6px 12px 12px; }
        .blk-ta { width: 100%; min-height: 96px; resize: vertical; padding: 10px 12px; background: var(--pg-soft, #f6f7f9);
                  border: 1px solid var(--pg-line-2, #d3d7dd); border-radius: 3px; color: var(--pg-ink, #15181c);
                  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; }
        .blk-ta:focus { outline: 2px solid var(--primary); outline-offset: 1px; background: #fff; }
        .blk-edit-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .blk-edit-hint { color: var(--pg-faint, #8a8f98); font-size: 11px; }
        .blk-edit-hint code { background: #fff; border: 1px solid var(--pg-line, #e2e5ea); border-radius: 3px; padding: 0 5px; font-size: 10.5px; color: var(--pg-dim, #5a6069); }
        .blk-edit-btns { display: flex; gap: 6px; }
        .be { height: 30px; padding: 0 12px; border-radius: 3px; background: #fff; border: 1px solid var(--pg-line-2, #d3d7dd);
              color: var(--pg-dim, #5a6069); font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
        .be:hover { color: var(--pg-ink, #15181c); border-color: #b9bec6; }
        .be-ok { background: var(--pg-sec, #2f343c); border-color: var(--pg-sec, #2f343c); color: #fff; }
        .be-ok:hover { color: #fff; border-color: var(--pg-sec, #2f343c); }
        .blk-add { padding: 0 12px 12px; max-width: 340px; }
      `}</style>
    </div>
  );
}

/* ── Header de mashup (între melodii) — secvența lui se populează dinamic din blocurile de sub el ── */
const METERS = ["", "4/4", "3/4", "6/8", "2/4", "12/8", "6/4", "5/4"];
function MashupHeader({ header, seq, canEdit, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: header.id, disabled: !canEdit });
  const style = isDragging ? { transition } : { transform: CSS.Transform.toString(transform), transition };
  const simplified = !!header.simplified;
  return (
    <div ref={setNodeRef} style={style} className={`mh ${isDragging ? "is-placeholder" : ""}`}>
      <div className="mh-top">
        {canEdit && (
          <button className="mh-grip" aria-label="Trage tranziția" title="Trage pentru a muta" {...attributes} {...listeners}>
            <DotsSixVertical size={18} weight="bold" />
          </button>
        )}
        <span className="mh-badge" aria-hidden><ArrowElbowDownRight size={18} weight="duotone" /></span>
        <span className="mh-kicker">Melodie nouă · tranziție</span>
        {canEdit && (
          <div className="mh-tools">
            <input className="mh-bpm" type="number" min="0" value={header.bpm ?? ""} onChange={(e) => onEdit(header.id, { bpm: e.target.value === "" ? null : Number(e.target.value) })} placeholder="BPM" aria-label="BPM" />
            <select className="mh-meter" value={header.meter || ""} onChange={(e) => onEdit(header.id, { meter: e.target.value })} aria-label="Metru">
              {METERS.map((m) => <option key={m} value={m}>{m || "metru"}</option>)}
            </select>
            <button className={`mh-btn mh-simp ${simplified ? "on" : ""}`} onClick={() => onEdit(header.id, { simplified: !simplified })}
              aria-pressed={simplified} aria-label="Simplu pe foaie (doar titlu)"
              title={simplified ? "Pe foaie: simplu (doar titlu). Click → header complet" : "Pe foaie: header complet (secvență, bpm). Click → simplu"}>
              {simplified ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
            </button>
            <button className="mh-btn mh-del" onClick={() => onRemove(header.id)} aria-label="Șterge tranziția"><Trash size={16} weight="duotone" /></button>
          </div>
        )}
      </div>
      {canEdit
        ? <input className="mh-title" value={header.title || ""} onChange={(e) => onEdit(header.id, { title: e.target.value })} placeholder="Titlu melodie următoare…" aria-label="Titlu tranziție" />
        : <div className="mh-title-ro">{header.title || "Tranziție"}</div>}
      {seq.length > 0 && <div className="mh-seq">{seq.map((t, i) => <span key={i} className="mh-tok">{t}</span>)}</div>}
      <style jsx>{`
        /* Header de tranziție = „divider de melodie nouă" — mai mare și premium, pe culoarea foii (#e6e6e6).
           Se trage cu grip (dnd-kit). Overlay-ul curat preia aspectul ridicat în timpul drag-ului. */
        .mh { background: var(--pg-head, #e6e6e6); border: 1px solid #cdd0d4; border-radius: 10px; padding: 12px 13px 13px; display: flex; flex-direction: column; gap: 10px;
              box-shadow: inset 0 1px 0 rgba(255,255,255,.5); }
        .mh.is-placeholder { opacity: .4; border-style: dashed; box-shadow: none; }
        .mh.is-placeholder * { visibility: hidden; }
        .mh-top { display: flex; align-items: center; gap: 9px; }
        /* Grip tentat (teal) — distinct de grip-ul albastru al blocurilor, ca să se „citească" că e o tranziție. */
        .mh-grip { width: 27px; height: 27px; flex: none; padding: 0; background: rgba(13,148,136,.12); border: 1px solid rgba(13,148,136,.26);
                   color: #0e8f82; cursor: grab; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; touch-action: none; transition: all .15s ease; }
        .mh-grip:hover { background: rgba(13,148,136,.2); border-color: rgba(13,148,136,.42); }
        .mh-grip:active { cursor: grabbing; background: rgba(13,148,136,.26); }
        .mh-badge { width: 30px; height: 30px; flex: none; border-radius: 9px; color: #0e8f82;
                    background: linear-gradient(160deg, rgba(13,148,136,.2), rgba(13,148,136,.08)); border: 1px solid rgba(13,148,136,.3);
                    display: inline-flex; align-items: center; justify-content: center; }
        .mh-kicker { flex: 1; min-width: 0; color: var(--pg-dim, #5a6069); font-size: 10.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .mh-title { width: 100%; height: 38px; padding: 0 13px; background: #fff; border: 1px solid #cfd2d6; border-radius: 8px;
                    color: var(--pg-ink, #15181c); font-size: 15px; font-weight: 800; font-family: inherit; letter-spacing: -.1px; }
        .mh-title::placeholder { color: var(--pg-faint, #8a8f98); font-weight: 600; }
        .mh-title:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
        .mh-title-ro { color: var(--pg-ink, #15181c); font-size: 16px; font-weight: 800; }
        .mh-tools { display: flex; align-items: center; gap: 6px; flex: none; }
        .mh-bpm { width: 58px; height: 32px; padding: 0 9px; background: #fff; border: 1px solid #cfd2d6; border-radius: 8px; color: var(--pg-ink, #15181c); font-size: 12.5px; font-family: inherit; }
        .mh-meter { height: 32px; padding: 0 7px; background: #fff; border: 1px solid #cfd2d6; border-radius: 8px; color: var(--pg-ink, #15181c); font-size: 12.5px; font-family: inherit; }
        .mh-btn { width: 32px; height: 32px; border-radius: 8px; background: #fff; border: 1px solid #cfd2d6; color: var(--pg-dim, #5a6069);
                  display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s ease; }
        .mh-btn:hover { border-color: #b9bec6; color: var(--pg-ink, #15181c); }
        .mh-simp { color: #2f6fe0; } .mh-simp:hover { color: #2f6fe0; border-color: rgba(47,111,224,.4); }
        .mh-simp.on { color: #2f6fe0; background: rgba(47,111,224,.12); border-color: rgba(47,111,224,.4); }
        .mh-del:hover { color: #c2362e; border-color: rgba(194,54,46,.4); }
        .mh-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
        .mh-seq { display: flex; flex-wrap: wrap; gap: 6px; }
        .mh-tok { font-size: 12px; font-weight: 800; color: var(--pg-tx, #2b2b2b); background: #fff; border: 1px solid #d3d5d8; border-radius: 6px; padding: 3px 10px; font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}

/* ── Studio ──────────────────────────────────────────────────────────────────────────────── */
export default function MashupStudio({ planId, itemId, canEdit = false, onClose }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("single"); // single | medley | nosong
  const [headTitle, setHeadTitle] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  // Faza 3 — salvare temporară.
  const [dirty, setDirty] = useState(false);       // modificări nesalvate față de ce e în DB
  const [hasTemp, setHasTemp] = useState(false);   // itemul are deja o clonă temporară salvată
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false); // modal „Salvează / Renunță / Rămâi aici"
  const [savedModal, setSavedModal] = useState(false);     // modal de confirmare după save (D3)
  const [saveErr, setSaveErr] = useState("");
  const [voicesReset, setVoicesReset] = useState(false);   // true dacă la acest save s-au golit vocile (mashup nou)
  // Faza 4 — mashup / transition.
  const [consumed, setConsumed] = useState([]);            // itemIds aduse prin Transition (dispar din Order la save)
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [nextSong, setNextSong] = useState(null);          // { itemId, title } melodia următoare de unit
  const [presets, setPresets] = useState([]);
  const [bringing, setBringing] = useState(false);
  const [transErr, setTransErr] = useState("");
  // Faza 5 — REPLACE & SAVE (scrie definitiv în bibliotecă; type-to-confirm).
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceConfirm, setReplaceConfirm] = useState(""); // titlul scris de utilizator ca să confirme
  const [replaceNewTitle, setReplaceNewTitle] = useState(""); // redenumire OPȚIONALĂ
  const [replacing, setReplacing] = useState(false);
  const [replaceErr, setReplaceErr] = useState("");
  const [replaceDone, setReplaceDone] = useState(false);    // modal de succes după suprascriere
  // Faza 6 — SAVE AS NEW (melodie nouă / aranjament nou).
  const [sanOpen, setSanOpen] = useState(false);
  const [sanMode, setSanMode] = useState("song");           // "song" | "arrangement"
  const [sanTitle, setSanTitle] = useState("");
  const [sanTargets, setSanTargets] = useState([]);          // songId-urile surselor bifate (mashup + aranjament)
  const [sanSaving, setSanSaving] = useState(false);
  const [sanErr, setSanErr] = useState("");
  const [sanDone, setSanDone] = useState(null);              // { mode, title, created } după succes

  // Istoric local (undo/redo) + referință sincronă la snapshot.
  const snapRef = useRef(null);
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const editorRef = useRef(null);      // containerul scrollabil
  const aiTaRef = useRef(null);        // textarea barei de prompt (auto-grow)
  const [zoom, setZoom] = useState(1); // zoom foaie (0.8–1.5)
  const [showMeta, setShowMeta] = useState(true);     // afișează secvență / BPM / metru (toggle vizual, nu atinge datele)
  const [justAddedId, setJustAddedId] = useState(null); // blocul tocmai adăugat din „+" → deschide direct scrierea numelui
  const [activeDrag, setActiveDrag] = useState(null);   // { kind, id, w } pt. DragOverlay (cardul curat care se mișcă)

  const ai = useAi();
  const close = useCallback(() => onClose?.(), [onClose]);

  const setSnap = useCallback((snap) => { snapRef.current = snap; setSnapshot(snap); }, []);

  // Aplică o transformare pură + pune în istoricul de undo.
  const apply = useCallback((fn) => {
    const prev = snapRef.current;
    if (!prev) return;
    const next = fn(prev);
    if (!next || next === prev) return;
    undoRef.current = [...undoRef.current.slice(-49), prev];
    redoRef.current = [];
    setSnap(next); setDirty(true);
  }, [setSnap]);

  const undo = useCallback(() => {
    if (!undoRef.current.length) return;
    const prev = undoRef.current[undoRef.current.length - 1];
    undoRef.current = undoRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, snapRef.current];
    setSnap(prev); setDirty(true);
  }, [setSnap]);

  const redo = useCallback(() => {
    if (!redoRef.current.length) return;
    const next = redoRef.current[redoRef.current.length - 1];
    redoRef.current = redoRef.current.slice(0, -1);
    undoRef.current = [...undoRef.current, snapRef.current];
    setSnap(next); setDirty(true);
  }, [setSnap]);

  // ── Handlerii de editare (folosiți ȘI de butoane, ȘI de AI) ──
  const doMove = useCallback((id, dir) => apply((s) => moveBlock(s, id, dir)), [apply]);
  const doReorder = useCallback((id, toIndex) => apply((s) => { const from = (s.blocks || []).findIndex((b) => b.id === id); return from < 0 ? s : reorderBlocks(s, from, toIndex); }), [apply]);
  const doDelete = useCallback((id) => apply((s) => removeBlock(s, id)), [apply]);
  const doDup = useCallback((id) => apply((s) => duplicateBlock(s, id)), [apply]);
  const doRename = useCallback((id, label) => apply((s) => renameBlock(s, id, label)), [apply]);
  const doLyrics = useCallback((id, cp) => apply((s) => setLyrics(s, id, cp)), [apply]);
  const doAdd = useCallback((label, afterId = null) => apply((s) => addSection(s, { label, afterId })), [apply]);
  // „+" dintr-un bloc → adaugă o secțiune goală ȘI o pune direct în modul de scriere a numelui (chips in-flow).
  const doAddInline = useCallback((afterId = null) => {
    apply((s) => addSection(s, { label: "", afterId }));
    const bl = snapRef.current?.blocks || [];
    const nid = afterId ? (bl[bl.findIndex((b) => b.id === afterId) + 1]?.id || null) : (bl[bl.length - 1]?.id || null);
    setJustAddedId(nid);
  }, [apply]);
  const doTitle = useCallback((t) => { setHeadTitle(t); apply((s) => setSnapTitle(s, t)); }, [apply]);

  // ── Mashup: header-e (editare / ștergere / mutare pe Y) ──
  const doRemoveHeader = useCallback((hid) => apply((s) => removeHeader(s, hid)), [apply]);
  const doSetHeader = useCallback((hid, patch) => apply((s) => setHeader(s, hid, patch)), [apply]);

  // ── Transition next song (aduce melodia următoare și o unește) ──
  const openTransition = useCallback(async () => {
    setTransErr(""); setTransitionOpen(true); setNextSong(null);
    try {
      const [ord, pr] = await Promise.all([
        plansApi.order(planId),
        transitionPresetsApi.list().catch(() => ({ presets: [] })),
      ]);
      setPresets(pr?.presets || []);
      const list = ord?.items || [];
      const myIdx = list.findIndex((x) => String(x.id) === String(itemId));
      const used = new Set(consumed.map(String));
      const next = list.slice(myIdx + 1).find((x) => x.type === "song" && !used.has(String(x.id)));
      setNextSong(next ? { itemId: String(next.id), title: next.title } : null);
    } catch (e) { setTransErr(e?.message || "Nu am putut încărca melodia următoare."); }
  }, [planId, itemId, consumed]);

  // Nucleu: aduce o melodie (dată prin itemId) în snapshot ca mashup. Folosit de modal ȘI de AI.
  const bringSongByItemId = useCallback(async (nextItemId, presetLabel = "") => {
    if (!nextItemId || bringing) return false;
    setBringing(true); setTransErr("");
    try {
      const detail = await plansApi.itemDetail(planId, nextItemId);
      const { source, chordpro } = await loadSongSource(detail);
      const headerTitle = presetLabel ? `${presetLabel} → ${source.title}` : (source.title || "Următoarea melodie");
      apply((s) => addTransitionSong(s, source, chordpro, { headerTitle }));
      setConsumed((c) => [...new Set([...c, String(nextItemId)])]);
      return true;
    } catch (e) { setTransErr(e?.message || "Nu am putut aduce melodia."); return false; }
    finally { setBringing(false); }
  }, [planId, bringing, apply]);

  const bringNext = useCallback(async (presetLabel) => {
    if (!nextSong) return;
    const ok = await bringSongByItemId(nextSong.itemId, presetLabel);
    if (ok) { setTransitionOpen(false); setNextSong(null); }
  }, [nextSong, bringSongByItemId]);

  // Pt. AI: găsește melodia următoare neconsumată din Order și o aduce (fără modal).
  const bringNextAuto = useCallback(async (presetLabel = "") => {
    const ord = await plansApi.order(planId);
    const list = ord?.items || [];
    const myIdx = list.findIndex((x) => String(x.id) === String(itemId));
    const used = new Set(consumed.map(String));
    const next = list.slice(myIdx + 1).find((x) => x.type === "song" && !used.has(String(x.id)));
    if (!next) throw new Error("Nu există o melodie următoare de unit.");
    return bringSongByItemId(String(next.id), presetLabel);
  }, [planId, itemId, consumed, bringSongByItemId]);

  // ── Salvare TEMPORARĂ (pc_tempSongs) — nu atinge originalul din bibliotecă ──
  const saveTemporary = useCallback(async () => {
    const snap = snapRef.current;
    if (!snap || saving) return false;
    setSaving(true); setSaveErr(""); setVoicesReset(false);
    try {
      const kind = (snap.sources || []).length > 1 ? "mashup" : "single";
      const r = await plansApi.saveTempSong(planId, itemId, snap, kind, kind === "mashup" ? consumed : []);
      setDirty(false); setHasTemp(true);
      if (r?.voicesReset) setVoicesReset(true);
      return true;
    } catch (e) {
      setSaveErr(e?.message || "Salvarea temporară a eșuat.");
      return false;
    } finally { setSaving(false); }
  }, [planId, itemId, saving, consumed]);

  // Șterge clona temporară → itemul revine la melodia originală legată.
  const deleteTemporary = useCallback(async () => {
    if (saving) return;
    setSaving(true); setSaveErr("");
    try { await plansApi.deleteTempSong(planId, itemId); setHasTemp(false); setDirty(false); close(); }
    catch (e) { setSaveErr(e?.message || "Ștergerea clonei temporare a eșuat."); }
    finally { setSaving(false); }
  }, [planId, itemId, saving, close]);

  // Închidere: dacă există modificări nesalvate → modal (Salvează / Renunță / Rămâi aici); altfel închide.
  // Salvare din bară → arată modalul de confirmare (D3). (AI / saveThenClose NU deschid modalul.)
  const saveTemporaryFromBar = useCallback(async () => { const ok = await saveTemporary(); if (ok) setSavedModal(true); }, [saveTemporary]);

  const requestClose = useCallback(() => { if (dirty) setConfirmClose(true); else close(); }, [dirty, close]);
  const saveThenClose = useCallback(async () => { const ok = await saveTemporary(); setConfirmClose(false); if (ok) close(); }, [saveTemporary, close]);
  const discardAndClose = useCallback(() => { setConfirmClose(false); close(); }, [close]);

  // ── REPLACE & SAVE (Faza 5) — scrie DEFINITIV în biblioteca Songs. Doar single. Ireversibil. ──
  const openReplace = useCallback(() => { setReplaceConfirm(""); setReplaceNewTitle(""); setReplaceErr(""); setReplaceOpen(true); }, []);
  const doReplace = useCallback(async () => {
    if (replacing) return;
    setReplacing(true); setReplaceErr("");
    try {
      // Backend-ul citește din clona temporară → ne asigurăm că editul e salvat ca temp întâi.
      if (dirty || !hasTemp) { const ok = await saveTemporary(); if (!ok) { setReplaceErr("N-am putut pregăti versiunea de salvat."); setReplacing(false); return; } }
      await plansApi.replaceArrangement(planId, itemId, replaceConfirm.trim(), replaceNewTitle.trim());
      setReplaceOpen(false); setReplaceDone(true);
    } catch (e) {
      setReplaceErr(e?.message || "Suprascrierea a eșuat.");
    } finally { setReplacing(false); }
  }, [replacing, dirty, hasTemp, saveTemporary, planId, itemId, replaceConfirm, replaceNewTitle]);

  // ── SAVE AS NEW (Faza 6) — melodie nouă SAU aranjament nou în bibliotecă. Nu atinge editul de pe plan. ──
  const openSaveAsNew = useCallback(() => {
    const srcs = snapRef.current?.sources || [];
    setSanMode("song");
    setSanTitle(snapRef.current?.title || headTitle || "");
    setSanTargets(srcs.map((s) => String(s.songId)).filter((x) => x && x !== "null")); // default: toate sursele bifate
    setSanErr(""); setSanOpen(true);
  }, [headTitle]);
  const toggleSanTarget = useCallback((songId) => {
    setSanTargets((prev) => prev.includes(songId) ? prev.filter((x) => x !== songId) : [...prev, songId]);
  }, []);
  const doSaveAsNew = useCallback(async () => {
    if (sanSaving) return;
    const title = sanTitle.trim();
    if (!title) { setSanErr("Scrie un titlu."); return; }
    const srcs = snapRef.current?.sources || [];
    const isMash = srcs.length > 1;
    if (sanMode === "arrangement" && isMash && !sanTargets.length) { setSanErr("Bifează cel puțin o melodie-sursă."); return; }
    setSanSaving(true); setSanErr("");
    try {
      if (dirty || !hasTemp) { const ok = await saveTemporary(); if (!ok) { setSanErr("N-am putut pregăti versiunea de salvat."); setSanSaving(false); return; } }
      const targets = (sanMode === "arrangement" && isMash) ? sanTargets : [];
      const r = await plansApi.saveAsNew(planId, itemId, sanMode, title, targets);
      setSanOpen(false);
      setSanDone({ mode: sanMode, title: r?.title || title, created: r?.created || [] });
    } catch (e) {
      setSanErr(e?.message || "Crearea a eșuat.");
    } finally { setSanSaving(false); }
  }, [sanSaving, sanTitle, sanMode, sanTargets, dirty, hasTemp, saveTemporary, planId, itemId]);

  // Drag & drop SEAMLESS cu dnd-kit (blocuri + headere, într-o singură listă ordonată).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // 6px → click-urile pe butoane merg
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Auto-grow pentru textarea-ul barei de prompt (stil Claude).
  const growTa = useCallback(() => {
    const t = aiTaRef.current; if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 150) + "px";
  }, []);
  // Zoom foaie (0.8–1.5).
  const zoomIn = useCallback(() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.8, Math.round((z - 0.1) * 10) / 10)), []);
  const zoomReset = useCallback(() => setZoom(1), []);

  // Esc închide; Ctrl+Z / Ctrl+Shift+Z (și Ctrl+Y) = undo/redo — doar când NU scrii într-un câmp.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "Escape") {
        if (sanDone) { setSanDone(null); return; }
        if (sanOpen && !sanSaving) { setSanOpen(false); return; }
        if (replaceDone) { setReplaceDone(false); close(); return; }
        if (replaceOpen && !replacing) { setReplaceOpen(false); return; }
        if (savedModal) { setSavedModal(false); return; }
        if (confirmClose) { setConfirmClose(false); return; }
        if (!inField) { requestClose(); return; }
      }
      if (inField) return;
      const z = e.key === "z" || e.key === "Z";
      if ((e.ctrlKey || e.metaKey) && z) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose, undo, redo, savedModal, confirmClose, replaceOpen, replacing, replaceDone, close, sanOpen, sanSaving, sanDone]);

  // ── Încărcare ──
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(""); setSaveErr("");
      undoRef.current = []; redoRef.current = []; setDirty(false);
      try {
        const it = await plansApi.itemDetail(planId, itemId);
        if (!alive) return;
        setHeadTitle(it.title || "");
        if (it.type === "medley") { setMode("medley"); setLoading(false); return; }
        // Clonă temporară deja salvată → pornim de la snapshot-ul ei (continui de unde ai rămas).
        if (it.tempSnapshot && Array.isArray(it.tempSnapshot.blocks) && it.tempSnapshot.blocks.length) {
          setHasTemp(true); setSnap(it.tempSnapshot); setMode("single"); setLoading(false); return;
        }
        setHasTemp(false);
        if (!it.songId) { setMode("nosong"); setLoading(false); return; }
        const { source, chordpro, arr, originalKey } = await loadSongSource(it);
        const snap = snapshotFromSource(source, chordpro, {
          bpm: arr?.bpm ?? null, meter: arr?.meter || "", lengthSec: arr?.lengthSec || 0,
          sequence: (Array.isArray(it.sequence) && it.sequence.length) ? it.sequence : (arr?.sequence || []),
          originalKey,
        });
        if (!alive) return;
        setSnap(snap); setMode("single"); setLoading(false);
      } catch (e) {
        if (alive) { setErr(e?.message || "Eroare la încărcarea melodiei."); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [planId, itemId, setSnap]);

  const keys = snapshot?.keys || [];
  const blocks = snapshot?.blocks || [];
  const seq = snapshot?.sequence || [];
  const headers = snapshot?.headers || [];
  const isMashup = (snapshot?.sources || []).length > 1;
  const headersBefore = headers.filter((h) => !h.afterBlockId); // afterBlockId "" → înaintea primului bloc
  const kLabel = keysLabel(keys);
  const title = snapshot?.title || headTitle;

  // Lista ordonată mixtă (blocuri + headere) pt. dnd-kit — exact ordinea de pe ecran.
  const orderedItems = useMemo(() => {
    const items = [];
    for (const h of headersBefore) items.push({ kind: "h", id: h.id });
    for (const b of blocks) {
      items.push({ kind: "b", id: b.id });
      for (const h of headers.filter((x) => x.afterBlockId === b.id)) items.push({ kind: "h", id: h.id });
    }
    return items;
  }, [blocks, headers, headersBefore]);
  const itemIds = useMemo(() => orderedItems.map((it) => it.id), [orderedItems]);

  // Start drag → reținem ce se trage (pt. DragOverlay-ul curat) + lățimea reală (ca ghost-ul să NU-și schimbe mărimea).
  const onDndStart = useCallback((e) => {
    const id = e.active?.id;
    const it = orderedItems.find((x) => x.id === id);
    setActiveDrag(it ? { kind: it.kind, id, w: e.active?.rect?.current?.initial?.width || null } : null);
  }, [orderedItems]);
  const onDndCancel = useCallback(() => setActiveDrag(null), []);

  // Drop: reconstruiește o singură dată (un singur undo) ordinea blocurilor + ancorele headerelor.
  const onDndEnd = useCallback((e) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = itemIds.indexOf(active.id);
    const to = itemIds.indexOf(over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(orderedItems, from, to);
    apply((s) => applyMixedOrder(s, next));
  }, [itemIds, orderedItems, apply]);

  // Preview LIVE (dreapta) = exact ca „Lyrics" din Songs: titlu + secvență, secțiuni + versuri (fără acorduri),
  // monospace. Se reconstruiește din snapshot (reflectă editările/reordonările în timp real).
  const previewItems = useMemo(() => {
    const out = [];
    const lyricsOf = (cp) => {
      const rows = renderChordPro(cp || "", { mode: "lyrics" });
      const lines = [];
      for (const l of rows) {
        if (l.kind === "section") continue;
        if (l.kind === "empty") { lines.push(""); continue; }
        if (isChordLine(l.lyricRow)) continue;
        lines.push(l.lyricRow || "");
      }
      while (lines.length && !lines[0].trim()) lines.shift();
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      return lines;
    };
    // Fiecare tranziție = header COMPLET de melodie nouă (titlu + secvență + bpm/metru), ca prima melodie —
    // doar dacă e marcat „simplu" (ochiul) rămâne o linie subțire cu titlul.
    const hdrItem = (h) => ({
      type: "h", id: h.id, title: h.title || "Tranziție", bpm: h.bpm ?? null, meter: h.meter || "",
      seq: sequenceUnderHeader(snapshot, h.id).map((t) => String(t || "")).join(", "), simplified: !!h.simplified,
    });
    for (const h of headersBefore) out.push(hdrItem(h));
    for (const b of blocks) {
      out.push({ type: "b", id: b.id, label: (prettyLabel(b.label) || prettyLabel(firstDirective(b.chordpro)) || "Secțiune").toUpperCase(), lines: lyricsOf(b.chordpro) });
      for (const h of headers.filter((x) => x.afterBlockId === b.id)) out.push(hdrItem(h));
    }
    return out;
  }, [blocks, headers, headersBefore, snapshot]);
  const seqText = seq.map((t) => String(t || "")).join(", ");
  // La mashup, header-ul de sus (melodia #1) arată DOAR secvența ei (blocurile de dinaintea primei tranziții).
  const topSeqText = useMemo(() => {
    if (!isMashup || !headers.length) return seqText;
    let min = Infinity;
    for (const h of headers) { const i = h.afterBlockId ? blocks.findIndex((b) => b.id === h.afterBlockId) : -1; if (i < min) min = i; }
    const lead = blocks.slice(0, (min === Infinity ? blocks.length : min) + 1);
    return sequenceFromBlocks(lead).map((t) => String(t || "")).join(", ");
  }, [isMashup, headers, blocks, seqText]);
  // Titlul REAL din bibliotecă (pt. „type-to-confirm" la Replace) = titlul primei surse, nu titlul editat în snapshot.
  const origTitle = (snapshot?.sources || [])[0]?.title || headTitle || "";
  const canReplace = canEdit && mode === "single" && !isMashup && consumed.length === 0 && (hasTemp || dirty);
  const replaceMatch = replaceConfirm.trim().replace(/\s+/g, " ").toLowerCase() === origTitle.trim().replace(/\s+/g, " ").toLowerCase() && !!origTitle.trim();
  const canUndo = undoRef.current.length > 0;
  const canRedo = redoRef.current.length > 0;

  /* ── AI SURFACE: AI vede tot + poate face tot (prin aceleași transformări) ── */
  useAiSurface({
    id: "order.studio",
    label: `Mashup Studio — ${title || "melodie"}`,
    scope: "modal",
    rules: orderEditorRules.rules || [], // reguli foolproof injectate în gateway (§5.3)
    // IMPORTANT: citim LIVE din snapRef.current (nu din variabila închisă în closure) — așa AI-ul
    // vede MEREU blocurile curente, indiferent când s-a (re)înregistrat suprafața.
    getContext: () => {
      const s = snapRef.current || snapshot || {};
      const bl = s.blocks || [];
      const hd = s.headers || [];
      // Eticheta pe care O VEDE utilizatorul (derivată din lyrics dacă nu e stocată): Verse/Chorus/Tag…
      const disp = (b) => prettyLabel(b.label) || prettyLabel(firstDirective(b.chordpro)) || "Secțiune";
      return {
        planId, itemId, mode, canEdit, title: s.title || title,
        keyLabel: keysLabel(s.keys || []), bpm: s.bpm ?? null, meter: s.meter || "",
        sequence: s.sequence || [],
        isMashup: (s.sources || []).length > 1,
        sources: (s.sources || []).map((x) => ({ songId: x.songId, arrangementId: x.arrangementId, keyName: x.keyName, title: x.title })),
        blocks: bl.map((b, i) => ({ index: i, id: b.id, label: disp(b), rawLabel: b.label || "", custom: !!b.custom, sourceIdx: b.sourceIdx, lyrics: cleanLyrics(b.chordpro), chordpro: b.chordpro || "" })),
        headers: hd.map((h) => ({ id: h.id, title: h.title, bpm: h.bpm, meter: h.meter, afterBlockId: h.afterBlockId })),
        hint: "`label` = eticheta vizibilă a blocului (Verse/Chorus/Tag…). Țintește blocurile după acest `label` și `id`. Nu inventa secțiuni; nu edita direct `sequence`. La mashup: 1 header per tranziție.",
      };
    },
    actions: canEdit ? [
      { id: "move-section", label: "Mută secțiune", description: "Mută un bloc sus (dir=-1) sau jos (dir=1).", params: { id: "string", dir: "number" }, run: ({ id, dir }) => doMove(id, Number(dir) || 1) },
      { id: "reorder-section", label: "Reordonează secțiune", description: "Mută blocul `id` la poziția `toIndex` (0-based).", params: { id: "string", toIndex: "number" }, run: ({ id, toIndex }) => doReorder(id, Number(toIndex) || 0) },
      { id: "delete-section", label: "Șterge secțiune", description: "Șterge blocul `id`.", params: { id: "string" }, run: ({ id }) => doDelete(id) },
      { id: "duplicate-section", label: "Duplică secțiune", description: "Duplică blocul `id` imediat sub el.", params: { id: "string" }, run: ({ id }) => doDup(id) },
      { id: "rename-section", label: "Redenumește secțiune", description: "Schimbă eticheta blocului `id` (ex. Verse 1).", params: { id: "string", label: "string" }, run: ({ id, label }) => doRename(id, label) },
      { id: "set-lyrics", label: "Schimbă versuri", description: "Înlocuiește versurile (ChordPro) blocului `id`.", params: { id: "string", chordpro: "string" }, run: ({ id, chordpro }) => doLyrics(id, chordpro) },
      { id: "add-section", label: "Adaugă secțiune", description: "Adaugă un bloc nou (opțional după `afterId`; altfel la final).", params: { label: "string", afterId: "string?" }, run: ({ label, afterId }) => doAdd(label, afterId || null) },
      { id: "set-title", label: "Schimbă titlul", description: "Schimbă titlul melodiei temporare.", params: { title: "string" }, run: ({ title: t }) => doTitle(t) },
      { id: "undo", label: "Undo", description: "Anulează ultima modificare.", params: {}, run: () => undo() },
      { id: "redo", label: "Redo", description: "Reface ultima modificare anulată.", params: {}, run: () => redo() },
      { id: "save-temporary", label: "Salvează temporar", description: "Salvează versiunea editată ca melodie temporară pe acest plan (nu atinge biblioteca).", params: {}, run: () => saveTemporary() },
      { id: "delete-temporary", label: "Șterge editarea temporară", description: "Șterge clona temporară și revine la melodia originală.", params: {}, run: () => deleteTemporary() },
      { id: "transition-next-song", label: "Unește melodia următoare", description: "Aduce melodia următoare din Order și o unește (mashup). presetLabel = tipul tranziției (opțional).", params: { presetLabel: "string?" }, run: ({ presetLabel }) => bringNextAuto(presetLabel || "") },
      { id: "remove-header", label: "Șterge tranziția", description: "Șterge un header de mashup (id).", params: { id: "string" }, run: ({ id }) => doRemoveHeader(id) },
      { id: "set-header", label: "Editează tranziția", description: "Schimbă title/bpm/meter ale unui header de mashup.", params: { id: "string", title: "string?", bpm: "number?", meter: "string?" }, run: ({ id, ...patch }) => doSetHeader(id, patch) },
      { id: "prepare-replace", label: "Replace & Save", description: "Deschide confirmarea de suprascriere definitivă a aranjamentului din bibliotecă (type-to-confirm). NU execută singur — omul confirmă.", params: {}, run: () => { if (canReplace) openReplace(); return { ok: canReplace, note: canReplace ? "Deschis modalul de confirmare." : "Replace indisponibil (mashup sau fără editare)." }; } },
      { id: "prepare-save-as-new", label: "Save as new", description: "Deschide dialogul Salvează ca nou (melodie nouă sau aranjament nou în bibliotecă). NU creează singur — omul confirmă.", params: {}, run: () => { openSaveAsNew(); return { ok: true, note: "Deschis dialogul Save as new." }; } },
    ] : [],
  }, [snapshot, mode, canEdit, title, kLabel, planId, itemId, canReplace, openReplace, openSaveAsNew]);

  /* ── Composer AI (propune → confirmi → execută) ── */
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [aiProposals, setAiProposals] = useState([]);
  // Faza 8 — feedback 👍/👎 + lecții.
  const [aiLastPrompt, setAiLastPrompt] = useState(""); // comanda care a generat propunerile curente
  const [rated, setRated] = useState({});               // { [index]: "up" | "down" }
  const [noteOpen, setNoteOpen] = useState(null);        // indexul propunerii la care scrii motivul 👎
  const [noteText, setNoteText] = useState("");
  const [lessons, setLessons] = useState([]);            // lecțiile salvate (order.studio)
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [lessonsLoaded, setLessonsLoaded] = useState(false);

  const sendAi = useCallback(async () => {
    const p = aiText.trim();
    if (!p || aiBusy) return;
    setAiBusy(true); setAiMsg(""); setAiProposals([]); setRated({}); setNoteOpen(null); setNoteText("");
    try {
      const r = await ai.ask(p);
      setAiMsg(r?.message || (r?.ok ? "" : "AI-ul nu a răspuns."));
      setAiProposals(Array.isArray(r?.proposedActions) ? r.proposedActions : []);
      setAiLastPrompt(p);
    } catch (e) {
      setAiMsg(String(e?.message || e));
    } finally { setAiBusy(false); setAiText(""); }
  }, [aiText, aiBusy, ai]);

  // Închide pop-ul AI (X). Nu lăsăm răspunsul agățat pe ecran degeaba.
  const dismissAi = useCallback(() => { setAiMsg(""); setAiProposals([]); setNoteOpen(null); }, []);
  // Auto-dispariție: dacă e doar un mesaj (fără propuneri de aplicat), dispare singur după ~9s.
  useEffect(() => {
    if (aiMsg && aiProposals.length === 0 && !aiBusy) {
      const t = setTimeout(() => setAiMsg(""), 9000);
      return () => clearTimeout(t);
    }
  }, [aiMsg, aiProposals.length, aiBusy]);

  // ── Feedback 👍/👎 (§5.4): salvează o lecție globală pe org; AI-ul o ia în calcul data viitoare. ──
  const loadLessons = useCallback(async () => {
    try { const r = await aiLessons.list("order.studio"); setLessons(r?.lessons || []); setLessonsLoaded(true); }
    catch { setLessonsLoaded(true); }
  }, []);
  const rateUp = useCallback(async (pa, i) => {
    setRated((m) => ({ ...m, [i]: "up" }));
    try { await aiLessons.save({ surface: pa.surfaceId, verdict: "up", command: aiLastPrompt, actionId: pa.actionId, actionLabel: pa.label || pa.actionId }); if (lessonsOpen) loadLessons(); }
    catch (e) { setAiMsg(String(e?.message || e)); }
  }, [aiLastPrompt, lessonsOpen, loadLessons]);
  const openDown = useCallback((i) => { setNoteOpen(i); setNoteText(""); }, []);
  const saveDown = useCallback(async (pa, i) => {
    setRated((m) => ({ ...m, [i]: "down" })); setNoteOpen(null);
    try { await aiLessons.save({ surface: pa.surfaceId, verdict: "down", command: aiLastPrompt, actionId: pa.actionId, actionLabel: pa.label || pa.actionId, note: noteText.trim() }); if (lessonsOpen) loadLessons(); }
    catch (e) { setAiMsg(String(e?.message || e)); }
  }, [aiLastPrompt, noteText, lessonsOpen, loadLessons]);
  const toggleLessons = useCallback(() => {
    setLessonsOpen((o) => { const next = !o; if (next && !lessonsLoaded) loadLessons(); return next; });
  }, [lessonsLoaded, loadLessons]);
  const removeLesson = useCallback(async (id) => {
    setLessons((ls) => ls.filter((x) => x.id !== id));
    try { await aiLessons.remove(id); } catch (e) { setAiMsg(String(e?.message || e)); }
  }, []);

  const applyProposal = useCallback(async (pa) => {
    try { await ai.runAction(pa.surfaceId, pa.actionId, pa.args || {}); setAiProposals((ps) => ps.filter((x) => x !== pa)); }
    catch (e) { setAiMsg(String(e?.message || e)); }
  }, [ai]);

  const applyAllProposals = useCallback(async () => {
    const list = aiProposals;
    for (const pa of list) { try { await ai.runAction(pa.surfaceId, pa.actionId, pa.args || {}); } catch (e) { setAiMsg(String(e?.message || e)); } }
    setAiProposals([]);
  }, [aiProposals, ai]);

  return (
    <div className="ms" role="dialog" aria-modal="true" aria-label="Editor melodie">
      {/* ── Bara de sus ── */}
      <header className="ms-top">
        <div className="ms-id">
          <span className="ms-badge"><GitMerge size={19} weight="duotone" aria-hidden /></span>
          <div className="ms-titles">
            <span className="ms-kicker">Mashup Studio</span>
            <h1 className="ms-title">{title || "Melodie"}</h1>
          </div>
          {isMashup && <span className="ms-chip ms-mash" title="Mashup — mai multe melodii unite"><MusicNotes size={12} weight="fill" /> mashup</span>}
          {kLabel && <span className="ms-chip ms-key" title="Game / tranziție de gamă">{kLabel}</span>}
          {snapshot?.bpm ? <span className="ms-chip ms-chip-soft">{snapshot.bpm} BPM</span> : null}
          {snapshot?.meter ? <span className="ms-chip ms-chip-soft">{snapshot.meter}</span> : null}
        </div>
        <div className="ms-meta">
          {canEdit && mode === "single" && !loading && (
            <>
              <div className="ms-seg" role="group" aria-label="Istoric">
                <button className="ms-seg-b" onClick={undo} disabled={!canUndo} aria-label="Undo (Ctrl+Z)" title="Undo · Ctrl+Z"><ArrowUUpLeft size={16} weight="bold" /></button>
                <button className="ms-seg-b" onClick={redo} disabled={!canRedo} aria-label="Redo (Ctrl+Shift+Z)" title="Redo · Ctrl+Shift+Z"><ArrowUUpRight size={16} weight="bold" /></button>
              </div>
              <div className="ms-seg" role="group" aria-label="Zoom">
                <button className="ms-seg-b" onClick={zoomOut} disabled={zoom <= 0.8} aria-label="Micșorează" title="Zoom −"><MagnifyingGlassMinus size={16} weight="bold" /></button>
                <button className="ms-seg-b ms-seg-val" onClick={zoomReset} title="Resetează zoom">{Math.round(zoom * 100)}%</button>
                <button className="ms-seg-b" onClick={zoomIn} disabled={zoom >= 1.5} aria-label="Mărește" title="Zoom +"><MagnifyingGlassPlus size={16} weight="bold" /></button>
              </div>
            </>
          )}
          <button className="ms-x" onClick={requestClose} aria-label="Închide editorul"><X size={18} weight="bold" /></button>
        </div>
      </header>

      {/* ── Corp: editor (stânga) + AI (dreapta) ── */}
      <div className="ms-body">
        <section className="ms-editor" aria-label="Editor" ref={editorRef}>
          {loading ? (
            <div className="ms-page ms-skel">
              <div className="ms-skel-head"><span className="ms-skel-chip" /><span className="ms-skel-chip sk-sm" /></div>
              <div className="ms-skel-body"><Skeleton lines={9} /></div>
            </div>
          ) : err ? (
            <div className="ms-state ms-err">{err}</div>
          ) : mode === "medley" ? (
            <div className="ms-state"><MusicNotes size={30} weight="duotone" /><p>Acesta e un <b>medley</b> — se editează din cardul lui din Order. Pentru a uni melodii aici, folosește „Transition next song" pe o melodie simplă.</p></div>
          ) : mode === "nosong" ? (
            <div className="ms-state"><MusicNotes size={30} weight="duotone" /><p>Acest element nu are o melodie legată de editat.</p></div>
          ) : (
            <>
            <div className="ms-page" style={{ zoom }}>
              <div className="ms-doc">
                <div className="ms-doc-row">
                  <span className="ms-doc-ic"><MusicNotes size={18} weight="duotone" aria-hidden /></span>
                  <span className="ms-doc-t">{title || "Melodie"}</span>
                  {kLabel && <span className="ms-doc-k">{kLabel}</span>}
                  {showMeta && snapshot?.bpm ? <span className="ms-doc-m">{snapshot.bpm} BPM</span> : null}
                  {showMeta && snapshot?.meter ? <span className="ms-doc-m">{snapshot.meter}</span> : null}
                  {canEdit && (
                    <button className="ms-doc-eye" onClick={() => setShowMeta((v) => !v)} aria-pressed={!showMeta}
                      title={showMeta ? "Ascunde secvența, BPM și metrul de pe foaie" : "Arată secvența, BPM și metrul pe foaie"}>
                      {showMeta ? <Eye size={15} weight="duotone" /> : <EyeSlash size={15} weight="duotone" />}
                      <span>{showMeta ? "Detalii" : "Doar titlu"}</span>
                    </button>
                  )}
                </div>
                {showMeta && seqText && <div className="ms-doc-seq" aria-label="Secvență (live)">{seqText}</div>}
              </div>
              <div className="ms-sheet">
                {blocks.length === 0 && headersBefore.length === 0 ? (
                  <div className="ms-state">
                    <p>Această melodie nu are nici versuri, nici secvență salvată.</p>
                    {canEdit && <button className="ms-emptyadd" onClick={() => doAddInline(null)}><Plus size={15} weight="bold" /> Adaugă prima secțiune</button>}
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDndStart} onDragEnd={onDndEnd} onDragCancel={onDndCancel}
                    measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}>
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                      <div className="ms-blocks">
                        {headersBefore.map((h) => (
                          <MashupHeader key={h.id} header={h} seq={sequenceUnderHeader(snapshot, h.id)} canEdit={canEdit}
                            onEdit={doSetHeader} onRemove={doRemoveHeader} />
                        ))}
                        {blocks.map((b) => (
                          <Fragment key={b.id}>
                            <Block
                              block={b} canEdit={canEdit}
                              onDup={doDup} onDelete={doDelete} onRename={doRename} onLyrics={doLyrics}
                              onInsertAfter={() => doAddInline(b.id)}
                              autoRename={justAddedId === b.id} onRenameClose={() => setJustAddedId(null)}
                            />
                            {headers.filter((h) => h.afterBlockId === b.id).map((h) => (
                              <MashupHeader key={h.id} header={h} seq={sequenceUnderHeader(snapshot, h.id)} canEdit={canEdit}
                                onEdit={doSetHeader} onRemove={doRemoveHeader} />
                            ))}
                          </Fragment>
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,0,0,1)" }}>
                      {activeDrag ? (() => {
                        const w = activeDrag.w ? { width: activeDrag.w } : undefined;
                        if (activeDrag.kind === "h") {
                          const h = headers.find((x) => x.id === activeDrag.id);
                          return <div className="ms-ghost ms-ghost-h" style={w}><ArrowElbowDownRight size={18} weight="duotone" /><span>{h?.title || "Tranziție"}</span></div>;
                        }
                        const b = blocks.find((x) => x.id === activeDrag.id);
                        const lab = b ? (prettyLabel(b.label) || prettyLabel(firstDirective(b.chordpro)) || "Secțiune") : "Secțiune";
                        const n = b ? cleanLyrics(b.chordpro).split("\n").filter((l) => l.trim()).length : 0;
                        return <div className="ms-ghost" style={w}><span className="ms-ghost-lbl">{lab}</span><span className="ms-ghost-sub">{n ? `${n} rânduri` : "fără versuri"}</span></div>;
                      })() : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="ms-nextsong">
                <button className="ms-nextsong-btn" onClick={openTransition} title="Unește melodia următoare din Order (mashup)">
                  <ArrowElbowDownRight size={17} weight="duotone" /> Adaugă melodia următoare
                </button>
              </div>
            )}
            </>
          )}
        </section>

        {/* ── Dreapta: PREVIEW LIVE (exact ca „Lyrics" din Songs) + acțiuni ── */}
        <section className="ms-preview" aria-label="Previzualizare (lyrics)">
          <div className="ms-prev-bar">
            <span className="ms-prev-status">
              {saveErr ? <span className="ms-prev-err">{saveErr}</span>
                : dirty ? <><PencilSimple size={13} weight="bold" aria-hidden /> Modificări nesalvate</>
                : hasTemp ? <><Check size={13} weight="bold" aria-hidden /> Salvat temporar · originalul neatins</>
                : <>Previzualizare — cum va arăta pe foaie</>}
            </span>
            <div className="ms-prev-acts">
              {hasTemp && (
                <button className="ms-link" onClick={deleteTemporary} disabled={saving} title="Șterge editarea temporară și revino la melodia originală">Șterge editarea</button>
              )}
              <button className="ms-btn ms-btn-primary" onClick={saveTemporaryFromBar} disabled={!canEdit || mode !== "single" || !snapshot || !dirty || saving}>
                <FloppyDisk size={15} weight="bold" /> {saving ? "Se salvează…" : "Salvează"}
              </button>
              {!isMashup && consumed.length === 0 && (
                <button className="ms-btn" onClick={openReplace} disabled={!canReplace || saving} title="Suprascrie definitiv aranjamentul din bibliotecă">
                  <ArrowsClockwise size={15} weight="bold" /> Replace
                </button>
              )}
              <button className="ms-btn" onClick={openSaveAsNew} disabled={!canEdit || !snapshot || (!hasTemp && !dirty) || saving} title="Creează o melodie nouă sau un aranjament nou în bibliotecă">
                <Plus size={15} weight="bold" /> Save as new
              </button>
            </div>
          </div>
          <div className="ms-prev-scroll">
            <div className="ms-prev-sheet" style={{ zoom }}>
              <div className="ms-prev-hdr">
                <div className="ms-prev-title">{title || "Melodie"}{showMeta && <span className="ms-prev-key"> [Lyrics, {snapshot?.bpm || "—"} bpm, {snapshot?.meter || "4/4"}]</span>}</div>
                {showMeta && topSeqText && <div className="ms-prev-seq">{topSeqText}</div>}
              </div>
              <div className="ms-prev-doc">
                {previewItems.length === 0 ? (
                  <div className="ms-prev-empty">Nimic de previzualizat încă.</div>
                ) : previewItems.map((it) => (
                  it.type === "h" ? (
                    (it.simplified || !showMeta) ? (
                      <div key={it.id} className="ms-prev-trans"><ArrowElbowDownRight size={14} weight="duotone" aria-hidden /> {it.title}</div>
                    ) : (
                      <div key={it.id} className="ms-prev-songhdr">
                        <div className="ms-prev-title"><ArrowElbowDownRight size={15} weight="duotone" aria-hidden /> {it.title}<span className="ms-prev-key"> [Lyrics, {it.bpm || "—"} bpm, {it.meter || "4/4"}]</span></div>
                        {it.seq && <div className="ms-prev-seq">{it.seq}</div>}
                      </div>
                    )
                  ) : (
                    <div key={it.id} className="ms-prev-sec">
                      <div className="ms-prev-lbl">{it.label}</div>
                      {it.lines.length
                        ? it.lines.map((ln, i) => <div key={i} className="ms-prev-line">{ln || " "}</div>)
                        : <div className="ms-prev-line ms-prev-dim">(instrumental)</div>}
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Bara de jos: prompt AI (stil Claude) — scrii o comandă, AI-ul propune modificările ── */}
      <footer className="ms-promptbar">
        {canEdit && (aiBusy || aiMsg || aiProposals.length > 0) && (
          <div className="ms-pop">
            {!aiBusy && <button className="ms-pop-x" onClick={dismissAi} aria-label="Închide" title="Închide"><X size={14} weight="bold" /></button>}
            {aiBusy && <p className="ms-pop-note">AI-ul analizează…</p>}
            {aiMsg && <div className="ms-pop-msg">{aiMsg}</div>}
            {aiProposals.length > 0 && (
              <div className="ms-props">
                <div className="ms-props-h">
                  <span>Propuneri — confirmă ce vrei aplicat</span>
                  {aiProposals.length > 1 && <button className="ms-props-all" onClick={applyAllProposals}><Check size={12} weight="bold" /> Aplică toate</button>}
                </div>
                {aiProposals.map((pa, i) => {
                  const args = pa.args && Object.keys(pa.args).length ? Object.entries(pa.args).map(([k, v]) => `${k}: ${v}`).join(" · ") : "";
                  const r = rated[i];
                  return (
                    <div key={i} className="ms-prop-wrap">
                      <div className="ms-prop">
                        <span className="ms-prop-lbl">{pa.label || `${pa.surfaceId}.${pa.actionId}`}{args && <span className="ms-prop-args">{args}</span>}</span>
                        <div className="ms-prop-fb" role="group" aria-label="Feedback AI">
                          <button className={`ms-fb ${r === "up" ? "on up" : ""}`} onClick={() => rateUp(pa, i)} disabled={!!r} title="Bun — învață din asta"><ThumbsUp size={14} weight={r === "up" ? "fill" : "regular"} /></button>
                          <button className={`ms-fb ${r === "down" ? "on down" : ""}`} onClick={() => openDown(i)} disabled={!!r} title="Greșit — spune de ce"><ThumbsDown size={14} weight={r === "down" ? "fill" : "regular"} /></button>
                        </div>
                        <button className="ms-prop-ok" onClick={() => applyProposal(pa)}><Check size={13} weight="bold" /> Aplică</button>
                      </div>
                      {noteOpen === i && (
                        <div className="ms-fb-note">
                          <input className="ms-fb-input" value={noteText} autoFocus placeholder="De ce e greșit? (opțional)"
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveDown(pa, i); if (e.key === "Escape") setNoteOpen(null); }} />
                          <button className="ms-fb-save" onClick={() => saveDown(pa, i)}>Salvează</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="ms-composer">
          <textarea
            ref={aiTaRef} className="ms-composer-ta" value={aiText} rows={1}
            placeholder={canEdit ? "Cere o schimbare… (ex. mută refrenul înainte de bridge)" : "Doar vizualizare"}
            onChange={(e) => { setAiText(e.target.value); growTa(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAi(); } }}
            disabled={aiBusy || !canEdit} aria-label="Comandă pentru AI"
          />
          <button className="ms-composer-send" onClick={sendAi} disabled={aiBusy || !canEdit || !aiText.trim()} aria-label="Trimite comanda"><ArrowUp size={16} weight="bold" /></button>
        </div>
      </footer>

      {/* ── Modal: închidere cu modificări nesalvate (D13) ── */}
      {confirmClose && (
        <div className="ms-modal" role="dialog" aria-modal="true" aria-label="Modificări nesalvate">
          <div className="ms-modal-back" onClick={() => setConfirmClose(false)} />
          <div className="ms-modal-card">
            <h2 className="ms-modal-t">Ai modificări nesalvate</h2>
            <p className="ms-modal-p">Vrei să salvezi versiunea temporară înainte să închizi? Dacă renunți, modificările se pierd și melodia rămâne ca înainte.</p>
            {saveErr && <p className="ms-modal-err">{saveErr}</p>}
            <div className="ms-modal-btns">
              <button className="ms-btn ms-btn-primary" onClick={saveThenClose} disabled={saving}><FloppyDisk size={15} weight="bold" /> {saving ? "Se salvează…" : "Salvează"}</button>
              <button className="ms-btn" onClick={discardAndClose} disabled={saving}>Renunță</button>
              <button className="ms-link" onClick={() => setConfirmClose(false)} disabled={saving}>Rămâi aici</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmare după salvarea temporară (D3) ── */}
      {savedModal && (
        <div className="ms-modal" role="dialog" aria-modal="true" aria-label="Salvat temporar">
          <div className="ms-modal-back" onClick={() => setSavedModal(false)} />
          <div className="ms-modal-card">
            <span className="ms-modal-ic"><Check size={22} weight="bold" /></span>
            <h2 className="ms-modal-t">Salvat temporar</h2>
            <p className="ms-modal-p">Versiunea editată a fost salvată <b>doar pe acest plan</b>. Apare în Order, Rehearse și pe foaia de producție. Melodia originală din bibliotecă rămâne neatinsă.</p>
            {voicesReset && <p className="ms-modal-note"><Warning size={15} weight="fill" aria-hidden /> <span>Vocile (lead / suport / alto…) au fost <b>resetate</b> pe acest element — pune-le din nou în Order pentru piesa combinată.</span></p>}
            <div className="ms-modal-btns">
              <button className="ms-btn ms-btn-primary" onClick={() => { setSavedModal(false); close(); }}>Închide editorul</button>
              <button className="ms-btn" onClick={() => setSavedModal(false)}>Rămâi în editor</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: REPLACE & SAVE (type-to-confirm, ireversibil) ── */}
      {replaceOpen && (
        <div className="ms-modal" role="dialog" aria-modal="true" aria-label="Replace & Save">
          <div className="ms-modal-back" onClick={() => !replacing && setReplaceOpen(false)} />
          <div className="ms-modal-card">
            <span className="ms-modal-ic warn"><Warning size={22} weight="fill" /></span>
            <h2 className="ms-modal-t">Suprascrii definitiv în bibliotecă</h2>
            <p className="ms-modal-p">
              Asta scrie secvența și versurile/acordurile editate <b>peste aranjamentul din biblioteca Songs</b>.
              Se vede în <b>toate</b> planurile viitoare care folosesc melodia. <b>Nu se poate anula.</b>
            </p>
            <div className="ms-rep-song">
              <span className="ms-rep-k">Scrie exact titlul ca să confirmi</span>
              <div className="ms-rep-copy">
                <b className="ms-rep-title">{origTitle || "—"}</b>
                <button type="button" className="ms-rep-copybtn" title="Copiază titlul"
                  onClick={() => { try { navigator.clipboard?.writeText(origTitle); } catch { /* noop */ } }}>
                  <CopySimple size={15} weight="bold" />
                </button>
              </div>
            </div>
            <input className="ms-rep-input" value={replaceConfirm} onChange={(e) => setReplaceConfirm(e.target.value)}
              placeholder="Titlul melodiei…" autoFocus disabled={replacing}
              onKeyDown={(e) => { if (e.key === "Enter" && replaceMatch && !replacing) doReplace(); }} />
            <label className="ms-rep-new">
              <span className="ms-rep-k">Nume nou (opțional — e aceeași melodie)</span>
              <input className="ms-rep-input" value={replaceNewTitle} onChange={(e) => setReplaceNewTitle(e.target.value)}
                placeholder="Lasă gol ca să păstrezi titlul" disabled={replacing} />
            </label>
            {replaceErr && <p className="ms-modal-err">{replaceErr}</p>}
            <div className="ms-modal-btns">
              <button className="ms-btn ms-btn-danger" onClick={doReplace} disabled={!replaceMatch || replacing}>
                <ArrowsClockwise size={15} weight="bold" /> {replacing ? "Se scrie…" : "Suprascrie definitiv"}
              </button>
              <button className="ms-link" onClick={() => setReplaceOpen(false)} disabled={replacing}>Anulează</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: succes după Replace ── */}
      {replaceDone && (
        <div className="ms-modal" role="dialog" aria-modal="true" aria-label="Suprascris în bibliotecă">
          <div className="ms-modal-back" onClick={() => { setReplaceDone(false); close(); }} />
          <div className="ms-modal-card">
            <span className="ms-modal-ic"><Check size={22} weight="bold" /></span>
            <h2 className="ms-modal-t">Suprascris în bibliotecă</h2>
            <p className="ms-modal-p">Aranjamentul din biblioteca Songs a fost actualizat. Melodia de pe acest plan folosește acum versiunea salvată — fără clonă temporară.</p>
            <div className="ms-modal-btns">
              <button className="ms-btn ms-btn-primary" onClick={() => { setReplaceDone(false); close(); }}>Închide editorul</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: SAVE AS NEW (melodie nouă / aranjament nou) ── */}
      {sanOpen && (
        <div className="ms-modal" role="dialog" aria-modal="true" aria-label="Save as new">
          <div className="ms-modal-back" onClick={() => !sanSaving && setSanOpen(false)} />
          <div className="ms-modal-card">
            <span className="ms-modal-ic"><Plus size={22} weight="bold" /></span>
            <h2 className="ms-modal-t">Salvează ca nou</h2>
            <p className="ms-modal-p">Creezi ceva nou în biblioteca Songs din versiunea editată. Originalul rămâne neatins; editul de pe acest plan rămâne și el.</p>
            <div className="ms-san-seg" role="tablist">
              <button role="tab" aria-selected={sanMode === "song"} className={`ms-san-tab ${sanMode === "song" ? "on" : ""}`} onClick={() => setSanMode("song")} disabled={sanSaving}>
                <MusicNotes size={15} weight={sanMode === "song" ? "fill" : "regular"} /> Melodie nouă
              </button>
              <button role="tab" aria-selected={sanMode === "arrangement"} className={`ms-san-tab ${sanMode === "arrangement" ? "on" : ""}`} onClick={() => setSanMode("arrangement")} disabled={sanSaving}>
                <GitBranch size={15} weight={sanMode === "arrangement" ? "fill" : "regular"} /> Aranjament nou
              </button>
            </div>
            <p className="ms-san-expl">
              {sanMode === "song"
                ? "O melodie de sine stătătoare (cu aranjamentul, gamele și fișierele copiate din original)."
                : "Un aranjament în plus sub o melodie existentă (apare lângă celelalte aranjamente ale ei)."}
            </p>
            <label className="ms-rep-new">
              <span className="ms-rep-k">{sanMode === "song" ? "Titlul melodiei noi" : "Numele aranjamentului nou"}</span>
              <input className="ms-rep-input" value={sanTitle} onChange={(e) => setSanTitle(e.target.value)} autoFocus disabled={sanSaving}
                placeholder={sanMode === "song" ? "Titlu melodie…" : "ex. Acoustic, Mashup…"}
                onKeyDown={(e) => { if (e.key === "Enter" && !sanSaving) doSaveAsNew(); }} />
            </label>
            {sanMode === "arrangement" && isMashup && (
              <div className="ms-san-targets">
                <span className="ms-rep-k">Care melodii-sursă primesc aranjamentul nou</span>
                {(snapshot?.sources || []).map((s) => {
                  const sid = String(s.songId);
                  const on = sanTargets.includes(sid);
                  return (
                    <label key={sid} className="ms-san-chk">
                      <input type="checkbox" checked={on} onChange={() => toggleSanTarget(sid)} disabled={sanSaving || !s.songId || sid === "null"} />
                      <span>{s.title || "Melodie"}{s.keyName ? ` · ${s.keyName}` : ""}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {sanErr && <p className="ms-modal-err">{sanErr}</p>}
            <div className="ms-modal-btns">
              <button className="ms-btn ms-btn-primary" onClick={doSaveAsNew} disabled={sanSaving || !sanTitle.trim()}>
                <Plus size={15} weight="bold" /> {sanSaving ? "Se creează…" : "Creează"}
              </button>
              <button className="ms-link" onClick={() => setSanOpen(false)} disabled={sanSaving}>Anulează</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: succes după Save as new ── */}
      {sanDone && (
        <div className="ms-modal" role="dialog" aria-modal="true" aria-label="Creat în bibliotecă">
          <div className="ms-modal-back" onClick={() => setSanDone(null)} />
          <div className="ms-modal-card">
            <span className="ms-modal-ic"><Check size={22} weight="bold" /></span>
            <h2 className="ms-modal-t">Creat în bibliotecă</h2>
            {sanDone.mode === "song" ? (
              <p className="ms-modal-p">Melodia nouă <b>{sanDone.title}</b> a fost creată în biblioteca Songs, cu aranjamentul, gamele și fișierele copiate. Melodia de pe acest plan rămâne neschimbată.</p>
            ) : (
              <p className="ms-modal-p">
                Aranjament{(sanDone.created || []).length > 1 ? "e" : "ul"} nou creat{(sanDone.created || []).length > 1 ? "e" : ""}:{" "}
                <b>{(sanDone.created || []).map((c) => c.name).join(", ") || sanDone.title}</b>. Apar sub melodiile existente; editul de pe plan rămâne.
              </p>
            )}
            <div className="ms-modal-btns">
              <button className="ms-btn ms-btn-primary" onClick={() => setSanDone(null)}>Am înțeles</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Transition next song (mashup) ── */}
      {transitionOpen && (
        <div className="ms-modal" role="dialog" aria-modal="true" aria-label="Transition next song">
          <div className="ms-modal-back" onClick={() => setTransitionOpen(false)} />
          <div className="ms-modal-card">
            <span className="ms-modal-ic"><ArrowBendDownRight size={20} weight="bold" /></span>
            <h2 className="ms-modal-t">Transition next song</h2>
            {transErr && <p className="ms-modal-err">{transErr}</p>}
            {nextSong ? (
              <>
                <p className="ms-modal-p">Unești melodia următoare din Order — <b>{nextSong.title}</b> — în melodia asta. Ea dispare din Order (o poți reface cu „Șterge editarea"). Alege tipul de tranziție:</p>
                <div className="ms-trans-list">
                  {presets.map((p) => (
                    <button key={p.id} className="ms-trans-opt" onClick={() => bringNext(p.label)} disabled={bringing}>
                      <span className="ms-trans-lbl">{p.label}</span>
                      {p.note && <span className="ms-trans-note">{p.note}</span>}
                    </button>
                  ))}
                  <button className="ms-trans-opt" onClick={() => bringNext("")} disabled={bringing}>
                    <span className="ms-trans-lbl">Fără etichetă</span>
                    <span className="ms-trans-note">Doar unește melodiile, fără tip.</span>
                  </button>
                </div>
              </>
            ) : !transErr ? (
              <p className="ms-modal-p">Nu există o melodie următoare în Order pe care s-o unești aici.</p>
            ) : null}
            <div className="ms-modal-btns">
              <button className="ms-btn" onClick={() => setTransitionOpen(false)} disabled={bringing}>{bringing ? "Se unește…" : "Închide"}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ms { position: fixed; inset: 0; z-index: 60; background: var(--bg); color: var(--text);
              display: flex; flex-direction: column; animation: ms-in .18s ease; }
        @keyframes ms-in { from { opacity: 0; transform: scale(.995); } to { opacity: 1; transform: none; } }

        .ms-top { display: flex; align-items: center; justify-content: space-between; gap: 16px;
                  padding: 14px 20px; border-bottom: 1px solid var(--border); background: var(--bg-header); }
        .ms-id { display: flex; align-items: center; gap: 11px; min-width: 0; }
        /* Badge brand = pătrat rotunjit cu tentă primară + icon duotone (profunzime premium). */
        .ms-badge { width: 36px; height: 36px; flex: none; border-radius: 10px; color: #6fb0ff;
                    background: linear-gradient(160deg, rgba(47,129,247,.20), rgba(47,129,247,.08));
                    border: 1px solid rgba(47,129,247,.32); display: inline-flex; align-items: center; justify-content: center;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.2); }
        .ms-titles { display: flex; flex-direction: column; min-width: 0; margin-right: 4px; }
        .ms-kicker { color: var(--text-faint); font-size: 10px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase; }
        .ms-title { margin: 1px 0 0; font-size: 16.5px; font-weight: 800; letter-spacing: -.2px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ms-meta { display: flex; align-items: center; gap: 8px; flex: none; }
        /* Control segmentat (undo/redo, zoom) — un singur container, premium. */
        .ms-seg { display: inline-flex; align-items: center; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 2px; gap: 2px; }
        .ms-seg-b { height: 30px; min-width: 30px; padding: 0 6px; border: none; background: transparent; border-radius: 8px;
                    color: var(--text-dim); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .13s ease; font-size: 12px; font-weight: 700; }
        .ms-seg-b:hover:not(:disabled) { color: var(--text); background: var(--surface); }
        .ms-seg-b:disabled { opacity: .3; cursor: default; }
        .ms-seg-b:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
        .ms-seg-val { min-width: 46px; font-variant-numeric: tabular-nums; color: var(--text-dim); letter-spacing: .2px; }
        .ms-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--text-dim);
                   background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 4px 10px; }
        .ms-chip-soft { font-variant-numeric: tabular-nums; }
        .ms-chip.ms-key { color: #cfe9b8; background: rgba(111,160,46,.16); border-color: rgba(111,160,46,.42); font-weight: 800; letter-spacing: .3px; }
        .ms-chip.ms-mash { color: #a9c7ff; background: rgba(47,129,247,.14); border-color: rgba(47,129,247,.34); text-transform: uppercase; letter-spacing: .5px; font-size: 10.5px; }
        .ms-x { width: 34px; height: 34px; flex: none; border-radius: 9px; background: var(--surface-2);
                border: 1px solid var(--border); color: var(--text-dim); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all .18s ease; }
        .ms-x:hover { color: var(--danger); border-color: var(--danger); background: rgba(224,86,76,.1); }
        .ms-x:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

        .ms-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 0; }
        /* Canvasul de editare = „foaia" albă (ca PDF-ul final), pe un pupitru neutru.
           Tokenii de hârtie (--pg-*) sunt definiți aici și moșteniți de carduri (Block/MashupHeader).
           Rămâne luminos indiferent de tema aplicației — e documentul, nu cromul. */
        .ms-editor { min-width: 0; overflow: auto; padding: 26px clamp(16px, 4vw, 48px);
                     background: #e9ebef;
                     --pg: #ffffff; --pg-head: #e6e6e6; --pg-sec: #2f343c;
                     --pg-ink: #15181c; --pg-tx: #2b2b2b; --pg-dim: #5a6069; --pg-faint: #8a8f98;
                     --pg-line: #e2e5ea; --pg-line-2: #d3d7dd; --pg-soft: #f4f5f7; --pg-key: #6fa02e; }
        .ms-page { max-width: 740px; margin: 0 auto; background: var(--pg); border: 1px solid #d8dadd;
                   border-radius: 3px; box-shadow: 0 1px 2px rgba(16,20,26,.04), 0 6px 20px rgba(16,20,26,.05); overflow: hidden; }
        /* Loading „pe foaie": bare gri-deschis cu shimmer potrivit pe alb (nu închis/urât). */
        .ms-skel { padding: 0; }
        .ms-skel-head { display: flex; align-items: center; gap: 10px; background: var(--pg-head); border-bottom: 1px solid #d8dadd; padding: 14px 16px; }
        .ms-skel-chip { width: 160px; height: 16px; border-radius: 5px; background: #d7dade; position: relative; overflow: hidden; }
        .ms-skel-chip.sk-sm { width: 54px; }
        .ms-skel-chip::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); animation: ms-shimmer 1.3s infinite; }
        .ms-skel-body { padding: 20px 20px 26px; }
        .ms-skel-body :global(.pc-sk-line), .ms-skel-body :global(.pc-sk-circle) { background: #edeff2; }
        .ms-skel-body :global(.pc-sk-line)::after, .ms-skel-body :global(.pc-sk-circle)::after { background: linear-gradient(90deg, transparent, rgba(0,0,0,.045), transparent); }
        @keyframes ms-shimmer { 100% { transform: translateX(100%); } }
        .ms-doc { display: flex; flex-direction: column; gap: 5px; background: var(--pg-head);
                  border-bottom: 1px solid #d8dadd; padding: 12px 16px 13px; }
        .ms-doc-row { display: flex; align-items: center; gap: 10px; }
        .ms-doc-ic { color: var(--pg-dim); display: inline-flex; flex: none; }
        .ms-doc-t { flex: 0 1 auto; min-width: 0; font-weight: 800; font-size: 15.5px; color: var(--pg-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ms-doc-k { flex: none; background: var(--pg-key); color: #fff; border-radius: 3px; padding: 2px 10px; font-weight: 700; font-size: 12.5px; }
        .ms-doc-m { flex: none; font-size: 12px; font-weight: 700; color: var(--pg-dim); }
        .ms-doc-seq { padding-left: 27px; font-size: 12px; line-height: 1.5; color: var(--pg-dim); font-weight: 600; }
        .ms-sheet { padding: 16px 16px 20px; }
        .ms-pad { max-width: 740px; margin: 0 auto; background: var(--pg); border: 1px solid var(--pg-line-2); border-radius: 10px; padding: 22px; }
        .ms-blocks { margin: 0; display: flex; flex-direction: column; gap: 12px; }
        /* Toggle „Detalii / Doar titlu" pe foaie (ascunde secvență+BPM+metru, păstrează titlu+gamă). */
        .ms-doc-eye { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 9px; border-radius: 7px;
                      background: #fff; border: 1px solid var(--pg-line-2, #d3d7dd); color: var(--pg-dim, #5a6069); font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all .14s ease; }
        .ms-doc-eye:hover { color: var(--pg-ink, #15181c); border-color: #b9bec6; }
        .ms-doc-eye[aria-pressed="true"] { color: #2f6fe0; border-color: rgba(47,111,224,.4); background: rgba(47,111,224,.08); }
        .ms-emptyadd { margin-top: 4px; display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 16px; border-radius: 9px;
                       background: var(--pg-sec, #2f343c); border: 1px solid var(--pg-sec, #2f343c); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s ease; }
        .ms-emptyadd:hover { filter: brightness(1.12); }
        /* „Adaugă melodia următoare" = acțiune SUB foaie (pe pupitru), centrată → se citește că vine o melodie nouă. */
        .ms-nextsong { max-width: 740px; margin: 16px auto 4px; display: flex; justify-content: center; }
        .ms-nextsong-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; padding: 0 20px; border-radius: 999px;
                           background: var(--pg-sec, #2f343c); border: 1px solid var(--pg-sec, #2f343c); color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer;
                           box-shadow: 0 2px 10px rgba(16,20,26,.16); transition: all .16s ease; }
        .ms-nextsong-btn:hover { filter: brightness(1.12); box-shadow: 0 4px 16px rgba(16,20,26,.22); transform: translateY(-1px); }
        .ms-nextsong-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        /* DragOverlay = cardul curat care se mișcă (mărime fixă → zero resize/flicker). */
        .ms-ghost { background: #fff; border: 1px solid #aeb4bd; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px;
                    box-shadow: 0 18px 40px rgba(16,20,26,.26); cursor: grabbing; }
        .ms-ghost-lbl { font-size: 11px; font-weight: 800; letter-spacing: .3px; color: var(--pg-ink, #15181c); text-transform: uppercase; }
        .ms-ghost-sub { font-size: 12px; color: var(--pg-faint, #8a8f98); }
        .ms-ghost-h { flex-direction: row; align-items: center; gap: 8px; background: var(--pg-head, #e6e6e6); color: var(--pg-ink, #15181c); font-size: 14px; font-weight: 800; }
        .ms-ghost-h :global(svg) { color: #0e8f82; flex: none; }
        .ms-trans-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
        .ms-trans-opt { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; text-align: left;
                        padding: 10px 12px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); cursor: pointer; transition: all .15s ease; }
        .ms-trans-opt:hover:not(:disabled) { border-color: var(--border-strong); background: var(--surface-3); }
        .ms-trans-opt:disabled { opacity: .5; cursor: not-allowed; }
        .ms-trans-opt:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
        .ms-trans-lbl { color: var(--text); font-size: 13.5px; font-weight: 700; }
        .ms-trans-note { color: var(--text-faint); font-size: 12px; }

        .ms-state { max-width: 560px; margin: 40px auto; text-align: center; color: var(--pg-dim); font-size: 14px; line-height: 1.6;
                    display: flex; flex-direction: column; align-items: center; gap: 12px;
                    background: var(--pg); border: 1px solid var(--pg-line); border-radius: 12px; padding: 34px 30px; }
        .ms-state :global(svg) { color: var(--pg-faint); }
        .ms-state :global(b) { color: var(--pg-ink); }
        .ms-err { color: #b3261e; background: #fdf3f2; border-color: #f3c9c4; }

        /* ── Preview LIVE (dreapta) = „foaia" finală, identic cu „Lyrics" din Songs (monospace, fără acorduri). ── */
        .ms-preview { border-left: 1px solid var(--border); background: var(--bg); display: flex; flex-direction: column; min-height: 0; }
        .ms-prev-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
                       padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--bg-header); }
        .ms-prev-status { display: inline-flex; align-items: center; gap: 6px; color: var(--text-faint); font-size: 12px; }
        .ms-prev-err { color: #f0a7a2; }
        .ms-prev-acts { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ms-prev-scroll { flex: 1; min-height: 0; overflow: auto; padding: 20px; background: #e9ebef; display: flex; justify-content: center; }
        .ms-prev-sheet { width: 100%; max-width: 640px; height: max-content; background: #fff; color: #111;
                         border: 1px solid #d8dadd; border-radius: 3px; box-shadow: 0 1px 2px rgba(16,20,26,.04), 0 6px 20px rgba(16,20,26,.06); padding: 22px 24px 32px; }
        .ms-prev-hdr { background: #e6e6e6; border: 1px solid #d8dadd; border-radius: 2px; padding: 12px 14px; margin-bottom: 16px; }
        .ms-prev-title { font-size: 17px; font-weight: 800; color: #15181c; line-height: 1.3; }
        .ms-prev-key { font-weight: 700; font-size: 13px; }
        .ms-prev-seq { font-weight: 700; margin-top: 6px; font-size: 12.5px; color: #2b2b2b; }
        .ms-prev-doc { font-family: "PcMono", "Courier New", monospace; }
        .ms-prev-sec { margin-bottom: 16px; }
        .ms-prev-sec:last-child { margin-bottom: 0; }
        .ms-prev-lbl { font-weight: 900; font-size: 13px; letter-spacing: .4px; color: #15181c; margin-bottom: 5px; }
        .ms-prev-line { font-size: 13.5px; line-height: 1.5; color: #222; white-space: pre-wrap; }
        .ms-prev-dim { color: #8a8f98; font-style: italic; }
        .ms-prev-trans { display: flex; align-items: center; gap: 6px; font-family: inherit; font-size: 12.5px; font-weight: 800; color: #3a3f47; background: #e6e6e6;
                         border: 1px solid #d3d5d8; border-radius: 5px; padding: 7px 11px; margin: 0 0 16px; }
        /* Header COMPLET pt. melodia adusă în tranziție (identic cu cel de sus al melodiei #1). */
        .ms-prev-songhdr { background: #e6e6e6; border: 1px solid #d8dadd; border-radius: 2px; padding: 12px 14px; margin: 6px 0 16px; }
        .ms-prev-songhdr .ms-prev-title { display: flex; align-items: center; gap: 7px; }
        .ms-prev-songhdr :global(svg) { color: #0e8f82; flex: none; }
        .ms-prev-empty { color: #8a8f98; font-size: 13px; text-align: center; padding: 30px 0; }
        .ms-props { display: flex; flex-direction: column; gap: 7px; animation: ms-fade .18s ease; }
        .ms-props-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-faint); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
        .ms-props-all { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 11px; font-weight: 700; letter-spacing: .3px; cursor: pointer; }
        .ms-props-all:hover { color: var(--text); border-color: var(--text-faint); }
        .ms-prop { display: flex; align-items: center; gap: 9px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; padding: 8px 10px; }
        .ms-prop-lbl { color: var(--text-dim); font-size: 12.5px; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .ms-prop-args { color: var(--text-faint); font-size: 11px; font-variant-numeric: tabular-nums; }
        .ms-prop-ok { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 11px; border-radius: 7px; background: var(--primary); border: 1px solid var(--primary); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
        .ms-prop-wrap { display: flex; flex-direction: column; gap: 6px; }
        .ms-prop-fb { display: inline-flex; gap: 3px; flex: none; }
        .ms-fb { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: transparent; border: 1px solid var(--border); color: var(--text-faint); cursor: pointer; transition: all .15s ease; }
        .ms-fb:hover:not(:disabled) { color: var(--text); border-color: var(--text-faint); }
        .ms-fb:disabled { cursor: default; opacity: .9; }
        .ms-fb.on.up { color: var(--product); border-color: var(--product); }
        .ms-fb.on.down { color: var(--danger); border-color: var(--danger); }
        .ms-fb-note { display: flex; gap: 6px; }
        .ms-fb-input { flex: 1; min-width: 0; height: 30px; padding: 0 10px; border-radius: 7px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); font-size: 12.5px; }
        .ms-fb-input:focus { outline: none; border-color: var(--primary); }
        .ms-fb-save { flex: none; height: 30px; padding: 0 11px; border-radius: 7px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 12px; font-weight: 600; cursor: pointer; }
        .ms-fb-save:hover { color: var(--text); border-color: var(--text-faint); }
        /* ── Bara de jos: prompt AI (stil Claude) ── */
        .ms-promptbar { border-top: 1px solid var(--border); background: var(--bg-header); padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
        .ms-pop { position: relative; width: 100%; max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; max-height: 40vh; overflow: auto; animation: ms-fade .16s ease; padding-right: 2px; }
        .ms-pop-x { position: absolute; top: 2px; right: 2px; z-index: 2; width: 26px; height: 26px; border-radius: 7px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s ease; }
        .ms-pop-x:hover { color: var(--text); border-color: var(--border-strong); }
        .ms-pop-note { color: var(--text-dim); font-size: 12.5px; margin: 0; padding-right: 30px; }
        .ms-pop-msg { color: var(--text); font-size: 13px; line-height: 1.6; white-space: pre-wrap; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 11px 34px 11px 13px; }
        .ms-composer { width: 100%; max-width: 760px; margin: 0 auto; display: flex; align-items: flex-end; gap: 8px;
                       background: var(--surface); border: 1px solid var(--border-strong); border-radius: 16px; padding: 8px 8px 8px 14px; transition: border-color .15s ease; }
        .ms-composer:focus-within { border-color: var(--primary); }
        .ms-composer-ta { flex: 1; min-width: 0; border: none; background: transparent; resize: none; color: var(--text);
                          font-size: 14px; font-family: inherit; line-height: 1.5; padding: 7px 0; max-height: 150px; outline: none; }
        .ms-composer-ta::placeholder { color: var(--text-faint); }
        .ms-composer-ta:disabled { opacity: .6; cursor: not-allowed; }
        .ms-composer-send { flex: none; width: 34px; height: 34px; border-radius: 11px; background: var(--primary); border: none; color: #fff;
                            display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: filter .15s ease, transform .1s ease; }
        .ms-composer-send:hover:not(:disabled) { filter: brightness(1.08); }
        .ms-composer-send:active:not(:disabled) { transform: scale(.94); }
        .ms-composer-send:disabled { opacity: .35; cursor: not-allowed; }
        .ms-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 9px;
                  background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s ease; }
        .ms-btn:hover:not(:disabled) { color: var(--text); border-color: var(--text-faint); }
        .ms-btn:disabled { cursor: not-allowed; opacity: .5; }
        .ms-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        .ms-btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; }
        .ms-btn-primary:hover:not(:disabled) { color: #fff; filter: brightness(1.06); }
        .ms-link { background: none; border: none; color: var(--text-faint); font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 6px 8px; border-radius: 7px; }
        .ms-link:hover:not(:disabled) { color: var(--danger); }
        .ms-link:disabled { opacity: .5; cursor: not-allowed; }

        .ms-modal { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ms-modal-back { position: absolute; inset: 0; background: rgba(0,0,0,.5); animation: ms-fade .16s ease; }
        .ms-modal-card { position: relative; width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border-strong);
                         border-radius: 16px; padding: 22px; box-shadow: 0 24px 60px rgba(0,0,0,.4); animation: ms-pop .18s ease; text-align: left; }
        .ms-modal-ic { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 12px;
                       background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--product); margin-bottom: 12px; }
        .ms-modal-t { margin: 0 0 8px; font-size: 17px; font-weight: 700; color: var(--text); }
        .ms-modal-p { margin: 0 0 16px; font-size: 13.5px; line-height: 1.6; color: var(--text-dim); }
        .ms-modal-err { margin: -6px 0 14px; font-size: 12.5px; color: #f0a7a2; }
        .ms-modal-note { display: flex; align-items: flex-start; gap: 8px; margin: -4px 0 14px; padding: 9px 11px; border-radius: 10px;
                         font-size: 12.5px; line-height: 1.5; color: var(--text-dim);
                         background: color-mix(in srgb, #e0a84c 12%, var(--surface-2)); border: 1px solid color-mix(in srgb, #e0a84c 34%, var(--border)); }
        .ms-modal-note :global(svg) { color: #e0a84c; flex: none; margin-top: 1px; }
        .ms-modal-note b { color: var(--text); }
        .ms-modal-btns { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ms-modal-ic.warn { background: color-mix(in srgb, var(--danger) 14%, var(--surface-2)); border-color: color-mix(in srgb, var(--danger) 40%, var(--border-strong)); color: var(--danger); }
        .ms-btn-danger { background: var(--danger); border-color: var(--danger); color: #fff; }
        .ms-btn-danger:hover:not(:disabled) { color: #fff; filter: brightness(1.06); }
        /* Replace & Save — confirmare prin scrierea titlului */
        .ms-rep-song { margin: 0 0 6px; }
        .ms-rep-k { display: block; font-size: 11px; font-weight: 700; letter-spacing: .3px; text-transform: uppercase; color: var(--text-faint); margin-bottom: 5px; }
        .ms-rep-copy { display: flex; align-items: center; gap: 8px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; }
        .ms-rep-title { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ms-rep-copybtn { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 8px;
                          background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-dim); cursor: pointer; transition: all .15s ease; }
        .ms-rep-copybtn:hover { color: var(--text); border-color: var(--text-faint); }
        .ms-rep-input { width: 100%; height: 38px; margin-top: 8px; padding: 0 12px; border-radius: 10px; background: var(--surface-2);
                        border: 1px solid var(--border-strong); color: var(--text); font-size: 14px; font-weight: 600; }
        .ms-rep-input:focus { outline: none; border-color: var(--primary); }
        .ms-rep-input:disabled { opacity: .55; }
        .ms-rep-new { display: block; margin: 14px 0 16px; }
        .ms-rep-new .ms-rep-input { margin-top: 5px; font-weight: 500; }
        /* Save as new — segmented + ținte */
        .ms-san-seg { display: flex; gap: 6px; padding: 4px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 11px; margin: 2px 0 8px; }
        .ms-san-tab { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; border-radius: 8px;
                      background: transparent; border: none; color: var(--text-dim); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s ease; }
        .ms-san-tab:hover:not(:disabled) { color: var(--text); }
        .ms-san-tab.on { background: var(--primary); color: #fff; }
        .ms-san-tab:disabled { cursor: not-allowed; opacity: .6; }
        .ms-san-expl { margin: 0 0 12px; font-size: 12.5px; line-height: 1.5; color: var(--text-faint); }
        .ms-san-targets { display: flex; flex-direction: column; gap: 2px; margin: 0 0 14px; padding: 8px 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; }
        .ms-san-targets .ms-rep-k { margin-bottom: 7px; }
        .ms-san-chk { display: flex; align-items: center; gap: 9px; padding: 5px 2px; font-size: 13.5px; color: var(--text); cursor: pointer; }
        .ms-san-chk input { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }
        @keyframes ms-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ms-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }

        /* Focus vizibil pe ORICE control din editor (a11y — nu doar pe .ms-btn). */
        .ms :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 6px; }

        @media (max-width: 860px) {
          .ms-body { grid-template-columns: 1fr; grid-auto-rows: minmax(0, 1fr); }
          .ms-preview { border-left: none; border-top: 1px solid var(--border); }
        }
        /* Telefon: nimic nu iese din ecran — barele se împachetează, butoanele se întind. */
        @media (max-width: 520px) {
          .ms-top { padding: 10px 12px; gap: 10px; }
          .ms-meta { flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
          .ms-prev-bar { padding: 10px 12px; }
          .ms-prev-acts { width: 100%; flex-wrap: wrap; }
          .ms-prev-acts .ms-btn { flex: 1 1 auto; justify-content: center; }
          .ms-modal-card { max-width: 100%; }
          .ms-modal-btns { width: 100%; }
          .ms-modal-btns .ms-btn { flex: 1 1 auto; justify-content: center; }
        }
        /* Respectă preferința de mișcare redusă (a11y) — oprim animațiile ȘI tranzițiile. */
        @media (prefers-reduced-motion: reduce) {
          .ms, .ms * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}






