"use client";
/**
 * Matrix — planificare multi-plan, 1:1 cu PCO. /api/pc/v1/matrix/:serviceTypeId.
 * LĂȚIME COMPLETĂ (.pc-full): etichete poziții STÂNGA (sticky), coloane = planuri (date),
 * iar bara de asignare e GLOBALĂ și lipită în DREAPTA ecranului (AssignSidebar).
 * Celule = oameni ca AVATAR + badge status în colț (PersonAvatar) + „Needed" (−/N/+).
 * UX seamless: update OPTIMIST + reconciliere silențioasă (fără flash „Se încarcă").
 * Target view (click pe om → unde mai e planificat). Drag = MUTĂ (Kanban); Ctrl/Cmd = COPIAZĂ.
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
import TeamsManagerModal from "@/components/plans/TeamsManagerModal";
import PositionJoinModal from "@/components/plans/PositionJoinModal";
import ConflictModal from "@/components/plans/ConflictModal";
import ReplaceModal from "@/components/plans/ReplaceModal";

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
  // stare de vizualizare salvată per service type (session) → revii și e unde ai rămas, nu resetat
  const MKEY = `pc:matrix:${serviceTypeId}`;
  const mstoreRef = useRef(null);
  if (mstoreRef.current === null) {
    try { mstoreRef.current = (typeof window !== "undefined") ? JSON.parse(sessionStorage.getItem(MKEY) || "{}") : {}; } catch { mstoreRef.current = {}; }
  }
  const mstore = mstoreRef.current;
  // dacă vii dintr-un plan (buton „Matrix"), ?focus=<planId> → deschide EXACT acel plan (o coloană), peste starea salvată
  const focusId = (typeof window !== "undefined") ? new URLSearchParams(window.location.search).get("focus") : null;
  const [data, setData] = useState(null);
  const [count, setCount] = useState(() => mstore.count ?? 1);          // default 1 coloană (cea mai apropiată); extinzi cu „+"
  const [offset, setOffset] = useState(() => mstore.offset ?? 0);
  const [prev, setPrev] = useState(() => mstore.prev ?? 0);            // „Previous plans" (Quantity)
  const [dateMode, setDateMode] = useState(() => mstore.dateMode ?? false); // Smart Load: Quantity vs Date
  const [fromW, setFromW] = useState(() => mstore.fromW ?? 1);          // Date: N săptămâni în urmă
  const [toW, setToW] = useState(() => mstore.toW ?? 4);              // Date: N săptămâni înainte
  const [stIds, setStIds] = useState(() => (mstore.stIds?.length ? mstore.stIds.map(String) : [String(serviceTypeId)])); // Custom Matrix: service types incluse
  const [matrixName, setMatrixName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showTeams, setShowTeams] = useState(false);   // modal Teams management (#9)
  const [canManage, setCanManage] = useState(false);   // services.manageTeams (echipe/poziții)
  const [canAddPlan, setCanAddPlan] = useState(false);  // services.addPlan (quick-add coloană)
  const [caps, setCaps] = useState({});                 // capabilitățile granulare (din /me)
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [newPlanDate, setNewPlanDate] = useState("");
  const [addingPlan, setAddingPlan] = useState(false);
  const [showStMenu, setShowStMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showAddSt, setShowAddSt] = useState(false);   // „Add Service Type" în dropdown-ul de dată
  const [stSearch, setStSearch] = useState("");
  const [dmCol, setDmCol] = useState(() => new Set());  // secțiuni ST colapsate în dropdown-ul de dată
  const toggleDmSec = (id) => setDmCol((s) => { const n = new Set(s); n.has(String(id)) ? n.delete(String(id)) : n.add(String(id)); return n; });
  const [selectedPlanIds, setSelectedPlanIds] = useState(() => (focusId ? [focusId] : (mstore.selectedPlanIds ?? null))); // null = mod fereastră (prev/next); array = checklist explicit
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set(mstore.collapsed || []));
  const [sel, setSel] = useState(null);           // {planId, teamId, positionId, positionName, colIdx}
  const [rec, setRec] = useState(null);
  const [recBusy, setRecBusy] = useState(false);
  const [recQuery, setRecQuery] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [target, setTarget] = useState(null);
  const [targetSched, setTargetSched] = useState(null);
  const [targetAvail, setTargetAvail] = useState({}); // planId → {blockout,here,busy,busyLabel} (target-mode)
  const [targetWeeks, setTargetWeeks] = useState(null); // {youthMember, serviceTypes, cards} — carduri pe săptămână
  const [selSts, setSelSts] = useState(null); // service types bifate (null = default-ul din backend)
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(null);
  const [simPair, setSimPair] = useState(null); // prompt „pune-l și la SIM-ul pereche?" după asignare
  const [simBusy, setSimBusy] = useState(false);
  const [joinModal, setJoinModal] = useState(null); // om nou pe poziție → guest (o zi) / permanent (roster)
  const [joinBusy, setJoinBusy] = useState(false);
  const [replaceModal, setReplaceModal] = useState(null); // poziție plină (needed=0) → pe cine înlocuiești?
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [barOpen, setBarOpen] = useState(false);   // bara de jos „listă live"
  const [browse, setBrowse] = useState(false);     // sidebar dreapta în mod „vizualizare toți oamenii" (fără poziție)
  const [cov, setCov] = useState(null);
  const [covBusy, setCovBusy] = useState(false);
  // filtre bară: ministry+position = AUTO (din poziția selectată, doar prioritizare soft);
  // gender+sim = din WIDGET-uri (filtru HARD, se stackează, elimină celelalte valori)
  const [barFilters, setBarFilters] = useState({ ministry: null, position: null, fit: true, gender: "", sim: "" });
  // mod REASIGNARE (din modalul de conflicte): bara se deschide peste overlay, filtrată pe poziția conflictului
  const [reassignBar, setReassignBar] = useState(null); // {teamId, teamName, positionId, positionName} | null
  const [reFilters, setReFilters] = useState({ fit: true, gender: "", sim: "" });
  const [reassignDisable, setReassignDisable] = useState(null); // personId dezactivat în Listă live (nu te înlocuiești cu tine)
  const [liveConflictPerson, setLiveConflictPerson] = useState(null); // „Verifică" din Listă live → ConflictModal
  const barWasOpenRef = useRef(false); // reține dacă bara era deschisă înainte de reasignare (ca s-o restaurăm)
  const [dragActive, setDragActive] = useState(false); // feedback drag (Kanban)
  const [dropKey, setDropKey] = useState(null);         // celula peste care e drag-ul acum (evidențiere)
  const [dragHint, setDragHint] = useState("");         // indiciu flotant în timpul drag-ului
  const dragRef = useRef(null);
  const lastSelRef = useRef(null); // ultima poziție deschisă — pt. butonul „planning"
  const recTimer = useRef(null);
  const recCache = useRef(new Map()); // cache SWR pt. /recommend (cheie: plan|team|poziție) → bara se deschide instant

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
  // reconciliere „soft": amânată + debounced, ca să NU clipească celula imediat după o acțiune optimistă
  // (optimistul rămâne pe ecran cu id-ul real; adevărul de pe server se sincronizează în liniște).
  const softTimer = useRef(null);
  const softReconcile = useCallback(() => {
    clearTimeout(softTimer.current);
    softTimer.current = setTimeout(() => reconcile(), 900);
  }, [reconcile]);
  useEffect(() => { load(); }, [load]);
  // focus-ul se aplică O singură dată → scoatem ?focus din URL (fără reload), ca re-mount-ul să nu-l reaplice
  useEffect(() => {
    if (focusId && typeof window !== "undefined") {
      const u = new URL(window.location.href); u.searchParams.delete("focus");
      window.history.replaceState({}, "", u.pathname + u.search);
    }
    // eslint-disable-next-line
  }, []);
  // salvează starea de vizualizare (session) → la revenirea pe tab, e unde ai rămas
  useEffect(() => {
    try { sessionStorage.setItem(MKEY, JSON.stringify({ count, offset, prev, dateMode, fromW, toW, stIds, selectedPlanIds, collapsed: [...collapsed] })); } catch {}
  }, [MKEY, count, offset, prev, dateMode, fromW, toW, stIds, selectedPlanIds, collapsed]);
  // cine poate administra echipele (buton „Echipe" + modal #9)
  useEffect(() => { peopleApi.me().then((r) => { const c = r?.capabilities || {}; setCaps(c); setCanManage(!!c.manageTeams); setCanAddPlan(!!c.addPlan); }).catch(() => {}); }, []);
  // capabilități granulare de editare în Matrix (umbrella services.schedule le dă pe toate)
  const canAssign = !!caps.assign, canMove = !!caps.move, canEditNeeded = !!caps.editNeeded, canRoster = !!caps.roster;

  // bara „listă live" — responsive la poziția selectată (teamId) + LIVE (se cere din nou la assign/remove)
  const loadCov = useCallback(async () => {
    if (!barOpen) return;
    const ids = (data?.plans || []).map((p) => p.id).join(","); // EXACT fereastra din Matrix
    setCovBusy(true);
    // în mod reasignare, bara se filtrează pe poziția CONFLICTULUI, nu pe cea selectată în grilă
    const covTeam = reassignBar ? reassignBar.teamId : barFilters.ministry?.teamId;
    const covPos = reassignBar ? reassignBar.positionId : barFilters.position?.positionId;
    // Listă live se raportează DOAR la săptămâna planului de referință (ziua lui): conflicte/blockout-uri pe acea zi
    const refPlanId = reassignBar ? reassignBar.planId : sel?.planId;
    try { setCov(await matrixApi.coverage(serviceTypeId, { planIds: ids, teamId: covTeam, positionId: covPos, refPlanId })); } catch {}
    finally { setCovBusy(false); }
  }, [barOpen, serviceTypeId, data?.plans, barFilters.ministry?.teamId, barFilters.position?.positionId, reassignBar?.teamId, reassignBar?.positionId, reassignBar?.planId, sel?.planId]);
  useEffect(() => { loadCov(); }, [loadCov]);

  const plans = data?.plans || [];
  const teams = data?.teams || [];
  const nPlans = plans.length;
  // celula din grilă (needed + people) pt. o poziție/plan — folosit la limita de „needed"
  const cellOf = (teamId, positionId, colIdx) => {
    const t = teams.find((x) => String(x.teamId) === String(teamId));
    const pos = (t?.positions || []).find((p) => String(p.positionId) === String(positionId));
    return (pos?.cells || [])[colIdx] || null;
  };
  const activeOccupants = (cell) => (cell?.people || []).filter((x) => x.status !== "declined" && !String(x.assignmentId).startsWith("tmp-"));
  // ocupantul poziției SELECTATE (pt. pasul 2 „Înlocuiește" din modalul de conflicte)
  const selOccupant = (() => {
    if (!sel) return null;
    const t = teams.find((x) => String(x.teamId) === String(sel.teamId));
    const pos = (t?.positions || []).find((p) => String(p.positionId) === String(sel.positionId));
    const first = ((pos?.cells || [])[sel.colIdx]?.people || [])[0];
    return first ? { assignmentId: first.assignmentId, personId: first.personId, name: first.name, avatar: first.avatar || "", initials: first.initials || "" } : null;
  })();
  const conflictTarget = sel ? { planId: sel.planId, teamId: sel.teamId, positionId: sel.positionId, positionName: sel.positionName,
    teamName: teams.find((t) => String(t.teamId) === String(sel.teamId))?.name || "", occupant: selOccupant } : null;
  // resolver SIM-pereche pt. modalul de conflicte: întoarce echipa+poziția pereche DOAR dacă celula pereche
  // de pe acel plan NU îl are deja pe acel om (altfel null → nu oferim).
  const simPairResolver = (teamName, positionName, pPlanId, personId) => {
    const pn = perecheName(teamName); if (!pn) return null;
    const pt = teams.find((t) => eq(t.name, pn)); if (!pt) return null;
    const pp = (pt.positions || []).find((p) => eq(p.name, positionName)); if (!pp) return null;
    const colIdx = plans.findIndex((pl) => String(pl.id) === String(pPlanId));
    if (colIdx < 0) return null; // planul nu e în vizor → nu putem verifica → nu oferim
    const cell = (pp.cells || [])[colIdx];
    if ((cell?.people || []).some((x) => String(x.personId) === String(personId))) return null; // deja acolo
    return { pairTeamId: pt.teamId, pairPositionId: pp.positionId, pairTeamName: pt.name };
  };
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
    try {
      const r = await plansApi.recommend(sel.planId, { teamId: sel.teamId, positionId: sel.positionId, q: recQuery });
      setRec(r);
      if (!recQuery) recCache.current.set(`${sel.planId}|${sel.teamId}|${sel.positionId}`, r); // ține cache-ul proaspăt
    } catch {}
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
    // bara „listă live" moștenește echipa + poziția selectată (DOAR prioritizare soft; se scot cu × din tag).
    // gender/sim NU se ating aici — sunt filtre HARD controlate exclusiv din widget-urile din bară.
    const tName = (data?.teams || []).find((t) => String(t.teamId) === String(teamId))?.name || "";
    // la selectarea unei poziții, filtrul „Fit" pornește ON (vezi doar rosterul poziției); îl scoți pe „Toate"
    setBarFilters((f) => ({ ...f, ministry: { teamId, name: tName }, position: { positionId, name: positionName }, fit: true }));
    setRecQuery("");
    // SWR: dacă avem cache pentru celulă, arătăm INSTANT, apoi revalidăm silențios în fundal
    const key = `${planId}|${teamId}|${positionId}`;
    const cached = recCache.current.get(key);
    if (cached) { setRec(cached); setRecBusy(false); } else { setRec(null); setRecBusy(true); }
    try {
      const r = await plansApi.recommend(planId, { teamId, positionId });
      recCache.current.set(key, r); setRec(r);
    }
    catch (e) { if (!cached) setErr(e?.message || "Eroare la recomandări."); }
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

  // După orice asignare, dacă echipa are pereche de SIM (ex. Asimilare SIM1 ↔ SIM2) și poziția identică
  // de la pereche NU e deja ocupată de persoană → oferă (modal) să-l pui și la celălalt program.
  function maybeOfferSimPair(planId, person, teamId, positionId, colIdx) {
    if (!person?.id || String(person.id).startsWith("tmp-")) return; // invitați / temporar
    const team = teams.find((t) => String(t.teamId) === String(teamId));
    if (!team) return;
    const pairName = perecheName(team.name);
    if (!pairName) return;
    const pairTeam = teams.find((t) => eq(t.name, pairName) && String(t.teamId) !== String(teamId));
    if (!pairTeam) return;
    const pos = (team.positions || []).find((p) => String(p.positionId) === String(positionId));
    const pairPos = pos && (pairTeam.positions || []).find((p) => eq(p.name, pos.name));
    if (!pairPos) return;
    const pairCell = (pairPos.cells || [])[colIdx];
    if (pairCell && (pairCell.people || []).some((x) => String(x.personId) === String(person.id))) return; // deja acolo
    setSimPair({ planId, colIdx, person: { id: person.id, name: person.name, avatar: person.avatar || "", initials: person.initials || "" },
      toTeamId: pairTeam.teamId, toTeamName: pairTeam.name, toPositionId: pairPos.positionId, positionName: pairPos.name });
  }
  async function confirmSimPair() {
    if (!simPair) return;
    const sp = simPair; setSimBusy(true);
    const tmpId = `tmp-sp-${Date.now()}`;
    patchCell(sp.toTeamId, sp.toPositionId, sp.colIdx, (c) => ({ ...c, needed: Math.max(0, (c.needed || 0) - 1),
      people: [...c.people, { personId: sp.person.id, assignmentId: tmpId, name: sp.person.name, avatar: sp.person.avatar, initials: sp.person.initials, status: "unconfirmed" }] }));
    try { await plansApi.assign(sp.planId, { personId: sp.person.id, teamId: sp.toTeamId, positionId: sp.toPositionId, status: "unconfirmed" }); flash(`Adăugat și la ${sp.toTeamName} (fără email).`); loadCov(); softReconcile(); }
    catch (e) { flash(e?.message || "Eroare."); reconcile(); }
    finally { setSimBusy(false); setSimPair(null); }
  }

  // ── asignare dinamică: om REAL pus pe o poziție din care NU face parte → guest (o zi) / permanent (roster) ──
  const teamNameOf = (tid) => teams.find((t) => String(t.teamId) === String(tid))?.name || "";
  const posNameOf = (tid, pid) => {
    const t = teams.find((x) => String(x.teamId) === String(tid));
    return (t?.positions || []).find((p) => String(p.positionId) === String(pid))?.name || "";
  };
  // check roster ÎNAINTE de a scrie: dacă NU e în roster → „stage" (scriem în DB DOAR la alegere).
  // Așa, X / Escape / click-afară / refresh NU lasă persoana asignată (nimic scris până la decizie).
  async function needsJoin(p, positionId) {
    if (!p?.id || String(p.id).startsWith("tmp-")) return false;
    // sursă primară: inRoster știut deja (din recommend/coverage — fără round-trip, merge fără backend nou)
    if (p.inRoster === true) return false;
    if (p.inRoster === false) return true;
    // necunoscut (ex. drag între celule) → întreabă serverul; dacă pică, NU asigna tăcut → arată modalul (sigur)
    try { return (await plansApi.isRoster(positionId, p.id))?.inRoster === false; } catch { return true; }
  }
  function stageJoin(j) { setJoinModal({ staged: true, ...j }); }
  // commit DOAR la alegere: abia ACUM punem persoana în celulă (optimist) + scriem. Până aici nu există nimic.
  async function commitStaged(j) {
    const tmp = `tmp-c-${Date.now()}`;
    patchCell(j.teamId, j.positionId, j.colIdx, (c) => ({ ...c, needed: Math.max(0, (c.needed || 0) - 1),
      people: [...c.people, { personId: j.person.id, assignmentId: tmp, name: j.person.name, avatar: j.person.avatar, initials: j.person.initials, status: "unconfirmed" }] }));
    const r = await plansApi.assign(j.planId, { personId: j.person.id, teamId: j.teamId, positionId: j.positionId, status: "unconfirmed", timeIds: j.timeIds });
    if (r?.id) patchCell(j.teamId, j.positionId, j.colIdx, (c) => ({ ...c, people: c.people.map((x) => String(x.assignmentId) === String(tmp) ? { ...x, assignmentId: r.id } : x) }));
  }
  async function confirmJoinGuest() {
    if (!joinModal) return; const j = joinModal; setJoinBusy(true);
    try {
      if (j.staged) await commitStaged(j);
      await plansApi.guestLog(j.planId, { personId: j.person.id, teamId: j.teamId, positionId: j.positionId });
      flash(`${j.person.name} — guest o zi pe „${j.positionName}" (logat, fără email).`); refreshRec(); loadCov(); softReconcile();
    } catch (e) { flash(e?.message || "Eroare."); reconcile(); }
    finally { setJoinBusy(false); setJoinModal(null); }
  }
  async function confirmJoinPermanent() {
    if (!joinModal) return; const j = joinModal; setJoinBusy(true);
    try {
      if (j.staged) await commitStaged(j);
      await peopleApi.rosterAdd(j.person.id, [j.positionId]);
      flash(`${j.person.name} adăugat oficial pe „${j.positionName}".`); refreshRec(); loadCov(); softReconcile();
    } catch (e) { flash(e?.message || "Eroare."); reconcile(); }
    finally { setJoinBusy(false); setJoinModal(null); }
  }
  function cancelJoin() { setJoinModal(null); } // nimic n-a fost pus în celulă până la alegere → nimic de curățat (zero flicker)

  // „needed" ca LIMITĂ: dacă asignezi pe o poziție PLINĂ (needed=0 + ocupată) → întâi întreabă pe cine înlocuiești
  function assignPerson(p, mirror, timeIds) {
    if (!sel) { flash("Click pe o căsuță (poziție) din grilă ca să asignezi pe cineva."); return; }
    const doMirror = mirror && pereche;
    const cell = cellOf(sel.teamId, sel.positionId, sel.colIdx);
    const occ = activeOccupants(cell);
    if (!doMirror && cell && (cell.needed || 0) <= 0 && occ.length > 0) {
      setReplaceModal({ person: { id: p.id, name: p.name, avatar: p.avatar || "", initials: p.initials || "", inRoster: p.inRoster }, timeIds,
        occupants: occ, positionName: sel.positionName, teamName: teamNameOf(sel.teamId), planId: sel.planId, teamId: sel.teamId, positionId: sel.positionId, colIdx: sel.colIdx });
      return;
    }
    doAssign(p, mirror, timeIds);
  }
  // asignează o persoană pe un target EXPLICIT (planId/teamId/positionId/colIdx), cu fluxul join/SIM-pair
  async function assignToTarget(t) {
    const p = t.person;
    if (await needsJoin(p, t.positionId)) {
      stageJoin({ planId: t.planId, teamId: t.teamId, positionId: t.positionId, colIdx: t.colIdx, timeIds: t.timeIds, positionName: t.positionName, teamName: t.teamName, person: p });
      return;
    }
    setAssigning(true);
    const tmp = `tmp-a-${Date.now()}`;
    patchCell(t.teamId, t.positionId, t.colIdx, (c) => ({ ...c, needed: Math.max(0, (c.needed || 0) - 1),
      people: [...c.people, { personId: p.id, assignmentId: tmp, name: p.name, avatar: p.avatar, initials: p.initials, status: "unconfirmed" }] }));
    try {
      const r = await plansApi.assign(t.planId, { personId: p.id, teamId: t.teamId, positionId: t.positionId, status: "unconfirmed", timeIds: t.timeIds });
      if (r?.id) patchCell(t.teamId, t.positionId, t.colIdx, (c) => ({ ...c, people: c.people.map((x) => String(x.assignmentId) === String(tmp) ? { ...x, assignmentId: r.id } : x) }));
      flash("Asignat (neconfirmat, fără email).");
      maybeOfferSimPair(t.planId, p, t.teamId, t.positionId, t.colIdx);
      refreshRec(); loadCov(); softReconcile();
    } catch (e) { flash(e?.message || "Eroare."); reconcile(); }
    finally { setAssigning(false); }
  }
  // scoate ocupantul (→ declined) apoi asignează noul om; sau doar adaugă extra
  async function replaceWith(occupant) {
    const r = replaceModal; if (!r) return; setReplaceBusy(true);
    try {
      patchCell(r.teamId, r.positionId, r.colIdx, (c) => ({ ...c, people: c.people.map((x) => String(x.assignmentId) === String(occupant.assignmentId) ? { ...x, status: "declined" } : x) }));
      await plansApi.updateAssignment(r.planId, occupant.assignmentId, { status: "declined" });
    } catch (e) { flash(e?.message || "Eroare."); }
    setReplaceBusy(false); setReplaceModal(null);
    assignToTarget(r);
  }
  function replaceExtra() { const r = replaceModal; if (!r) return; setReplaceModal(null); assignToTarget(r); }

  async function doAssign(p, mirror, timeIds) {
    if (!sel) { flash("Click pe o căsuță (poziție) din grilă ca să asignezi pe cineva."); return; }
    const tIds = Array.isArray(timeIds) && timeIds.length ? timeIds : undefined; // gol = toate orele
    const doMirror = mirror && pereche;
    // om nou pe poziție (fără mirror) → cerem decizia ÎNAINTE de a pune ceva în celulă (ca să nu apară/dispară la X)
    if (!doMirror && await needsJoin(p, sel.positionId)) {
      stageJoin({ planId: sel.planId, teamId: sel.teamId, positionId: sel.positionId, colIdx: sel.colIdx, timeIds: tIds,
        positionName: sel.positionName, teamName: teamNameOf(sel.teamId), person: { id: p.id, name: p.name, avatar: p.avatar || "", initials: p.initials || "" } });
      return;
    }
    setAssigning(true);
    const push = (c, id) => ({ ...c, people: [...c.people, { personId: p.id, assignmentId: id, name: p.name, avatar: p.avatar, initials: p.initials, status: "unconfirmed" }], needed: Math.max(0, (c.needed || 0) - 1) });
    // optimist: pune persoana în celulă (+ pe pereche dacă bifat)
    patchCell(sel.teamId, sel.positionId, sel.colIdx, (c) => push(c, `tmp-a-${Date.now()}`));
    if (doMirror) patchCell(pereche.teamId, pereche.positionId, sel.colIdx, (c) => push(c, `tmp-b-${Date.now()}`));
    try {
      const r = await plansApi.assign(sel.planId, { personId: p.id, teamId: sel.teamId, positionId: sel.positionId, status: "unconfirmed", timeIds: tIds });
      if (r?.id) patchCell(sel.teamId, sel.positionId, sel.colIdx, (c) => ({ ...c, people: c.people.map((x) => String(x.assignmentId).startsWith("tmp-a-") ? { ...x, assignmentId: r.id } : x) }));
      if (doMirror) await plansApi.assign(sel.planId, { personId: p.id, teamId: pereche.teamId, positionId: pereche.positionId, status: "unconfirmed", timeIds: tIds });
      flash(doMirror ? `Asignat + ${pereche.teamName} (fără email).` : "Asignat (neconfirmat, fără email).");
      if (!doMirror) maybeOfferSimPair(sel.planId, p, sel.teamId, sel.positionId, sel.colIdx);
      refreshRec(); loadCov(); softReconcile();
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
    try { await plansApi.unassign(planId, assignmentId); flash("Șters."); refreshRec(); loadCov(); softReconcile(); }
    catch (e) { flash(e?.message || "Eroare."); reconcile(); }
  }
  async function saveEdit(payload) {
    if (!editing) return;
    const { status } = payload;
    patchCell(editing.teamId, editing.positionId, editing.colIdx, (c) => ({
      ...c, people: c.people.map((x) => String(x.assignmentId) === String(editing.assignmentId) ? { ...x, status } : x),
    }));
    setEditing(null);
    try { await plansApi.updateAssignment(editing.planId, editing.assignmentId, payload); flash("Salvat (fără email)."); reconcile(); }
    catch (e) { flash(e?.message || "Eroare."); reconcile(); }
  }
  async function dropOnCell(planId, teamId, positionId, colIdx, ev) {
    const d = dragRef.current; dragRef.current = null;
    setDragActive(false); setDropKey(null); setDragHint("");
    if (!d) return;
    // Kanban: drag simplu = MUTĂ; Ctrl/Cmd = COPIAZĂ. Din bara „Listă live" = mereu adaugă (nu are sursă).
    const copy = !!(ev && (ev.ctrlKey || ev.metaKey));
    const sameCell = !d.fromBar && String(d.planId) === String(planId) && String(d.teamId) === String(teamId) && String(d.positionId) === String(positionId);
    if (sameCell) return; // lăsat înapoi pe aceeași poziție → nimic
    const doMove = !copy && !d.fromBar && d.assignmentId && !String(d.assignmentId).startsWith("tmp-");
    // drop din Listă live pe o poziție PLINĂ (needed=0) → întâi întreabă pe cine înlocuiești
    if (d.fromBar && !d.isGuest) {
      const cell = cellOf(teamId, positionId, colIdx); const occ = activeOccupants(cell);
      if (cell && (cell.needed || 0) <= 0 && occ.length > 0) {
        setReplaceModal({ person: { id: d.personId, name: d.name, avatar: d.avatar || "", initials: d.initials || "" }, timeIds: undefined,
          occupants: occ, positionName: posNameOf(teamId, positionId), teamName: teamNameOf(teamId), planId, teamId, positionId, colIdx });
        return;
      }
    }
    // drop din Listă live (add) pe o poziție din care NU face parte → cere decizia ÎNAINTE de a pune ceva în celulă
    if (d.fromBar && !d.isGuest && await needsJoin({ id: d.personId, name: d.name }, positionId)) {
      stageJoin({ planId, teamId, positionId, colIdx, positionName: posNameOf(teamId, positionId), teamName: teamNameOf(teamId),
        person: { id: d.personId, name: d.name, avatar: d.avatar, initials: d.initials } });
      return;
    }
    const tmpId = `tmp-${Date.now()}`;
    patchCell(teamId, positionId, colIdx, (c) => ({ ...c, people: [...c.people, { personId: d.personId, assignmentId: tmpId, name: d.name, avatar: d.avatar, initials: d.initials, status: "unconfirmed" }] }));
    if (doMove) patchCell(d.teamId, d.positionId, d.colIdx, (c) => ({ ...c, people: c.people.filter((x) => String(x.assignmentId) !== String(d.assignmentId)) }));
    try {
      const r = await plansApi.assign(planId, { personId: d.personId, teamId, positionId, status: "unconfirmed" });
      // înlocuiește id-ul temporar cu cel real → persoana rămâne pe loc, fără clipire (nu mai reconciliem imediat)
      if (r?.id) patchCell(teamId, positionId, colIdx, (c) => ({ ...c, people: c.people.map((x) => String(x.assignmentId) === String(tmpId) ? { ...x, assignmentId: r.id } : x) }));
      if (doMove && d.assignmentId) await plansApi.unassign(d.planId, d.assignmentId);
      flash(doMove ? "Mutat." : "Copiat."); loadCov(); softReconcile();
      if (!d.isGuest) maybeOfferSimPair(planId, { id: d.personId, name: d.name, avatar: d.avatar, initials: d.initials }, teamId, positionId, colIdx);
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
  // Quick-add: creează un plan nou (coloană) pe o dată, copiind orele + structura (Needed) din primul plan vizibil.
  async function addPlanQuick() {
    const date = newPlanDate;
    if (!date) return;
    setAddingPlan(true);
    const srcId = plans[0]?.id;
    try {
      const r = await plansApi.create(serviceTypeId, date, srcId ? { templatePlanId: srcId, copyTimesFromPlanId: srcId } : {});
      const newId = r?.planId;
      flash("Plan adăugat (fără oameni/email).");
      setAddPlanOpen(false); setNewPlanDate(""); setShowDateMenu(false);
      // arată imediat coloana nouă: trecem pe selecție explicită = planurile curente + cel nou
      if (newId) setSelectedPlanIds([...new Set([...curSel(), String(newId)])]);
      else load();
    } catch (e) { flash(e?.message || "Eroare la adăugarea planului."); }
    finally { setAddingPlan(false); }
  }
  const loadAvail = useCallback(async (personId) => {
    const ids = (data?.plans || []).map((p) => p.id).join(",");
    if (!personId || !ids) { setTargetAvail({}); return; }
    try { const r = await matrixApi.personAvailability(serviceTypeId, { personId, planIds: ids }); setTargetAvail(r.availability || {}); }
    catch { setTargetAvail({}); }
  }, [serviceTypeId, data?.plans]);
  // CARDURI pe săptămână (fereastra Matrix + alte service types bifate). serviceTypeIds=null → default (backend).
  const loadWeeks = useCallback(async (personId, stIds) => {
    const ids = (data?.plans || []).map((p) => p.id).join(",");
    if (!personId || !ids) { setTargetWeeks(null); return; }
    try { const r = await matrixApi.personWeeks(serviceTypeId, { personId, planIds: ids, serviceTypeIds: stIds && stIds.length ? stIds.join(",") : undefined }); setTargetWeeks(r); }
    catch { setTargetWeeks(null); }
  }, [serviceTypeId, data?.plans]);

  function pickTarget(pp) {
    if (target && String(target.personId) === String(pp.personId)) { setTarget(null); setTargetSched(null); setTargetAvail({}); setTargetWeeks(null); setSelSts(null); return; }
    setTarget({ personId: pp.personId, name: pp.name, avatar: pp.avatar || "", initials: pp.initials || "" });
    setTargetSched(null); setTargetAvail({}); setTargetWeeks(null); setSelSts(null); setBarOpen(true); // deschide „Listă live" pe tabul persoanei
    peopleApi.schedule(pp.personId).then((r) => setTargetSched(r.schedule || [])).catch(() => setTargetSched([]));
    loadAvail(pp.personId); loadWeeks(pp.personId, null);
  }
  const clearTarget = () => { setTarget(null); setTargetSched(null); setTargetAvail({}); setTargetWeeks(null); setSelSts(null); };
  // bifează/debifează un service type în cardurile persoanei → re-fetch (ST-ul Matrix e mereu inclus în backend)
  const toggleTargetSt = (stId) => {
    if (!target?.personId) return;
    const base = selSts || (targetWeeks?.serviceTypes || []).filter((s) => s.default).map((s) => String(s.id));
    const has = base.map(String).includes(String(stId));
    const next = has ? base.filter((x) => String(x) !== String(stId)) : [...base, String(stId)];
    setSelSts(next); loadWeeks(target.personId, next);
  };
  // reîncarcă disponibilitatea + cardurile când se schimbă fereastra de planuri (navigare) cât timp e target activ
  useEffect(() => { if (target?.personId) { loadAvail(target.personId); loadWeeks(target.personId, selSts); } }, [target?.personId, loadAvail, loadWeeks]); // eslint-disable-line
  // ieși din target-mode: Esc SAU click oriunde în afară de Listă live / grilă / modale (scroll-ul NU detargetează)
  useEffect(() => {
    if (!target) return;
    const off = () => { setTarget(null); setTargetSched(null); setTargetAvail({}); setTargetWeeks(null); setSelSts(null); };
    const onKey = (e) => { if (e.key === "Escape") off(); };
    const onClick = (e) => { if (e.target.closest(".covbar, .datacell, .cm-ov, .pj-ov, .rm-ov, .cfb-tip, .cf-tip")) return; off(); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, [target]);

  // TARGET-MODE: click pe o celulă → planifică persoana-target acolo (rapid, cross-plan). ZERO email.
  async function assignTargetToCell(planId, teamId, positionId, colIdx, cell) {
    if (!target) return;
    const av = targetAvail[String(planId)];
    if (av?.blockout) { flash(`⌖ ${target.name} e blocat la această dată (blockout).`); return; }
    if ((cell?.people || []).some((x) => String(x.personId) === String(target.personId))) { flash("Deja pe această poziție."); return; }
    // om nou pe poziție → cere decizia ÎNAINTE de a pune ceva în celulă (anularea nu lasă nimic)
    if (await needsJoin({ id: target.personId, name: target.name }, positionId)) {
      stageJoin({ planId, teamId, positionId, colIdx, positionName: posNameOf(teamId, positionId), teamName: teamNameOf(teamId),
        person: { id: target.personId, name: target.name, avatar: target.avatar || "", initials: target.initials || "" } });
      return;
    }
    setAssigning(true);
    const tmpT = `tmp-t-${Date.now()}`;
    patchCell(teamId, positionId, colIdx, (c) => ({
      ...c, needed: Math.max(0, (c.needed || 0) - 1),
      people: [...c.people, { personId: target.personId, assignmentId: tmpT, name: target.name, avatar: target.avatar || "", initials: (target.name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase(), status: "unconfirmed" }],
    }));
    try {
      const r = await plansApi.assign(planId, { personId: target.personId, teamId, positionId, status: "unconfirmed" });
      flash(`⌖ ${target.name} planificat (neconfirmat, fără email).`);
      maybeOfferSimPair(planId, { id: target.personId, name: target.name, avatar: target.avatar, initials: target.initials }, teamId, positionId, colIdx);
      loadCov(); loadAvail(target.personId); loadWeeks(target.personId, selSts); softReconcile();
    } catch (e) { flash(e?.message || "Eroare."); reconcile(); }
    finally { setAssigning(false); }
  }

  const toggle = (id) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const closeSide = () => { setSel(null); setBrowse(false); setRec(null); };
  // reasignarea din modalul de conflicte (sidebar SAU Listă live) deschide bara filtrată pe poziția conflictului;
  // reținem starea anterioară a barei ca s-o restaurăm (în Listă live bara e deja deschisă, n-o închidem)
  const openReassignBar = (card, disableId) => { barWasOpenRef.current = barOpen; setReFilters({ fit: true, gender: "", sim: "" }); setReassignDisable(disableId || null); setReassignBar({ teamId: card.teamId, teamName: card.teamName, positionId: card.positionId, positionName: card.positionName, planId: card.planId }); setBarOpen(true); };
  const closeReassignBar = () => { setReassignBar(null); setReassignDisable(null); setBarOpen(barWasOpenRef.current); };
  const refreshAfterConflict = () => { refreshRec(); loadCov(); softReconcile(); };

  useAiSurface({
    id: "plans.matrix", label: "Matrix — planificare", scope: "page",
    getContext: () => ({ serviceTypeId, serviceType: data?.serviceTypeName, planuri: nPlans, echipe: teams.length, selectat: sel?.positionName, target: target?.name }),
    actions: [
      { id: "setCount", label: "Câte planuri", params: { n: "number" }, run: ({ n }) => setCount(Math.min(12, Math.max(1, parseInt(n, 10) || 8))) },
      { id: "back", label: "Înapoi la Plans", run: () => router.push("/plans") },
      { id: "clearTarget", label: "Ieși din target view", run: () => setTarget(null) },
    ],
  }, [serviceTypeId, data, nPlans, teams, sel, target]);

  const gridCols = `220px repeat(${Math.max(1, nPlans)}, 290px)`; // lățime FIXĂ per coloană (ca PCO) → X-scroll, nu stretch
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
    // fereastră DINAMICĂ: de la ce e selectat până la ~4 dăți viitoare (+1 trecută pt. context) — NU toate dățile.
    // Pe măsură ce dai „+", apar mai multe checkbox-uri; „Load prev/next" extinde fereastra.
    const vis = opts.slice(Math.max(0, minS - 1), Math.min(opts.length, maxS + 1 + 4));
    const stName = opts[0]?.stName || allServiceTypes.find((s) => String(s.id) === id)?.name || "";
    return { id, stName, vis };
  });
  // select-all / clear pe un service type (păstrează cel puțin 1 plan în total)
  const setStAll = (opts, on) => {
    const ids = opts.map((o) => String(o.id));
    const base = new Set(curSel());
    if (on) ids.forEach((x) => base.add(x)); else ids.forEach((x) => base.delete(x));
    const next = [...base];
    setSelectedPlanIds(next.length ? next : [String((plans[0] || planOptions[0] || {}).id)].filter(Boolean));
  };
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
          {canManage && !data?.multi && (
            <button className="teamsbtn" title="Administrează echipele și pozițiile" onClick={() => setShowTeams(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              <span>Echipe</span>
            </button>
          )}
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
                    <div className="dm-tools">
                      <button className="dm-addst" onClick={() => setShowAddSt(true)}>+ Add Service Type</button>
                      {canAddPlan && !addPlanOpen && <button className="dm-qbtn" onClick={() => { setAddPlanOpen(true); setNewPlanDate(""); }}>＋ Plan nou</button>}
                    </div>
                    {canAddPlan && addPlanOpen && (
                      <div className="dm-qadd">
                        <input type="date" className="dm-qdate" value={newPlanDate} onChange={(e) => setNewPlanDate(e.target.value)} autoFocus />
                        <button className="dm-qgo" disabled={!newPlanDate || addingPlan} onClick={addPlanQuick}>{addingPlan ? "Se adaugă…" : "Adaugă plan"}</button>
                        <button className="dm-qx" onClick={() => { setAddPlanOpen(false); setNewPlanDate(""); }} title="Renunță">×</button>
                        <div className="dm-qhint">Copiază orele + structura „Needed" din planul curent. Fără oameni/email.</div>
                      </div>
                    )}
                    {stSections.map((sec) => {
                      const col = dmCol.has(String(sec.id));
                      const nSel = sec.vis.filter((o) => isSel(o.id)).length;
                      const allOn = nSel === sec.vis.length && sec.vis.length > 0;
                      return (
                        <div key={sec.id} className="dm-sec">
                          <div className="dm-sechead" onClick={() => toggleDmSec(sec.id)}>
                            <span className={`dm-seccar ${col ? "col" : ""}`}>▾</span>
                            <span className="dm-secn">{sec.stName}</span>
                            {nSel > 0 && <span className="dm-secb">{nSel}</span>}
                            <button className="dm-sall" onClick={(e) => { e.stopPropagation(); setStAll(sec.vis, !allOn); }} title={allOn ? "Deselectează tot" : "Selectează tot"}>{allOn ? "Niciunul" : "Toate"}</button>
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
            {plans.map((p, i) => {
              const av = target ? targetAvail[String(p.id)] : null;
              const avk = av?.blockout ? "blk" : av?.busy ? "busy" : av ? "free" : "";
              return (
                <div key={p.id} className={`cell head planhead ${sel?.colIdx === i ? "selcol" : ""} ${avk ? "av-" + avk : ""}`}>
                  <div className="ph-st">{p.stName || data?.serviceTypeName}</div>
                  <div className="ph-date">{p.weekday ? `${p.weekday} · ` : ""}{p.dateLabel}</div>
                  {av && (
                    <div className={`ph-av ${avk}`} title={av.blockout ? "Blockout — indisponibil" : av.busy ? `Ocupat: ${av.busyLabel || "altă slujire"}` : "Liber — click pe o poziție ca să-l planifici"}>
                      {av.blockout ? "⛔ blocat" : av.busy ? "● ocupat" : "✓ liber"}
                    </div>
                  )}
                </div>
              );
            })}

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
                </div>
              );
              if (collapsed.has(t.teamId)) return out;
              (t.positions || []).forEach((pos) => {
                out.push(<div key={`${t.teamId}-${pos.positionId}-n`} className="cell poslabel" title={`${pos.name} — click: deschide bara de asignare`} onClick={() => openCell(plans[0].id, t.teamId, pos.positionId, pos.name, 0)}>{pos.name}</div>);
                (pos.cells || []).forEach((c, ci) => {
                  const isSel = sel && sel.positionId === pos.positionId && sel.colIdx === ci;
                  const av = target ? targetAvail[String(plans[ci].id)] : null;
                  const tHere = target && (c.people || []).some((x) => String(x.personId) === String(target.personId));
                  const tCls = target ? (av?.blockout ? "t-blk" : tHere ? "t-here" : av?.busy ? "t-busy" : "t-free") : "";
                  const cellKey = `${t.teamId}-${pos.positionId}-${ci}`;
                  out.push(
                    <div key={cellKey}
                      className={`cell datacell ${isSel ? "sel" : ""} ${tCls} ${dragActive && dropKey === cellKey ? "drophover" : ""}`}
                      onClick={(e) => { if (e.target.closest(".person")) return; if (target) { assignTargetToCell(plans[ci].id, t.teamId, pos.positionId, ci, c); return; } openCell(plans[ci].id, t.teamId, pos.positionId, pos.name, ci); }}
                      onDragOver={(e) => { if (dragRef.current) e.preventDefault(); }}
                      onDragEnter={() => { if (dragRef.current) setDropKey(cellKey); }}
                      onDrop={(e) => dropOnCell(plans[ci].id, t.teamId, pos.positionId, ci, e)}>
                      {(c.people || []).map((pp, pi) => {
                        const dim = target && String(target.personId) !== String(pp.personId);
                        const hit = target && String(target.personId) === String(pp.personId);
                        return (
                          <div key={pp.assignmentId || pi} className={`person ${dim ? "dim" : ""} ${hit ? "hit" : ""}`}
                            draggable={canMove}
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = "copyMove"; dragRef.current = { personId: pp.personId, assignmentId: pp.assignmentId, planId: plans[ci].id, teamId: t.teamId, positionId: pos.positionId, colIdx: ci, name: pp.name, avatar: pp.avatar, initials: pp.initials }; setDragActive(true); setDragHint(`${pp.name} → lași jos = MUTĂ · ține Ctrl = copiezi`); }}
                            onDragEnd={() => { setDragActive(false); setDropKey(null); setDragHint(""); }}
                            onClick={() => { if (canAssign) pickTarget(pp); }}
                            title={canAssign ? `${pp.name} — click: target · trage: MUTĂ (Ctrl = copiază)` : pp.name}>
                            <PersonAvatar person={pp} status={pp.status} size={22} />
                            <span className={`pn ${pp.status === "declined" ? "decl" : ""}`}>{pp.name}</span>
                            {pp.isGuest && <span className="gtag">invitat</span>}
                            {canAssign && (
                            <button className="psch" title="Replanifică — deschide bara de asignare" onClick={(e) => { e.stopPropagation(); openCell(plans[ci].id, t.teamId, pos.positionId, pos.name, ci); }}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></svg>
                            </button>
                            )}
                            {canAssign && (
                            <button className="ped" title="Editează" onClick={(e) => { e.stopPropagation(); setEditing({ planId: plans[ci].id, teamId: t.teamId, positionId: pos.positionId, colIdx: ci, assignmentId: pp.assignmentId, name: pp.name, avatar: pp.avatar, initials: pp.initials, status: pp.status, teamName: t.name, positionName: pos.name }); }}>✎</button>
                            )}
                            {canMove && (
                            <button className="prm" title="Șterge" onClick={(e) => { e.stopPropagation(); removePerson(plans[ci].id, t.teamId, pos.positionId, ci, pp.assignmentId); }}>×</button>
                            )}
                          </div>
                        );
                      })}
                      <div className="needrow" onClick={(e) => e.stopPropagation()}>
                        {canEditNeeded ? (
                          c.needed > 0 ? (
                            <span className="needctl">
                              <button onClick={() => changeNeeded(plans[ci].id, t.teamId, pos.positionId, ci, c.needed - 1)}>−</button>
                              <span className="needn">{c.needed} Needed</span>
                              <button onClick={() => changeNeeded(plans[ci].id, t.teamId, pos.positionId, ci, c.needed + 1)}>+</button>
                            </span>
                          ) : (
                            <button className="needadd" title="Adaugă Needed" onClick={() => changeNeeded(plans[ci].id, t.teamId, pos.positionId, ci, 1)}>+ Needed</button>
                          )
                        ) : (
                          c.needed > 0 ? <span className="needn ro">{c.needed} Needed</span> : null
                        )}
                      </div>
                      {target && !tHere && !av?.blockout && (
                        <div className="tghost" title={`Planifică pe ${target.name} aici`}>
                          <span>＋ {(target.name || "").split(" ")[0]}</span>
                        </div>
                      )}
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
        blockout={rec?.blockout || []}
        query={recQuery}
        onQuery={setRecQuery}
        onPick={assignPerson}
        onClose={closeSide}
        assigning={assigning}
        mirror={pereche ? { available: true, label: `Adaugă și la ${pereche.teamName}` } : null}
        onAddGuest={addGuest}
        defaults={rec?.defaults} positionId={sel?.positionId} planId={sel?.planId} onSaveRules={saveRules} instructions={rec?.instructions}
        serviceTimes={rec?.serviceTimes || []}
        onRosterChanged={refreshRec}
        onConflictResolved={() => { refreshRec(); loadCov(); softReconcile(); }}
        conflictTarget={conflictTarget}
        simPair={simPairResolver}
        onReassignOpen={openReassignBar}
        onReassignClose={closeReassignBar}
        canAssign={canAssign} canRoster={canRoster} canRules={canManage || !!caps.positionRules || canAssign}
      />

      <CoverageBar
        open={barOpen} onToggle={() => setBarOpen((v) => !v)} cov={cov} loading={covBusy}
        reassignMode={!!reassignBar}
        disablePersonId={reassignDisable}
        filters={reassignBar
          ? { ministry: { teamId: reassignBar.teamId, name: reassignBar.teamName }, position: { positionId: reassignBar.positionId, name: reassignBar.positionName }, ...reFilters }
          : barFilters}
        onRemoveFilter={reassignBar
          ? ((t) => { if (t === "gender" || t === "sim") setReFilters((f) => ({ ...f, [t]: "" })); })
          : ((t) => setBarFilters((f) => ({ ...f, [t]: (t === "ministry" || t === "position") ? null : "" })))}
        onSetFilter={reassignBar
          ? ((key, val) => setReFilters((f) => ({ ...f, [key]: key === "fit" ? val : (f[key] === val ? "" : val) })))
          : ((key, val) => setBarFilters((f) => ({ ...f, [key]: key === "fit" ? val : (f[key] === val ? "" : val) })))}
        style={{ left: reassignBar ? 0 : (showSettings ? 316 : 0), right: reassignBar ? 0 : ((sel || browse) ? 348 : 0) }}
        onPersonDragStart={(p) => { dragRef.current = { personId: p.id, name: p.name, avatar: p.avatar, initials: p.initials, fromBar: true }; setDragActive(true); setDragHint(`${p.name} → lași jos pe o poziție = asignezi`); }}
        onPersonDragEnd={() => { setDragActive(false); setDropKey(null); setDragHint(""); }}
        target={target} targetSched={targetSched} targetAvail={targetAvail} onCloseTarget={clearTarget}
        targetWeeks={targetWeeks} selSts={selSts} onToggleSt={toggleTargetSt}
        canVerify={!!sel && !reassignBar} onVerifyPerson={(p) => setLiveConflictPerson({ id: p.id, name: p.name, avatar: p.avatar || "", initials: p.initials || "" })}
      />

      {/* „Verifică" din Listă live → același ConflictModal (poziția selectată = target), logică 100% reutilizată */}
      {liveConflictPerson && sel && (
        <ConflictModal open planId={sel.planId} person={liveConflictPerson} positionId={sel.positionId} target={conflictTarget} simPair={simPairResolver}
          onClose={() => { closeReassignBar(); setLiveConflictPerson(null); }}
          onResolved={refreshAfterConflict}
          onReassignOpen={openReassignBar} onReassignClose={closeReassignBar} />
      )}

      {editing && (
        <EditPersonModal
          person={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onRemove={() => { removePerson(editing.planId, editing.teamId, editing.positionId, editing.colIdx, editing.assignmentId); setEditing(null); }}
        />
      )}

      {showTeams && (
        <TeamsManagerModal
          serviceTypeId={serviceTypeId}
          onClose={() => setShowTeams(false)}
          onChanged={() => reconcile()}
        />
      )}

      {dragActive && dragHint && <div className="drag-hint">⇄ {dragHint}</div>}

      {simPair && (
        <div className="sp-ov" onClick={() => !simBusy && setSimPair(null)}>
          <div className="sp-dlg" onClick={(e) => e.stopPropagation()}>
            <div className="sp-ic">⇆</div>
            <div className="sp-who">
              <PersonAvatar person={simPair.person} size={44} showBadge={false} />
              <div className="sp-wt"><div className="sp-n">{simPair.person.name}</div><div className="sp-sub">l-ai pus pe o poziție de SIM</div></div>
            </div>
            <div className="sp-q">Îl pui și la <b>{simPair.toTeamName}</b> · <b>{simPair.positionName}</b>? <span className="sp-free">(poziție liberă)</span></div>
            <div className="sp-act">
              <button className="sp-no" disabled={simBusy} onClick={() => setSimPair(null)}>Nu, doar aici</button>
              <button className="sp-yes" disabled={simBusy} onClick={confirmSimPair}>{simBusy ? "Se adaugă…" : "Da, pune-l și acolo"}</button>
            </div>
          </div>
        </div>
      )}

      <PositionJoinModal data={joinModal} busy={joinBusy} onGuest={confirmJoinGuest} onPermanent={confirmJoinPermanent} onClose={() => !joinBusy && cancelJoin()} />

      <ReplaceModal data={replaceModal} busy={replaceBusy} onReplace={replaceWith} onExtra={replaceExtra} onClose={() => !replaceBusy && setReplaceModal(null)} />

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        /* înălțime FIXĂ cât viewport-ul sub nav → grila umple restul și X-scroll-ul e PINNED jos (vizibil mereu) */
        /* padding-bottom = înălțimea barei „Listă live" collapse (--cbar-h): grila se oprește MEREU fix deasupra ei,
           așa că X-scroll-ul rămâne vizibil chiar și cu bara închisă (bara stă DEDESUBT, nu peste scroll). */
        .matrix { height: calc(100vh - var(--nav-h)); display: flex; flex-direction: column; overflow: hidden; padding: 14px 16px var(--cbar-h); transition: padding .22s cubic-bezier(.4,0,.2,1); }
        .matrix.has-side { padding-right: 356px; }  /* loc pt. bara lipită dreapta */
        .matrix.has-left { padding-left: 336px; }   /* loc pt. panoul Settings din stânga */
        .matrix.has-bar { padding-bottom: 41vh; }   /* bara extinsă → grila se oprește în ea (X-scroll tot pinned) */
        .matrix.drag .datacell { box-shadow: inset 0 0 0 1px rgba(47,129,247,.3); background: rgba(47,129,247,.04); }
        .matrix.drag .datacell:hover { box-shadow: inset 0 0 0 2px var(--primary); background: rgba(47,129,247,.12); }
        .mtop { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .mt-left { display: flex; align-items: center; gap: 8px; }
        .back { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 5px; }
        .back:hover { color: var(--text); }
        .gearbtn { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 15px; }
        .gearbtn.on, .gearbtn:hover { color: var(--text); border-color: var(--primary); }
        .teamsbtn { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); height: 32px; padding: 0 11px; border-radius: 6px; cursor: pointer; font-size: 12.5px; font-weight: 600; transition: color .13s, border-color .13s; }
        .teamsbtn:hover { color: var(--text); border-color: var(--primary); }
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
        .dm-sall { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 5px; padding: 2px 8px; font-size: 10.5px; font-weight: 600; cursor: pointer; flex: none; }
        .dm-sall:hover { color: var(--text); border-color: var(--primary); }
        .dm-tools { display: flex; gap: 8px; margin: 8px 0; }
        .dm-tools .dm-addst { margin: 0; flex: 1; }
        .dm-qbtn { flex: none; background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 7px; padding: 8px 13px; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; }
        .dm-qbtn:hover { opacity: .9; }
        .dm-qadd { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 8px; padding: 10px; margin-bottom: 8px; animation: tmbIn .15s ease; }
        .dm-qdate { flex: 1; min-width: 130px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 6px; height: 34px; padding: 0 10px; color: var(--text); font-size: 13px; outline: none; color-scheme: dark; }
        .dm-qdate:focus { border-color: var(--primary); }
        .dm-qgo { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 6px; padding: 0 14px; height: 34px; cursor: pointer; font-size: 12.5px; font-weight: 600; }
        .dm-qgo:disabled { opacity: .5; cursor: default; }
        .dm-qx { background: transparent; border: none; color: var(--text-faint); font-size: 18px; cursor: pointer; line-height: 1; padding: 0 4px; }
        .dm-qx:hover { color: var(--text); }
        .dm-qhint { flex-basis: 100%; color: var(--text-faint); font-size: 11px; line-height: 1.4; }
        .dm-load { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 5px 8px; font-size: 11.5px; cursor: pointer; white-space: nowrap; }
        .dm-load:hover:not(:disabled) { color: var(--text); border-color: var(--primary); } .dm-load:disabled { opacity: .35; cursor: default; }
        .dm-list { padding: 6px 2px; display: flex; flex-direction: column; max-height: 230px; overflow-y: auto; }
        .dm-row { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-dim); }
        .dm-row:hover { background: rgba(255,255,255,.05); } .dm-row input { accent-color: var(--primary); }
        .dm-d { color: var(--text); }
        .dm-empty { color: var(--text-faint); font-size: 12px; padding: 10px; }
        .mt-right { display: flex; align-items: center; gap: 12px; }
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
        .grid { display: grid; width: max-content; }
        .cell { border-bottom: 1px solid var(--border-soft); border-right: 1px solid var(--border-soft); font-size: 12.5px; }
        .head { position: sticky; top: 0; z-index: 3; background: var(--surface-2); }
        .corner { position: sticky; left: 0; z-index: 4; }
        .planhead { padding: 8px 12px; background: var(--surface-2); }
        /* tint-ul de coloană selectată se compune PESTE fundalul opac (altfel header-ul devine translucid
           și se vede conținutul care derulează pe sub — vizibil mai ales pe ultima coloană). */
        .planhead.selcol { background: linear-gradient(rgba(47,129,247,.14), rgba(47,129,247,.14)), var(--surface-2); }
        .ph-st { color: var(--text-faint); font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ph-date { color: var(--text); font-size: 14.5px; font-weight: 700; margin-top: 3px; letter-spacing: .1px; }
        /* chip disponibilitate target în antet */
        .planhead.av-free { box-shadow: inset 0 -2px 0 rgba(87,185,138,.6); }
        .planhead.av-blk { box-shadow: inset 0 -2px 0 rgba(248,81,73,.6); }
        .planhead.av-busy { box-shadow: inset 0 -2px 0 rgba(210,153,34,.6); }
        .ph-av { margin-top: 4px; font-size: 10px; font-weight: 700; letter-spacing: .2px; display: inline-block; }
        .ph-av.free { color: var(--product); }
        .ph-av.blk { color: var(--danger); }
        .ph-av.busy { color: var(--st-unconfirmed); }
        .teamblock { background: var(--section-head-bg); border-bottom: 1px solid var(--border); border-top: 1px solid var(--border);
          padding: 0; display: flex; align-items: center; justify-content: space-between; }
        /* titlul echipei rămâne LIPIT la stânga la X-scroll (ca și coloana de poziții), cu fundalul benzii */
        .tb-toggle { position: sticky; left: 0; z-index: 2; background: var(--section-head-bg); border: none; color: var(--text); font-weight: 700;
          font-size: 12px; text-transform: uppercase; letter-spacing: .5px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; white-space: nowrap; }
        .tb-caret { color: var(--text-faint); font-size: 10px; } .tb-caret.col { transform: rotate(-90deg); }
        .tb-actions { position: sticky; right: 0; z-index: 2; background: var(--section-head-bg); padding: 6px 12px; }
        .tb-actions .gear { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 5px; }
        .tb-actions .gear:hover { color: var(--text); background: rgba(255,255,255,.06); }
        .poslabel { position: sticky; left: 0; z-index: 1; background: var(--surface); color: var(--text-dim); cursor: pointer;
          text-align: right; padding: 9px 12px; display: flex; align-items: center; justify-content: flex-end; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
        .poslabel:hover { color: var(--text); background: var(--row-hover); }
        .datacell { padding: 6px 8px; background: var(--bg); min-height: 38px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; }
        .datacell:hover { background: var(--row-hover); }
        .datacell.sel { background: rgba(47,129,247,.10); box-shadow: inset 0 0 0 1px var(--primary); }
        /* Kanban drag: toate celulele devin zone de drop vizibile; cea țintită se evidențiază clar */
        .matrix.drag .datacell { outline: 1px dashed var(--border-strong); outline-offset: -4px; transition: outline-color .1s, background .1s; }
        .matrix.drag .datacell.drophover { background: rgba(47,129,247,.18); outline: 2px solid var(--primary); outline-offset: -2px; box-shadow: inset 0 0 0 9999px rgba(47,129,247,.06); }
        .matrix.drag .person { cursor: grabbing; }
        /* target-mode: colorăm celulele după disponibilitatea persoanei-target */
        .datacell.t-free { cursor: copy; }
        .datacell.t-free:hover { background: rgba(87,185,138,.14); box-shadow: inset 0 0 0 1px rgba(87,185,138,.55); }
        .datacell.t-busy:hover { background: rgba(210,153,34,.12); }
        .datacell.t-blk { background: rgba(248,81,73,.07); cursor: not-allowed; }
        .datacell.t-blk:hover { background: rgba(248,81,73,.1); }
        .datacell.t-here { background: rgba(47,129,247,.08); }
        .tghost { opacity: 0; display: flex; align-items: center; gap: 4px; color: var(--product); font-size: 11px; font-weight: 600; padding: 1px 3px; transition: opacity .12s; pointer-events: none; }
        .datacell.t-free:hover .tghost { opacity: .9; }
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
        .toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); padding: 10px 18px; border-radius: 8px; font-size: 13px; z-index: 60; box-shadow: 0 8px 28px rgba(0,0,0,.4); }
        .drag-hint { position: fixed; top: 14px; left: 50%; transform: translateX(-50%); background: var(--primary); color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 12.5px; font-weight: 600; z-index: 70; box-shadow: 0 6px 20px rgba(47,129,247,.4); pointer-events: none; animation: tmbIn .14s ease; }
        .sp-ov { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 85; display: flex; align-items: center; justify-content: center; padding: 16px; animation: tmbIn .14s ease; }
        .sp-dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 13px; padding: 20px 22px; width: 420px; max-width: 94vw; box-shadow: 0 24px 64px rgba(0,0,0,.5); animation: spIn .18s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes spIn { from { opacity: 0; transform: scale(.92) translateY(8px); } to { opacity: 1; transform: none; } }
        .sp-ic { width: 38px; height: 38px; border-radius: 10px; background: rgba(47,129,247,.16); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 14px; }
        .sp-who { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .sp-n { color: var(--text); font-size: 15px; font-weight: 600; }
        .sp-sub { color: var(--text-faint); font-size: 12px; margin-top: 1px; }
        .sp-q { color: var(--text-dim); font-size: 13.5px; line-height: 1.55; } .sp-q b { color: var(--text); }
        .sp-free { color: var(--product); font-size: 12px; }
        .sp-act { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .sp-no { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; padding: 9px 15px; font-size: 13px; cursor: pointer; }
        .sp-no:hover { color: var(--text); }
        .sp-yes { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 7px; padding: 9px 17px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .sp-yes:disabled, .sp-no:disabled { opacity: .55; cursor: default; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
        .tmode-bar { display: flex; align-items: center; gap: 11px; background: linear-gradient(90deg, rgba(87,185,138,.14), rgba(47,129,247,.1)); border: 1px solid rgba(87,185,138,.4); border-radius: 9px; padding: 9px 14px; margin-bottom: 10px; animation: tmbIn .18s ease; }
        @keyframes tmbIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
        .tmb-ic { color: var(--product); font-size: 17px; flex: none; }
        .tmb-tx { color: var(--text-dim); font-size: 12.5px; flex: 1; } .tmb-tx b { color: var(--text); }
        .tmb-x { flex: none; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 5px 11px; font-size: 12px; cursor: pointer; }
        .tmb-x:hover { color: var(--text); border-color: var(--product); }
      `}</style>
    </div>
  );
}
