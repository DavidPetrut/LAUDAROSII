"use client";
/**
 * Pagina Plans — tab-ul „Plans" din PCO Services. Date REALE din /api/pc/v1/plans.
 * Listă de Service Types (ca în PCO), fiecare cu planurile lui (viitoare + recente) și
 * acces la MATRIX (planificare multi-plan: poziții × planuri). Vizual apropiat de PCO,
 * îl aducem pixel-identic pe iterații.
 *
 * AI-first: pagina se înregistrează ca suprafață => asistentul o „vede" și poate naviga.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { plansApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";

export default function PlansPage() {
  const router = useRouter();
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try { const r = await plansApi.list(); setServiceTypes(r.serviceTypes || []); }
    catch (e) { setErr(e?.message || "Eroare la încărcare."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return serviceTypes;
    return serviceTypes.filter((st) => (st.name || "").toLowerCase().includes(q));
  }, [serviceTypes, query]);

  // azi (local) pt. a separa planurile viitoare de cele trecute
  const todayKey = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const splitPlans = useCallback((plans = []) => {
    const up = [], past = [];
    for (const p of plans) {
      const t = p.sortDate ? new Date(p.sortDate).getTime() : 0;
      (t >= todayKey ? up : past).push(p);
    }
    return { upcoming: up, past: past.reverse() };
  }, [todayKey]);

  useAiSurface({
    id: "plans.list",
    label: "Lista de planuri (Service Types)",
    scope: "page",
    getContext: () => ({ query, serviceTypes: serviceTypes.map((s) => ({ id: s.id, name: s.name, plans: s.plans?.length || 0 })) }),
    actions: [
      { id: "search", label: "Caută service type", params: { q: "string" }, run: ({ q }) => setQuery(q || "") },
      { id: "openMatrix", label: "Deschide Matrix", description: "Matrix pt. un service type după id", params: { id: "string" }, run: ({ id }) => router.push(`/plans/matrix/${id}`) },
      { id: "openPlan", label: "Deschide un plan", params: { id: "string" }, run: ({ id }) => router.push(`/plans/${id}`) },
    ],
  }, [query, serviceTypes]);

  return (
    <div className="plans">
      <h1 className="page-title">Plans</h1>

      <div className="filterbar">
        <button className="filter-chip">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M4 8h8M6 12h4" /></svg>
          Filter
        </button>
        <input className="filter-text" placeholder="Caută un service type" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="count-row">{loading ? "…" : `${rows.length} service types`}</div>
      {err && <div className="err">{err}</div>}

      <div className="st-list">
        {rows.map((st) => {
          const { upcoming, past } = splitPlans(st.plans);
          const shown = (upcoming.length ? upcoming : past).slice(0, 8);
          return (
            <div key={st.id} className="st-card">
              <div className="st-head">
                <div className="st-name" onClick={() => router.push(`/plans/matrix/${st.id}`)}>
                  <span className="st-dot" aria-hidden />
                  {st.name}
                </div>
                <div className="st-actions">
                  <span className="st-count">{st.plans?.length || 0} plans</span>
                  <button className="btn btn-matrix" onClick={() => router.push(`/plans/matrix/${st.id}`)}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="1.5" width="13" height="13" rx="1.5" /><path d="M1.5 6h13M1.5 10.5h13M6 1.5v13" /></svg>
                    Matrix
                  </button>
                </div>
              </div>
              <div className="plan-strip">
                {shown.length === 0 && <span className="noplans">Niciun plan.</span>}
                {shown.map((p) => (
                  <button key={p.id} className="plan-chip" onClick={() => router.push(`/plans/${p.id}`)} title={p.title || p.dateLabel}>
                    <span className="chip-date">{p.dateLabel}</span>
                    {p.title ? <span className="chip-title">{p.title}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!loading && rows.length === 0 && <div className="empty">Niciun service type.</div>}
      </div>

      <style jsx>{`
        .plans { padding: 24px 0 80px; }
        .page-title { font-size: var(--fs-h1); font-weight: 600; margin: 8px 0 18px; }
        .filterbar { display: flex; align-items: center; gap: 0; background: var(--surface);
          border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; }
        .filter-chip { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-2);
          border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; height: 32px; padding: 0 12px; cursor: pointer; font-size: 13px; }
        .filter-text { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 14px; padding: 0 14px; height: 32px; }
        .filter-text::placeholder { color: var(--text-faint); }
        .count-row { color: var(--text-dim); font-size: 14px; margin: 16px 2px 10px; }
        .st-list { display: flex; flex-direction: column; gap: 10px; }
        .st-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; }
        .st-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .st-name { display: inline-flex; align-items: center; gap: 9px; font-size: 15px; color: var(--text); font-weight: 600; cursor: pointer; }
        .st-name:hover { color: var(--text-link); }
        .st-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--product); display: inline-block; }
        .st-actions { display: flex; align-items: center; gap: 12px; }
        .st-count { color: var(--text-faint); font-size: 12.5px; }
        .btn-matrix { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2);
          border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; height: 30px; padding: 0 12px; cursor: pointer; font-size: 13px; }
        .btn-matrix:hover { color: var(--text); border-color: var(--product); }
        .plan-strip { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
        .plan-chip { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 1px;
          background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 6px 11px; cursor: pointer; }
        .plan-chip:hover { border-color: var(--border-strong); background: var(--surface-3); }
        .chip-date { color: var(--text); font-size: 13px; }
        .chip-title { color: var(--text-faint); font-size: 11px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .noplans { color: var(--text-faint); font-size: 13px; }
        .empty { padding: 30px 8px; color: var(--text-faint); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
      `}</style>
    </div>
  );
}
