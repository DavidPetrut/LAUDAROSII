"use client";
/**
 * ConflictModal — „Verifică" pe o persoană cu conflicte. Modală mare, centrată.
 * Sus: persoana (poză + nume + ziua). Apoi:
 *   · CONFLICTE DE SLUJIRE — un card per asignare din aceeași zi: service type · echipă · poziție · dată.
 *     Fiecare card: „Reasignează" (dropdown cu oameni care fit poziția → swap) sau „Scoate" (unassign).
 *   · BLOCKOUT-URI — separat, dedesubt, cu ROȘU (doar afișare, fără acțiuni).
 * După orice acțiune: refetch → cardul rezolvat dispare (real-time). ZERO email.
 */
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PersonAvatar from "./PersonAvatar";
import { plansApi } from "@/lib/api/client";

export default function ConflictModal({ open, planId, person, positionId, onClose, onResolved, onReassignOpen, onReassignClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reOn, setReOn] = useState(null);      // assignmentId al cardului în mod reassign
  const [confirmRm, setConfirmRm] = useState(null); // assignmentId al cardului cu confirmarea „Scoate"
  const [manualOn, setManualOn] = useState(null);   // assignmentId al cardului cu „adaugă manual" deschis
  const [dropOver, setDropOver] = useState(null);   // assignmentId al cardului peste care se trage (highlight)
  const [cand, setCand] = useState([]);        // candidați (fit poziția) pt. cardul deschis
  const [candLoading, setCandLoading] = useState(false);
  const [candQ, setCandQ] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    if (!person?.id || !planId) return;
    try { setData(await plansApi.personConflicts(planId, { personId: person.id, positionId })); }
    catch { setData({ person, conflicts: [], blockouts: [] }); }
    finally { setLoading(false); }
  }, [planId, person, positionId]);

  useEffect(() => { if (open) { setLoading(true); setReOn(null); setCandQ(""); fetchData(); } }, [open, fetchData]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") { if (reOn) { setReOn(null); setManualOn(null); onReassignClose?.(); } else onClose?.(); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [open, reOn, onClose, onReassignClose]);
  // când modalul se închide (unmount) → închide și bara de reasignare
  useEffect(() => () => { onReassignClose?.(); }, []); // eslint-disable-line

  // deschide reassign pe un card → încarcă candidații care fit poziția (roster-first, ca în recommend)
  const openReassign = useCallback(async (c, q = "") => {
    setReOn(c.assignmentId); setCandQ(q); setCandLoading(true); setCand([]);
    try {
      const r = await plansApi.recommend(c.planId, { teamId: c.teamId, positionId: c.positionId, q });
      const people = (r.groups || []).flatMap((g) => g.people || []).filter((p) => String(p.id) !== String(person.id));
      setCand(people.slice(0, 40));
    } catch { setCand([]); } finally { setCandLoading(false); }
  }, [person]);

  // căutare în dropdown (debounced simplu prin re-fetch)
  useEffect(() => {
    if (!reOn) return;
    const card = (data?.conflicts || []).find((c) => String(c.assignmentId) === String(reOn));
    if (!card) return;
    const t = setTimeout(() => openReassign(card, candQ), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [candQ]);

  async function removeFrom(c) {
    setBusy(true);
    try { await plansApi.unassign(c.planId, c.assignmentId); await fetchData(); onResolved?.(); }
    catch {} finally { setBusy(false); setReOn(null); }
  }
  async function reassignTo(c, newPerson) {
    setBusy(true);
    try {
      await plansApi.assign(c.planId, { personId: newPerson.id, teamId: c.teamId, positionId: c.positionId, status: "unconfirmed" });
      await plansApi.unassign(c.planId, c.assignmentId);
      await fetchData(); onResolved?.();
    } catch {} finally { setBusy(false); setReOn(null); setManualOn(null); onReassignClose?.(); }
  }

  if (!open || !mounted || typeof document === "undefined") return null;
  const conflicts = data?.conflicts || [];
  const blockouts = data?.blockouts || [];
  const nothing = !loading && conflicts.length === 0 && blockouts.length === 0;

  return createPortal((
    <div className={`cm-ov ${reOn ? "lifted" : ""}`} onClick={() => !busy && onClose?.()}>
      <div className="cm-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="cm-head">
          <div className="cm-who">
            <PersonAvatar person={person} size={48} showBadge={false} />
            <div className="cm-wt">
              <div className="cm-n">{person?.name}</div>
              <div className="cm-sub">{data?.dayLabel ? `Conflicte · ${data.dayLabel}` : "Conflicte"}</div>
            </div>
          </div>
          <button className="cm-x" onClick={onClose} aria-label="Închide">×</button>
        </div>

        <div className="cm-body">
          {loading && <div className="cm-muted">Se încarcă…</div>}
          {nothing && <div className="cm-ok">✓ Niciun conflict rămas — totul e curat.</div>}

          {conflicts.length > 0 && (
            <div className="cm-sec">
              <div className="cm-sh"><img className="cm-shic" src="/icons/warn-yellow.png" alt="" />Slujire <span className="cm-cn">{conflicts.length}</span></div>
              {conflicts.map((c) => (
                <div key={String(c.assignmentId)} className="cm-card">
                  <div className="cm-crow">
                    <div className="cm-cmain">
                      <div className="cm-ctitle">
                        <span className="cm-pos">{c.positionName}</span>
                        <span className={`cm-st ${c.status === "confirmed" ? "ok" : "pend"}`}>{c.status === "confirmed" ? "confirmat" : "neconfirmat"}</span>
                      </div>
                      <div className="cm-cmeta">
                        {c.serviceTypeName && <span>{c.serviceTypeName}</span>}
                        {c.teamName && <span className="cm-dot">·</span>}{c.teamName && <span>{c.teamName}</span>}
                        <span className="cm-dot">·</span><span className="cm-date">{c.dateLabel}</span>
                      </div>
                    </div>
                    <div className="cm-cact">
                      <button className={`cm-re ${reOn === c.assignmentId ? "on" : ""}`} disabled={busy} onClick={() => {
                        setConfirmRm(null);
                        if (reOn === c.assignmentId) { setReOn(null); setManualOn(null); onReassignClose?.(); }
                        else { setReOn(c.assignmentId); setManualOn(null); onReassignOpen?.(c); }
                      }}>Reasignează</button>
                      <button className="cm-rm" disabled={busy} onClick={() => { setReOn(null); setManualOn(null); onReassignClose?.(); setConfirmRm(c.assignmentId); }} title="Scoate-l de pe această slujire">Scoate</button>
                    </div>
                  </div>

                  {confirmRm === c.assignmentId && (
                    <div className="cm-confirm">
                      <span className="cm-cfq">Îl scoți pe <b>{person?.name}</b> de pe <b>{c.positionName}</b> ({c.dateLabel})?</span>
                      <div className="cm-cfa">
                        <button className="cm-cfno" disabled={busy} onClick={() => setConfirmRm(null)}>Anulează</button>
                        <button className="cm-cfyes" disabled={busy} onClick={() => { setConfirmRm(null); removeFrom(c); }}>Da, scoate</button>
                      </div>
                    </div>
                  )}

                  {reOn === c.assignmentId && (
                    <div className="cm-reassign">
                      <div className={`cm-drop ${dropOver === c.assignmentId ? "over" : ""}`}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (dropOver !== c.assignmentId) setDropOver(c.assignmentId); }}
                        onDragLeave={() => setDropOver(null)}
                        onDrop={(e) => { e.preventDefault(); setDropOver(null); try { const raw = e.dataTransfer.getData("application/pc-person"); if (raw) reassignTo(c, JSON.parse(raw)); } catch {} }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                        <span>Trage o persoană din <b>Listă live</b> aici ca s-o pui în locul lui</span>
                      </div>
                      <button className="cm-manualbtn" onClick={() => { if (manualOn === c.assignmentId) setManualOn(null); else { setManualOn(c.assignmentId); openReassign(c, ""); } }}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
                        Adaugă manual
                      </button>
                      {manualOn === c.assignmentId && (
                        <div className="cm-manual">
                          <input className="cm-search" autoFocus placeholder="caută orice persoană…" value={candQ} onChange={(e) => setCandQ(e.target.value)} />
                          <div className="cm-cands">
                            {candLoading && <div className="cm-muted sm">Se caută…</div>}
                            {!candLoading && cand.length === 0 && <div className="cm-muted sm">Niciun candidat.</div>}
                            {cand.map((p) => (
                              <button key={String(p.id)} className="cm-cand" disabled={busy} onClick={() => reassignTo(c, p)} title="Pune-l în locul lui (swap)">
                                <PersonAvatar person={p} size={24} showBadge={false} />
                                {p.inRoster && <span className="cm-rost" title="În rosterul poziției" />}
                                <span className="cm-candn">{p.name}</span>
                                {(p.conflicts?.length > 0 || p.conflict) && <span className="cm-cwarn" title="Și el are un conflict">⚠</span>}
                                <span className="cm-swap">↔ pune</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {blockouts.length > 0 && (
            <div className="cm-sec">
              <div className="cm-sh blk">Blockout-uri <span className="cm-cn blk">{blockouts.length}</span></div>
              {blockouts.map((b, i) => (
                <div key={i} className="cm-blk">
                  <span className="cm-blkdot" />
                  <span className="cm-blkd">{b.label}</span>
                  {b.reason && <span className="cm-blkr">{b.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .cm-ov { position: fixed; inset: 0; background: rgba(0,0,0,.58); z-index: 95; display: flex; align-items: center; justify-content: center; padding: 20px; animation: cmov .14s ease; transition: align-items .2s; }
        @keyframes cmov { from { opacity: 0; } to { opacity: 1; } }
        /* mod reasignare: modalul urcă sus, iar Listă live (46vh) stă DEDESUBT, ca element distinct */
        .cm-ov.lifted { align-items: flex-start; padding-top: 26px; }
        .cm-ov.lifted .cm-dlg { max-height: calc(52vh - 40px); }
        .cm-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 14px; width: 900px; max-width: 94vw; max-height: 88vh; display: flex; flex-direction: column;
          box-shadow: 0 30px 80px rgba(0,0,0,.55); animation: cmin .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes cmin { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
        .cm-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); flex: none; }
        .cm-who { display: flex; align-items: center; gap: 13px; }
        .cm-n { color: var(--text); font-size: 17px; font-weight: 600; }
        .cm-sub { color: var(--text-faint); font-size: 12.5px; margin-top: 2px; }
        .cm-x { background: transparent; border: none; color: var(--text-faint); font-size: 24px; line-height: 1; cursor: pointer; padding: 0 4px; }
        .cm-x:hover { color: var(--text); }
        .cm-body { padding: 16px 20px 20px; overflow: auto; display: flex; flex-direction: column; gap: 18px; }
        .cm-muted { color: var(--text-faint); font-size: 13px; padding: 12px 2px; } .cm-muted.sm { padding: 8px 2px; font-size: 12px; }
        .cm-ok { color: var(--product); font-size: 14px; padding: 18px 2px; font-weight: 600; }
        .cm-sec { display: flex; flex-direction: column; gap: 9px; }
        .cm-sh { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 12px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; }
        .cm-shic { width: 15px; height: 15px; object-fit: contain; }
        .cm-sh.blk { color: var(--danger); }
        .cm-cn { color: var(--text-dim); background: var(--surface-2); border-radius: 20px; padding: 0 8px; font-size: 11px; font-weight: 700; }
        .cm-cn.blk { color: var(--danger); background: rgba(248,81,73,.12); }
        .cm-card { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 11px; overflow: hidden; }
        .cm-crow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 15px; }
        .cm-cmain { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .cm-ctitle { display: flex; align-items: center; gap: 9px; }
        .cm-pos { color: var(--text); font-size: 14px; font-weight: 700; }
        .cm-st { font-size: 10px; font-weight: 700; border-radius: 20px; padding: 1px 8px; border: 1px solid; }
        .cm-st.ok { color: var(--product); border-color: rgba(87,185,138,.5); background: rgba(87,185,138,.1); }
        .cm-st.pend { color: var(--st-unconfirmed); border-color: rgba(210,153,34,.5); background: rgba(210,153,34,.1); }
        .cm-cmeta { display: flex; align-items: center; gap: 6px; color: var(--text-dim); font-size: 12.5px; flex-wrap: wrap; }
        .cm-dot { color: var(--text-faint); }
        .cm-date { color: var(--text); font-weight: 600; }
        .cm-cact { display: flex; align-items: center; gap: 8px; flex: none; }
        .cm-re { background: rgba(47,129,247,.14); border: 1px solid var(--primary); color: #9cc4f5; border-radius: 7px; height: 32px; padding: 0 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .12s; }
        .cm-re:hover { background: var(--primary); color: #fff; }
        .cm-rm { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; height: 32px; padding: 0 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color .12s, color .12s; }
        .cm-rm:hover { color: var(--danger); border-color: rgba(248,81,73,.55); }
        .cm-re:disabled, .cm-rm:disabled, .cm-cand:disabled { opacity: .55; cursor: default; }
        .cm-confirm { border-top: 1px solid var(--border); padding: 11px 13px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: rgba(248,81,73,.06); animation: cmex .16s ease; flex-wrap: wrap; }
        .cm-cfq { color: var(--text-dim); font-size: 12.5px; } .cm-cfq b { color: var(--text); }
        .cm-cfa { display: flex; gap: 8px; flex: none; }
        .cm-cfno { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; height: 30px; padding: 0 13px; font-size: 12.5px; cursor: pointer; }
        .cm-cfno:hover { color: var(--text); }
        .cm-cfyes { background: var(--danger); border: 1px solid var(--danger); color: #fff; border-radius: 7px; height: 30px; padding: 0 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .cm-cfyes:hover { filter: brightness(1.08); }
        .cm-cfno:disabled, .cm-cfyes:disabled { opacity: .55; cursor: default; }
        .cm-reassign { border-top: 1px solid var(--border); padding: 11px 13px; display: flex; flex-direction: column; gap: 9px; background: var(--bg); animation: cmex .16s ease; }
        .cm-drop { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 14px; border: 1.5px dashed var(--border-strong); border-radius: 10px; color: var(--text-dim); font-size: 12.5px; text-align: center; transition: border-color .13s, background .13s, color .13s; }
        .cm-drop b { color: var(--text); }
        .cm-drop.over { border-color: var(--primary); background: rgba(47,129,247,.1); color: var(--text); }
        .cm-drop svg { flex: none; color: var(--text-faint); }
        .cm-drop.over svg { color: var(--primary); }
        .cm-manualbtn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; align-self: flex-start; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 8px; height: 32px; padding: 0 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: color .12s, border-color .12s; }
        .cm-manualbtn:hover { color: var(--text); border-color: var(--primary); }
        .cm-manual { display: flex; flex-direction: column; gap: 7px; }
        @keyframes cmex { from { opacity: 0; } to { opacity: 1; } }
        .cm-search { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 7px; height: 32px; padding: 0 10px; color: var(--text); outline: none; font-size: 12.5px; }
        .cm-search:focus { border-color: var(--primary); }
        .cm-cands { display: flex; flex-direction: column; gap: 1px; max-height: 190px; overflow: auto; }
        .cm-cand { display: flex; align-items: center; gap: 9px; background: transparent; border: none; padding: 7px 8px; border-radius: 7px; cursor: pointer; text-align: left; }
        .cm-cand:hover { background: rgba(255,255,255,.06); }
        .cm-rost { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--product); box-shadow: 0 0 0 2px rgba(87,185,138,.22); }
        .cm-candn { color: var(--text); font-size: 13px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cm-cwarn { color: var(--st-unconfirmed); font-size: 12px; flex: none; }
        .cm-swap { flex: none; color: var(--product); font-size: 11.5px; font-weight: 700; opacity: 0; transition: opacity .12s; }
        .cm-cand:hover .cm-swap { opacity: 1; }
        .cm-blk { display: flex; align-items: center; gap: 10px; padding: 10px 13px; background: rgba(248,81,73,.07); border: 1px solid rgba(248,81,73,.3); border-radius: 9px; }
        .cm-blkdot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--danger); }
        .cm-blkd { color: #ff9a94; font-size: 13px; font-weight: 600; flex: none; }
        .cm-blkr { color: var(--text-dim); font-size: 12.5px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  ), document.body);
}
