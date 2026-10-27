"use client";
/**
 * CoverageBar — „Listă LIVE" ca BARĂ DE JOS (collapse/expand din jos, animație).
 * Header: „Listă live" + TAG-uri de filtre colorate (slujire / gen / SIM), fiecare cu × de scos.
 * Navigație VIEW-uri în stânga (Toți / Neplanificați / Planificați). Coloane după câte ori e planificat
 * (0/1/2/3/4×+) cu „mai poate ×N" (max − alocat − blocat). Carduri trăgibile direct în Matrix.
 * Nu are buton de refresh — se actualizează LIVE. Nu acoperă sidebar-ul (inset prin `style`).
 */
import { useState } from "react";
import PersonAvatar from "./PersonAvatar";

const VIEWS = [
  { id: "all", label: "Toți", keep: () => true },
  { id: "un", label: "Neplanificați", keep: (b) => b.times === 0 },
  { id: "pl", label: "Planificați", keep: (b) => b.times > 0 },
];

/* culoare stabilă per slujire (din nume) */
function hueOf(s = "") { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function simOf(name = "") { const m = String(name).match(/\((\d)\)\s*$/); return m ? m[1] : ""; }

export default function CoverageBar({ open, onToggle, cov, loading, filters = {}, onRemoveFilter, onPersonDragStart, onPersonDragEnd, style }) {
  const [view, setView] = useState("all");

  // filtrare client-side: gen + SIM (slujirea se filtrează în backend prin teamId)
  const keepPerson = (p) => {
    if (filters.gender && p.gender && p.gender !== filters.gender) return false;
    if (filters.sim && simOf(p.name) && simOf(p.name) !== filters.sim) return false;
    return true;
  };
  const buckets = (cov?.buckets || [])
    .filter(VIEWS.find((v) => v.id === view).keep)
    .map((b) => ({ ...b, people: (b.people || []).filter(keepPerson) }));
  const total = buckets.reduce((s, b) => s + b.people.length, 0);

  const mh = filters.ministry ? hueOf(filters.ministry.name) : 0;

  return (
    <div className={`covbar ${open ? "open" : ""}`} style={style}>
      {/* mâner */}
      <div className="cb-handle" onClick={onToggle}>
        <span className="cb-grip" />
        <span className="cb-ht">Listă live</span>
        {filters.ministry && (
          <span className="cb-tag min" style={{ "--h": mh }} onClick={(e) => { e.stopPropagation(); onRemoveFilter?.("ministry"); }} title="Scoate filtrul de slujire">
            {filters.ministry.name}<span className="tx">×</span>
          </span>
        )}
        {filters.gender && (
          <span className="cb-tag gen" onClick={(e) => { e.stopPropagation(); onRemoveFilter?.("gender"); }} title="Scoate filtrul de gen">
            {filters.gender === "M" ? "Băieți" : "Fete"}<span className="tx">×</span>
          </span>
        )}
        {filters.sim && (
          <span className="cb-tag sim" onClick={(e) => { e.stopPropagation(); onRemoveFilter?.("sim"); }} title="Scoate filtrul SIM">
            SIM {filters.sim}<span className="tx">×</span>
          </span>
        )}
        <span className="cb-hn">{total} persoane</span>
        <span className="cb-caret">{open ? "▾" : "▴"}</span>
      </div>

      {open && (
        <div className="cb-body">
          <nav className="cb-nav">
            {VIEWS.map((v) => (
              <button key={v.id} className={`cb-view ${view === v.id ? "on" : ""}`} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
            <div className="cb-legend"><b>×N</b> = de câte ori mai poate fi asignat · <span className="blk">⛔</span> blocate</div>
          </nav>
          <div className="cb-cols">
            {loading && !cov && <div className="cb-muted">Se încarcă…</div>}
            {buckets.map((b) => (
              <div key={b.times} className={`cb-col ${b.times === 0 ? "col0" : ""}`}>
                <div className="cb-ch"><span>{b.label}</span><span className="cb-cn">{b.people.length}</span></div>
                <div className="cb-list">
                  {b.people.length === 0 && <div className="cb-empty">—</div>}
                  {b.people.map((p) => (
                    <div key={p.id} className="cb-card" draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; onPersonDragStart?.(p); }}
                      onDragEnd={() => onPersonDragEnd?.()}
                      title={`${p.name} — trage în Matrix pentru a asigna`}>
                      <PersonAvatar person={p} size={26} showBadge={false} />
                      <span className="cb-name">{p.name}</span>
                      {p.free > 0 && <span className="cb-free">×{p.free}</span>}
                      {p.blocked > 0 && <span className="cb-blk" title={`${p.blocked} planuri blocate`}>⛔{p.blocked}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .covbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 46; background: var(--surface);
          border-top: 1px solid var(--border-strong); border-radius: 12px 12px 0 0;
          box-shadow: 0 -10px 30px rgba(0,0,0,.34); transition: height .22s cubic-bezier(.4,0,.2,1), left .16s, right .16s;
          height: var(--cbar-h); display: flex; flex-direction: column; }
        .covbar.open { height: 46vh; }
        .cb-handle { height: var(--cbar-h); flex: none; display: flex; align-items: center; gap: 10px; background: var(--surface-2);
          border-bottom: 1px solid var(--border); border-radius: 12px 12px 0 0; color: var(--text); cursor: pointer; padding: 0 18px; font-size: 13px; }
        .cb-grip { width: 36px; height: 4px; border-radius: 3px; background: var(--border-strong); flex: none; }
        .cb-ht { font-weight: 700; letter-spacing: .2px; }
        .cb-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; border-radius: 20px; padding: 3px 6px 3px 11px; cursor: pointer; white-space: nowrap; }
        .cb-tag .tx { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; font-size: 12px; opacity: .8; }
        .cb-tag:hover .tx { opacity: 1; background: rgba(255,255,255,.18); }
        .cb-tag.min { color: hsl(var(--h) 70% 82%); background: hsl(var(--h) 55% 22%); border: 1px solid hsl(var(--h) 60% 42%); }
        .cb-tag.gen { color: #d7c27a; background: rgba(201,162,39,.16); border: 1px solid rgba(201,162,39,.45); }
        .cb-tag.sim { color: #9cc4f5; background: rgba(47,129,247,.16); border: 1px solid rgba(47,129,247,.45); }
        .cb-hn { color: var(--text-dim); font-size: 12px; margin-left: auto; }
        .cb-caret { color: var(--text-faint); }
        .cb-body { flex: 1; display: flex; min-height: 0; }
        .cb-nav { width: 180px; flex: none; border-right: 1px solid var(--border); padding: 12px 10px; display: flex; flex-direction: column; gap: 4px; }
        .cb-view { text-align: left; background: transparent; border: none; color: var(--text-dim); border-radius: 7px; padding: 9px 12px; cursor: pointer; font-size: 13.5px; }
        .cb-view:hover { background: rgba(255,255,255,.05); color: var(--text); }
        .cb-view.on { background: var(--surface-3); color: var(--text); font-weight: 600; box-shadow: inset 0 0 0 1px var(--border-strong); }
        .cb-legend { margin-top: auto; color: var(--text-faint); font-size: 11px; line-height: 1.5; padding: 8px 4px 0; }
        .cb-legend b { color: var(--product); } .cb-legend .blk { color: var(--danger); }
        .cb-cols { flex: 1; display: flex; gap: 12px; align-items: stretch; overflow-x: auto; padding: 12px 16px; }
        .cb-muted { color: var(--text-faint); padding: 20px; }
        .cb-col { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; width: 236px; flex: none; display: flex; flex-direction: column; }
        .cb-col.col0 { border-color: rgba(47,129,247,.5); }
        .cb-ch { display: flex; align-items: center; justify-content: space-between; padding: 10px 13px; border-bottom: 1px solid var(--border); color: var(--text); font-weight: 600; font-size: 12.5px; flex: none; }
        .cb-col.col0 .cb-ch { background: rgba(47,129,247,.1); border-radius: 10px 10px 0 0; }
        .cb-cn { color: var(--text-dim); font-size: 11px; background: var(--surface-2); border-radius: 20px; padding: 1px 9px; min-width: 24px; text-align: center; }
        .cb-list { overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 1px; }
        .cb-empty { color: var(--text-faint); font-size: 12px; text-align: center; padding: 14px; }
        .cb-card { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 8px; cursor: grab; transition: background .1s; }
        .cb-card:hover { background: rgba(255,255,255,.055); }
        .cb-card:active { cursor: grabbing; opacity: .5; }
        .cb-name { color: var(--text); font-size: 13px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cb-free { flex: none; color: #0b2018; background: var(--product); border-radius: 20px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
        .cb-blk { flex: none; color: var(--danger); font-size: 11px; font-weight: 600; }
      `}</style>
    </div>
  );
}
