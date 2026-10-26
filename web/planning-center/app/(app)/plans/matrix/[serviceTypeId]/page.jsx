"use client";
/**
 * Matrix — planificare multi-plan (poziții × planuri). Date REALE din /api/pc/v1/matrix/:id.
 * Grilă identică PCO: coloană stângă sticky cu echipe (secțiuni) → poziții (rânduri);
 * antet sus cu datele planurilor; celule = oameni asignați (culoare după status) + „needed".
 *
 * Email în masă: 1 email/persoană pt. planurile bifate (exact ce recomandă PCO). Se trimite
 * DOAR la click explicit + confirmare — niciodată automat.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { matrixApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";

const STATUS_COLOR = { confirmed: "#57b98a", unconfirmed: "#c9a227", declined: "#e5534b" };
const STATUS_LABEL = { confirmed: "Confirmat", unconfirmed: "Neconfirmat", declined: "Refuzat" };

export default function MatrixPage() {
  const router = useRouter();
  const { serviceTypeId } = useParams();
  const [data, setData] = useState(null);
  const [count, setCount] = useState(4);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selPlans, setSelPlans] = useState(() => new Set()); // planuri bifate pt. email în masă
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await matrixApi.grid(serviceTypeId, count); setData(r); setErr(""); }
    catch (e) { setErr(e?.message || "Eroare la matrix."); }
    finally { setLoading(false); }
  }, [serviceTypeId, count]);
  useEffect(() => { load(); }, [load]);

  const plans = data?.plans || [];
  const teams = data?.teams || [];
  const nPlans = plans.length;

  const togglePlan = (id) => setSelPlans((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function doSendEmails() {
    setConfirmSend(false);
    setEmailBusy(true); setEmailMsg("");
    try {
      const r = await matrixApi.sendEmails(serviceTypeId, [...selPlans]);
      setEmailMsg(`Trimise: ${r.sent || 0} email(uri).`);
      setSelPlans(new Set());
      await load();
    } catch (e) { setEmailMsg(e?.message || "Eroare la trimitere."); }
    finally { setEmailBusy(false); }
  }

  useAiSurface({
    id: "plans.matrix",
    label: "Matrix — planificare multi-plan",
    scope: "page",
    getContext: () => ({ serviceTypeId, planuri: nPlans, echipe: teams.length, planuriBifate: selPlans.size }),
    actions: [
      { id: "setCount", label: "Câte planuri", description: "Nr. de planuri în grilă (1-12)", params: { n: "number" }, run: ({ n }) => setCount(Math.min(12, Math.max(1, parseInt(n, 10) || 4))) },
      { id: "back", label: "Înapoi la Plans", run: () => router.push("/plans") },
    ],
  }, [serviceTypeId, nPlans, teams, selPlans]);

  const gridCols = useMemo(() => `minmax(240px, 280px) repeat(${Math.max(1, nPlans)}, minmax(130px, 1fr))`, [nPlans]);

  return (
    <div className="matrix">
      <div className="mhead">
        <div className="mtitle">
          <button className="back" onClick={() => router.push("/plans")} title="Înapoi la Plans">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <h1 className="page-title">Matrix</h1>
        </div>
        <div className="mctl">
          <label className="cnt">
            Planuri
            <select value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))}>
              {[2, 4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn btn-email" disabled={selPlans.size === 0 || emailBusy} onClick={() => setConfirmSend(true)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="3" width="13" height="10" rx="1.5" /><path d="M2 4l6 4.5L14 4" /></svg>
            {emailBusy ? "Se trimite…" : `Trimite email (${selPlans.size})`}
          </button>
        </div>
      </div>

      {emailMsg && <div className="info">{emailMsg}</div>}
      {err && <div className="err">{err}</div>}

      <div className="legend">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="leg"><span className="leg-dot" style={{ background: STATUS_COLOR[k] }} />{v}</span>
        ))}
        <span className="leg"><span className="leg-need" />Poziție neacoperită (needed)</span>
      </div>

      {loading ? (
        <div className="empty">Se încarcă matrix-ul…</div>
      ) : nPlans === 0 ? (
        <div className="empty">Niciun plan pentru acest service type.</div>
      ) : (
        <div className="grid-wrap">
          <div className="grid" style={{ gridTemplateColumns: gridCols }}>
            {/* antet: colț + datele planurilor */}
            <div className="cell head corner">POZIȚIE</div>
            {plans.map((p) => (
              <div key={p.id} className="cell head planhead">
                <label className="planpick">
                  <input type="checkbox" checked={selPlans.has(String(p.id))} onChange={() => togglePlan(String(p.id))} />
                  <span>{p.dateLabel}</span>
                </label>
              </div>
            ))}

            {/* corp: echipe (secțiune, pe tot rândul) → poziții (rânduri) */}
            {teams.flatMap((t) => {
              const out = [
                <div key={`team-${t.teamId}`} className="teamblock" style={{ gridColumn: `1 / span ${nPlans + 1}` }}>
                  <div className="team-name">{t.name}</div>
                </div>,
              ];
              if (!t.positions || t.positions.length === 0) {
                out.push(<div key={`team-${t.teamId}-empty`} className="cell poscell faint" style={{ gridColumn: `1 / span ${nPlans + 1}` }}>Nicio poziție.</div>);
              }
              (t.positions || []).forEach((pos) => {
                out.push(<div key={`${t.teamId}-${pos.positionId}-name`} className="cell poscell">{pos.name}</div>);
                (pos.cells || []).forEach((c, ci) => {
                  out.push(
                    <div key={`${t.teamId}-${pos.positionId}-${ci}`} className="cell datacell">
                      {(c.people || []).map((pp, pi) => (
                        <span key={pi} className="person" title={`${pp.name} — ${STATUS_LABEL[pp.status] || pp.status}`}>
                          <span className="pdot" style={{ background: STATUS_COLOR[pp.status] || "#6b7580" }} />
                          <span className="pname">{pp.name}</span>
                        </span>
                      ))}
                      {c.needed > 0 && <span className="needed" title={`${c.needed} neacoperit(e)`}>+{c.needed}</span>}
                    </div>
                  );
                });
              });
              return out;
            })}
          </div>
        </div>
      )}

      {confirmSend && (
        <div className="overlay" onClick={() => setConfirmSend(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Trimiți emailurile de programare?</h3>
            <p>Se trimite <b>1 email / persoană</b> pentru planurile bifate (<b>{selPlans.size}</b>), doar celor neanunțați încă. Acțiunea <b>trimite emailuri reale</b>.</p>
            <div className="dlg-act">
              <button className="btn btn-link" onClick={() => setConfirmSend(false)}>Anulează</button>
              <button className="btn btn-email solid" onClick={doSendEmails}>Trimite acum</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .matrix { padding: 20px 0 80px; }
        .mhead { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .mtitle { display: flex; align-items: center; gap: 8px; }
        .back { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 6px; border-radius: 6px; display: inline-flex; }
        .back:hover { color: var(--text); background: rgba(255,255,255,.05); }
        .page-title { font-size: var(--fs-h1); font-weight: 600; margin: 0; }
        .mctl { display: flex; align-items: center; gap: 12px; }
        .cnt { color: var(--text-dim); font-size: 13px; display: inline-flex; align-items: center; gap: 7px; }
        .cnt select { background: var(--surface-2); color: var(--text); border: 1px solid var(--border-strong); border-radius: 6px; height: 30px; padding: 0 8px; }
        .btn-email { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-2);
          border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; height: 32px; padding: 0 14px; cursor: pointer; font-size: 13px; }
        .btn-email:hover:not(:disabled) { color: var(--text); border-color: var(--primary); }
        .btn-email:disabled { opacity: .5; cursor: default; }
        .btn-email.solid { background: var(--primary); border-color: var(--primary); color: var(--primary-ink); }
        .legend { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 12px; color: var(--text-dim); font-size: 12px; }
        .leg { display: inline-flex; align-items: center; gap: 6px; }
        .leg-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
        .leg-need { width: 14px; height: 14px; border-radius: 4px; border: 1px dashed var(--primary); display: inline-block; }
        .grid-wrap { overflow: auto; border: 1px solid var(--border); border-radius: 8px; max-height: calc(100vh - 220px); }
        .grid { display: grid; min-width: max-content; }
        .cell { border-bottom: 1px solid var(--border-soft); border-right: 1px solid var(--border-soft); padding: 8px 10px; font-size: 13px; min-height: 40px; }
        .head { position: sticky; top: 0; z-index: 2; background: var(--surface-2); color: var(--text-faint);
          font-size: var(--fs-colhead); letter-spacing: .5px; font-weight: 600; }
        .corner { position: sticky; left: 0; z-index: 3; }
        .planhead { text-align: center; }
        .planpick { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--text); font-size: 12.5px; font-weight: 600; }
        .planpick input { accent-color: var(--primary); }
        .teamblock { background: var(--surface); border-bottom: 1px solid var(--border); border-right: 1px solid var(--border-soft);
          position: sticky; left: 0; z-index: 1; padding: 7px 12px; }
        .team-name { color: var(--text); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
        .poscell { position: sticky; left: 0; z-index: 1; background: var(--surface); color: var(--text-dim); display: flex; align-items: center; }
        .poscell.faint { color: var(--text-faint); font-style: italic; }
        .datacell { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; background: var(--bg); }
        .person { display: inline-flex; align-items: center; gap: 5px; background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 20px; padding: 2px 9px 2px 6px; max-width: 100%; }
        .pdot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
        .pname { color: var(--text); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .needed { color: var(--primary); border: 1px dashed var(--primary); border-radius: 20px; font-size: 11px; padding: 1px 7px; }
        .empty { padding: 40px 10px; color: var(--text-faint); }
        .info { background: rgba(47,129,247,.12); border: 1px solid rgba(47,129,247,.35); color: #9cc4f5; padding: 9px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 50; }
        .dialog { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 10px; padding: 20px; max-width: 420px; }
        .dialog h3 { margin: 0 0 10px; font-size: 16px; color: var(--text); }
        .dialog p { margin: 0 0 16px; font-size: 13.5px; color: var(--text-dim); line-height: 1.5; }
        .dlg-act { display: flex; justify-content: flex-end; gap: 10px; }
        .btn-link { background: transparent; border: none; color: var(--text-dim); cursor: pointer; }
      `}</style>
    </div>
  );
}
