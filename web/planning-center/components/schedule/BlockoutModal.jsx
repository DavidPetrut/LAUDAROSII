"use client";
/**
 * Blockout Dates — modal centrat (mare), ca în PCO. Stânga: calendar clickabil (click = zi, drag = interval;
 * zilele trecute disabled; blockout-urile existente cu fundal roz). Dreapta: Repeat SUS (exclusiv cu intervalul),
 * apoi date (interval când „Fără", o singură dată de bază când se repetă), All Day + ore, Reason,
 * lista intervalelor de salvat + panoul de CONFLICTE (view-only). REGULĂ: dacă există conflict, NU se poate salva.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scheduleApi } from "@/lib/api/client";
import PersonAvatar from "@/components/plans/PersonAvatar";

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const WD = ["DUM", "LUN", "MAR", "MIE", "JOI", "VIN", "SÂM"];
const REPEATS = [["none", "Fără"], ["weekly", "Săptămânal"], ["monthly", "Lunar"], ["yearly", "Anual"]];
const pad = (n) => String(n).padStart(2, "0");
const dsOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const todayISO = () => { const d = new Date(); return dsOf(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
const shift = (ds, n) => { const d = new Date(ds + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function rangeDays(a, b) { if (b < a) { const t = a; a = b; b = t; } const out = []; let d = a; while (d <= b) { out.push(d); d = shift(d, 1); } return out; }
function runsOf(set) { const arr = [...set].sort(); const out = []; let cur = null; for (const d of arr) { if (cur && shift(cur.end, 1) === d) cur.end = d; else { cur = { start: d, end: d }; out.push(cur); } } return out; }

export default function BlockoutModal({ onClose, onSaved }) {
  const now = new Date();
  const [cal, setCal] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [sel, setSel] = useState(new Set());       // zile selectate (YYYY-MM-DD)
  const [repeat, setRepeat] = useState("none");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [existing, setExisting] = useState(new Set());
  const [conflicts, setConflicts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const drag = useRef(null); // {anchor}
  const [hoverRange, setHoverRange] = useState(null); // {anchor, cur}

  const today = todayISO();

  // blockout-urile existente → fundal roz (interval literal, pt. afișare)
  useEffect(() => {
    scheduleApi.blockouts().then((r) => {
      const s = new Set();
      for (const b of r.blockouts || []) for (const d of rangeDays(b.startDate, b.endDate)) s.add(d);
      setExisting(s);
    }).catch(() => {});
  }, []);

  // conflicte pe zilele selectate (view-only) — debounce
  useEffect(() => {
    if (!sel.size) { setConflicts([]); return; }
    const arr = [...sel].sort();
    const t = setTimeout(async () => {
      try { const r = await scheduleApi.conflicts(arr[0], arr[arr.length - 1]); setConflicts((r.conflicts || []).filter((c) => sel.has(c.dateStr))); }
      catch { setConflicts([]); }
    }, 280);
    return () => clearTimeout(t);
  }, [sel]);

  const runs = useMemo(() => runsOf(sel), [sel]);
  const selSorted = useMemo(() => [...sel].sort(), [sel]);

  function toggleDay(ds) {
    if (ds < today) return;
    if (repeat !== "none") { setSel(new Set([ds])); return; } // repeat = o singură dată de bază
    setSel((s) => { const n = new Set(s); if (n.has(ds)) n.delete(ds); else n.add(ds); return n; });
  }
  function onDown(ds) {
    if (ds < today) return;
    if (repeat !== "none") { setSel(new Set([ds])); return; }
    drag.current = { anchor: ds }; setHoverRange({ anchor: ds, cur: ds });
  }
  function onEnter(ds) { if (drag.current && ds >= today) setHoverRange({ anchor: drag.current.anchor, cur: ds }); }
  function onUp() {
    if (!drag.current || !hoverRange) { drag.current = null; return; }
    const { anchor, cur } = hoverRange;
    if (anchor === cur) toggleDay(anchor);
    else setSel((s) => { const n = new Set(s); for (const d of rangeDays(anchor, cur)) if (d >= today) n.add(d); return n; });
    drag.current = null; setHoverRange(null);
  }

  // start/end inputs ↔ calendar (interval contiguu)
  const first = selSorted[0] || "";
  const last = selSorted[selSorted.length - 1] || "";
  const setRange = (a, b) => { if (!a) return; const bb = b && b >= a ? b : a; setSel(new Set(rangeDays(a, bb).filter((d) => d >= today))); };

  function onMonth(dir) {
    if (dir === 0) { setCal({ year: now.getFullYear(), month: now.getMonth() + 1 }); return; }
    setCal((c) => { let m = c.month + dir, y = c.year; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } return { year: y, month: m }; });
  }

  async function save() {
    setErr("");
    if (!runs.length) return setErr("Alege cel puțin o zi din calendar.");
    if (conflicts.length) return setErr("Ai conflicte în interval — nu poți salva. Vezi lista din dreapta.");
    if (!allDay && startTime && endTime && endTime < startTime) return setErr("Ora de final e înaintea celei de început.");
    const payload = runs.map((r) => ({ startDate: r.start, endDate: repeat !== "none" ? r.start : r.end, allDay, startTime: allDay ? "" : startTime, endTime: allDay ? "" : endTime, repeat, reason }));
    setSaving(true);
    try { const res = await scheduleApi.addBlockout({ blockouts: payload }); onSaved?.(res); }
    catch (e) { setErr(e?.message || "Eroare la salvare."); }
    finally { setSaving(false); }
  }

  // grid
  const { year, month } = cal;
  const firstWd = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const inHover = (ds) => hoverRange && (() => { const a = hoverRange.anchor, c = hoverRange.cur, lo = a < c ? a : c, hi = a < c ? c : a; return ds >= lo && ds <= hi; })();

  const canSave = runs.length > 0 && conflicts.length === 0 && !saving;

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()} onMouseUp={onUp}>
      <div className="bd">
        <div className="bd-h"><h3>Blockout Dates</h3><button className="x" onClick={onClose}>✕</button></div>
        <div className="bd-body">
          {/* ── calendar ── */}
          <div className="bd-cal">
            <div className="cal-h">
              <span className="cal-m">{MONTHS[month - 1]} {year}</span>
              <span className="cal-nav"><button onClick={() => onMonth(-1)}>‹</button><button onClick={() => onMonth(0)}>•</button><button onClick={() => onMonth(1)}>›</button></span>
            </div>
            <div className="cal-wd">{WD.map((w) => <span key={w}>{w}</span>)}</div>
            <div className="cal-grid">
              {cells.map((d, i) => {
                if (!d) return <span key={i} className="cc empty" />;
                const ds = dsOf(year, month, d);
                const past = ds < today;
                const selected = sel.has(ds);
                const hov = inHover(ds);
                const ex = existing.has(ds);
                return (
                  <button key={i} className={`cc ${past ? "past" : ""} ${selected ? "on" : ""} ${hov ? "hov" : ""} ${ex ? "ex" : ""}`}
                    disabled={past}
                    onPointerDown={() => onDown(ds)} onPointerEnter={() => onEnter(ds)}>
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="cal-leg"><span><i className="lg on" /> selectat</span><span><i className="lg ex" /> blocat deja</span></div>
          </div>

          {/* ── panou dreapta ── */}
          <div className="bd-side">
            {conflicts.length > 0 && (
              <div className="confl">
                <div className="cf-h"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>{conflicts.length} {conflicts.length === 1 ? "conflict" : "conflicte"} — nu poți salva</div>
                <div className="cf-note">Ești deja programat în interval. Blockout-ul nu se poate pune peste o programare. Rezolvă din programul tău sau vorbește cu planificatorul.</div>
                <div className="cf-list">
                  {conflicts.slice(0, 8).map((c, i) => (
                    <div key={i} className="cf-row">
                      <PersonAvatar person={{ avatar: c.avatar, initials: c.initials }} size={22} />
                      <div className="cf-txt"><span className="cf-d">{c.dateLabel}</span><span className="cf-l">{c.serviceTypeName} · {c.positionName}</span></div>
                      <span className={`cf-s ${c.status}`}>{c.status === "confirmed" ? "✓" : "?"}</span>
                    </div>
                  ))}
                  {conflicts.length > 8 && <div className="cf-more">+{conflicts.length - 8} altele</div>}
                </div>
              </div>
            )}

            <div className="fld">
              <label>Repeat</label>
              <div className="seg">{REPEATS.map(([v, l]) => <button key={v} className={repeat === v ? "on" : ""} onClick={() => { setRepeat(v); if (v !== "none" && sel.size > 1) setSel(new Set([selSorted[0]])); }}>{l}</button>)}</div>
            </div>

            {repeat === "none" ? (
              <div className="fld-row">
                <div className="fld"><label>Start Date</label><input type="date" min={today} value={first} onChange={(e) => setRange(e.target.value, last)} /></div>
                <div className="fld"><label>End Date</label><input type="date" min={first || today} value={last} onChange={(e) => setRange(first || e.target.value, e.target.value)} /></div>
              </div>
            ) : (
              <div className="fld"><label>Dată de bază (se repetă {REPEATS.find((r) => r[0] === repeat)?.[1].toLowerCase()})</label><input type="date" min={today} value={first} onChange={(e) => setSel(new Set([e.target.value]))} /></div>
            )}

            <div className="fld">
              <label className="tgl-l"><span>Toată ziua</span>
                <button className={`tgl ${allDay ? "on" : ""}`} onClick={() => setAllDay((v) => !v)}><i /></button>
              </label>
              {!allDay && (
                <div className="fld-row" style={{ marginTop: 8 }}>
                  <div className="fld"><label>De la</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
                  <div className="fld"><label>Până la</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
                </div>
              )}
            </div>

            <div className="fld"><label>Reason</label><input type="text" maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opțional (ex: plecat din oraș)" /></div>

            {runs.length > 0 && (
              <div className="runs">
                <div className="runs-h">De salvat ({runs.length})</div>
                {runs.map((r, i) => (
                  <div key={i} className="run">
                    <span>{r.start === r.end ? r.start : `${r.start} → ${r.end}`}{repeat !== "none" ? ` · ${REPEATS.find((x) => x[0] === repeat)?.[1].toLowerCase()}` : ""}</span>
                    <button onClick={() => setSel((s) => { const n = new Set(s); for (const d of rangeDays(r.start, r.end)) n.delete(d); return n; })}>🗑</button>
                  </div>
                ))}
              </div>
            )}
            {err && <div className="err">{err}</div>}
          </div>
        </div>

        <div className="bd-foot">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" disabled={!canSave} onClick={save}>{saving ? "Se salvează…" : `Salvează ${runs.length || 0} ${runs.length === 1 ? "blockout" : "blockout-uri"}`}</button>
        </div>
      </div>

      <style jsx>{`
        .ov { position: fixed; inset: 0; z-index: 70; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .bd { width: 920px; max-width: 100%; max-height: calc(100vh - 48px); background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 24px 70px rgba(0,0,0,.55); }
        .bd-h { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 12px; }
        .bd-h h3 { margin: 0; font-size: 19px; font-weight: 600; }
        .x { background: transparent; border: none; color: var(--text-dim); font-size: 15px; cursor: pointer; }
        .bd-body { display: grid; grid-template-columns: 1fr 360px; gap: 0; overflow: hidden; flex: 1; min-height: 0; }
        .bd-cal { padding: 10px 22px 18px; border-right: 1px solid var(--border); overflow: auto; }
        .cal-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .cal-m { color: var(--text); font-weight: 600; font-size: 15px; }
        .cal-nav button { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 16px; width: 26px; height: 26px; border-radius: 6px; }
        .cal-nav button:hover { color: var(--text); background: rgba(255,255,255,.06); }
        .cal-wd { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 6px; }
        .cal-wd span { text-align: center; color: var(--text-faint); font-size: 10px; letter-spacing: .4px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; user-select: none; }
        .cc { aspect-ratio: 1.1; display: flex; align-items: center; justify-content: center; background: var(--surface-2); border: 1px solid transparent; border-radius: 8px; color: var(--text); font-size: 14px; cursor: pointer; }
        .cc.empty { background: transparent; cursor: default; }
        .cc:not(.empty):not(.past):hover { border-color: var(--border-strong); }
        .cc.past { color: var(--text-faint); opacity: .4; cursor: default; background: transparent; }
        .cc.ex { background: rgba(229,83,75,.22); color: #f0a7a2; }
        .cc.hov { background: rgba(47,129,247,.28); }
        .cc.on { background: var(--primary); color: #fff; font-weight: 600; }
        .cal-leg { display: flex; gap: 16px; margin-top: 12px; color: var(--text-faint); font-size: 11px; }
        .cal-leg span { display: inline-flex; align-items: center; gap: 6px; }
        .lg { width: 11px; height: 11px; border-radius: 3px; } .lg.on { background: var(--primary); } .lg.ex { background: rgba(229,83,75,.5); }
        .bd-side { padding: 14px 20px 18px; overflow: auto; display: flex; flex-direction: column; gap: 14px; }
        .confl { background: rgba(229,83,75,.1); border: 1px solid rgba(229,83,75,.4); border-radius: 9px; padding: 11px 12px; }
        .cf-h { display: flex; align-items: center; gap: 8px; color: #f0a7a2; font-weight: 700; font-size: 13px; }
        .cf-note { color: var(--text-dim); font-size: 11.5px; margin: 6px 0 8px; line-height: 1.5; }
        .cf-list { display: flex; flex-direction: column; gap: 6px; }
        .cf-row { display: flex; align-items: center; gap: 8px; }
        .cf-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .cf-d { color: var(--text); font-size: 12.5px; font-weight: 600; }
        .cf-l { color: var(--text-faint); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cf-s { flex: none; font-weight: 800; font-size: 12px; } .cf-s.confirmed { color: var(--product); } .cf-s.unconfirmed { color: var(--st-unconfirmed); }
        .cf-more { color: var(--text-faint); font-size: 11.5px; }
        .fld { display: flex; flex-direction: column; gap: 6px; }
        .fld > label { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
        .fld-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .fld input { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); padding: 8px 10px; font-size: 13px; font-family: inherit; color-scheme: dark; }
        .fld input:focus { outline: none; border-color: var(--primary); }
        .seg { display: flex; gap: 4px; background: var(--surface-2); border-radius: 8px; padding: 3px; }
        .seg button { flex: 1; background: transparent; border: none; color: var(--text-dim); border-radius: 6px; padding: 6px 4px; font-size: 12px; cursor: pointer; }
        .seg button.on { background: var(--primary); color: #fff; font-weight: 600; }
        .tgl-l { flex-direction: row; align-items: center; justify-content: space-between; color: var(--text) !important; font-size: 13px !important; text-transform: none !important; letter-spacing: 0 !important; }
        .tgl { width: 38px; height: 22px; border-radius: 12px; background: var(--surface-3); border: 1px solid var(--border-strong); position: relative; cursor: pointer; }
        .tgl i { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--text-dim); transition: transform .14s, background .14s; }
        .tgl.on { background: var(--primary); border-color: var(--primary); } .tgl.on i { transform: translateX(16px); background: #fff; }
        .runs { background: var(--surface-2); border-radius: 9px; padding: 8px 10px; }
        .runs-h { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 6px; }
        .run { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; color: var(--text); padding: 4px 0; }
        .run button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 13px; }
        .run button:hover { color: var(--danger); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 11px; border-radius: 7px; font-size: 12.5px; }
        .bd-foot { display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding: 14px 22px; border-top: 1px solid var(--border); }
        .btn-cancel { background: transparent; border: none; color: var(--text-dim); font-size: 13.5px; cursor: pointer; }
        .btn-save { background: var(--primary); border: none; color: #fff; border-radius: 8px; padding: 9px 18px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
        .btn-save:disabled { opacity: .45; cursor: default; }
        @media (max-width: 820px) { .bd-body { grid-template-columns: 1fr; } .bd-cal { border-right: none; border-bottom: 1px solid var(--border); } }
      `}</style>
    </div>
  );
}
