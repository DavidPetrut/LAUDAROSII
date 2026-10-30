"use client";
/**
 * Editor oră de plan (Times) — dată + oră în format 24h (FĂRĂ AM/PM, cerință David) + nume + tip.
 * Service / Repetiție (rehearsal) / Alt timp. Ziua (3 litere RO + culoare) se calculează automat din dată.
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { plansApi } from "@/lib/api/client";

const TYPES = [["service", "Service"], ["rehearsal", "Repetiție"], ["other", "Alt timp"]];
const HHMM = /^\d{1,2}:\d{2}$/;
const norm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim()); if (!m) return ""; const h = Math.min(23, parseInt(m[1], 10)); const mi = Math.min(59, parseInt(m[2], 10)); return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`; };

export default function TimeEditModal({ planId, time, defaultType = "rehearsal", onClose, onSaved }) {
  const editing = !!time;
  const [type, setType] = useState(time?.type || defaultType);
  const [name, setName] = useState(time?.name || "");
  const [date, setDate] = useState(time?.dateISO || "");
  const [start, setStart] = useState(time?.startTime || "");
  const [end, setEnd] = useState(time?.endTime || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr("");
    if (!date) return setErr("Alege data.");
    const s = norm(start); if (!HHMM.test(start) || !s) return setErr("Ora de început trebuie în format 24h HH:MM (ex. 17:30).");
    const e = end.trim() ? norm(end) : "";
    if (end.trim() && !e) return setErr("Ora de final trebuie în format 24h HH:MM.");
    if (e && e < s) return setErr("Ora de final e înaintea celei de început.");
    setBusy(true);
    try {
      const payload = { type, name, date, startTime: s, endTime: e };
      if (editing) await plansApi.updateTime(planId, time.id, payload);
      else await plansApi.addTime(planId, payload);
      onSaved?.();
    } catch (ex) { setErr(ex?.message || "Eroare la salvare."); } finally { setBusy(false); }
  }
  async function del() {
    if (!editing || !confirm("Ștergi această oră?")) return;
    setBusy(true);
    try { await plansApi.deleteTime(planId, time.id); onSaved?.(); } catch (ex) { setErr(ex?.message || "Eroare."); setBusy(false); }
  }

  return (
    <Modal title={editing ? "Editează ora" : "Adaugă oră"} width={440} onClose={onClose}
      footer={
        <>
          {editing && <button className="btn btn-ghost" style={{ marginRight: "auto", color: "var(--danger)" }} onClick={del} disabled={busy}>Șterge</button>}
          <button className="btn btn-ghost" onClick={onClose}>Anulează</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Se salvează…" : "Salvează"}</button>
        </>
      }
    >
      <div className="te">
        <label>Tip</label>
        <div className="seg">{TYPES.map(([v, l]) => <button key={v} className={type === v ? "on" : ""} onClick={() => setType(v)}>{l}</button>)}</div>

        <label>Nume (opțional)</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "rehearsal" ? "Repetiție" : type === "service" ? "Service" : "Ex: Rugăciune"} />

        <label>Dată</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="row2">
          <div><label>De la (24h)</label><input className="input" value={start} onChange={(e) => setStart(e.target.value)} placeholder="17:30" inputMode="numeric" /></div>
          <div><label>Până la (opțional)</label><input className="input" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="20:00" inputMode="numeric" /></div>
        </div>
        <div className="hint">Format 24h, fără AM/PM: 01:00 … 23:59.</div>
        {err && <div className="err">{err}</div>}
      </div>
      <style jsx>{`
        .te { display: flex; flex-direction: column; gap: 6px; }
        label { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; margin-top: 8px; }
        .seg { display: flex; gap: 4px; background: var(--surface-2); border-radius: 8px; padding: 3px; }
        .seg button { flex: 1; background: transparent; border: none; color: var(--text-dim); border-radius: 6px; padding: 7px 4px; font-size: 12.5px; cursor: pointer; }
        .seg button.on { background: var(--primary); color: #fff; font-weight: 600; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .hint { color: var(--text-faint); font-size: 11px; margin-top: 4px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 8px 10px; border-radius: 6px; font-size: 12.5px; margin-top: 6px; }
        :global(.te .input[type="date"]) { color-scheme: dark; }
      `}</style>
    </Modal>
  );
}
