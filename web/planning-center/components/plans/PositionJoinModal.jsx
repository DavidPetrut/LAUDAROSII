"use client";
/**
 * PositionJoinModal — apare când asignezi un om REAL pe o poziție din care NU face parte (nu e în roster).
 * Aceeași familie vizuală ca modalul SIM 1↔SIM 2. Două decizii:
 *   · Guest (doar azi) — rămâne pe planul ăsta, NU intră în roster; logăm (→ „guest de N ori aici").
 *   · Adaugă pe poziție — intră oficial în rosterul poziției; de acum apare la Fit/recomandări.
 * Închiderea (× / „Nu acum") lasă asignarea ca atare (nici guest-log, nici roster) — decizi mai târziu.
 * Folosită IDENTIC în Matrix și în Teams. ZERO email.
 */
import PersonAvatar from "./PersonAvatar";

export default function PositionJoinModal({ data, busy, onGuest, onPermanent, onClose }) {
  if (!data) return null;
  const { person, positionName, teamName } = data;
  return (
    <div className="pj-ov" onClick={() => !busy && onClose?.()}>
      <div className="pj-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="pj-ic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.4" /><path d="M3.5 20v-1a5 5 0 0 1 5-5h1" /><path d="M18 13v6M15 16h6" /></svg>
        </div>
        <div className="pj-who">
          <PersonAvatar person={person} size={44} showBadge={false} />
          <div className="pj-wt">
            <div className="pj-n">{person?.name}</div>
            <div className="pj-sub">prima dată pe poziția asta</div>
          </div>
        </div>
        <div className="pj-q"><b>{person?.name}</b> nu face parte din <b>{positionName}</b>{teamName ? <> · <b>{teamName}</b></> : null}. Cum îl adaugi?</div>

        <div className="pj-opts">
          <button className="pj-opt guest" disabled={busy} onClick={onGuest}>
            <span className="pj-ot">Doar azi · guest</span>
            <span className="pj-od">Rămâne doar pe data asta. Nu intră în roster, dar logăm că a fost guest aici.</span>
          </button>
          <button className="pj-opt perm" disabled={busy} onClick={onPermanent}>
            <span className="pj-ot">Adaugă pe poziție</span>
            <span className="pj-od">Intră oficial în rosterul poziției. De acum apare la recomandări, în toate săptămânile.</span>
          </button>
        </div>

        <button className="pj-later" disabled={busy} onClick={onClose}>Nu acum — lasă-l doar aici</button>
      </div>

      <style jsx>{`
        .pj-ov { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 90; display: flex; align-items: center; justify-content: center; padding: 16px; animation: pjov .14s ease; }
        @keyframes pjov { from { opacity: 0; } to { opacity: 1; } }
        .pj-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 13px; padding: 20px 22px; width: 440px; max-width: 94vw; box-shadow: 0 24px 64px rgba(0,0,0,.5); animation: pjin .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes pjin { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
        .pj-ic { width: 38px; height: 38px; border-radius: 10px; background: rgba(139,92,246,.16); color: #b38eff; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
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
        .pj-ot { color: var(--text); font-size: 13.5px; font-weight: 700; }
        .pj-opt.guest .pj-ot { color: #d7c27a; } .pj-opt.perm .pj-ot { color: #c9b6f2; }
        .pj-od { color: var(--text-faint); font-size: 11.5px; line-height: 1.45; }
        .pj-later { margin-top: 13px; width: 100%; background: transparent; border: none; color: var(--text-faint); font-size: 12.5px; cursor: pointer; padding: 6px; border-radius: 7px; }
        .pj-later:hover { color: var(--text-dim); background: rgba(255,255,255,.04); }
        .pj-later:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  );
}
