"use client";
/**
 * CoverageBar — „Listă LIVE" ca BARĂ DE JOS (collapse/expand din jos, animație).
 * Header = TAB-uri: „Listă live" (mereu) + un tab DINAMIC cu persoana targetată (doar când e target activ).
 *   · Tab „Listă live": filtre colorate + view-uri (Toți/Neplanificați/Planificați) + coloane 0/1/2/3/4×+.
 *   · Tab persoană (#11 target-mode): detalii despre persoana targetată — statistici (slujiri, liber/ocupat/
 *     blocat în fereastră) + unde mai e planificată (viitor). Apare la click pe o persoană, dispare la detarget.
 * Carduri trăgibile direct în Matrix. Nu are refresh — LIVE. Nu acoperă sidebar-ul (inset prin `style`).
 */
import { useEffect, useState } from "react";
import PersonAvatar from "./PersonAvatar";

const VIEWS = [
  { id: "all", label: "Toți", keep: () => true },
  { id: "un", label: "Neplanificați", keep: (b) => b.times === 0 },
  { id: "pl", label: "Planificați", keep: (b) => b.times > 0 },
];

/* culoare stabilă per slujire (din nume) */
function hueOf(s = "") { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function simOf(name = "") { const m = String(name).match(/\((\d)\)\s*$/); return m ? m[1] : ""; }

export default function CoverageBar({
  open, onToggle, cov, loading, filters = {}, onRemoveFilter, onSetFilter, onPersonDragStart, onPersonDragEnd, style,
  target = null, targetSched = null, targetAvail = {}, onCloseTarget, reassignMode = false, disablePersonId = null,
}) {
  const [view, setView] = useState("all");
  const [tab, setTab] = useState("live"); // "live" | "person"
  // căutare PER container (bucket): deschide lupa din header → înlocuiește titlul cu un input + X.
  // Filtrează DOAR oamenii din acel container (nu din toate). Cheie = b.times.
  const [bqOpen, setBqOpen] = useState({}); // {times: true}
  const [bq, setBq] = useState({});         // {times: "text"}
  const openBq = (t) => { setBqOpen((s) => ({ ...s, [t]: true })); };
  const closeBq = (t) => { setBqOpen((s) => ({ ...s, [t]: false })); setBq((s) => ({ ...s, [t]: "" })); };
  const setBqVal = (t, v) => setBq((s) => ({ ...s, [t]: v }));

  // target activ → deschide bara + sari pe tabul persoanei; detarget → înapoi la „Listă live"
  useEffect(() => {
    if (target) { setTab("person"); if (!open) onToggle?.(); }
    else setTab("live");
    // eslint-disable-next-line
  }, [target?.personId]);

  // filtrare client-side HARD (din widget-uri): gen + SIM. Se STACKEAZĂ (AND). Când un filtru e activ,
  // elimină TOTAL celelalte valori (ex. SIM 1 activ → SIM 2 și cei fără SIM dispar). programIntent e sursa
  // de adevăr pt. SIM (fallback pe sufixul „(N)" din nume). Slujirea/poziția se prioritizează în backend.
  const keepPerson = (p) => {
    // Fit = DOAR oamenii din rosterul poziției selectate (cei care „fit the position")
    if (filters.fit && filters.position && !p.inPosRoster) return false;
    if (filters.gender && p.gender !== filters.gender) return false;
    if (filters.sim && (p.programIntent || simOf(p.name)) !== filters.sim) return false;
    return true;
  };
  const buckets = (cov?.buckets || [])
    .filter(VIEWS.find((v) => v.id === view).keep)
    .map((b) => ({ ...b, people: (b.people || []).filter(keepPerson) }));
  const total = buckets.reduce((s, b) => s + b.people.length, 0);
  const mh = filters.ministry ? hueOf(filters.ministry.name) : 0;

  // statistici fereastră (din disponibilitatea per plan)
  const av = Object.values(targetAvail || {});
  const stat = {
    window: av.length,
    here: av.filter((a) => a.here).length,
    free: av.filter((a) => !a.blockout && !a.here).length,
    blocked: av.filter((a) => a.blockout).length,
    busy: av.filter((a) => a.busy && !a.here).length,
  };
  const activePerson = tab === "person" && target;

  return (
    <div className={`covbar ${open ? "open" : ""} ${reassignMode ? "reassign" : ""}`} style={style}>
      {/* mâner + TAB-uri */}
      <div className="cb-handle" onClick={onToggle}>
        <span className="cb-grip" />
        <div className="cb-tabs" onClick={(e) => e.stopPropagation()}>
          <button className={`cb-tab ${tab === "live" ? "on" : ""}`} onClick={() => { if (!open) onToggle(); setTab("live"); }}>Listă live</button>
          {target && (
            <button className={`cb-tab person ${tab === "person" ? "on" : ""}`} onClick={() => { if (!open) onToggle(); setTab("person"); }}>
              <span className="cb-tgt">⌖</span>{target.name}
              <span className="cb-tabx" title="Ieși din target" onClick={(e) => { e.stopPropagation(); onCloseTarget?.(); }}>×</span>
            </button>
          )}
        </div>
        {tab === "live" && filters.ministry && (
          <span className="cb-tag min" style={{ "--h": mh }} onClick={(e) => { e.stopPropagation(); onRemoveFilter?.("ministry"); }} title="Scoate filtrul de slujire">
            {filters.ministry.name}<span className="tx">×</span>
          </span>
        )}
        {tab === "live" && filters.position && (
          <span className="cb-tag pos" onClick={(e) => { e.stopPropagation(); onRemoveFilter?.("position"); }} title="Scoate prioritatea poziției">
            {filters.position.name}<span className="tx">×</span>
          </span>
        )}
        {tab === "live" && filters.gender && (
          <span className="cb-tag gen" onClick={(e) => { e.stopPropagation(); onRemoveFilter?.("gender"); }} title="Scoate filtrul de gen">
            {filters.gender === "M" ? "Băieți" : "Fete"}<span className="tx">×</span>
          </span>
        )}
        {tab === "live" && filters.sim && (
          <span className="cb-tag sim" onClick={(e) => { e.stopPropagation(); onRemoveFilter?.("sim"); }} title="Scoate filtrul SIM">
            SIM {filters.sim}<span className="tx">×</span>
          </span>
        )}
        <span className="cb-hn">{activePerson ? `${stat.free} libere în fereastră` : `${total} persoane`}</span>
        <span className="cb-caret">{open ? "▾" : "▴"}</span>
      </div>

      {open && activePerson && (
        <div className="cb-body person">
          <div className="pp-side">
            <div className="pp-who">
              <PersonAvatar person={target} size={52} showBadge={false} />
              <div className="pp-name">{target.name}</div>
            </div>
            <div className="pp-stats">
              <div className="pp-stat"><b>{targetSched == null ? "…" : targetSched.length}</b><span>slujiri viitoare</span></div>
              <div className="pp-stat free"><b>{stat.free}</b><span>libere (fereastră)</span></div>
              <div className="pp-stat here"><b>{stat.here}</b><span>planificat (fereastră)</span></div>
              <div className="pp-stat blk"><b>{stat.blocked}</b><span>blocate (fereastră)</span></div>
            </div>
            <div className="pp-hint">⌖ Click pe o poziție <b>liberă</b> din grilă ca să-l planifici rapid pe mai multe date. Esc pentru ieșire.</div>
          </div>
          <div className="pp-main">
            <div className="pp-mh">Unde e planificat (viitor)</div>
            <div className="pp-list">
              {targetSched == null ? <div className="cb-muted">Se încarcă…</div> :
                targetSched.length === 0 ? <div className="pp-empty">Nicăieri planificat în viitor — complet liber.</div> :
                targetSched.map((s, i) => (
                  <div key={i} className="pp-row">
                    <span className={`pp-ic ${s.status === "confirmed" ? "ok" : "pend"}`}>{s.status === "confirmed" ? "✓" : "?"}</span>
                    <span className="pp-d">{s.dateLabel}</span>
                    <span className="pp-s">{s.serviceTypeName}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {open && !activePerson && (
        <div className="cb-body">
          <nav className="cb-nav">
            {VIEWS.map((v) => (
              <button key={v.id} className={`cb-view ${view === v.id ? "on" : ""}`} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
          </nav>
          <div className="cb-cols">
            {loading && !cov && <div className="cb-muted">Se încarcă…</div>}
            {buckets.map((b) => {
              const q = (bq[b.times] || "").trim().toLowerCase();
              const people = bqOpen[b.times] && q ? b.people.filter((p) => (p.name || "").toLowerCase().includes(q)) : b.people;
              return (
              <div key={b.times} className={`cb-col ${b.times === 0 ? "col0" : ""}`}>
                <div className="cb-ch">
                  {bqOpen[b.times] ? (
                    <div className="cb-search">
                      <svg className="cb-si" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="7" r="4.5" /><path d="M14 14l-3.2-3.2" /></svg>
                      <input autoFocus className="cb-sinput" placeholder="caută..." value={bq[b.times] || ""}
                        onChange={(e) => setBqVal(b.times, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") closeBq(b.times); }} />
                      <button className="cb-sx" title="Închide căutarea" onClick={() => closeBq(b.times)}>×</button>
                    </div>
                  ) : (
                    <>
                      <span>{b.label}</span>
                      <span className="cb-chr">
                        <button className="cb-sbtn" title="Caută în această listă" onClick={() => openBq(b.times)}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="7" r="4.5" /><path d="M14 14l-3.2-3.2" /></svg>
                        </button>
                        <span className="cb-cn">{b.people.length}</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="cb-list">
                  {people.length === 0 && <div className="cb-empty">{bqOpen[b.times] && q ? "Niciun rezultat." : "—"}</div>}
                  {people.map((p) => {
                    const dis = disablePersonId && String(p.id) === String(disablePersonId);
                    return (
                    <div key={p.id} className={`cb-card ${dis ? "dis" : ""}`} draggable={!dis}
                      onDragStart={dis ? undefined : (e) => { e.dataTransfer.effectAllowed = "copy"; try { e.dataTransfer.setData("application/pc-person", JSON.stringify({ id: p.id, name: p.name, avatar: p.avatar || "", initials: p.initials || "" })); } catch {} onPersonDragStart?.(p); }}
                      onDragEnd={() => onPersonDragEnd?.()}
                      title={dis ? "Nu poți înlocui o persoană cu ea însăși" : `${p.name} — trage în Matrix pentru a asigna`}>
                      <PersonAvatar person={p} size={26} showBadge={false} />
                      {p.inRoster && <span className="cb-rost" title="În rosterul echipei" />}
                      <span className="cb-name">{p.name}</span>
                      {p.free > 0 && <span className="cb-free">×{p.free}</span>}
                      {p.blocked > 0 && <span className="cb-blk" title={`${p.blocked} planuri blocate`}>⛔{p.blocked}</span>}
                    </div>
                    ); })}
                </div>
              </div>
            ); })}
          </div>

          {/* ── rail de filtre (dreapta): widget SEX (sus) + widget PROGRAM/SIM (jos) — filtre HARD, se stackează ── */}
          <aside className="cb-tools" onClick={(e) => e.stopPropagation()}>
            <div className="cbw-title">Filtre</div>

            <div className="cbw-group">
              <span className="cbw-lbl">Poziție</span>
              <div className="cbw fit">
                <span className={`cbw-glow fit ${filters.position ? (filters.fit ? "yes" : "no") : ""}`} aria-hidden />
                <button type="button" className={`cbw-opt fit yes ${filters.position && filters.fit ? "on" : ""}`} disabled={!filters.position} onClick={() => onSetFilter?.("fit", true)} title="Doar oamenii care fac parte din poziție">
                  <span className="cbw-simlb">Fit</span>
                </button>
                <button type="button" className={`cbw-opt fit no ${filters.position && !filters.fit ? "on" : ""}`} disabled={!filters.position} onClick={() => onSetFilter?.("fit", false)} title="Toți candidații (poziția rămâne prioritizată)">
                  <span className="cbw-simlb">All</span>
                </button>
              </div>
            </div>

            <div className="cbw-group">
              <span className="cbw-lbl">Sex</span>
              <div className="cbw sex">
                <span className={`cbw-glow ${filters.gender === "M" ? "m" : filters.gender === "F" ? "f" : ""}`} aria-hidden />
                <button type="button" className={`cbw-opt m ${filters.gender === "M" ? "on" : ""}`} onClick={() => onSetFilter?.("gender", "M")} title="Doar băieți">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9.5" cy="14.5" r="5.5" /><path d="M15 9l5-5M15 4h5v5" /></svg>
                </button>
                <button type="button" className={`cbw-opt f ${filters.gender === "F" ? "on" : ""}`} onClick={() => onSetFilter?.("gender", "F")} title="Doar fete">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8.5" r="5.5" /><path d="M12 14v7M8.5 18h7" /></svg>
                </button>
              </div>
            </div>

            <div className="cbw-group">
              <span className="cbw-lbl">Program</span>
              <div className="cbw sim">
                <span className={`cbw-glow sim ${filters.sim === "1" ? "s1" : filters.sim === "2" ? "s2" : ""}`} aria-hidden />
                <button type="button" className={`cbw-opt sim s1 ${filters.sim === "1" ? "on" : ""}`} onClick={() => onSetFilter?.("sim", "1")} title="Doar SIM 1">
                  <span className="cbw-simlb">SIM 1</span>
                </button>
                <button type="button" className={`cbw-opt sim s2 ${filters.sim === "2" ? "on" : ""}`} onClick={() => onSetFilter?.("sim", "2")} title="Doar SIM 2">
                  <span className="cbw-simlb">SIM 2</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        .covbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 46; background: var(--surface);
          border-top: 1px solid var(--border-strong); border-radius: 12px 12px 0 0;
          box-shadow: 0 -10px 30px rgba(0,0,0,.34); transition: height .22s cubic-bezier(.4,0,.2,1), left .16s, right .16s;
          height: var(--cbar-h); display: flex; flex-direction: column; }
        .covbar.open { height: 46vh; }
        /* mod reasignare: bara urcă DEASUPRA overlay-ului modalului de conflicte (z 95) → element distinct, nu suprapus */
        .covbar.reassign { z-index: 120; box-shadow: 0 -16px 50px rgba(0,0,0,.6); border-top-color: var(--primary); }
        .cb-handle { height: var(--cbar-h); flex: none; display: flex; align-items: center; gap: 10px; background: var(--surface-2);
          border-bottom: 1px solid var(--border); border-radius: 12px 12px 0 0; color: var(--text); cursor: pointer; padding: 0 18px; font-size: 13px; }
        .cb-grip { width: 36px; height: 4px; border-radius: 3px; background: var(--border-strong); flex: none; }
        .cb-tabs { display: flex; align-items: center; gap: 4px; }
        .cb-tab { display: inline-flex; align-items: center; gap: 7px; background: transparent; border: none; color: var(--text-dim);
          font-size: 13px; font-weight: 700; letter-spacing: .2px; cursor: pointer; padding: 6px 12px; border-radius: 8px 8px 0 0; position: relative; }
        .cb-tab:hover { color: var(--text); background: rgba(255,255,255,.04); }
        .cb-tab.on { color: var(--text); background: var(--surface); box-shadow: inset 0 -2px 0 var(--primary); }
        .cb-tab.person { animation: tabIn .18s ease; }
        .cb-tab.person.on { box-shadow: inset 0 -2px 0 var(--product); }
        @keyframes tabIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .cb-tgt { color: var(--product); font-size: 13px; }
        .cb-tabx { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; border-radius: 50%; font-size: 12px; color: var(--text-faint); margin-left: 2px; }
        .cb-tabx:hover { background: rgba(255,255,255,.14); color: var(--text); }
        .cb-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; border-radius: 20px; padding: 3px 6px 3px 11px; cursor: pointer; white-space: nowrap; }
        .cb-tag .tx { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; font-size: 12px; opacity: .8; }
        .cb-tag:hover .tx { opacity: 1; background: rgba(255,255,255,.18); }
        .cb-tag.min { color: hsl(var(--h) 70% 82%); background: hsl(var(--h) 55% 22%); border: 1px solid hsl(var(--h) 60% 42%); }
        .cb-tag.gen { color: #d7c27a; background: rgba(201,162,39,.16); border: 1px solid rgba(201,162,39,.45); }
        .cb-tag.sim { color: #9cc4f5; background: rgba(47,129,247,.16); border: 1px solid rgba(47,129,247,.45); }
        .cb-tag.pos { color: #c9b6f2; background: rgba(139,92,246,.15); border: 1px solid rgba(139,92,246,.42); }
        .cb-hn { color: var(--text-dim); font-size: 12px; margin-left: auto; }
        .cb-caret { color: var(--text-faint); }
        .cb-body { flex: 1; display: flex; min-height: 0; }
        .cb-nav { width: 180px; flex: none; border-right: 1px solid var(--border); padding: 12px 10px; display: flex; flex-direction: column; gap: 4px; }
        .cb-view { text-align: left; background: transparent; border: none; color: var(--text-dim); border-radius: 7px; padding: 9px 12px; cursor: pointer; font-size: 13.5px; }
        .cb-view:hover { background: rgba(255,255,255,.05); color: var(--text); }
        .cb-view.on { background: var(--surface-3); color: var(--text); font-weight: 600; box-shadow: inset 0 0 0 1px var(--border-strong); }
        .cb-cols { flex: 1; display: flex; gap: 12px; align-items: stretch; overflow-x: auto; padding: 12px 16px; }
        .cb-muted { color: var(--text-faint); padding: 20px; }
        .cb-col { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; width: 236px; flex: none; display: flex; flex-direction: column; }
        .cb-col.col0 { border-color: rgba(47,129,247,.5); }
        .cb-ch { display: flex; align-items: center; justify-content: space-between; padding: 10px 13px; border-bottom: 1px solid var(--border); color: var(--text); font-weight: 600; font-size: 12.5px; flex: none; min-height: 39px; }
        .cb-chr { display: inline-flex; align-items: center; gap: 7px; }
        .cb-sbtn { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: transparent; border: none; color: var(--text-faint); cursor: pointer; border-radius: 5px; padding: 0; transition: color .12s, background .12s; }
        .cb-sbtn:hover { color: var(--text); background: rgba(255,255,255,.08); }
        .cb-search { display: flex; align-items: center; gap: 7px; width: 100%; border-bottom: 1.5px solid var(--border-strong); padding-bottom: 3px; animation: cbsIn .16s ease; }
        @keyframes cbsIn { from { opacity: 0; } to { opacity: 1; } }
        .cb-col.col0 .cb-search { border-color: rgba(47,129,247,.55); }
        .cb-si { color: var(--text-faint); flex: none; }
        .cb-sinput { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: var(--text); font-size: 12.5px; font-weight: 600; padding: 0; }
        .cb-sinput::placeholder { color: var(--text-faint); font-weight: 400; }
        .cb-sx { flex: none; background: transparent; border: none; color: var(--text-faint); font-size: 16px; line-height: 1; cursor: pointer; padding: 0 2px; border-radius: 4px; }
        .cb-sx:hover { color: var(--text); }
        .cb-col.col0 .cb-ch { background: rgba(47,129,247,.1); border-radius: 10px 10px 0 0; }
        .cb-cn { color: var(--text-dim); font-size: 11px; background: var(--surface-2); border-radius: 20px; padding: 1px 9px; min-width: 24px; text-align: center; }
        .cb-list { overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 1px; }
        .cb-empty { color: var(--text-faint); font-size: 12px; text-align: center; padding: 14px; }
        .cb-card { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 8px; cursor: grab; transition: background .1s; }
        .cb-card:hover { background: rgba(255,255,255,.055); }
        .cb-card:active { cursor: grabbing; opacity: .5; }
        .cb-card.dis { opacity: .4; cursor: not-allowed; }
        .cb-card.dis:hover { background: transparent; }
        .cb-rost { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--product); box-shadow: 0 0 0 2px rgba(87,185,138,.22); }
        .cb-name { color: var(--text); font-size: 13px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cb-free { flex: none; color: #0b2018; background: var(--product); border-radius: 20px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
        .cb-blk { flex: none; color: var(--danger); font-size: 11px; font-weight: 600; }
        /* ── rail de filtre (dreapta): widget SEX + PROGRAM/SIM ── */
        .cb-tools { width: 148px; flex: none; border-left: 1px solid var(--border); background: var(--surface-2);
          padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 16px; }
        .cbw-title { color: var(--text-faint); font-size: 10px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; }
        .cbw-group { display: flex; flex-direction: column; gap: 7px; }
        .cbw-lbl { color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: .2px; }
        .cbw { position: relative; display: flex; gap: 6px; padding: 5px; border-radius: 13px;
          background: var(--bg); border: 1px solid var(--border); }
        .cbw-glow { position: absolute; top: 5px; bottom: 5px; width: calc(50% - 8px); border-radius: 9px;
          opacity: 0; transform: scale(.82); transition: all .34s cubic-bezier(.34,1.56,.64,1); pointer-events: none; z-index: 0; }
        .cbw-glow.m { left: 5px; opacity: 1; transform: none; background: radial-gradient(120% 120% at 50% 30%, rgba(56,139,253,.5), rgba(56,139,253,.08));
          box-shadow: 0 0 20px 2px rgba(56,139,253,.55), inset 0 0 0 1px rgba(109,179,255,.7); }
        .cbw-glow.f { left: calc(50% + 3px); opacity: 1; transform: none; background: radial-gradient(120% 120% at 50% 30%, rgba(248,81,73,.5), rgba(248,81,73,.08));
          box-shadow: 0 0 20px 2px rgba(248,81,73,.55), inset 0 0 0 1px rgba(255,138,132,.7); }
        .cbw-glow.sim.s1 { left: 5px; opacity: 1; transform: none; background: radial-gradient(120% 120% at 50% 30%, rgba(87,185,138,.5), rgba(87,185,138,.08));
          box-shadow: 0 0 20px 2px rgba(87,185,138,.5), inset 0 0 0 1px rgba(123,220,174,.7); }
        .cbw-glow.sim.s2 { left: calc(50% + 3px); opacity: 1; transform: none; background: radial-gradient(120% 120% at 50% 30%, rgba(201,162,39,.52), rgba(201,162,39,.08));
          box-shadow: 0 0 20px 2px rgba(201,162,39,.5), inset 0 0 0 1px rgba(226,196,100,.7); }
        .cbw-opt { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1px; height: 44px; border: none; background: transparent; color: var(--text-faint); cursor: pointer; border-radius: 9px;
          transition: color .2s, transform .18s cubic-bezier(.34,1.56,.64,1); }
        .cbw-opt:hover { color: var(--text-dim); transform: translateY(-1px); }
        .cbw-opt svg { width: 22px; height: 22px; }
        .cbw-opt b { font-size: 18px; font-weight: 800; line-height: 1; }
        .cbw-opt em { font-size: 8.5px; font-style: normal; letter-spacing: .6px; opacity: .75; }
        .cbw-simlb { font-size: 13px; font-weight: 800; letter-spacing: .4px; }
        .cbw-opt:disabled { opacity: .4; cursor: default; }
        .cbw-opt:disabled:hover { transform: none; color: var(--text-faint); }
        .cbw-glow.fit.yes { left: 5px; opacity: 1; transform: none; background: radial-gradient(120% 120% at 50% 30%, rgba(139,92,246,.5), rgba(139,92,246,.08));
          box-shadow: 0 0 20px 2px rgba(139,92,246,.5), inset 0 0 0 1px rgba(179,142,255,.7); }
        .cbw-glow.fit.no { left: calc(50% + 3px); opacity: 1; transform: none; background: radial-gradient(120% 120% at 50% 30%, rgba(120,130,145,.42), rgba(120,130,145,.06));
          box-shadow: 0 0 16px 1px rgba(120,130,145,.4), inset 0 0 0 1px rgba(160,170,185,.55); }
        .cbw-opt.fit.yes.on { color: #c9b6f2; } .cbw-opt.fit.no.on { color: var(--text); }
        .cbw-opt.on { transform: translateY(-1px) scale(1.04); }
        .cbw-opt.m.on { color: #9ecbff; } .cbw-opt.f.on { color: #ff9a94; }
        .cbw-opt.s1.on { color: #8fe0b4; } .cbw-opt.s2.on { color: #e6cb74; }
        /* ── tab persoană (target) ── */
        .cb-body.person { padding: 0; animation: tabIn .18s ease; }
        .pp-side { width: 300px; flex: none; border-right: 1px solid var(--border); padding: 18px 18px 14px; display: flex; flex-direction: column; gap: 16px; overflow: auto; }
        .pp-who { display: flex; align-items: center; gap: 12px; }
        .pp-name { color: var(--text); font-size: 17px; font-weight: 600; }
        .pp-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .pp-stat { background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; padding: 11px 12px; display: flex; flex-direction: column; gap: 2px; }
        .pp-stat b { color: var(--text); font-size: 21px; font-weight: 700; line-height: 1; }
        .pp-stat span { color: var(--text-faint); font-size: 10.5px; letter-spacing: .2px; }
        .pp-stat.free b { color: var(--product); } .pp-stat.free { border-color: rgba(87,185,138,.4); }
        .pp-stat.here b { color: var(--st-unconfirmed); }
        .pp-stat.blk b { color: var(--danger); } .pp-stat.blk { border-color: rgba(248,81,73,.35); }
        .pp-hint { color: var(--text-faint); font-size: 11.5px; line-height: 1.55; margin-top: auto; }
        .pp-hint b { color: var(--product); }
        .pp-main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 14px 18px; }
        .pp-mh { color: var(--text-faint); font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 10px; }
        .pp-list { overflow: auto; display: flex; flex-direction: column; gap: 4px; }
        .pp-empty { color: var(--text-faint); font-size: 12.5px; padding: 8px 2px; }
        .pp-row { display: flex; align-items: center; gap: 11px; padding: 9px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; }
        .pp-ic { width: 20px; height: 20px; flex: none; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
        .pp-ic.ok { background: rgba(87,185,138,.18); color: var(--product); }
        .pp-ic.pend { background: rgba(210,153,34,.18); color: var(--st-unconfirmed); }
        .pp-d { color: var(--text); font-size: 13px; font-weight: 600; min-width: 64px; }
        .pp-s { color: var(--text-dim); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  );
}
