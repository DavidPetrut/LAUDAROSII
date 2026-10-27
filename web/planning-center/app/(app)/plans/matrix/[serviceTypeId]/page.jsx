"use client";
/**
 * Matrix — planificare multi-plan, 1:1 cu PCO. /api/pc/v1/matrix/:serviceTypeId.
 * LĂȚIME COMPLETĂ (.pc-full): etichete poziții STÂNGA (sticky), coloane = planuri (date),
 * iar bara de asignare e GLOBALĂ și lipită în DREAPTA ecranului (AssignSidebar).
 * Celule = oameni ca AVATAR + badge status în colț (PersonAvatar) + „Needed" (−/N/+).
 * UX seamless: update OPTIMIST + reconciliere silențioasă (fără flash „Se încarcă").
 * Target view (click pe om → unde mai e planificat). Drag = COPIAZĂ (Ctrl = MUTĂ).
 * „⧉" pe antetul echipei = copiază SIM1→SIM2. TOTUL scrie DOAR în DB — ZERO emailuri.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { matrixApi, plansApi, peopleApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import PersonAvatar from "@/components/plans/PersonAvatar";
import AssignSidebar from "@/components/plans/AssignSidebar";
import EditPersonModal from "@/components/plans/EditPersonModal";

export default function MatrixPage() {
  const router = useRouter();
  const { serviceTypeId } = useParams();
  const [data, setData] = useState(null);
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [sel, setSel] = useState(null);           // {planId, teamId, positionId, positionName, colIdx}
  const [rec, setRec] = useState(null);
  const [recBusy, setRecBusy] = useState(false);
  const [recQuery, setRecQuery] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [target, setTarget] = useState(null);
  const [targetSched, setTargetSched] = useState(null);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(null);
  const dragRef = useRef(null);
  const recTimer = useRef(null);

  // reconciliere silențioasă (fără loading flag) — ține bara deschisă și scroll-ul pe loc
  const fetchGrid = useCallback(() => matrixApi.grid(serviceTypeId, count), [serviceTypeId, count]);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchGrid()); setErr(""); }
    catch (e) { setErr(e?.message || "Eroare la matrix."); }
    finally { setLoading(false); }
  }, [fetchGrid]);
  const reconcile = useCallback(async () => {
    try { setData(await fetchGrid()); } catch { /* păstrăm optimistul */ }
  }, [fetchGrid]);
  useEffect(() => { load(); }, [load]);

  const plans = data?.plans || [];
  const teams = data?.teams || [];
  const nPlans = plans.length;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  // patch imuabil pe o celulă (team, position, colIdx)
  const patchCell = useCallback((teamId, positionId, colIdx, fn) => {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        teams: d.teams.map((t) => String(t.teamId) !== String(teamId) ? t : {
          ...t,
          positions: t.positions.map((p) => String(p.positionId) !== String(positionId) ? p : {
            ...p,
            cells: p.cells.map((c, i) => i !== colIdx ? c : fn(c)),
          }),
        }),
      };
    });
  }, []);

  const refreshRec = useCallback(async () => {
    if (!sel) return;
    try { setRec(await plansApi.recommend(sel.planId, { teamId: sel.teamId, positionId: sel.positionId, q: recQuery })); } catch {}
  }, [sel, recQuery]);

  const openCell = useCallback(async (planId, teamId, positionId, positionName, colIdx) => {
    setTarget(null); setTargetSched(null);
    setSel({ planId, teamId, positionId, positionName, colIdx });
    setRec(null); setRecQuery(""); setRecBusy(true);
    try { setRec(await plansApi.recommend(planId, { teamId, positionId })); }
    catch (e) { setErr(e?.message || "Eroare la recomandări."); }
    finally { setRecBusy(false); }
  }, []);

  // căutare în bară (debounced)
  useEffect(() => {
    if (!sel) return;
    clearTimeout(recTimer.current);
    recTimer.current = setTimeout(async () => {
      setRecBusy(true);
      try { setRec(await plansApi.recommend(sel.planId, { teamId: sel.teamId, positionId: sel.positionId, q: recQuery })); }
      finally { setRecBusy(false); }
    }, 280);
    return () => clearTimeout(recTimer.current);
    // eslint-disable-next-line
  }, [recQuery]);

  async function assignPerson(p) {
    if (!sel) return;
    setAssigning(true);
    // optimist: pune persoana în celulă + scade Needed vizual
    const tmpId = `tmp-${Date.now()}`;
    patchCell(sel.teamId, sel.positionId, sel.colIdx, (c) => ({
      ...c,
      people: [...c.people, { personId: p.id, assignmentId: tmpId, name: p.name, avatar: p.avatar, initials: p.initials, status: "unconfirmed" }],
      needed: Math.max(0, (c.needed || 0) - 1),
    }));
    try {
      await plansApi.assign(sel.planId, { personId: p.id, teamId: sel.teamId, positionId: sel.positionId, status: "unconfirmed" });
      flash("Asignat (neconfirmat, fără email).");
      reconcile(); refreshRec();
    } catch (e) { flash(e?.message || "Eroare."); reconcile(); }
    finally { setAssigning(false); }
  }
  async function removePerson(planId, teamId, positionId, colIdx, assignmentId) {
    patchCell(teamId, positionId, colIdx, (c) => ({ ...c, people: c.people.filter((x) => String(x.assignmentId) !== String(assignmentId)) }));
    try { await plansApi.unassign(planId, assignmentId); flash("Șters."); reconcile(); refreshRec(); }
    catch (e) { flash(e?.message || "Eroare."); reconcile(); }
  }
  async function saveEdit({ status, notes }) {
    if (!editing) return;
    patchCell(editing.teamId, editing.positionId, editing.colIdx, (c) => ({
      ...c, people: c.people.map((x) => String(x.assignmentId) === String(editing.assignmentId) ? { ...x, status } : x),
    }));
    setEditing(null);
    try { await plansApi.updateAssignment(editing.planId, editing.assignmentId, { status, notes }); flash("Salvat (fără email)."); reconcile(); }
    catch (e) { flash(e?.message || "Eroare."); reconcile(); }
  }
  async function dropOnCell(planId, teamId, positionId, colIdx) {
    const d = dragRef.current; dragRef.current = null;
    if (!d) return;
    const tmpId = `tmp-${Date.now()}`;
    patchCell(teamId, positionId, colIdx, (c) => ({ ...c, people: [...c.people, { personId: d.personId, assignmentId: tmpId, name: d.name, avatar: d.avatar, initials: d.initials, status: "unconfirmed" }] }));
    if (d.move) patchCell(d.teamId, d.positionId, d.colIdx, (c) => ({ ...c, people: c.people.filter((x) => String(x.assignmentId) !== String(d.assignmentId)) }));
    try {
      await plansApi.assign(planId, { personId: d.personId, teamId, positionId, status: "unconfirmed" });
      if (d.move && d.assignmentId) await plansApi.unassign(d.planId, d.assignmentId);
      flash(d.move ? "Mutat." : "Copiat."); reconcile();
    } catch (e) { flash(e?.message || "Eroare."); reconcile(); }
  }
  async function changeNeeded(planId, teamId, positionId, colIdx, nextCount) {
    const n = Math.max(0, nextCount);
    patchCell(teamId, positionId, colIdx, (c) => ({ ...c, needed: n }));
    try { await plansApi.setNeeded(planId, teamId, positionId, n); reconcile(); }
    catch (e) { flash(e?.message || "Eroare."); reconcile(); }
  }
  async function copySimTeam(fromTeamId) {
    const from = teams.find((t) => String(t.teamId) === String(fromTeamId));
    const cand = teams.filter((t) => String(t.teamId) !== String(fromTeamId));
    const guess = cand.find((t) => t.name.replace(/sim ?\d/i, "").trim() === (from?.name || "").replace(/sim ?\d/i, "").trim()) || cand[0];
    if (!guess) return flash("Nicio echipă țintă.");
    if (!confirm(`Copiez toate asignările din „${from?.name}" în „${guess.name}" (pe planurile vizibile)? Fără email.`)) return;
    try {
      let total = 0;
      for (const p of plans) { const r = await plansApi.copyTeam(p.id, fromTeamId, guess.teamId); total += r.copied || 0; }
      flash(`Copiat ${total} asignări în „${guess.name}".`); reconcile();
    } catch (e) { flash(e?.message || "Eroare."); }
  }

  function pickTarget(pp) {
    if (target && String(target.personId) === String(pp.personId)) { setTarget(null); setTargetSched(null); return; }
    setTarget({ personId: pp.personId, name: pp.name }); setTargetSched(null);
    peopleApi.schedule(pp.personId).then((r) => setTargetSched(r.schedule || [])).catch(() => setTargetSched([]));
  }

  const toggle = (id) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const closeSide = () => { setSel(null); setRec(null); };

  useAiSurface({
    id: "plans.matrix", label: "Matrix — planificare", scope: "page",
    getContext: () => ({ serviceTypeId, serviceType: data?.serviceTypeName, planuri: nPlans, echipe: teams.length, selectat: sel?.positionName, target: target?.name }),
    actions: [
      { id: "setCount", label: "Câte planuri", params: { n: "number" }, run: ({ n }) => setCount(Math.min(12, Math.max(1, parseInt(n, 10) || 8))) },
      { id: "back", label: "Înapoi la Plans", run: () => router.push("/plans") },
      { id: "clearTarget", label: "Ieși din target view", run: () => setTarget(null) },
    ],
  }, [serviceTypeId, data, nPlans, teams, sel, target]);

  const gridCols = `220px repeat(${Math.max(1, nPlans)}, minmax(158px, 1fr))`;
  const dateRange = nPlans ? `${plans[0].dateLabel} – ${plans[nPlans - 1].dateLabel}` : "";

  return (
    <div className={`matrix pc-full ${sel ? "has-side" : ""}`}>
      {/* ───── bara de sus ───── */}
      <div className="mtop">
        <div className="mt-left">
          <button className="back" onClick={() => router.push("/plans")} title="Înapoi"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3L5 8l5 5" /></svg></button>
          <span className="st-pick">{data?.serviceTypeName || "Matrix"} <span className="caret">▾</span></span>
        </div>
        <div className="mt-center">{dateRange}</div>
        <div className="mt-right">
          {target && <button className="exit-target" onClick={() => { setTarget(null); setTargetSched(null); }}>⌖ Exit target view</button>}
          <label className="cnt">Planuri
            <select value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))}>{[4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      {/* ───── grila (scroll orizontal = carusel) ───── */}
      <div className="grid-wrap">
        {loading && !data ? <div className="empty">Se încarcă matrix-ul…</div> : nPlans === 0 ? <div className="empty">Niciun plan pentru acest service type.</div> : (
          <div className="grid" style={{ gridTemplateColumns: gridCols }}>
            <div className="cell head corner" />
            {plans.map((p, i) => (
              <div key={p.id} className={`cell head planhead ${sel?.colIdx === i ? "selcol" : ""}`}>
                <div className="ph-st">{data?.serviceTypeName}</div>
                <div className="ph-date">{p.weekday ? `${p.weekday} · ` : ""}{p.dateLabel}</div>
              </div>
            ))}

            {teams.flatMap((t) => {
              const out = [
                <div key={`team-${t.teamId}`} className="teamblock" style={{ gridColumn: `1 / span ${nPlans + 1}` }}>
                  <button className="tb-toggle" onClick={() => toggle(t.teamId)}>
                    <span className={`tb-caret ${collapsed.has(t.teamId) ? "col" : ""}`}>▾</span>{t.name}
                  </button>
                  <div className="tb-actions">
                    <button className="gear" title="Copiază pe echipa pereche (SIM1→SIM2)" onClick={() => copySimTeam(t.teamId)}>⧉</button>
                  </div>
                </div>,
              ];
              if (collapsed.has(t.teamId)) return out;
              (t.positions || []).forEach((pos) => {
                out.push(<div key={`${t.teamId}-${pos.positionId}-n`} className="cell poslabel" title={pos.name}>{pos.name}</div>);
                (pos.cells || []).forEach((c, ci) => {
                  const isSel = sel && sel.positionId === pos.positionId && sel.colIdx === ci;
                  out.push(
                    <div key={`${t.teamId}-${pos.positionId}-${ci}`}
                      className={`cell datacell ${isSel ? "sel" : ""}`}
                      onClick={(e) => { if (e.target.closest(".person")) return; openCell(plans[ci].id, t.teamId, pos.positionId, pos.name, ci); }}
                      onDragOver={(e) => { if (dragRef.current) e.preventDefault(); }}
                      onDrop={() => dropOnCell(plans[ci].id, t.teamId, pos.positionId, ci)}>
                      {(c.people || []).map((pp, pi) => {
                        const dim = target && String(target.personId) !== String(pp.personId);
                        const hit = target && String(target.personId) === String(pp.personId);
                        return (
                          <div key={pp.assignmentId || pi} className={`person ${dim ? "dim" : ""} ${hit ? "hit" : ""}`}
                            draggable
                            onDragStart={() => { dragRef.current = { personId: pp.personId, assignmentId: pp.assignmentId, planId: plans[ci].id, teamId: t.teamId, positionId: pos.positionId, colIdx: ci, name: pp.name, avatar: pp.avatar, initials: pp.initials, move: false }; }}
                            onClick={() => pickTarget(pp)}
                            title={`${pp.name} — click: target view · trage: copiază`}>
                            <PersonAvatar person={pp} status={pp.status} size={22} />
                            <span className="pn">{pp.name}</span>
                            <button className="ped" title="Editează" onClick={(e) => { e.stopPropagation(); setEditing({ planId: plans[ci].id, teamId: t.teamId, positionId: pos.positionId, colIdx: ci, assignmentId: pp.assignmentId, name: pp.name, avatar: pp.avatar, initials: pp.initials, status: pp.status, teamName: t.name, positionName: pos.name }); }}>✎</button>
                            <button className="prm" title="Șterge" onClick={(e) => { e.stopPropagation(); removePerson(plans[ci].id, t.teamId, pos.positionId, ci, pp.assignmentId); }}>×</button>
                          </div>
                        );
                      })}
                      <div className="needrow" onClick={(e) => e.stopPropagation()}>
                        {c.needed > 0 ? (
                          <span className="needctl">
                            <button onClick={() => changeNeeded(plans[ci].id, t.teamId, pos.positionId, ci, c.needed - 1)}>−</button>
                            <span className="needn">{c.needed} Needed</span>
                            <button onClick={() => changeNeeded(plans[ci].id, t.teamId, pos.positionId, ci, c.needed + 1)}>+</button>
                          </span>
                        ) : (
                          <button className="needadd" title="Adaugă Needed" onClick={() => changeNeeded(plans[ci].id, t.teamId, pos.positionId, ci, 1)}>+ Needed</button>
                        )}
                      </div>
                    </div>
                  );
                });
              });
              return out;
            })}
          </div>
        )}
      </div>

      {/* ───── bara GLOBALĂ de asignare (dreapta) ───── */}
      <AssignSidebar
        open={!!sel}
        title={sel?.positionName || ""}
        neededCount={rec?.neededCount || 0}
        loading={recBusy}
        groups={rec?.groups || []}
        alreadyHere={rec?.alreadyHere || []}
        query={recQuery}
        onQuery={setRecQuery}
        onPick={assignPerson}
        onClose={closeSide}
        assigning={assigning}
      />

      {editing && (
        <EditPersonModal
          person={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onRemove={() => { removePerson(editing.planId, editing.teamId, editing.positionId, editing.colIdx, editing.assignmentId); setEditing(null); }}
        />
      )}

      {target && (
        <div className="tpanel">
          <div className="tp-head"><span>⌖ {target.name}</span><button onClick={() => { setTarget(null); setTargetSched(null); }}>×</button></div>
          <div className="tp-sub">Unde mai e planificat (viitor)</div>
          {targetSched == null ? <div className="tp-muted">Se încarcă…</div> : targetSched.length === 0 ? <div className="tp-muted">Nicăieri în viitor.</div> :
            targetSched.map((s, i) => (
              <div key={i} className="tp-row"><span className="tp-ic">{s.status === "confirmed" ? "✅" : "❔"}</span><span className="tp-d">{s.dateLabel}</span><span className="tp-s">{s.serviceTypeName}</span></div>
            ))}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .matrix { padding: 14px 16px 40px; transition: padding-right .16s ease; }
        .matrix.has-side { padding-right: 356px; }  /* loc pt. bara lipită dreapta */
        .mtop { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .mt-left { display: flex; align-items: center; gap: 8px; }
        .back { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 5px; }
        .back:hover { color: var(--text); }
        .st-pick { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; padding: 6px 12px; color: var(--text); font-size: 13.5px; font-weight: 600; }
        .caret { color: var(--text-faint); font-size: 10px; }
        .mt-center { flex: 1; text-align: center; color: var(--text); font-size: 15px; font-weight: 600; }
        .mt-right { display: flex; align-items: center; gap: 12px; }
        .exit-target { background: rgba(47,129,247,.14); border: 1px solid var(--primary); color: #9cc4f5; border-radius: 6px; padding: 5px 10px; font-size: 12.5px; cursor: pointer; }
        .cnt { color: var(--text-dim); font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px; }
        .cnt select { background: var(--surface-2); color: var(--text); border: 1px solid var(--border-strong); border-radius: 6px; height: 28px; }
        .grid-wrap { overflow: auto; border: 1px solid var(--border); border-radius: 8px; max-height: calc(100vh - 140px); }
        .grid { display: grid; min-width: max-content; }
        .cell { border-bottom: 1px solid var(--border-soft); border-right: 1px solid var(--border-soft); font-size: 12.5px; }
        .head { position: sticky; top: 0; z-index: 3; background: var(--surface-2); }
        .corner { position: sticky; left: 0; z-index: 4; }
        .planhead { padding: 8px 12px; }
        .planhead.selcol { background: rgba(47,129,247,.12); }
        .ph-st { color: var(--text-faint); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ph-date { color: var(--text); font-size: 12.5px; font-weight: 600; margin-top: 2px; }
        .teamblock { background: var(--section-head-bg); border-bottom: 1px solid var(--border); border-top: 1px solid var(--border);
          position: sticky; left: 0; z-index: 2; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; }
        .tb-toggle { background: transparent; border: none; color: var(--text); font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
        .tb-caret { color: var(--text-faint); font-size: 10px; } .tb-caret.col { transform: rotate(-90deg); }
        .tb-actions .gear { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 5px; }
        .tb-actions .gear:hover { color: var(--text); background: rgba(255,255,255,.06); }
        .poslabel { position: sticky; left: 0; z-index: 1; background: var(--surface); color: var(--text-dim);
          text-align: right; padding: 9px 12px; display: flex; align-items: center; justify-content: flex-end; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
        .datacell { padding: 6px 8px; background: var(--bg); min-height: 38px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; }
        .datacell:hover { background: var(--row-hover); }
        .datacell.sel { background: rgba(47,129,247,.10); box-shadow: inset 0 0 0 1px var(--primary); }
        .person { display: flex; align-items: center; gap: 7px; padding: 2px 3px; border-radius: 5px; cursor: grab; }
        .person:hover { background: rgba(255,255,255,.055); }
        .person.dim { opacity: .28; }
        .person.hit { background: rgba(47,129,247,.18); box-shadow: inset 0 0 0 1px var(--primary); }
        .pn { color: var(--text); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .prm, .ped { opacity: 0; background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; line-height: 1; padding: 0 2px; flex: none; }
        .prm { font-size: 15px; }
        .person:hover .prm, .person:hover .ped { opacity: 1; } .prm:hover { color: var(--danger); } .ped:hover { color: var(--primary); }
        .needrow { padding: 1px 3px; }
        .needctl { display: inline-flex; align-items: center; gap: 5px; }
        .needn { color: #e0a93c; font-size: 11.5px; font-weight: 600; }
        .needctl button, .needadd { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 4px; cursor: pointer; }
        .needctl button { width: 18px; height: 18px; line-height: 1; font-size: 13px; }
        .needctl button:hover { color: var(--text); }
        .needadd { opacity: 0; font-size: 10.5px; padding: 2px 8px; }
        .datacell:hover .needadd { opacity: 1; }
        .needadd:hover { color: var(--primary); border-color: var(--primary); }
        .empty { padding: 40px; color: var(--text-faint); }
        .tpanel { position: fixed; bottom: 18px; left: 18px; width: 260px; max-height: 50vh; overflow: auto; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; padding: 12px 14px; z-index: 55; box-shadow: 0 8px 28px rgba(0,0,0,.45); }
        .tp-head { display: flex; align-items: center; justify-content: space-between; color: var(--text); font-weight: 600; font-size: 13px; }
        .tp-head button { background: transparent; border: none; color: var(--text-faint); font-size: 18px; cursor: pointer; line-height: 1; }
        .tp-sub { color: var(--text-faint); font-size: 11px; margin: 4px 0 8px; }
        .tp-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12.5px; border-bottom: 1px solid var(--border-soft); }
        .tp-d { color: var(--text); width: 64px; } .tp-s { color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tp-muted { color: var(--text-faint); font-size: 12px; padding: 4px 0; }
        .toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); padding: 10px 18px; border-radius: 8px; font-size: 13px; z-index: 60; box-shadow: 0 8px 28px rgba(0,0,0,.4); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
