"use client";
/**
 * Pagina Plans — tab-ul „Plans" din PCO Services, 1:1 cu screenshot-urile.
 * Layout: stânga = mini-calendar lunar (puncte pe zilele cu planuri) + programul pe zile;
 * dreapta = „Service Types" — secțiuni colapsabile, fiecare cu tabel (Upcoming | TITLE | LAST UPDATED)
 * de date-planuri + „Add plan" + dropdown „Matrix". Date REALE din /api/pc/v1/plans.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { plansApi } from "@/lib/api/client";
import { getStoredUser } from "@/lib/auth/auth";
import { useAiSurface } from "@/lib/ai/useAiSurface";

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const WD = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "Sâ"];
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };

export default function PlansPage() {
  const router = useRouter();
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set()); // service types colapsate
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selDay, setSelDay] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });

  const orgName = useMemo(() => getStoredUser()?.org?.name || "Vertical București", []);

  const load = useCallback(async () => {
    try { const r = await plansApi.list(); setServiceTypes(r.serviceTypes || []); }
    catch (e) { setErr(e?.message || "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // toate planurile aplatizate (pt. calendar + program pe zi)
  const allPlans = useMemo(() => {
    const out = [];
    serviceTypes.forEach((st) => (st.plans || []).forEach((p) => p.sortDate && out.push({ ...p, stId: st.id, stName: st.name })));
    return out;
  }, [serviceTypes]);
  const plansByDay = useMemo(() => {
    const m = {};
    allPlans.forEach((p) => { const k = dayKey(p.sortDate); (m[k] = m[k] || []).push(p); });
    return m;
  }, [allPlans]);

  const todayKey = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const splitPlans = useCallback((plans = []) => {
    const up = [], past = [];
    for (const p of plans) ((p.sortDate ? new Date(p.sortDate).getTime() : 0) >= todayKey ? up : past).push(p);
    return { upcoming: up, past: past.reverse() };
  }, [todayKey]);

  // grila calendarului lunii curente
  const calCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay()); // începe duminica
    const cells = [];
    for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
    return cells;
  }, [month]);

  const toggle = (id) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const dayPlans = plansByDay[dayKey(selDay)] || [];

  useAiSurface({
    id: "plans.list",
    label: "Plans — Service Types",
    scope: "page",
    getContext: () => ({ serviceTypes: serviceTypes.map((s) => ({ id: s.id, name: s.name, plans: s.plans?.length || 0 })) }),
    actions: [
      { id: "openMatrix", label: "Deschide Matrix", params: { id: "string" }, run: ({ id }) => router.push(`/plans/matrix/${id}`) },
      { id: "openPlan", label: "Deschide un plan", params: { id: "string" }, run: ({ id }) => router.push(`/plans/${id}`) },
    ],
  }, [serviceTypes]);

  return (
    <div className="plans">
      <div className="phead">
        <h1 className="org-title">{orgName}</h1>
        <div className="matrix-pick">
          <button className="btn-matrix-top">Matrix <span className="caret">▾</span></button>
          <div className="matrix-menu">
            {serviceTypes.map((st) => (
              <button key={st.id} onClick={() => router.push(`/plans/matrix/${st.id}`)}>{st.name}</button>
            ))}
          </div>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      <div className="layout">
        {/* ── stânga: calendar + program ── */}
        <aside className="side">
          <div className="cal">
            <div className="cal-head">
              <button className="nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
              <span className="cal-title">{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
              <button className="nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
            </div>
            <div className="cal-grid">
              {WD.map((w) => <div key={w} className="wd">{w}</div>)}
              {calCells.map((d, i) => {
                const inMonth = d.getMonth() === month.getMonth();
                const has = !!plansByDay[dayKey(d)];
                const isSel = dayKey(d) === dayKey(selDay);
                const isToday = d.setHours(0, 0, 0, 0) === todayKey;
                return (
                  <button key={i} className={`day ${inMonth ? "" : "out"} ${isSel ? "sel" : ""} ${isToday ? "today" : ""}`} onClick={() => setSelDay(new Date(d))}>
                    {d.getDate()}
                    {has && <span className="dot" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sched">
            <div className="sched-day">{selDay.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })}</div>
            {dayPlans.length === 0 && <div className="sched-empty">Niciun plan în această zi.</div>}
            {dayPlans.map((p) => (
              <button key={p.id} className="sched-item" onClick={() => router.push(`/plans/${p.id}`)}>
                <span className="si-name">{p.stName}</span>
                {p.title ? <span className="si-title">{p.title}</span> : null}
              </button>
            ))}
          </div>
        </aside>

        {/* ── dreapta: Service Types ── */}
        <section className="main">
          <div className="main-head"><h2>Service Types</h2></div>
          {loading ? <div className="empty">Se încarcă…</div> : serviceTypes.map((st) => {
            const isCol = collapsed.has(st.id);
            const { upcoming, past } = splitPlans(st.plans);
            const list = (upcoming.length ? upcoming : past);
            return (
              <div key={st.id} className="st">
                <div className="st-bar">
                  <button className="st-toggle" onClick={() => toggle(st.id)}>
                    <span className={`st-caret ${isCol ? "col" : ""}`}>▾</span>
                    <span className="st-name">{st.name}</span>
                  </button>
                  <div className="st-right">
                    <button className="st-matrix" onClick={() => router.push(`/plans/matrix/${st.id}`)}>Matrix <span className="caret">▾</span></button>
                  </div>
                </div>
                {!isCol && (
                  <div className="st-body">
                    <div className="pt-head">
                      <div className="c-date">{upcoming.length ? "Upcoming" : "Recente"}</div>
                      <div className="c-title">TITLE</div>
                      <div className="c-upd">LAST UPDATED</div>
                    </div>
                    {list.length === 0 && <div className="pt-empty">Niciun plan.</div>}
                    {list.map((p) => (
                      <div key={p.id} className="pt-row" onClick={() => router.push(`/plans/${p.id}`)}>
                        <div className="c-date">{p.dateLabel}</div>
                        <div className="c-title">{p.title || ""}</div>
                        <div className="c-upd">{p.updatedLabel || ""}</div>
                      </div>
                    ))}
                    <button className="add-plan" onClick={() => router.push(`/plans/matrix/${st.id}`)}>+ Add plan</button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <style jsx>{`
        .plans { padding: 18px 0 80px; }
        .phead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .org-title { font-size: var(--fs-h1); font-weight: 600; margin: 0; }
        .matrix-pick { position: relative; }
        .btn-matrix-top, .st-matrix { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          border-radius: 6px; height: 30px; padding: 0 12px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
        .btn-matrix-top:hover, .st-matrix:hover { color: var(--text); border-color: var(--product); }
        .caret { color: var(--text-faint); font-size: 10px; }
        .matrix-menu { position: absolute; right: 0; top: 34px; background: var(--surface-3); border: 1px solid var(--border-strong);
          border-radius: 8px; padding: 6px; min-width: 240px; display: none; flex-direction: column; z-index: 20; box-shadow: 0 8px 28px rgba(0,0,0,.4); }
        .matrix-pick:hover .matrix-menu { display: flex; }
        .matrix-menu button { text-align: left; background: transparent; border: none; color: var(--text-dim); padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .matrix-menu button:hover { background: rgba(255,255,255,.06); color: var(--text); }
        .layout { display: grid; grid-template-columns: 280px 1fr; gap: 22px; align-items: start; }
        .side { position: sticky; top: calc(var(--nav-h) + 14px); }
        .cal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
        .cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .cal-title { font-size: 13.5px; color: var(--text); font-weight: 600; }
        .nav { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 16px; padding: 0 6px; }
        .nav:hover { color: var(--text); }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
        .wd { text-align: center; color: var(--text-faint); font-size: 10.5px; padding: 3px 0; }
        .day { position: relative; aspect-ratio: 1; background: transparent; border: none; color: var(--text-dim); cursor: pointer;
          font-size: 12px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .day:hover { background: var(--surface-2); color: var(--text); }
        .day.out { color: var(--text-faint); opacity: .45; }
        .day.today { color: var(--text); font-weight: 700; }
        .day.sel { background: var(--primary); color: #fff; }
        .dot { position: absolute; bottom: 3px; width: 4px; height: 4px; border-radius: 50%; background: var(--product); }
        .day.sel .dot { background: #fff; }
        .sched { margin-top: 14px; }
        .sched-day { color: var(--text); font-size: 12px; font-weight: 700; text-transform: capitalize; margin-bottom: 8px; }
        .sched-empty { color: var(--text-faint); font-size: 12.5px; }
        .sched-item { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; width: 100%; text-align: left;
          background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; cursor: pointer; }
        .sched-item:hover { border-color: var(--border-strong); }
        .si-name { color: var(--text); font-size: 13px; }
        .si-title { color: var(--text-faint); font-size: 11px; }
        .main-head h2 { font-size: 17px; font-weight: 600; margin: 0 0 12px; color: var(--text); }
        .st { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
        .st-bar { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; background: var(--surface); }
        .st-toggle { display: inline-flex; align-items: center; gap: 9px; background: transparent; border: none; cursor: pointer; }
        .st-caret { color: var(--text-faint); font-size: 11px; transition: transform .15s; }
        .st-caret.col { transform: rotate(-90deg); }
        .st-name { color: var(--text); font-size: 15px; font-weight: 600; }
        .st-body { border-top: 1px solid var(--border); }
        .pt-head, .pt-row { display: grid; grid-template-columns: 200px 1fr 220px; align-items: center; padding: 10px 16px; }
        .pt-head { color: var(--text-faint); font-size: var(--fs-colhead); letter-spacing: .5px; border-bottom: 1px solid var(--border-soft); }
        .pt-row { border-bottom: 1px solid var(--border-soft); cursor: pointer; font-size: 13.5px; border-left: 3px solid transparent; }
        .pt-row:hover { background: var(--row-hover); border-left-color: var(--product); }
        .c-date { color: var(--text); } .c-title { color: var(--text-link); } .c-upd { color: var(--text-faint); font-size: 12px; }
        .pt-empty { padding: 14px 16px; color: var(--text-faint); font-size: 13px; }
        .add-plan { margin: 10px 16px; background: transparent; border: none; color: var(--primary); cursor: pointer; font-size: 13px; padding: 4px 0; }
        .add-plan:hover { text-decoration: underline; }
        .empty { padding: 30px 8px; color: var(--text-faint); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
        @media (max-width: 920px) { .layout { grid-template-columns: 1fr; } .side { position: static; } }
      `}</style>
    </div>
  );
}
