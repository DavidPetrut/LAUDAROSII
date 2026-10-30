"use client";
/**
 * „Save as Template" — salvează structura ORDER-ului curent ca șablon reutilizabil (pc_orderTemplates).
 * Arată toată structura (drag-drop pentru ordine + bifă pentru a include/scoate), un nume, scope
 * (acest service type / global) și „default" (apare pre-selectat la Add plan). La salvare nu se schimbă
 * nimic vizual pe plan — doar se creează șablonul.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { plansApi, orderTemplatesApi } from "@/lib/api/client";

const TYPE_TAG = { header: "secțiune", song: "cântec", media: "media", medley: "medley", item: "element" };

export default function SaveTemplateModal({ planId, serviceTypeId, serviceTypeName, onClose, onSaved, flash }) {
  const [rows, setRows] = useState(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("st"); // st | global
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragId = useRef(null);
  const [overId, setOverId] = useState(null);

  const load = useCallback(() => {
    plansApi.order(planId).then((r) => setRows((r.items || []).map((it) => ({ id: it.id, type: it.type, title: it.title || "—", keyName: it.keyName || "", include: true })))).catch(() => setRows([]));
  }, [planId]);
  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, include: !r.include } : r)));
  function onDrop(toId) {
    const fromId = dragId.current; dragId.current = null; setOverId(null);
    if (!fromId || fromId === toId) return;
    setRows((rs) => { const a = [...rs]; const fi = a.findIndex((x) => x.id === fromId); const ti = a.findIndex((x) => x.id === toId); if (fi < 0 || ti < 0) return rs; const [m] = a.splice(fi, 1); a.splice(ti, 0, m); return a; });
  }

  async function save() {
    const nm = name.trim();
    if (!nm) return flash?.("Dă un nume șablonului.");
    const itemIds = (rows || []).filter((r) => r.include).map((r) => r.id);
    if (!itemIds.length) return flash?.("Include cel puțin un element.");
    setBusy(true);
    try {
      await orderTemplatesApi.create({ planId, name: nm, serviceTypeId: scope === "global" ? null : serviceTypeId, isDefault, itemIds });
      flash?.("Șablon salvat.");
      onSaved?.(); onClose?.();
    } catch (e) { flash?.(e?.message || "Eroare la salvare."); } finally { setBusy(false); }
  }

  const countIncl = (rows || []).filter((r) => r.include).length;

  return (
    <Modal title="Salvează ca șablon" width={560} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose} disabled={busy}>Renunță</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Se salvează…" : "Salvează șablonul"}</button></>}>
      <div className="stm">
        <label className="stm-l">Nume șablon</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Duminică — structură standard" autoFocus />

        <div className="stm-opts">
          <label className="stm-radio"><input type="radio" checked={scope === "st"} onChange={() => setScope("st")} /> Pentru „{serviceTypeName || "acest service type"}"</label>
          <label className="stm-radio"><input type="radio" checked={scope === "global"} onChange={() => { setScope("global"); setIsDefault(false); }} /> Global (orice service type)</label>
        </div>
        {scope === "st" && <label className="stm-def"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Setează ca <b>default</b> (apare pre-selectat la Add plan)</label>}

        <div className="stm-h">Structură <span>{countIncl} incluse · trage ca să ordonezi</span></div>
        {rows === null ? <Skeleton lines={5} /> : !rows.length ? <div className="stm-none">Order-ul e gol.</div> : (
          <div className="stm-list">
            {rows.map((r) => (
              <div key={r.id} className={`stm-row ${r.include ? "" : "off"} ${overId === r.id ? "over" : ""} ${r.type === "header" ? "hdr" : ""}`}
                draggable onDragStart={() => { dragId.current = r.id; }} onDragEnd={() => { dragId.current = null; setOverId(null); }}
                onDragOver={(e) => { if (dragId.current) { e.preventDefault(); if (overId !== r.id) setOverId(r.id); } }} onDrop={() => onDrop(r.id)}>
                <span className="stm-drag">⋮⋮</span>
                <input type="checkbox" checked={r.include} onChange={() => toggle(r.id)} />
                <span className="stm-t">{r.title}</span>
                {r.keyName && <span className="stm-key">{r.keyName}</span>}
                <span className="stm-type">{TYPE_TAG[r.type] || r.type}</span>
              </div>
            ))}
          </div>
        )}
        <div className="stm-note">Se salvează structura (elemente, cântece, voci, alte slujiri). Oamenii/asignările se păstrează în șablon — le poți generaliza editând planul înainte de salvare. Nu se schimbă nimic pe planul curent.</div>
      </div>
      <style jsx>{`
        .stm { display: flex; flex-direction: column; }
        .stm-l { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 5px; }
        .stm-opts { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
        .stm-radio, .stm-def { display: flex; align-items: center; gap: 7px; color: var(--text-dim); font-size: 13px; cursor: pointer; }
        .stm-def { margin-top: 9px; }
        .stm-h { display: flex; align-items: center; justify-content: space-between; color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; margin: 16px 0 8px; }
        .stm-h span { text-transform: none; letter-spacing: 0; font-size: 11px; }
        .stm-none { color: var(--text-faint); font-size: 13px; padding: 8px 0; }
        .stm-list { display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow: auto; }
        .stm-row { display: flex; align-items: center; gap: 9px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 11px; font-size: 13px; color: var(--text); }
        .stm-row.hdr { background: var(--section-head-bg); font-weight: 700; text-transform: uppercase; font-size: 11.5px; letter-spacing: .4px; }
        .stm-row.off { opacity: .4; }
        .stm-row.over { box-shadow: inset 0 2px 0 var(--primary); }
        .stm-drag { color: var(--text-faint); cursor: grab; font-size: 12px; flex: none; }
        .stm-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .stm-key { color: #fff; background: #6fa02e; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 1px 7px; flex: none; }
        .stm-type { color: var(--text-faint); font-size: 10.5px; flex: none; }
        .stm-note { color: var(--text-faint); font-size: 11.5px; line-height: 1.5; margin-top: 12px; }
      `}</style>
    </Modal>
  );
}
