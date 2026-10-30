"use client";
/**
 * My Schedule (web) — IDENTIC cu mobilul + screenshot-urile PCO. /api/pc/v1/schedule/*.
 * Stânga: calendar LIVE (puncte verde=programat / roșu=blockout, tap-to-filter) + Blochează date / Subscribe
 * + lista următoarelor programări. Dreapta: butoane (Block Out / My Messages / Email My Leader) + secțiuni
 * Pending/Confirmed/Declined cu CARDURI (click → /plans/:planId, săptămâna aia, NU Matrix) + secțiune Blockouts
 * (header + carduri, ca Confirmed). Accept/Decline doar pe pending; o programare confirmată nu se mai refuză.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { scheduleApi } from "@/lib/api/client";
import { useAiSurface } from "@/lib/ai/useAiSurface";
import BlockoutModal from "@/components/schedule/BlockoutModal";

const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
const WD = ["DUM", "LUN", "MAR", "MIE", "JOI", "VIN", "SÂM"];
const REPEAT_LABEL = { weekly: "săptămânal", monthly: "lunar", yearly: "anual" };
const pad = (n) => String(n).padStart(2, "0");
const dsOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const todayISO = () => { const d = new Date(); return dsOf(d.getFullYear(), d.getMonth() + 1, d.getDate()); };

/* ───────── calendar live (stânga) ───────── */
function MiniCalendar({ cal, onMonth, calData, selDay, onSelDay }) {
  const { year, month } = cal;
  const firstWd = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const scheduled = new Set((calData?.scheduled || []).map((s) => s.date));
  const blocked = new Set(calData?.blockoutDays || []);
  const today = todayISO();
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return (
    <div className="cal">
      <div className="cal-h">
        <span className="cal-m">{MONTHS[month - 1]} {year}</span>
        <span className="cal-nav">
          <button onClick={() => onMonth(-1)} aria-label="Luna anterioară">‹</button>
          <button onClick={() => onMonth(0)} aria-label="Luna curentă">•</button>
          <button onClick={() => onMonth(1)} aria-label="Luna următoare">›</button>
        </span>
      </div>
      <div className="cal-wd">{WD.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={i} className="cal-c empty" />;
          const ds = dsOf(year, month, d);
          const isToday = ds === today, isSel = ds === selDay;
          const sch = scheduled.has(ds), blk = blocked.has(ds);
          return (
            <button key={i} className={`cal-c ${isToday ? "today" : ""} ${isSel ? "sel" : ""}`} onClick={() => onSelDay(isSel ? null : ds)}>
              <span className="cal-n">{d}</span>
              <span className="cal-dots">{sch && <i className="dot sch" />}{blk && <i className="dot blk" />}</span>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .cal { }
        .cal-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .cal-m { color: var(--text); font-weight: 600; font-size: 14px; }
        .cal-nav button { background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 15px; width: 24px; height: 24px; border-radius: 6px; }
        .cal-nav button:hover { color: var(--text); background: rgba(255,255,255,.06); }
        .cal-wd { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
        .cal-wd span { text-align: center; color: var(--text-faint); font-size: 9.5px; letter-spacing: .3px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .cal-c { position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: 8px; color: var(--text-dim); cursor: pointer; padding: 0; }
        .cal-c.empty { cursor: default; }
        .cal-c:not(.empty):hover { background: var(--surface-2); color: var(--text); }
        .cal-c.today { background: var(--surface-3); color: var(--text); }
        .cal-c.sel { border-color: var(--primary); color: var(--text); }
        .cal-n { font-size: 12.5px; }
        .cal-dots { position: absolute; bottom: 3px; display: flex; gap: 2px; }
        .dot { width: 4px; height: 4px; border-radius: 50%; }
        .dot.sch { background: var(--product); } .dot.blk { background: var(--danger); }
      `}</style>
    </div>
  );
}

/* ───────── card programare (dreapta) — identic cu mobilul ───────── */
function SchedCard({ g, kind, onOpen, onAccept, onDecline, busy }) {
  const [showTimes, setShowTimes] = useState(false);
  return (
    <div className={`card ${kind}`} onClick={() => onOpen(g.planId)}>
      <div className="c-head">
        <div className="c-dates">
          <div className="c-date">{g.dateLabel || g.dateStr}</div>
          <div className="c-st">{g.serviceTypeName}</div>
        </div>
        {(g.times || []).length > 0 && (
          <button className="c-clock" onClick={(e) => { e.stopPropagation(); setShowTimes((v) => !v); }} title="Ore">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.4 1.6" /></svg>
          </button>
        )}
      </div>
      {showTimes && (
        <div className="c-times" onClick={(e) => e.stopPropagation()}>
          {g.times.map((t, i) => <div key={i} className="ct-row"><span className="ct-n">{t.name}</span><span className="ct-r">{t.range}</span></div>)}
        </div>
      )}
      <div className="c-pos">
        {(g.positions || []).map((p, i) => (
          <div key={i} className="pos">
            <span className={`pdot ${p.status === "confirmed" ? "ok" : p.status === "declined" ? "no" : "un"}`}>
              {p.status === "confirmed" ? "✓" : p.status === "declined" ? "✕" : "?"}
            </span>
            <span className="pn">{p.positionName || p.name || "Poziție"}</span>
            {p.teamName && <span className="pt">{p.teamName}</span>}
          </div>
        ))}
      </div>
      {kind === "pending" && (
        <div className="c-act" onClick={(e) => e.stopPropagation()}>
          <button className="split" onClick={() => onOpen(g.planId)}>Split</button>
          <span style={{ flex: 1 }} />
          <button className="decline" disabled={busy} onClick={() => onDecline(g.planId)}>Decline</button>
          <button className="accept" disabled={busy} onClick={() => onAccept(g.planId)}>Accept</button>
        </div>
      )}
      <style jsx>{`
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 15px; cursor: pointer; transition: border-color .12s; }
        .card:hover { border-color: var(--border-strong); }
        .c-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .c-date { color: var(--text); font-weight: 600; font-size: 15px; }
        .c-st { color: var(--text-dim); font-size: 12.5px; margin-top: 2px; }
        .c-clock { background: transparent; border: none; color: var(--text-faint); cursor: pointer; padding: 2px; flex: none; }
        .c-clock:hover { color: var(--text); }
        .c-times { margin-top: 8px; background: var(--surface-2); border-radius: 7px; padding: 8px 10px; }
        .ct-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; padding: 2px 0; }
        .ct-n { color: var(--text-dim); } .ct-r { color: var(--text-faint); font-variant-numeric: tabular-nums; }
        .c-pos { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
        .pos { display: flex; align-items: center; gap: 8px; }
        .pdot { width: 17px; height: 17px; border-radius: 50%; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex: none; }
        .pdot.ok { background: var(--product); color: #0b2018; } .pdot.un { background: var(--st-unconfirmed); color: #1d1600; } .pdot.no { background: var(--danger); color: #fff; }
        .pn { color: var(--text); font-size: 13px; font-weight: 600; }
        .pt { color: var(--text-faint); font-size: 12px; }
        .c-act { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
        .split { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 7px; padding: 6px 12px; font-size: 12.5px; cursor: pointer; }
        .decline { background: transparent; border: 1px solid var(--danger); color: var(--danger); border-radius: 7px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .accept { background: var(--product); border: 1px solid var(--product); color: #0b2018; border-radius: 7px; padding: 6px 16px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .accept:disabled, .decline:disabled { opacity: .5; cursor: default; }
      `}</style>
    </div>
  );
}

/* ───────── card blockout ───────── */
function BlockoutCard({ b, onDelete, confirming, onAskDelete, onCancelDelete }) {
  return (
    <div className={`bc ${b.type === "churchBlock" ? "church" : ""}`}>
      <span className="bc-ic">{b.type === "churchBlock" ? "🔵" : "⛔"}</span>
      <div className="bc-mid">
        <div className="bc-dt">{b.label}{!b.allDay && b.startTime ? ` · ${b.startTime}–${b.endTime}` : " · toată ziua"}</div>
        <div className="bc-sub">
          {b.type === "churchBlock" ? "Blocat de echipă" : "Indisponibil"}
          {b.repeat && b.repeat !== "none" ? ` · se repetă ${REPEAT_LABEL[b.repeat] || b.repeat}` : ""}
          {b.reason ? ` · ${b.reason}` : ""}
        </div>
      </div>
      {b.type !== "churchBlock" && (
        confirming ? (
          <span className="bc-cfm"><button className="bc-yes" onClick={() => onDelete(b.id)}>Scoate</button><button className="bc-no" onClick={onCancelDelete}>Nu</button></span>
        ) : (
          <button className="bc-del" title="Scoate" onClick={() => onAskDelete(b.id)}>×</button>
        )
      )}
      <style jsx>{`
        .bc { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 13px 15px; }
        .bc.church { border-color: rgba(47,129,247,.4); background: rgba(47,129,247,.05); }
        .bc-ic { font-size: 15px; flex: none; }
        .bc-mid { flex: 1; min-width: 0; }
        .bc-dt { color: var(--text); font-size: 14px; font-weight: 600; }
        .bc-sub { color: var(--text-faint); font-size: 12px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bc-del { flex: none; background: transparent; border: none; color: var(--text-faint); font-size: 20px; line-height: 1; cursor: pointer; padding: 0 4px; border-radius: 6px; }
        .bc-del:hover { color: var(--danger); background: rgba(248,81,73,.1); }
        .bc-cfm { display: inline-flex; gap: 6px; }
        .bc-yes { background: var(--danger); border: none; color: #fff; border-radius: 6px; padding: 5px 11px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .bc-no { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 5px 11px; font-size: 12px; cursor: pointer; }
      `}</style>
    </div>
  );
}

export default function MySchedulePage() {
  const router = useRouter();
  const [data, setData] = useState({ pending: [], confirmed: [], declined: [] });
  const [blockouts, setBlockouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [busy, setBusy] = useState(null);
  const now = new Date();
  const [cal, setCal] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [calData, setCalData] = useState(null);
  const [selDay, setSelDay] = useState(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3600); };

  const load = useCallback(async () => {
    try { const [my, bo] = await Promise.all([scheduleApi.my(), scheduleApi.blockouts()]); setData({ pending: my.pending || [], confirmed: my.confirmed || [], declined: my.declined || [] }); setBlockouts(bo.blockouts || []); }
    catch (e) { setErr(e?.message || "Eroare."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadCal = useCallback(async (y, m) => { try { setCalData(await scheduleApi.calendar(y, m)); } catch { setCalData(null); } }, []);
  useEffect(() => { loadCal(cal.year, cal.month); }, [cal, loadCal]);

  function onMonth(dir) {
    if (dir === 0) { setCal({ year: now.getFullYear(), month: now.getMonth() + 1 }); setSelDay(null); return; }
    setCal((c) => { let m = c.month + dir, y = c.year; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } return { year: y, month: m }; });
    setSelDay(null);
  }

  useAiSurface({ id: "schedule.my", label: "Programul meu", scope: "page",
    getContext: () => ({ pending: data.pending?.length || 0, confirmed: data.confirmed?.length || 0, declined: data.declined?.length || 0, blockouts: blockouts.length }), actions: [] }, [data, blockouts]);

  const open = (id) => id && router.push(`/plans/${id}`);
  async function onSaved() { setShowAdd(false); flash("Date blocate."); load(); loadCal(cal.year, cal.month); }

  async function respond(planId, action) {
    setBusy(planId);
    try { await scheduleApi.planRespond(planId, action); flash(action === "accept" ? "Confirmat." : "Refuzat."); await load(); loadCal(cal.year, cal.month); }
    catch (e) { flash(e?.message || "Eroare."); } finally { setBusy(null); }
  }
  async function acceptAll() {
    setBusy("all");
    try { const r = await scheduleApi.acceptAll(); flash(`Confirmate: ${r?.modified || 0}.`); await load(); loadCal(cal.year, cal.month); }
    catch (e) { flash(e?.message || "Eroare."); } finally { setBusy(null); }
  }
  async function removeBlockout(id) {
    setConfirmDel(null); setBlockouts((b) => b.filter((x) => String(x.id) !== String(id)));
    try { await scheduleApi.removeBlockout(id); flash("Blockout scos."); loadCal(cal.year, cal.month); }
    catch (e) { flash(e?.message || "Eroare."); load(); }
  }

  // lista „următoarele" din stânga, din programări reale (filtrată pe ziua selectată)
  const upcoming = useMemo(() => {
    const all = [...(data.pending || []), ...(data.confirmed || [])].sort((a, b) => new Date(a.sortDate || a.dateStr) - new Date(b.sortDate || b.dateStr));
    return selDay ? all.filter((g) => g.dateStr === selDay) : all;
  }, [data, selDay]);

  const pendCount = (data.pending || []).length;
  const myBlockouts = blockouts;

  return (
    <div className="ms pc-full">
      <h1 className="page-title">My Schedule</h1>

      <div className="ms-layout">
        {/* stânga: calendar + acțiuni + listă */}
        <aside className="ms-left">
          <MiniCalendar cal={cal} onMonth={onMonth} calData={calData} selDay={selDay} onSelDay={setSelDay} />
          <div className="left-btns">
            <button className="lb" onClick={() => setShowAdd(true)}>+ Blochează date</button>
            <button className="lb" onClick={() => flash("Subscribe (iCal) — în curând.")}>Subscribe ▾</button>
          </div>
          <div className="up">
            {upcoming.length === 0 ? <div className="muted">{selDay ? "Nimic în ziua asta." : "Nicio programare."}</div> : upcoming.map((g, i) => (
              <div key={i} className="up-g">
                <div className="up-d">{g.dateLabel}</div>
                <button className="up-row" onClick={() => open(g.planId)}>
                  <span className={`updot ${g.positions.some((p) => p.status === "unconfirmed") ? "un" : "ok"}`} />
                  <span className="up-st">{g.serviceTypeName}</span>
                </button>
                {(g.times || []).map((t, j) => (
                  <div key={j} className="up-t"><span>{t.name}</span><span className="up-tr">{t.range}</span></div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* dreapta: butoane + secțiuni carduri */}
        <div className="ms-main">
          <div className="top-btns">
            <button className="tb" onClick={() => setShowAdd(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
              Block Out Dates
            </button>
            <button className="tb" onClick={() => flash("My Messages — în curând.")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 5h16v12H8l-4 4z" /></svg>
              My Messages
            </button>
            <button className="tb" onClick={() => flash("Email My Leader — în curând.")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
              Email My Leader
            </button>
          </div>

          {err && <div className="err">{err}</div>}
          {loading ? <div className="muted">Se încarcă…</div> : (
            <>
              {pendCount > 0 && (
                <>
                  <div className="sec"><span className="sec-t">Pending <b>{pendCount}</b></span><button className="sec-act" disabled={busy === "all"} onClick={acceptAll}>Accept all</button></div>
                  <div className="grid">{data.pending.map((g, i) => <SchedCard key={i} g={g} kind="pending" onOpen={open} onAccept={(id) => respond(id, "accept")} onDecline={(id) => respond(id, "decline")} busy={busy === g.planId} />)}</div>
                </>
              )}

              <div className="sec"><span className="sec-t">Confirmed <b>{(data.confirmed || []).length}</b></span></div>
              {(data.confirmed || []).length === 0 ? <div className="muted">Nimic confirmat.</div> : <div className="grid">{data.confirmed.map((g, i) => <SchedCard key={i} g={g} kind="confirmed" onOpen={open} />)}</div>}

              {(data.declined || []).length > 0 && (
                <>
                  <div className="sec"><span className="sec-t">Declined <b>{data.declined.length}</b></span></div>
                  <div className="grid">{data.declined.map((g, i) => <SchedCard key={i} g={g} kind="declined" onOpen={open} />)}</div>
                </>
              )}

              {/* Blockouts — header + carduri, ca Confirmed (cerință David) */}
              <div className="sec"><span className="sec-t">Blockouts <b>{myBlockouts.length}</b></span></div>
              {myBlockouts.length === 0 ? (
                <div className="bo-empty">Niciun interval blocat. Apasă <b>„Block Out Dates"</b> ca să marchezi când nu ești disponibil.</div>
              ) : (
                <div className="grid">{myBlockouts.map((b) => <BlockoutCard key={b.id} b={b} confirming={confirmDel === b.id} onAskDelete={setConfirmDel} onCancelDelete={() => setConfirmDel(null)} onDelete={removeBlockout} />)}</div>
              )}
            </>
          )}
        </div>
      </div>

      {showAdd && <BlockoutModal onClose={() => setShowAdd(false)} onSaved={onSaved} />}
      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .ms { padding: 18px 20px 70px; }
        .page-title { font-size: var(--fs-h1); font-weight: 600; margin: 0 0 16px; }
        .ms-layout { display: grid; grid-template-columns: 320px 1fr; gap: 26px; align-items: start; }
        .ms-left { position: sticky; top: calc(var(--nav-h) + 14px); background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .left-btns { display: flex; gap: 8px; margin: 14px 0; }
        .lb { flex: 1; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 8px; padding: 8px; font-size: 12.5px; cursor: pointer; }
        .lb:hover { color: var(--text); border-color: var(--primary); }
        .up { display: flex; flex-direction: column; gap: 4px; max-height: 46vh; overflow: auto; }
        .up-g { padding: 6px 0; border-top: 1px solid var(--border-soft); }
        .up-d { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px; }
        .up-row { display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: var(--text); font-size: 13px; cursor: pointer; padding: 2px 0; text-align: left; width: 100%; }
        .up-row:hover .up-st { text-decoration: underline; }
        .updot { width: 8px; height: 8px; border-radius: 50%; flex: none; } .updot.ok { background: var(--product); } .updot.un { background: var(--st-unconfirmed); }
        .up-t { display: flex; justify-content: space-between; gap: 10px; color: var(--text-faint); font-size: 11.5px; padding: 1px 0 1px 16px; }
        .up-tr { font-variant-numeric: tabular-nums; }
        .ms-main { min-width: 0; }
        .top-btns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
        .tb { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text); border-radius: 9px; padding: 13px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
        .tb:hover { border-color: var(--primary); }
        .sec { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 12px; }
        .sec-t { color: var(--text); font-size: 15px; } .sec-t b { color: var(--product); font-weight: 700; margin-left: 4px; }
        .sec-act { background: var(--product); border: none; color: #0b2018; border-radius: 7px; padding: 6px 14px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .sec-act:disabled { opacity: .5; cursor: default; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 12px; }
        .muted { color: var(--text-faint); font-size: 13px; }
        .bo-empty { color: var(--text-faint); font-size: 13px; line-height: 1.6; background: var(--surface); border: 1px dashed var(--border-strong); border-radius: 10px; padding: 16px 18px; } .bo-empty b { color: var(--text-dim); }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 10px 12px; border-radius: 6px; }
        .toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--surface-3); border: 1px solid var(--border-strong); color: var(--text); padding: 11px 18px; border-radius: 8px; font-size: 13px; z-index: 90; box-shadow: 0 8px 28px rgba(0,0,0,.4); max-width: 90vw; text-align: center; }
        @media (max-width: 900px) { .ms-layout { grid-template-columns: 1fr; } .ms-left { position: static; } .top-btns { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
