"use client";
/**
 * My Schedule — programul meu (viewer). /api/pc/v1/schedule/my → { pending, confirmed }.
 * Grupat pe plan: Pending (de confirmat) + Confirmed. Accept/Decline = seam UI (le facem împreună,
 * pentru că declanșează răspuns/email — nu le declanșez autonom).
 * Blockouts (#12): secțiune proprie — „Block out dates" self-service (adaugă/șterge datele în care
 * NU ești disponibil). Backend face auto-decline pe zile acoperite + anunță adminii la acțiunea ta.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { scheduleApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import BlockoutModal from "@/components/schedule/BlockoutModal";

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

const REPEAT_LABEL = { weekly: "săptămânal", monthly: "lunar", yearly: "anual" };

export default function MySchedulePage() {
  const router = useRouter();
  const [data, setData] = useState({ pending: [], confirmed: [] });
  const [blockouts, setBlockouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3200); };

  const load = useCallback(async () => {
    try {
      const [my, bo] = await Promise.all([scheduleApi.my(), scheduleApi.blockouts()]);
      setData(my); setBlockouts(bo.blockouts || []);
    } catch (e) { setErr(e?.message || "Eroare."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useAiSurface({ id: "schedule.my", label: "Programul meu", scope: "page",
    getContext: () => ({ pending: data.pending?.length || 0, confirmed: data.confirmed?.length || 0, blockouts: blockouts.length }), actions: [] }, [data, blockouts]);

  const open = (id) => id && router.push(`/plans/${id}`);

  async function onSavedBlockout(r) {
    setShowAdd(false);
    const n = r?.autoDeclined || 0;
    flash(n > 0 ? `Blocat. ${n} ${n === 1 ? "programare a fost" : "programări au fost"} refuzate automat (fără email de la tine).` : "Date blocate.");
    load();
  }
  async function removeBlockout(id) {
    setConfirmDel(null);
    setBlockouts((b) => b.filter((x) => String(x.id) !== String(id))); // optimist
    try { await scheduleApi.removeBlockout(id); flash("Blockout scos."); }
    catch (e) { flash(e?.message || "Eroare."); load(); }
  }

  return (
    <div className="ms">
      <div className="ms-top">
        <h1 className="page-title">My Schedule</h1>
        <button className="bo-add" onClick={() => setShowAdd(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4M9.5 15.5h5" /></svg>
          Blochează date
        </button>
      </div>
      {err && <div className="err">{err}</div>}
      {loading ? <div className="muted">Se încarcă…</div> : (
        <>
          {/* Blockouts */}
          <div className="sec">Indisponibil (blockouts){blockouts.length ? ` · ${blockouts.length}` : ""}</div>
          {blockouts.length === 0 ? (
            <div className="bo-empty">Niciun interval blocat. Apasă <b>„Blochează date"</b> ca să marchezi când nu ești disponibil.</div>
          ) : (
            <div className="bo-list">
              {blockouts.map((b) => (
                <div key={b.id} className={`bo-item ${b.type === "churchBlock" ? "church" : ""}`}>
                  <span className="bo-ic">{b.type === "churchBlock" ? "🔵" : "⛔"}</span>
                  <div className="bo-mid">
                    <div className="bo-dt">{b.label}{!b.allDay && b.startTime ? ` · ${b.startTime}–${b.endTime}` : ""}</div>
                    <div className="bo-sub">
                      {b.type === "churchBlock" ? "Blocat de echipă" : "Indisponibil"}
                      {b.repeat && b.repeat !== "none" ? ` · se repetă ${REPEAT_LABEL[b.repeat] || b.repeat}` : ""}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </div>
                  </div>
                  {b.type !== "churchBlock" && (
                    confirmDel === b.id ? (
                      <span className="bo-cfm">
                        <button className="bo-yes" onClick={() => removeBlockout(b.id)}>Scoate</button>
                        <button className="bo-no" onClick={() => setConfirmDel(null)}>Nu</button>
                      </span>
                    ) : (
                      <button className="bo-del" title="Scoate blockout-ul" onClick={() => setConfirmDel(b.id)}>×</button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}

          {(data.pending || []).length > 0 && <><div className="sec">De confirmat ({data.pending.length})</div>{data.pending.map((g, i) => <Group key={i} g={g} onOpen={open} />)}</>}
          <div className="sec">Confirmate ({(data.confirmed || []).length})</div>
          {(data.confirmed || []).length === 0 ? <div className="muted">Nimic confirmat.</div> : data.confirmed.map((g, i) => <Group key={i} g={g} onOpen={open} />)}
        </>
      )}

      {showAdd && <BlockoutModal onClose={() => setShowAdd(false)} onSaved={onSavedBlockout} />}
      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .ms { padding: 22px 0 60px; }
        .ms-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 18px; }
        .page-title { font-size: var(--fs-h1); font-weight: 600; margin: 0; }
        .bo-add { display: inline-flex; align-items: center; gap: 8px; background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 8px; padding: 9px 15px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .13s; }
        .bo-add:hover { opacity: .9; }
        .sec { color: var(--text-faint); font-size: 12px; letter-spacing: .5px; text-transform: uppercase; margin: 18px 0 10px; }
        .muted { color: var(--text-faint); font-size: 13px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; }
        .bo-empty { color: var(--text-faint); font-size: 13px; line-height: 1.6; background: var(--surface); border: 1px dashed var(--border-strong); border-radius: 9px; padding: 16px 18px; } .bo-empty b { color: var(--text-dim); }
        .bo-list { display: flex; flex-direction: column; gap: 8px; }
        .bo-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); transition: border-color .13s; }
        .bo-item:hover { border-color: var(--border-strong); }
        .bo-item.church { border-color: rgba(47,129,247,.4); background: rgba(47,129,247,.05); }
        .bo-ic { font-size: 15px; flex: none; }
        .bo-mid { flex: 1; min-width: 0; }
        .bo-dt { color: var(--text); font-size: 14px; font-weight: 600; }
        .bo-sub { color: var(--text-faint); font-size: 12px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bo-del { flex: none; background: transparent; border: none; color: var(--text-faint); font-size: 20px; line-height: 1; cursor: pointer; padding: 0 4px; border-radius: 6px; }
        .bo-del:hover { color: var(--danger); background: rgba(248,81,73,.1); }
        .bo-cfm { display: inline-flex; gap: 6px; align-items: center; }
        .bo-yes { background: var(--danger); border: 1px solid var(--danger); color: #fff; border-radius: 6px; padding: 5px 11px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .bo-no { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 5px 11px; font-size: 12px; cursor: pointer; }
        .toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); padding: 11px 18px; border-radius: 8px; font-size: 13px; z-index: 90; box-shadow: 0 8px 28px rgba(0,0,0,.4); max-width: 90vw; text-align: center; }
      `}</style>
    </div>
  );
}
