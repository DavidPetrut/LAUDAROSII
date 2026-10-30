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

  const load = useCallback(async () => {
    try { const r = await plansApi.order(planId); setItems(r.items || []); setTotalLabel(r.totalLabel || ""); setErr(""); }
    catch (e) { setErr(e?.message || "Eroare la ordine."); setItems([]); }
  }, [planId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { onSideChange?.(!!openId); }, [openId, onSideChange]);

  const lastId = items && items.length ? items[items.length - 1].id : null;

  async function addSimple(type) {
    try {
      const r = await plansApi.addItem(planId, { type, afterItemId: lastId || undefined });
      await load();
      if (type !== "header" && r?.id) setOpenId(r.id);
    } catch (e) { flash?.(e?.message || "Eroare la adăugare."); }
  }
  async function addSongs(songs) {
    setSongPicker(false);
    let after = lastId;
    try {
      let firstId = null;
      for (const s of songs) {
        const r = await plansApi.addItem(planId, { type: "song", songId: s.id, afterItemId: after || undefined });
        after = r?.id || after;
        if (!firstId) firstId = r?.id;
      }
      await load();
      if (songs.length === 1 && firstId) setOpenId(firstId);
    } catch (e) { flash?.(e?.message || "Eroare la adăugarea cântecelor."); }
  }
  async function addMedley(songs) {
    setSongPicker(false); setPickerMode("songs");
    if (songs.length < 2) { flash?.("Alege cel puțin 2 cântece pentru medley."); return; }
    try { const r = await plansApi.createMedley(planId, { songIds: songs.map((s) => s.id), afterItemId: lastId || undefined }); await load(); if (r?.id) setOpenId(r.id); }
    catch (e) { flash?.(e?.message || "Eroare la medley."); }
  }

  function onDrop(toId) {
    const fromId = dragId.current; dragId.current = null; setOverId(null);
    if (!fromId || fromId === toId || !items) return;
    const arr = [...items];
    const fi = arr.findIndex((x) => String(x.id) === String(fromId));
    const ti = arr.findIndex((x) => String(x.id) === String(toId));
    if (fi < 0 || ti < 0 || fi === ti) return;
    const [m] = arr.splice(fi, 1); arr.splice(ti, 0, m);
    setItems(arr);
    plansApi.reorderItems(planId, arr.map((x) => x.id)).then(() => flash?.("Reordonat.")).catch((e) => { flash?.(e?.message || "Eroare."); load(); });
  }

  if (items === null) return <div className="muted">Se încarcă…</div>;

  return (
    <div className="ord">
      {err && <div className="ord-err">{err}</div>}

      <div className="ord-toolbar">
        <div className="ord-cols"><span className="c-len">LENGTH</span><span className="c-title">TITLE</span></div>
        {canEdit && <AddItemMenu onAdd={addSimple} onAddSong={() => { setPickerMode("songs"); setSongPicker(true); }} onAddMedley={() => { setPickerMode("medley"); setSongPicker(true); }} />}
      </div>

      {!items.length ? (
        <div className="ord-empty">
          <div className="oe-t">Niciun item în ordinea serviciului.</div>
          {canEdit && <div className="oe-s">Apasă „+ Adaugă" ca să începi programul.</div>}
        </div>
      ) : (
        <div className="ord-list">
          {items.map((it) => {
            const isHeader = it.type === "header";
            const isMedley = it.type === "medley";
            const open = String(openId) === String(it.id);
            const over = String(overId) === String(it.id);
            const voiceLine = it.voices?.length ? formatVoices(it.voices) : "";
            return (
              <div
                key={it.id}
                className={`row ${isHeader ? "hdr" : ""} ${it.isTransition ? "trans" : ""} ${open ? "open" : ""} ${over ? "over" : ""}`}
                style={{ borderLeftColor: it.rowColor || "transparent" }}
                draggable={canEdit}
                onDragStart={() => { dragId.current = it.id; }}
                onDragEnd={() => { dragId.current = null; setOverId(null); }}
                onDragOver={(e) => { if (dragId.current) { e.preventDefault(); if (String(overId) !== String(it.id)) setOverId(it.id); } }}
                onDrop={() => onDrop(it.id)}
                onClick={() => !isHeader && setOpenId(it.id)}
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
                      </div>
                      {voiceLine ? <div className="r-voices">{voiceLine}</div> : it.description ? <div className="r-sub">{it.description}</div> : null}
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
          {totalLabel && (
            <div className="total-row">
              <div className="tr-len">{totalLabel}</div>
              <div className="tr-lbl">Total</div>
            </div>
          )}
        </div>
      )}

      {songPicker && <SongPickerModal mode={pickerMode} onClose={() => { setSongPicker(false); setPickerMode("songs"); }} onPick={pickerMode === "medley" ? addMedley : addSongs} />}
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
        .ord-empty { padding: 42px 14px; text-align: center; }
        .oe-t { color: var(--text-dim); font-size: 14px; } .oe-s { color: var(--text-faint); font-size: 12.5px; margin-top: 6px; }
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
        .r-key { color: var(--product); font-size: 11.5px; font-weight: 600; border: 1px solid var(--product); border-radius: 4px; padding: 0 6px; line-height: 1.5; }
        .r-key.media { color: var(--primary); border-color: var(--primary); }
        .bang { flex: none; width: 17px; height: 17px; border-radius: 50%; background: var(--danger); color: #fff; font-weight: 800; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; }
        .mtag { flex: none; font-size: 9px; text-transform: uppercase; letter-spacing: .4px; color: var(--primary); border: 1px solid var(--primary); border-radius: 9px; padding: 0 6px; font-weight: 700; }
        .mexp { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 11.5px; padding: 0 2px; }
        .mexp:hover { color: var(--text); }
        .r-voices { color: var(--text-dim); font-size: 12px; line-height: 1.5; margin-top: 3px; white-space: pre-line; }
        .r-sub { color: var(--text-dim); font-size: 12px; line-height: 1.5; margin-top: 3px; white-space: pre-wrap; max-width: 640px; }
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
