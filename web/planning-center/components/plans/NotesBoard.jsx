"use client";
/**
 * Note de plan cu view-uri țintite. În sidebar:
 *  - privitorul vede DOAR nota aplicabilă lui (cel mai prioritar view care-l prinde) — read-only.
 *  - coordonatorul (editOrder) are un buton de settings → manager cu view-uri COLAPSABILE (headere în
 *    ordinea priorității), fiecare cu audiență (echipe + roluri + opțional „anumiți oameni" = pinned).
 * Lista „anumiți oameni" e filtrată pe echipele + rolurile selectate (nu toată lumea).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { plansApi } from "@/lib/api/client";

const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function NotesBoard({ planId, canEdit, flash }) {
  const [note, setNote] = useState(undefined); // undefined=loading, null=none
  const [views, setViews] = useState([]);
  const [picker, setPicker] = useState([]);
  const [mgr, setMgr] = useState(null); // null=închis | true=deschis | {openId}

  const loadMine = useCallback(() => { plansApi.myNote(planId).then((r) => setNote(r.note || null)).catch(() => setNote(null)); }, [planId]);
  const loadViews = useCallback(() => { if (canEdit) plansApi.noteViews(planId).then((r) => { setViews(r.views || []); setPicker(r.picker || []); }).catch(() => {}); }, [planId, canEdit]);
  useEffect(() => { loadMine(); loadViews(); }, [loadMine, loadViews]);

  const teamName = (id) => (picker.find((t) => t.teamId === id) || {}).name;
  const summaryOf = (v) => v.pinned
    ? `Anumiți: ${(v.specificNames || []).join(", ") || "—"}`
    : [(v.teamIds || []).map(teamName).filter(Boolean).join(", "), (v.roleNames || []).join(", ")].filter(Boolean).join(" · ") || "Toți din echipele alese";

  const open = (id) => setMgr(id ? { openId: id } : true);
  const close = () => { setMgr(null); loadMine(); loadViews(); };

  return (
    <div className="nb">
      <div className="nb-top">
        <span className="nb-h">Notes {canEdit && views.length > 0 && <span className="nb-tag">{views.length} view-uri</span>}</span>
        {canEdit && <button className="nb-gear" title="Gestionează view-uri" onClick={() => open()}><GearIcon /></button>}
      </div>

      {note === undefined ? <Skeleton lines={2} />
        : note ? (<div className="nb-note"><div className="nb-dot" />{note.title && <div className="nb-t">{note.title}</div>}<div className="nb-c">{note.content || "—"}</div></div>) : null}

      {canEdit ? (
        views.length ? (
          <div className="nb-list">
            {!note && <div className="nb-note-hint">Niciunul nu te vizează pe tine — dar le poți vedea și gestiona:</div>}
            {views.map((v) => (
              <button key={v.id} className="nb-vrow" onClick={() => open(v.id)} title="Deschide">
                <span className="nb-vt">{v.title || "Fără titlu"}</span>
                {v.pinned && <span className="nb-vpin">PIN</span>}
                <span className="nb-vsum">{summaryOf(v)}</span>
              </button>
            ))}
          </div>
        ) : <button className="nb-empty" onClick={() => open()}>Niciun view încă. Creează unul ▸</button>
      ) : (!note && <div className="muted">Nicio notă pentru tine.</div>)}

      {mgr && <NoteViewsManager planId={planId} flash={flash} initialOpenId={mgr?.openId} onClose={close} />}
      <style jsx>{`
        .nb-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
        .nb-h { color: var(--text); font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; }
        .nb-tag { font-size: 9.5px; color: var(--text-dim); background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 10px; padding: 1px 7px; text-transform: uppercase; margin-left: 8px; letter-spacing: .3px; }
        .nb-gear { display: inline-flex; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); cursor: pointer; border-radius: 8px; padding: 5px; transition: color .14s, border-color .14s; }
        .nb-gear:hover { color: var(--primary); border-color: var(--primary); }
        .muted { color: var(--text-faint); font-size: 12.5px; }
        .nb-note { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 12px; position: relative; margin-bottom: 8px; }
        .nb-dot { position: absolute; left: 0; top: 11px; bottom: 11px; width: 3px; border-radius: 3px; background: var(--primary); }
        .nb-t { color: var(--text); font-weight: 600; font-size: 13.5px; margin-bottom: 4px; padding-left: 8px; }
        .nb-c { color: var(--text-dim); font-size: 13px; line-height: 1.5; white-space: pre-wrap; padding-left: 8px; }
        .nb-note-hint { color: var(--text-faint); font-size: 11.5px; line-height: 1.4; margin-bottom: 7px; }
        .nb-list { display: flex; flex-direction: column; gap: 6px; }
        .nb-vrow { display: flex; align-items: center; gap: 7px; width: 100%; text-align: left; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; padding: 9px 11px; cursor: pointer; transition: border-color .14s, transform .14s; }
        .nb-vrow:hover { border-color: var(--border-strong); transform: translateY(-1px); }
        .nb-vt { color: var(--text); font-size: 13px; font-weight: 600; flex: none; max-width: 48%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nb-vpin { font-size: 8.5px; font-weight: 800; color: var(--st-unconfirmed); border: 1px solid var(--st-unconfirmed); border-radius: 9px; padding: 1px 5px; letter-spacing: .3px; flex: none; }
        .nb-vsum { color: var(--text-faint); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: right; }
        .nb-empty { width: 100%; text-align: left; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 10px; padding: 11px 12px; font-size: 12.5px; cursor: pointer; line-height: 1.5; }
        .nb-empty:hover { color: var(--primary); border-color: var(--primary); }
      `}</style>
    </div>
  );
}

function NoteViewsManager({ planId, onClose, flash, initialOpenId }) {
  const [views, setViews] = useState([]);
  const [picker, setPicker] = useState([]);
  const [open, setOpen] = useState(() => new Set(initialOpenId ? [String(initialOpenId)] : [])); // id-uri expandate (default: colapsate)
  const dragId = useRef(null);
  const [overId, setOverId] = useState(null);

  const load = useCallback(() => { plansApi.noteViews(planId).then((r) => { setViews(r.views || []); setPicker(r.picker || []); }).catch(() => {}); }, [planId]);
  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function addView() { try { const r = await plansApi.createNoteView(planId, { title: "Notă nouă", content: "" }); await load(); if (r?.id) setOpen((s) => new Set(s).add(String(r.id))); } catch (e) { flash?.(e?.message || "Eroare."); } }
  async function save(v) { try { await plansApi.updateNoteView(planId, v.id, { title: v.title, content: v.content, teamIds: v.teamIds, roleNames: v.roleNames, specificPersonIds: v.specificPersonIds }); flash?.("View salvat."); load(); } catch (e) { flash?.(e?.message || "Eroare."); } }
  async function del(id) { if (!confirm("Ștergi acest view?")) return; try { await plansApi.deleteNoteView(planId, id); load(); } catch (e) { flash?.(e?.message || "Eroare."); } }

  const pinned = views.filter((v) => v.pinned);
  const normal = views.filter((v) => !v.pinned);

  function onDrop(toId) {
    const fromId = dragId.current; dragId.current = null; setOverId(null);
    if (!fromId || fromId === toId) return;
    const arr = [...normal]; const fi = arr.findIndex((x) => x.id === fromId); const ti = arr.findIndex((x) => x.id === toId);
    if (fi < 0 || ti < 0) return;
    const [m] = arr.splice(fi, 1); arr.splice(ti, 0, m);
    setViews([...pinned, ...arr]);
    plansApi.reorderNoteViews(planId, arr.map((x) => x.id)).then(load).catch(() => load());
  }

  return (
    <Modal title="Notes" width={640} onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Gata</button>}>
      <div className="nvm">
        <div className="nvm-hint">Cineva vede DOAR view-ul cel mai prioritar care-l prinde. <b>„Anumiți oameni"</b> = prioritate maximă (mereu deasupra). Restul: trage-le ca să le ordonezi (sus = mai puternic).</div>

        {pinned.length > 0 && <div className="nvm-sec">Prioritate maximă</div>}
        {pinned.map((v) => <ViewCard key={v.id} v={v} picker={picker} expanded={open.has(v.id)} onToggle={() => toggle(v.id)} onSave={save} onDelete={del} />)}

        {normal.length > 0 && <div className="nvm-sec">După prioritate — trage ca să ordonezi</div>}
        {normal.map((v) => (
          <div key={v.id} draggable onDragStart={() => { dragId.current = v.id; }} onDragEnd={() => { dragId.current = null; setOverId(null); }}
            onDragOver={(e) => { if (dragId.current) { e.preventDefault(); if (overId !== v.id) setOverId(v.id); } }} onDrop={() => onDrop(v.id)}
            className={overId === v.id ? "drop-over" : ""}>
            <ViewCard v={v} picker={picker} expanded={open.has(v.id)} onToggle={() => toggle(v.id)} onSave={save} onDelete={del} draggable />
          </div>
        ))}

        {!views.length && <div className="nvm-none">Niciun view încă. Adaugă primul.</div>}
        <button className="nvm-add" onClick={addView}>+ View nou</button>
      </div>
      <style jsx>{`
        .nvm-hint { color: var(--text-dim); font-size: 12.5px; line-height: 1.6; background: var(--surface-2); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
        .nvm-sec { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin: 14px 0 8px; }
        .nvm-none { color: var(--text-faint); font-size: 13px; padding: 6px 0; }
        .drop-over :global(.vc) { box-shadow: inset 0 2px 0 var(--primary); }
        .nvm-add { width: 100%; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 8px; padding: 10px; font-size: 13px; cursor: pointer; margin-top: 12px; }
        .nvm-add:hover { color: var(--primary); border-color: var(--primary); }
      `}</style>
    </Modal>
  );
}

function ViewCard({ v, picker, expanded, onToggle, onSave, onDelete, draggable }) {
  const [title, setTitle] = useState(v.title);
  const [content, setContent] = useState(v.content);
  const [teamIds, setTeamIds] = useState(v.teamIds || []);
  const [roleNames, setRoleNames] = useState(v.roleNames || []);
  const [specific, setSpecific] = useState(v.specificPersonIds || []);
  const [useSpecific, setUseSpecific] = useState((v.specificPersonIds || []).length > 0);
  useEffect(() => { setTitle(v.title); setContent(v.content); setTeamIds(v.teamIds || []); setRoleNames(v.roleNames || []); setSpecific(v.specificPersonIds || []); setUseSpecific((v.specificPersonIds || []).length > 0); }, [v]);
  const dirty = title !== v.title || content !== v.content || JSON.stringify(teamIds) !== JSON.stringify(v.teamIds || []) || JSON.stringify(roleNames) !== JSON.stringify(v.roleNames || []) || JSON.stringify(specific) !== JSON.stringify(v.specificPersonIds || []);

  const selTeams = picker.filter((t) => teamIds.includes(t.teamId));
  const roles = useMemo(() => [...new Set(selTeams.flatMap((t) => t.roles))], [selTeams]);
  const people = useMemo(() => {
    const m = {}; selTeams.forEach((t) => (t.people || []).forEach((p) => { if (!m[p.personId]) m[p.personId] = p; }));
    let list = Object.values(m);
    if (roleNames.length) list = list.filter((p) => (p.roles || []).some((r) => roleNames.includes(r))); // DOAR oamenii cu rolul ales
    return list;
  }, [selTeams, roleNames]);
  const tgl = (arr, set, val) => set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const teamNames = (v.teamIds || []).map((id) => (picker.find((t) => t.teamId === id) || {}).name).filter(Boolean);
  const summary = v.pinned
    ? `Anumiți: ${(v.specificNames || []).join(", ") || "—"}`
    : [teamNames.join(", "), (v.roleNames || []).join(", ")].filter(Boolean).join(" · ") || "Fără audiență";

  return (
    <div className="vc">
      <div className="vc-head" onClick={onToggle}>
        {draggable && <span className="vc-drag" title="Trage pentru prioritate" onClick={(e) => e.stopPropagation()}>⋮⋮</span>}
        <span className={`vc-chev ${expanded ? "op" : ""}`}>▸</span>
        <span className="vc-ttl">{title || "Fără titlu"}</span>
        {v.pinned && <span className="vc-pin">PIN</span>}
        {!expanded && <span className="vc-sum">{summary}</span>}
        <button className="vc-del" onClick={(e) => { e.stopPropagation(); onDelete(v.id); }} title="Șterge">✕</button>
      </div>

      {expanded && (
        <div className="vc-body">
          <input className="vc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titlu view" />
          <textarea className="vc-content" rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conținut (ce vede audiența)…" />

          <div className="vc-l">Echipe</div>
          <div className="chips">{picker.map((t) => <button key={t.teamId} className={teamIds.includes(t.teamId) ? "on" : ""} onClick={() => tgl(teamIds, setTeamIds, t.teamId)}>{t.name}</button>)}{!picker.length && <span className="none">—</span>}</div>

          {teamIds.length > 0 && (
            <>
              <div className="vc-l">Roluri</div>
              <div className="chips">{roles.map((r) => <button key={r} className={roleNames.includes(r) ? "on" : ""} onClick={() => tgl(roleNames, setRoleNames, r)}>{r}</button>)}{!roles.length && <span className="none">—</span>}</div>

              <label className="vc-spc"><input type="checkbox" checked={useSpecific} onChange={(e) => { setUseSpecific(e.target.checked); if (!e.target.checked) setSpecific([]); }} /> Anumiți oameni (prioritate maximă)</label>
              {useSpecific && <div className="chips">{people.map((p) => <button key={p.personId} className={specific.includes(p.personId) ? "on" : ""} onClick={() => tgl(specific, setSpecific, p.personId)}>{p.name}</button>)}{!people.length && <span className="none">Niciun om pe echipa/rolul ales.</span>}</div>}
            </>
          )}

          {dirty && <button className="vc-save" onClick={() => onSave({ id: v.id, title, content, teamIds, roleNames, specificPersonIds: useSpecific ? specific : [] })}>Salvează view</button>}
        </div>
      )}
      <style jsx>{`
        .vc { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 9px; overflow: hidden; }
        .vc-head { display: flex; align-items: center; gap: 9px; padding: 11px 12px; cursor: pointer; }
        .vc-head:hover { background: var(--surface-3); }
        .vc-drag { color: var(--text-faint); cursor: grab; font-size: 12px; flex: none; }
        .vc-chev { color: var(--text-faint); font-size: 11px; transition: transform .14s ease; flex: none; }
        .vc-chev.op { transform: rotate(90deg); }
        .vc-ttl { color: var(--text); font-size: 13.5px; font-weight: 600; flex: none; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vc-pin { font-size: 9px; font-weight: 800; color: var(--st-unconfirmed); border: 1px solid var(--st-unconfirmed); border-radius: 10px; padding: 1px 6px; letter-spacing: .3px; flex: none; }
        .vc-sum { color: var(--text-faint); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .vc-del { margin-left: auto; background: transparent; border: none; color: var(--text-faint); cursor: pointer; flex: none; font-size: 13px; }
        .vc-del:hover { color: var(--danger); }
        .vc-body { padding: 0 12px 12px; animation: vcIn .14s ease; }
        @keyframes vcIn { from { opacity: 0; } to { opacity: 1; } }
        .vc-title { width: 100%; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 14px; font-weight: 600; padding: 8px 10px; font-family: inherit; }
        .vc-content { width: 100%; margin-top: 8px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 13px; padding: 9px 10px; font-family: inherit; line-height: 1.5; resize: vertical; min-height: 96px; max-height: 260px; overflow-y: auto; }
        .vc-l { color: var(--text-faint); font-size: 10px; text-transform: uppercase; letter-spacing: .4px; margin: 12px 0 6px; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chips button { background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 999px; padding: 4px 11px; font-size: 12px; cursor: pointer; transition: all .12s ease; }
        .chips button:hover { color: var(--text); }
        .chips button.on { border-color: var(--primary); color: #fff; background: var(--primary); font-weight: 600; }
        .none { color: var(--text-faint); font-size: 11.5px; }
        .vc-spc { display: flex; align-items: center; gap: 8px; margin: 12px 0 7px; color: var(--text-dim); font-size: 12.5px; cursor: pointer; }
        .vc-save { background: var(--primary); border: none; color: #fff; border-radius: 8px; padding: 8px 15px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-top: 12px; }
        .vc-save:hover { background: var(--primary-hover); }
      `}</style>
    </div>
  );
}
