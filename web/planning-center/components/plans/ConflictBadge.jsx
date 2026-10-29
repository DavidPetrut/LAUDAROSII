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
import { useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export default function ConflictBadge({ items = [], onVerify, canVerify = true, icon, below = false }) {
  const [tip, setTip] = useState(null);   // rect-ul iconiței {left,right,top,bottom} sau null
  const [pos, setPos] = useState(null);   // poziția calculată (clamp în ecran) {left,top}
  const ref = useRef(null);
  const tipRef = useRef(null);
  const timer = useRef(null);
  const types = [...new Set(items.map((i) => i.type))];

  const show = () => { clearTimeout(timer.current); if (!ref.current) return; const r = ref.current.getBoundingClientRect(); setTip({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }); };
  const hideSoon = () => { clearTimeout(timer.current); timer.current = setTimeout(() => { setTip(null); setPos(null); }, 160); };
  const keep = () => clearTimeout(timer.current);

  // poziționare SUS-STÂNGA lângă iconiță, mereu în ecran (sidebar e pe marginea dreaptă → centrul ieșea afară).
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return;
    const t = tipRef.current.getBoundingClientRect();
    const m = 8;
    let left, top;
    if (below) {                                   // DEDESUBT (ex. status-uri sus de tot în Matrix): centrat sub iconiță
      left = (tip.left + tip.right) / 2 - t.width / 2;
      top = tip.bottom + 6;
    } else {                                        // default: SUS-STÂNGA lângă iconiță (sidebar e pe marginea dreaptă)
      left = tip.right - t.width;
      top = tip.top - t.height - 6;
      if (top < m) top = tip.bottom + 6;            // nu încape sus → sub iconiță
    }
    left = Math.max(m, Math.min(left, window.innerWidth - t.width - m));
    top = Math.max(m, Math.min(top, window.innerHeight - t.height - m));
    setPos({ left, top });
  }, [tip, below]);

  if (!items.length) return null;

  return (
    <span ref={ref} className="cfb" onMouseEnter={show} onMouseLeave={hideSoon} onClick={(e) => e.stopPropagation()}>
      {types.map((t, i) => (
        <img key={i} className="cfb-ic" src={icon || (t === "blockout" ? "/icons/warn-red.png" : "/icons/warn-yellow.png")} alt={t} draggable={false} />
      ))}
      {tip && typeof document !== "undefined" && createPortal((
        <div ref={tipRef} className="cfb-tip" style={{ left: pos ? pos.left : tip.left, top: pos ? pos.top : tip.top, visibility: pos ? "visible" : "hidden" }} onMouseEnter={keep} onMouseLeave={hideSoon}>
          {items.map((c, i) => (
            <div key={i} className="cfb-row">
              <span className={`cfb-b ${c.type}`}>
                <img className="cfb-ti" src={icon || (c.type === "blockout" ? "/icons/warn-red.png" : "/icons/warn-yellow.png")} alt="" draggable={false} />
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
        .cfb-tip { position: fixed; z-index: 220;
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
