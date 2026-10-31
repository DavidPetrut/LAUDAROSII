"use client";
/**
 * „Șablon Order" (⋮ pe plan) — vezi șablonul curent, aplică ALT șablon DOAR pe acest plan, rescrie/șterge,
 * salvează structura curentă ca șablon nou, management (rename / default). ISTORIC-SAFE:
 * aplicarea atinge exclusiv itemii acestui plan; editarea unui șablon nu atinge niciun plan.
 */
import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { plansApi, orderTemplatesApi } from "@/lib/api/client";
import SaveTemplateModal from "./SaveTemplateModal";

const TYPE_TAG = { header: "secțiune", song: "cântec", media: "media", medley: "medley", item: "element", transition: "tranziție" };

export default function OrderTemplateModal({ planId, serviceTypeId, serviceTypeName, orderTemplateId, planSortDate, canEdit = false, onClose, onApplied, flash }) {
  const [rows, setRows] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [preview, setPreview] = useState({}); // tid → items[]
  const [confirm, setConfirm] = useState(null); // { kind, tid, name }
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveAs, setSaveAs] = useState(false);

  const planInPast = planSortDate ? new Date(planSortDate).getTime() < Date.now() : false;

  const load = useCallback(() => {
    orderTemplatesApi.list(serviceTypeId).then((r) => setRows(r.templates || [])).catch(() => setRows([]));
    plansApi.order(planId).then((r) => setOrderCount((r.items || []).length)).catch(() => setOrderCount(0));
  }, [serviceTypeId, planId]);
  useEffect(() => { load(); }, [load]);

  const current = (rows || []).find((t) => String(t.id) === String(orderTemplateId)) || null;

  function togglePreview(tid) {
    if (expandedId === tid) { setExpandedId(null); return; }
    setExpandedId(tid);
    if (!preview[tid]) orderTemplatesApi.get(tid).then((r) => setPreview((p) => ({ ...p, [tid]: r.items || [] }))).catch(() => setPreview((p) => ({ ...p, [tid]: [] })));
  }

  async function doApply(tid) {
    setBusy(true);
    try { const r = await plansApi.applyOrderTemplate(planId, tid); flash?.(`Șablon aplicat (${r.created} elemente).`); setConfirm(null); onApplied?.(); onClose?.(); }
    catch (e) { flash?.(e?.message || "Eroare la aplicare."); } finally { setBusy(false); }
  }
  async function doOverwrite(tid) {
    setBusy(true);
    try { await orderTemplatesApi.overwrite(tid, { planId }); flash?.("Șablon rescris din planul curent."); setConfirm(null); load(); setPreview((p) => ({ ...p, [tid]: undefined })); }
    catch (e) { flash?.(e?.message || "Eroare."); } finally { setBusy(false); }
  }
  async function doDelete(tid) {
    setBusy(true);
    try { await orderTemplatesApi.remove(tid); flash?.("Șablon șters."); setConfirm(null); load(); }
    catch (e) { flash?.(e?.message || "Eroare."); } finally { setBusy(false); }
  }
  async function setDefault(tid) {
    try { await orderTemplatesApi.update(tid, { isDefault: true }); load(); } catch (e) { flash?.(e?.message || "Eroare."); }
  }
  async function saveRename(tid) {
    const nm = editName.trim(); if (!nm) { setEditId(null); return; }
    try { await orderTemplatesApi.update(tid, { name: nm }); setEditId(null); load(); } catch (e) { flash?.(e?.message || "Eroare."); }
  }

  return (
    <Modal title="Arrangement order" width={600} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Închide</button>
        {canEdit && <button className="btn btn-primary" onClick={() => setSaveAs(true)} disabled={busy}>Salvează structura curentă ca șablon nou</button>}
      </>}>
      <div className="otm">
        <div className="otm-cur">
          <span className="otm-cur-l">Șablon curent</span>
          <span className="otm-cur-v">{current ? current.name : "— niciunul asociat —"}</span>
          {orderCount !== null && <span className="otm-cnt">{orderCount} elemente în Order acum</span>}
        </div>

        <div className="otm-safe">Aplicarea unui șablon rescrie ordinea <b>doar a acestui plan</b>. Planurile din istoric nu sunt afectate. Editarea unui șablon nu schimbă niciun plan.</div>

        {rows === null ? <Skeleton lines={4} /> : !rows.length ? (
          <div className="otm-none">Niciun șablon încă. Folosește „Salvează structura curentă ca șablon nou".</div>
        ) : (
          <div className="otm-list">
            {rows.map((t) => {
              const isCur = String(t.id) === String(orderTemplateId);
              const open = expandedId === t.id;
              return (
                <div key={t.id} className={`otm-card ${isCur ? "cur" : ""}`}>
                  <div className="oc-head">
                    {editId === t.id ? (
                      <input className="oc-edit" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRename(t.id); if (e.key === "Escape") setEditId(null); }} onBlur={() => saveRename(t.id)} />
                    ) : (
                      <button className="oc-name" onClick={() => togglePreview(t.id)}>
                        <span className="oc-caret">{open ? "▾" : "▸"}</span>{t.name}
                      </button>
                    )}
                    <div className="oc-badges">
                      {isCur && <span className="oc-b cur">curent</span>}
                      {t.isDefault && <span className="oc-b def">default</span>}
                      {t.serviceTypeId == null && <span className="oc-b glob">global</span>}
                      <span className="oc-b cnt">{t.itemCount}</span>
                    </div>
                  </div>

                  {open && (
                    <div className="oc-prev">
                      {preview[t.id] === undefined ? <Skeleton lines={3} /> : !preview[t.id].length ? <div className="oc-pnone">Gol.</div> : (
                        preview[t.id].map((it, i) => (
                          <div key={i} className={`oc-row ${it.type === "header" ? "hdr" : ""}`}>
                            <span className="oc-t">{it.title || "—"}</span>
                            {it.keyName && <span className="oc-key">{it.keyName}</span>}
                            <span className="oc-type">{TYPE_TAG[it.type] || it.type}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {canEdit && (
                    confirm && confirm.tid === t.id ? (
                      <div className={`oc-confirm ${confirm.kind === "apply" && (orderCount > 0 || planInPast) ? "warn" : ""}`}>
                        <div className="ocf-t">
                          {confirm.kind === "apply" && <>Rescrii complet ordinea <b>acestui plan</b> cu „{t.name}".{orderCount > 0 && ` Cele ${orderCount} elemente actuale se înlocuiesc.`}{planInPast && " ⚠ Acest plan e în trecut."}</>}
                          {confirm.kind === "overwrite" && <>Rescrii șablonul „{t.name}" cu structura planului curent? (Planurile existente NU se schimbă.)</>}
                          {confirm.kind === "delete" && <>Ștergi șablonul „{t.name}"?</>}
                        </div>
                        <div className="ocf-b">
                          <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>Anulează</button>
                          <button className="btn btn-primary" disabled={busy}
                            onClick={() => confirm.kind === "apply" ? doApply(t.id) : confirm.kind === "overwrite" ? doOverwrite(t.id) : doDelete(t.id)}>
                            {busy ? "…" : confirm.kind === "apply" ? "Aplică" : confirm.kind === "overwrite" ? "Rescrie" : "Șterge"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="oc-actions">
                        <button className="oc-apply" onClick={() => setConfirm({ kind: "apply", tid: t.id })}>Aplică pe acest plan</button>
                        <button className="oc-act" onClick={() => setConfirm({ kind: "overwrite", tid: t.id })}>Rescrie din planul curent</button>
                        {!t.isDefault && t.serviceTypeId != null && <button className="oc-act" onClick={() => setDefault(t.id)}>Fă default</button>}
                        <button className="oc-act" onClick={() => { setEditId(t.id); setEditName(t.name); }}>Redenumește</button>
                        <button className="oc-act del" onClick={() => setConfirm({ kind: "delete", tid: t.id })}>Șterge</button>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {saveAs && <SaveTemplateModal planId={planId} serviceTypeId={serviceTypeId} serviceTypeName={serviceTypeName} onClose={() => setSaveAs(false)} onSaved={load} flash={flash} />}

      <style jsx>{`
        .otm { display: flex; flex-direction: column; }
        .otm-cur { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 11px 13px; }
        .otm-cur-l { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; }
        .otm-cur-v { color: var(--text); font-size: 14px; font-weight: 600; }
        .otm-cnt { color: var(--text-faint); font-size: 12px; margin-left: auto; }
        .otm-safe { color: var(--text-dim); font-size: 11.5px; line-height: 1.5; background: rgba(47,129,247,.08); border: 1px solid rgba(47,129,247,.25); border-radius: 8px; padding: 8px 11px; margin: 11px 0; }
        .otm-safe b { color: var(--text); }
        .otm-none { color: var(--text-faint); font-size: 13px; padding: 14px 2px; }
        .otm-list { display: flex; flex-direction: column; gap: 9px; max-height: 50vh; overflow: auto; }
        .otm-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
        .otm-card.cur { border-color: var(--primary); box-shadow: inset 2px 0 0 var(--primary); }
        .oc-head { display: flex; align-items: center; gap: 8px; }
        .oc-name { display: flex; align-items: center; gap: 7px; background: transparent; border: none; color: var(--text); font-size: 13.5px; font-weight: 600; cursor: pointer; text-align: left; padding: 0; min-width: 0; }
        .oc-caret { color: var(--text-faint); font-size: 11px; }
        .oc-edit { flex: 1; background: var(--surface-3); border: 1px solid var(--primary); border-radius: 6px; color: var(--text); padding: 5px 8px; font-size: 13px; font-family: inherit; }
        .oc-badges { display: flex; align-items: center; gap: 5px; margin-left: auto; flex: none; }
        .oc-b { font-size: 9.5px; text-transform: uppercase; letter-spacing: .3px; font-weight: 700; border-radius: 5px; padding: 1px 6px; }
        .oc-b.cur { color: #fff; background: var(--primary); }
        .oc-b.def { color: var(--product); border: 1px solid var(--product); }
        .oc-b.glob { color: var(--text-faint); border: 1px solid var(--border-strong); }
        .oc-b.cnt { color: var(--text-faint); border: 1px solid var(--border-strong); }
        .oc-prev { margin-top: 8px; display: flex; flex-direction: column; gap: 3px; border-top: 1px solid var(--border); padding-top: 8px; }
        .oc-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-dim); padding: 2px 0; }
        .oc-row.hdr { color: var(--text); font-weight: 700; text-transform: uppercase; font-size: 10.5px; letter-spacing: .3px; }
        .oc-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .oc-key { color: #fff; background: #6fa02e; font-size: 9.5px; font-weight: 700; border-radius: 999px; padding: 1px 6px; flex: none; }
        .oc-type { color: var(--text-faint); font-size: 10px; flex: none; }
        .oc-pnone { color: var(--text-faint); font-size: 12px; }
        .oc-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
        .oc-apply { background: var(--primary); border: none; color: #fff; border-radius: 7px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .oc-apply:hover { filter: brightness(1.08); }
        .oc-act { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; padding: 6px 11px; font-size: 12px; cursor: pointer; }
        .oc-act:hover { color: var(--text); border-color: var(--text-faint); }
        .oc-act.del:hover { color: var(--danger); border-color: var(--danger); }
        .oc-confirm { margin-top: 9px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; padding: 9px 11px; }
        .oc-confirm.warn { border-color: var(--danger); background: rgba(229,83,75,.08); }
        .ocf-t { color: var(--text-dim); font-size: 12px; line-height: 1.5; margin-bottom: 8px; }
        .ocf-t b { color: var(--text); }
        .ocf-b { display: flex; justify-content: flex-end; gap: 8px; }
      `}</style>
    </Modal>
  );
}
