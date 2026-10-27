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
import { useEffect, useMemo, useRef, useState } from "react";
import PersonAvatar from "./PersonAvatar";
import { plansApi } from "@/lib/api/client";

/* numărul SIM din coada numelui: „Ion Pop (2)" → "2"; fără paranteză → "" */
function simOf(name = "") { const m = String(name).match(/\((\d)\)\s*$/); return m ? m[1] : ""; }

export default function AssignSidebar({
  open, title, neededCount, loading, groups = [], alreadyHere = [],
  query, onQuery, onPick, onClose, assigning, mirror, onAddGuest,
  defaults, positionId, onSaveRules, instructions, browse = false,
}) {
  const [sim, setSim] = useState("");          // "", "1", "2"
  const [gender, setGender] = useState("");    // "", "M", "F"
  const [simOn, setSimOn] = useState(false);   // afișează rândul de filtre
  const [mirrorOn, setMirrorOn] = useState(false); // „adaugă și pe echipa pereche (SIM 2)"
  const [mode, setMode] = useState("member");  // "member" | "guest"
  const [guestName, setGuestName] = useState("");
  const [rulesOn, setRulesOn] = useState(false);
  const [draft, setDraft] = useState({ defaultGender: "any", defaultProgram: "any", targetPerMonth: 0, instructions: "" });
  const [rulesBusy, setRulesBusy] = useState(false);
  const [posFiles, setPosFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set()); // grupuri închise (collapse/expand headere)
  const fileRef = useRef(null);
  const toggleGrp = (k) => setCollapsed((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  // la schimbarea poziției: reset + PRE-SELECTează filtrele din regulile poziției
  useEffect(() => {
    setMirrorOn(false); setMode("member"); setGuestName(""); setRulesOn(false);
    const g = defaults?.gender && defaults.gender !== "any" ? defaults.gender : "";
    const p = defaults?.program && defaults.program !== "any" ? defaults.program : "";
    setGender(g); setSim(p); setSimOn(!!(g || p));
    setDraft({ defaultGender: defaults?.gender || "any", defaultProgram: defaults?.program || "any", targetPerMonth: defaults?.targetPerMonth || 0, instructions: instructions || "" });
    // eslint-disable-next-line
  }, [title, positionId, defaults?.gender, defaults?.program, defaults?.targetPerMonth, instructions]);

  // fișierele poziției (manual) — încărcate când deschizi panoul de reguli
  useEffect(() => {
    if (!rulesOn || !positionId) return;
    plansApi.positionFiles(positionId).then((r) => setPosFiles(r.files || [])).catch(() => setPosFiles([]));
  }, [rulesOn, positionId]);

  async function uploadPosFile(file) {
    if (!file || !positionId) return;
    setUploading(true);
    try {
      const up = await plansApi.uploadFile(file);
      const url = up?.url || up?.secure_url || up?.location || "";
      const r = await plansApi.addPositionFile(positionId, { name: file.name, url, kind: "upload" });
      setPosFiles((f) => [...f, { id: r.id, name: r.name || file.name, url: r.url || url, kind: "upload" }]);
    } catch { /* ignoră */ } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function delPosFile(fid) {
    try { await plansApi.deletePositionFile(positionId, fid); setPosFiles((f) => f.filter((x) => String(x.id) !== String(fid))); } catch {}
  }

  function addGuest() {
    const n = guestName.trim();
    if (!n || !onAddGuest) return;
    onAddGuest(n); setGuestName("");
  }
  async function saveRules() {
    if (!onSaveRules) return;
    setRulesBusy(true);
    try { await onSaveRules(positionId, draft); setRulesOn(false); } finally { setRulesBusy(false); }
  }

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

          <div className="asb-need">{browse ? "Vizualizare — toți oamenii" : loading ? "…" : neededCount > 0 ? `${neededCount} people still needed` : "Poziție acoperită"}</div>

          {!browse && (
            <div className="asb-tabs">
              <button className={`asb-tab ${mode === "member" ? "on" : ""}`} onClick={() => setMode("member")}>Team Member</button>
              <button className={`asb-tab ${mode === "guest" ? "on" : ""}`} onClick={() => setMode("guest")} title="Invitat one-time (fără istoric)">Guest</button>
            </div>
          )}

          {mode === "guest" && !browse ? (
            <div className="asb-guest">
              <div className="asb-ghint">Invitat one-time — apare <b>Confirmed</b> pe poziție, fără cont și fără istoric. Fără email.</div>
              <input className="asb-search" placeholder="Nume invitat (ex. Cristian Barbosu)" value={guestName}
                onChange={(e) => setGuestName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }} autoFocus />
              <button className="asb-gbtn" disabled={!guestName.trim() || assigning} onClick={addGuest}>Adaugă invitat</button>
            </div>
          ) : (
          <>
          <div className="asb-searchrow">
            <input className="asb-search" placeholder="Caută după nume, tag sau poziție" value={query} onChange={(e) => onQuery(e.target.value)} />
            <button className={`asb-filt ${simOn ? "on" : ""}`} title="Filtre (SIM / Gen)" onClick={() => setSimOn((v) => !v)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M4 8h8M6 12h4" /></svg>
            </button>
            {onSaveRules && positionId && (
              <button className={`asb-filt ${rulesOn ? "on" : ""}`} title="Reguli poziție (gen/SIM/target)" onClick={() => setRulesOn((v) => !v)}>⚙</button>
            )}
          </div>

          {rulesOn && (
            <div className="asb-rules">
              <div className="rr-t">Reguli poziție — filtrele se pre-selectează la deschidere</div>
              <div className="ff"><span className="ff-l">Gen</span>
                {[["any", "Oricine"], ["M", "Băieți"], ["F", "Fete"]].map(([v, l]) => (
                  <button key={v} className={`chip ${draft.defaultGender === v ? "on" : ""}`} onClick={() => setDraft((d) => ({ ...d, defaultGender: v }))}>{l}</button>
                ))}
              </div>
              <div className="ff"><span className="ff-l">SIM</span>
                {[["any", "Oricare"], ["1", "1"], ["2", "2"]].map(([v, l]) => (
                  <button key={v} className={`chip ${draft.defaultProgram === v ? "on" : ""}`} onClick={() => setDraft((d) => ({ ...d, defaultProgram: v }))}>{l}</button>
                ))}
              </div>
              <div className="ff"><span className="ff-l">Target</span>
                <input className="rr-num" type="number" min="0" max="31" value={draft.targetPerMonth}
                  onChange={(e) => setDraft((d) => ({ ...d, targetPerMonth: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
                <span className="rr-x">×/lună</span>
              </div>
              <div className="rr-field">
                <div className="rr-ll">Instrucțiuni (manual poziție)</div>
                <textarea className="rr-ta" value={draft.instructions} onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} placeholder="Ce trebuie să știe cineva pe această poziție…" />
              </div>
              <button className="asb-gbtn" disabled={rulesBusy} onClick={saveRules}>{rulesBusy ? "Se salvează…" : "Salvează regula + instrucțiuni"}</button>
              <div className="rr-field">
                <div className="rr-ll">Fișiere (manual)</div>
                {posFiles.length === 0 && <div className="rr-none">Niciun fișier.</div>}
                {posFiles.map((f) => (
                  <div key={f.id} className="rr-file">
                    {f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a> : <span>{f.name}</span>}
                    <button onClick={() => delPosFile(f.id)} title="Șterge">×</button>
                  </div>
                ))}
                <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => uploadPosFile(e.target.files?.[0])} />
                <button className="rr-up" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Se încarcă…" : "+ Încarcă fișier"}</button>
              </div>
            </div>
          )}

          {mirror?.available && (
            <label className="asb-mirror" title="Când asignezi, pune aceeași persoană și pe echipa pereche, aceeași poziție">
              <input type="checkbox" checked={mirrorOn} onChange={(e) => setMirrorOn(e.target.checked)} />
              {mirror.label || "Adaugă și pe echipa pereche"}
            </label>
          )}

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
                {[["", "Toți"], ["M", "B"], ["F", "F"]].map(([v, l]) => (
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
                <button className="asb-gh" onClick={() => toggleGrp("here")}>
                  <span className="asb-ghl">DEJA AICI</span>
                  <span className="asb-gn">{alreadyHere.length}</span>
                  <span className={`asb-gc ${collapsed.has("here") ? "col" : ""}`}>▾</span>
                </button>
                {!collapsed.has("here") && alreadyHere.map((p) => (
                  <div key={p.id} className="cand here">
                    <PersonAvatar person={p} size={28} showBadge={false} />
                    <span className="cn">{p.name}</span><span className="here-b">✓</span>
                  </div>
                ))}
              </div>
            )}

            {!loading && fGroups.map((g, gi) => {
              const col = collapsed.has(g.label);
              return (
                <div key={gi} className="asb-grp">
                  <button className="asb-gh" onClick={() => toggleGrp(g.label)}>
                    <span className="asb-ghl">{g.label}</span>
                    <span className="asb-gn">{g.people.length}</span>
                    <span className={`asb-gc ${col ? "col" : ""}`}>▾</span>
                  </button>
                  {!col && g.people.map((p) => (
                    <button key={p.id} className="cand" disabled={assigning} onClick={() => onPick(p, mirror?.available ? mirrorOn : false)} title={browse ? "Click pe o căsuță din grilă ca să asignezi" : "Asignează (fără email)"}>
                      <PersonAvatar person={p} size={28} showBadge={false} />
                      <span className="cn">{p.name}</span>
                      {p.conflict && (
                        <span className={`cf ${p.conflict.type}`} title={p.conflict.type === "blockout" ? "Blockout" : "Planificat în altă slujire"}>
                          <span className="cf-dot" />{p.conflict.count > 1 ? p.conflict.count : ""}
                        </span>
                      )}
                      {p.targetLabel && <span className={`tgt ${p.belowTarget ? "below" : "met"}`} title="Pe poziția asta luna asta / target">{p.targetLabel}</span>}
                      <span className="wk">{p.weeksLabel}</span>
                    </button>
                  ))}
                </div>
              );
            })}

            {!loading && fGroups.length === 0 && alreadyHere.length === 0 && (
              <div className="asb-muted">Niciun candidat{query ? " pentru căutare" : ""}{sim ? ` (SIM ${sim})` : ""}.</div>
            )}
          </div>
          </>
          )}
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
        .asb-guest { padding: 4px 16px 10px; display: flex; flex-direction: column; gap: 10px; }
        .asb-ghint { color: var(--text-faint); font-size: 12px; line-height: 1.5; }
        .asb-ghint b { color: var(--product); }
        .asb-gbtn { background: var(--primary); border: 1px solid var(--primary); color: #fff; border-radius: 6px; height: 34px; cursor: pointer; font-size: 13px; font-weight: 600; }
        .asb-gbtn:disabled { opacity: .5; cursor: default; }
        .asb-searchrow { display: flex; gap: 8px; padding: 0 16px 10px; }
        .asb-search { flex: 1; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px;
          height: 34px; padding: 0 10px; color: var(--text); outline: none; font-size: 13px; }
        .asb-search:focus { border-color: var(--primary); }
        .asb-filt { width: 34px; flex: none; background: var(--surface-2); border: 1px solid var(--border-strong);
          color: var(--text-dim); border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .asb-filt.on, .asb-filt:hover { color: var(--text); border-color: var(--primary); }
        .asb-mirror { display: flex; align-items: center; gap: 8px; margin: 0 16px 10px; padding: 7px 10px;
          background: rgba(47,129,247,.08); border: 1px solid rgba(47,129,247,.3); border-radius: 6px;
          color: var(--text-dim); font-size: 12.5px; cursor: pointer; }
        .asb-mirror input { accent-color: var(--primary); }
        .asb-rules { margin: 0 16px 10px; padding: 10px 12px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 8px; display: flex; flex-direction: column; gap: 9px; }
        .rr-t { color: var(--text-faint); font-size: 11px; line-height: 1.4; }
        .rr-num { width: 52px; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; height: 26px; padding: 0 8px; font-size: 13px; }
        .rr-x { color: var(--text-faint); font-size: 11.5px; }
        .rr-field { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
        .rr-ll { color: var(--text-faint); font-size: 10.5px; letter-spacing: .4px; }
        .rr-ta { background: var(--surface); border: 1px solid var(--border-strong); border-radius: 6px; color: var(--text); font-size: 12.5px; padding: 7px 9px; min-height: 60px; resize: vertical; font-family: inherit; outline: none; }
        .rr-ta:focus { border-color: var(--primary); }
        .rr-none { color: var(--text-faint); font-size: 12px; }
        .rr-file { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; padding: 4px 0; }
        .rr-file a { color: var(--text-link); } .rr-file a:hover { text-decoration: underline; }
        .rr-file button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 15px; } .rr-file button:hover { color: var(--danger); }
        .rr-up { background: var(--surface); border: 1px dashed var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 7px; cursor: pointer; font-size: 12.5px; }
        .rr-up:hover { color: var(--primary); border-color: var(--primary); }
        .asb-filters { padding: 0 16px 10px; display: flex; flex-direction: column; gap: 8px; }
        .ff { display: flex; align-items: center; gap: 6px; }
        .ff-l { color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; width: 32px; }
        .chip { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          border-radius: 20px; padding: 3px 12px; font-size: 12px; cursor: pointer; }
        .chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
        .chip.dis { opacity: .4; cursor: default; }
        .asb-list { overflow: auto; padding: 0 8px 16px; flex: 1; }
        .asb-grp { margin-bottom: 14px; }
        .asb-gl { color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; padding: 8px 8px 5px; }
        /* headere de grup collapse/expand (ca în Teams): nume stânga, contor, caret în dreapta de tot */
        .asb-gh { display: flex; align-items: center; gap: 8px; width: 100%; background: var(--section-head-bg);
          border: none; border-radius: 7px; padding: 9px 11px; cursor: pointer; margin-bottom: 5px; }
        .asb-gh:hover { background: #26303c; }
        .asb-ghl { color: var(--text); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .asb-gn { color: var(--text-dim); font-size: 11px; background: var(--surface-2); border-radius: 20px; padding: 1px 9px; min-width: 22px; text-align: center; flex: none; }
        .asb-gc { color: var(--text-faint); font-size: 10px; transition: transform .12s; flex: none; }
        .asb-gc.col { transform: rotate(-90deg); }
        .cand { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: transparent;
          border: none; cursor: pointer; padding: 6px 8px; border-radius: 7px; }
        .cand:hover { background: rgba(255,255,255,.055); }
        .cand:disabled { opacity: .5; cursor: default; }
        .cn { color: var(--text); font-size: 13px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cf { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; }
        .cf-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .cf.blockout { color: var(--danger); } .cf.blockout .cf-dot { background: var(--danger); }
        .cf.time { color: var(--st-unconfirmed); } .cf.time .cf-dot { background: var(--st-unconfirmed); }
        .tgt { font-size: 10px; border-radius: 10px; padding: 0 6px; border: 1px solid; white-space: nowrap; }
        .tgt.below { color: var(--product); border-color: rgba(87,185,138,.5); }
        .tgt.met { color: var(--text-faint); border-color: var(--border-strong); }
        .wk { color: var(--text-faint); font-size: 11px; min-width: 32px; text-align: right; }
        .cand.here { opacity: .75; cursor: default; } .here-b { color: var(--product); }
        .asb-muted { color: var(--text-faint); font-size: 12.5px; padding: 10px 8px; }
      `}</style>
    </aside>
  );
}
