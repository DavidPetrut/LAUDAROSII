"use client";
/**
 * Matrix — planificare multi-plan, 1:1 cu PCO. /api/pc/v1/matrix/:serviceTypeId.
 * Grilă: stânga = secțiuni echipe (colapsabile) → poziții (nume la dreapta); sus = planuri (date);
 * celule = oameni (icon status + nume) + „Needed". Bara DREAPTA = asignare cu recomandări (due +
 * conflicte). Target view (click pe om → unde mai e planificat). Drag-drop = COPIAZĂ persoana pe altă
 * poziție. „Copiază SIM1→SIM2" pe antetul echipei. TOT scrie DOAR în DB — ZERO emailuri trimise automat.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { matrixApi, plansApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";

/* status: confirmat = bifă verde; neconfirmat = „?" galben; (declined e scos din backend) */
function Status({ s }) {
  if (s === "confirmed") return (
    <span className="st-ic ok" title="Confirmat"><svg width="12" height="12" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#57b98a" /><path d="M4.5 8.2l2.2 2.2 4.8-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  );
  return <span className="st-ic un" title="Neconfirmat"><svg width="12" height="12" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.2" fill="none" stroke="#c9a227" strokeWidth="1.6" /><text x="8" y="11.5" textAnchor="middle" fontSize="9" fill="#c9a227" fontWeight="700">?</text></svg></span>;
}

export default function MatrixPage() {
  const router = useRouter();
  const { serviceTypeId } = useParams();
  const [data, setData] = useState(null);
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [sel, setSel] = useState(null);           // {planId, teamId, positionId, positionName, colIdx}
  const [rec, setRec] = useState(null);           // recomandări bara dreaptă
  const [recBusy, setRecBusy] = useState(false);
  const [recQuery, setRecQuery] = useState("");
  const [target, setTarget] = useState(null);     // {personId, name} — target view
  const [toast, setToast] = useState("");
  const [teamMenu, setTeamMenu] = useState(null);  // teamId cu meniul deschis
  const [editing, setEditing] = useState(null);    // {planId, assignmentId, name, status}
  const dragRef = useRef(null);
  const recTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await matrixApi.grid(serviceTypeId, count); setData(r); setErr(""); }
    catch (e) { setErr(e?.message || "Eroare la matrix."); }
    finally { setLoading(false); }
  }, [serviceTypeId, count]);
  useEffect(() => { load(); }, [load]);

  const plans = data?.plans || [];
  const teams = data?.teams || [];
  const nPlans = plans.length;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  // deschide bara dreaptă pt. o celulă (plan × poziție) + cere recomandări
  const openCell = useCallback(async (planId, teamId, positionId, positionName, colIdx) => {
    setTarget(null);
    setSel({ planId, teamId, positionId, positionName, colIdx });
    setRec(null); setRecQuery(""); setRecBusy(true);
    try { setRec(await plansApi.recommend(planId, { teamId, positionId })); }
    catch (e) { setErr(e?.message || "Eroare la recomandări."); }
    finally { setRecBusy(false); }
  }, []);

  // caută în bara dreaptă (debounced)
  useEffect(() => {
    if (!sel) return;
    clearTimeout(recTimer.current);
    recTimer.current = setTimeout(async () => {
      setRecBusy(true);
      try { setRec(await plansApi.recommend(sel.planId, { teamId: sel.teamId, positionId: sel.positionId, q: recQuery })); }
      finally { setRecBusy(false); }
    }, 300);
    return () => clearTimeout(recTimer.current);
    // eslint-disable-next-line
  }, [recQuery]);

  async function assignPerson(personId) {
    if (!sel) return;
    try {
      await plansApi.assign(sel.planId, { personId, teamId: sel.teamId, positionId: sel.positionId, status: "unconfirmed" });
      flash("Asignat (neconfirmat, fără email).");
      await load();
      setRec(await plansApi.recommend(sel.planId, { teamId: sel.teamId, positionId: sel.positionId, q: recQuery }));
    } catch (e) { flash(e?.message || "Eroare."); }
  }
  async function removePerson(planId, assignmentId) {
    try { await plansApi.unassign(planId, assignmentId); flash("Șters."); await load(); }
    catch (e) { flash(e?.message || "Eroare."); }
  }
  async function saveStatus(status) {
    if (!editing) return;
    try {
      await plansApi.updateAssignment(editing.planId, editing.assignmentId, { status });
      flash(status === "declined" ? "Marcat refuzat." : status === "confirmed" ? "Confirmat." : "Neconfirmat.");
      setEditing(null); await load();
    } catch (e) { flash(e?.message || "Eroare."); }
  }
  async function dropOnCell(planId, teamId, positionId) {
    const d = dragRef.current; dragRef.current = null;
    if (!d) return;
    try {
      await plansApi.assign(planId, { personId: d.personId, teamId, positionId, status: "unconfirmed" });
      if (d.move && d.assignmentId) await plansApi.unassign(d.planId, d.assignmentId);
      flash(d.move ? "Mutat." : "Copiat.");
      await load();
    } catch (e) { flash(e?.message || "Eroare."); }
  }
  async function copySimTeam(fromTeamId) {
    setTeamMenu(null);
    // alege echipa țintă: următoarea echipă cu nume asemănător (SIM) sau prima alta
    const from = teams.find((t) => String(t.teamId) === String(fromTeamId));
    const cand = teams.filter((t) => String(t.teamId) !== String(fromTeamId));
    const guess = cand.find((t) => t.name.replace(/sim ?\d/i, "").trim() === (from?.name || "").replace(/sim ?\d/i, "").trim()) || cand[0];
    if (!guess) return flash("Nicio echipă țintă.");
    if (!confirm(`Copiez toate asignările din „${from?.name}" în „${guess.name}" (pe planurile vizibile)? Fără email.`)) return;
    try {
      let total = 0;
      for (const p of plans) { const r = await plansApi.copyTeam(p.id, fromTeamId, guess.teamId); total += r.copied || 0; }
      flash(`Copiat ${total} asignări în „${guess.name}".`); await load();
    } catch (e) { flash(e?.message || "Eroare."); }
  }

  const toggle = (id) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  useAiSurface({
    id: "plans.matrix",
    label: "Matrix — planificare",
    scope: "page",
    getContext: () => ({ serviceTypeId, serviceType: data?.serviceTypeName, planuri: nPlans, echipe: teams.length, selectat: sel?.positionName, target: target?.name }),
    actions: [
      { id: "setCount", label: "Câte planuri", params: { n: "number" }, run: ({ n }) => setCount(Math.min(12, Math.max(1, parseInt(n, 10) || 8))) },
      { id: "back", label: "Înapoi la Plans", run: () => router.push("/plans") },
      { id: "clearTarget", label: "Ieși din target view", run: () => setTarget(null) },
    ],
  }, [serviceTypeId, data, nPlans, teams, sel, target]);

  const gridCols = `220px repeat(${Math.max(1, nPlans)}, minmax(150px, 1fr))`;
  const dateRange = nPlans ? `${plans[0].dateLabel} – ${plans[nPlans - 1].dateLabel}` : "";

  return (
    <div className={`matrix ${sel ? "has-side" : ""}`}>
      {/* ───── bara de sus ───── */}
      <div className="mtop">
        <div className="mt-left">
          <button className="back" onClick={() => router.push("/plans")} title="Înapoi"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3L5 8l5 5" /></svg></button>
          <span className="st-pick">{data?.serviceTypeName || "Matrix"} <span className="caret">▾</span></span>
        </div>
        <div className="mt-center">{dateRange}</div>
        <div className="mt-right">
          {target && <button className="exit-target" onClick={() => setTarget(null)}>⌖ Exit target view</button>}
          <label className="cnt">Planuri
            <select value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))}>{[4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      <div className="mbody">
        {/* ───── grila ───── */}
        <div className="grid-wrap">
          {loading ? <div className="empty">Se încarcă matrix-ul…</div> : nPlans === 0 ? <div className="empty">Niciun plan pentru acest service type.</div> : (
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
                      <button className="gear" title="Copiază pe altă echipă (SIM1→SIM2)" onClick={() => copySimTeam(t.teamId)}>⧉</button>
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
                        onDrop={() => dropOnCell(plans[ci].id, t.teamId, pos.positionId)}>
                        {(c.people || []).map((pp, pi) => {
                          const dim = target && String(target.personId) !== String(pp.personId);
                          const hit = target && String(target.personId) === String(pp.personId);
                          return (
                            <div key={pi} className={`person ${dim ? "dim" : ""} ${hit ? "hit" : ""}`}
                              draggable
                              onDragStart={(e) => { dragRef.current = { personId: pp.personId, assignmentId: pp.assignmentId, planId: plans[ci].id, move: e.ctrlKey || e.metaKey }; }}
                              onClick={() => setTarget(target && String(target.personId) === String(pp.personId) ? null : { personId: pp.personId, name: pp.name })}
                              title={`${pp.name} — click: target view · trage: copiază (Ctrl: mută)`}>
                              <Status s={pp.status} />
                              <span className="pn">{pp.name}</span>
                              <button className="ped" title="Editează" onClick={(e) => { e.stopPropagation(); setEditing({ planId: plans[ci].id, assignmentId: pp.assignmentId, name: pp.name, status: pp.status }); }}>✎</button>
                              <button className="prm" title="Șterge" onClick={(e) => { e.stopPropagation(); removePerson(plans[ci].id, pp.assignmentId); }}>×</button>
                            </div>
                          );
                        })}
                        {c.needed > 0 && <div className="needed">{c.needed} Needed</div>}
                      </div>
                    );
                  });
                });
                return out;
              })}
            </div>
          )}
        </div>

        {/* ───── bara dreaptă (asignare) ───── */}
        {sel && (
          <aside className="side">
            <div className="side-head">
              <span className="side-title">{sel.positionName}</span>
              <button className="side-x" onClick={() => { setSel(null); setRec(null); }}>×</button>
            </div>
            <div className="needcount">{rec ? (rec.neededCount > 0 ? `${rec.neededCount} people still needed` : "Poziție acoperită") : "…"}</div>
            <input className="side-search" placeholder="Caută după nume" value={recQuery} onChange={(e) => setRecQuery(e.target.value)} />
            <div className="side-hint">Asignează cineva la <b>{sel.positionName}</b> — doar în aplicație, fără email.</div>
            <div className="side-list">
              {recBusy && <div className="muted">Se caută…</div>}
              {rec?.alreadyHere?.length > 0 && (
                <div className="grp">
                  <div className="grp-l">DEJA AICI</div>
                  {rec.alreadyHere.map((p) => <div key={p.id} className="cand here"><span className="ini">{p.initials}</span><span className="cn">{p.name}</span><span className="here-b">✓</span></div>)}
                </div>
              )}
              {!recBusy && (rec?.groups || []).map((g, gi) => (
                <div key={gi} className="grp">
                  <div className="grp-l">{g.label}</div>
                  {g.people.map((p) => (
                    <button key={p.id} className="cand" onClick={() => assignPerson(p.id)} title="Asignează">
                      {p.avatar ? <img src={p.avatar} className="ini" alt="" /> : <span className="ini">{p.initials}</span>}
                      <span className="cn">{p.name}</span>
                      {p.conflict && <span className={`cf ${p.conflict.type}`} title={p.conflict.type === "blockout" ? "Blockout" : "Suprapunere ore"}>{p.conflict.type === "blockout" ? "⛔" : "⚠"}{p.conflict.count > 1 ? p.conflict.count : ""}</span>}
                      <span className="wk">{p.weeksLabel}</span>
                    </button>
                  ))}
                  {g.people.length === 0 && <div className="muted">Nimeni.</div>}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {editing && (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Editează programarea</h3>
            <div className="dlg-name">{editing.name}</div>
            <div className="seg">
              {[["confirmed", "Confirmed"], ["unconfirmed", "Pending"], ["declined", "Declined"]].map(([v, l]) => (
                <button key={v} className={`seg-b ${editing.status === v ? "on " + v : ""}`} onClick={() => saveStatus(v)}>{l}</button>
              ))}
            </div>
            <p className="dlg-note">Schimbarea statusului se salvează instant, <b>fără email</b>. Emailurile de programare le trimiteți voi manual.</p>
            <div className="dlg-act">
              <button className="btn-rm" onClick={() => { removePerson(editing.planId, editing.assignmentId); setEditing(null); }}>Remove</button>
              <button className="btn-cl" onClick={() => setEditing(null)}>Închide</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .matrix { padding: 14px 0 40px; }
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
        .mbody { display: flex; gap: 0; align-items: stretch; }
        .grid-wrap { flex: 1; overflow: auto; border: 1px solid var(--border); border-radius: 8px; max-height: calc(100vh - 150px); }
        .grid { display: grid; min-width: max-content; }
        .cell { border-bottom: 1px solid var(--border-soft); border-right: 1px solid var(--border-soft); font-size: 12.5px; }
        .head { position: sticky; top: 0; z-index: 3; background: var(--surface-2); }
        .corner { position: sticky; left: 0; z-index: 4; }
        .planhead { padding: 7px 10px; }
        .planhead.selcol { background: rgba(47,129,247,.12); }
        .ph-st { color: var(--text-faint); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ph-date { color: var(--text); font-size: 12.5px; font-weight: 600; margin-top: 2px; }
        .teamblock { background: var(--surface); border-bottom: 1px solid var(--border); border-top: 1px solid var(--border);
          position: sticky; left: 0; z-index: 2; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; }
        .tb-toggle { background: transparent; border: none; color: var(--text); font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
        .tb-caret { color: var(--text-faint); font-size: 10px; } .tb-caret.col { transform: rotate(-90deg); }
        .tb-actions .gear { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 5px; }
        .tb-actions .gear:hover { color: var(--text); background: rgba(255,255,255,.06); }
        .poslabel { position: sticky; left: 0; z-index: 1; background: var(--surface); color: var(--text-dim);
          text-align: right; padding: 8px 12px; display: flex; align-items: center; justify-content: flex-end; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .datacell { padding: 5px 7px; background: var(--bg); min-height: 34px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
        .datacell:hover { background: var(--row-hover); }
        .datacell.sel { background: rgba(47,129,247,.10); box-shadow: inset 0 0 0 1px var(--primary); }
        .person { display: flex; align-items: center; gap: 6px; padding: 2px 3px; border-radius: 4px; cursor: grab; }
        .person:hover { background: rgba(255,255,255,.05); }
        .person.dim { opacity: .28; }
        .person.hit { background: rgba(47,129,247,.18); box-shadow: inset 0 0 0 1px var(--primary); }
        .st-ic { display: inline-flex; flex: none; }
        .pn { color: var(--text); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .prm, .ped { opacity: 0; background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; line-height: 1; padding: 0 2px; flex: none; }
        .prm { font-size: 14px; }
        .person:hover .prm, .person:hover .ped { opacity: 1; } .prm:hover { color: var(--danger); } .ped:hover { color: var(--primary); }
        .needed { color: #e0a93c; font-size: 11.5px; font-weight: 600; padding: 2px 3px; }
        .empty { padding: 40px; color: var(--text-faint); }
        /* bara dreaptă */
        .side { width: 320px; flex: none; border: 1px solid var(--border); border-left: none; border-radius: 0 8px 8px 0; background: var(--surface); display: flex; flex-direction: column; max-height: calc(100vh - 150px); }
        .side-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); }
        .side-title { color: var(--text); font-weight: 600; font-size: 14px; }
        .side-x { background: transparent; border: none; color: var(--text-faint); font-size: 20px; cursor: pointer; line-height: 1; }
        .needcount { text-align: center; color: var(--text-dim); font-size: 12.5px; padding: 10px; }
        .side-search { margin: 0 14px 8px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; height: 32px; padding: 0 10px; color: var(--text); outline: none; font-size: 13px; }
        .side-hint { color: var(--text-faint); font-size: 11.5px; padding: 0 14px 10px; }
        .side-list { overflow: auto; padding: 0 8px 14px; }
        .grp { margin-bottom: 10px; }
        .grp-l { color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; padding: 8px 6px 4px; }
        .cand { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 6px; }
        .cand:hover { background: rgba(255,255,255,.05); }
        .ini { width: 26px; height: 26px; border-radius: 50%; background: #3a4552; color: #fff; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; object-fit: cover; flex: none; }
        .cn { color: var(--text); font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cf { font-size: 11px; } .cf.blockout { color: var(--danger); } .cf.time { color: #e0a93c; }
        .wk { color: var(--text-faint); font-size: 11px; min-width: 34px; text-align: right; }
        .cand.here { opacity: .7; } .here-b { color: var(--product); }
        .muted { color: var(--text-faint); font-size: 12px; padding: 6px; }
        .toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); padding: 10px 18px; border-radius: 8px; font-size: 13px; z-index: 60; box-shadow: 0 8px 28px rgba(0,0,0,.4); }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 70; }
        .dialog { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 10px; padding: 20px; width: 400px; max-width: 92vw; }
        .dialog h3 { margin: 0 0 4px; font-size: 16px; color: var(--text); }
        .dlg-name { color: var(--text-dim); font-size: 13px; margin-bottom: 14px; }
        .seg { display: flex; gap: 0; border: 1px solid var(--border-strong); border-radius: 8px; overflow: hidden; }
        .seg-b { flex: 1; background: var(--surface-2); border: none; color: var(--text-dim); padding: 9px 0; cursor: pointer; font-size: 13px; border-right: 1px solid var(--border-strong); }
        .seg-b:last-child { border-right: none; }
        .seg-b.on.confirmed { background: var(--product); color: #0b2018; font-weight: 600; }
        .seg-b.on.unconfirmed { background: #c9a227; color: #1d1600; font-weight: 600; }
        .seg-b.on.declined { background: var(--danger); color: #fff; font-weight: 600; }
        .dlg-note { color: var(--text-faint); font-size: 12px; line-height: 1.5; margin: 14px 0; }
        .dlg-act { display: flex; align-items: center; justify-content: space-between; }
        .btn-rm { background: transparent; border: 1px solid var(--danger); color: var(--danger); border-radius: 6px; padding: 7px 14px; cursor: pointer; font-size: 13px; }
        .btn-cl { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 7px 16px; cursor: pointer; font-size: 13px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
