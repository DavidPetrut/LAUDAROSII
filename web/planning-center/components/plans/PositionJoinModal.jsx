"use client";
/**
 * PositionJoinModal — apare când asignezi un om REAL pe o poziție din care NU face parte (nu e în roster).
 * Aceeași familie vizuală ca modalul SIM 1↔SIM 2. Două decizii:
 *   · Guest (doar azi) — rămâne pe planul ăsta, NU intră în roster; logăm (→ „guest de N ori aici").
 *   · Adaugă pe poziție — intră oficial în rosterul poziției; de acum apare la Fit/recomandări.
 * Închiderea (× / Escape / click-afară) NU scrie nimic (asignarea e „staged" până alegi) — anulează.
 * Folosită IDENTIC în Matrix și în Teams. Portal în body + centrată. ZERO email.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PersonAvatar from "./PersonAvatar";

export default function PositionJoinModal({ data, busy, onGuest, onPermanent, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!data) return;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose?.(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [data, busy, onClose]);
  if (!data || !mounted || typeof document === "undefined") return null;
  const { person, positionName, teamName } = data;
  return createPortal((
    <div className="pj-ov" onClick={() => !busy && onClose?.()}>
      <div className="pj-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="pj-top">
          <span className="pj-ic">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.4" /><path d="M3.5 20v-1a5 5 0 0 1 5-5h1" /><path d="M18 13v6M15 16h6" /></svg>
          </span>
          <span className="pj-title" title={positionName}>{positionName}</span>
          <button className="pj-x" disabled={busy} onClick={onClose} aria-label="Anulează">×</button>
        </div>

        <div className="pj-who">
          <PersonAvatar person={person} size={44} showBadge={false} />
          <div className="pj-wt">
            <div className="pj-n">{person?.name}</div>
            <div className="pj-sub">prima dată pe poziția asta</div>
          </div>
        </div>
        <div className="pj-q">Persoana nu face parte din <b>{positionName}</b>{teamName ? <> · <b>{teamName}</b></> : null}. Cum o adaugi?</div>

        <div className="pj-opts">
          <button className="pj-opt guest" disabled={busy} onClick={onGuest}>
            <span className="pj-ot">Guest</span>
            <span className="pj-od">Doar azi. Rămâne pe poziția asta, nu intră în roster și logăm că a fost guest aici.</span>
          </button>
          <button className="pj-opt perm" disabled={busy} onClick={onPermanent}>
            <span className="pj-ot"><svg className="pj-plus" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>Poziție</span>
            <span className="pj-od">Intră oficial în rosterul poziției. De acum apare la recomandări, în toate săptămânile.</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .pj-ov { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 130; display: flex; align-items: center; justify-content: center; padding: 16px; animation: pjov .14s ease; }
        @keyframes pjov { from { opacity: 0; } to { opacity: 1; } }
        .pj-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 13px; padding: 20px 22px; width: 440px; max-width: 94vw; box-shadow: 0 24px 64px rgba(0,0,0,.5); animation: pjin .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes pjin { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
        .pj-top { display: flex; align-items: center; gap: 11px; margin-bottom: 16px; }
        .pj-ic { width: 34px; height: 34px; flex: none; border-radius: 9px; background: rgba(139,92,246,.16); color: #b38eff; display: inline-flex; align-items: center; justify-content: center; }
        .pj-title { flex: 1; min-width: 0; color: var(--text); font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pj-x { flex: none; background: transparent; border: none; color: var(--text-faint); font-size: 23px; line-height: 1; cursor: pointer; padding: 0 3px; border-radius: 6px; }
        .pj-x:hover { color: var(--text); } .pj-x:disabled { opacity: .5; cursor: default; }
        .pj-who { display: flex; align-items: center; gap: 12px; margin-bottom: 13px; }
        .pj-n { color: var(--text); font-size: 15px; font-weight: 600; }
        .pj-sub { color: var(--text-faint); font-size: 12px; margin-top: 1px; }
        .pj-q { color: var(--text-dim); font-size: 13.5px; line-height: 1.55; } .pj-q b { color: var(--text); }
        .pj-opts { display: flex; flex-direction: column; gap: 9px; margin-top: 16px; }
        .pj-opt { text-align: left; display: flex; flex-direction: column; gap: 3px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: border-color .13s, background .13s, transform .12s; }
        .pj-opt:hover { transform: translateY(-1px); }
        .pj-opt.guest:hover { border-color: rgba(201,162,39,.6); background: rgba(201,162,39,.07); }
        .pj-opt.perm:hover { border-color: rgba(139,92,246,.6); background: rgba(139,92,246,.08); }
        .pj-opt:disabled { opacity: .55; cursor: default; transform: none; }
        .pj-ot { display: inline-flex; align-items: center; gap: 6px; color: var(--text); font-size: 13.5px; font-weight: 700; }
        .pj-opt.guest .pj-ot { color: #d7c27a; } .pj-opt.perm .pj-ot { color: #c9b6f2; }
        .pj-plus { flex: none; }
        .pj-od { color: var(--text-faint); font-size: 11.5px; line-height: 1.45; }
      `}</style>
    </div>
  ), document.body);
}
