"use client";
/**
 * CoverageBar — „Listă LIVE" ca BARĂ DE JOS (collapse/expand din josul ecranului), nu tab extern.
 * Arată persoanele grupate după câte ori sunt planificate în interval (Neplanificați / 1× / 2× / 3× / 4×+),
 * cu „mai poate ×N" (de câte ori mai poate fi asignat = max − alocat − blocat). Se actualizează LIVE cât
 * planifici și e RESPONSIVE la poziția selectată (aduce slujirea/SIM-ul potrivit). Cardurile se pot TRAGE
 * direct într-o celulă din matrix (drag&drop). View-uri în stânga: Toți / Neplanificați / Planificați.
 */
import { useState } from "react";
import PersonAvatar from "./PersonAvatar";

const VIEWS = [
  { id: "all", label: "Toți", keep: () => true },
  { id: "un", label: "Neplanificați", keep: (b) => b.times === 0 },
  { id: "pl", label: "Planificați", keep: (b) => b.times > 0 },
];

export default function CoverageBar({ open, onToggle, cov, loading, selLabel, onPersonDragStart, onPersonDragEnd, onRefresh }) {
  const [view, setView] = useState("all");
  const buckets = (cov?.buckets || []).filter(VIEWS.find((v) => v.id === view).keep);
  const total = cov?.total || 0;

  return (
    <div className={`covbar ${open ? "open" : ""}`}>
      {/* mâner (mereu vizibil) */}
      <button className="cb-handle" onClick={onToggle} title={open ? "Închide" : "Deschide lista live"}>
        <span className="cb-grip" />
        <span className="cb-ht">👥 Persoane — listă live {selLabel ? `· ${selLabel}` : ""}</span>
        <span className="cb-hn">{total} în pool</span>
        <span className="cb-caret">{open ? "▾" : "▴"}</span>
      </button>

      {open && (
        <div className="cb-body">
          <div className="cb-nav">
            {VIEWS.map((v) => (
              <button key={v.id} className={`cb-view ${view === v.id ? "on" : ""}`} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
            <div className="cb-legend">„mai poate ×N" = de câte ori mai poate fi asignat (liber, fără blockout). <span className="blk">⛔</span> = planuri blocate.</div>
            <button className="cb-refresh" onClick={onRefresh} title="Împrospătează">⟳</button>
          </div>
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
                      title={`${p.name} — trage în matrix pentru a asigna`}>
                      <PersonAvatar person={p} size={24} showBadge={false} />
                      <span className="cb-name">{p.name}</span>
                      <span className="cb-meta">
                        {p.free > 0 && <span className="free">×{p.free}</span>}
                        {p.blocked > 0 && <span className="blk">⛔{p.blocked}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .covbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 48; background: var(--surface); border-top: 1px solid var(--border-strong); box-shadow: 0 -8px 24px rgba(0,0,0,.3); transition: height .2s ease; height: 40px; display: flex; flex-direction: column; }
        .covbar.open { height: 44vh; }
        .cb-handle { height: 40px; flex: none; display: flex; align-items: center; gap: 12px; background: var(--surface-2); border: none; border-bottom: 1px solid var(--border); color: var(--text); cursor: pointer; padding: 0 16px; font-size: 13px; }
        .cb-grip { width: 34px; height: 4px; border-radius: 3px; background: var(--border-strong); }
        .cb-ht { font-weight: 600; } .cb-hn { color: var(--text-dim); font-size: 12px; } .cb-caret { margin-left: auto; color: var(--text-faint); }
        .cb-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .cb-nav { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--border); }
        .cb-view { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 20px; padding: 4px 14px; font-size: 12.5px; cursor: pointer; }
        .cb-view.on { background: var(--primary); border-color: var(--primary); color: #fff; }
        .cb-legend { color: var(--text-faint); font-size: 11px; margin-left: 10px; } .cb-legend .blk { color: var(--danger); }
        .cb-refresh { margin-left: auto; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); width: 30px; height: 28px; border-radius: 6px; cursor: pointer; }
        .cb-refresh:hover { color: var(--text); border-color: var(--primary); }
        .cb-cols { flex: 1; display: flex; gap: 12px; align-items: flex-start; overflow: auto; padding: 12px 16px; }
        .cb-muted { color: var(--text-faint); padding: 20px; }
        .cb-col { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; width: 232px; flex: none; max-height: 100%; display: flex; flex-direction: column; }
        .cb-col.col0 { border-color: var(--primary); box-shadow: 0 0 0 1px rgba(47,129,247,.25); }
        .cb-ch { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--text); font-weight: 600; font-size: 12.5px; }
        .cb-col.col0 .cb-ch { background: var(--section-head-bg); border-radius: 10px 10px 0 0; }
        .cb-cn { color: var(--text-dim); font-size: 11px; background: var(--surface-2); border-radius: 20px; padding: 1px 8px; }
        .cb-list { overflow: auto; padding: 5px; }
        .cb-empty { color: var(--text-faint); font-size: 12px; text-align: center; padding: 10px; }
        .cb-card { display: flex; align-items: center; gap: 8px; padding: 5px 7px; border-radius: 7px; cursor: grab; }
        .cb-card:hover { background: rgba(255,255,255,.05); }
        .cb-card:active { cursor: grabbing; opacity: .6; }
        .cb-name { color: var(--text); font-size: 12.5px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cb-meta { display: flex; align-items: center; gap: 5px; flex: none; }
        .free { color: var(--product); font-size: 10px; border: 1px solid rgba(87,185,138,.5); border-radius: 10px; padding: 0 6px; }
        .blk { color: var(--danger); font-size: 10.5px; }
      `}</style>
    </div>
  );
}
