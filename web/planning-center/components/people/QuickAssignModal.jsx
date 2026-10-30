"use client";
/**
 * QuickAssignModal — editor de roster pentru o persoană (lucrări → poziții), din People.
 * Header: poza + numele (+ SIM). Modificările sunt STAGED: bifezi/scoți poziții, apoi „Salvează".
 * X / Esc / click-afară cu modificări nesalvate → confirmare. Collapsible, compact, seamless. ZERO email.
 */
import { useEffect, useMemo, useState } from "react";
import { peopleApi } from "@/lib/api/client";
import Skeleton from "@/components/ui/Skeleton";

const norm = (s) => String(s).toLowerCase();
const eqSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

export default function QuickAssignModal({ person, onClose, onChanged }) {
  const [ministries, setMinistries] = useState(null);
  const [base, setBase] = useState(() => new Set());   // roster-ul salvat (server)
  const [draft, setDraft] = useState(() => new Set()); // roster-ul editat (staged)
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([peopleApi.ministries(), peopleApi.roster(person.id)])
      .then(([m, r]) => {
        if (!alive) return;
        const mins = m.ministries || [];
        setMinistries(mins);
        const rs = new Set((r.positionIds || []).map(String));
        setBase(rs); setDraft(new Set(rs));
        const pre = new Set();
        mins.forEach((mm) => { if (mm.positions.some((p) => (p.positionIds || []).some((id) => rs.has(String(id))))) pre.add(mm.name); });
        setOpen(pre);
      })
      .catch(() => alive && setMinistries([]));
    return () => { alive = false; };
  }, [person.id]);

  const dirty = !eqSet(base, draft);
  const isOn = (pos) => (pos.positionIds || []).some((id) => draft.has(String(id)));
  const toggle = (pos) => {
    const on = isOn(pos); const ids = (pos.positionIds || []).map(String);
    setDraft((s) => { const n = new Set(s); if (on) ids.forEach((x) => n.delete(x)); else ids.forEach((x) => n.add(x)); return n; });
  };

  async function save() {
    if (!dirty || saving) return;
    const added = [...draft].filter((x) => !base.has(x));
    const removed = [...base].filter((x) => !draft.has(x));
    setSaving(true);
    try {
      if (added.length) await peopleApi.rosterAdd(person.id, added);
      if (removed.length) await peopleApi.rosterRemove(person.id, removed);
      setBase(new Set(draft)); onChanged?.(); onClose?.();
    } catch { setSaving(false); }
  }
  const attemptClose = () => (dirty ? setConfirm(true) : onClose?.());

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); attemptClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line
  }, [dirty]);

  const current = useMemo(() => {
    if (!ministries) return [];
    const out = [];
    ministries.forEach((m) => m.positions.forEach((p) => { if (isOn(p)) out.push({ ...p, ministry: m.name }); }));
    return out.sort((a, b) => a.ministry.localeCompare(b.ministry) || a.name.localeCompare(b.name));
    // eslint-disable-next-line
  }, [ministries, draft]);

  const filtered = useMemo(() => {
    if (!ministries) return [];
    const s = norm(q.trim());
    if (!s) return ministries;
    return ministries
      .map((m) => ({ ...m, positions: m.positions.filter((p) => norm(p.name).includes(s) || norm(m.name).includes(s)) }))
      .filter((m) => m.positions.length);
  }, [ministries, q]);
  const isExpanded = (mName) => open.has(mName) || !!q.trim();

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && attemptClose()}>
      <div className="card">
        <div className="hd">
          <div className="who">
            {person.avatar ? <img className="av" src={person.avatar} alt="" /> : <span className="av ini">{person.initials}</span>}
            <div className="wtx">
              <div className="nm">{person.name}{person.sim ? <span className="simb">SIM {person.sim}</span> : null}</div>
              <div className="cnt">{current.length ? `${current.length} poziție(i)` : "fără slujiri"}{dirty ? <span className="chg"> · modificat</span> : null}</div>
            </div>
          </div>
          <div className="hact">
            {dirty && <button className="save" onClick={save} disabled={saving}>{saving ? "Se salvează…" : "Salvează"}</button>}
            <button className="x" onClick={attemptClose} aria-label="Închide">✕</button>
          </div>
        </div>

        <div className="bd">
          {current.length > 0 && (
            <div className="now">
              {current.map((p) => (
                <button key={`${p.ministry}|${p.name}`} className="nchip" title={`${p.ministry} · scoate`} onClick={() => toggle(p)}>
                  <span className="nm2">{p.name}</span><span className="nmin">{p.ministry}</span><span className="nx">×</span>
                </button>
              ))}
            </div>
          )}

          <div className="searchwrap">
            <svg className="si" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input className="search" placeholder="Caută lucrare sau poziție…" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button className="sx" onClick={() => setQ("")}>×</button>}
          </div>

          {ministries === null ? <Skeleton rows={3} /> : (
            <div className="list">
              {filtered.map((m) => {
                const onN = m.positions.filter(isOn).length;
                const exp = isExpanded(m.name);
                return (
                  <div key={m.name} className="min">
                    <button className="mh" onClick={() => setOpen((s) => { const n = new Set(s); n.has(m.name) ? n.delete(m.name) : n.add(m.name); return n; })}>
                      <span className={`car ${exp ? "" : "col"}`}>▾</span>
                      <span className="mn">{m.name}</span>
                      {onN > 0 && <span className="mb">{onN}</span>}
                      <span className="mc">{m.positions.length} poz.</span>
                    </button>
                    {exp && (
                      <div className="pos">
                        {m.positions.map((p) => (
                          <button key={p.name} className={`chip ${isOn(p) ? "on" : ""}`} onClick={() => toggle(p)}>
                            {isOn(p) && <span className="ck">✓</span>}{p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="load">Nicio lucrare/poziție pentru „{q}".</div>}
            </div>
          )}
        </div>

        {confirm && (
          <div className="cf" onMouseDown={(e) => e.target === e.currentTarget && setConfirm(false)}>
            <div className="cfbox">
              <div className="cft">Modificări nesalvate</div>
              <div className="cfs">Ai schimbat slujirile lui {person.name} dar n-ai salvat. Închizi fără să salvezi?</div>
              <div className="cfa">
                <button className="cfkeep" onClick={() => setConfirm(false)}>Rămâi</button>
                <button className="cfsave" onClick={() => { setConfirm(false); save(); }}>Salvează</button>
                <button className="cfdiscard" onClick={() => onClose?.()}>Renunță</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .ov { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.55); display: flex; align-items: flex-start; justify-content: center; padding: 64px 16px; animation: ov .14s ease; }
        @keyframes ov { from { opacity: 0; } to { opacity: 1; } }
        .card { width: 560px; max-width: 100%; background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 12px;
          box-shadow: 0 24px 64px rgba(0,0,0,.5); display: flex; flex-direction: column; max-height: calc(100vh - 120px); position: relative;
          animation: pop .18s cubic-bezier(.4,0,.2,1); }
        @keyframes pop { from { opacity: 0; transform: translateY(8px) scale(.99); } to { opacity: 1; transform: none; } }
        .hd { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border); }
        .who { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
        .av { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex: none; }
        .av.ini { background: #3a4552; color: #fff; font-size: 15px; display: flex; align-items: center; justify-content: center; }
        .wtx { min-width: 0; }
        .nm { color: var(--text); font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .simb { color: #9cc4f5; background: rgba(47,129,247,.14); border: 1px solid rgba(47,129,247,.4); border-radius: 10px; padding: 0 7px; font-size: 10.5px; font-weight: 600; }
        .cnt { color: var(--text-faint); font-size: 12px; margin-top: 1px; }
        .chg { color: var(--st-unconfirmed); }
        .hact { display: flex; align-items: center; gap: 8px; flex: none; }
        .save { height: 32px; padding: 0 16px; border-radius: 8px; background: var(--primary); border: 1px solid var(--primary); color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer; animation: popin .18s ease; }
        @keyframes popin { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: none; } }
        .save:hover { filter: brightness(1.08); } .save:disabled { opacity: .6; cursor: default; }
        .x { background: transparent; border: none; color: var(--text-dim); font-size: 15px; cursor: pointer; width: 30px; height: 30px; border-radius: 7px; }
        .x:hover { color: var(--text); background: var(--surface-2); }
        .bd { padding: 14px 18px 18px; overflow: auto; }
        .now { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
        .nchip { display: inline-flex; align-items: center; gap: 7px; background: rgba(87,185,138,.12); border: 1px solid rgba(87,185,138,.4); color: var(--text);
          border-radius: 16px; padding: 4px 6px 4px 11px; font-size: 12px; cursor: pointer; transition: all .12s; }
        .nchip:hover { background: rgba(229,83,75,.12); border-color: rgba(229,83,75,.45); }
        .nm2 { font-weight: 600; } .nmin { color: var(--text-faint); font-size: 10.5px; }
        .nx { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,.06); color: var(--text-dim); font-size: 13px; line-height: 1; }
        .nchip:hover .nx { color: var(--danger); }
        .searchwrap { position: relative; margin-bottom: 10px; display: flex; align-items: center; }
        .searchwrap .si { position: absolute; left: 11px; color: var(--text-faint); pointer-events: none; }
        .search { width: 100%; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 8px; height: 36px; padding: 0 30px 0 32px; color: var(--text); font-size: 13px; outline: none; }
        .search:focus { border-color: var(--primary); }
        .sx { position: absolute; right: 8px; background: transparent; border: none; color: var(--text-faint); font-size: 16px; cursor: pointer; }
        .sx:hover { color: var(--text); }
        .load { color: var(--text-faint); font-size: 13px; padding: 16px 0; text-align: center; }
        .list { display: flex; flex-direction: column; gap: 6px; }
        .min { border: 1px solid var(--border); border-radius: 9px; overflow: hidden; }
        .mh { display: flex; align-items: center; gap: 9px; width: 100%; background: var(--surface-2); border: none; padding: 10px 12px; cursor: pointer; transition: background .12s; }
        .mh:hover { background: var(--surface-3); }
        .car { color: var(--text-faint); font-size: 10px; transition: transform .15s; } .car.col { transform: rotate(-90deg); }
        .mn { color: var(--text); font-size: 13.5px; font-weight: 600; flex: 1; text-align: left; }
        .mb { background: rgba(87,185,138,.18); color: var(--product); border-radius: 20px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
        .mc { color: var(--text-faint); font-size: 11px; }
        .pos { display: flex; flex-wrap: wrap; gap: 7px; padding: 11px 12px; animation: posin .16s ease; }
        @keyframes posin { from { opacity: 0; } to { opacity: 1; } }
        .chip { display: inline-flex; align-items: center; gap: 5px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          border-radius: 16px; padding: 5px 12px; font-size: 12.5px; cursor: pointer; transition: all .12s; }
        .chip:hover { color: var(--text); border-color: var(--primary); transform: translateY(-1px); }
        .chip.on { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
        .ck { font-size: 11px; }
        .cf { position: absolute; inset: 0; z-index: 2; background: rgba(0,0,0,.5); border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 20px; animation: ov .12s ease; }
        .cfbox { width: 380px; max-width: 100%; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 11px; padding: 18px; box-shadow: 0 16px 40px rgba(0,0,0,.5); }
        .cft { color: var(--text); font-size: 15px; font-weight: 600; margin-bottom: 6px; }
        .cfs { color: var(--text-dim); font-size: 13px; line-height: 1.5; margin-bottom: 16px; }
        .cfa { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
        .cfkeep, .cfsave, .cfdiscard { height: 34px; padding: 0 14px; border-radius: 8px; font-size: 13px; cursor: pointer; border: 1px solid var(--border-strong); }
        .cfkeep { background: var(--surface-2); color: var(--text-dim); } .cfkeep:hover { color: var(--text); }
        .cfsave { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
        .cfdiscard { background: transparent; border-color: rgba(229,83,75,.5); color: #f0a7a2; } .cfdiscard:hover { background: rgba(229,83,75,.12); }
      `}</style>
    </div>
  );
}
