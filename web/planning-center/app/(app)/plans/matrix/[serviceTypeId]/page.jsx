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
import CoverageBar from "@/components/plans/CoverageBar";

/* numele echipei pereche: „Asimilare (SIM 1)" ↔ „Asimilare (SIM 2)" */
function perecheName(name = "") {
  if (/sim\s*1\b/i.test(name)) return name.replace(/sim\s*1\b/i, (m) => m.replace("1", "2"));
  if (/sim\s*2\b/i.test(name)) return name.replace(/sim\s*2\b/i, (m) => m.replace("2", "1"));
  return null;
}
const eq = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export default function MatrixPage() {
  const router = useRouter();
  const { serviceTypeId } = useParams();
  const [data, setData] = useState(null);
  const [count, setCount] = useState(4);          // „Next plans" (Quantity) — default 4 ca în PCO
  const [offset, setOffset] = useState(0);
  const [prev, setPrev] = useState(0);            // „Previous plans" (Quantity)
  const [dateMode, setDateMode] = useState(false); // Smart Load: Quantity vs Date
  const [fromW, setFromW] = useState(1);          // Date: N săptămâni în urmă
  const [toW, setToW] = useState(4);              // Date: N săptămâni înainte
  const [stIds, setStIds] = useState(() => [String(serviceTypeId)]); // Custom Matrix: service types incluse
  const [matrixName, setMatrixName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showStMenu, setShowStMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showAddSt, setShowAddSt] = useState(false);   // „Add Service Type" în dropdown-ul de dată
  const [stSearch, setStSearch] = useState("");
  const [dmCol, setDmCol] = useState(() => new Set());  // secțiuni ST colapsate în dropdown-ul de dată
  const toggleDmSec = (id) => setDmCol((s) => { const n = new Set(s); n.has(String(id)) ? n.delete(String(id)) : n.add(String(id)); return n; });
  const [selectedPlanIds, setSelectedPlanIds] = useState(null); // null = mod fereastră (prev/next); array = checklist explicit
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
  const [barOpen, setBarOpen] = useState(false);   // bara de jos „listă live"
  const [browse, setBrowse] = useState(false);     // sidebar dreapta în mod „vizualizare toți oamenii" (fără poziție)
  const [cov, setCov] = useState(null);
  const [covBusy, setCovBusy] = useState(false);
  const [barFilters, setBarFilters] = useState({ ministry: null, gender: "", sim: "" }); // filtre tag-uri bară
  const [dragActive, setDragActive] = useState(false); // feedback drag (Kanban)
  const dragRef = useRef(null);
  const lastSelRef = useRef(null); // ultima poziție deschisă — pt. butonul „planning"
  const recTimer = useRef(null);

  // reconciliere silențioasă (fără loading flag) — ține bara deschisă și scroll-ul pe loc
  const isoWeeks = (n) => { const d = new Date(); d.setDate(d.getDate() + n * 7); return d.toISOString().slice(0, 10); };
  const fetchGrid = useCallback(() => {
    const opts = {};
    const extra = stIds.filter((x) => String(x) !== String(serviceTypeId));
    if (extra.length) opts.sts = extra.join(",");
    if (selectedPlanIds && selectedPlanIds.length) {       // checklist explicit (Quick load plans)
      opts.planIds = selectedPlanIds.join(",");
    } else if (dateMode) {                                  // Smart Load: Date
      opts.offset = offset; opts.from = isoWeeks(-Math.abs(fromW)); opts.to = isoWeeks(Math.abs(toW));
    } else {                                                // Smart Load: Quantity (fereastră)
      opts.offset = offset; opts.prev = prev; opts.next = count;
    }
    return matrixApi.grid(serviceTypeId, opts);
  }, [serviceTypeId, count, offset, prev, dateMode, fromW, toW, stIds, selectedPlanIds]);
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

  // bara „listă live" — responsive la poziția selectată (teamId) + LIVE (se cere din nou la assign/remove)
  const loadCov = useCallback(async () => {
    if (!barOpen) return;
    const ids = (data?.plans || []).map((p) => p.id).join(","); // EXACT fereastra din Matrix
    setCovBusy(true);
    try { setCov(await matrixApi.coverage(serviceTypeId, { planIds: ids, teamId: barFilters.ministry?.teamId })); } catch {}
    finally { setCovBusy(false); }
  }, [barOpen, serviceTypeId, data?.plans, barFilters.ministry?.teamId]);
  useEffect(() => { loadCov(); }, [loadCov]);

  const plans = data?.plans || [];
  const teams = data?.teams || [];
  const nPlans = plans.length;
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  // ─── navigare dată (checklist explicit „Quick load plans") ───
  const planOptions = data?.planOptions || [];              // toate planurile ST-urilor, cronologic
  const optIds = planOptions.map((o) => String(o.id));
  const curSel = () => (selectedPlanIds && selectedPlanIds.length ? selectedPlanIds.map(String) : plans.map((p) => String(p.id)));
  const setSelFrom = (ids) => setSelectedPlanIds(ids.length ? ids : null);
  const addEarlier = () => { const s = curSel(); const idxs = s.map((id) => optIds.indexOf(id)).filter((i) => i >= 0); const min = Math.min(...idxs); if (min > 0) setSelFrom([optIds[min - 1], ...s]); };
  const addLater = () => { const s = curSel(); const idxs = s.map((id) => optIds.indexOf(id)).filter((i) => i >= 0); const max = Math.max(...idxs); if (max < optIds.length - 1) setSelFrom([...s, optIds[max + 1]]); };
  const shiftEarlier = () => { const s = curSel(); const idxs = s.map((id) => optIds.indexOf(id)).filter((i) => i >= 0); const min = Math.min(...idxs), max = Math.max(...idxs); if (min > 0) setSelFrom([optIds[min - 1], ...s.filter((_, i) => optIds.indexOf(s[i]) !== max)]); };
  const shiftLater = () => { const s = curSel(); const idxs = s.map((id) => optIds.indexOf(id)).filter((i) => i >= 0); const min = Math.min(...idxs), max = Math.max(...idxs); if (max < optIds.length - 1) setSelFrom([...s.filter((_, i) => optIds.indexOf(s[i]) !== min), optIds[max + 1]]); };
  const togglePlan = (id) => { const s = curSel(); const has = s.includes(String(id)); setSelFrom(has ? s.filter((x) => x !== String(id)) : [...s, String(id)]); };
  const isSel = (id) => curSel().includes(String(id));
  const removeEarliest = () => { const s = curSel(); if (s.length <= 1) return; const idxs = s.map((id) => optIds.indexOf(id)); const minId = s[idxs.indexOf(Math.min(...idxs))]; setSelFrom(s.filter((x) => x !== minId)); };
  const removeLatest = () => { const s = curSel(); if (s.length <= 1) return; const idxs = s.map((id) => optIds.indexOf(id)); const maxId = s[idxs.indexOf(Math.max(...idxs))]; setSelFrom(s.filter((x) => x !== maxId)); };

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

  // echipa pereche (SIM) + poziția cu același nume — pt. bifa „adaugă și la SIM 2"
  const pereche = useMemo(() => {
    if (!sel) return null;
    const selTeam = teams.find((t) => String(t.teamId) === String(sel.teamId));
    const pn = selTeam && perecheName(selTeam.name);
    if (!pn) return null;
    const pt = teams.find((t) => eq(t.name, pn) && String(t.teamId) !== String(sel.teamId));
    const pp = pt && (pt.positions || []).find((p) => eq(p.name, sel.positionName));
    return pt && pp ? { teamId: pt.teamId, teamName: pt.name, positionId: pp.positionId } : null;
  }, [sel, teams]);

  const openCell = useCallback(async (planId, teamId, positionId, positionName, colIdx) => {
    setTarget(null); setTargetSched(null); setBrowse(false);
    lastSelRef.current = { planId, teamId, positionId, positionName, colIdx };
    setSel({ planId, teamId, positionId, positionName, colIdx });
    // bara „listă live" moștenește filtrul de slujire din poziția selectată (se poate scoate cu × din tag)
    const tName = (data?.teams || []).find((t) => String(t.teamId) === String(teamId))?.name || "";
    setBarFilters((f) => ({ ...f, ministry: { teamId, name: tName } }));
    setRec(null); setRecQuery(""); setRecBusy(true);
    try {
      const r = await plansApi.recommend(planId, { teamId, positionId });
      setRec(r);
      // moștenește gen/SIM din regula poziției (dacă setate)
      const g = r?.defaults?.gender && r.defaults.gender !== "any" ? r.defaults.gender : "";
      const s = r?.defaults?.program && r.defaults.program !== "any" ? r.defaults.program : "";
      setBarFilters((f) => ({ ...f, gender: g, sim: s }));
    }
    catch (e) { setErr(e?.message || "Eroare la recomandări."); }
    finally { setRecBusy(false); }
  }, [data?.teams]);

  // „Vizualizare toți oamenii" — bara dreapta deschisă FĂRĂ poziție (toggle din iconul de sus).
  // Reutilizează /recommend fără teamId/positionId → întoarce toți candidații grupați (fără conflict / cu conflict).
  const openBrowse = useCallback(async () => {
    const pid = (data?.plans || [])[0]?.id;
    if (!pid) { flash("Niciun plan."); return; }
    setBrowse(true); setSel(null); setTarget(null); setTargetSched(null);
    setRec(null); setRecQuery(""); setRecBusy(true);
    try { setRec(await plansApi.recommend(pid)); }
    catch (e) { setErr(e?.message || "Eroare."); }
    finally { setRecBusy(false); }
  }, [data?.plans]);

  // căutare în bară (debounced) — merge și în mod „vizualizare" (fără poziție)
  useEffect(() => {
    if (!sel && !browse) return;
    clearTimeout(recTimer.current);
    recTimer.current = setTimeout(async () => {
      const pid = sel?.planId || (data?.plans || [])[0]?.id;
      if (!pid) return;
      setRecBusy(true);
      try { setRec(await plansApi.recommend(pid, sel ? { teamId: sel.teamId, positionId: sel.positionId, q: recQuery } : { q: recQuery })); }
      finally { setRecBusy(false); }
    }, 280);
    return () => clearTimeout(recTimer.current);
    // eslint-disable-next-line
  }, [recQuery]);

  async function assignPerson(p, mirror, timeIds) {
    if (!sel) { flash("Click pe o căsuță (poziție) din grilă ca să asignezi pe cineva."); return; }
    setAssigning(true);
    const tIds = Array.isArray(timeIds) && timeIds.length ? timeIds : undefined; // gol = toate orele
    const push = (c, id) => ({ ...c, people: [...c.people, { personId: p.id, assignmentId: id, name: p.name, avatar: p.avatar, initials: p.initials, status: "unconfirmed" }], needed: Math.max(0, (c.needed || 0) - 1) });
    // optimist: pune persoana în celulă (+ pe pereche dacă bifat)
    patchCell(sel.teamId, sel.positionId, sel.colIdx, (c) => push(c, `tmp-a-${Date.now()}`));
    const doMirror = mirror && pereche;
    if (doMirror) patchCell(pereche.teamId, pereche.positionId, sel.colIdx, (c) => push(c, `tmp-b-${Date.now()}`));
    try {
      await plansApi.assign(sel.planId, { personId: p.id, teamId: sel.teamId, positionId: sel.positionId, status: "unconfirmed", timeIds: tIds });
      if (doMirror) await plansApi.assign(sel.planId, { personId: p.id, teamId: pereche.teamId, positionId: pereche.positionId, status: "unconfirmed", timeIds: tIds });
      flash(doMirror ? `Asignat + ${pereche.teamName} (fără email).` : "Asignat (neconfirmat, fără email).");
      reconcile(); refreshRec(); loadCov();
    } catch (e) { flash(e?.message || "Eroare."); reconcile(); }
    finally { setAssigning(false); }
  }
  async function addGuest(name) {
    if (!sel) return;
    setAssigning(true);
    const tmpId = `tmp-g-${Date.now()}`;
    patchCell(sel.teamId, sel.positionId, sel.colIdx, (c) => ({
      ...c, needed: Math.max(0, (c.needed || 0) - 1),
      people: [...c.people, { personId: tmpId, assignmentId: tmpId, name, initials: name.slice(0, 2).toUpperCase(), avatar: "", status: "confirmed", isGuest: true }],
    }));
    try { await plansApi.assign(sel.planId, { guestName: name, teamId: sel.teamId, positionId: sel.positionId }); flash(`Invitat „${name}" adăugat (Confirmed, fără email).`); reconcile(); refreshRec(); loadCov(); }
    catch (e) { flash(e?.message || "Eroare."); reconcile(); }
    finally { setAssigning(false); }
  }
  async function removePerson(planId, teamId, positionId, colIdx, assignmentId) {
    patchCell(teamId, positionId, colIdx, (c) => ({ ...c, people: c.people.filter((x) => String(x.assignmentId) !== String(assignmentId)) }));
    try { await plansApi.unassign(planId, assignmentId); flash("Șters."); reconcile(); refreshRec(); loadCov(); }
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
      flash(d.move ? "Mutat." : "Copiat."); reconcile(); loadCov();
    } catch (e) { flash(e?.message || "Eroare."); reconcile(); }
  }
  async function changeNeeded(planId, teamId, positionId, colIdx, nextCount) {
    const n = Math.max(0, nextCount);
    patchCell(teamId, positionId, colIdx, (c) => ({ ...c, needed: n }));
    try { await plansApi.setNeeded(planId, teamId, positionId, n); reconcile(); }
    catch (e) { flash(e?.message || "Eroare."); reconcile(); }
  }
  async function saveRules(positionId, payload) {
    try { await plansApi.setPositionRules(positionId, payload); flash("Reguli poziție salvate."); refreshRec(); }
    catch (e) { flash(e?.message || "Eroare."); }
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
  const closeSide = () => { setSel(null); setBrowse(false); setRec(null); };

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
  const _cur = curSel();
  const _selIdxs = _cur.map((id) => optIds.indexOf(id)).filter((i) => i >= 0);
  const canEarlier = _selIdxs.length > 0 && Math.min(..._selIdxs) > 0;
  const canLater = _selIdxs.length > 0 && Math.max(..._selIdxs) < optIds.length - 1;
  const canRemove = _cur.length > 1;
  // ─── dropdown dată: secțiuni per service type (checklist limitat la prima dată afișată + 6 extra) ───
  const selStIds = (data?.selectedStIds || [String(serviceTypeId)]).map(String);
  const allServiceTypes = data?.serviceTypes || [];
  const planByStId = {};
  planOptions.forEach((o) => (planByStId[String(o.stId)] = planByStId[String(o.stId)] || []).push(o));
  const stSections = selStIds.map((id) => {
    const opts = planByStId[id] || [];
    const idxsSel = opts.map((o, i) => (isSel(o.id) ? i : -1)).filter((i) => i >= 0);
    const minS = idxsSel.length ? Math.min(...idxsSel) : 0;
    const maxS = idxsSel.length ? Math.max(...idxsSel) : 0;
    const vis = opts.slice(minS, Math.min(opts.length, maxS + 1 + 6));
    const stName = opts[0]?.stName || allServiceTypes.find((s) => String(s.id) === id)?.name || "";
    return { id, stName, vis };
  });
  const availableSts = allServiceTypes.filter((s) => !selStIds.includes(String(s.id)) && s.name.toLowerCase().includes(stSearch.trim().toLowerCase()));
  const addServiceType = (id) => { setStIds((p) => [...new Set([...p.map(String), String(id)])]); setSelectedPlanIds(null); setShowAddSt(false); setStSearch(""); };
  const removeServiceType = (id) => { if (String(id) === String(serviceTypeId)) return; setStIds((p) => p.filter((x) => String(x) !== String(id))); setSelectedPlanIds(null); };

  return (
    <div className={`matrix pc-full ${(sel || browse) ? "has-side" : ""} ${showSettings ? "has-left" : ""} ${barOpen ? "has-bar" : ""} ${dragActive ? "drag" : ""}`}>
      {/* ───── bara de sus ───── */}
      <div className="mtop">
        <div className="mt-left">
          <button className="back" onClick={() => router.push("/plans")} title="Înapoi"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3L5 8l5 5" /></svg></button>
          <button className={`gearbtn ${showSettings ? "on" : ""}`} title="Settings / Custom Matrix" onClick={() => { setShowSettings((v) => !v); setShowStMenu(false); }}>⚙</button>
          <div className="st-pick-wrap">
            <button className="st-pick" onClick={() => { setShowStMenu((v) => !v); setShowSettings(false); }}>{data?.serviceTypeName || "Matrix"} <span className="caret">▾</span></button>
            {showStMenu && (
              <div className="st-menu">
                <div className="stm-l">SERVICE TYPES</div>
                {(data?.serviceTypes || []).map((s) => (
                  <button key={s.id} className={`stm-i ${String(s.id) === String(serviceTypeId) ? "on" : ""}`} onClick={() => { setShowStMenu(false); router.push(`/plans/matrix/${s.id}`); }}>
                    {s.name}{String(s.id) === String(serviceTypeId) ? " ✓" : ""}
                  </button>
                ))}
                <button className="stm-new" onClick={() => { setShowStMenu(false); setShowSettings(true); }}>+ New Custom Matrix</button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-center">
          <div className="dnav left">
            <button disabled={!canEarlier} title="Mută o săptămână în urmă" onClick={shiftEarlier}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>
            </button>
            <button disabled={!canEarlier} title="Adaugă un plan la stânga" onClick={addEarlier}><span className="pm">+</span></button>
            <button disabled={!canRemove} title="Scoate planul din stânga" onClick={removeEarliest}><span className="pm">−</span></button>
          </div>
          <div className="drange-wrap">
            <button className="drange" onClick={() => { setShowDateMenu((v) => !v); setShowStMenu(false); setShowSettings(false); }}>{dateRange} <span className="dcaret">▾</span></button>
            {showDateMenu && (
              <div className="date-menu">
                <div className="dm-head">
                  <button className="dm-load" disabled={!canEarlier} onClick={addEarlier}>‹ + Load prev</button>
                  <span className="dm-t">Quick load plans</span>
                  <button className="dm-load" disabled={!canLater} onClick={addLater}>Load next + ›</button>
                </div>
                <button className="dm-done" onClick={() => { setShowDateMenu(false); setShowAddSt(false); }}>Done</button>
                {showAddSt ? (
                  <div className="dm-add">
                    <input className="dm-search" placeholder="Caută folder sau service type" value={stSearch} onChange={(e) => setStSearch(e.target.value)} autoFocus />
                    {availableSts.map((s) => (
                      <button key={s.id} className="dm-addrow" onClick={() => addServiceType(s.id)}>{s.name}</button>
                    ))}
                    {availableSts.length === 0 && <div className="dm-empty">Niciun service type de adăugat.</div>}
                    <button className="dm-cancel" onClick={() => { setShowAddSt(false); setStSearch(""); }}>‹ Înapoi</button>
                  </div>
                ) : (
                  <>
                    <button className="dm-addst" onClick={() => setShowAddSt(true)}>+ Add Service Type</button>
                    {stSections.map((sec) => {
                      const col = dmCol.has(String(sec.id));
                      const nSel = sec.vis.filter((o) => isSel(o.id)).length;
                      return (
                        <div key={sec.id} className="dm-sec">
                          <div className="dm-sechead" onClick={() => toggleDmSec(sec.id)}>
                            <span className={`dm-seccar ${col ? "col" : ""}`}>▾</span>
                            <span className="dm-secn">{sec.stName}</span>
                            {nSel > 0 && <span className="dm-secb">{nSel}</span>}
                            {String(sec.id) !== String(serviceTypeId) && <button className="dm-secx" onClick={(e) => { e.stopPropagation(); removeServiceType(sec.id); }} title="Scoate service type">×</button>}
                          </div>
                          {!col && (
                            <div className="dm-list">
                              {sec.vis.map((o) => (
                                <label key={o.id} className="dm-row">
                                  <input type="checkbox" checked={isSel(o.id)} onChange={() => togglePlan(o.id)} />
                                  <span className="dm-d">{o.dateLabel}</span>
                                </label>
                              ))}
                              {sec.vis.length === 0 && <div className="dm-empty">Niciun plan.</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="dnav right">
            <button disabled={!canRemove} title="Scoate planul din dreapta" onClick={removeLatest}><span className="pm">−</span></button>
            <button disabled={!canLater} title="Adaugă un plan la dreapta" onClick={addLater}><span className="pm">+</span></button>
            <button disabled={!canLater} title="Mută o săptămână înainte" onClick={shiftLater}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
            </button>
          </div>
        </div>
        <div className="mt-right">
          {target && <button className="exit-target" onClick={() => { setTarget(null); setTargetSched(null); }}>⌖ Exit target view</button>}
          <button className={`cover-btn ${barOpen ? "on" : ""}`} title="Listă live (bară jos) — persoane care mai pot fi asignate"
            onClick={() => setBarOpen((v) => !v)}>
            👥 Listă live
          </button>
          <button className={`plan-btn ${(sel || browse) ? "on" : ""}`} title="Vizualizează toți oamenii (toggle). Click pe o căsuță → se schimbă pe acea poziție."
            onClick={() => { if (sel || browse) closeSide(); else openBrowse(); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3" width="11" height="11" rx="1.5" /><path d="M2.5 6h11M5.5 1.5v2.5M10.5 1.5v2.5M8 8.5v3M6.5 10h3" /></svg>
          </button>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      {/* ───── Settings / Custom Matrix (panou stânga) ───── */}
      {showSettings && (
        <aside className="settings">
          <div className="set-head">
            <input className="set-name" placeholder="My Custom Matrix" value={matrixName} onChange={(e) => setMatrixName(e.target.value)} />
            <button className="set-x" onClick={() => setShowSettings(false)} aria-label="Închide">×</button>
          </div>
          <div className="set-sec">SMART LOAD</div>
          <div className="set-modes">
            <button className={`set-mode ${!dateMode ? "on" : ""}`} onClick={() => { setDateMode(false); setSelectedPlanIds(null); }}>Quantity</button>
            <button className={`set-mode ${dateMode ? "on" : ""}`} onClick={() => { setDateMode(true); setSelectedPlanIds(null); }}>Date</button>
          </div>
          {!dateMode ? (
            <>
              <div className="set-row"><span className="set-l">Previous plans</span>
                <span className="stepper"><button onClick={() => { setPrev(Math.max(0, prev - 1)); setOffset(0); setSelectedPlanIds(null); }}>−</button><b>{prev}</b><button onClick={() => { setPrev(prev + 1); setOffset(0); setSelectedPlanIds(null); }}>+</button></span>
              </div>
              <div className="set-row"><span className="set-l">Next plans</span>
                <span className="stepper"><button onClick={() => { setCount(Math.max(1, count - 1)); setOffset(0); setSelectedPlanIds(null); }}>−</button><b>{count}</b><button onClick={() => { setCount(count + 1); setOffset(0); setSelectedPlanIds(null); }}>+</button></span>
              </div>
            </>
          ) : (
            <>
              <div className="set-row"><span className="set-l">From</span>
                <span className="stepper"><button onClick={() => { setFromW(Math.max(0, fromW - 1)); setSelectedPlanIds(null); }}>−</button><b>{fromW}</b><button onClick={() => { setFromW(fromW + 1); setSelectedPlanIds(null); }}>+</button></span>
                <span className="set-x2">week(s) ago</span>
              </div>
              <div className="set-row"><span className="set-l">To</span>
                <span className="stepper"><button onClick={() => { setToW(Math.max(0, toW - 1)); setSelectedPlanIds(null); }}>−</button><b>{toW}</b><button onClick={() => { setToW(toW + 1); setSelectedPlanIds(null); }}>+</button></span>
                <span className="set-x2">weeks from now</span>
              </div>
            </>
          )}
          <div className="set-sec">SERVICE TYPES</div>
          <div className="set-sts">
            {(data?.serviceTypes || []).map((s) => {
              const isBase = String(s.id) === String(serviceTypeId);
              const on = isBase || stIds.map(String).includes(String(s.id));
              return (
                <label key={s.id} className="set-st">
                  <input type="checkbox" checked={on} disabled={isBase}
                    onChange={() => { setStIds((p) => on ? p.filter((x) => String(x) !== String(s.id)) : [...p, String(s.id)]); setOffset(0); setSelectedPlanIds(null); }} />
                  {s.name}{isBase ? " (de bază)" : ""}
                </label>
              );
            })}
          </div>
        </aside>
      )}

      {/* ───── grila (scroll orizontal = carusel) ───── */}
      <div className="grid-wrap">
        {loading && !data ? <div className="empty">Se încarcă matrix-ul…</div> : nPlans === 0 ? <div className="empty">Niciun plan pentru acest service type.</div> : (
          <div className="grid" style={{ gridTemplateColumns: gridCols }}>
            <div className="cell head corner" />
            {plans.map((p, i) => (
              <div key={p.id} className={`cell head planhead ${sel?.colIdx === i ? "selcol" : ""}`}>
                <div className="ph-st">{p.stName || data?.serviceTypeName}</div>
                <div className="ph-date">{p.weekday ? `${p.weekday} · ` : ""}{p.dateLabel}</div>
              </div>
            ))}

            {teams.flatMap((t, ti) => {
              const out = [];
              if (data?.multi && (ti === 0 || teams[ti - 1].stId !== t.stId)) {
                out.push(<div key={`sth-${t.stId}`} className="stgroup" style={{ gridColumn: `1 / span ${nPlans + 1}` }}>{t.stName}</div>);
              }
              out.push(
                <div key={`team-${t.teamId}`} className="teamblock" style={{ gridColumn: `1 / span ${nPlans + 1}` }}>
                  <button className="tb-toggle" onClick={() => toggle(t.teamId)}>
                    <span className={`tb-caret ${collapsed.has(t.teamId) ? "col" : ""}`}>▾</span>{t.name}
                  </button>
                  <div className="tb-actions">
                    <button className="gear" title="Copiază pe echipa pereche (SIM1→SIM2)" onClick={() => copySimTeam(t.teamId)}>⧉</button>
                  </div>
                </div>
              );
              if (collapsed.has(t.teamId)) return out;
              (t.positions || []).forEach((pos) => {
                out.push(<div key={`${t.teamId}-${pos.positionId}-n`} className="cell poslabel" title={`${pos.name} — click: deschide bara de asignare`} onClick={() => openCell(plans[0].id, t.teamId, pos.positionId, pos.name, 0)}>{pos.name}</div>);
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
                            onDragStart={() => { dragRef.current = { personId: pp.personId, assignmentId: pp.assignmentId, planId: plans[ci].id, teamId: t.teamId, positionId: pos.positionId, colIdx: ci, name: pp.name, avatar: pp.avatar, initials: pp.initials, move: false }; setDragActive(true); }}
                            onDragEnd={() => setDragActive(false)}
                            onClick={() => pickTarget(pp)}
                            title={`${pp.name} — click: target view · trage: copiază`}>
                            <PersonAvatar person={pp} status={pp.status} size={22} />
                            <span className={`pn ${pp.status === "declined" ? "decl" : ""}`}>{pp.name}</span>
                            {pp.isGuest && <span className="gtag">invitat</span>}
                            <button className="psch" title="Replanifică — deschide bara de asignare" onClick={(e) => { e.stopPropagation(); openCell(plans[ci].id, t.teamId, pos.positionId, pos.name, ci); }}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></svg>
                            </button>
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
        open={!!sel || browse}
        browse={browse}
        title={sel?.positionName || (browse ? "Toți oamenii" : "")}
        neededCount={rec?.neededCount || 0}
        loading={recBusy}
        groups={rec?.groups || []}
        alreadyHere={rec?.alreadyHere || []}
        query={recQuery}
        onQuery={setRecQuery}
        onPick={assignPerson}
        onClose={closeSide}
        assigning={assigning}
        mirror={pereche ? { available: true, label: `Adaugă și la ${pereche.teamName}` } : null}
        onAddGuest={addGuest}
        defaults={rec?.defaults} positionId={sel?.positionId} onSaveRules={saveRules} instructions={rec?.instructions}
        serviceTimes={rec?.serviceTimes || []}
      />

      <CoverageBar
        open={barOpen} onToggle={() => setBarOpen((v) => !v)} cov={cov} loading={covBusy}
        filters={barFilters} onRemoveFilter={(t) => setBarFilters((f) => ({ ...f, [t]: t === "ministry" ? null : "" }))}
        style={{ left: showSettings ? 316 : 0, right: (sel || browse) ? 348 : 0 }}
        onPersonDragStart={(p) => { dragRef.current = { personId: p.id, name: p.name, avatar: p.avatar, initials: p.initials, fromBar: true, move: false }; setDragActive(true); }}
        onPersonDragEnd={() => setDragActive(false)}
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
        /* înălțime FIXĂ cât viewport-ul sub nav → grila umple restul și X-scroll-ul e PINNED jos (vizibil mereu) */
        /* padding-bottom = înălțimea barei „Listă live" collapse (--cbar-h): grila se oprește MEREU fix deasupra ei,
           așa că X-scroll-ul rămâne vizibil chiar și cu bara închisă (bara stă DEDESUBT, nu peste scroll). */
        .matrix { height: calc(100vh - var(--nav-h)); display: flex; flex-direction: column; overflow: hidden; padding: 14px 16px var(--cbar-h); transition: padding .22s cubic-bezier(.4,0,.2,1); }
        .matrix.has-side { padding-right: 356px; }  /* loc pt. bara lipită dreapta */
        .matrix.has-left { padding-left: 336px; }   /* loc pt. panoul Settings din stânga */
        .matrix.has-bar { padding-bottom: 46vh; }   /* bara extinsă → grila se oprește în ea (X-scroll tot pinned) */
        .matrix.drag .datacell { box-shadow: inset 0 0 0 1px rgba(47,129,247,.3); background: rgba(47,129,247,.04); }
        .matrix.drag .datacell:hover { box-shadow: inset 0 0 0 2px var(--primary); background: rgba(47,129,247,.12); }
        .mtop { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .mt-left { display: flex; align-items: center; gap: 8px; }
        .back { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 5px; }
        .back:hover { color: var(--text); }
        .gearbtn { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 15px; }
        .gearbtn.on, .gearbtn:hover { color: var(--text); border-color: var(--primary); }
        .st-pick-wrap { position: relative; }
        .st-pick { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; padding: 6px 12px; color: var(--text); font-size: 13.5px; font-weight: 600; cursor: pointer; }
        .st-pick:hover { border-color: var(--primary); }
        .st-menu { position: absolute; left: 0; top: 38px; z-index: 50; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; padding: 6px; min-width: 260px; box-shadow: 0 8px 28px rgba(0,0,0,.45); display: flex; flex-direction: column; max-height: 60vh; overflow: auto; }
        .stm-l { color: var(--text-faint); font-size: 10px; letter-spacing: .5px; padding: 6px 8px 4px; }
        .stm-i { text-align: left; background: transparent; border: none; color: var(--text-dim); padding: 7px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .stm-i:hover { background: rgba(255,255,255,.06); color: var(--text); } .stm-i.on { color: var(--text); font-weight: 600; }
        .stm-new { text-align: left; margin-top: 4px; border-top: 1px solid var(--border); background: transparent; border-left: none; border-right: none; border-bottom: none; color: var(--primary); padding: 9px 10px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .stm-new:hover { background: rgba(47,129,247,.1); }
        .settings { position: fixed; top: var(--nav-h); left: 0; bottom: 0; width: 316px; background: var(--surface); border-right: 1px solid var(--border); z-index: 45; padding: 16px; overflow: auto; box-shadow: 8px 0 24px rgba(0,0,0,.28); }
        .set-head { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }
        .set-name { flex: 1; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; height: 34px; padding: 0 10px; color: var(--text); font-size: 14px; font-weight: 600; outline: none; }
        .set-name:focus { border-color: var(--primary); }
        .set-x { background: transparent; border: none; color: var(--text-faint); font-size: 22px; cursor: pointer; line-height: 1; }
        .set-sec { color: var(--text-faint); font-size: 10.5px; letter-spacing: .6px; margin: 16px 0 8px; }
        .set-modes { display: flex; border: 1px solid var(--border-strong); border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
        .set-mode { flex: 1; background: var(--surface-2); border: none; color: var(--text-dim); padding: 8px 0; cursor: pointer; font-size: 13px; border-right: 1px solid var(--border-strong); }
        .set-mode:last-child { border-right: none; } .set-mode.on { background: var(--primary); color: #fff; font-weight: 600; }
        .set-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; font-size: 13px; color: var(--text-dim); }
        .set-l { flex: 1; } .set-x2 { color: var(--text-faint); font-size: 12px; }
        .stepper { display: inline-flex; align-items: center; gap: 2px; }
        .stepper button { width: 26px; height: 26px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; cursor: pointer; font-size: 14px; }
        .stepper button:hover { color: var(--text); } .stepper b { min-width: 28px; text-align: center; color: var(--text); font-size: 13px; }
        .set-sts { display: flex; flex-direction: column; gap: 2px; }
        .set-st { display: flex; align-items: center; gap: 8px; color: var(--text-dim); font-size: 13px; padding: 6px 4px; cursor: pointer; }
        .set-st input { accent-color: var(--primary); }
        .stgroup { background: var(--primary); color: #fff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; padding: 7px 14px; position: sticky; left: 0; z-index: 2; border-top: 1px solid var(--border); }
        .caret { color: var(--text-faint); font-size: 10px; }
        .mt-center { flex: 1; display: flex; align-items: center; justify-content: center; gap: 14px; }
        /* controale segmentate (3-în-1): ‹ + −   și   − + › — un singur buton delimitat în trei */
        .dnav { display: inline-flex; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 8px; overflow: hidden; }
        .dnav button { width: 33px; height: 30px; background: transparent; border: none; border-right: 1px solid var(--border-strong); color: var(--text-dim); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .dnav button:last-child { border-right: none; }
        .dnav button:hover:not(:disabled) { color: var(--text); background: rgba(47,129,247,.14); }
        .dnav button:disabled { opacity: .3; cursor: default; }
        .pm { font-size: 18px; font-weight: 500; line-height: 1; }
        .drange-wrap { position: relative; }
        .drange { color: var(--text); font-size: 16px; font-weight: 600; min-width: 180px; text-align: center; background: transparent; border: none; cursor: pointer; padding: 4px 8px; border-radius: 7px; }
        .drange:hover { background: rgba(255,255,255,.05); } .dcaret { color: var(--text-faint); font-size: 11px; }
        .date-menu { position: absolute; left: 50%; transform: translateX(-50%); top: 40px; z-index: 50; width: 380px; max-height: 62vh; overflow: auto;
          background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 8px 28px rgba(0,0,0,.45); padding: 10px 12px; }
        .dm-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 2px 2px 10px; border-bottom: 1px solid var(--border); }
        .dm-t { color: var(--text); font-weight: 700; font-size: 13.5px; white-space: nowrap; }
        .dm-st { color: var(--text-dim); font-size: 12.5px; font-weight: 600; padding: 10px 2px 2px; }
        .dm-done { width: 100%; margin: 10px 0 4px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 7px; padding: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .dm-done:hover { border-color: var(--primary); }
        .dm-addst { width: 100%; margin: 8px 0; background: transparent; border: 1px dashed var(--border-strong); color: var(--primary); border-radius: 7px; padding: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .dm-addst:hover { background: rgba(47,129,247,.08); }
        .dm-add { display: flex; flex-direction: column; gap: 4px; padding-top: 10px; }
        .dm-search { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 7px; height: 34px; padding: 0 10px; color: var(--text); font-size: 13px; outline: none; margin-bottom: 6px; }
        .dm-search:focus { border-color: var(--primary); }
        .dm-addrow { text-align: left; background: transparent; border: none; color: var(--text); padding: 9px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .dm-addrow:hover { background: rgba(255,255,255,.06); }
        .dm-cancel { text-align: left; margin-top: 6px; background: transparent; border: none; color: var(--text-dim); padding: 8px 10px; cursor: pointer; font-size: 12.5px; }
        .dm-cancel:hover { color: var(--text); }
        .dm-sec { padding-top: 10px; }
        .dm-sechead { display: flex; align-items: center; gap: 8px; color: var(--text-dim); font-size: 12.5px; font-weight: 700;
          background: var(--section-head-bg); border-radius: 7px; padding: 8px 10px; cursor: pointer; }
        .dm-sechead:hover { background: #26303c; }
        .dm-seccar { color: var(--text-faint); font-size: 10px; transition: transform .12s; flex: none; }
        .dm-seccar.col { transform: rotate(-90deg); }
        .dm-secn { color: var(--text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dm-secb { color: var(--text-dim); font-size: 11px; background: var(--surface-2); border-radius: 20px; padding: 1px 9px; min-width: 22px; text-align: center; flex: none; }
        .dm-secx { background: transparent; border: none; color: var(--text-faint); font-size: 17px; cursor: pointer; line-height: 1; flex: none; padding: 0 2px; }
        .dm-secx:hover { color: var(--danger); }
        .dm-load { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 5px 8px; font-size: 11.5px; cursor: pointer; white-space: nowrap; }
        .dm-load:hover:not(:disabled) { color: var(--text); border-color: var(--primary); } .dm-load:disabled { opacity: .35; cursor: default; }
        .dm-list { padding: 6px 2px; display: flex; flex-direction: column; }
        .dm-row { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-dim); }
        .dm-row:hover { background: rgba(255,255,255,.05); } .dm-row input { accent-color: var(--primary); }
        .dm-d { color: var(--text); }
        .dm-empty { color: var(--text-faint); font-size: 12px; padding: 10px; }
        .mt-right { display: flex; align-items: center; gap: 12px; }
        .exit-target { background: rgba(47,129,247,.14); border: 1px solid var(--primary); color: #9cc4f5; border-radius: 6px; padding: 5px 10px; font-size: 12.5px; cursor: pointer; }
        .cover-btn { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 5px 11px; font-size: 12.5px; cursor: pointer; }
        .cover-btn:hover { color: var(--text); border-color: var(--primary); }
        .cover-btn.on { background: rgba(47,129,247,.14); border-color: var(--primary); color: #9cc4f5; }
        .plan-btn { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); width: 34px; height: 32px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .plan-btn:hover, .plan-btn.on { color: var(--text); border-color: var(--primary); }
        .cnt { color: var(--text-dim); font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px; }
        .cnt select { background: var(--surface-2); color: var(--text); border: 1px solid var(--border-strong); border-radius: 6px; height: 28px; }
        .grid-wrap { flex: 1; min-height: 0; overflow: auto; border: 1px solid var(--border); border-radius: 8px; }
        /* scrollbar orizontal mai gros & clar (dublu), același design */
        .grid-wrap::-webkit-scrollbar { height: 18px; width: 12px; }
        .grid-wrap::-webkit-scrollbar-thumb { background: #39434f; border-radius: 9px; border: 4px solid transparent; background-clip: content-box; }
        .grid-wrap::-webkit-scrollbar-thumb:hover { background: #4a5663; background-clip: content-box; }
        .grid-wrap { scrollbar-width: auto; }
        .grid { display: grid; min-width: max-content; }
        .cell { border-bottom: 1px solid var(--border-soft); border-right: 1px solid var(--border-soft); font-size: 12.5px; }
        .head { position: sticky; top: 0; z-index: 3; background: var(--surface-2); }
        .corner { position: sticky; left: 0; z-index: 4; }
        .planhead { padding: 8px 12px; background: var(--surface-2); }
        /* tint-ul de coloană selectată se compune PESTE fundalul opac (altfel header-ul devine translucid
           și se vede conținutul care derulează pe sub — vizibil mai ales pe ultima coloană). */
        .planhead.selcol { background: linear-gradient(rgba(47,129,247,.14), rgba(47,129,247,.14)), var(--surface-2); }
        .ph-st { color: var(--text-faint); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ph-date { color: var(--text); font-size: 12.5px; font-weight: 600; margin-top: 2px; }
        .teamblock { background: var(--section-head-bg); border-bottom: 1px solid var(--border); border-top: 1px solid var(--border);
          position: sticky; left: 0; z-index: 2; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; }
        .tb-toggle { background: transparent; border: none; color: var(--text); font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
        .tb-caret { color: var(--text-faint); font-size: 10px; } .tb-caret.col { transform: rotate(-90deg); }
        .tb-actions .gear { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 5px; }
        .tb-actions .gear:hover { color: var(--text); background: rgba(255,255,255,.06); }
        .poslabel { position: sticky; left: 0; z-index: 1; background: var(--surface); color: var(--text-dim); cursor: pointer;
          text-align: right; padding: 9px 12px; display: flex; align-items: center; justify-content: flex-end; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
        .poslabel:hover { color: var(--text); background: var(--row-hover); }
        .datacell { padding: 6px 8px; background: var(--bg); min-height: 38px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; }
        .datacell:hover { background: var(--row-hover); }
        .datacell.sel { background: rgba(47,129,247,.10); box-shadow: inset 0 0 0 1px var(--primary); }
        .person { display: flex; align-items: center; gap: 7px; padding: 2px 3px; border-radius: 5px; cursor: grab; }
        .person:hover { background: rgba(255,255,255,.055); }
        .person.dim { opacity: .28; }
        .person.hit { background: rgba(47,129,247,.18); box-shadow: inset 0 0 0 1px var(--primary); }
        .pn { color: var(--text); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .gtag { flex: none; font-size: 9px; color: var(--product); border: 1px solid rgba(87,185,138,.5); border-radius: 10px; padding: 0 5px; text-transform: uppercase; letter-spacing: .3px; }
        .pn.decl { text-decoration: line-through; opacity: .6; }
        .prm, .ped, .psch { opacity: 0; background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 12px; line-height: 1; padding: 0 2px; flex: none; display: inline-flex; align-items: center; }
        .prm { font-size: 15px; }
        .person:hover .prm, .person:hover .ped, .person:hover .psch { opacity: 1; }
        .prm:hover { color: var(--danger); } .ped:hover { color: var(--primary); } .psch:hover { color: var(--product); }
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
