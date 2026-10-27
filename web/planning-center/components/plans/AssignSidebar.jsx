"use client";
/**
 * AssignSidebar — bara GLOBALĂ de asignare, lipită în dreapta ecranului (ca în PCO).
 * E aceeași componentă în Matrix ȘI în Teams: click pe o poziție/celulă → se deschide aici.
 * Conține: titlu poziție, „N people still needed", filtre (SIM 1/2, Gen F/B), căutare,
 * și lista de candidați grupată FĂRĂ CONFLICT / CU CONFLICT (avatar + nume + conflict + „due").
 * Click pe un candidat = asignează (DOAR în DB, status neconfirmat, ZERO email).
 *
 * Filtrarea SIM se face după numărul din nume „(1)"/„(2)" — exact cum cere liderul.
 * Gen: dacă există date de gen pe candidați, filtrează; altfel toggle-ul rămâne inactiv.
 */
import { useMemo, useState } from "react";
import PersonAvatar from "./PersonAvatar";

/* numărul SIM din coada numelui: „Ion Pop (2)" → "2"; fără paranteză → "" */
function simOf(name = "") { const m = String(name).match(/\((\d)\)\s*$/); return m ? m[1] : ""; }

export default function AssignSidebar({
  open, title, neededCount, loading, groups = [], alreadyHere = [],
  query, onQuery, onPick, onClose, assigning,
}) {
  const [sim, setSim] = useState("");          // "", "1", "2"
  const [gender, setGender] = useState("");    // "", "male", "female"
  const [simOn, setSimOn] = useState(false);   // afișează rândul de filtre

  // are vreun candidat date de gen? (altfel nu aplicăm filtrul de gen)
  const hasGender = useMemo(
    () => groups.some((g) => (g.people || []).some((p) => p.gender)),
    [groups]
  );

  const filterPerson = (p) => {
    if (sim && simOf(p.name) && simOf(p.name) !== sim) return false;
    if (sim && !simOf(p.name)) { /* fără număr = universal, îl păstrăm */ }
    if (gender && hasGender && p.gender && p.gender !== gender) return false;
    return true;
  };

  const fGroups = groups
    .map((g) => ({ ...g, people: (g.people || []).filter(filterPerson) }))
    .filter((g) => g.people.length);

  return (
    <aside className={`asb ${open ? "open" : ""}`} aria-hidden={!open}>
      {open && (
        <>
          <div className="asb-head">
            <span className="asb-title" title={title}>{title}</span>
            <button className="asb-x" onClick={onClose} aria-label="Închide">×</button>
          </div>

          <div className="asb-need">{loading ? "…" : neededCount > 0 ? `${neededCount} people still needed` : "Poziție acoperită"}</div>

          <div className="asb-tabs">
            <button className="asb-tab on">Team Member</button>
            <button className="asb-tab" title="Invitat one-time (în lucru)">Guest</button>
          </div>

          <div className="asb-searchrow">
            <input className="asb-search" placeholder="Caută după nume, tag sau poziție" value={query} onChange={(e) => onQuery(e.target.value)} />
            <button className={`asb-filt ${simOn ? "on" : ""}`} title="Filtre" onClick={() => setSimOn((v) => !v)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M4 8h8M6 12h4" /></svg>
            </button>
          </div>

          {simOn && (
            <div className="asb-filters">
              <div className="ff">
                <span className="ff-l">SIM</span>
                {[["", "Toți"], ["1", "1"], ["2", "2"]].map(([v, l]) => (
                  <button key={v} className={`chip ${sim === v ? "on" : ""}`} onClick={() => setSim(v)}>{l}</button>
                ))}
              </div>
              <div className="ff">
                <span className="ff-l">Gen</span>
                {[["", "Toți"], ["male", "B"], ["female", "F"]].map(([v, l]) => (
                  <button key={v} className={`chip ${gender === v ? "on" : ""} ${!hasGender && v ? "dis" : ""}`}
                    onClick={() => hasGender || !v ? setGender(v) : null}
                    title={!hasGender && v ? "Fără date de gen încă" : ""}>{l}</button>
                ))}
              </div>
            </div>
          )}

          <div className="asb-list">
            {loading && <div className="asb-muted">Se caută…</div>}

            {alreadyHere.length > 0 && (
              <div className="asb-grp">
                <div className="asb-gl">DEJA AICI</div>
                {alreadyHere.map((p) => (
                  <div key={p.id} className="cand here">
                    <PersonAvatar person={p} size={28} showBadge={false} />
                    <span className="cn">{p.name}</span><span className="here-b">✓</span>
                  </div>
                ))}
              </div>
            )}

            {!loading && fGroups.map((g, gi) => (
              <div key={gi} className="asb-grp">
                <div className="asb-gl">{g.label}</div>
                {g.people.map((p) => (
                  <button key={p.id} className="cand" disabled={assigning} onClick={() => onPick(p)} title="Asignează (fără email)">
                    <PersonAvatar person={p} size={28} showBadge={false} />
                    <span className="cn">{p.name}</span>
                    {p.conflict && (
                      <span className={`cf ${p.conflict.type}`} title={p.conflict.type === "blockout" ? "Blockout" : "Planificat în altă slujire"}>
                        <span className="cf-dot" />{p.conflict.count > 1 ? p.conflict.count : ""}
                      </span>
                    )}
                    <span className="wk">{p.weeksLabel}</span>
                  </button>
                ))}
              </div>
            ))}

            {!loading && fGroups.length === 0 && alreadyHere.length === 0 && (
              <div className="asb-muted">Niciun candidat{query ? " pentru căutare" : ""}{sim ? ` (SIM ${sim})` : ""}.</div>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .asb { position: fixed; top: var(--nav-h); right: 0; bottom: 0; width: 340px;
          background: var(--surface); border-left: 1px solid var(--border);
          transform: translateX(100%); transition: transform .16s ease; z-index: 40;
          display: flex; flex-direction: column; box-shadow: -8px 0 24px rgba(0,0,0,.28); }
        .asb.open { transform: translateX(0); }
        .asb-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); }
        .asb-title { color: var(--text); font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .asb-x { background: transparent; border: none; color: var(--text-faint); font-size: 22px; cursor: pointer; line-height: 1; padding: 0 2px; }
        .asb-x:hover { color: var(--text); }
        .asb-need { text-align: center; color: var(--text-dim); font-size: 13px; padding: 12px 10px 8px; }
        .asb-tabs { display: flex; gap: 8px; padding: 0 16px 10px; }
        .asb-tab { flex: 1; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          border-radius: 6px; padding: 7px 0; font-size: 12.5px; cursor: pointer; }
        .asb-tab.on { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
        .asb-searchrow { display: flex; gap: 8px; padding: 0 16px 10px; }
        .asb-search { flex: 1; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px;
          height: 34px; padding: 0 10px; color: var(--text); outline: none; font-size: 13px; }
        .asb-search:focus { border-color: var(--primary); }
        .asb-filt { width: 34px; flex: none; background: var(--surface-2); border: 1px solid var(--border-strong);
          color: var(--text-dim); border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .asb-filt.on, .asb-filt:hover { color: var(--text); border-color: var(--primary); }
        .asb-filters { padding: 0 16px 10px; display: flex; flex-direction: column; gap: 8px; }
        .ff { display: flex; align-items: center; gap: 6px; }
        .ff-l { color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; width: 32px; }
        .chip { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          border-radius: 20px; padding: 3px 12px; font-size: 12px; cursor: pointer; }
        .chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
        .chip.dis { opacity: .4; cursor: default; }
        .asb-list { overflow: auto; padding: 0 8px 16px; flex: 1; }
        .asb-grp { margin-bottom: 12px; }
        .asb-gl { color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; padding: 8px 8px 5px; }
        .cand { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: transparent;
          border: none; cursor: pointer; padding: 6px 8px; border-radius: 7px; }
        .cand:hover { background: rgba(255,255,255,.055); }
        .cand:disabled { opacity: .5; cursor: default; }
        .cn { color: var(--text); font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cf { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; }
        .cf-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .cf.blockout { color: var(--danger); } .cf.blockout .cf-dot { background: var(--danger); }
        .cf.time { color: var(--st-unconfirmed); } .cf.time .cf-dot { background: var(--st-unconfirmed); }
        .wk { color: var(--text-faint); font-size: 11px; min-width: 32px; text-align: right; }
        .cand.here { opacity: .75; cursor: default; } .here-b { color: var(--product); }
        .asb-muted { color: var(--text-faint); font-size: 12.5px; padding: 10px 8px; }
      `}</style>
    </aside>
  );
}
