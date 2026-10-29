"use client";
/**
 * ProblemsModal — anomalii din import PCO: oameni cu BLOCKOUT care sunt ȘI asignați la o slujire în aceeași zi.
 * DOAR INFO (se rezolvă manual contactând omul). Singura acțiune oferită: scoaterea slujirii (nu atingem blockout-ul).
 * Fiecare om = un card (un row). În dreapta fiecărei slujiri un „×" cu validare inline. După scoatere, dacă omul
 * rămâne doar cu blockout (fără slujiri) → dispare automat (părintele re-fetch-uiește lista → auto-refresh). ZERO email.
 *
 * props: open, day, people:[{id,name,avatar,initials,blockout:{label,reason}, servings:[{assignmentId,planId,position,team,serviceTypeName,status}]}],
 *        busy, onRemoveServing(serving, person), onClose
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PersonAvatar from "./PersonAvatar";

export default function ProblemsModal({ open, day, people = [], busy, onRemoveServing, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [confirmId, setConfirmId] = useState(null); // assignmentId pt. care cer confirmarea scoaterii
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose?.(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);
  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal((
    <div className="pm-ov" onClick={() => !busy && onClose?.()}>
      <div className="pm-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="pm-top">
          <span className="pm-ic"><img src="/icons/semnul-exclamari-rosu.png" alt="" width="20" height="20" /></span>
          <div className="pm-th">
            <div className="pm-title">Probleme{people.length ? ` · ${people.length}` : ""}</div>
            <div className="pm-sub">Anomalii din import: blockout + slujire în aceeași zi{day ? ` · ${day}` : ""} — doar info, se rezolvă manual</div>
          </div>
          <button className="pm-x" disabled={busy} onClick={onClose} aria-label="Închide">×</button>
        </div>

        <div className="pm-body">
          {people.length === 0 ? (
            <div className="pm-empty">Nicio problemă — totul e curat.</div>
          ) : people.map((p) => (
            <div key={p.id} className="pm-card">
              <div className="pm-who">
                <PersonAvatar person={p} size={40} showBadge={false} />
                <div className="pm-wt">
                  <div className="pm-wn">{p.name}</div>
                  <div className="pm-wblk">
                    <img className="pm-blki" src="/icons/semnul-exclamari-rosu.png" alt="" />
                    Blockout {p.blockout?.label}{p.blockout?.reason ? ` · ${p.blockout.reason}` : ""}
                  </div>
                </div>
              </div>
              <div className="pm-serv">
                {(p.servings || []).map((s) => (
                  <div key={String(s.assignmentId)} className="pm-srow">
                    <div className="pm-st">
                      <div className="pm-spos">{[s.position, s.team].filter(Boolean).join(" · ") || "Slujire"}</div>
                      {s.serviceTypeName ? <div className="pm-ssub">{s.serviceTypeName}</div> : null}
                    </div>
                    {confirmId === String(s.assignmentId) ? (
                      <div className="pm-cf">
                        <span className="pm-cft">Scoți pe {p.name.split(" ")[0]} de la „{s.position}"?</span>
                        <button className="pm-cfno" disabled={busy} onClick={() => setConfirmId(null)}>Nu</button>
                        <button className="pm-cfyes" disabled={busy} onClick={() => { setConfirmId(null); onRemoveServing?.(s, p); }}>Scoate</button>
                      </div>
                    ) : (
                      <button className="pm-rm" disabled={busy} title="Scoate de la slujire" onClick={() => setConfirmId(String(s.assignmentId))}>×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .pm-ov { position: fixed; inset: 0; background: rgba(0,0,0,.58); z-index: 140; display: flex; align-items: center; justify-content: center; padding: 20px; animation: pmov .14s ease; }
        @keyframes pmov { from { opacity: 0; } to { opacity: 1; } }
        .pm-dlg { background: var(--modal-bg); border: 1px solid rgba(248,81,73,.45); border-radius: 14px; width: 560px; max-width: 95vw; max-height: 86vh; display: flex; flex-direction: column; box-shadow: 0 26px 70px rgba(0,0,0,.55); animation: pmin .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes pmin { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
        .pm-top { display: flex; align-items: flex-start; gap: 11px; padding: 16px 18px 14px; border-bottom: 1px solid var(--border); }
        .pm-ic { width: 34px; height: 34px; flex: none; border-radius: 9px; background: rgba(248,81,73,.16); display: inline-flex; align-items: center; justify-content: center; }
        .pm-th { flex: 1; min-width: 0; }
        .pm-title { color: #ff9a94; font-size: 15px; font-weight: 800; letter-spacing: .3px; }
        .pm-sub { color: var(--text-faint); font-size: 11.5px; margin-top: 2px; line-height: 1.4; }
        .pm-x { flex: none; background: transparent; border: none; color: var(--text-faint); font-size: 23px; line-height: 1; cursor: pointer; padding: 0 3px; }
        .pm-x:hover { color: var(--text); } .pm-x:disabled { opacity: .5; cursor: default; }
        .pm-body { overflow: auto; padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 12px; }
        .pm-empty { color: var(--text-faint); font-size: 13px; text-align: center; padding: 26px 0; }
        .pm-card { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 12px; padding: 13px 14px; display: flex; flex-direction: column; gap: 11px; }
        .pm-who { display: flex; align-items: center; gap: 12px; }
        .pm-wn { color: var(--text); font-size: 15px; font-weight: 600; }
        .pm-wblk { display: inline-flex; align-items: center; gap: 6px; color: #ff9a94; font-size: 12px; margin-top: 2px; }
        .pm-blki { width: 14px; height: 14px; object-fit: contain; }
        .pm-serv { display: flex; flex-direction: column; gap: 7px; border-top: 1px dashed var(--border); padding-top: 11px; }
        .pm-srow { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 9px; padding: 9px 11px; }
        .pm-st { flex: 1; min-width: 0; }
        .pm-spos { color: var(--text); font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pm-ssub { color: var(--text-faint); font-size: 11.5px; margin-top: 1px; }
        .pm-rm { flex: none; width: 28px; height: 28px; border-radius: 7px; background: transparent; border: 1px solid var(--border-strong); color: var(--text-faint); font-size: 18px; line-height: 1; cursor: pointer; transition: color .12s, border-color .12s, background .12s; }
        .pm-rm:hover { color: var(--danger); border-color: var(--danger); background: rgba(248,81,73,.1); }
        .pm-rm:disabled { opacity: .5; cursor: default; }
        .pm-cf { display: flex; align-items: center; gap: 8px; flex: none; }
        .pm-cft { color: var(--text-dim); font-size: 11.5px; }
        .pm-cfno { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; height: 28px; padding: 0 11px; font-size: 12px; cursor: pointer; }
        .pm-cfno:hover { color: var(--text); }
        .pm-cfyes { background: var(--danger); border: 1px solid var(--danger); color: #fff; border-radius: 6px; height: 28px; padding: 0 13px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .pm-cfyes:hover { filter: brightness(1.08); }
        .pm-cfno:disabled, .pm-cfyes:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  ), document.body);
}
