"use client";
/**
 * Order tab (web) — ordinea serviciului, IDENTIC PCO + editabil.
 * Coloane LENGTH | TITLE | ⋮. Section headers gri. Rând cântec/item cu badge gamă, voci/descriere,
 * lideri (avatare stivuite / punct „needed"), paperclip + nr. fișiere, accent rowColor.
 * Click pe rând → drawer „View item" (dreapta). Drag = reordonare. FAB „+" = adaugă.
 * Tranziții (indent + „!" + timp exclus) și medley (rând expandabil) randate din date (Faza 3/4).
 * Consumă aceleași rute /pc/v1 ca mobilul (plansApi). ZERO fork de logică.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { plansApi } from "@/lib/api/client";
import PersonAvatar from "@/components/plans/PersonAvatar";
import AddItemMenu from "./AddItemMenu";
import SongPickerModal from "./SongPickerModal";
import ItemDrawer from "./ItemDrawer";
import { formatVoices } from "./VoicesPicker";
import { keyToRo } from "@/lib/keyName";
import Skeleton from "@/components/ui/Skeleton";

// „Alte slujiri" pe rând: etichete scurte + prenume cu majuscule.
const MIN_LABEL = { host: "Gazdă", communion: "Cină", prayer: "Îndemn", preach: "Predică" };
const minFirst = (s) => String(s || "").trim().split(/[\s\-–—]+/)[0].toUpperCase();

function Clip({ n }) {
  if (!n) return null;
  return (
    <span className="clip" title={`${n} fișier(e)`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.34 3.34 0 0 1 4.72 4.72l-9.2 9.19a1.67 1.67 0 0 1-2.36-2.36l8.49-8.48" /></svg>
      {n}
    </span>
  );
}

export default function OrderTab({ planId, canEdit = false, onSideChange, flash }) {
  const [items, setItems] = useState(null);
  const [totalLabel, setTotalLabel] = useState("");
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);     // itemul deschis în drawer
  const [songPicker, setSongPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("songs"); // "songs" | "medley"
  const dragId = useRef(null);
  const [overId, setOverId] = useState(null);
  const [overEnd, setOverEnd] = useState(false);  // indicator „inserează la final"
  // Add-by-drag: tragi un tip din meniu și-l pui între itemi.
  const addKindRef = useRef(null);                // tipul nou în curs de tras din meniu
  const [dragging, setDragging] = useState(false); // vreun drag activ (reorder sau add)
  const addPickCtxRef = useRef(null);             // { index } pt. song/medley (după picker)
  // Auto-scroll când tragi aproape de marginea de sus/jos (ține cont de scroll-ul paginii).
  const autoScroll = useRef({ raf: 0, vy: 0 });

  const load = useCallback(async () => {
    try { const r = await plansApi.order(planId); setItems(r.items || []); setTotalLabel(r.totalLabel || ""); setErr(""); }
    catch (e) { setErr(e?.message || "Eroare la ordine."); setItems([]); }
  }, [planId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { onSideChange?.(!!openId); }, [openId, onSideChange]);
  useEffect(() => () => stopAutoScroll(), []); // cleanup la unmount

  const lastId = items && items.length ? items[items.length - 1].id : null;

  function stopAutoScroll() { autoScroll.current.vy = 0; if (autoScroll.current.raf) { cancelAnimationFrame(autoScroll.current.raf); autoScroll.current.raf = 0; } }
  function runAutoScroll() {
    const step = () => {
      const vy = autoScroll.current.vy;
      if (vy) { const el = document.scrollingElement || document.documentElement; el.scrollTop += vy; autoScroll.current.raf = requestAnimationFrame(step); }
      else { autoScroll.current.raf = 0; }
    };
    if (!autoScroll.current.raf) autoScroll.current.raf = requestAnimationFrame(step);
  }
  function autoScrollFromY(clientY) {
    const EDGE = 95, MAX = 24, h = window.innerHeight;
    let vy = 0;
    if (clientY < EDGE) vy = -Math.ceil(MAX * (EDGE - clientY) / EDGE);
    else if (clientY > h - EDGE) vy = Math.ceil(MAX * (clientY - (h - EDGE)) / EDGE);
    autoScroll.current.vy = vy;
    if (vy) runAutoScroll(); else stopAutoScroll();
  }
  function endDrag() { dragId.current = null; addKindRef.current = null; setDragging(false); setOverId(null); setOverEnd(false); stopAutoScroll(); }

  // Pornit de AddItemMenu când începe tragerea unui tip nou.
  const onTypeDragStart = (type) => { addKindRef.current = type; dragId.current = null; setDragging(true); };

  // Creează un item și-l plasează la indexul vizual `index` (reorder după creare → merge și la vârf).
  async function createAndPlace(payload, index, openAfter) {
    try {
      const base = items ? items.map((x) => x.id) : [];
      const r = await plansApi.addItem(planId, payload);
      if (r?.id) { const ids = [...base]; ids.splice(Math.max(0, Math.min(index, ids.length)), 0, r.id); await plansApi.reorderItems(planId, ids); }
      await load();
      if (openAfter && r?.id) setOpenId(r.id);
    } catch (e) { flash?.(e?.message || "Eroare la adăugare."); }
  }
  async function insertTypeAtIndex(type, index) {
    if (type === "song") { addPickCtxRef.current = { index }; setPickerMode("songs"); setSongPicker(true); return; }
    if (type === "medley") { addPickCtxRef.current = { index }; setPickerMode("medley"); setSongPicker(true); return; }
    if (type === "songEmpty") return createAndPlace({ type: "song", title: "Cântec" }, index, true);
    return createAndPlace({ type }, index, type !== "header");
  }

  async function addSimple(type) {
    try {
      const r = await plansApi.addItem(planId, { type, afterItemId: lastId || undefined });
      await load();
      if (type !== "header" && r?.id) setOpenId(r.id);
    } catch (e) { flash?.(e?.message || "Eroare la adăugare."); }
  }
  async function addEmptySong() {
    try {
      const r = await plansApi.addItem(planId, { type: "song", title: "Cântec", afterItemId: lastId || undefined });
      await load();
      if (r?.id) setOpenId(r.id); // deschide drawer-ul: pui vocile + legi muzica din tab-ul Song
    } catch (e) { flash?.(e?.message || "Eroare."); }
  }
  async function addSongs(songs) {
    setSongPicker(false);
    const ctx = addPickCtxRef.current; addPickCtxRef.current = null;
    const base = items ? items.map((x) => x.id) : [];
    let after = lastId;
    try {
      const createdIds = [];
      for (const s of songs) {
        const r = await plansApi.addItem(planId, { type: "song", songId: s.id, afterItemId: after || undefined });
        after = r?.id || after;
        if (r?.id) createdIds.push(r.id);
      }
      if (ctx && createdIds.length) { const ids = [...base]; ids.splice(Math.max(0, Math.min(ctx.index, ids.length)), 0, ...createdIds); await plansApi.reorderItems(planId, ids); }
      await load();
      if (songs.length === 1 && createdIds[0]) setOpenId(createdIds[0]);
    } catch (e) { flash?.(e?.message || "Eroare la adăugarea cântecelor."); }
  }
  async function addMedley(songs) {
    setSongPicker(false); setPickerMode("songs");
    const ctx = addPickCtxRef.current; addPickCtxRef.current = null;
    if (songs.length < 2) { flash?.("Alege cel puțin 2 cântece pentru medley."); return; }
    const base = items ? items.map((x) => x.id) : [];
    try {
      const r = await plansApi.createMedley(planId, { songIds: songs.map((s) => s.id), afterItemId: lastId || undefined });
      if (ctx && r?.id) { const ids = [...base]; ids.splice(Math.max(0, Math.min(ctx.index, ids.length)), 0, r.id); await plansApi.reorderItems(planId, ids); }
      await load();
      if (r?.id) setOpenId(r.id);
    } catch (e) { flash?.(e?.message || "Eroare la medley."); }
  }

  // Drop pe un rând: dacă tragi un tip nou → inserează înaintea acelui rând; altfel reordonează.
  function handleRowDrop(toId) {
    const ti = items ? items.findIndex((x) => String(x.id) === String(toId)) : -1;
    if (addKindRef.current) { const type = addKindRef.current; endDrag(); insertTypeAtIndex(type, ti < 0 ? (items ? items.length : 0) : ti); return; }
    onDrop(toId);
  }
  // Drop în zona de final (sub ultimul rând) → la coadă.
  function handleEndDrop() {
    if (addKindRef.current) { const type = addKindRef.current; endDrag(); insertTypeAtIndex(type, items ? items.length : 0); return; }
    if (dragId.current && items) { const fromId = dragId.current; endDrag(); const arr = [...items]; const fi = arr.findIndex((x) => String(x.id) === String(fromId)); if (fi < 0) return; const [m] = arr.splice(fi, 1); arr.push(m); setItems(arr); plansApi.reorderItems(planId, arr.map((x) => x.id)).then(() => flash?.("Reordonat.")).catch((e) => { flash?.(e?.message || "Eroare."); load(); }); }
  }

  function onDrop(toId) {
    const fromId = dragId.current; endDrag();
    if (!fromId || fromId === toId || !items) return;
    const arr = [...items];
    const fi = arr.findIndex((x) => String(x.id) === String(fromId));
    const ti = arr.findIndex((x) => String(x.id) === String(toId));
    if (fi < 0 || ti < 0 || fi === ti) return;
    const [m] = arr.splice(fi, 1); arr.splice(ti, 0, m);
    setItems(arr);
    plansApi.reorderItems(planId, arr.map((x) => x.id)).then(() => flash?.("Reordonat.")).catch((e) => { flash?.(e?.message || "Eroare."); load(); });
  }

  if (items === null) return <Skeleton lines={6} />;

  return (
    <div className="ord">
      {err && <div className="ord-err">{err}</div>}

      <div className="ord-toolbar">
        <div className="ord-cols"><span className="c-len">LENGTH</span><span className="c-title">TITLE</span></div>
        {canEdit && <AddItemMenu onAdd={addSimple} onAddSong={() => { setPickerMode("songs"); setSongPicker(true); }} onAddEmptySong={addEmptySong} onAddMedley={() => { setPickerMode("medley"); setSongPicker(true); }} onTypeDragStart={onTypeDragStart} onTypeDragEnd={endDrag} />}
      </div>

      {!items.length ? (
        <div
          className={`ord-empty ${dragging ? "drop" : ""} ${overEnd ? "over" : ""}`}
          onDragOver={(e) => { if (addKindRef.current) { e.preventDefault(); if (!overEnd) setOverEnd(true); } }}
          onDragLeave={() => setOverEnd(false)}
          onDrop={handleEndDrop}
        >
          <div className="oe-t">{dragging ? "Lasă aici ca să adaugi primul item" : "Niciun item în ordinea serviciului."}</div>
          {canEdit && !dragging && <div className="oe-s">Apasă „+ Adaugă" (sau trage un tip aici) ca să începi programul.</div>}
        </div>
      ) : (
        <div className="ord-list">
          {items.map((it) => {
            const isHeader = it.type === "header";
            const isMedley = it.type === "medley";
            const open = String(openId) === String(it.id);
            const over = String(overId) === String(it.id);
            const voiceLine = it.voices?.length ? formatVoices(it.voices) : "";
            const leadVoice = (it.voices || []).find((v) => v.role === "lead") || null;
            // Slujirile rezolvă persoana automat din Matrix (m.people) sau override. Pe rând: doar numele, fără prefix.
            const minPeople = (it.ministries || []).flatMap((m) => m.people || []);
            const ministryLine = (it.ministries || []).map((m) => (m.people || []).map((p) => minFirst(p.name)).join(", ")).filter(Boolean).join("  ||  ");
            // Tip „transition": gamă (badge + text), lumini (culori), rugăciune (avatar dreapta).
            const tr = it.type === "transition" ? (it.transition || {}) : null;
            // Avatarul = lead vocal SAU prima persoană de la o slujire SAU persoana de rugăciune (tranziție).
            const avatarPerson = leadVoice || minPeople[0] || (tr && tr.prayer) || null;
            return (
              <div
                key={it.id}
                className={`row ${isHeader ? "hdr" : ""} ${it.isTransition ? "trans" : ""} ${open ? "open" : ""} ${over ? "over" : ""}`}
                style={{ borderLeftColor: it.rowColor || "transparent" }}
                draggable={canEdit}
                onDragStart={(e) => { dragId.current = it.id; setDragging(true); try { e.dataTransfer.effectAllowed = "move"; } catch {} }}
                onDragEnd={endDrag}
                onDragOver={(e) => { if (dragId.current || addKindRef.current) { e.preventDefault(); if (String(overId) !== String(it.id)) setOverId(it.id); if (overEnd) setOverEnd(false); autoScrollFromY(e.clientY); } }}
                onDrop={() => handleRowDrop(it.id)}
                onClick={() => setOpenId(it.id)}
              >
                {isHeader ? (
                  <div className="hdr-t">{it.title}</div>
                ) : (
                  <>
                    <div className="r-len">{it.lengthLabel || ""}</div>
                    <div className="r-main">
                      <div className="r-titleline">
                        {it.isTransition && <span className="bang" title="Tranziție (timp neinclus)">!</span>}
                        {isMedley && <span className="mtag" title="Medley">medley · {it.medleyCount}</span>}
                        <span className="r-title">{it.title || "—"}</span>
                        {it.keyName && <span className={`r-key ${it.type === "media" ? "media" : ""}`}>{it.keyName}</span>}
                        {avatarPerson && <span className="r-leadav" title={avatarPerson.name}><PersonAvatar person={avatarPerson} size={33} /></span>}
                      </div>
                      {tr ? (
                        // Tranziție — ordine: tip (rugăciune/cuvânt) → descriere → gamă → lumini, fiecare pe rândul lui.
                        <>
                          {(tr.kind === "word" || (tr.kind === "prayer" && tr.prayer)) && (
                            <div className="r-trans-line tp">{tr.kind === "word" ? "Tranziție prin cuvânt" : `Tranziție rugăciune: ${tr.prayer.name}`}</div>
                          )}
                          {it.description && <div className="r-sub">{it.description}</div>}
                          {tr.key && <div className="r-trans-line">Gamă: <b>{keyToRo(tr.key)}</b> <span className="rt-sym">({tr.key})</span></div>}
                          {(tr.lights || []).length > 0 && (
                            <div className="r-trans-line rt-lights">Lumini:{tr.lights.map((l, i) => <span key={i} className="rt-dot" style={{ background: l.color || "#888" }} title={l.color} />)}</div>
                          )}
                        </>
                      ) : (
                        <>
                          {voiceLine && <div className="r-voices">{voiceLine}</div>}
                          {ministryLine && <div className="r-min">{ministryLine}</div>}
                          {it.description && <div className="r-sub">{it.description}</div>}
                        </>
                      )}
                    </div>
                    <div className="r-right">
                      {(it.leaders || []).slice(0, 3).map((l, i) => (
                        l.needed
                          ? <span key={i} className="need-dot" title={`${l.positionName} — neacoperit`}>1</span>
                          : <span key={i} className="lead-av" style={{ marginLeft: i ? -8 : 0 }} title={l.name}><PersonAvatar person={l} size={26} /></span>
                      ))}
                      <Clip n={it.fileCount} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {canEdit && (
            <div
              className={`end-drop ${dragging ? "show" : ""} ${overEnd ? "over" : ""}`}
              onDragOver={(e) => { if (dragId.current || addKindRef.current) { e.preventDefault(); if (!overEnd) setOverEnd(true); setOverId(null); autoScrollFromY(e.clientY); } }}
              onDragLeave={() => setOverEnd(false)}
              onDrop={handleEndDrop}
            >{dragging ? "Pune la final" : ""}</div>
          )}
          {totalLabel && (
            <div className="total-row">
              <div className="tr-len">{totalLabel}</div>
              <div className="tr-lbl">Total</div>
            </div>
          )}
        </div>
      )}

      {songPicker && <SongPickerModal mode={pickerMode} onClose={() => { setSongPicker(false); setPickerMode("songs"); addPickCtxRef.current = null; }} onPick={pickerMode === "medley" ? addMedley : addSongs} />}
      {openId && (
        <ItemDrawer
          planId={planId} itemId={openId} canEdit={canEdit} flash={flash}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}

      <style jsx>{`
        .ord { position: relative; }
        .ord-err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; margin-bottom: 10px; font-size: 13px; }
        .ord-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 14px 7px; border-bottom: 1px solid var(--border); }
        .ord-cols { display: flex; align-items: center; gap: 0; color: var(--text-faint); font-size: 11px; letter-spacing: .5px; font-weight: 600; }
        .c-len { width: 64px; flex: none; } .c-title { }
        .ord-empty { padding: 42px 14px; text-align: center; border-radius: 10px; transition: background .12s, box-shadow .12s; }
        .ord-empty.drop { background: rgba(47,129,247,.06); box-shadow: inset 0 0 0 1px var(--border-strong); }
        .ord-empty.drop.over { background: rgba(47,129,247,.14); box-shadow: inset 0 0 0 2px var(--primary); }
        .oe-t { color: var(--text-dim); font-size: 14px; } .oe-s { color: var(--text-faint); font-size: 12.5px; margin-top: 6px; }
        .end-drop { height: 0; margin: 0 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 12px; font-weight: 600; overflow: hidden; transition: height .14s ease, background .12s, border-color .12s; border: 1px dashed transparent; }
        .end-drop.show { height: 34px; margin: 8px; border-color: var(--border-strong); color: var(--text-faint); }
        .end-drop.over { background: rgba(47,129,247,.12); border-color: var(--primary); border-style: solid; color: var(--primary); }
        .ord-list { margin-top: 2px; }
        .row { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-left: 3px solid transparent; border-bottom: 1px solid var(--border-soft); cursor: pointer; transition: background .1s; }
        .row:hover:not(.hdr) { background: var(--row-hover); }
        .row.open { background: rgba(47,129,247,.09); box-shadow: inset 2px 0 0 var(--primary); }
        .row.over { box-shadow: inset 0 2px 0 var(--primary); }
        .row.trans { padding-left: 42px; }
        .row.hdr { background: var(--section-head-bg); border-top: 2px solid var(--product); cursor: default; padding: 8px 14px; }
        .hdr-t { color: var(--text); font-weight: 700; text-transform: uppercase; font-size: 11.5px; letter-spacing: .6px; }
        .r-len { width: 64px; flex: none; color: var(--text-faint); font-size: 12.5px; font-variant-numeric: tabular-nums; }
        .r-main { flex: 1; min-width: 0; }
        .r-titleline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .r-title { color: var(--text); font-size: 14px; }
        .r-key { color: #fff; background: #6fa02e; font-size: 13px; font-weight: 700; border: 1px solid #6fa02e; border-radius: 999px; padding: 1px 8px; line-height: 1.3; }
        .r-key.media { background: var(--primary); border-color: var(--primary); color: #fff; }
        .r-leadav { display: inline-flex; margin: -9px 0 -9px 20px; align-self: center; transform: translateY(5px); }
        .bang { flex: none; width: 17px; height: 17px; border-radius: 50%; background: var(--danger); color: #fff; font-weight: 800; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; }
        .mtag { flex: none; font-size: 9px; text-transform: uppercase; letter-spacing: .4px; color: var(--primary); border: 1px solid var(--primary); border-radius: 9px; padding: 0 6px; font-weight: 700; }
        .mexp { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 11.5px; padding: 0 2px; }
        .mexp:hover { color: var(--text); }
        .r-voices { color: var(--text-dim); font-size: 12px; line-height: 1.5; margin-top: 2px; white-space: pre-line; }
        .r-min { color: var(--text-dim); font-size: 12px; line-height: 1.5; margin-top: 2px; }
        .r-trans-line { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; color: var(--text-dim); font-size: 12px; line-height: 1.5; margin-top: 2px; }
        .r-trans-line b { color: var(--text); font-weight: 700; }
        .r-trans-line.tp { color: var(--text); font-weight: 600; }
        .rt-sym { color: var(--text-faint); }
        .rt-lights { gap: 5px; }
        .rt-dot { width: 11px; height: 11px; border-radius: 50%; border: 1px solid var(--border-strong); display: inline-block; }
        .r-sub { color: var(--text-dim); font-size: 12px; line-height: 1.5; margin-top: 2px; white-space: pre-wrap; max-width: 640px; }
        .r-right { display: flex; align-items: center; gap: 4px; margin-left: auto; flex: none; }
        .lead-av { display: inline-flex; }
        .need-dot { width: 20px; height: 20px; border-radius: 50%; background: var(--st-unconfirmed); color: #1d1600; font-weight: 800; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; margin-left: 2px; }
        .clip { display: inline-flex; align-items: center; gap: 3px; color: var(--text-faint); font-size: 12px; margin-left: 8px; }
        .total-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-top: 1px solid var(--border); margin-top: 2px; }
        .tr-len { width: 64px; flex: none; color: var(--text); font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .tr-lbl { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
      `}</style>
    </div>
  );
}
