"use client";
/**
 * ReplaceModal — apare când asignezi pe o poziție PLINĂ (needed = 0, fără slot liber).
 * „Needed" devine o limită reală: în loc să adaugi persoana ca extra, alegi pe cine înlocuiești.
 * Vezi ocupantul/ocupanții (poză MARE + nume + poziție), selectezi unul → „Înlocuiește" (el devine
 * declined, tăiat; noul om intră în locul lui). Sau „Adaugă extra" (îl pui oricum pe lângă). ZERO email.
 *
 * props: data = { person, occupants:[{assignmentId,personId,name,avatar,initials}], positionName, teamName }
 *        busy, onReplace(occupant), onExtra(), onClose()
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PersonAvatar from "./PersonAvatar";

export default function ReplaceModal({ data, busy, onReplace, onExtra, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [sel, setSel] = useState(null); // assignmentId selectat
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (data) setSel(data.occupants?.length === 1 ? data.occupants[0].assignmentId : null); }, [data]);
  useEffect(() => {
    if (!data) return;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose?.(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [data, busy, onClose]);
  if (!data || !mounted || typeof document === "undefined") return null;
  const { person, occupants = [], positionName, teamName } = data;
  const posLabel = `${positionName || "Poziție"}${teamName ? ` · ${teamName}` : ""}`;
  const chosen = occupants.find((o) => String(o.assignmentId) === String(sel));

  return createPortal((
    <div className="rm-ov" onClick={() => !busy && onClose?.()}>
      <div className="rm-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="rm-top">
          <span className="rm-ic"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5h9l-2-2M14 11H5l2 2" /></svg></span>
          <span className="rm-title">{posLabel}</span>
          <button className="rm-x" disabled={busy} onClick={onClose} aria-label="Anulează">×</button>
        </div>

        <div className="rm-who">
          <PersonAvatar person={person} size={40} showBadge={false} />
          <div className="rm-wt"><div className="rm-wn">{person?.name}</div><div className="rm-wsub">poziția e plină — pe cine înlocuiești?</div></div>
        </div>

        <div className="rm-list">
          {occupants.map((o) => (
            <button key={String(o.assignmentId)} type="button" className={`rm-occ ${String(sel) === String(o.assignmentId) ? "on" : ""}`} disabled={busy} onClick={() => setSel(o.assignmentId)}>
              <PersonAvatar person={o} size={46} showBadge={false} />
              <div className="rm-ot"><div className="rm-on">{o.name}</div><div className="rm-os">slujește pe {positionName}</div></div>
              <span className="rm-radio">{String(sel) === String(o.assignmentId) ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3.2L13 5" /></svg> : null}</span>
            </button>
          ))}
        </div>

        <div className="rm-act">
          <button className="rm-extra" disabled={busy} onClick={onExtra}>Adaugă extra</button>
          <button className="rm-replace" disabled={busy || !chosen} onClick={() => chosen && onReplace(chosen)}>
            {chosen ? `Înlocuiește pe ${chosen.name.split(" ")[0]}` : "Înlocuiește"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .rm-ov { position: fixed; inset: 0; background: rgba(0,0,0,.58); z-index: 110; display: flex; align-items: center; justify-content: center; padding: 18px; animation: rmov .14s ease; }
        @keyframes rmov { from { opacity: 0; } to { opacity: 1; } }
        .rm-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 14px; width: 460px; max-width: 94vw; box-shadow: 0 26px 70px rgba(0,0,0,.55); animation: rmin .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes rmin { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
        .rm-top { display: flex; align-items: center; gap: 11px; padding: 16px 18px 0; }
        .rm-ic { width: 34px; height: 34px; flex: none; border-radius: 9px; background: rgba(47,129,247,.16); color: #9ecbff; display: inline-flex; align-items: center; justify-content: center; }
        .rm-title { flex: 1; min-width: 0; color: var(--text); font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rm-x { flex: none; background: transparent; border: none; color: var(--text-faint); font-size: 23px; line-height: 1; cursor: pointer; padding: 0 3px; }
        .rm-x:hover { color: var(--text); } .rm-x:disabled { opacity: .5; cursor: default; }
        .rm-who { display: flex; align-items: center; gap: 12px; padding: 14px 18px 4px; }
        .rm-wn { color: var(--text); font-size: 15px; font-weight: 600; }
        .rm-wsub { color: var(--text-faint); font-size: 12px; margin-top: 1px; }
        .rm-list { display: flex; flex-direction: column; gap: 7px; padding: 12px 18px; max-height: 320px; overflow: auto; }
        .rm-occ { display: flex; align-items: center; gap: 13px; background: var(--surface-2); border: 1.5px solid var(--border-strong); border-radius: 11px; padding: 11px 13px; cursor: pointer; text-align: left; transition: border-color .13s, background .13s; }
        .rm-occ:hover { border-color: var(--text-faint); }
        .rm-occ.on { border-color: var(--primary); background: rgba(47,129,247,.1); }
        .rm-occ:disabled { opacity: .6; cursor: default; }
        .rm-ot { flex: 1; min-width: 0; }
        .rm-on { color: var(--text); font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rm-os { color: var(--text-faint); font-size: 12px; margin-top: 1px; }
        .rm-radio { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border-strong); display: inline-flex; align-items: center; justify-content: center; color: #fff; }
        .rm-occ.on .rm-radio { background: var(--primary); border-color: var(--primary); }
        .rm-act { display: flex; gap: 10px; justify-content: flex-end; padding: 6px 18px 18px; }
        .rm-extra { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 8px; height: 38px; padding: 0 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: color .12s, border-color .12s; }
        .rm-extra:hover { color: var(--text); border-color: var(--text-faint); }
        .rm-replace { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 8px; height: 38px; padding: 0 18px; font-size: 13px; font-weight: 700; cursor: pointer; transition: filter .12s; }
        .rm-replace:hover { filter: brightness(1.08); }
        .rm-extra:disabled, .rm-replace:disabled { opacity: .5; cursor: default; filter: none; }
      `}</style>
    </div>
  ), document.body);
}
