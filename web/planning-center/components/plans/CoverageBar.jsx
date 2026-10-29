"use client";
/**
 * CoverageBar — „Listă LIVE" ca BARĂ DE JOS (collapse/expand din jos, animație).
 * Header = TAB-uri: „Listă live" (mereu) + un tab DINAMIC cu persoana targetată (doar când e target activ).
 *   · Tab „Listă live": filtre colorate (stânga) + UN container cu toggle în header (Neplanificați/Planificați).
 *   · Tab persoană (#11 target-mode): detalii despre persoana targetată — statistici (slujiri, liber/ocupat/
 *     blocat în fereastră) + unde mai e planificată (viitor). Apare la click pe o persoană, dispare la detarget.
 * Carduri trăgibile direct în Matrix. Nu are refresh — LIVE. Nu acoperă sidebar-ul (inset prin `style`).
 */
import { useEffect, useState } from "react";
import PersonAvatar from "./PersonAvatar";
import ConflictBadge from "./ConflictBadge";

/* culoare stabilă per slujire (din nume) */
function hueOf(s = "") { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function simOf(name = "") { const m = String(name).match(/\((\d)\)\s*$/); return m ? m[1] : ""; }

export default function CoverageBar({
  open, onToggle, cov, loading, filters = {}, onRemoveFilter, onSetFilter, onPersonDragStart, onPersonDragEnd, style,
  target = null, targetSched = null, targetAvail = {}, onCloseTarget, reassignMode = false, disablePersonId = null,
  onVerifyPerson, canVerify = false, targetWeeks = null, selSts = null, onToggleSt,
}) {
  const [mode, setMode] = useState("un"); // "un" = Neplanificați (default) | "pl" = Planificați
  const [tab, setTab] = useState("live"); // "live" | "person"
  // căutare pe lista ACTIVĂ (strict pe filtrul ales din header): lupa → input + X.
  const [bqOpen, setBqOpen] = useState(false);
  const [bq, setBq] = useState("");
  const closeBq = () => { setBqOpen(false); setBq(""); };

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
  // UN singur container cu toggle în header: Neplanificați (0×) vs Planificați (toți cu 1×+, alfabetic).
  const bkts = cov?.buckets || [];
  const unList = (bkts.find((b) => b.times === 0)?.people || []).filter(keepPerson);
  const plList = bkts.filter((b) => b.times > 0).flatMap((b) => b.people || [])
    .filter(keepPerson).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ro")); // alfabetic, indiferent de câte ori
  // Blockout: oamenii cu blockout în acea săptămână (din backend, deja scopat pe zi) — alfabetic.
  const blkList = (cov?.blockout || []).filter(keepPerson).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ro"));
  const activeList = mode === "un" ? unList : mode === "pl" ? plList : blkList;
  const q = bq.trim().toLowerCase();
  const shown = bqOpen && q ? activeList.filter((p) => (p.name || "").toLowerCase().includes(q)) : activeList;
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
        {activePerson && <span className="cb-hn">{stat.free} libere în fereastră</span>}
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
            {/* programe (service types) — bifabile; Tineret default dacă persoana e la tineret */}
            <div className="pp-sts">
              <span className="pp-stsl">Programe</span>
              {(targetWeeks?.serviceTypes || []).map((s) => {
                const checked = selSts ? selSts.map(String).includes(String(s.id)) : s.default;
                return (
                  <button key={s.id} type="button" className={`pp-stchip ${checked ? "on" : ""} ${s.isYouth ? "yt" : ""}`}
                    onClick={() => onToggleSt?.(s.id)} title={s.isYouth ? "Program de tineret" : ""}>
                    <span className="pp-stbox">{checked ? "✓" : ""}</span>{s.name}{s.isYouth ? " ·tineret" : ""}
                  </button>
                );
              })}
            </div>
            {/* carduri pe SĂPTĂMÂNĂ, grupate pe service type (carusel pe un rând) */}
            <div className="pp-weeks">
              {targetWeeks == null ? <div className="cb-muted">Se încarcă…</div> :
                (targetWeeks.cards || []).length === 0 ? <div className="pp-empty">Nimic de arătat pentru programele selectate.</div> :
                (targetWeeks.cards || []).map((g) => (
                  <div key={g.serviceTypeId} className="pp-grp">
                    <div className={`pp-grph ${g.isYouth ? "yt" : ""}`}>{g.serviceTypeName}</div>
                    <div className="pp-cards">
                      {g.weeks.map((w) => (
                        <div key={w.planId} className={`pp-card ${w.status} ${w.conflict ? "conf" : ""}`}>
                          <div className="pp-cd">{w.dateLabel}{w.conflict && <span className="pp-cconf" title="Conflict — mai multe slujiri în aceeași zi">⚠</span>}</div>
                          {w.status === "blockout" ? (
                            <div className="pp-cblk">
                              <img className="pp-blki" src="/icons/blockout.png" alt="" />
                              <div className="pp-cblkw"><div className="pp-cblkt">Blockout</div>{w.blockout?.reason && <div className="pp-cblkr">{w.blockout.reason}</div>}<div className="pp-cblkd">{w.blockout?.label}</div></div>
                            </div>
                          ) : w.status === "planned" ? (
                            <div className="pp-cass">
                              {w.assignments.map((a, i) => (
                                <div key={i} className="pp-arow">
                                  <span className={`pp-adot ${a.status === "confirmed" ? "ok" : "pend"}`} />
                                  <span className="pp-apos">{[a.position, a.team].filter(Boolean).join(" · ") || "Planificat"}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="pp-cfree">Neplanificat</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {open && !activePerson && (
        <div className="cb-body">
          {/* FILTRE — mutate în STÂNGA (în locul taburilor de view), eliberând dreapta pt. liste */}
          <aside className="cb-tools left" onClick={(e) => e.stopPropagation()}>
            <div className="cbw-group">
              <span className="cbw-lbl">Poziție</span>
              <div className="cbw fit">
                <span className={`cbw-glow fit ${filters.position ? (filters.fit ? "yes" : "no") : ""}`} aria-hidden />
                <button type="button" className={`cbw-opt fit yes ${filters.position && filters.fit ? "on" : ""}`} disabled={!filters.position} onClick={() => onSetFilter?.("fit", true)} title="Doar oamenii care fac parte din poziție"><span className="cbw-simlb">Fit</span></button>
                <button type="button" className={`cbw-opt fit no ${filters.position && !filters.fit ? "on" : ""}`} disabled={!filters.position} onClick={() => onSetFilter?.("fit", false)} title="Toți candidații (poziția rămâne prioritizată)"><span className="cbw-simlb">All</span></button>
              </div>
            </div>
            <div className="cbw-group">
              <span className="cbw-lbl">Sex</span>
              <div className="cbw sex">
                <span className={`cbw-glow ${filters.gender === "M" ? "m" : filters.gender === "F" ? "f" : ""}`} aria-hidden />
                <button type="button" className={`cbw-opt m ${filters.gender === "M" ? "on" : ""}`} onClick={() => onSetFilter?.("gender", "M")} title="Doar băieți"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9.5" cy="14.5" r="5.5" /><path d="M15 9l5-5M15 4h5v5" /></svg></button>
                <button type="button" className={`cbw-opt f ${filters.gender === "F" ? "on" : ""}`} onClick={() => onSetFilter?.("gender", "F")} title="Doar fete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8.5" r="5.5" /><path d="M12 14v7M8.5 18h7" /></svg></button>
              </div>
            </div>
            <div className="cbw-group">
              <span className="cbw-lbl">Program</span>
              <div className="cbw sim">
                <span className={`cbw-glow sim ${filters.sim === "1" ? "s1" : filters.sim === "2" ? "s2" : ""}`} aria-hidden />
                <button type="button" className={`cbw-opt sim s1 ${filters.sim === "1" ? "on" : ""}`} onClick={() => onSetFilter?.("sim", "1")} title="Doar SIM 1"><span className="cbw-simlb">SIM 1</span></button>
                <button type="button" className={`cbw-opt sim s2 ${filters.sim === "2" ? "on" : ""}`} onClick={() => onSetFilter?.("sim", "2")} title="Doar SIM 2"><span className="cbw-simlb">SIM 2</span></button>
              </div>
            </div>
          </aside>
          <div className="cb-cols single">
            {loading && !cov && <div className="cb-muted">Se încarcă…</div>}
            <div className={`cb-one ${mode === "blk" ? "blk" : ""}`}>
              <div className="cb-ch">
                {bqOpen ? (
                  <div className="cb-search">
                    <svg className="cb-si" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="7" r="4.5" /><path d="M14 14l-3.2-3.2" /></svg>
                    <input autoFocus className="cb-sinput" placeholder="caută..." value={bq}
                      onChange={(e) => setBq(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") closeBq(); }} />
                    <button className="cb-sx" title="Închide căutarea" onClick={closeBq}>×</button>
                  </div>
                ) : (
                  <>
                    <div className="cbw plpick" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className={`cbw-opt pl a ${mode === "un" ? "on" : ""}`} onClick={() => setMode("un")}><span className="cbw-simlb">Neplanificați</span></button>
                      <button type="button" className={`cbw-opt pl b ${mode === "pl" ? "on" : ""}`} onClick={() => setMode("pl")}><span className="cbw-simlb">Planificați</span></button>
                      <button type="button" className={`cbw-opt pl c ${mode === "blk" ? "on" : ""}`} onClick={() => setMode("blk")}><span className="cbw-simlb"><img className="cb-blki" src="/icons/blockout.png" alt="" />Blockout</span></button>
                    </div>
                    <span className="cb-chr">
                      <button className="cb-sbtn" title="Caută în această listă" onClick={() => setBqOpen(true)}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="7" cy="7" r="4.5" /><path d="M14 14l-3.2-3.2" /></svg>
                      </button>
                      <span className="cb-cn">{activeList.length}</span>
                    </span>
                  </>
                )}
              </div>
              <div className="cb-list">
                {shown.length === 0 && <div className="cb-empty">{bqOpen && q ? "Niciun rezultat." : "—"}</div>}
                {shown.map((p) => {
                  const dis = disablePersonId && String(p.id) === String(disablePersonId);
                  return (
                  <div key={p.id} className={`cb-card ${dis ? "dis" : ""}`} draggable={!dis}
                    onDragStart={dis ? undefined : (e) => { e.dataTransfer.effectAllowed = "copy"; try { e.dataTransfer.setData("application/pc-person", JSON.stringify({ id: p.id, name: p.name, avatar: p.avatar || "", initials: p.initials || "" })); } catch {} onPersonDragStart?.(p); }}
                    onDragEnd={() => onPersonDragEnd?.()}
                    title={dis ? "Nu poți înlocui o persoană cu ea însăși" : `${p.name} — trage în Matrix pentru a asigna`}>
                    <PersonAvatar person={p} size={26} showBadge={false} />
                    {p.inRoster && <span className="cb-rost" title="În rosterul echipei" />}
                    <span className="cb-name">{p.name}</span>
                    {mode === "blk" ? (
                      <span className="cb-blktag" title={p.blockout?.reason ? `${p.blockout.label} · ${p.blockout.reason}` : (p.blockout?.label || "Blockout")}>
                        <img className="cb-blki" src="/icons/blockout.png" alt="" />{p.blockout?.label || "blockout"}
                      </span>
                    ) : (() => {
                      const cf = [];
                      if (p.scheduled > 0) cf.push({ type: "time", label: `Planificat de ${p.scheduled}×` });
                      if (p.blocked > 0) cf.push({ type: "blockout", label: `${p.blocked} ${p.blocked === 1 ? "plan blocat" : "planuri blocate"}` });
                      return cf.length > 0 ? <ConflictBadge items={cf} canVerify={canVerify} onVerify={() => onVerifyPerson?.(p)} /> : null;
                    })()}
                  </div>
                  ); })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .covbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 46; background: var(--surface);
          border-top: 1px solid var(--border-strong); border-radius: 12px 12px 0 0;
          box-shadow: 0 -10px 30px rgba(0,0,0,.34); transition: height .22s cubic-bezier(.4,0,.2,1), left .16s, right .16s;
          height: var(--cbar-h); display: flex; flex-direction: column; }
        .covbar.open { height: 41vh; }
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
        .cb-col { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; width: 283px; flex: none; display: flex; flex-direction: column; }
        .cb-col.col0 { border-color: rgba(47,129,247,.5); }
        .cb-ch { display: flex; align-items: center; justify-content: space-between; padding: 10px 13px; border-bottom: 1px solid var(--border); color: var(--text); font-weight: 600; font-size: 12.5px; flex: none; min-height: 39px; }
        .cb-chlbl { display: inline-flex; align-items: center; gap: 6px; }
        .cb-dl { width: 20px; height: 20px; object-fit: contain; opacity: .9; }
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
        .cb-tools { width: 150px; flex: none; border-left: 1px solid var(--border); background: var(--surface-2);
          padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 16px; }
        .cb-tools.left { border-left: none; border-right: 1px solid var(--border); }
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
        /* ── container UNIC + toggle Neplanificați/Planificați/Blockout în header (design ca filtrele din stânga) ── */
        /* IMPORTANT: toggle-ul ÎNCAPE în header-ul existent (~39px) — NU mări header-ul. */
        .cb-cols.single { padding: 12px 16px; }
        .cb-one { flex: 1; min-width: 0; min-height: 0; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; display: flex; flex-direction: column; transition: border-color .18s; }
        .cb-one.blk { border-color: rgba(248,81,73,.5); }
        .cb-one.blk .cb-ch { background: rgba(248,81,73,.07); border-radius: 10px 10px 0 0; }
        .cb-cols.single .cb-ch { padding: 4px 12px; }
        .cb-one .cb-list { flex: 1; }
        .cbw.plpick { padding: 2px; gap: 2px; border-radius: 9px; }
        .cbw.plpick .cbw-opt { flex: 1; min-width: 0; height: 26px; padding: 0 8px; border-radius: 7px; transition: color .18s, background .22s, box-shadow .22s; }
        .cbw.plpick .cbw-opt:hover { transform: none; color: var(--text-dim); }
        .cbw.plpick .cbw-opt.on { transform: none; font-weight: 800; }
        .cbw.plpick .cbw-opt.a.on { color: #9ecbff; background: radial-gradient(120% 120% at 50% 30%, rgba(47,129,247,.28), rgba(47,129,247,.05)); box-shadow: inset 0 0 0 1px rgba(109,179,255,.6), 0 0 12px rgba(47,129,247,.25); }
        .cbw.plpick .cbw-opt.b.on { color: #8fe0b4; background: radial-gradient(120% 120% at 50% 30%, rgba(87,185,138,.28), rgba(87,185,138,.05)); box-shadow: inset 0 0 0 1px rgba(123,220,174,.6), 0 0 12px rgba(87,185,138,.25); }
        .cbw.plpick .cbw-opt.c.on { color: #ff9a94; background: radial-gradient(120% 120% at 50% 30%, rgba(248,81,73,.3), rgba(248,81,73,.05)); box-shadow: inset 0 0 0 1px rgba(255,138,132,.6), 0 0 12px rgba(248,81,73,.28); }
        .cbw.plpick .cbw-simlb { font-size: 11.5px; letter-spacing: .2px; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
        .cb-blki { width: 13px; height: 13px; object-fit: contain; flex: none; }
        .cb-blktag { display: inline-flex; align-items: center; gap: 5px; flex: none; color: #ff9a94; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .cb-blktag .cb-blki { width: 14px; height: 14px; opacity: .95; }
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
        .pp-main { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 14px 18px; gap: 12px; }
        .pp-empty { color: var(--text-faint); font-size: 12.5px; padding: 8px 2px; }
        /* checkbox-uri programe (service types) — Tineret marcat */
        .pp-sts { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
        .pp-stsl { color: var(--text-faint); font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; margin-right: 2px; }
        .pp-stchip { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 20px; padding: 4px 11px 4px 8px; font-size: 12px; cursor: pointer; transition: border-color .13s, color .13s, background .13s; }
        .pp-stchip:hover { color: var(--text); }
        .pp-stchip.on { background: rgba(47,129,247,.12); border-color: var(--primary); color: var(--text); }
        .pp-stchip.on.yt { background: rgba(201,162,39,.14); border-color: rgba(201,162,39,.5); }
        .pp-stbox { width: 15px; height: 15px; flex: none; border-radius: 4px; border: 1.5px solid var(--border-strong); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; }
        .pp-stchip.on .pp-stbox { background: var(--primary); border-color: var(--primary); }
        .pp-stchip.on.yt .pp-stbox { background: #c9a227; border-color: #c9a227; }
        /* carduri pe SĂPTĂMÂNĂ (carusel pe un rând), grupate pe service type */
        .pp-weeks { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 14px; }
        .pp-grp { display: flex; flex-direction: column; gap: 8px; }
        .pp-grph { color: var(--text-dim); font-size: 11px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; }
        .pp-grph.yt { color: #e0b341; }
        .pp-cards { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
        .pp-card { width: 196px; flex: none; min-height: 104px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 11px; padding: 11px 12px; display: flex; flex-direction: column; gap: 9px; }
        .pp-card.free { border-style: dashed; }
        .pp-card.blockout { border-color: rgba(248,81,73,.5); background: rgba(248,81,73,.06); }
        .pp-card.conf { border-color: rgba(210,153,34,.6); }
        .pp-cd { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 13px; font-weight: 700; }
        .pp-cconf { color: #e0b341; font-size: 13px; }
        .pp-cass { display: flex; flex-direction: column; gap: 6px; }
        .pp-arow { display: flex; align-items: flex-start; gap: 8px; }
        .pp-adot { width: 8px; height: 8px; flex: none; border-radius: 50%; margin-top: 5px; }
        .pp-adot.ok { background: var(--product); } .pp-adot.pend { background: var(--st-unconfirmed); }
        .pp-apos { color: var(--text-dim); font-size: 12px; line-height: 1.35; }
        .pp-cfree { color: var(--product); font-size: 12.5px; font-weight: 600; }
        .pp-cblk { display: flex; align-items: flex-start; gap: 9px; }
        .pp-blki { width: 20px; height: 20px; object-fit: contain; flex: none; margin-top: 1px; }
        .pp-cblkt { color: #ff9a94; font-size: 12.5px; font-weight: 700; }
        .pp-cblkr { color: var(--text-dim); font-size: 11.5px; margin-top: 2px; line-height: 1.4; }
        .pp-cblkd { color: var(--text-faint); font-size: 11px; margin-top: 2px; }
      `}</style>
    </div>
  );
}
