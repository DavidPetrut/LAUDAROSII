"use client";
/**
 * EditPersonModal — „Editing Scheduled Person" (ca în PCO, poza 261).
 * Avatar + nume + email + poziția editată · segment Confirmed/Pending/Declined ·
 * Team/Position (afișate) · Notes · Service/Rehearsal Times (bifate) ·
 * timeline Notifications (Prepared → Sent → Read → Pending) · Remove / Cancel / Save.
 * Totul se salvează LOCAL (updateAssignment) — ZERO email trimis de aici.
 */
import { useEffect, useState } from "react";
import PersonAvatar from "./PersonAvatar";
import { plansApi } from "@/lib/api/client";

const SEG = [["confirmed", "Confirmed"], ["unconfirmed", "Pending"], ["declined", "Declined"]];

export default function EditPersonModal({ person, onClose, onSave, onRemove }) {
  const [status, setStatus] = useState(person?.status || "unconfirmed");
  const [notes, setNotes] = useState(person?.notes || "");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [notesTouched, setNotesTouched] = useState(false);

  // detaliu real (email + Service/Rehearsal Times + timeline). Nu pt. optimistul temporar („tmp-…").
  useEffect(() => {
    const real = person?.assignmentId && !String(person.assignmentId).startsWith("tmp-");
    if (!real || !person?.planId) return;
    let alive = true;
    plansApi.getAssignment(person.planId, person.assignmentId)
      .then((d) => { if (!alive) return; setDetail(d); if (!notesTouched && d.notes != null) setNotes(d.notes); })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [person?.planId, person?.assignmentId]);

  if (!person) return null;
  const info = { ...person, ...(detail || {}) }; // date reale suprascriu partialul
  const tl = info.timeline || {};
  const hasTl = tl.preparedAt || tl.sentAt || tl.readAt || tl.respondedAt;

  async function save() {
    setBusy(true);
    try { await onSave({ status, notes }); } finally { setBusy(false); }
  }

  return (
    <div className="ov" onClick={onClose}>
      <div className="dlg" onClick={(e) => e.stopPropagation()}>
        <div className="dlg-top">
          <h3>Editing Scheduled Person</h3>
          <button className="dlg-x" onClick={onClose} aria-label="Închide">×</button>
        </div>

        <div className="who">
          <PersonAvatar person={person} size={46} showBadge={false} />
          <div className="who-t">
            <div className="who-n">{person.name}</div>
            {info.email && <div className="who-e">{info.email}</div>}
            {(info.teamName || info.positionName) && (
              <div className="who-r">{[info.positionName, info.teamName].filter(Boolean).join(" · ")}</div>
            )}
          </div>
        </div>

        <div className="cols">
          <div className="colL">
            <div className="seg">
              {SEG.map(([v, l]) => (
                <button key={v} className={`seg-b ${status === v ? "on " + v : ""}`} onClick={() => setStatus(v)}>{l}</button>
              ))}
            </div>

            {(info.teamName || info.positionName) && (
              <div className="frow2">
                <label className="fl">Team<div className="fv">{info.teamName || "—"}</div></label>
                <label className="fl">Position<div className="fv">{info.positionName || "—"}</div></label>
              </div>
            )}

            <label className="fl full">Notes
              <textarea className="fnotes" value={notes} onChange={(e) => { setNotes(e.target.value); setNotesTouched(true); }} placeholder="Notă internă (opțional)…" />
            </label>
          </div>

          <div className="colR">
            {(info.serviceTimes?.length > 0) && (
              <div className="tgroup">
                <div className="tg-l">Service Times</div>
                {info.serviceTimes.map((t, i) => (
                  <label key={i} className="tck"><input type="checkbox" checked={t.checked !== false} readOnly />{t.label}</label>
                ))}
              </div>
            )}
            {(info.rehearsalTimes?.length > 0) && (
              <div className="tgroup">
                <div className="tg-l">Rehearsal Times</div>
                {info.rehearsalTimes.map((t, i) => (
                  <label key={i} className="tck"><input type="checkbox" checked={t.checked !== false} readOnly />{t.label}</label>
                ))}
              </div>
            )}
            <div className="tgroup">
              <div className="tg-l">Notifications</div>
              {hasTl ? (
                <div className="tl">
                  {[["Prepared", tl.preparedAt], ["Sent", tl.sentAt], ["Read", tl.readAt], ["Responded", tl.respondedAt]].map(([label, when]) => (
                    <div key={label} className={`tl-step ${when ? "done" : ""}`}>
                      <span className="tl-dot" /><span className="tl-l">{label}</span><span className="tl-w">{when || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="tl-none">Niciun email trimis încă. Emailurile le trimiteți voi manual.</div>}
            </div>
          </div>
        </div>

        <div className="act">
          <button className="btn-rm" onClick={onRemove} disabled={busy}>Remove</button>
          <div className="act-r">
            <button className="btn-cl" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn-sv" onClick={save} disabled={busy}>{busy ? "Se salvează…" : "Save"}</button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ov { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 80; }
        .dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 12px; padding: 20px 22px; width: 620px; max-width: 94vw; max-height: 90vh; overflow: auto; }
        .dlg-top { display: flex; align-items: center; justify-content: space-between; }
        .dlg-top h3 { margin: 0; font-size: 17px; color: var(--text); }
        .dlg-x { background: transparent; border: none; color: var(--text-faint); font-size: 22px; cursor: pointer; line-height: 1; }
        .dlg-x:hover { color: var(--text); }
        .who { display: flex; align-items: center; gap: 12px; margin: 16px 0 18px; }
        .who-n { color: var(--text); font-size: 15px; font-weight: 600; }
        .who-e { color: var(--text-dim); font-size: 12.5px; }
        .who-r { color: var(--text-faint); font-size: 12px; margin-top: 2px; }
        .cols { display: flex; gap: 22px; }
        .colL { flex: 1; min-width: 0; } .colR { width: 210px; flex: none; }
        .seg { display: flex; border: 1px solid var(--border-strong); border-radius: 8px; overflow: hidden; }
        .seg-b { flex: 1; background: var(--surface-2); border: none; color: var(--text-dim); padding: 9px 0; cursor: pointer; font-size: 13px; border-right: 1px solid var(--border-strong); }
        .seg-b:last-child { border-right: none; }
        .seg-b.on.confirmed { background: var(--st-confirmed); color: #0b2018; font-weight: 600; }
        .seg-b.on.unconfirmed { background: var(--st-unconfirmed); color: #1d1600; font-weight: 600; }
        .seg-b.on.declined { background: var(--st-declined); color: #fff; font-weight: 600; }
        .frow2 { display: flex; gap: 12px; margin-top: 14px; }
        .fl { display: block; color: var(--text-faint); font-size: 11px; letter-spacing: .3px; flex: 1; }
        .fl.full { margin-top: 14px; }
        .fv { color: var(--text); font-size: 13px; margin-top: 4px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; padding: 8px 10px; }
        .fnotes { width: 100%; margin-top: 5px; min-height: 64px; resize: vertical; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; padding: 8px 10px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; }
        .fnotes:focus { border-color: var(--primary); }
        .tgroup { margin-bottom: 16px; }
        .tg-l { color: var(--text-faint); font-size: 11px; letter-spacing: .4px; margin-bottom: 8px; }
        .tck { display: flex; align-items: center; gap: 7px; color: var(--text-dim); font-size: 12.5px; padding: 3px 0; }
        .tl { display: flex; flex-direction: column; gap: 10px; }
        .tl-step { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-faint); }
        .tl-step.done { color: var(--text-dim); }
        .tl-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-strong); flex: none; }
        .tl-step.done .tl-dot { background: var(--product); }
        .tl-l { flex: 1; } .tl-w { color: var(--text-faint); }
        .tl-none { color: var(--text-faint); font-size: 12px; line-height: 1.5; }
        .act { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; }
        .act-r { display: flex; gap: 10px; }
        .btn-rm { background: transparent; border: 1px solid var(--danger); color: var(--danger); border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 13px; }
        .btn-rm:hover { background: rgba(229,83,75,.12); }
        .btn-cl { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 8px 18px; cursor: pointer; font-size: 13px; }
        .btn-sv { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 6px; padding: 8px 20px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .btn-sv:disabled, .btn-rm:disabled { opacity: .6; cursor: default; }
      `}</style>
    </div>
  );
}
