"use client";
/**
 * Detaliu plan — ecranul „Plan" din PCO. /api/pc/v1/plans/:id. LĂȚIME COMPLETĂ.
 * Stânga: Times + Files + Notes (sticky). Dreapta: tab-uri Order / Teams / Rehearse / Notes / Files.
 * Tab-ul TEAMS e INTERACTIV și 100% ca în PCO: echipele = COLOANE (carusel orizontal),
 * fiecare poziție = rând (avatar + badge status), „Needed" (−/N/+), click pe poziție →
 * aceeași bară GLOBALĂ de asignare (AssignSidebar) ca în Matrix; click pe persoană → EditPersonModal.
 * UX seamless: update OPTIMIST + reconciliere silențioasă. ZERO emailuri trimise de aici.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { plansApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import PersonAvatar from "@/components/plans/PersonAvatar";
import AssignSidebar from "@/components/plans/AssignSidebar";
import EditPersonModal from "@/components/plans/EditPersonModal";

const TABS = ["Order", "Teams"]; // Times/Files/Notes mutate în sidebar-ul STÂNGA (ca în PCO)

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
  const [tab, setTab] = useState("Teams");
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

  // meniu 3-puncte (rename / print / copy link)
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState("");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

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

  // sidebar-ul STÂNGA (Times/Files/Notes) se încarcă din start, nu la click pe tab
  useEffect(() => {
    ["Times", "Notes", "Files"].forEach((k) => {
      const fn = { Times: plansApi.times, Notes: plansApi.notes, Files: plansApi.files }[k];
      fn(id).then((r) => setData((d) => ({ ...d, [k]: r }))).catch(() => {});
    });
  }, [id]);

  useEffect(() => {
    if (data[tab]) return;
    const fn = { Order: plansApi.order, Teams: plansApi.teams }[tab];
    if (!fn) return;
    fn(id).then((r) => setData((d) => ({ ...d, [tab]: r }))).catch((e) => setErr(e?.message || "Eroare."));
  }, [tab, id, data]);

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

  async function assignPerson(p, mirror) {
    if (!sel) return;
    setAssigning(true);
    const push = (g, tid) => ({ ...g, needed: Math.max(0, (g.needed || 0) - 1), people: [...g.people, { personId: p.id, assignmentId: tid, name: p.name, avatar: p.avatar, initials: p.initials, status: "unconfirmed" }] });
    patchGroup(sel.teamId, sel.positionId, (g) => push(g, `tmp-a-${Date.now()}`));
    const doMirror = mirror && pereche;
    if (doMirror) patchGroup(pereche.teamId, pereche.positionId, (g) => push(g, `tmp-b-${Date.now()}`));
    try {
      await plansApi.assign(id, { personId: p.id, teamId: sel.teamId, positionId: sel.positionId, status: "unconfirmed" });
      if (doMirror) await plansApi.assign(id, { personId: p.id, teamId: pereche.teamId, positionId: pereche.positionId, status: "unconfirmed" });
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
  async function saveEdit({ status, notes }) {
    if (!editing) return;
    patchGroup(editing.teamId, editing.positionId, (g) => ({ ...g, people: g.people.map((x) => String(x.assignmentId) === String(editing.assignmentId) ? { ...x, status } : x) }));
    setEditing(null);
    try { await plansApi.updateAssignment(id, editing.assignmentId, { status, notes }); flash("Salvat (fără email)."); reconcileTeams(); }
    catch (e) { flash(e?.message || "Eroare."); reconcileTeams(); }
  }
  async function saveRules(positionId, payload) {
    try { await plansApi.setPositionRules(positionId, payload); flash("Reguli poziție salvate."); refreshRec(); }
    catch (e) { flash(e?.message || "Eroare."); }
  }
  async function changeNeeded(teamId, positionId, nextCount) {
    const n = Math.max(0, nextCount);
    patchGroup(teamId, positionId, (g) => ({ ...g, needed: n }));
    try { await plansApi.setNeeded(id, teamId, positionId, n); reconcileTeams(); }
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
    <div className={`pd pc-full ${sel ? "has-side" : ""}`}>
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
          <button className="mx" onClick={() => head && router.push(`/plans/matrix/${head.serviceTypeId || ""}`)}>Matrix ▾</button>
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
            <div className="lcard">
              <div className="lc-h">Rolul meu</div>
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
          )}
          <div className="lcard"><div className="lc-h">Times</div><TimesTab data={data.Times} /></div>
          <div className="lcard"><div className="lc-h">Files</div><FilesTab data={data.Files} /></div>
          <div className="lcard"><div className="lc-h">Notes <span className="lc-tag">doar admin</span></div><NotesTab data={data.Notes} /></div>
        </aside>

        {/* ── principal: Order / Teams ── */}
        <div className="pd-main">
          <div className="tabs">
            {TABS.map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
          </div>
          {err && <div className="err">{err}</div>}
          {loading ? <div className="empty">Se încarcă…</div> : (
            <div className="body">
              {tab === "Order" && <OrderTab data={cur} />}
              {tab === "Teams" && <TeamsTab data={cur} sel={sel} onOpenCell={openCell}
                onEdit={(pp, g, t) => setEditing({ planId: id, teamId: t.teamId, positionId: g.positionId, assignmentId: pp.assignmentId, name: pp.name, avatar: pp.avatar, initials: pp.initials, status: pp.status, teamName: t.name, positionName: g.positionName })}
                onRemove={removePerson} onNeeded={changeNeeded} />}
            </div>
          )}
        </div>
      </div>

      <AssignSidebar
        open={!!sel} title={sel?.positionName || ""} neededCount={rec?.neededCount || 0}
        loading={recBusy} groups={rec?.groups || []} alreadyHere={rec?.alreadyHere || []}
        query={recQuery} onQuery={setRecQuery} onPick={assignPerson} onClose={() => { setSel(null); setRec(null); }} assigning={assigning}
        mirror={pereche ? { available: true, label: `Adaugă și la ${pereche.teamName}` } : null}
        onAddGuest={addGuest}
        defaults={rec?.defaults} positionId={sel?.positionId} onSaveRules={saveRules} instructions={rec?.instructions}
      />
      {editing && (
        <EditPersonModal person={editing} onClose={() => setEditing(null)} onSave={saveEdit}
          onRemove={() => { removePerson(editing.teamId, editing.positionId, editing.assignmentId); setEditing(null); }} />
      )}
      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .pd { padding: 18px 20px 80px; transition: padding-right .16s ease; }
        .pd.has-side { padding-right: 360px; }
        .top { display: flex; align-items: flex-start; gap: 10px; }
        .back { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 6px; margin-top: 4px; }
        .back:hover { color: var(--text); }
        .titles { flex: 1; }
        .st { color: var(--text-faint); font-size: 12px; }
        .title { font-size: 22px; font-weight: 600; margin: 2px 0 0; }
        .pd-layout { display: grid; grid-template-columns: 280px 1fr; gap: 22px; align-items: start; margin-top: 16px; }
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
        .tabs { display: flex; gap: 8px; margin: 16px 0; border-bottom: 1px solid var(--border); }
        .tab { background: transparent; border: none; color: var(--text-dim); padding: 9px 4px; margin-right: 10px; cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .tab:hover { color: var(--text); }
        .tab.active { color: var(--text); border-bottom-color: var(--primary); font-weight: 600; }
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

/* ── Order ── */
function OrderTab({ data }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
  const items = data.items || [];
  if (!items.length) return <div className="muted">Niciun item în ordinea serviciului.</div>;
  return (
    <div className="order">
      {items.map((it) => (
        <div key={it.id} className={`item ${it.type === "header" ? "hdr" : ""}`} style={{ borderLeftColor: it.rowColor || "transparent" }}>
          <div className="it-main">
            <span className="it-title">{it.title}</span>
            {it.keyName ? <span className="it-key">{it.keyName}</span> : null}
          </div>
          <div className="it-right">
            {(it.leaders || []).map((l, i) => <span key={i} className="it-leader">{l.name || l.positionName}{l.needed ? " (needed)" : ""}</span>)}
            {it.lengthLabel ? <span className="it-len">{it.lengthLabel}</span> : null}
          </div>
          <style jsx>{`
            .item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px; border-left: 3px solid transparent; border-bottom: 1px solid var(--border-soft); }
            .item.hdr { background: var(--section-head-bg); }
            .it-title { color: var(--text); font-size: 14px; }
            .item.hdr .it-title { font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: .5px; }
            .it-key { margin-left: 8px; color: var(--product); font-size: 12px; border: 1px solid var(--product); border-radius: 4px; padding: 0 6px; }
            .it-right { display: flex; align-items: center; gap: 12px; color: var(--text-faint); font-size: 12px; }
            .it-leader { color: var(--text-dim); }
          `}</style>
        </div>
      ))}
    </div>
  );
}

/* icon status standalone pt. header-ul echipei (aceleași ca badge-ul de pe avatar) */
function CountIcon({ s }) {
  const c = s === "confirmed" ? "#57b98a" : s === "unconfirmed" ? "#c9a227" : "#e5534b";
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" style={{ flex: "none" }}>
      <circle cx="8" cy="8" r="8" fill={c} />
      {s === "confirmed" && <path d="M4.5 8.2l2.2 2.2 4.8-4.8" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />}
      {s === "unconfirmed" && <text x="8" y="11.6" textAnchor="middle" fontSize="10" fill="#1d1600" fontWeight="800">?</text>}
      {s === "declined" && <path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />}
    </svg>
  );
}

/* ── Teams (interactiv) ── echipele = coloane în carusel orizontal ── */
function TeamCol({ t, sel, onOpenCell, onEdit, onRemove, onNeeded }) {
  return (
    <div className="tcol">
      <div className="tc-head">
        <div className="tc-name">{t.name}</div>
        <div className="tc-counts">
          <span className="cnt ok" title="Confirmați"><CountIcon s="confirmed" />{t.counts?.confirmed || 0}</span>
          <span className="cnt un" title="În așteptare"><CountIcon s="unconfirmed" />{t.counts?.unconfirmed || 0}</span>
          <span className="cnt no" title="Refuzați"><CountIcon s="declined" />{t.counts?.declined || 0}</span>
        </div>
      </div>
      {(t.groups || []).map((g, gi) => {
        const isSel = sel && String(sel.teamId) === String(t.teamId) && String(sel.positionId) === String(g.positionId);
        return (
          <div key={g.positionId || gi} className={`pos ${isSel ? "sel" : ""}`}>
            <div className="pos-name" onClick={() => onOpenCell(t.teamId, g.positionId, g.positionName || "Poziție", t.name)} title="Asignează pe această poziție">{g.positionName || "—"}</div>
            {(g.people || []).map((p, pi) => (
              <div key={p.assignmentId || pi} className="pers" onClick={() => onEdit(p, g, t)} title={`${p.name} — click: editează status`}>
                <PersonAvatar person={p} status={p.status} size={24} />
                <span className={`pn ${p.status === "declined" ? "decl" : ""}`}>{p.name}</span>
                {p.isGuest && <span className="gtag">invitat</span>}
                <button className="psch" title="Replanifică — deschide bara" onClick={(e) => { e.stopPropagation(); onOpenCell(t.teamId, g.positionId, g.positionName || "Poziție", t.name); }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></svg>
                </button>
                <button className="prm" title="Șterge" onClick={(e) => { e.stopPropagation(); onRemove(t.teamId, g.positionId, p.assignmentId); }}>×</button>
              </div>
            ))}
            {g.needed > 0 && (
              <div className="needctl">
                <button onClick={() => onNeeded(t.teamId, g.positionId, g.needed - 1)}>−</button>
                <span className="needn">{g.needed} Needed</span>
                <button onClick={() => onNeeded(t.teamId, g.positionId, g.needed + 1)}>+</button>
              </div>
            )}
            {g.needed === 0 && (!g.people || !g.people.length) && (
              <button className="needadd" onClick={() => onNeeded(t.teamId, g.positionId, 1)}>+ Needed</button>
            )}
          </div>
        );
      })}
      {(!t.groups || !t.groups.length) && <div className="pos-empty">Nicio poziție.</div>}
      <style jsx>{`
        .tcol { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 0 0 6px; width: 262px; flex: none; }
        .tc-head { display: flex; flex-direction: column; align-items: flex-start; gap: 9px; padding: 13px 14px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); border-radius: 10px 10px 0 0; z-index: 1; }
        .tc-name { color: var(--text); font-weight: 600; font-size: 14.5px; }
        .tc-counts { display: flex; gap: 16px; }
        .cnt { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; }
        .cnt.ok { color: var(--product); } .cnt.no { color: var(--danger); } .cnt.un { color: var(--st-unconfirmed); }
        .pos { padding: 0 0 2px; }
        .pos.sel { background: rgba(47,129,247,.07); }
        .pos-name { color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; padding: 12px 14px 8px; background: var(--section-head-bg); cursor: pointer; }
        .pos-name:hover { color: var(--text); }
        .pers { display: flex; align-items: center; gap: 9px; padding: 6px 14px; cursor: pointer; }
        .pers:hover { background: rgba(255,255,255,.05); }
        .pn { color: var(--text); font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pn.decl { text-decoration: line-through; opacity: .6; }
        .gtag { flex: none; font-size: 9px; color: var(--product); border: 1px solid rgba(87,185,138,.5); border-radius: 10px; padding: 0 5px; text-transform: uppercase; }
        .prm, .psch { opacity: 0; background: transparent; border: none; color: var(--text-faint); cursor: pointer; line-height: 1; padding: 0 2px; flex: none; display: inline-flex; align-items: center; }
        .prm { font-size: 15px; }
        .pers:hover .prm, .pers:hover .psch { opacity: 1; } .prm:hover { color: var(--danger); } .psch:hover { color: var(--product); }
        .needctl { display: inline-flex; align-items: center; gap: 5px; margin: 2px 14px; }
        .needn { color: #e0a93c; font-size: 11.5px; font-weight: 600; }
        .needctl button { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 4px; cursor: pointer; width: 18px; height: 18px; line-height: 1; font-size: 13px; }
        .needctl button:hover { color: var(--text); }
        .needadd { margin: 2px 14px; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 5px; cursor: pointer; font-size: 11px; padding: 3px 10px; }
        .needadd:hover { color: var(--primary); border-color: var(--primary); }
        .pos-empty { color: var(--text-faint); font-size: 12px; padding: 10px 14px; }
      `}</style>
    </div>
  );
}
function TeamsTab({ data, sel, onOpenCell, onEdit, onRemove, onNeeded }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
  const my = data.myTeams || [], other = data.otherTeams || [];
  if (!my.length && !other.length) return <div className="muted">Nicio echipă pe acest plan.</div>;
  const props = { sel, onOpenCell, onEdit, onRemove, onNeeded };
  return (
    <div className="teams">
      {my.length > 0 && <><div className="grp-label">MY TEAMS</div><div className="carousel">{my.map((t) => <TeamCol key={t.teamId} t={t} {...props} />)}</div></>}
      {other.length > 0 && <><div className="grp-label">OTHER TEAMS</div><div className="carousel">{other.map((t) => <TeamCol key={t.teamId} t={t} {...props} />)}</div></>}
      <style jsx>{`
        .grp-label { color: var(--text-faint); font-size: 11px; letter-spacing: .5px; margin: 6px 0 10px; }
        .carousel { display: flex; flex-wrap: nowrap; gap: 14px; margin-bottom: 24px; align-items: flex-start; overflow-x: auto; padding-bottom: 8px; scrollbar-width: auto; }
        .carousel::-webkit-scrollbar { height: 18px; }
        .carousel::-webkit-scrollbar-thumb { background: #39434f; border-radius: 9px; border: 4px solid transparent; background-clip: content-box; }
        .carousel::-webkit-scrollbar-thumb:hover { background: #4a5663; background-clip: content-box; }
      `}</style>
    </div>
  );
}

/* ── Times ── */
function TimesTab({ data }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
  const blocks = [["Service", data.service], ["Rehearsal", data.rehearsal], ["Other", data.other]].filter(([, v]) => v && v.length);
  if (!blocks.length) return <div className="muted">Nicio oră setată.</div>;
  return (
    <div className="times">
      {blocks.map(([label, list]) => (
        <div key={label} className="tblock">
          <div className="tb-label">{label}</div>
          {list.map((t) => (
            <div key={t.id} className="trow"><span className="tw">{t.weekday}</span><span className="tr">{t.range}</span><span className="td">{t.date}</span>{t.name ? <span className="tn">{t.name}</span> : null}</div>
          ))}
        </div>
      ))}
      <style jsx>{`
        .tblock { margin-bottom: 18px; }
        .tb-label { color: var(--text-faint); font-size: 11px; letter-spacing: .5px; margin-bottom: 8px; text-transform: uppercase; }
        .trow { display: flex; align-items: center; gap: 14px; padding: 8px 0; border-bottom: 1px solid var(--border-soft); font-size: 13.5px; }
        .tw { color: var(--product); font-weight: 600; width: 40px; } .tr { color: var(--text); } .td { color: var(--text-dim); } .tn { color: var(--text-faint); }
      `}</style>
    </div>
  );
}

/* ── Notes ── */
function NotesTab({ data }) {
  if (!data) return <div className="muted">Se încarcă…</div>;
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
  if (!data) return <div className="muted">Se încarcă…</div>;
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
