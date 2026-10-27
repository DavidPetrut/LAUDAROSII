"use client";
/**
 * Raport „Persoane neplanificate" (live) — cererea liderului (Word doc, final).
 * Pe un INTERVAL de N planuri + (opțional) o SLUJIRE/echipă: coloane după câte ori e planificată
 * fiecare persoană (Neplanificați / 1× / 2× / 3× / 4×+). Fiecare card arată de câte ori mai POATE
 * fi planificată (free = N − planificat − blocat) și câte planuri îi sunt blocate (blockout).
 * Se deschide în TAB NOU din Matrix și se auto-împrospătează (dispar pe măsură ce planifici dincolo).
 * Doar READ — nu scrie nimic.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { matrixApi } from "@/lib/api/client";
import PersonAvatar from "@/components/plans/PersonAvatar";

export default function CoveragePage() {
  const { serviceTypeId } = useParams();
  const [count, setCount] = useState(4);
  const [teamId, setTeamId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [auto, setAuto] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try { setData(await matrixApi.coverage(serviceTypeId, { count, teamId })); setErr(""); setLastSync(new Date()); }
    catch (e) { setErr(e?.message || "Eroare la raport."); }
    finally { setLoading(false); }
  }, [serviceTypeId, count, teamId]);

  useEffect(() => { load(false); }, [load]);

  // auto-refresh (live): reîncarcă silențios la fiecare 8s
  useEffect(() => {
    clearInterval(timer.current);
    if (auto) timer.current = setInterval(() => load(true), 8000);
    return () => clearInterval(timer.current);
  }, [auto, load]);

  const buckets = data?.buckets || [];
  const teams = data?.teams || [];
  const syncLabel = lastSync ? lastSync.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

  return (
    <div className="cov pc-full pc-pad">
      <div className="chead">
        <div className="ct">
          <div className="ct-st">{data?.serviceTypeName || ""}{data?.interval ? ` · ${data.interval}` : ""}</div>
          <h1>Persoane neplanificate <span className="ct-sub">live</span></h1>
        </div>
        <div className="cfilters">
          <label className="fl">Interval
            <select value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))}>{[4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} planuri</option>)}</select>
          </label>
          <label className="fl">Slujire
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Tot service type-ul</option>
              {teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
            </select>
          </label>
          <button className="rbtn" onClick={() => load(false)} title="Împrospătează acum">⟳</button>
          <label className="auto"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Live</label>
          {syncLabel && <span className="sync">actualizat {syncLabel}</span>}
        </div>
      </div>

      <div className="legend">
        <span>Pe interval. <b>„mai poate ×N"</b> = de câte ori mai poate fi planificat (liber, fără blockout). <span className="blk">⛔ N</span> = planuri blocate.</span>
        {data ? <span className="tot">{data.total} persoane în pool</span> : null}
      </div>

      {err && <div className="err">{err}</div>}
      {loading && !data ? <div className="empty">Se încarcă raportul…</div> : (
        <div className="cols">
          {buckets.map((b) => (
            <div key={b.times} className={`col ${b.times === 0 ? "col0" : ""}`}>
              <div className="col-h">
                <span className="col-l">{b.label}</span>
                <span className="col-n">{b.people.length}</span>
              </div>
              <div className="col-list">
                {b.people.length === 0 && <div className="col-empty">—</div>}
                {b.people.map((p) => (
                  <div key={p.id} className="card">
                    <PersonAvatar person={p} size={26} showBadge={false} />
                    <span className="c-name">{p.name}</span>
                    <span className="c-meta">
                      {p.free > 0 && <span className="free" title="De câte ori mai poate fi planificat">mai poate ×{p.free}</span>}
                      {p.blocked > 0 && <span className="blk" title="Planuri blocate (blockout)">⛔{p.blocked}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .cov { padding: 16px 20px 50px; }
        .chead { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ct-st { color: var(--text-faint); font-size: 12px; }
        .ct h1 { font-size: 22px; font-weight: 600; margin: 3px 0 0; display: flex; align-items: center; gap: 10px; }
        .ct-sub { font-size: 11px; font-weight: 700; color: #0b2018; background: var(--product); border-radius: 20px; padding: 2px 9px; letter-spacing: .5px; }
        .cfilters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .fl { color: var(--text-faint); font-size: 11px; display: inline-flex; flex-direction: column; gap: 3px; }
        .fl select { background: var(--surface-2); color: var(--text); border: 1px solid var(--border-strong); border-radius: 6px; height: 32px; padding: 0 8px; font-size: 13px; }
        .rbtn { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); height: 32px; width: 34px; border-radius: 6px; cursor: pointer; font-size: 15px; align-self: flex-end; }
        .rbtn:hover { color: var(--text); border-color: var(--primary); }
        .auto { color: var(--text-dim); font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px; align-self: flex-end; }
        .sync { color: var(--text-faint); font-size: 11px; align-self: flex-end; }
        .legend { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--text-faint); font-size: 12px; margin: 14px 0 12px; flex-wrap: wrap; }
        .legend b { color: var(--text-dim); } .legend .blk { color: var(--danger); } .tot { color: var(--text-dim); }
        .cols { display: flex; gap: 14px; align-items: flex-start; overflow-x: auto; padding-bottom: 10px; }
        .col { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; width: 250px; flex: none; max-height: calc(100vh - 220px); display: flex; flex-direction: column; }
        .col0 { border-color: var(--primary); box-shadow: 0 0 0 1px rgba(47,129,247,.25); }
        .col-h { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); border-radius: 10px 10px 0 0; }
        .col0 .col-h { background: var(--section-head-bg); }
        .col-l { color: var(--text); font-weight: 600; font-size: 13.5px; }
        .col-n { color: var(--text-dim); font-size: 12px; background: var(--surface-2); border-radius: 20px; padding: 1px 9px; }
        .col-list { overflow-y: auto; padding: 6px; }
        .col-empty { color: var(--text-faint); font-size: 13px; padding: 14px; text-align: center; }
        .card { display: flex; align-items: center; gap: 9px; padding: 6px 8px; border-radius: 7px; }
        .card:hover { background: rgba(255,255,255,.04); }
        .c-name { color: var(--text); font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .c-meta { display: flex; align-items: center; gap: 6px; flex: none; }
        .free { color: var(--product); font-size: 10.5px; border: 1px solid rgba(87,185,138,.5); border-radius: 20px; padding: 1px 7px; white-space: nowrap; }
        .blk { color: var(--danger); font-size: 11px; white-space: nowrap; }
        .empty { padding: 40px; color: var(--text-faint); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin: 12px 0; }
      `}</style>
    </div>
  );
}
