"use client";
/**
 * Note de plan cu view-uri țintite (cerință David). În sidebar-ul din stânga:
 *  - privitorul vede DOAR nota aplicabilă lui (cel mai prioritar view care-l prinde) — read-only.
 *  - coordonatorul (editOrder) are o rotiță → manager cu view-uri: fiecare cu audiență (echipe + roluri +
 *    opțional „anumiți oameni" = pinned, mereu deasupra), reordonabile prin drag (prioritate).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { plansApi } from "@/lib/api/client";

export default function NotesBoard({ planId, canEdit, flash }) {
  const [note, setNote] = useState(undefined); // undefined=loading, null=none
  const [mgr, setMgr] = useState(false);
  const loadMine = useCallback(() => { plansApi.myNote(planId).then((r) => setNote(r.note || null)).catch(() => setNote(null)); }, [planId]);
  useEffect(() => { loadMine(); }, [loadMine]);

  return (
    <div className="nb">
      <div className="nb-top">
        <span className="nb-h">Notes {canEdit && <span className="nb-tag">view-uri</span>}</span>
        {canEdit && <button className="nb-gear" title="Gestionează view-uri" onClick={() => setMgr(true)}>⚙</button>}
      </div>
      {note === undefined ? <div className="muted">Se încarcă…</div>
        : note ? (<div className="nb-note">{note.title && <div className="nb-t">{note.title}</div>}<div className="nb-c">{note.content || "—"}</div></div>)
          : <div className="muted">{canEdit ? "Niciun view încă. Apasă ⚙ ca să adaugi." : "Nicio notă pentru tine."}</div>}

      {mgr && <NoteViewsManager planId={planId} flash={flash} onClose={() => { setMgr(false); loadMine(); }} />}
      <style jsx>{`
        .nb-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .nb-h { color: var(--text); font-weight: 600; font-size: 13px; }
        .nb-tag { font-size: 9px; color: var(--text-faint); border: 1px solid var(--border-strong); border-radius: 10px; padding: 0 6px; text-transform: uppercase; margin-left: 6px; }
        .nb-gear { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 15px; }
        .nb-gear:hover { color: var(--primary); }
        .muted { color: var(--text-faint); font-size: 12.5px; }
        .nb-t { color: var(--text); font-weight: 600; font-size: 13.5px; margin-bottom: 4px; }
        .nb-c { color: var(--text-dim); font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
      `}</style>
    </div>
  );
}

function NoteViewsManager({ planId, onClose, flash }) {
  const [views, setViews] = useState([]);
  const [picker, setPicker] = useState([]);
  const dragId = useRef(null);
  const [overId, setOverId] = useState(null);

  const load = useCallback(() => { plansApi.noteViews(planId).then((r) => { setViews(r.views || []); setPicker(r.picker || []); }).catch(() => {}); }, [planId]);
  useEffect(() => { load(); }, [load]);

  async function addView() { try { await plansApi.createNoteView(planId, { title: "Notă nouă", content: "" }); load(); } catch (e) { flash?.(e?.message || "Eroare."); } }
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
    setViews([...pinned, ...arr]); // optimist
    plansApi.reorderNoteViews(planId, arr.map((x) => x.id)).then(load).catch(() => load());
  }

  return (
    <Modal title="Note — view-uri țintite" width={780} onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Gata</button>}>
      <div className="nvm">
        <div className="nvm-hint">Cineva vede DOAR view-ul cel mai prioritar care-l prinde. <b>„Anumiți oameni"</b> = prioritate maximă (mereu deasupra). Restul: trage-le ca să le ordonezi (sus = mai puternic).</div>

        {pinned.length > 0 && <div className="nvm-sec">Prioritate maximă (anumiți oameni)</div>}
        {pinned.map((v) => <ViewCard key={v.id} v={v} picker={picker} onSave={save} onDelete={del} />)}

        {normal.length > 0 && <div className="nvm-sec">După prioritate (trage ca să ordonezi)</div>}
        {normal.map((v) => (
          <div key={v.id} draggable onDragStart={() => { dragId.current = v.id; }} onDragEnd={() => { dragId.current = null; setOverId(null); }}
            onDragOver={(e) => { if (dragId.current) { e.preventDefault(); if (overId !== v.id) setOverId(v.id); } }} onDrop={() => onDrop(v.id)}
            className={overId === v.id ? "drop-over" : ""}>
            <ViewCard v={v} picker={picker} onSave={save} onDelete={del} draggable />
          </div>
        ))}

        <button className="nvm-add" onClick={addView}>+ View nou</button>
      </div>
      <style jsx>{`
        .nvm-hint { color: var(--text-dim); font-size: 12.5px; line-height: 1.6; background: var(--surface-2); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
        .nvm-sec { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin: 14px 0 8px; }
        .drop-over :global(.vc) { box-shadow: inset 0 2px 0 var(--primary); }
        .nvm-add { width: 100%; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 8px; padding: 10px; font-size: 13px; cursor: pointer; margin-top: 12px; }
        .nvm-add:hover { color: var(--primary); border-color: var(--primary); }
      `}</style>
    </Modal>
  );
}

function ViewCard({ v, picker, onSave, onDelete, draggable }) {
  const [title, setTitle] = useState(v.title);
  const [content, setContent] = useState(v.content);
  const [teamIds, setTeamIds] = useState(v.teamIds || []);
  const [roleNames, setRoleNames] = useState(v.roleNames || []);
  const [specific, setSpecific] = useState(v.specificPersonIds || []);
  const [useSpecific, setUseSpecific] = useState((v.specificPersonIds || []).length > 0);
  const dirty = title !== v.title || content !== v.content || JSON.stringify(teamIds) !== JSON.stringify(v.teamIds || []) || JSON.stringify(roleNames) !== JSON.stringify(v.roleNames || []) || JSON.stringify(specific) !== JSON.stringify(v.specificPersonIds || []);

  const selTeams = picker.filter((t) => teamIds.includes(t.teamId));
  const roles = useMemo(() => [...new Set(selTeams.flatMap((t) => t.roles))], [selTeams]);
  const people = useMemo(() => { const m = {}; selTeams.forEach((t) => t.people.forEach((p) => (m[p.personId] = p))); return Object.values(m); }, [selTeams]);
  const tgl = (arr, set, val) => set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  return (
    <div className="vc">
      <div className="vc-head">
        {draggable && <span className="vc-drag" title="Trage pentru prioritate">⋮⋮</span>}
        {v.pinned && <span className="vc-pin">PIN · anumiți oameni</span>}
        <input className="vc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titlu view" />
        <button className="vc-del" onClick={() => onDelete(v.id)}>✕</button>
      </div>
      <textarea className="vc-content" rows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conținut (ce vede audiența)…" />

      <div className="vc-aud">
        <div className="vc-l">Echipe</div>
        <div className="chips">{picker.map((t) => <button key={t.teamId} className={teamIds.includes(t.teamId) ? "on" : ""} onClick={() => tgl(teamIds, setTeamIds, t.teamId)}>{t.name}</button>)}{!picker.length && <span className="none">—</span>}</div>

        {teamIds.length > 0 && (
          <>
            <div className="vc-l">Roluri</div>
            <div className="chips">{roles.map((r) => <button key={r} className={roleNames.includes(r) ? "on" : ""} onClick={() => tgl(roleNames, setRoleNames, r)}>{r}</button>)}{!roles.length && <span className="none">—</span>}</div>

            <label className="vc-spc"><input type="checkbox" checked={useSpecific} onChange={(e) => { setUseSpecific(e.target.checked); if (!e.target.checked) setSpecific([]); }} /> Anumiți oameni (prioritate maximă)</label>
            {useSpecific && <div className="chips">{people.map((p) => <button key={p.personId} className={specific.includes(p.personId) ? "on" : ""} onClick={() => tgl(specific, setSpecific, p.personId)}>{p.name}</button>)}{!people.length && <span className="none">Alege întâi echipe cu oameni.</span>}</div>}
          </>
        )}
      </div>

      {dirty && <button className="vc-save" onClick={() => onSave({ id: v.id, title, content, teamIds, roleNames, specificPersonIds: useSpecific ? specific : [] })}>Salvează view</button>}
      <style jsx>{`
        .vc { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 12px; margin-bottom: 10px; }
        .vc-head { display: flex; align-items: center; gap: 8px; }
        .vc-drag { color: var(--text-faint); cursor: grab; font-size: 13px; }
        .vc-pin { font-size: 9px; font-weight: 800; color: var(--st-unconfirmed); border: 1px solid var(--st-unconfirmed); border-radius: 10px; padding: 1px 6px; letter-spacing: .3px; }
        .vc-title { flex: 1; background: transparent; border: none; border-bottom: 1px solid var(--border-strong); color: var(--text); font-size: 14px; font-weight: 600; padding: 2px; font-family: inherit; }
        .vc-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; }
        .vc-del:hover { color: var(--danger); }
        .vc-content { width: 100%; margin-top: 8px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 13px; padding: 8px; font-family: inherit; resize: vertical; }
        .vc-aud { margin-top: 10px; }
        .vc-l { color: var(--text-faint); font-size: 10px; text-transform: uppercase; letter-spacing: .4px; margin: 8px 0 5px; }
        .chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .chips button { background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 14px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
        .chips button.on { border-color: var(--primary); color: var(--text); background: rgba(47,129,247,.1); }
        .none { color: var(--text-faint); font-size: 11.5px; }
        .vc-spc { display: flex; align-items: center; gap: 7px; margin: 10px 0 6px; color: var(--text-dim); font-size: 12.5px; cursor: pointer; }
        .vc-save { background: var(--primary); border: none; color: #fff; border-radius: 7px; padding: 7px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; margin-top: 10px; }
      `}</style>
    </div>
  );
}
