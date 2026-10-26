"use client";
/**
 * My Schedule — programul meu (viewer). /api/pc/v1/schedule/my → { pending, confirmed }.
 * Grupat pe plan: Pending (de confirmat) + Confirmed. Accept/Decline = seam UI (le facem împreună,
 * pentru că declanșează răspuns/email — nu le declanșez autonom).
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { scheduleApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";

function Group({ g, onOpen }) {
  return (
    <div className="g" onClick={() => onOpen(g.planId)}>
      <div className="g-date">{g.dateLabel || g.dateStr}</div>
      <div className="g-main">
        <div className="g-st">{g.serviceTypeName}</div>
        <div className="g-pos">{(g.positions || []).map((p, i) => (
          <span key={i} className={`pos ${p.status === "unconfirmed" ? "un" : "ok"}`}>{p.positionName || p.name || p.label || "Poziție"}</span>
        ))}</div>
      </div>
      <style jsx>{`
        .g { display: flex; gap: 16px; padding: 14px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; cursor: pointer; background: var(--surface); }
        .g:hover { border-color: var(--border-strong); }
        .g-date { width: 110px; color: var(--text); font-weight: 600; font-size: 14px; }
        .g-st { color: var(--text); font-size: 14px; } .g-pos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .pos { border-radius: 20px; padding: 2px 10px; font-size: 12px; border: 1px solid; }
        .pos.ok { color: var(--product); border-color: var(--product); } .pos.un { color: #c9a227; border-color: #c9a227; }
      `}</style>
    </div>
  );
}

export default function MySchedulePage() {
  const router = useRouter();
  const [data, setData] = useState({ pending: [], confirmed: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setData(await scheduleApi.my()); } catch (e) { setErr(e?.message || "Eroare."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useAiSurface({ id: "schedule.my", label: "Programul meu", scope: "page",
    getContext: () => ({ pending: data.pending?.length || 0, confirmed: data.confirmed?.length || 0 }), actions: [] }, [data]);

  const open = (id) => id && router.push(`/plans/${id}`);
  return (
    <div className="ms">
      <h1 className="page-title">My Schedule</h1>
      {err && <div className="err">{err}</div>}
      {loading ? <div className="muted">Se încarcă…</div> : (
        <>
          {(data.pending || []).length > 0 && <><div className="sec">De confirmat ({data.pending.length})</div>{data.pending.map((g, i) => <Group key={i} g={g} onOpen={open} />)}</>}
          <div className="sec">Confirmate ({(data.confirmed || []).length})</div>
          {(data.confirmed || []).length === 0 ? <div className="muted">Nimic confirmat.</div> : data.confirmed.map((g, i) => <Group key={i} g={g} onOpen={open} />)}
        </>
      )}
      <style jsx>{`
        .ms { padding: 22px 0 60px; }
        .page-title { font-size: var(--fs-h1); font-weight: 600; margin: 4px 0 18px; }
        .sec { color: var(--text-faint); font-size: 12px; letter-spacing: .5px; text-transform: uppercase; margin: 18px 0 10px; }
        .muted { color: var(--text-faint); font-size: 13px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; }
      `}</style>
    </div>
  );
}
