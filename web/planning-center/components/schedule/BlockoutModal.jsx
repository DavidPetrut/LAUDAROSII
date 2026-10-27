"use client";
/**
 * BlockoutModal — „Block out dates" (ca în PCO), self-service pe web. /api/pc/v1/schedule/blockouts.
 * Interval (o zi sau mai multe) · toată ziua sau interval orar · repetare · motiv.
 * Previzualizare LIVE a conflictelor (programări în interval) — cele neconfirmate/fără email se
 * auto-refuză la salvare (doar DB). Emailul către admini e trimis de backend la acțiunea ta.
 */
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import { scheduleApi } from "@/lib/api/client";

const REPEATS = [["none", "Fără"], ["weekly", "Săptămânal"], ["monthly", "Lunar"], ["yearly", "Anual"]];
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function BlockoutModal({ onClose, onSaved }) {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [repeat, setRepeat] = useState("none");
  const [reason, setReason] = useState("");
  const [conflicts, setConflicts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tmr = useRef(null);

  const endEff = endDate && endDate >= startDate ? endDate : startDate;

  // previzualizare conflicte (debounce) când se schimbă intervalul
  useEffect(() => {
    if (!startDate) { setConflicts(null); return; }
    clearTimeout(tmr.current);
    tmr.current = setTimeout(async () => {
      try { const r = await scheduleApi.conflicts(startDate, endEff); setConflicts(r.conflicts || []); }
      catch { setConflicts(null); }
    }, 320);
    return () => clearTimeout(tmr.current);
  }, [startDate, endEff]);

  async function save() {
    setErr("");
    if (!startDate) { setErr("Alege data de început."); return; }
    if (endDate && endDate < startDate) { setErr("Data de final e înaintea celei de început."); return; }
    if (!allDay && startTime && endTime && endTime < startTime) { setErr("Ora de final e înaintea celei de început."); return; }
    setBusy(true);
    try {
      const r = await scheduleApi.addBlockout({
        startDate, endDate: endEff, allDay,
        startTime: allDay ? "" : startTime, endTime: allDay ? "" : endTime,
        repeat, reason: reason.trim(),
      });
      onSaved?.(r);
    } catch (e) { setErr(e?.message || "Eroare la salvare."); setBusy(false); }
  }

  const sentConflict = (conflicts || []).some((c) => c.status === "confirmed"); // informativ
  const footer = (
    <>
      <button className="bo-cl" onClick={onClose} disabled={busy}>Anulează</button>
      <button className="bo-sv" onClick={save} disabled={busy || !startDate}>{busy ? "Se salvează…" : "Blochează datele"}</button>
      <style jsx>{`
        .bo-cl { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 8px 18px; cursor: pointer; font-size: 13px; }
        .bo-sv { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 6px; padding: 8px 20px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .bo-sv:disabled, .bo-cl:disabled { opacity: .55; cursor: default; }
      `}</style>
    </>
  );

  return (
    <Modal title="Blochează date (indisponibil)" onClose={onClose} footer={footer} width={540}>
      {err && <div className="bo-err">{err}</div>}
      <div className="bo">
        <div className="bo-row">
          <label className="bo-f">De la<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label className="bo-f">Până la <span className="bo-opt">(opțional)</span><input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        </div>

        <button type="button" className={`bo-tg ${allDay ? "on" : ""}`} onClick={() => setAllDay((v) => !v)}>
          <span className="bo-sw"><span className="bo-dot" /></span>
          <span className="bo-tl">Toată ziua</span>
        </button>

        {!allDay && (
          <div className="bo-row bo-anim">
            <label className="bo-f">Ora de început<input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
            <label className="bo-f">Ora de final<input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
          </div>
        )}

        <div className="bo-field">
          <span className="bo-lbl">Repetă</span>
          <div className="bo-seg">
            {REPEATS.map(([v, l]) => (
              <button key={v} type="button" className={`bo-sb ${repeat === v ? "on" : ""}`} onClick={() => setRepeat(v)}>{l}</button>
            ))}
          </div>
        </div>

        <label className="bo-f full">Motiv <span className="bo-opt">(opțional)</span>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex. Concediu, plecat din țară…" maxLength={120} />
        </label>

        {/* previzualizare conflicte */}
        {conflicts != null && conflicts.length > 0 && (
          <div className="bo-conf">
            <div className="bo-ch">⚠ Ești programat în acest interval ({conflicts.length})</div>
            <div className="bo-cl-list">
              {conflicts.slice(0, 6).map((c, i) => (
                <div key={i} className="bo-crow">
                  <span className={`bo-cst ${c.status}`}>{c.status === "confirmed" ? "✓" : "?"}</span>
                  <span className="bo-cd">{c.dateLabel}</span>
                  <span className="bo-cl2">{c.label}</span>
                </div>
              ))}
              {conflicts.length > 6 && <div className="bo-more">+{conflicts.length - 6} altele</div>}
            </div>
            <div className="bo-note">La salvare, aceste poziții {sentConflict ? "confirmate " : ""}se vor marca <b>refuzat</b> automat (doar în DB, fără email de la tine).</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .bo-err { background: rgba(248,81,73,.12); border: 1px solid rgba(248,81,73,.4); color: var(--danger); font-size: 12.5px; padding: 8px 11px; border-radius: 7px; margin-bottom: 12px; }
        .bo { display: flex; flex-direction: column; gap: 14px; }
        .bo-row { display: flex; gap: 14px; }
        .bo-anim { animation: boIn .16s ease; }
        @keyframes boIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .bo-f { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; color: var(--text-faint); font-size: 11px; letter-spacing: .3px; text-transform: uppercase; }
        .bo-f.full { width: 100%; }
        .bo-opt { text-transform: none; letter-spacing: 0; opacity: .8; }
        .bo-f input { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; height: 36px; padding: 0 10px; color: var(--text); font-size: 13px; outline: none; font-family: inherit; color-scheme: dark; }
        .bo-f input:focus { border-color: var(--primary); }
        .bo-tg { display: flex; align-items: center; gap: 11px; background: transparent; border: none; cursor: pointer; padding: 2px 0; }
        .bo-sw { width: 34px; height: 20px; flex: none; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 20px; position: relative; transition: background .16s, border-color .16s; }
        .bo-dot { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--text-faint); transition: transform .16s, background .16s; }
        .bo-tg.on .bo-sw { background: rgba(47,129,247,.25); border-color: var(--primary); }
        .bo-tg.on .bo-dot { transform: translateX(14px); background: var(--primary); }
        .bo-tl { color: var(--text); font-size: 13px; }
        .bo-field { display: flex; flex-direction: column; gap: 6px; }
        .bo-lbl { color: var(--text-faint); font-size: 11px; letter-spacing: .3px; text-transform: uppercase; }
        .bo-seg { display: flex; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 8px; padding: 2px; gap: 2px; }
        .bo-sb { flex: 1; background: transparent; border: none; color: var(--text-dim); font-size: 12.5px; padding: 7px 0; border-radius: 6px; cursor: pointer; transition: background .13s, color .13s; }
        .bo-sb:hover { color: var(--text); }
        .bo-sb.on { background: var(--primary); color: #fff; font-weight: 600; }
        .bo-conf { background: var(--surface-2); border: 1px solid rgba(210,153,34,.4); border-radius: 9px; padding: 12px 13px; display: flex; flex-direction: column; gap: 9px; animation: boIn .18s ease; }
        .bo-ch { color: var(--st-unconfirmed); font-size: 12.5px; font-weight: 600; }
        .bo-cl-list { display: flex; flex-direction: column; gap: 5px; }
        .bo-crow { display: flex; align-items: center; gap: 9px; font-size: 12.5px; }
        .bo-cst { width: 18px; height: 18px; flex: none; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
        .bo-cst.confirmed { background: rgba(87,185,138,.18); color: var(--product); }
        .bo-cst.unconfirmed { background: rgba(210,153,34,.18); color: var(--st-unconfirmed); }
        .bo-cd { color: var(--text); font-weight: 600; min-width: 58px; }
        .bo-cl2 { color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bo-more { color: var(--text-faint); font-size: 11.5px; }
        .bo-note { color: var(--text-faint); font-size: 11.5px; line-height: 1.5; } .bo-note b { color: var(--st-declined); }
      `}</style>
    </Modal>
  );
}
