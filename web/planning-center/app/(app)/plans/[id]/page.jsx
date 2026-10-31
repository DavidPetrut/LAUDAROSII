"use client";
/**
 * Detaliu plan — ecranul „Plan" din PCO. /api/pc/v1/plans/:id. LĂȚIME COMPLETĂ.
 * Stânga: Times + Files + Notes (sticky). Dreapta: tab-uri Order / Teams / Rehearse / Notes / Files.
 * Tab-ul TEAMS e INTERACTIV și 100% ca în PCO: echipele = COLOANE (carusel orizontal),
 * fiecare poziție = rând (avatar + badge status), „Needed" (−/N/+), click pe poziție →
 * aceeași bară GLOBALĂ de asignare (AssignSidebar) ca în Matrix; click pe persoană → EditPersonModal.
 * UX seamless: update OPTIMIST + reconciliere silențioasă. ZERO emailuri trimise de aici.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { plansApi, peopleApi, productionScenesApi, productionSnippetsApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import PersonAvatar from "@/components/plans/PersonAvatar";
import Skeleton from "@/components/ui/Skeleton";
import SaveTemplateModal from "@/components/plans/SaveTemplateModal";
import OrderTemplateModal from "@/components/plans/OrderTemplateModal";
import AssignSidebar from "@/components/plans/AssignSidebar";
import EditPersonModal from "@/components/plans/EditPersonModal";
import PositionJoinModal from "@/components/plans/PositionJoinModal";
import OrderTab from "@/components/plans/order/OrderTab";
import TimeEditModal from "@/components/plans/TimeEditModal";
import AlertsTab from "@/components/plans/AlertsTab";
import NotesBoard from "@/components/plans/NotesBoard";

const TABS = ["Order", "Teams", "Rehearse"]; // Times/Files/Notes mutate în sidebar-ul STÂNGA (ca în PCO)

/* echipa pereche SIM: „Asimilare (SIM 1)" ↔ „Asimilare (SIM 2)" */
function perecheName(name = "") {
  if (/sim\s*1\b/i.test(name)) return name.replace(/sim\s*1\b/i, (m) => m.replace("1", "2"));
  if (/sim\s*2\b/i.test(name)) return name.replace(/sim\s*2\b/i, (m) => m.replace("2", "1"));
  return null;
}
const eq = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export default function PlanDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [tab, setTab] = useState("Order");
  const [orderSide, setOrderSide] = useState(false); // drawer „View item" deschis (Order) → face loc ca .has-side
  const [timeEdit, setTimeEdit] = useState(null);    // { time } (editare) | { type } (adăugare)
  const [head, setHead] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  // bara globală + modal (Teams)
  const [sel, setSel] = useState(null);     // {teamId, positionId, positionName, teamName}
  const [rec, setRec] = useState(null);
  const [recBusy, setRecBusy] = useState(false);
  const [recQuery, setRecQuery] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState(null);
  const [joinModal, setJoinModal] = useState(null); // om nou pe poziție → guest (o zi) / permanent (roster)
  const [joinBusy, setJoinBusy] = useState(false);
  const [caps, setCaps] = useState({}); // capabilități granulare (din /me) pt. gating edit/view-only
  const canAssign = !!caps.assign, canMove = !!caps.move, canEditNeeded = !!caps.editNeeded, canRoster = !!caps.roster;

  // drag & drop Kanban între echipe/poziții (#3): mută implicit, Ctrl = copiază
  const dragRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [dropKey, setDropKey] = useState(null);
  const [dragHint, setDragHint] = useState("");

  // meniu 3-puncte (rename / print / copy link)
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplModal, setTplModal] = useState(false);
  const [orderKey, setOrderKey] = useState(0); // bump = remount OrderTab (reload după „Aplică șablon")
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState("");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };
  useEffect(() => { peopleApi.me().then((r) => setCaps(r?.capabilities || {})).catch(() => {}); }, []);

  function startRename() { setRenameVal(head?.title || ""); setRenaming(true); setMenuOpen(false); }
  async function saveRename() {
    const t = renameVal.trim();
    setRenaming(false);
    if (!t || t === (head?.title || "")) return;
    const prev = head?.title;
    setHead((h) => ({ ...h, title: t })); // optimist
    try { await plansApi.update(id, { title: t }); flash("Plan redenumit."); }
    catch (e) { setHead((h) => ({ ...h, title: prev })); flash(e?.message || "Eroare la redenumire."); }
  }
  function printPlan() { setMenuOpen(false); setTimeout(() => window.print(), 60); }
  async function copyLink() {
    setMenuOpen(false);
    try { await navigator.clipboard.writeText(window.location.href); flash("Link copiat."); }
    catch { flash("Nu am putut copia linkul."); }
  }

  const loadHead = useCallback(async () => {
    try { setHead(await plansApi.get(id)); }
    catch (e) { setErr(e?.message || "Eroare la plan."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { loadHead(); }, [loadHead]);

  // sidebar-ul STÂNGA: Times se încarcă din start (Files scos; Notes = NotesBoard self-load)
  useEffect(() => { plansApi.times(id).then((r) => setData((d) => ({ ...d, Times: r }))).catch(() => {}); }, [id]);
  const reloadTimes = useCallback(() => { plansApi.times(id).then((r) => setData((d) => ({ ...d, Times: r }))).catch(() => {}); }, [id]);

  useEffect(() => {
    if (data[tab]) return;
    // Order se auto-gestionează în componenta OrderTab (fetch + reload la editări).
    const fn = { Teams: plansApi.teams, Rehearse: plansApi.rehearse }[tab];
    if (!fn) return;
    fn(id).then((r) => setData((d) => ({ ...d, [tab]: r }))).catch((e) => setErr(e?.message || "Eroare."));
  }, [tab, id, data]);
  useEffect(() => { if (tab !== "Order") setOrderSide(false); }, [tab]);

  const reconcileTeams = useCallback(async () => {
    try { const r = await plansApi.teams(id); setData((d) => ({ ...d, Teams: r })); } catch {}
  }, [id]);

  // patch imuabil pe (teamId, positionId) în cache-ul Teams
  const patchGroup = useCallback((teamId, positionId, fn) => {
    setData((d) => {
      const T = d.Teams; if (!T) return d;
      const mapTeam = (t) => String(t.teamId) !== String(teamId) ? t : {
        ...t, groups: t.groups.map((g) => String(g.positionId) !== String(positionId) ? g : fn(g)),
      };
      return { ...d, Teams: { ...T, myTeams: (T.myTeams || []).map(mapTeam), otherTeams: (T.otherTeams || []).map(mapTeam) } };
    });
  }, []);

  const openCell = useCallback(async (teamId, positionId, positionName, teamName) => {
    setSel({ teamId, positionId, positionName, teamName });
    setRec(null); setRecQuery(""); setRecBusy(true);
    try { setRec(await plansApi.recommend(id, { teamId, positionId })); }
    catch (e) { setErr(e?.message || "Eroare la recomandări."); }
    finally { setRecBusy(false); }
  }, [id]);

  useEffect(() => {
    if (!sel) return;
    const t = setTimeout(async () => {
      setRecBusy(true);
      try { setRec(await plansApi.recommend(id, { teamId: sel.teamId, positionId: sel.positionId, q: recQuery })); }
      finally { setRecBusy(false); }
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [recQuery]);

  const refreshRec = useCallback(async () => {
    if (!sel) return;
    try { setRec(await plansApi.recommend(id, { teamId: sel.teamId, positionId: sel.positionId, q: recQuery })); } catch {}
  }, [sel, recQuery, id]);

  // echipa pereche + poziția cu același nume (pt. bifa „adaugă și la SIM 2")
  const allTeams = [...(data.Teams?.myTeams || []), ...(data.Teams?.otherTeams || [])];
  let pereche = null;
  if (sel) {
    const pn = perecheName(sel.teamName);
    const pt = pn && allTeams.find((t) => eq(t.name, pn) && String(t.teamId) !== String(sel.teamId));
    const pg = pt && (pt.groups || []).find((g) => eq(g.positionName, sel.positionName));
    if (pt && pg) pereche = { teamId: pt.teamId, teamName: pt.name, positionId: pg.positionId };
  }

  // ── asignare dinamică (identic cu Matrix): om REAL pe o poziție din care NU face parte → guest/permanent ──
  const allTeamsList = () => [...(data?.Teams?.myTeams || []), ...(data?.Teams?.otherTeams || [])];
  const tmTeamName = (tid) => allTeamsList().find((t) => String(t.teamId) === String(tid))?.name || "";
  const tmPosName = (tid, pid) => {
    const t = allTeamsList().find((x) => String(x.teamId) === String(tid));
    return (t?.groups || []).find((g) => String(g.positionId) === String(pid))?.positionName || "";
  };
  // check roster ÎNAINTE de a scrie: non-roster → „stage" (scriem DOAR la alegere). X/Escape/refresh = nimic scris.
  async function needsJoin(p, positionId) {
    if (!p?.id || String(p.id).startsWith("tmp-")) return false;
    if (p.inRoster === true) return false;
    if (p.inRoster === false) return true;
    try { return (await plansApi.isRoster(positionId, p.id))?.inRoster === false; } catch { return true; }
  }
  function stageJoin(j) { setJoinModal({ staged: true, ...j }); }
  async function commitStaged(j) { // abia la alegere punem persoana (optimist) + scriem
    patchGroup(j.teamId, j.positionId, (g) => ({ ...g, needed: Math.max(0, (g.needed || 0) - 1),
      people: [...g.people, { personId: j.person.id, assignmentId: `tmp-c-${Date.now()}`, name: j.person.name, avatar: j.person.avatar, initials: j.person.initials, status: "unconfirmed" }] }));
    await plansApi.assign(id, { personId: j.person.id, teamId: j.teamId, positionId: j.positionId, status: "unconfirmed", timeIds: j.timeIds });
  }
  async function confirmJoinGuest() {
    if (!joinModal) return; const j = joinModal; setJoinBusy(true);
    try { if (j.staged) await commitStaged(j); await plansApi.guestLog(id, { personId: j.person.id, teamId: j.teamId, positionId: j.positionId }); flash(`${j.person.name} — guest o zi pe „${j.positionName}" (logat, fără email).`); reconcileTeams(); refreshRec(); }
    catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
    finally { setJoinBusy(false); setJoinModal(null); }
  }
  async function confirmJoinPermanent() {
    if (!joinModal) return; const j = joinModal; setJoinBusy(true);
    try { if (j.staged) await commitStaged(j); await peopleApi.rosterAdd(j.person.id, [j.positionId]); flash(`${j.person.name} adăugat oficial pe „${j.positionName}".`); reconcileTeams(); refreshRec(); }
    catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
    finally { setJoinBusy(false); setJoinModal(null); }
  }
  function cancelJoin() { setJoinModal(null); } // nimic n-a fost pus până la alegere → nimic de curățat (zero flicker)

  async function assignPerson(p, mirror, timeIds) {
    if (!sel) return;
    const tIds = Array.isArray(timeIds) && timeIds.length ? timeIds : undefined; // gol = toate orele (During All)
    const doMirror = mirror && pereche;
    // om nou pe poziție (fără mirror) → cere decizia ÎNAINTE de a pune ceva în poziție (ca să nu apară/dispară la X)
    if (!doMirror && await needsJoin(p, sel.positionId)) {
      stageJoin({ teamId: sel.teamId, positionId: sel.positionId, timeIds: tIds, positionName: sel.positionName, teamName: sel.teamName || tmTeamName(sel.teamId),
        person: { id: p.id, name: p.name, avatar: p.avatar || "", initials: p.initials || "" } });
      return;
    }
    setAssigning(true);
    const push = (g, tid) => ({ ...g, needed: Math.max(0, (g.needed || 0) - 1), people: [...g.people, { personId: p.id, assignmentId: tid, name: p.name, avatar: p.avatar, initials: p.initials, status: "unconfirmed" }] });
    patchGroup(sel.teamId, sel.positionId, (g) => push(g, `tmp-a-${Date.now()}`));
    if (doMirror) patchGroup(pereche.teamId, pereche.positionId, (g) => push(g, `tmp-b-${Date.now()}`));
    try {
      await plansApi.assign(id, { personId: p.id, teamId: sel.teamId, positionId: sel.positionId, status: "unconfirmed", timeIds: tIds });
      if (doMirror) await plansApi.assign(id, { personId: p.id, teamId: pereche.teamId, positionId: pereche.positionId, status: "unconfirmed", timeIds: tIds });
      flash(doMirror ? `Asignat + ${pereche.teamName} (fără email).` : "Asignat (fără email)."); reconcileTeams(); refreshRec();
    }
    catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
    finally { setAssigning(false); }
  }
  async function addGuest(name) {
    if (!sel) return;
    setAssigning(true);
    const tmpId = `tmp-g-${Date.now()}`;
    patchGroup(sel.teamId, sel.positionId, (g) => ({
      ...g, needed: Math.max(0, (g.needed || 0) - 1),
      people: [...g.people, { personId: tmpId, assignmentId: tmpId, name, initials: name.slice(0, 2).toUpperCase(), avatar: "", status: "confirmed", isGuest: true }],
    }));
    try { await plansApi.assign(id, { guestName: name, teamId: sel.teamId, positionId: sel.positionId }); flash(`Invitat „${name}" adăugat (Confirmed, fără email).`); reconcileTeams(); refreshRec(); }
    catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
    finally { setAssigning(false); }
  }
  async function removePerson(teamId, positionId, assignmentId) {
    patchGroup(teamId, positionId, (g) => ({ ...g, people: g.people.filter((x) => String(x.assignmentId) !== String(assignmentId)) }));
    try { await plansApi.unassign(id, assignmentId); flash("Șters."); reconcileTeams(); refreshRec(); }
    catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
  }
  // Kanban: trage o persoană în altă poziție/echipă → MUTĂ (Ctrl = copiază). ZERO email.
  function onPersonDragStart(pp, g, t) {
    dragRef.current = { personId: pp.personId, assignmentId: pp.assignmentId, teamId: t.teamId, positionId: g.positionId, name: pp.name, avatar: pp.avatar, initials: pp.initials, isGuest: !!pp.isGuest };
    setDragActive(true); setDragHint(`${pp.name} → lași jos = MUTĂ · ține Ctrl = copiezi`);
  }
  async function dropOnPos(teamId, positionId, ev) {
    const d = dragRef.current; dragRef.current = null;
    setDragActive(false); setDropKey(null); setDragHint("");
    if (!d) return;
    const copy = !!(ev && (ev.ctrlKey || ev.metaKey));
    if (String(d.teamId) === String(teamId) && String(d.positionId) === String(positionId)) return; // aceeași poziție
    const doMove = !copy && d.assignmentId && !String(d.assignmentId).startsWith("tmp-");
    const tmpId = `tmp-m-${Date.now()}`;
    patchGroup(teamId, positionId, (g) => ({ ...g, needed: Math.max(0, (g.needed || 0) - 1), people: [...g.people, { personId: d.personId, assignmentId: tmpId, name: d.name, avatar: d.avatar, initials: d.initials, status: "unconfirmed", isGuest: d.isGuest }] }));
    if (doMove) patchGroup(d.teamId, d.positionId, (g) => ({ ...g, people: g.people.filter((x) => String(x.assignmentId) !== String(d.assignmentId)) }));
    try {
      await plansApi.assign(id, d.isGuest ? { guestName: d.name, teamId, positionId } : { personId: d.personId, teamId, positionId, status: "unconfirmed" });
      if (doMove) await plansApi.unassign(id, d.assignmentId);
      flash(doMove ? "Mutat." : "Copiat."); reconcileTeams(); refreshRec();
    } catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
  }
  async function saveEdit(payload) {
    if (!editing) return;
    const { status } = payload;
    patchGroup(editing.teamId, editing.positionId, (g) => ({ ...g, people: g.people.map((x) => String(x.assignmentId) === String(editing.assignmentId) ? { ...x, status } : x) }));
    setEditing(null);
    try { await plansApi.updateAssignment(id, editing.assignmentId, payload); flash("Salvat (fără email)."); reconcileTeams(); }
    catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
  }
  async function saveRules(positionId, payload) {
    try { await plansApi.setPositionRules(positionId, payload); flash("Reguli poziție salvate."); refreshRec(); }
    catch (e) { flash(e?.message || "Eroare."); }
  }
  async function changeNeeded(teamId, positionId, timeId, nextCount) {
    const n = Math.max(0, nextCount);
    patchGroup(teamId, positionId, (g) => {
      if (!timeId) return { ...g, needed: n }; // plan-wide (fără oră)
      const tn = { ...(g.timeNeeds || {}), [timeId]: n };
      const agg = Object.values(tn).reduce((s, x) => s + (x || 0), 0);
      return { ...g, timeNeeds: tn, needed: agg };
    });
    try { await plansApi.setNeeded(id, teamId, positionId, n, timeId); reconcileTeams(); }
    catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
  }

  useAiSurface({
    id: "plans.detail", label: "Detaliu plan", scope: "page",
    getContext: () => ({ planId: id, title: head?.title, tab, selectat: sel?.positionName }),
    actions: [
      { id: "tab", label: "Schimbă tab", params: { name: "string" }, run: ({ name }) => TABS.includes(name) && setTab(name) },
      { id: "matrix", label: "Matrix", run: () => head && router.push(`/plans/matrix/${head.serviceTypeId || ""}`) },
    ],
  }, [id, head, tab, sel]);

  const cur = data[tab];

  return (
    <div className={`pd pc-full ${(sel || orderSide) ? "has-side" : ""}`}>
      <div className="top">
        <button className="back" onClick={() => router.push("/plans")} title="Înapoi">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <div className="titles">
          <div className="st">{head?.serviceTypeName}</div>
          {renaming ? (
            <input className="title-inp" value={renameVal} autoFocus
              onChange={(e) => setRenameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenaming(false); }}
              onBlur={saveRename} />
          ) : (
            <h1 className="title" onDoubleClick={startRename} title="Dublu-click pt. redenumire">{head?.title || "Plan"}</h1>
          )}
          <div className="datenav">
            <button className="darr" disabled={!head?.prevId} title="Plan anterior" onClick={() => head?.prevId && router.push(`/plans/${head.prevId}`)}>‹</button>
            <span className="date">{head?.dateLabel}</span>
            <button className="darr" disabled={!head?.nextId} title="Plan următor" onClick={() => head?.nextId && router.push(`/plans/${head.nextId}`)}>›</button>
          </div>
        </div>
        <div className="topright">
          <button className="mx" onClick={() => head && router.push(`/plans/matrix/${head.serviceTypeId || ""}?focus=${id}`)}>Matrix ▾</button>
          <div className="menu-wrap">
            <button className="kebab" title="Mai multe" aria-label="Mai multe acțiuni" onClick={() => setMenuOpen((v) => !v)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.45" /><circle cx="8" cy="8" r="1.45" /><circle cx="8" cy="13" r="1.45" /></svg>
            </button>
            {menuOpen && (
              <>
                <div className="menu-back" onClick={() => setMenuOpen(false)} />
                <div className="menu" role="menu">
                  <button className="mi" onClick={startRename} role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                    Redenumește
                  </button>
                  <button className="mi" onClick={printPlan} role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
                    Printează
                  </button>
                  <button className="mi" onClick={copyLink} role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
                    Copiază link
                  </button>
                  {!!caps.editOrder && (
                    <button className="mi" onClick={() => { setMenuOpen(false); setTplModal(true); }} role="menuitem">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                      Arrangement order
                    </button>
                  )}
                  {!!caps.editOrder && (
                    <button className="mi" onClick={() => { setMenuOpen(false); setSavingTpl(true); }} role="menuitem">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                      Save as Template
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="pd-layout">
        {/* ── sidebar STÂNGA (ca în PCO): rolul meu + Times/Files/Notes ── */}
        <aside className="pd-left">
          {head?.myAssignments?.length > 0 && (
            <div className="myrole">
              {head.me && <PersonAvatar person={head.me} size={34} />}
              <div className="myrole-list">
                {head.myAssignments.map((a) => (
                  <div key={a.assignmentId} className="myitem">
                    <div className={`myrow ${a.confirmed ? "ok" : a.declined ? "no" : ""}`}>
                      <span className="myic">{a.confirmed ? "✓" : a.declined ? "✕" : "?"}</span>
                      <span className="myl">{a.label}{a.team ? ` · ${a.team}` : ""}</span>
                    </div>
                    {a.instructions && <div className="myinstr">{a.instructions}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="lcard"><div className="lc-h">Times</div><TimesTab data={data.Times} canEdit={!!caps.editOrder} onEditTime={(t) => setTimeEdit({ time: t })} onAddTime={(type) => setTimeEdit({ type })} onApplyTemplate={async () => { try { await plansApi.applyRehearsalTemplate(id); reloadTimes(); flash("Repetiție setată din template."); } catch (e) { flash(e?.message || "Eroare."); } }} /></div>
          <div className="lcard"><NotesBoard planId={id} canEdit={!!caps.editOrder} flash={flash} /></div>
        </aside>

        {/* ── principal: Order / Teams ── */}
        <div className="pd-main">
          <div className="tabs">
            {[...TABS, "Alerts"].map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""} ${t === "Alerts" ? "alert" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
          </div>
          {err && <div className="err">{err}</div>}
          {loading ? <Skeleton lines={5} /> : (
            <div className="body">
              {tab === "Order" && <OrderTab key={orderKey} planId={id} canEdit={!!caps.editOrder} onSideChange={setOrderSide} flash={flash} />}
              {tab === "Teams" && <TeamsTab data={cur} sel={sel} onOpenCell={openCell}
                canAssign={canAssign} canMove={canMove} canEditNeeded={canEditNeeded}
                onEdit={(pp, g, t) => setEditing({ planId: id, teamId: t.teamId, positionId: g.positionId, assignmentId: pp.assignmentId, name: pp.name, avatar: pp.avatar, initials: pp.initials, status: pp.status, teamName: t.name, positionName: g.positionName })}
                onRemove={removePerson} onNeeded={changeNeeded}
                dragActive={dragActive} dropKey={dropKey} setDropKey={setDropKey} onDragStartP={onPersonDragStart} onDropPos={dropOnPos} onDragEndP={() => { setDragActive(false); setDropKey(null); setDragHint(""); }} />}
              {tab === "Rehearse" && <RehearseTab planId={id} canEdit={!!caps.editOrder || !!caps.viewRehearsal} flash={flash} />}
              {tab === "Alerts" && <AlertsTab planId={id} flash={flash} canEdit={!!caps.editOrder} />}
            </div>
          )}
        </div>
      </div>

      <AssignSidebar
        open={!!sel} title={sel?.positionName || ""} neededCount={rec?.neededCount || 0}
        loading={recBusy} groups={rec?.groups || []} alreadyHere={rec?.alreadyHere || []} blockout={rec?.blockout || []}
        query={recQuery} onQuery={setRecQuery} onPick={assignPerson} onClose={() => { setSel(null); setRec(null); }} assigning={assigning}
        mirror={pereche ? { available: true, label: `Adaugă și la ${pereche.teamName}` } : null}
        onAddGuest={addGuest}
        defaults={rec?.defaults} positionId={sel?.positionId} planId={id} onSaveRules={saveRules} instructions={rec?.instructions}
        serviceTimes={rec?.serviceTimes || []}
        onRosterChanged={refreshRec}
        onConflictResolved={() => { refreshRec(); reconcileTeams(); }}
        canAssign={canAssign} canRoster={canRoster} canRules={canAssign || !!caps.positionRules || !!caps.manageTeams}
      />
      {editing && (
        <EditPersonModal person={editing} onClose={() => setEditing(null)} onSave={saveEdit}
          onRemove={() => { removePerson(editing.teamId, editing.positionId, editing.assignmentId); setEditing(null); }} />
      )}
      <PositionJoinModal data={joinModal} busy={joinBusy} onGuest={confirmJoinGuest} onPermanent={confirmJoinPermanent} onClose={() => !joinBusy && cancelJoin()} />
      {dragActive && dragHint && <div className="drag-hint">⇄ {dragHint}</div>}
      {timeEdit && <TimeEditModal planId={id} time={timeEdit.time} defaultType={timeEdit.type || "rehearsal"} meta={data.Times || {}} onClose={() => setTimeEdit(null)} onSaved={() => { setTimeEdit(null); reloadTimes(); flash("Oră salvată."); }} />}
      {savingTpl && <SaveTemplateModal planId={id} serviceTypeId={head?.serviceTypeId} serviceTypeName={head?.serviceTypeName} onClose={() => setSavingTpl(false)} flash={flash} />}
      {tplModal && <OrderTemplateModal planId={id} serviceTypeId={head?.serviceTypeId} serviceTypeName={head?.serviceTypeName} orderTemplateId={head?.orderTemplateId} planSortDate={head?.sortDate} canEdit={!!caps.editOrder} onClose={() => setTplModal(false)} onApplied={() => { setOrderKey((k) => k + 1); loadHead(); }} flash={flash} />}
      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .pd { padding: 18px 20px 80px; transition: padding-right .16s ease; }
        .drag-hint { position: fixed; top: 14px; left: 50%; transform: translateX(-50%); background: var(--primary); color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 12.5px; font-weight: 600; z-index: 70; box-shadow: 0 6px 20px rgba(47,129,247,.4); pointer-events: none; animation: dhIn .14s ease; }
        @keyframes dhIn { from { opacity: 0; transform: translate(-50%, -6px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .pd.has-side { padding-right: 360px; }
        .top { display: flex; align-items: flex-start; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
        .back { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 6px; margin-top: 4px; }
        .back:hover { color: var(--text); }
        .titles { flex: 1; }
        .st { color: var(--text-faint); font-size: 12px; }
        .title { font-size: 22px; font-weight: 600; margin: 2px 0 0; }
        .pd-layout { display: grid; grid-template-columns: 280px 1fr; gap: 22px; align-items: start; margin-top: 14px; }
        .myrole { display: flex; align-items: flex-start; gap: 11px; padding: 2px 2px 6px; }
        .myrole-list { flex: 1; min-width: 0; }
        .pd-left { position: sticky; top: calc(var(--nav-h) + 14px); display: flex; flex-direction: column; gap: 14px; }
        .lcard { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
        .lc-h { color: var(--text); font-weight: 600; font-size: 13px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .lc-tag { font-size: 9.5px; color: var(--text-faint); border: 1px solid var(--border-strong); border-radius: 10px; padding: 0 6px; text-transform: uppercase; letter-spacing: .3px; font-weight: 500; }
        .myrow { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; color: var(--text-dim); }
        .myrow .myic { width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; background: var(--st-unconfirmed); color: #1d1600; flex: none; }
        .myrow.ok .myic { background: var(--product); color: #0b2018; } .myrow.no .myic { background: var(--danger); color: #fff; }
        .myl { color: var(--text); }
        .myitem { margin-bottom: 4px; }
        .myinstr { color: var(--text-dim); font-size: 12px; line-height: 1.5; white-space: pre-wrap; margin: 4px 0 8px 26px; padding: 8px 10px; background: var(--surface-2); border-radius: 6px; border-left: 2px solid var(--primary); }
        .pd-main { min-width: 0; }
        @media (max-width: 900px) { .pd-layout { grid-template-columns: 1fr; } .pd-left { position: static; } }
        .datenav { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 8px; padding: 4px 6px; }
        .darr { background: transparent; border: none; color: var(--text-dim); width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 16px; line-height: 1; }
        .darr:hover:not(:disabled) { color: var(--text); background: rgba(255,255,255,.06); }
        .darr:disabled { opacity: .35; cursor: default; }
        .date { color: var(--text); font-size: 14px; font-weight: 600; min-width: 120px; text-align: center; }
        .topright { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .mx { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 32px; padding: 0 14px; cursor: pointer; font-weight: 600; font-size: 13px; }
        .mx:hover { border-color: var(--primary); }
        .title-inp { font-size: 22px; font-weight: 600; margin: 2px 0 0; background: var(--surface-2); border: 1px solid var(--primary);
          border-radius: 6px; color: var(--text); padding: 2px 9px; outline: none; width: 100%; max-width: 480px; font-family: inherit; }
        /* meniu 3-puncte */
        .menu-wrap { position: relative; }
        .kebab { width: 34px; height: 32px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-2);
          border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; cursor: pointer; transition: color .12s, border-color .12s; }
        .kebab:hover { color: var(--text); border-color: var(--product); }
        .menu-back { position: fixed; inset: 0; z-index: 44; }
        .menu { position: absolute; right: 0; top: 38px; z-index: 45; min-width: 182px; background: var(--surface-3);
          border: 1px solid var(--border-strong); border-radius: 9px; box-shadow: 0 14px 40px rgba(0,0,0,.45); padding: 5px;
          display: flex; flex-direction: column; animation: menuIn .14s ease; }
        @keyframes menuIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
        .mi { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: transparent; border: none;
          color: var(--text); font-size: 13px; padding: 9px 11px; border-radius: 6px; cursor: pointer; }
        .mi:hover { background: var(--surface-2); }
        .mi svg { color: var(--text-dim); flex: none; }
        @media print {
          .back, .topright, .datenav, .pd-left, .pd-tabs, .toast { display: none !important; }
          .pd-layout { display: block !important; }
          .title { font-size: 20px; }
        }
        .date { color: var(--text); font-size: 14px; min-width: 90px; text-align: center; }
        .mine { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
        .chip { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 20px; padding: 4px 12px; font-size: 12.5px; color: var(--text-dim); }
        .chip.ok { border-color: var(--product); color: var(--product); }
        .chip.no { border-color: var(--danger); color: var(--danger); }
        .tabs { display: flex; gap: 8px; margin: 0 0 16px; padding: 0 14px; background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .tab { background: transparent; border: none; color: var(--text-dim); padding: 11px 4px; margin-right: 10px; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .tab:hover { color: var(--text); }
        .tab.active { color: var(--text); border-bottom-color: var(--primary); font-weight: 600; }
        .tab.alert.active { border-bottom-color: var(--danger); }
        .empty { padding: 30px 4px; color: var(--text-faint); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
        .toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); padding: 10px 18px; border-radius: 8px; font-size: 13px; z-index: 60; box-shadow: 0 8px 28px rgba(0,0,0,.4); }
      `}</style>
      <style jsx global>{`
        .pd .muted { padding: 24px 4px; color: var(--text-faint); font-size: 13.5px; }
      `}</style>
    </div>
  );
}

/* icon status pt. header-ul echipei — OUTLINE (gol înăuntru), ca în PCO */
function CountIcon({ s }) {
  const c = s === "confirmed" ? "#57b98a" : s === "unconfirmed" ? "#c9a227" : "#e5534b";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flex: "none" }}>
      <circle cx="8" cy="8" r="6.7" fill="none" stroke={c} strokeWidth="1.4" />
      {s === "confirmed" && <path d="M5 8.1l2 2 4-4.3" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
      {s === "unconfirmed" && <text x="8" y="11.5" textAnchor="middle" fontSize="9" fill={c} fontWeight="800">?</text>}
      {s === "declined" && <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke={c} strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

/* ── Teams (interactiv) ── echipele = coloane în carusel orizontal ── */
function TeamCol({ t, sel, onOpenCell, onEdit, onRemove, onNeeded, serviceTimes = [], dragActive, dropKey, setDropKey, onDragStartP, onDropPos, onDragEndP, canAssign = true, canMove = true, canEditNeeded = true }) {
  const perTime = serviceTimes.length >= 2; // Needed pe fiecare oră de serviciu
  return (
    <div className="tcol">
      <div className="tc-head">
        <div className="tc-name">{t.name}</div>
        <div className="tc-counts">
          <span className="cnt ok" title="Confirmați"><CountIcon s="confirmed" />{t.counts?.confirmed || 0}</span>
          <span className="cnt no" title="Refuzați"><CountIcon s="declined" />{t.counts?.declined || 0}</span>
          <span className="cnt un" title="În așteptare"><CountIcon s="unconfirmed" />{t.counts?.unconfirmed || 0}</span>
        </div>
      </div>
      {(t.groups || []).map((g, gi) => {
        const isSel = sel && String(sel.teamId) === String(t.teamId) && String(sel.positionId) === String(g.positionId);
        const posKey = `${t.teamId}-${g.positionId}`;
        return (
          <div key={g.positionId || gi}
            className={`pos ${isSel ? "sel" : ""} ${dragActive && dropKey === posKey ? "drophover" : ""}`}
            onDragOver={(e) => { if (dragActive) { e.preventDefault(); } }}
            onDragEnter={() => { if (dragActive) setDropKey?.(posKey); }}
            onDrop={(e) => onDropPos?.(t.teamId, g.positionId, e)}>
            <div className="pos-name" onClick={() => onOpenCell(t.teamId, g.positionId, g.positionName || "Poziție", t.name)} title="Asignează pe această poziție">{g.positionName || "—"}</div>
            {(g.people || []).map((p, pi) => (
              <div key={p.assignmentId || pi} className="pers" draggable={canMove}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "copyMove"; onDragStartP?.(p, g, t); }}
                onDragEnd={() => onDragEndP?.()}
                onClick={() => { if (canAssign) onEdit(p, g, t); }} title={canAssign ? `${p.name} — click: editează · trage: MUTĂ (Ctrl = copiază)` : p.name}>
                <PersonAvatar person={p} status={p.status} size={24} />
                <span className={`pn ${p.status === "declined" ? "decl" : ""}`}>{p.name}</span>
                {p.isGuest && <span className="gtag">invitat</span>}
                {canAssign && (
                <button className="ped" title="Editează (status, ore, poziție)" onClick={(e) => { e.stopPropagation(); onEdit(p, g, t); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                </button>
                )}
                {canAssign && (
                <button className="psch" title="Replanifică — deschide bara" onClick={(e) => { e.stopPropagation(); onOpenCell(t.teamId, g.positionId, g.positionName || "Poziție", t.name); }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></svg>
                </button>
                )}
                {canMove && (
                <button className="prm" title="Șterge" onClick={(e) => { e.stopPropagation(); onRemove(t.teamId, g.positionId, p.assignmentId); }}>×</button>
                )}
              </div>
            ))}
            {perTime ? (
              <div className="needtimes">
                {serviceTimes.map((st) => {
                  const cnt = (g.timeNeeds && g.timeNeeds[st.id]) || 0;
                  return (
                    <div key={st.id} className="needtime">
                      <span className="nt-lbl">{st.label}</span>
                      {canEditNeeded ? (
                      <div className="needctl">
                        <button onClick={() => onNeeded(t.teamId, g.positionId, st.id, cnt - 1)} disabled={cnt <= 0}>−</button>
                        <span className={`needn ${cnt > 0 ? "" : "zero"}`}>{cnt}</span>
                        <button onClick={() => onNeeded(t.teamId, g.positionId, st.id, cnt + 1)}>+</button>
                      </div>
                      ) : <span className={`needn ${cnt > 0 ? "" : "zero"}`}>{cnt}</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {g.needed > 0 && (
                  <div className="needrow">
                    {canEditNeeded ? (
                    <div className="needctl">
                      <button onClick={() => onNeeded(t.teamId, g.positionId, null, g.needed - 1)}>−</button>
                      <span className="needn">{g.needed} Needed</span>
                      <button onClick={() => onNeeded(t.teamId, g.positionId, null, g.needed + 1)}>+</button>
                    </div>
                    ) : <span className="needn">{g.needed} Needed</span>}
                  </div>
                )}
                {canEditNeeded && g.needed === 0 && (!g.people || !g.people.length) && (
                  <div className="needrow">
                    <button className="needadd" onClick={() => onNeeded(t.teamId, g.positionId, null, 1)}>+ Needed</button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      {(!t.groups || !t.groups.length) && <div className="pos-empty">Nicio poziție.</div>}
      <style jsx>{`
        .tcol { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 0 0 6px; width: 262px; flex: none; }
        .tc-head { display: flex; flex-direction: column; align-items: flex-start; gap: 11px; padding: 17px 16px 15px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); border-radius: 10px 10px 0 0; z-index: 1; }
        .tc-name { color: var(--text); font-weight: 600; font-size: 15px; }
        .tc-counts { display: flex; gap: 18px; }
        .cnt { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
        .cnt.ok { color: var(--product); } .cnt.no { color: var(--danger); } .cnt.un { color: var(--st-unconfirmed); }
        .pos { padding: 0 0 2px; transition: background .12s, box-shadow .12s; }
        .pos.sel { background: rgba(47,129,247,.07); }
        .pos.drophover { background: rgba(47,129,247,.14); outline: 2px solid var(--primary); outline-offset: -2px; border-radius: 6px; position: relative; z-index: 1; }
        .pos-name { color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; padding: 12px 14px 8px; background: var(--section-head-bg); cursor: pointer; }
        .pos-name:hover { color: var(--text); }
        .pers { display: flex; align-items: center; gap: 9px; padding: 7px 14px; min-height: 38px; cursor: grab; }
        .pers:hover { background: rgba(255,255,255,.05); }
        .pers:active { cursor: grabbing; }
        .pn { color: var(--text); font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pn.decl { text-decoration: line-through; opacity: .6; }
        .gtag { flex: none; font-size: 9px; color: var(--product); border: 1px solid rgba(87,185,138,.5); border-radius: 10px; padding: 0 5px; text-transform: uppercase; }
        .prm, .psch, .ped { opacity: 0; background: transparent; border: none; color: var(--text-faint); cursor: pointer; line-height: 1; padding: 0 2px; flex: none; display: inline-flex; align-items: center; }
        .prm { font-size: 15px; }
        .pers:hover .prm, .pers:hover .psch, .pers:hover .ped { opacity: 1; } .prm:hover { color: var(--danger); } .psch:hover, .ped:hover { color: var(--product); }
        .needrow { display: flex; align-items: center; padding: 7px 14px; min-height: 38px; }
        .needctl { display: inline-flex; align-items: center; gap: 5px; }
        .needn { color: #e0a93c; font-size: 11.5px; font-weight: 600; }
        .needctl button { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 4px; cursor: pointer; width: 19px; height: 19px; line-height: 1; font-size: 13px; }
        .needctl button:hover { color: var(--text); }
        .needctl button:disabled { opacity: .4; cursor: default; }
        .needadd { background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 5px; cursor: pointer; font-size: 11px; padding: 4px 11px; }
        .needadd:hover { color: var(--primary); border-color: var(--primary); }
        .needtimes { display: flex; flex-direction: column; gap: 4px; padding: 6px 14px; }
        .needtime { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 26px; }
        .nt-lbl { color: var(--text-faint); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .needn.zero { color: var(--text-faint); }
        .pos-empty { color: var(--text-faint); font-size: 12px; padding: 10px 14px; }
      `}</style>
    </div>
  );
}
function TeamsTab({ data, sel, onOpenCell, onEdit, onRemove, onNeeded, dragActive, dropKey, setDropKey, onDragStartP, onDropPos, onDragEndP, canAssign = true, canMove = true, canEditNeeded = true }) {
  if (!data) return <Skeleton lines={3} />;
  const my = data.myTeams || [], other = data.otherTeams || [];
  if (!my.length && !other.length) return <div className="muted">Nicio echipă pe acest plan.</div>;
  const props = { sel, onOpenCell, onEdit, onRemove, onNeeded, serviceTimes: data.serviceTimes || [], dragActive, dropKey, setDropKey, onDragStartP, onDropPos, onDragEndP, canAssign, canMove, canEditNeeded };
  // Toate echipele pe UN SINGUR rând (my întâi, apoi other) — fără header-ele MY/OTHER TEAMS (cerință David).
  return (
    <div className="teams">
      <div className="carousel">{[...my, ...other].map((t) => <TeamCol key={t.teamId} t={t} {...props} />)}</div>
      <style jsx>{`
        .carousel { display: flex; flex-wrap: nowrap; gap: 14px; margin-bottom: 24px; align-items: flex-start; overflow-x: auto; padding-bottom: 8px; scrollbar-width: auto; }
        .carousel::-webkit-scrollbar { height: 18px; }
        .carousel::-webkit-scrollbar-thumb { background: #39434f; border-radius: 9px; border: 4px solid transparent; background-clip: content-box; }
        .carousel::-webkit-scrollbar-thumb:hover { background: #4a5663; background-clip: content-box; }
      `}</style>
    </div>
  );
}

/* ── Rehearse ── „Order-ul Producției": overlay ONE-WAY peste Order. Curat, pt. lumini/proiecție/sunet.
   NU replică foaia printată — reimaginare digitală. Faza 1: structură+gamă+cine cântă+rename. Faza 2: lumini (scene+fixtures+secțiuni). */
const VOICE_LBL = { lead: "", support: "S", alto: "A", tenor: "T", soprano: "Sop", bass: "B", custom: "" };
const TRANS_LBL = { direct: "Tranziție directă", prayer: "Tranziție rugăciune", word: "Tranziție prin cuvânt" };
const FIXTURE_ORDER = ["par", "led", "tobe", "laterale", "coroana"];
const FIXTURE_LBL = { par: "Par", led: "LED", tobe: "Tobe", laterale: "Laterale", coroana: "Coroană" };
const REM_ICON = { stop: "🛑", warn: "⚠️", info: "ℹ️" };
const REM_PRESETS = [{ text: "Oprește Spotify", icon: "stop", severity: "high" }, { text: "Recomandări pian / stativ", icon: "info", severity: "normal" }];
const uniqSections = (seq) => { const seen = new Set(), out = []; for (const s of (seq || [])) if (s && !seen.has(s)) { seen.add(s); out.push(s); } return out; };

/* Print color, o pagină curată — fereastră auto-generată (înlocuiește foaia mâzgălită). */
function printProduction(data) {
  if (!data || typeof window === "undefined") return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const dot = (c) => `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${esc(c)};border:1px solid #999;vertical-align:middle;margin-right:3px"></span>`;
  const rowsHtml = (data.items || []).map((r) => {
    if (r.type === "header") return `<div class="sec">${esc(r.title)}</div>`;
    if (r.type === "transition") { const t = r.transition || {}; return `<div class="tr">&#8627; ${esc(TRANS_LBL[t.kind] || "Tranziție")}${t.key ? ` · ${esc(t.key)}` : ""}${(t.lights || []).map((l) => " " + dot(l.color)).join("")}</div>`; }
    const voices = r.voices || []; const lead = voices.find((v) => v.role === "lead") || voices[0];
    const parts = voices.filter((v) => v !== lead).map((v) => `${VOICE_LBL[v.role] ? VOICE_LBL[v.role] + ": " : ""}${esc((v.name || "").split(" ")[0])}`);
    const fx = (r.fixtures || []).map((f) => dot(f.color)).join("");
    const cues = (r.sectionCues || []).filter((c) => (c.lights || []).length || c.note).map((c) => `${esc(c.section)}${(c.lights || [])[0] && c.lights[0].color ? " " + dot(c.lights[0].color) : ""}${c.note ? ` ${esc(c.note)}` : ""}`).join(" · ");
    const projNote = (r.projection || [])[0] ? r.projection[0].note : "";
    const reminders = (r.reminders || []).map((rem) => `<span class="rem">${REM_ICON[rem.icon] || "•"} ${esc(rem.text)}</span>`).join(" ");
    return `<div class="row">${r.keyName ? `<span class="k">${esc(r.keyName)}</span>` : ""}<span class="t">${esc(r.title)}</span>`
      + `${lead || parts.length ? `<div class="v">${esc(lead ? lead.name : "")}${parts.length ? " · " + parts.join(" · ") : ""}</div>` : ""}`
      + `${r.scene || fx || cues ? `<div class="lt">${r.scene ? `<b>${esc(r.scene.name)}</b> ` : ""}${fx}${cues ? ` &nbsp; &#10022; ${cues}` : ""}</div>` : ""}`
      + `${projNote ? `<div class="lt">&#9635; ${esc(projNote)}</div>` : ""}`
      + `${r.note ? `<div class="lt">&#9998; ${esc(r.note)}</div>` : ""}`
      + `${reminders ? `<div class="lt">${reminders}</div>` : ""}</div>`;
  }).join("");
  const spotify = data.spotify ? `<div class="sp">&#9834; Spotify pre-serviciu: <b>${esc(data.spotify.key)}</b>${data.spotify.relative ? ` (relativă ${esc(data.spotify.relative)})` : ""}</div>` : "";
  const sim = (data.simFeedback || []).length ? `<div class="sim"><div class="sim-h">Feedback între programe (SIM)</div>${data.simFeedback.map((f) => `<div>${f.done ? "&#9745;" : "&#9744;"} ${f.sim ? `[SIM${esc(f.sim)}] ` : ""}${esc(f.text)}</div>`).join("")}</div>` : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Order Producție</title><style>
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}
    body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:22px;font-size:13px}
    h1{font-size:18px;margin:0 0 10px}
    .sp{background:#e8f6ee;border:1px solid #bfe3cd;border-radius:6px;padding:6px 10px;margin-bottom:12px;display:inline-block}
    .sec{font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#666;margin:14px 0 4px}
    .row{border:1px solid #ddd;border-radius:7px;padding:7px 10px;margin-bottom:5px;page-break-inside:avoid}
    .t{font-weight:700}.k{float:right;border:1px solid #2f6fd6;color:#2f6fd6;border-radius:4px;padding:0 6px;font-weight:700}
    .v{color:#555;font-size:12px;margin-top:2px}.lt{margin-top:3px;font-size:12px;color:#444}
    .tr{color:#666;font-style:italic;padding:2px 0 2px 16px;font-size:12px}
    .rem{color:#b3261e;font-weight:600}
    .sim{margin-top:18px;border-top:2px solid #b3261e;padding-top:8px;page-break-inside:avoid}.sim-h{color:#b3261e;font-weight:700;margin-bottom:4px}
  </style></head><body><h1>Order Producție</h1>${spotify}${rowsHtml}${sim}
  <script>window.onload=function(){setTimeout(function(){window.print()},150)}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
}

function RehearseTab({ planId, canEdit = false, flash }) {
  const [data, setData] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [editing, setEditing] = useState(null); // itemId în curs de redenumire
  const [draft, setDraft] = useState("");
  const [lightsFor, setLightsFor] = useState(null); // itemId cu panoul de producție deschis
  const [share, setShare] = useState(false); // dialog partajare

  const load = () => plansApi.production(planId).then(setData).catch(() => setData({ items: [] }));
  const loadSnippets = () => productionSnippetsApi.list().then((r) => setSnippets(r.snippets || [])).catch(() => {});
  useEffect(() => {
    load();
    productionScenesApi.list().then((r) => setScenes(r.scenes || [])).catch(() => {});
    loadSnippets();
    /* eslint-disable-next-line */
  }, [planId]);

  async function saveSnippet(text) {
    const t = (text || "").trim(); if (!t || snippets.some((s) => s.text === t)) return;
    try { const r = await productionSnippetsApi.create(t); setSnippets((p) => [...p, { id: r.id, text: r.text }]); }
    catch (e) { flash?.(e?.message || "Eroare."); }
  }
  async function delSnippet(id) {
    try { await productionSnippetsApi.remove(id); setSnippets((p) => p.filter((s) => String(s.id) !== String(id))); }
    catch (e) { flash?.(e?.message || "Eroare."); }
  }

  const patchRow = (id, patch) => setData((d) => ({ ...d, items: d.items.map((r) => (String(r.id) === String(id) ? { ...r, ...patch } : r)) }));

  async function saveItem(it, patch) {
    patchRow(it.id, patch); // optimist
    try { await plansApi.saveProduction(planId, { item: { itemId: it.id, ...patch } }); }
    catch (e) { flash?.(e?.message || "Eroare la salvare."); load(); }
  }
  async function saveSim(next) {
    setData((d) => ({ ...d, simFeedback: next }));
    try { await plansApi.saveProduction(planId, { simFeedback: next }); }
    catch (e) { flash?.(e?.message || "Eroare la salvare."); load(); }
  }
  async function saveLabel(it) {
    const label = draft.trim();
    setEditing(null);
    if (label === (it.label || "")) return;
    patchRow(it.id, { label, title: label || it.origTitle });
    try { await plansApi.saveProduction(planId, { item: { itemId: it.id, label } }); }
    catch (e) { flash?.(e?.message || "Eroare la salvare."); load(); }
  }

  if (!data) return <Skeleton lines={4} />;
  const rows = data.items || [];
  const songCount = rows.filter((r) => r.type === "song" || r.type === "medley").length;
  if (!rows.length) return <div className="muted">Order gol. Structura vine din tab-ul „Order"; aici o îmbraci pentru producție.</div>;

  return (
    <div className="prod">
      <div className="prod-head">
        <span className="prod-cnt">{songCount} cântece · {rows.length} momente</span>
        <span className="prod-hint">Order-ul tău de producție — se sincronizează din Order, nu-l modifică.</span>
        <span className="prod-actions">
          <button className="prod-share" onClick={() => printProduction(data)} title="Print color, o pagină curată">⎙ Print</button>
          {canEdit && <button className="prod-share" onClick={() => setShare(true)} title="Trimite copia foii tale altui producător">⤴ Partajează</button>}
        </span>
      </div>
      {share && <ShareDialog planId={planId} onClose={() => setShare(false)} flash={flash} />}

      {data.spotify && (
        <div className="prod-spotify" title="Gama pentru playlistul Spotify de pre-serviciu (din prima gamă a order-ului)">
          <span className="ps-ico">♫</span>
          <span className="ps-lbl">Spotify pre-serviciu</span>
          <span className="ps-key">{data.spotify.key}</span>
          {data.spotify.relative && <span className="ps-rel">relativă {data.spotify.relative}</span>}
        </div>
      )}

      <div className="prod-list">
        {rows.map((r) => {
          if (r.type === "header") return <div key={r.id} className="prod-sec">{r.title}</div>;
          const t = r.transition;
          if (r.type === "transition") {
            return (
              <div key={r.id} className="prod-trans">
                <span className="pt-arrow">↳</span>
                <span className="pt-lbl">{TRANS_LBL[t?.kind] || "Tranziție"}</span>
                {t?.key && <span className="pt-key">{t.key}{t.autoKey ? " ·auto" : ""}</span>}
                {t?.prayer && <span className="pt-who">{t.prayer.name}</span>}
                {(t?.lights || []).map((l, i) => <span key={i} className="dot" style={{ background: l.color }} title={l.label} />)}
              </div>
            );
          }
          const voices = r.voices || [];
          const lead = voices.find((v) => v.role === "lead") || voices[0];
          const parts = voices.filter((v) => v !== lead).map((v) => `${VOICE_LBL[v.role] ? VOICE_LBL[v.role] + ": " : ""}${(v.name || "").split(" ")[0]}`);
          const fx = r.fixtures || [];
          const cueCount = (r.sectionCues || []).filter((c) => (c.lights || []).length || c.note).length;
          const reminders = r.reminders || [];
          const projNote = (r.projection || [])[0]?.note || "";
          const note = r.note || "";
          const open = String(lightsFor) === String(r.id);
          return (
            <div key={r.id} className="prod-item">
              <div className="prod-row">
                <div className="pr-main">
                  {editing === r.id ? (
                    <input className="pr-edit" autoFocus value={draft} placeholder={r.origTitle}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveLabel(r); if (e.key === "Escape") setEditing(null); }}
                      onBlur={() => saveLabel(r)} />
                  ) : (
                    <button className="pr-title" disabled={!canEdit} onClick={() => { setEditing(r.id); setDraft(r.label || ""); }} title={canEdit ? "Click = redenumește (doar aici)" : ""}>
                      <span className="pr-t">{r.title}</span>
                      {r.label && <span className="pr-orig" title={`Original: ${r.origTitle}`}>↩</span>}
                    </button>
                  )}
                  {(lead || parts.length) && (
                    <div className="pr-voices">
                      {lead && <span className="pr-lead">{lead.name}</span>}
                      {parts.length > 0 && <span className="pr-parts">{parts.join(" · ")}</span>}
                    </div>
                  )}
                </div>
                <div className="pr-side">
                  <button className={`lights-btn ${open ? "on" : ""}`} onClick={() => setLightsFor(open ? null : r.id)} title="Lumini">
                    {r.scene && <span className="ls-name">{r.scene.name}</span>}
                    {fx.map((f, i) => <span key={i} className="dot" style={{ background: f.color }} title={FIXTURE_LBL[f.fixture] || f.fixture} />)}
                    {cueCount > 0 && <span className="ls-cue">✦{cueCount}</span>}
                    {!r.scene && fx.length === 0 && cueCount === 0 && <span className="ls-add">＋ lumini</span>}
                  </button>
                  {r.keyName && <span className="pr-key">{r.keyName}</span>}
                </div>
              </div>
              {(reminders.length > 0 || projNote || note) && (
                <div className="pr-extra">
                  {note && <span className="pr-note">✎ {note}</span>}
                  {projNote && <span className="pr-proj">▣ {projNote}</span>}
                  {reminders.map((rem, i) => <span key={i} className={`rem ${rem.severity === "high" ? "hi" : ""}`}>{REM_ICON[rem.icon] || "•"} {rem.text}</span>)}
                </div>
              )}
              {open && <LightsPanel r={r} scenes={scenes} snippets={snippets} canEdit={canEdit} onSave={(patch) => saveItem(r, patch)} onSaveSnippet={saveSnippet} onDelSnippet={delSnippet} />}
            </div>
          );
        })}
      </div>

      <SimFeedback items={data.simFeedback || []} canEdit={canEdit} onSave={saveSim} />

      <style jsx>{`
        .prod { min-width: 0; }
        .prod-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
        .prod-cnt { color: var(--text); font-size: 13px; font-weight: 600; }
        .prod-hint { color: var(--text-faint); font-size: 12px; }
        .prod-list { display: flex; flex-direction: column; gap: 4px; }
        .prod-sec { color: var(--text-faint); font-size: 10.5px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; padding: 14px 2px 5px; }
        .prod-sec:first-child { padding-top: 2px; }
        .prod-row { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 9px; padding: 10px 13px; }
        .prod-row:hover { border-color: var(--border-strong); }
        .pr-main { flex: 1; min-width: 0; }
        .pr-title { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; background: transparent; border: none; padding: 0; color: var(--text); font-size: 14px; font-weight: 600; cursor: ${canEdit ? "text" : "default"}; text-align: left; }
        .pr-title:disabled { cursor: default; }
        .pr-t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pr-orig { color: var(--text-faint); font-size: 11px; flex: none; }
        .pr-edit { width: 100%; background: var(--surface-3); border: 1px solid var(--primary); border-radius: 6px; color: var(--text); font-size: 14px; font-weight: 600; padding: 4px 8px; outline: none; }
        .pr-voices { display: flex; align-items: baseline; gap: 8px; margin-top: 3px; min-width: 0; }
        .pr-lead { color: var(--text-dim); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pr-parts { color: var(--text-faint); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pr-side { display: flex; align-items: center; gap: 8px; flex: none; }
        .pr-key { color: var(--product); border: 1px solid var(--product); border-radius: 5px; font-size: 11.5px; font-weight: 700; padding: 1px 7px; font-variant-numeric: tabular-nums; }
        .dot { width: 11px; height: 11px; border-radius: 50%; border: 1px solid var(--border-strong); flex: none; }
        .lights-btn { display: inline-flex; align-items: center; gap: 5px; background: transparent; border: 1px solid transparent; border-radius: 6px; padding: 3px 7px; cursor: pointer; }
        .lights-btn:hover, .lights-btn.on { border-color: var(--border-strong); background: var(--surface-2); }
        .ls-name { color: var(--text-dim); font-size: 11px; font-weight: 600; }
        .ls-cue { color: var(--text-faint); font-size: 10.5px; }
        .ls-add { color: var(--text-faint); font-size: 11px; }
        .prod-spotify { display: inline-flex; align-items: center; gap: 8px; background: rgba(87,185,138,.1); border: 1px solid rgba(87,185,138,.35); border-radius: 8px; padding: 6px 11px; margin-bottom: 12px; }
        .ps-ico { color: #57b98a; font-size: 13px; }
        .ps-lbl { color: var(--text-dim); font-size: 11.5px; font-weight: 600; }
        .ps-key { color: var(--text); font-size: 13px; font-weight: 700; }
        .ps-rel { color: var(--text-faint); font-size: 11.5px; }
        .prod-actions { margin-left: auto; display: inline-flex; gap: 8px; }
        .prod-share { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; padding: 5px 12px; font-size: 12px; cursor: pointer; }
        .prod-share:hover { color: var(--primary); border-color: var(--primary); }
        .pr-extra { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 4px 2px 13px; }
        .pr-note { color: var(--text-dim); font-size: 11.5px; background: var(--surface-2); border-radius: 5px; padding: 2px 8px; }
        .pr-proj { color: var(--text-dim); font-size: 11.5px; background: var(--surface-2); border-radius: 5px; padding: 2px 8px; }
        .rem { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--text-dim); background: var(--surface-2); border: 1px solid var(--border); border-radius: 5px; padding: 2px 8px; }
        .rem.hi { color: #f0b5b0; background: rgba(229,83,75,.12); border-color: rgba(229,83,75,.4); font-weight: 600; }
        .prod-trans { display: flex; align-items: center; gap: 8px; padding: 3px 13px 3px 20px; }
        .pt-arrow { color: var(--text-faint); font-size: 13px; }
        .pt-lbl { color: var(--text-dim); font-size: 12px; font-style: italic; }
        .pt-key { color: var(--product); font-size: 11px; font-weight: 700; border: 1px solid var(--product); border-radius: 4px; padding: 0 5px; }
        .pt-who { color: var(--text-faint); font-size: 11.5px; }
      `}</style>
    </div>
  );
}

/* Panou producție per item: notă + scenă + fixtures + lumini pe secțiune + proiecție + remindere. */
function LightsPanel({ r, scenes, snippets = [], canEdit, onSave, onSaveSnippet, onDelSnippet }) {
  const [remText, setRemText] = useState("");
  const [remIcon, setRemIcon] = useState("info");
  const [snipOpen, setSnipOpen] = useState(false);
  const [noteVal, setNoteVal] = useState(r.note || "");
  const insertSnippet = (text) => { const next = (noteVal.trim() ? noteVal.trim() + " · " : "") + text; setNoteVal(next); onSave({ note: next }); setSnipOpen(false); };
  const fx = r.fixtures || [];
  const colorOf = (key) => (fx.find((f) => f.fixture === key) || {}).color || "";
  const setFixture = (key, color) => {
    const next = fx.filter((f) => f.fixture !== key);
    if (color) next.push({ fixture: key, color });
    next.sort((a, b) => FIXTURE_ORDER.indexOf(a.fixture) - FIXTURE_ORDER.indexOf(b.fixture));
    onSave({ fixtures: next });
  };
  const applyScene = (s) => onSave({ sceneId: s.id, fixtures: (s.fixtures || []).map((f) => ({ fixture: f.fixture, color: f.color })) });
  const clearScene = () => onSave({ sceneId: "" });

  const sections = uniqSections(r.sequence);
  const cues = r.sectionCues || [];
  const cueFor = (sec) => cues.find((c) => c.section === sec) || null;
  const setCue = (sec, { color, note }) => {
    const existing = cueFor(sec);
    const merged = {
      section: sec,
      lights: color !== undefined ? (color ? [{ color, label: "" }] : []) : (existing?.lights || []),
      note: note !== undefined ? note : (existing?.note || ""),
      projection: existing?.projection || "",
    };
    const next = cues.filter((c) => c.section !== sec);
    if ((merged.lights || []).length || merged.note || merged.projection) next.push(merged);
    onSave({ sectionCues: next });
  };

  const projNote = (r.projection || [])[0]?.note || "";
  const setProjection = (note) => onSave({ projection: note.trim() ? [{ bgRef: "", note: note.trim() }] : [] });
  const reminders = r.reminders || [];
  const addReminder = (rem) => { if (!rem.text || !rem.text.trim()) return; onSave({ reminders: [...reminders, { text: rem.text.trim(), icon: rem.icon || "info", severity: rem.severity || "normal" }] }); };
  const delReminder = (i) => onSave({ reminders: reminders.filter((_, x) => x !== i) });

  return (
    <div className="lp">
      {/* Notă personală + șabloane */}
      <div className="lp-row">
        <span className="lp-lbl">Notă</span>
        <div className="lp-note">
          <input className="note-in" value={noteVal} disabled={!canEdit} placeholder="notă personală pe acest moment…"
            onChange={(e) => setNoteVal(e.target.value)}
            onBlur={() => { if (noteVal !== (r.note || "")) onSave({ note: noteVal }); }} />
          {canEdit && (
            <div className="note-tpl">
              <button className="note-sv" title="Salvează nota ca șablon" disabled={!noteVal.trim()} onClick={() => onSaveSnippet?.(noteVal)}>★</button>
              <button className="note-pick" onClick={() => setSnipOpen((v) => !v)} title="Inserează din șabloane">▾</button>
              {snipOpen && (<>
                <div className="note-back" onClick={() => setSnipOpen(false)} />
                <div className="note-menu">
                  {snippets.length === 0 && <div className="note-none">Niciun șablon. Salvează unul cu ★.</div>}
                  {snippets.map((s) => (
                    <div key={s.id} className="note-it">
                      <button className="note-apply" onClick={() => insertSnippet(s.text)}>{s.text}</button>
                      <button className="note-del" onClick={() => onDelSnippet?.(s.id)} title="Șterge șablonul">✕</button>
                    </div>
                  ))}
                </div>
              </>)}
            </div>
          )}
        </div>
      </div>
      {/* Scene */}
      <div className="lp-row">
        <span className="lp-lbl">Scenă</span>
        <div className="lp-scenes">
          <button className={`sc-chip ${!r.sceneId ? "on" : ""}`} onClick={clearScene} disabled={!canEdit}>Fără</button>
          {scenes.map((s) => (
            <button key={s.id} className={`sc-chip ${String(r.sceneId) === String(s.id) ? "on" : ""}`} onClick={() => applyScene(s)} disabled={!canEdit} title={s.intensityNote}>
              {s.name}
            </button>
          ))}
        </div>
      </div>
      {/* Fixtures */}
      <div className="lp-row">
        <span className="lp-lbl">Lumini</span>
        <div className="lp-fx">
          {FIXTURE_ORDER.map((key) => {
            const c = colorOf(key);
            return (
              <label key={key} className={`fx ${c ? "set" : ""}`} title={FIXTURE_LBL[key]}>
                <span className="fx-sw" style={{ background: c || "transparent" }}>
                  <input type="color" value={c || "#2f81f7"} disabled={!canEdit} onChange={(e) => setFixture(key, e.target.value)} />
                </span>
                <span className="fx-nm">{FIXTURE_LBL[key]}</span>
                {c && canEdit && <span className="fx-x" onClick={(e) => { e.preventDefault(); setFixture(key, ""); }}>✕</span>}
              </label>
            );
          })}
        </div>
      </div>
      {/* Lumini pe secțiune (doar cântece cu structură) */}
      {sections.length > 0 && (
        <div className="lp-row">
          <span className="lp-lbl">Pe secțiune</span>
          <div className="lp-cues">
            {sections.map((sec) => {
              const cue = cueFor(sec);
              const cc = cue?.lights?.[0]?.color || "";
              return (
                <div key={sec} className="cue">
                  <span className="cue-sec">{sec}</span>
                  <label className="cue-sw" style={{ background: cc || "transparent", borderStyle: cc ? "solid" : "dashed" }} title="Culoare la secțiune">
                    <input type="color" value={cc || "#e5534b"} disabled={!canEdit} onChange={(e) => setCue(sec, { color: e.target.value })} />
                  </label>
                  {cc && canEdit && <button className="cue-x" onClick={() => setCue(sec, { color: "" })} title="Scoate">✕</button>}
                  <input className="cue-note" placeholder="notă…" defaultValue={cue?.note || ""} disabled={!canEdit}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== (cue?.note || "")) setCue(sec, { note: v }); }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Proiecție / fundal */}
      <div className="lp-row">
        <span className="lp-lbl">Proiecție</span>
        <input className="lp-proj" defaultValue={projNote} disabled={!canEdit} placeholder="ex. intro negru → fundal pe C1 → coroană pe C2"
          onBlur={(e) => { const v = e.target.value; if (v.trim() !== projNote) setProjection(v); }} />
      </div>
      {/* Remindere (oriunde, cu icon) */}
      <div className="lp-row">
        <span className="lp-lbl">Remindere</span>
        <div className="lp-rem">
          {reminders.map((rem, i) => (
            <span key={i} className={`rchip ${rem.severity === "high" ? "hi" : ""}`}>
              {REM_ICON[rem.icon] || "•"} {rem.text}
              {canEdit && <button className="rchip-x" onClick={() => delReminder(i)} title="Scoate">✕</button>}
            </span>
          ))}
          {canEdit && (
            <div className="rem-add">
              <span className="rem-icons">
                {["stop", "warn", "info"].map((ic) => (
                  <button key={ic} className={`rem-ic ${remIcon === ic ? "on" : ""}`} onClick={() => setRemIcon(ic)} title={ic}>{REM_ICON[ic]}</button>
                ))}
              </span>
              <input className="rem-in" value={remText} placeholder="reminder…" onChange={(e) => setRemText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { addReminder({ text: remText, icon: remIcon, severity: remIcon === "stop" ? "high" : "normal" }); setRemText(""); } }} />
              <button className="rem-go" onClick={() => { addReminder({ text: remText, icon: remIcon, severity: remIcon === "stop" ? "high" : "normal" }); setRemText(""); }}>+</button>
            </div>
          )}
          {canEdit && (
            <div className="rem-presets">
              {REM_PRESETS.map((p) => <button key={p.text} className="rem-pre" onClick={() => addReminder(p)}>{REM_ICON[p.icon]} {p.text}</button>)}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .lp { background: var(--surface-2); border: 1px solid var(--border); border-top: none; border-radius: 0 0 9px 9px; margin-top: -5px; padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 12px; }
        .lp-proj { width: 100%; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 12.5px; padding: 6px 10px; outline: none; }
        .lp-proj:focus { border-color: var(--primary); }
        .lp-rem { display: flex; flex-direction: column; gap: 8px; }
        .rchip { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; font-size: 12px; color: var(--text-dim); background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 6px; padding: 3px 8px; }
        .rchip.hi { color: #f0b5b0; background: rgba(229,83,75,.12); border-color: rgba(229,83,75,.4); font-weight: 600; }
        .rchip-x { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 10px; margin-left: 2px; }
        .rchip-x:hover { color: var(--danger); }
        .rem-add { display: flex; align-items: center; gap: 6px; }
        .rem-icons { display: inline-flex; gap: 2px; }
        .rem-ic { background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 6px; padding: 3px 6px; cursor: pointer; font-size: 12px; filter: grayscale(.6); opacity: .7; }
        .rem-ic.on { filter: none; opacity: 1; border-color: var(--primary); }
        .rem-in { flex: 1; min-width: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 12.5px; padding: 6px 10px; outline: none; }
        .rem-in:focus { border-color: var(--primary); }
        .rem-go { background: transparent; border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text-dim); width: 30px; height: 30px; cursor: pointer; font-size: 15px; }
        .rem-go:hover { color: var(--primary); border-color: var(--primary); }
        .rem-presets { display: flex; flex-wrap: wrap; gap: 6px; }
        .rem-pre { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 6px; padding: 3px 9px; font-size: 11.5px; cursor: pointer; }
        .rem-pre:hover { color: var(--primary); border-color: var(--primary); }
        .lp-note { position: relative; display: flex; gap: 6px; }
        .note-in { flex: 1; min-width: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 12.5px; padding: 6px 10px; outline: none; }
        .note-in:focus { border-color: var(--primary); }
        .note-tpl { position: relative; display: flex; gap: 4px; flex: none; }
        .note-sv, .note-pick { background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 6px; color: var(--text-dim); width: 30px; cursor: pointer; font-size: 13px; }
        .note-sv:disabled { opacity: .4; cursor: default; }
        .note-sv:hover:not(:disabled) { color: #f0d94d; }
        .note-pick:hover { color: var(--primary); }
        .note-back { position: fixed; inset: 0; z-index: 6; }
        .note-menu { position: absolute; z-index: 8; top: 34px; right: 0; width: 240px; max-height: 220px; overflow: auto; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 9px; box-shadow: 0 12px 34px rgba(0,0,0,.45); padding: 6px; }
        .note-none { color: var(--text-faint); font-size: 12px; padding: 8px; }
        .note-it { display: flex; align-items: center; gap: 4px; }
        .note-apply { flex: 1; text-align: left; background: transparent; border: none; color: var(--text); font-size: 12.5px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
        .note-apply:hover { background: var(--surface-2); }
        .note-del { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 11px; }
        .note-del:hover { color: var(--danger); }
        .lp-row { display: grid; grid-template-columns: 78px 1fr; gap: 10px; align-items: start; }
        .lp-lbl { color: var(--text-faint); font-size: 10.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; padding-top: 6px; }
        .lp-scenes { display: flex; flex-wrap: wrap; gap: 6px; }
        .sc-chip { background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 999px; padding: 4px 11px; font-size: 12px; cursor: pointer; }
        .sc-chip:hover { color: var(--text); }
        .sc-chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
        .sc-chip:disabled { cursor: default; opacity: .7; }
        .lp-fx { display: flex; flex-wrap: wrap; gap: 8px; }
        .fx { position: relative; display: inline-flex; align-items: center; gap: 6px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; padding: 4px 8px 4px 5px; cursor: pointer; }
        .fx-sw { position: relative; width: 22px; height: 22px; border-radius: 5px; border: 1px solid var(--border-strong); overflow: hidden; flex: none; }
        .fx-sw input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .fx-nm { color: var(--text-dim); font-size: 12px; }
        .fx.set .fx-nm { color: var(--text); }
        .fx-x { color: var(--text-faint); font-size: 10px; margin-left: 2px; }
        .fx-x:hover { color: var(--danger); }
        .lp-cues { display: flex; flex-direction: column; gap: 6px; }
        .cue { display: flex; align-items: center; gap: 8px; }
        .cue-sec { color: var(--text-dim); font-size: 12px; min-width: 70px; }
        .cue-sw { position: relative; width: 22px; height: 22px; border-radius: 5px; border: 1px solid var(--border-strong); overflow: hidden; flex: none; cursor: pointer; }
        .cue-sw input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .cue-x { background: transparent; border: none; color: var(--text-faint); font-size: 10px; cursor: pointer; }
        .cue-x:hover { color: var(--danger); }
        .cue-note { flex: 1; min-width: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 6px; color: var(--text); font-size: 12px; padding: 4px 8px; outline: none; }
        .cue-note:focus { border-color: var(--primary); }
      `}</style>
    </div>
  );
}

/* Dialog partajare: copiază foaia MEA de producție de pe acest plan la alt producător. */
function ShareDialog({ planId, onClose, flash }) {
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);
  useEffect(() => { plansApi.productionProducers(planId).then((r) => setPeople(r.producers || [])).catch(() => {}); }, [planId]);
  const filtered = people.filter((p) => (p.name || "").toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  async function doShare(p) {
    if (typeof window !== "undefined" && !window.confirm(`Trimiți copia foii tale de producție lui ${p.name}?\nÎi suprascrie foaia lui pe acest plan (nu atinge Order-ul).`)) return;
    setBusy(p.id);
    try { await plansApi.shareProduction(planId, p.id); flash?.(`Foaie trimisă lui ${p.name}.`); onClose(); }
    catch (e) { flash?.(e?.message || "Eroare la partajare."); setBusy(null); }
  }
  return (
    <div className="sd-back" onClick={onClose}>
      <div className="sd" onClick={(e) => e.stopPropagation()}>
        <div className="sd-h">Partajează foaia de producție</div>
        <div className="sd-sub">Copia foii tale (lumini, note, remindere) ajunge la producătorul ales, ca punct de start.</div>
        <input className="sd-q" autoFocus placeholder="caută producător…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="sd-list">
          {filtered.map((p) => (
            <button key={p.id} className="sd-p" disabled={!!busy} onClick={() => doShare(p)}>
              <span className="sd-av">{p.initials}</span>
              <span className="sd-nm">{p.name}</span>
              {String(busy) === String(p.id) && <span className="sd-busy">…</span>}
            </button>
          ))}
          {filtered.length === 0 && <div className="sd-none">Niciun producător găsit.</div>}
        </div>
      </div>
      <style jsx>{`
        .sd-back { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .sd { width: 420px; max-width: 100%; max-height: 80vh; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 14px; padding: 18px 18px 14px; }
        .sd-h { color: var(--text); font-size: 16px; font-weight: 700; }
        .sd-sub { color: var(--text-faint); font-size: 12.5px; margin: 4px 0 12px; line-height: 1.5; }
        .sd-q { background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; color: var(--text); font-size: 13px; padding: 8px 11px; outline: none; margin-bottom: 10px; }
        .sd-q:focus { border-color: var(--primary); }
        .sd-list { overflow: auto; display: flex; flex-direction: column; gap: 2px; }
        .sd-p { display: flex; align-items: center; gap: 10px; background: transparent; border: none; color: var(--text); padding: 8px 9px; border-radius: 8px; cursor: pointer; text-align: left; }
        .sd-p:hover:not(:disabled) { background: var(--surface-2); }
        .sd-p:disabled { opacity: .5; cursor: default; }
        .sd-av { flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .sd-nm { flex: 1; font-size: 13.5px; }
        .sd-busy { color: var(--text-faint); }
        .sd-none { color: var(--text-faint); font-size: 12.5px; padding: 12px; text-align: center; }
      `}</style>
    </div>
  );
}

/* Feedback între programe (SIM1/SIM2) — checklist roșu, jos. Bifabil. */
function SimFeedback({ items, canEdit, onSave }) {
  const [text, setText] = useState("");
  const [sim, setSim] = useState("2");
  if (!canEdit && items.length === 0) return null;
  const add = () => { const t = text.trim(); if (!t) return; onSave([...items, { text: t, sim, severity: "high", done: false, createdAt: Date.now() }]); setText(""); };
  const toggle = (i) => canEdit && onSave(items.map((it, x) => (x === i ? { ...it, done: !it.done } : it)));
  const del = (i) => onSave(items.filter((_, x) => x !== i));
  return (
    <div className="sf">
      <div className="sf-h">Feedback între programe (SIM)</div>
      <div className="sf-list">
        {items.map((it, i) => (
          <div key={i} className={`sf-it ${it.done ? "done" : ""}`}>
            <button className="sf-ck" onClick={() => toggle(i)} title="Bifează">{it.done ? "☑" : "☐"}</button>
            {it.sim && <span className="sf-sim">SIM{it.sim}</span>}
            <span className="sf-txt">{it.text}</span>
            {canEdit && <button className="sf-x" onClick={() => del(i)} title="Șterge">✕</button>}
          </div>
        ))}
        {items.length === 0 && <div className="sf-none">Nimic de verificat încă.</div>}
      </div>
      {canEdit && (
        <div className="sf-add">
          <span className="sf-simsel">
            {["1", "2"].map((s) => <button key={s} className={`sf-sb ${sim === s ? "on" : ""}`} onClick={() => setSim(s)}>SIM{s}</button>)}
          </span>
          <input className="sf-in" value={text} placeholder="ex. verifică mic kick la SIM2…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="sf-go" onClick={add}>+</button>
        </div>
      )}
      <style jsx>{`
        .sf { margin-top: 22px; border-top: 2px solid rgba(229,83,75,.5); padding-top: 12px; }
        .sf-h { color: #e5534b; font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 8px; }
        .sf-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
        .sf-it { display: flex; align-items: center; gap: 8px; background: rgba(229,83,75,.07); border: 1px solid rgba(229,83,75,.25); border-radius: 7px; padding: 6px 10px; }
        .sf-it.done { opacity: .55; }
        .sf-it.done .sf-txt { text-decoration: line-through; }
        .sf-ck { background: transparent; border: none; color: #e5534b; cursor: ${canEdit ? "pointer" : "default"}; font-size: 15px; line-height: 1; padding: 0; }
        .sf-sim { flex: none; color: #e5534b; border: 1px solid rgba(229,83,75,.5); border-radius: 4px; font-size: 10px; font-weight: 700; padding: 1px 5px; }
        .sf-txt { flex: 1; color: var(--text); font-size: 13px; }
        .sf-x { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 11px; }
        .sf-x:hover { color: var(--danger); }
        .sf-none { color: var(--text-faint); font-size: 12.5px; }
        .sf-add { display: flex; align-items: center; gap: 7px; }
        .sf-simsel { display: inline-flex; border: 1px solid var(--border-strong); border-radius: 7px; overflow: hidden; flex: none; }
        .sf-sb { background: transparent; border: none; color: var(--text-faint); font-size: 10.5px; font-weight: 700; padding: 6px 9px; cursor: pointer; }
        .sf-sb.on { background: #e5534b; color: #fff; }
        .sf-in { flex: 1; min-width: 0; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 12.5px; padding: 7px 10px; outline: none; }
        .sf-in:focus { border-color: var(--primary); }
        .sf-go { background: transparent; border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text-dim); width: 32px; height: 32px; cursor: pointer; font-size: 15px; }
        .sf-go:hover { color: var(--primary); border-color: var(--primary); }
      `}</style>
    </div>
  );
}

/* ── Times (editabil) — zi 3 litere RO + culoare, 24h; click pe rând = editează ── */
function TimesTab({ data, canEdit, onEditTime, onAddTime, onApplyTemplate }) {
  if (!data) return <Skeleton lines={3} />;
  const blocks = [["Slujire", "service", data.service || []], ["Repetiții", "rehearsal", data.rehearsal || []], ["Alte ore", "other", data.other || []]];
  const any = blocks.some(([, , l]) => l.length);
  const hasTpl = !!(data.rehearsalTemplate && data.rehearsalTemplate.enabled);
  if (!any && !canEdit) return <div className="muted">Nicio oră setată.</div>;
  return (
    <div className="times">
      {blocks.map(([label, type, list]) => (
        (list.length || canEdit) ? (
          <div key={type} className="tblock">
            <div className="tb-label">{label}{canEdit && <button className="tb-add" title="Adaugă oră" onClick={() => onAddTime(type)}>+</button>}</div>
            {list.map((t) => (
              <button key={t.id} className="tcard" onClick={() => canEdit && onEditTime(t)} disabled={!canEdit}>
                <div className="tc-top">
                  <span className="tw" style={{ background: t.weekdayColor || "#2f81f7" }}>{t.weekday}</span>
                  <span className="tc-time">{t.range || "—:—"}</span>
                  <span className="tc-date">{t.date}</span>
                </div>
                {t.name ? <div className="tc-name">{t.name}</div> : null}
              </button>
            ))}
            {!list.length && canEdit && (
              <div className="tb-empties">
                <button className="tb-empty" onClick={() => onAddTime(type)}>+ setează</button>
                {type === "rehearsal" && hasTpl && <button className="tb-empty tpl" onClick={() => onApplyTemplate?.()}>↺ din template</button>}
              </div>
            )}
          </div>
        ) : null
      ))}
      <style jsx>{`
        .tblock { margin-bottom: 14px; } .tblock:last-child { margin-bottom: 0; }
        .tb-label { display: flex; align-items: center; justify-content: space-between; color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; margin-bottom: 4px; text-transform: uppercase; }
        .tb-add { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 15px; line-height: 1; padding: 0 2px; }
        .tb-add:hover { color: var(--primary); }
        .tcard { display: flex; flex-direction: column; gap: 5px; width: 100%; text-align: left; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 11px; margin-bottom: 7px; cursor: ${canEdit ? "pointer" : "default"}; transition: border-color .14s ease, transform .14s ease; }
        .tcard:last-child { margin-bottom: 0; }
        .tcard:hover:not(:disabled) { border-color: var(--border-strong); transform: translateY(-1px); }
        .tc-top { display: flex; align-items: center; gap: 8px; }
        .tw { color: #0b1016; font-weight: 800; flex: none; font-size: 9.5px; letter-spacing: .3px; border-radius: 5px; padding: 2px 6px; }
        .tc-time { color: var(--text); font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .tc-date { margin-left: auto; flex: none; color: var(--text-dim); font-size: 12px; font-variant-numeric: tabular-nums; }
        .tc-name { color: var(--text-dim); font-size: 12.5px; line-height: 1.45; }
        .tb-empties { display: flex; gap: 6px; }
        .tb-empty { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 6px; padding: 5px 10px; font-size: 11.5px; cursor: pointer; flex: 1; }
        .tb-empty:hover { color: var(--primary); border-color: var(--primary); }
        .tb-empty.tpl:hover { color: var(--product); border-color: var(--product); }
      `}</style>
    </div>
  );
}

/* ── Notes ── */
function NotesTab({ data }) {
  if (!data) return <Skeleton lines={3} />;
  const notes = data.notes || [];
  if (!notes.length) return <div className="muted">Nicio notă.</div>;
  return (
    <div className="notes">
      {notes.map((n) => (
        <div key={n.id} className="note">
          <div className="n-cat">{n.category || "General"}</div>
          <div className="n-body">{n.content}</div>
        </div>
      ))}
      <style jsx>{`
        .note { margin-bottom: 16px; max-width: 760px; }
        .n-cat { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
        .n-body { color: var(--text); font-size: 14px; line-height: 1.6; white-space: pre-wrap; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
      `}</style>
    </div>
  );
}

/* ── Files ── */
function FilesTab({ data }) {
  if (!data) return <Skeleton lines={3} />;
  const groups = data.groups || [];
  if (!groups.length) return <div className="muted">Nu există fișiere pentru acest plan.</div>;
  return (
    <div className="files">
      {groups.map((g, gi) => (
        <div key={gi} className="fgroup">
          <div className="fg-label">{g.label}</div>
          {(g.files || []).map((f) => (
            f.url ? <a key={f.id} className="file" href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
              : <span key={f.id} className="file nolink">{f.name}</span>
          ))}
        </div>
      ))}
      <style jsx>{`
        .fgroup { margin-bottom: 16px; }
        .fg-label { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
        .file { display: block; color: var(--text-link); font-size: 13.5px; padding: 7px 0; border-bottom: 1px solid var(--border-soft); text-decoration: none; max-width: 760px; }
        .file:hover { text-decoration: underline; }
        .file.nolink { color: var(--text-faint); }
      `}</style>
    </div>
  );
}
