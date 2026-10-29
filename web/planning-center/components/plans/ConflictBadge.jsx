"use client";
/**
 * ConflictBadge — iconițele de conflict (⚠ galben = planificat / roșu = blockout) + tooltip + „Verifică".
 * COMPONENT REUTILIZABIL: folosit identic în sidebar-ul de asignare ȘI în „Listă live".
 * La hover → tooltip (fix, portal în body, nu se taie de scroll) cu detaliile + butonul „Verifică".
 * Click pe „Verifică" → onVerify() (deschide ConflictModal cu aceeași logică peste tot). ZERO email.
 *
 * props:
 *   items: [{ type: "time"|"blockout", label, detail? }] — ce conflicte are persoana (pt. iconițe + tooltip)
 *   onVerify: () => void — deschide modalul de conflicte
 *   canVerify: bool — arată butonul „Verifică" (ai o poziție selectată)
 */
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ConflictBadge({ items = [], onVerify, canVerify = true }) {
  const [tip, setTip] = useState(null); // { x, y } sau null
  const ref = useRef(null);
  const timer = useRef(null);
  const types = [...new Set(items.map((i) => i.type))];

  const show = () => { clearTimeout(timer.current); if (!ref.current) return; const r = ref.current.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top }); };
  const hideSoon = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setTip(null), 160); };
  const keep = () => clearTimeout(timer.current);

  if (!items.length) return null;

  return (
    <span ref={ref} className="cfb" onMouseEnter={show} onMouseLeave={hideSoon} onClick={(e) => e.stopPropagation()}>
      {types.map((t, i) => (
        <img key={i} className="cfb-ic" src={t === "blockout" ? "/icons/warn-red.png" : "/icons/warn-yellow.png"} alt={t} draggable={false} />
      ))}
      {tip && typeof document !== "undefined" && createPortal((
        <div className="cfb-tip" style={{ left: tip.x, top: tip.y }} onMouseEnter={keep} onMouseLeave={hideSoon}>
          {items.map((c, i) => (
            <div key={i} className="cfb-row">
              <span className={`cfb-b ${c.type}`}>
                <img className="cfb-ti" src={c.type === "blockout" ? "/icons/warn-red.png" : "/icons/warn-yellow.png"} alt="" draggable={false} />
                {c.label || (c.type === "blockout" ? "Blockout" : "Planificat în aceeași zi")}
              </span>
              {c.detail ? <span className="cfb-d">{c.detail}</span> : null}
            </div>
          ))}
          {canVerify && onVerify && (
            <button className="cfb-verify" onClick={() => { setTip(null); onVerify(); }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="7" r="4.5" /><path d="M14 14l-3.2-3.2" /></svg>
              Verifică
            </button>
          )}
        </div>
      ), document.body)}

      <style jsx>{`
        .cfb { display: inline-flex; align-items: center; gap: 3px; flex: none; cursor: pointer; padding: 2px; margin: -2px; }
        .cfb-ic { width: 15px; height: 15px; object-fit: contain; display: block; }
        .cfb-tip { position: fixed; z-index: 220; transform: translate(-50%, calc(-100% - 8px));
          background: #0c1016; border: 1px solid var(--border-strong); border-radius: 9px; padding: 9px 11px;
          box-shadow: 0 10px 30px rgba(0,0,0,.55); min-width: 180px; max-width: 270px; display: flex; flex-direction: column; gap: 8px; animation: cfbin .12s ease; }
        @keyframes cfbin { from { opacity: 0; } to { opacity: 1; } }
        .cfb-row { display: flex; flex-direction: column; gap: 2px; }
        .cfb-b { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; }
        .cfb-b.blockout { color: var(--danger); } .cfb-b.time { color: var(--st-unconfirmed); }
        .cfb-ti { width: 13px; height: 13px; object-fit: contain; }
        .cfb-d { color: var(--text-dim); font-size: 11.5px; padding-left: 19px; line-height: 1.4; }
        .cfb-verify { margin-top: 2px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%;
          background: rgba(47,129,247,.14); border: 1px solid var(--primary); color: #9cc4f5; border-radius: 7px; height: 30px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .12s, color .12s; }
        .cfb-verify:hover { background: var(--primary); color: #fff; }
      `}</style>
    </span>
  );
}
