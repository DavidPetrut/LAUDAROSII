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
  const [limits, setLimits] = useState({}); // stId → câte planuri afișate (default 10)
  const [addFor, setAddFor] = useState(null); // {id, name} service type pt. Add Plans
  const [addDate, setAddDate] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addBusy, setAddBusy] = useState(false);
  const PAGE = 10;

  async function submitAddPlans() {
    if (!addFor || !addDate) return;
    setAddBusy(true);
    try {
      const base = new Date(addDate);
      for (let i = 0; i < Math.max(1, Math.min(12, addQty)); i++) {
        const d = new Date(base); d.setDate(base.getDate() + i * 7);
        await plansApi.create(addFor.id, d.toISOString().slice(0, 10));
      }
      setAddFor(null); setAddDate(""); setAddQty(1); await load();
    } catch (e) { setErr(e?.message || "Eroare la adăugare."); }
    finally { setAddBusy(false); }
  }
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
    <div className="plans pc-full pc-pad">
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
            // cele mai recente întâi (viitoare + trecute), ca în PCO; afișăm max `limit`, restul cu „vezi mai vechi"
            const ordered = [...(st.plans || [])].sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
            const limit = limits[st.id] || PAGE;
            const list = ordered.slice(0, limit);
            const remaining = ordered.length - list.length;
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
                      <div className="c-date">DATA</div>
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
                    <div className="pt-foot">
                      {remaining > 0 && (
                        <button className="view-older" onClick={() => setLimits((m) => ({ ...m, [st.id]: limit + PAGE }))}>
                          Vezi mai vechi ({remaining})
                        </button>
                      )}
                      {limit > PAGE && (
                        <button className="view-less" onClick={() => setLimits((m) => ({ ...m, [st.id]: PAGE }))}>Arată mai puține</button>
                      )}
                      <button className="add-plan" onClick={() => { setAddFor({ id: st.id, name: st.name }); setAddDate(new Date().toISOString().slice(0, 10)); setAddQty(1); }}>+ Add plan</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {addFor && (
        <div className="ov" onClick={() => !addBusy && setAddFor(null)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <h3>Add Plans</h3>
            <div className="dsub">{addFor.name}</div>
            <div className="frow">
              <label>Quantity<select value={addQty} onChange={(e) => setAddQty(parseInt(e.target.value, 10))}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label>Starting On<input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} /></label>
            </div>
            <p className="dhint">Creează {addQty} plan{addQty > 1 ? "uri" : ""} săptămânal{addQty > 1 ? "e" : ""} începând cu data aleasă (orele se copiază din template-ul service type-ului).</p>
            <div className="dact">
              <button className="c" onClick={() => setAddFor(null)} disabled={addBusy}>Cancel</button>
              <button className="s" onClick={submitAddPlans} disabled={addBusy || !addDate}>{addBusy ? "Se adaugă…" : `Add ${addQty}`}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .plans { padding: 18px 0 80px; }
        .ov { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 60; }
        .dlg { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 10px; padding: 20px; width: 440px; max-width: 92vw; }
        .dlg h3 { margin: 0 0 3px; font-size: 16px; color: var(--text); }
        .dsub { color: var(--text-dim); font-size: 13px; margin-bottom: 16px; }
        .frow { display: flex; gap: 14px; }
        .frow label { flex: 1; display: flex; flex-direction: column; gap: 5px; color: var(--text-faint); font-size: 12px; }
        .frow select, .frow input { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 34px; padding: 0 10px; font-size: 13px; }
        .dhint { color: var(--text-faint); font-size: 12px; line-height: 1.5; margin: 14px 0; }
        .dact { display: flex; justify-content: flex-end; gap: 10px; }
        .dact .c { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 8px 16px; cursor: pointer; }
        .dact .s { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 6px; padding: 8px 18px; cursor: pointer; }
        .dact .s:disabled { opacity: .5; }
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
        .pt-foot { display: flex; align-items: center; gap: 16px; padding: 10px 16px; }
        .view-older, .view-less { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          border-radius: 6px; padding: 5px 12px; font-size: 12.5px; cursor: pointer; }
        .view-older:hover, .view-less:hover { color: var(--text); border-color: var(--product); }
        .add-plan { margin-left: auto; background: transparent; border: none; color: var(--primary); cursor: pointer; font-size: 13px; padding: 4px 0; }
        .add-plan:hover { text-decoration: underline; }
        .empty { padding: 30px 8px; color: var(--text-faint); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
        @media (max-width: 920px) { .layout { grid-template-columns: 1fr; } .side { position: static; } }
      `}</style>
    </div>
  );
}
