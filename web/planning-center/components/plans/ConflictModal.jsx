"use client";
/**
 * ConflictModal — „Verifică" pe o persoană cu conflicte. Modală mare, centrată, TRANZACȚIONALĂ.
 * Toate schimbările sunt STAGED (nimic în DB) până la „Update". X fără Update = undo la tot (cu confirmare).
 *
 * Sus: persoana (poză + nume + ziua) + buton „Update" (constant) + X.
 * CONFLICTE DE SLUJIRE — un card per asignare din aceeași zi. Pe fiecare:
 *   · „Scoate" → stage unassign (rezolvă conflictul scoțând persoana de acolo).
 *   · „Înlocuiește" → flux în 2 pași:
 *       PAS 1 „Rezolvă conflict" — cine o înlocuiește pe poziția conflictului (drag din Listă live / adaugă manual).
 *       PAS 2 „Înlocuiește" (opțional) — o pune pe persoana asta pe poziția SELECTATĂ în Matrix, înlocuind ocupantul.
 * BLOCKOUT-URI — separat, dedesubt, cu ROȘU (doar afișare).
 * Listă live (Matrix) se deschide la „Înlocuiește" și se închide doar la final. ZERO email.
 */
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PersonAvatar from "./PersonAvatar";
import PositionJoinModal from "./PositionJoinModal";
import { plansApi, peopleApi } from "@/lib/api/client";

// SIM-ul din numele echipei: „Asimilare (SIM 1)" → "1"; fără SIM → ""
const simOf = (name = "") => { const m = String(name).match(/\(\s*(?:sim\s*)?([12])\s*\)/i); return m ? m[1] : ""; };

export default function ConflictModal({ open, planId, person, positionId, target, simPair, onClose, onResolved, onReassignOpen, onReassignClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [ops, setOps] = useState([]);            // schimbări staged: {id,k,label,...}
  const [flowCard, setFlowCard] = useState(null); // cardul în flux „Înlocuiește" (assignmentId) | null
  const [flowStep, setFlowStep] = useState(1);    // 1 = rezolvă conflict, 2 = înlocuiește pe poziția selectată
  const [manualOn, setManualOn] = useState(false);
  const [dropOver, setDropOver] = useState(false);
  const [cand, setCand] = useState([]);
  const [candLoading, setCandLoading] = useState(false);
  const [candQ, setCandQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmX, setConfirmX] = useState(false);
  const [pendingPick, setPendingPick] = useState(null); // om nou pe poziție → decizie guest/permanent (staged)
  const [pendingSim, setPendingSim] = useState(null);   // oferta „pune și la SIM-ul pereche" (staged)
  const [recTip, setRecTip] = useState(null);           // assignmentId cu tooltip-ul de recomandare SIM deschis

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    if (!person?.id || !planId) return;
    try { setData(await plansApi.personConflicts(planId, { personId: person.id, positionId })); }
    catch { setData({ person, conflicts: [], blockouts: [] }); }
    finally { setLoading(false); }
  }, [planId, person, positionId]);

  useEffect(() => { if (open) { setLoading(true); setOps([]); setFlowCard(null); setFlowStep(1); setManualOn(false); setCandQ(""); fetchData(); } }, [open, fetchData]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !pendingPick) attemptClose(); }; // modalul nested își tratează Esc singur
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [open, ops, flowCard, saving, pendingPick]);
  useEffect(() => () => { onReassignClose?.(); }, []); // eslint-disable-line

  // candidați pt. pasul 1 (înlocuitor pe poziția conflictului) — roster-first, exclude persoana curentă
  const loadCand = useCallback(async (c, q = "") => {
    setCandLoading(true); setCand([]);
    try {
      const r = await plansApi.recommend(c.planId, { teamId: c.teamId, positionId: c.positionId, q });
      setCand((r.groups || []).flatMap((g) => g.people || []).filter((p) => String(p.id) !== String(person.id)).slice(0, 40));
    } catch { setCand([]); } finally { setCandLoading(false); }
  }, [person]);
  useEffect(() => {
    if (!flowCard || !manualOn) return;
    const card = (data?.conflicts || []).find((c) => String(c.assignmentId) === String(flowCard));
    if (!card) return;
    const t = setTimeout(() => loadCand(card, candQ), 250); return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [candQ, manualOn]);

  const addOp = (op) => setOps((o) => [...o, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...op }]);
  const undoOp = (id) => setOps((o) => o.filter((x) => x.id !== id));

  // ── acțiuni (doar STAGE — nimic în DB până la Update) ──
  function stageRemove(c) { // scoate persoana de pe o slujire în conflict
    addOp({ k: "unassign", planId: c.planId, assignmentId: c.assignmentId, card: c.assignmentId,
      label: `Scoate ${person.name} de pe ${c.positionName}` });
  }
  function startFlow(c) { setFlowCard(c.assignmentId); setFlowStep(1); setManualOn(false); setCandQ(""); onReassignOpen?.(c, person.id); }
  function closeFlow() { setFlowCard(null); setFlowStep(1); setManualOn(false); onReassignClose?.(); }
  // om nou pe poziție? (inRoster știut din recommend/coverage, altfel întreabă serverul; la eșec → arată modalul)
  async function needsJoin(p, posId) {
    if (!p?.id) return false;
    if (p.inRoster === true) return false;
    if (p.inRoster === false) return true;
    try { return (await plansApi.isRoster(posId, p.id))?.inRoster === false; } catch { return true; }
  }
  const normP = (p) => ({ id: p.id, name: p.name, avatar: p.avatar || "", initials: p.initials || "", inRoster: p.inRoster });
  // pick (drag/manual) în pasul 1 → înlocuitor pe poziția conflictului
  function pickReplace(c, repl) { beginPick({ kind: "step1", c, person: normP(repl), teamId: c.teamId, positionId: c.positionId, positionName: c.positionName, teamName: c.teamName, planId: c.planId }); }
  // pasul 2 → persoana (Diana) pe poziția selectată
  function pickTarget() { if (!target?.positionId) return; beginPick({ kind: "step2", person: normP(person), teamId: target.teamId, positionId: target.positionId, positionName: target.positionName, teamName: target.teamName || "", planId: target.planId }); }
  // lanț: 1) om nou? → guest/permanent  2) echipă SIM cu pereche liberă? → oferă și acolo  3) stage
  async function beginPick(ctx) {
    if (await needsJoin(ctx.person, ctx.positionId)) { setPendingPick(ctx); return; }
    afterJoin(ctx, null);
  }
  function afterJoin(ctx, join) {
    const pair = simPair ? simPair(ctx.teamName, ctx.positionName, ctx.planId, ctx.person.id) : null;
    if (pair) { setPendingSim({ ctx, join, pair }); return; }
    commitPick(ctx, join, null);
  }
  function commitPick(ctx, join, pair) {
    if (ctx.kind === "step1") stageReplaceOnConflict(ctx.c, ctx.person, join);
    else stageAssignToTarget(join);
    if (pair) addOp({ k: "assign", planId: ctx.planId, teamId: pair.pairTeamId, positionId: pair.pairPositionId, inPersonId: ctx.person.id, inPerson: ctx.person, join: null, label: `${ctx.person.name} și la ${pair.pairTeamName}` });
  }
  function resolvePendingJoin(join) { const pp = pendingPick; setPendingPick(null); if (pp) afterJoin(pp, join); }
  function resolvePendingSim(yes) { const ps = pendingSim; setPendingSim(null); if (ps) commitPick(ps.ctx, ps.join, yes ? ps.pair : null); }
  function stageReplaceOnConflict(c, repl, join) { // pasul 1: pune `repl` în locul persoanei pe poziția conflictului
    addOp({ k: "swap", planId: c.planId, teamId: c.teamId, positionId: c.positionId,
      outAssignmentId: c.assignmentId, inPersonId: repl.id, inPerson: repl, join: join || null, card: c.assignmentId,
      label: `${repl.name} în locul lui ${person.name} pe ${c.positionName}` });
    setManualOn(false); setFlowStep(2); // trece la pasul 2 (opțional)
  }
  function stageAssignToTarget(join) { // pasul 2: pune persoana (Diana) pe poziția SELECTATĂ, înlocuind ocupantul
    if (!target?.positionId) return;
    if (target.occupant?.assignmentId) addOp({ k: "unassign", planId: target.planId, assignmentId: target.occupant.assignmentId, label: `Scoate ${target.occupant.name} de pe ${target.positionName}` });
    addOp({ k: "assign", planId: target.planId, teamId: target.teamId, positionId: target.positionId, inPersonId: person.id, inPerson: person, join: join || null,
      label: `${person.name} pe ${target.positionName}` });
    closeFlow();
  }

  const opsForCard = (aid) => ops.find((o) => o.card === aid);
  const targetStaged = ops.some((o) => o.k === "assign" && String(o.inPersonId) === String(person?.id) && String(o.positionId) === String(target?.positionId));

  // ── APLICARE pe DB (doar la Update) ──
  async function applyAll() {
    setSaving(true);
    try {
      const applyJoin = async (op) => { // guest-log / roster-add, în funcție de decizia luată la drop
        if (op.join === "guest") await plansApi.guestLog(op.planId, { personId: op.inPersonId, teamId: op.teamId, positionId: op.positionId });
        else if (op.join === "permanent") await peopleApi.rosterAdd(op.inPersonId, [op.positionId]);
      };
      for (const op of ops) {
        if (op.k === "unassign") { await plansApi.unassign(op.planId, op.assignmentId); }
        else if (op.k === "assign") { await plansApi.assign(op.planId, { personId: op.inPersonId, teamId: op.teamId, positionId: op.positionId, status: "unconfirmed" }); await applyJoin(op); }
        else if (op.k === "swap") { await plansApi.assign(op.planId, { personId: op.inPersonId, teamId: op.teamId, positionId: op.positionId, status: "unconfirmed" }); await applyJoin(op); await plansApi.unassign(op.planId, op.outAssignmentId); }
      }
      onResolved?.(); onReassignClose?.(); onClose?.();
    } catch (e) { /* lăsăm modalul deschis */ } finally { setSaving(false); }
  }
  function attemptClose() {
    if (saving) return;
    if (ops.length > 0) { setConfirmX(true); return; }
    onReassignClose?.(); onClose?.();
  }

  if (!open || !mounted || typeof document === "undefined") return null;
  const conflicts = data?.conflicts || [];
  const blockouts = data?.blockouts || [];
  const nothing = !loading && conflicts.length === 0 && blockouts.length === 0;
  const lifted = !!flowCard;
  const flow = flowCard ? conflicts.find((c) => String(c.assignmentId) === String(flowCard)) : null;
  const targetSim = simOf(target?.teamName); // SIM-ul poziției pe care o completăm (ex. „1")

  return createPortal((
    <div className={`cm-ov ${lifted ? "lifted" : ""}`} onClick={attemptClose}>
      <div className="cm-dlg" onClick={(e) => e.stopPropagation()}>
        <div className="cm-head">
          <div className="cm-who">
            <PersonAvatar person={person} size={48} showBadge={false} />
            <div className="cm-wt">
              <div className="cm-n">{person?.name}</div>
              <div className="cm-sub">{data?.dayLabel ? `Conflicte · ${data.dayLabel}` : "Conflicte"}</div>
            </div>
          </div>
          <div className="cm-headact">
            <button className="cm-update" disabled={saving || ops.length === 0} onClick={applyAll}>
              {saving ? "Se salvează…" : `Update${ops.length ? ` · ${ops.length}` : ""}`}
            </button>
            <button className="cm-x" onClick={attemptClose} aria-label="Închide">×</button>
          </div>
        </div>

        <div className="cm-body">
          {loading && <div className="cm-muted">Se încarcă…</div>}
          {nothing && <div className="cm-ok">✓ Niciun conflict rămas — totul e curat.</div>}

          {conflicts.length > 0 && (
            <div className="cm-sec">
              <div className="cm-sh"><img className="cm-shic" src="/icons/warn-yellow.png" alt="" />Slujire <span className="cm-cn">{conflicts.length}</span></div>
              {conflicts.map((c) => {
                const op = opsForCard(c.assignmentId);
                const inFlow = String(flowCard) === String(c.assignmentId);
                const cardSim = simOf(c.teamName);
                const recommended = !op && targetSim && cardSim && cardSim === targetSim; // același SIM ca poziția-țintă
                return (
                <div key={String(c.assignmentId)} className={`cm-card ${op ? "done" : ""}`}>
                  <div className="cm-crow">
                    <div className="cm-cmain">
                      <div className="cm-ctitle">
                        <span className="cm-pos">{c.positionName}</span>
                        {op ? <span className="cm-resolved">{op.k === "unassign" ? "scos" : `→ ${op.inPerson?.name}`}</span>
                          : <span className={`cm-st ${c.status === "confirmed" ? "ok" : "pend"}`}>{c.status === "confirmed" ? "confirmat" : "neconfirmat"}</span>}
                        {recommended && (
                          <span className="cm-rec" onMouseEnter={() => setRecTip(c.assignmentId)} onMouseLeave={() => setRecTip(null)}
                            onClick={(e) => { e.stopPropagation(); setRecTip(recTip === c.assignmentId ? null : c.assignmentId); }}>
                            <span className="cm-recic">!</span>
                            {recTip === c.assignmentId && (
                              <span className="cm-rectip">Înlocuire perfectă: rezolvă conflictul de pe <b>SIM {cardSim}</b> — exact SIM-ul poziției pe care o completezi. Așa o eliberezi pe {person?.name} pe SIM {cardSim}, fără conflict nou.</span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="cm-cmeta">
                        {c.serviceTypeName && <span>{c.serviceTypeName}</span>}
                        {c.teamName && <span className="cm-dot">·</span>}{c.teamName && <span>{c.teamName}</span>}
                        <span className="cm-dot">·</span><span className="cm-date">{c.dateLabel}</span>
                      </div>
                    </div>
                    <div className="cm-cact">
                      {op ? (
                        <button className="cm-undo" disabled={saving} onClick={() => { undoOp(op.id); if (inFlow) closeFlow(); }}>Anulează</button>
                      ) : (
                        <>
                          <button className={`cm-re ${inFlow ? "on" : ""}`} disabled={saving} onClick={() => inFlow ? closeFlow() : startFlow(c)}>Înlocuiește</button>
                          <button className="cm-rm" disabled={saving} onClick={() => stageRemove(c)} title="Scoate-l de pe această slujire">Scoate</button>
                        </>
                      )}
                    </div>
                  </div>

                  {inFlow && !op && (
                    <div className="cm-flow">
                      <div className="cm-steps">
                        <span className={`cm-step ${flowStep === 1 ? "on" : ""}`}><b>1</b> Rezolvă conflict</span>
                        <span className="cm-stepline" />
                        <span className={`cm-step ${flowStep === 2 ? "on" : ""}`}><b>2</b> Înlocuiește</span>
                      </div>

                      {flowStep === 1 && (
                        <div className="cm-reassign">
                          <div className={`cm-drop ${dropOver ? "over" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (!dropOver) setDropOver(true); }}
                            onDragLeave={() => setDropOver(false)}
                            onDrop={(e) => { e.preventDefault(); setDropOver(false); try { const raw = e.dataTransfer.getData("application/pc-person"); if (raw) pickReplace(c, JSON.parse(raw)); } catch {} }}>
                            <span>Trage o persoană din <b>Listă live</b> aici ca s-o pui în locul lui</span>
                            <button className="cm-manualbtn" onClick={() => { if (manualOn) setManualOn(false); else { setManualOn(true); loadCand(c, ""); } }}>
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
                              Adaugă manual
                            </button>
                          </div>
                          {manualOn && (
                            <div className="cm-manual">
                              <input className="cm-search" autoFocus placeholder="caută orice persoană…" value={candQ} onChange={(e) => setCandQ(e.target.value)} />
                              <div className="cm-cands">
                                {candLoading && <div className="cm-muted sm">Se caută…</div>}
                                {!candLoading && cand.length === 0 && <div className="cm-muted sm">Niciun candidat.</div>}
                                {cand.map((p) => (
                                  <button key={String(p.id)} className="cm-cand" onClick={() => pickReplace(c, p)} title="Pune-l în locul lui">
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
                  )}
                </div>
                );
              })}
            </div>
          )}

          {/* PAS 2 — opțional: pune persoana pe poziția selectată în Matrix, înlocuind ocupantul */}
          {target?.positionId && !targetStaged && (flowStep === 2 || ops.length > 0) && (
            <div className="cm-sec">
              <div className="cm-sh"><span className="cm-stepnum">2</span>Înlocuiește pe poziția selectată</div>
              <div className="cm-replace">
                <div className="cm-rp">
                  {target.occupant
                    ? (<><PersonAvatar person={target.occupant} size={34} showBadge={false} /><div className="cm-rpt"><div className="cm-rpn">{target.occupant.name}</div><div className="cm-rps">{target.positionName}{target.teamName ? ` · ${target.teamName}` : ""}</div></div></>)
                    : (<div className="cm-rpfree"><div className="cm-rpn">Poziție liberă</div><div className="cm-rps">{target.positionName}{target.teamName ? ` · ${target.teamName}` : ""}</div></div>)}
                </div>
                <span className="cm-arrow">→</span>
                <div className="cm-rp in">
                  <PersonAvatar person={person} size={34} showBadge={false} />
                  <div className="cm-rpt"><div className="cm-rpn">{person?.name}</div><div className="cm-rps">o pui aici</div></div>
                </div>
                <button className="cm-putbtn" disabled={saving} onClick={pickTarget}>{target.occupant ? "Înlocuiește" : "Pune pe poziție"}</button>
              </div>
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

        <PositionJoinModal
          data={pendingPick ? { person: pendingPick.person, positionName: pendingPick.positionName, teamName: pendingPick.teamName } : null}
          busy={false}
          onGuest={() => resolvePendingJoin("guest")}
          onPermanent={() => resolvePendingJoin("permanent")}
          onClose={() => setPendingPick(null)} />

        {pendingSim && (
          <div className="cm-xov" onClick={() => resolvePendingSim(false)}>
            <div className="cm-xdlg" onClick={(e) => e.stopPropagation()}>
              <div className="cm-xt">Îl pui pe <b>{pendingSim.ctx.person.name}</b> și la <b>{pendingSim.pair.pairTeamName}</b> · <b>{pendingSim.ctx.positionName}</b>? <span className="cm-free">(poziție liberă)</span></div>
              <div className="cm-xa">
                <button className="cm-xno" onClick={() => resolvePendingSim(false)}>Nu, doar aici</button>
                <button className="cm-simyes" onClick={() => resolvePendingSim(true)}>Da, pune și acolo</button>
              </div>
            </div>
          </div>
        )}

        {confirmX && (
          <div className="cm-xov" onClick={() => setConfirmX(false)}>
            <div className="cm-xdlg" onClick={(e) => e.stopPropagation()}>
              <div className="cm-xt">Ai <b>{ops.length}</b> schimbări nesalvate. Dacă închizi fără <b>Update</b>, se pierd toate.</div>
              <div className="cm-xa">
                <button className="cm-xno" onClick={() => setConfirmX(false)}>Rămân aici</button>
                <button className="cm-xyes" onClick={() => { setConfirmX(false); onReassignClose?.(); onClose?.(); }}>Închide fără salvare</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .cm-ov { position: fixed; inset: 0; background: rgba(0,0,0,.58); z-index: 95; display: flex; align-items: center; justify-content: center; padding: 20px; animation: cmov .14s ease; transition: align-items .2s; }
        @keyframes cmov { from { opacity: 0; } to { opacity: 1; } }
        .cm-ov.lifted { align-items: flex-start; padding-top: 26px; }
        .cm-ov.lifted .cm-dlg { max-height: calc(52vh - 40px); }
        .cm-dlg { position: relative; background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 14px; width: 900px; max-width: 94vw; max-height: 88vh; display: flex; flex-direction: column;
          box-shadow: 0 30px 80px rgba(0,0,0,.55); animation: cmin .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes cmin { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
        .cm-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--border); flex: none; }
        .cm-who { display: flex; align-items: center; gap: 13px; }
        .cm-n { color: var(--text); font-size: 17px; font-weight: 600; }
        .cm-sub { color: var(--text-faint); font-size: 12.5px; margin-top: 2px; }
        .cm-headact { display: flex; align-items: center; gap: 12px; }
        .cm-update { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 8px; height: 34px; padding: 0 16px; font-size: 13px; font-weight: 700; cursor: pointer; transition: filter .12s; }
        .cm-update:hover { filter: brightness(1.08); }
        .cm-update:disabled { opacity: .4; cursor: default; filter: none; }
        .cm-x { background: transparent; border: none; color: var(--text-faint); font-size: 24px; line-height: 1; cursor: pointer; padding: 0 4px; }
        .cm-x:hover { color: var(--text); }
        .cm-body { padding: 16px 20px 20px; overflow: auto; display: flex; flex-direction: column; gap: 18px; }
        .cm-muted { color: var(--text-faint); font-size: 13px; padding: 12px 2px; } .cm-muted.sm { padding: 8px 2px; font-size: 12px; }
        .cm-ok { color: var(--product); font-size: 14px; padding: 18px 2px; font-weight: 600; }
        .cm-sec { display: flex; flex-direction: column; gap: 9px; }
        .cm-sh { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 12px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; }
        .cm-shic { width: 15px; height: 15px; object-fit: contain; }
        .cm-sh.blk { color: var(--danger); }
        .cm-stepnum { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 10px; }
        .cm-cn { color: var(--text-dim); background: var(--surface-2); border-radius: 20px; padding: 0 8px; font-size: 11px; font-weight: 700; }
        .cm-cn.blk { color: var(--danger); background: rgba(248,81,73,.12); }
        .cm-card { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 11px; transition: border-color .15s; }
        .cm-card.done { border-color: rgba(87,185,138,.45); background: rgba(87,185,138,.05); }
        .cm-crow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 15px; }
        .cm-cmain { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .cm-ctitle { display: flex; align-items: center; gap: 9px; }
        .cm-pos { color: var(--text); font-size: 14px; font-weight: 700; }
        .cm-st { font-size: 10px; font-weight: 700; border-radius: 20px; padding: 1px 8px; border: 1px solid; }
        .cm-st.ok { color: var(--product); border-color: rgba(87,185,138,.5); background: rgba(87,185,138,.1); }
        .cm-st.pend { color: var(--st-unconfirmed); border-color: rgba(210,153,34,.5); background: rgba(210,153,34,.1); }
        .cm-resolved { color: var(--product); font-size: 11px; font-weight: 700; border: 1px solid rgba(87,185,138,.5); background: rgba(87,185,138,.12); border-radius: 20px; padding: 1px 9px; }
        .cm-rec { position: relative; display: inline-flex; cursor: pointer; }
        .cm-recic { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; border-radius: 50%; background: var(--st-unconfirmed); color: #1a1205; font-size: 12px; font-weight: 900; box-shadow: 0 0 0 3px rgba(210,153,34,.22); animation: cmrecp 1.8s ease-in-out infinite; }
        @keyframes cmrecp { 0%,100% { box-shadow: 0 0 0 3px rgba(210,153,34,.18); } 50% { box-shadow: 0 0 0 5px rgba(210,153,34,.32); } }
        .cm-rectip { position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); width: 260px; background: #0c1016; border: 1px solid rgba(210,153,34,.5);
          border-radius: 9px; padding: 9px 11px; color: var(--text-dim); font-size: 11.5px; font-weight: 400; line-height: 1.5; text-transform: none; letter-spacing: 0; box-shadow: 0 12px 30px rgba(0,0,0,.55); z-index: 10; }
        .cm-rectip b { color: #e0b341; }
        .cm-cmeta { display: flex; align-items: center; gap: 6px; color: var(--text-dim); font-size: 12.5px; flex-wrap: wrap; }
        .cm-dot { color: var(--text-faint); }
        .cm-date { color: var(--text); font-weight: 600; }
        .cm-cact { display: flex; align-items: center; gap: 8px; flex: none; }
        .cm-re { background: rgba(47,129,247,.14); border: 1px solid var(--primary); color: #9cc4f5; border-radius: 7px; height: 32px; padding: 0 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .12s; }
        .cm-re:hover, .cm-re.on { background: var(--primary); color: #fff; }
        .cm-rm { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; height: 32px; padding: 0 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color .12s, color .12s; }
        .cm-rm:hover { color: var(--danger); border-color: rgba(248,81,73,.55); }
        .cm-undo { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; height: 32px; padding: 0 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .cm-undo:hover { color: var(--text); }
        .cm-re:disabled, .cm-rm:disabled, .cm-undo:disabled { opacity: .55; cursor: default; }
        .cm-flow { border-top: 1px solid var(--border); padding: 12px 13px; background: var(--bg); border-radius: 0 0 11px 11px; animation: cmex .16s ease; }
        @keyframes cmex { from { opacity: 0; } to { opacity: 1; } }
        .cm-steps { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .cm-step { display: inline-flex; align-items: center; gap: 7px; color: var(--text-faint); font-size: 12px; font-weight: 700; }
        .cm-step b { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--surface-3); color: var(--text-dim); font-size: 10px; }
        .cm-step.on { color: var(--text); } .cm-step.on b { background: var(--primary); color: #fff; }
        .cm-stepline { flex: 1; height: 1px; background: var(--border); }
        .cm-reassign { display: flex; flex-direction: column; gap: 9px; }
        .cm-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 16px; border: 1.5px dashed var(--border-strong); border-radius: 10px; color: var(--text-dim); font-size: 12.5px; text-align: center; transition: border-color .13s, background .13s, color .13s; }
        .cm-drop b { color: var(--text); }
        .cm-drop.over { border-color: var(--primary); background: rgba(47,129,247,.1); color: var(--text); }
        .cm-manualbtn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 8px; height: 30px; padding: 0 13px; font-size: 12px; font-weight: 600; cursor: pointer; transition: color .12s, border-color .12s; }
        .cm-manualbtn:hover { color: var(--text); border-color: var(--primary); }
        .cm-manual { display: flex; flex-direction: column; gap: 7px; }
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
        /* pas 2 — înlocuiește pe poziția selectată */
        .cm-replace { display: flex; align-items: center; gap: 14px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 11px; padding: 13px 15px; flex-wrap: wrap; }
        .cm-rp { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .cm-rp.in { }
        .cm-rpt { min-width: 0; }
        .cm-rpn { color: var(--text); font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cm-rps { color: var(--text-faint); font-size: 11.5px; }
        .cm-rpfree { display: flex; flex-direction: column; }
        .cm-arrow { color: var(--text-faint); font-size: 18px; flex: none; }
        .cm-putbtn { margin-left: auto; background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 8px; height: 34px; padding: 0 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .cm-putbtn:hover { filter: brightness(1.08); } .cm-putbtn:disabled { opacity: .5; cursor: default; }
        .cm-blk { display: flex; align-items: center; gap: 10px; padding: 10px 13px; background: rgba(248,81,73,.07); border: 1px solid rgba(248,81,73,.3); border-radius: 9px; }
        .cm-blkdot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--danger); }
        .cm-blkd { color: #ff9a94; font-size: 13px; font-weight: 600; flex: none; }
        .cm-blkr { color: var(--text-dim); font-size: 12.5px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* confirmarea la X cu schimbări nesalvate */
        .cm-xov { position: absolute; inset: 0; background: rgba(0,0,0,.5); border-radius: 14px; display: flex; align-items: center; justify-content: center; z-index: 5; }
        .cm-xdlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 12px; padding: 18px 20px; width: 380px; max-width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,.5); }
        .cm-xt { color: var(--text-dim); font-size: 13.5px; line-height: 1.55; } .cm-xt b { color: var(--text); }
        .cm-xa { display: flex; gap: 9px; justify-content: flex-end; margin-top: 16px; }
        .cm-xno { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; height: 32px; padding: 0 14px; font-size: 12.5px; cursor: pointer; }
        .cm-xno:hover { color: var(--text); }
        .cm-xyes { background: var(--danger); border: 1px solid var(--danger); color: #fff; border-radius: 7px; height: 32px; padding: 0 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .cm-xyes:hover { filter: brightness(1.08); }
        .cm-simyes { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 7px; height: 32px; padding: 0 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .cm-simyes:hover { filter: brightness(1.08); }
        .cm-free { color: var(--product); font-size: 11.5px; }
      `}</style>
    </div>
  ), document.body);
}
