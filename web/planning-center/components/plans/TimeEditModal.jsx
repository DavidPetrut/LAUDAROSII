"use client";
/**
 * Editor oră de plan (Times). Se deschide pe UN singur tip (din „Setează" al rândului) — fără taburi care plutesc.
 * Nume + dată precompletate din service-type (slujbă = data planului; repetiție = data planului - dayOffset).
 * Chips preset (SIM 1 / SIM 2) completează orele; totul editabil. Oră 24h (fără AM/PM).
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { plansApi } from "@/lib/api/client";

const HHMM = /^\d{1,2}:\d{2}$/;
const norm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim()); if (!m) return ""; const h = Math.min(23, parseInt(m[1], 10)); const mi = Math.min(59, parseInt(m[2], 10)); return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`; };

const TYPE_META = {
  service: { label: "Slujire", color: "#57b98a", icon: "M4 10h16M4 14h16M7 4v2m10-2v2M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" },
  rehearsal: { label: "Repetiție", color: "#2f81f7", icon: "M9 18V5l12-2v13M9 13l12-2M6 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm15-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  other: { label: "Alt timp", color: "#a2abb6", icon: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
};

export default function TimeEditModal({ planId, time, defaultType = "rehearsal", meta = {}, onClose, onSaved }) {
  const editing = !!time;
  const type = time?.type || defaultType;
  const tm = TYPE_META[type] || TYPE_META.other;

  const defName = time?.name ?? (type === "service" ? (meta.defaultServiceName || "") : type === "rehearsal" ? "Repetiție" : "");
  const defDate = time?.dateISO || (type === "service" ? (meta.suggestedServiceDate || "")
    : type === "rehearsal" ? (meta.suggestedRehearsalDate || meta.suggestedServiceDate || "")
      : (meta.suggestedServiceDate || ""));
  const presets = Array.isArray(meta.timePresets) ? meta.timePresets.filter((p) => p && p.start) : [];

  const [name, setName] = useState(defName);
  const [date, setDate] = useState(defDate);
  const [start, setStart] = useState(time?.startTime || (type === "rehearsal" && meta.rehearsalTemplate?.start) || "");
  const [end, setEnd] = useState(time?.endTime || (type === "rehearsal" && meta.rehearsalTemplate?.end) || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function applyPreset(p) { setStart(p.start || ""); setEnd(p.end || ""); }

  async function save() {
    setErr("");
    if (!date) return setErr("Alege data.");
    const s = norm(start); if (!HHMM.test(start) || !s) return setErr("Ora de început trebuie în format HH:MM (ex. 17:30).");
    const e = end.trim() ? norm(end) : "";
    if (end.trim() && !e) return setErr("Ora de final trebuie în format HH:MM.");
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
    <Modal title={editing ? "Editează ora" : "Adaugă oră"} width={460} onClose={onClose}
      footer={
        <>
          {editing && <button className="btn btn-ghost" style={{ marginRight: "auto", color: "var(--danger)" }} onClick={del} disabled={busy}>Șterge</button>}
          <button className="btn btn-ghost" onClick={onClose}>Anulează</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Se salvează…" : "Salvează"}</button>
        </>
      }
    >
      <div className="te">
        <div className="te-type" style={{ "--tc": tm.color }}>
          <span className="te-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={tm.icon} /></svg></span>
          <span className="te-tl">{tm.label}</span>
        </div>

        <label>Nume</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tm.label} />

        <label>Dată</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        {presets.length > 0 && (
          <div className="te-presets">
            {presets.map((p, i) => (
              <button key={i} type="button" className={`te-chip ${start === p.start && end === p.end ? "on" : ""}`} onClick={() => applyPreset(p)}>
                {p.label || "Preset"}<span className="te-chiprange">{p.start}{p.end ? `–${p.end}` : ""}</span>
              </button>
            ))}
          </div>
        )}

        <div className="row2">
          <div><label>De la</label><input className="input" value={start} onChange={(e) => setStart(e.target.value)} placeholder="17:30" inputMode="numeric" /></div>
          <div><label>Până la</label><input className="input" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="20:00" inputMode="numeric" /></div>
        </div>
        {err && <div className="err">{err}</div>}
      </div>
      <style jsx>{`
        .te { display: flex; flex-direction: column; gap: 6px; }
        label { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; margin-top: 10px; }
        .te-type { display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; background: color-mix(in srgb, var(--tc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--tc) 40%, transparent); color: var(--tc); border-radius: 999px; padding: 6px 13px 6px 10px; }
        .te-ic { width: 17px; height: 17px; display: inline-flex; }
        .te-ic svg { width: 17px; height: 17px; }
        .te-tl { font-size: 13px; font-weight: 700; letter-spacing: .2px; }
        .te-presets { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
        .te-chip { display: inline-flex; align-items: baseline; gap: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 8px; padding: 6px 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all .14s ease; }
        .te-chip:hover { border-color: var(--primary); color: var(--text); transform: translateY(-1px); }
        .te-chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
        .te-chiprange { font-size: 11px; font-weight: 500; opacity: .75; font-variant-numeric: tabular-nums; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 8px 10px; border-radius: 6px; font-size: 12.5px; margin-top: 10px; }
        :global(.te .input) { transition: border-color .14s ease, box-shadow .14s ease; }
        :global(.te .input:focus) { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent); outline: none; }
        :global(.te .input[type="date"]) { color-scheme: dark; }
      `}</style>
    </Modal>
  );
}
