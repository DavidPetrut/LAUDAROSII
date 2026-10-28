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
import { plansApi, peopleApi } from "@/lib/api/client";

/* numărul SIM din coada numelui: „Ion Pop (2)" → "2"; fără paranteză → "" */
function simOf(name = "") { const m = String(name).match(/\((\d)\)\s*$/); return m ? m[1] : ""; }

export default function AssignSidebar({
  open, title, neededCount, loading, groups = [], alreadyHere = [],
  query, onQuery, onPick, onClose, assigning, mirror, onAddGuest,
  defaults, positionId, onSaveRules, instructions, browse = false, serviceTimes = [], onRosterChanged,
  canAssign = true, canRoster = true, canRules = true,
}) {
  const readOnly = !canAssign && !canRoster; // doar vizualizare (rol view-only)
  const [addOn, setAddOn] = useState(false);      // panoul „+ adaugă om pe poziție"
  const [addQ, setAddQ] = useState("");
  const [addRes, setAddRes] = useState([]);       // rezultate căutare (toți oamenii)
  const [roster, setRoster] = useState([]);       // cine e deja în rosterul poziției
  const [rosterBusy, setRosterBusy] = useState(false);
  const addRef = useRef(null);
  const [selTimes, setSelTimes] = useState(() => new Set()); // orele alese la asignare (gol = toate orele / „During All")
  const [tipFor, setTipFor] = useState(null); // id-ul persoanei cu tooltip-ul de conflict deschis
  const [sim, setSim] = useState("");          // "", "1", "2"
  const [gender, setGender] = useState("");    // "", "M", "F"
  const [fit, setFit] = useState(false);       // „Fit the position" — doar rosterul poziției (default ON pe poziție)
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
    setMirrorOn(false); setMode("member"); setGuestName(""); setRulesOn(false); setSelTimes(new Set());
    setAddOn(false); setAddQ(""); setAddRes([]); setRoster([]);
    const g = defaults?.gender && defaults.gender !== "any" ? defaults.gender : "";
    const p = defaults?.program && defaults.program !== "any" ? defaults.program : "";
    // „Fit the position" pornește ON când e selectată o poziție (vezi doar rosterul ei); filtrele sunt vizibile by default
    setGender(g); setSim(p); setFit(!!positionId && !browse); setSimOn(!!positionId && !browse);
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

  // ─── „+ adaugă om pe poziție" (editează rosterul poziției din Matrix/Teams) ───
  const loadRoster = () => { if (positionId) peopleApi.positionRoster(positionId).then((r) => setRoster(r.people || [])).catch(() => setRoster([])); };
  useEffect(() => { if (addOn) loadRoster(); /* eslint-disable-line */ }, [addOn, positionId]);
  useEffect(() => {
    if (!addOn) return;
    clearTimeout(addRef.current);
    const s = addQ.trim();
    if (!s) { setAddRes([]); return; }
    addRef.current = setTimeout(async () => {
      try {
        const r = await peopleApi.list({ q: s, limit: 8 });
        const have = new Set(roster.map((x) => String(x.id)));
        setAddRes((r.results || []).filter((x) => !have.has(String(x.id))));
      } catch { setAddRes([]); }
    }, 260);
    return () => clearTimeout(addRef.current);
    // eslint-disable-next-line
  }, [addQ, addOn, roster]);
  async function rosterAddPerson(p) {
    if (!positionId) return;
    setRosterBusy(true);
    try { await peopleApi.rosterAdd(p.id, [positionId]); setAddQ(""); setAddRes([]); loadRoster(); onRosterChanged?.(); } catch {} finally { setRosterBusy(false); }
  }
  async function rosterRemovePerson(p) {
    if (!positionId) return;
    try { await peopleApi.rosterRemove(p.id, [positionId]); setRoster((r) => r.filter((x) => String(x.id) !== String(p.id))); onRosterChanged?.(); } catch {}
  }
  const personName = (p) => p.name || [p.firstName, p.lastName].filter(Boolean).join(" ");
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
    // Fit = DOAR rosterul poziției (cei care „fit the position"); se dezactivează ca să pui pe altcineva
    if (fit && positionId && !p.inRoster) return false;
    if (sim && (p.programIntent || simOf(p.name)) && (p.programIntent || simOf(p.name)) !== sim) return false;
    if (gender && hasGender && p.gender && p.gender !== gender) return false;
    return true;
  };

  const fGroups = groups
    .map((g) => ({ ...g, people: (g.people || []).filter(filterPerson) }))
    .filter((g) => g.people.length);

  const cfList = (p) => (p.conflicts && p.conflicts.length ? p.conflicts : (p.conflict ? [p.conflict] : []));

  return (
    <aside className={`asb ${open ? "open" : ""}`} aria-hidden={!open}>
      {open && (
        <>
          <div className="asb-head">
            <span className="asb-title" title={title}>{title}</span>
            <button className="asb-x" onClick={onClose} aria-label="Închide">×</button>
          </div>

          <div className="asb-need">{browse ? "Vizualizare — toți oamenii" : loading ? "…" : neededCount > 0 ? `${neededCount} people still needed` : "Poziție acoperită"}</div>

          {readOnly && <div className="asb-ro">Doar vizualizare — nu ai drept de editare aici.</div>}

          {!browse && canAssign && (
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
            {positionId && !browse && canRoster && (
              <button className={`asb-filt ${addOn ? "on" : ""}`} title="Adaugă un om pe poziție (roster)" onClick={() => setAddOn((v) => !v)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="9" cy="8" r="3.4" /><path d="M3.5 20v-1a5 5 0 0 1 5-5h1" /><path d="M18 13v6M15 16h6" /></svg>
              </button>
            )}
            {onSaveRules && positionId && canRules && (
              <button className={`asb-filt ${rulesOn ? "on" : ""}`} title="Reguli poziție (gen / program / target)" onClick={() => setRulesOn((v) => !v)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            )}
          </div>

          {addOn && (
            <div className="asb-add">
              <div className="aa-h">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="9" cy="8" r="3.4" /><path d="M3.5 20v-1a5 5 0 0 1 5-5h1" /><path d="M18 13v6M15 16h6" /></svg>
                <span>Adaugă pe poziție</span>
              </div>
              <div className="aa-hint">Caută pe oricine și pune-l în rosterul poziției. Apoi apare primul la recomandări, gata de asignat.</div>
              <div className="aa-searchwrap">
                <input className="asb-search" placeholder="Caută orice persoană…" value={addQ} onChange={(e) => setAddQ(e.target.value)} autoFocus />
                {addQ && <button className="aa-sx" onClick={() => { setAddQ(""); setAddRes([]); }}>×</button>}
              </div>
              {addRes.length > 0 && (
                <div className="aa-res">
                  {addRes.map((r) => (
                    <button key={r.id} className="aa-ri" disabled={rosterBusy} onClick={() => rosterAddPerson(r)}>
                      {r.avatar ? <img className="aa-av" src={r.avatar} alt="" /> : <span className="aa-av ini">{r.initials}</span>}
                      <span className="aa-rn">{personName(r)}</span>
                      <span className="aa-plus">+ adaugă</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="aa-rosterh">În roster{roster.length ? ` · ${roster.length}` : ""}</div>
              <div className="aa-roster">
                {roster.length === 0 && <div className="aa-none">Nimeni în roster încă. Caută mai sus.</div>}
                {roster.map((p) => (
                  <div key={p.id} className="aa-m">
                    {p.avatar ? <img className="aa-av" src={p.avatar} alt="" /> : <span className="aa-av ini">{p.initials}</span>}
                    <span className="aa-mn">{personName(p)}</span>
                    {canAssign && (
                    <button className="aa-asg" disabled={assigning} title="Asignează pe poziție"
                      onClick={() => onPick?.({ id: p.id, name: personName(p), avatar: p.avatar, initials: p.initials }, mirror?.available ? mirrorOn : false, [...selTimes])}>Asignează</button>
                    )}
                    <button className="aa-rm" title="Scoate din roster" onClick={() => rosterRemovePerson(p)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rulesOn && (
            <div className="asb-rules">
              <div className="rr-head">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 9 4.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                <span>Reguli poziție</span>
              </div>

              <div className="rr-sec">
                <span className="rr-ll">Gen</span>
                <div className="seg">
                  {[["any", "Oricine"], ["M", "Băieți"], ["F", "Fete"]].map(([v, l]) => (
                    <button key={v} className={`seg-b ${draft.defaultGender === v ? "on" : ""}`} onClick={() => setDraft((d) => ({ ...d, defaultGender: v }))}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="rr-sec">
                <span className="rr-ll">Program</span>
                <div className="seg">
                  {[["any", "Oricare"], ["1", "SIM 1"], ["2", "SIM 2"]].map(([v, l]) => (
                    <button key={v} className={`seg-b ${draft.defaultProgram === v ? "on" : ""}`} onClick={() => setDraft((d) => ({ ...d, defaultProgram: v }))}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="rr-sec">
                <span className="rr-ll">Target</span>
                <div className="rr-step">
                  <button className="rr-sb" onClick={() => setDraft((d) => ({ ...d, targetPerMonth: Math.max(0, (d.targetPerMonth || 0) - 1) }))} aria-label="Scade">−</button>
                  <input className="rr-num" type="number" min="0" max="31" value={draft.targetPerMonth}
                    onChange={(e) => setDraft((d) => ({ ...d, targetPerMonth: Math.max(0, Math.min(31, parseInt(e.target.value, 10) || 0)) }))} />
                  <button className="rr-sb" onClick={() => setDraft((d) => ({ ...d, targetPerMonth: Math.min(31, (d.targetPerMonth || 0) + 1) }))} aria-label="Crește">+</button>
                  <span className="rr-x">× / lună</span>
                </div>
              </div>

              <div className="rr-sec col">
                <span className="rr-ll">Instrucțiuni</span>
                <textarea className="rr-ta" value={draft.instructions} onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} placeholder="Ce trebuie să știe cineva pe poziția asta…" />
              </div>

              <button className="asb-gbtn" disabled={rulesBusy} onClick={saveRules}>{rulesBusy ? "Se salvează…" : "Salvează"}</button>

              <div className="rr-div" />

              <div className="rr-sec col">
                <span className="rr-ll">Fișiere (manual)</span>
                {posFiles.length === 0 && <div className="rr-none">Niciun fișier încă.</div>}
                {posFiles.map((f) => (
                  <div key={f.id} className="rr-file">
                    <svg className="rr-fi" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                    {f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a> : <span>{f.name}</span>}
                    <button onClick={() => delPosFile(f.id)} title="Șterge" aria-label="Șterge fișier">×</button>
                  </div>
                ))}
                <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => uploadPosFile(e.target.files?.[0])} />
                <button className="rr-up" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Se încarcă…" : "+ Încarcă fișier"}</button>
              </div>
            </div>
          )}

          {mirror?.available && canAssign && (
            <label className="asb-mirror" title="Când asignezi, pune aceeași persoană și pe echipa pereche, aceeași poziție">
              <input type="checkbox" checked={mirrorOn} onChange={(e) => setMirrorOn(e.target.checked)} />
              {mirror.label || "Adaugă și pe echipa pereche"}
            </label>
          )}

          {simOn && (
            <div className="asb-filters">
              {positionId && !browse && (
                <div className="ff">
                  <span className="ff-l">Poziție</span>
                  <button className={`chip ${fit ? "on" : ""}`} onClick={() => setFit(true)} title="Doar oamenii care fac parte din poziție">Fit</button>
                  <button className={`chip ${!fit ? "on" : ""}`} onClick={() => setFit(false)} title="Toți candidații (poziția rămâne prioritizată)">Toți</button>
                </div>
              )}
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

          {serviceTimes.length >= 2 && !browse && mode === "member" && (
            <div className="asb-times">
              <span className="at-l">Ore</span>
              <div className="at-chips">
                <button className={`atc ${selTimes.size === 0 ? "on" : ""}`} onClick={() => setSelTimes(new Set())} title="Toate orele (During All)">Toate</button>
                {serviceTimes.map((st) => (
                  <button key={st.id} className={`atc ${selTimes.has(st.id) ? "on" : ""}`} title={st.label}
                    onClick={() => setSelTimes((s) => { const n = new Set(s); n.has(st.id) ? n.delete(st.id) : n.add(st.id); return n; })}>{st.label}</button>
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
                    <button key={p.id} className="cand" disabled={assigning || (!browse && !canAssign)}
                      onClick={() => { if (!browse && !canAssign) return; onPick(p, mirror?.available ? mirrorOn : false, [...selTimes]); }}
                      title={!browse && !canAssign ? "Doar vizualizare" : browse ? "Click pe o căsuță din grilă ca să asignezi" : "Asignează (fără email)"}>
                      <PersonAvatar person={p} size={28} showBadge={false} />
                      <span className="cn">{p.name}</span>
                      {cfList(p).length > 0 && (
                        <span className="cfwrap"
                          onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); const aside = e.currentTarget.closest(".asb"); const ar = aside ? aside.getBoundingClientRect() : { left: 0, top: 0 }; setTipFor({ id: p.id, x: r.left - ar.left, y: r.top - ar.top, items: cfList(p) }); }}
                          onMouseLeave={() => setTipFor(null)}
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                          {cfList(p).map((c, i) => (
                            <img key={i} className="cf-ic" src={c.type === "blockout" ? "/icons/warn-red.png" : "/icons/warn-yellow.png"} alt={c.label || c.type} draggable={false} />
                          ))}
                        </span>
                      )}
                      {p.inRoster && <span className="rost" title="În rosterul poziției — slujește oficial aici" />}
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

      {tipFor && (
        <div className="cf-tip" style={{ left: tipFor.x, top: tipFor.y }}>
          {tipFor.items.map((c, i) => (
            <div key={i} className="cf-row">
              <span className={`cf-b ${c.type}`}>
                <img className="cf-ti" src={c.type === "blockout" ? "/icons/warn-red.png" : "/icons/warn-yellow.png"} alt="" draggable={false} />
                {c.label || (c.type === "blockout" ? "Blockout" : "Planificat în aceeași zi")}
              </span>
              {c.detail ? <span className="cf-d">{c.detail}</span> : null}
            </div>
          ))}
        </div>
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
        .asb-ro { margin: 0 16px 8px; padding: 7px 11px; border-radius: 8px; background: rgba(47,129,247,.1); border: 1px solid rgba(47,129,247,.3); color: #9cc4f5; font-size: 12px; text-align: center; }
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
        .asb-rules { margin: 0 16px 10px; padding: 12px 13px; background: var(--surface-2); border: 1px solid var(--border-strong);
          border-radius: 9px; display: flex; flex-direction: column; gap: 11px; animation: rulesIn .18s ease; }
        @keyframes rulesIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

        .asb-add { margin: 0 16px 10px; padding: 12px 13px; background: var(--surface-2); border: 1px solid var(--primary);
          border-radius: 9px; display: flex; flex-direction: column; gap: 9px; animation: rulesIn .18s ease; }
        .aa-h { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 12.5px; font-weight: 600; }
        .aa-hint { color: var(--text-faint); font-size: 11px; line-height: 1.45; }
        .aa-searchwrap { position: relative; display: flex; }
        .aa-sx { position: absolute; right: 8px; top: 7px; background: transparent; border: none; color: var(--text-faint); font-size: 15px; cursor: pointer; }
        .aa-sx:hover { color: var(--text); }
        .aa-res { display: flex; flex-direction: column; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 4px; }
        .aa-ri { display: flex; align-items: center; gap: 9px; background: transparent; border: none; padding: 7px 8px; border-radius: 6px; cursor: pointer; }
        .aa-ri:hover { background: var(--surface-2); }
        .aa-av { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex: none; }
        .aa-av.ini { background: #3a4552; color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; }
        .aa-rn { color: var(--text); font-size: 13px; flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .aa-plus { color: var(--product); font-size: 11.5px; font-weight: 600; flex: none; }
        .aa-rosterh { color: var(--text-faint); font-size: 10.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; margin-top: 2px; }
        .aa-roster { display: flex; flex-direction: column; gap: 4px; max-height: 190px; overflow: auto; }
        .aa-none { color: var(--text-faint); font-size: 12px; padding: 4px 2px; }
        .aa-m { display: flex; align-items: center; gap: 9px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px; }
        .aa-mn { color: var(--text); font-size: 13px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .aa-asg { flex: none; background: rgba(47,129,247,.14); border: 1px solid var(--primary); color: #9cc4f5; border-radius: 6px; height: 26px; padding: 0 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
        .aa-asg:hover { background: var(--primary); color: #fff; } .aa-asg:disabled { opacity: .5; cursor: default; }
        .aa-rm { flex: none; background: transparent; border: none; color: var(--text-faint); font-size: 17px; line-height: 1; cursor: pointer; padding: 0 3px; border-radius: 5px; }
        .aa-rm:hover { color: var(--danger); background: rgba(248,81,73,.1); }
        .rr-head { display: flex; align-items: center; gap: 7px; color: var(--text); font-size: 12.5px; font-weight: 600; }
        .rr-head svg { color: var(--product); flex: none; }
        .rr-sec { display: flex; align-items: center; gap: 10px; }
        .rr-sec.col { flex-direction: column; align-items: stretch; gap: 6px; }
        .rr-ll { color: var(--text-faint); font-size: 10.5px; letter-spacing: .4px; text-transform: uppercase; }
        .rr-sec > .rr-ll { width: 58px; flex: none; }
        .seg { display: flex; flex: 1; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 7px; padding: 2px; gap: 2px; }
        .seg-b { flex: 1; background: transparent; border: none; color: var(--text-dim); font-size: 12px; padding: 5px 0;
          border-radius: 5px; cursor: pointer; transition: background .13s, color .13s; }
        .seg-b:hover { color: var(--text); }
        .seg-b.on { background: var(--primary); color: #fff; font-weight: 600; }
        .rr-step { display: flex; align-items: center; gap: 6px; }
        .rr-sb { width: 27px; height: 27px; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-dim);
          border-radius: 6px; cursor: pointer; font-size: 16px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; transition: border-color .12s, color .12s; }
        .rr-sb:hover { color: var(--text); border-color: var(--primary); }
        .rr-num { width: 44px; text-align: center; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text);
          border-radius: 6px; height: 27px; font-size: 13px; outline: none; -moz-appearance: textfield; }
        .rr-num::-webkit-inner-spin-button, .rr-num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .rr-num:focus { border-color: var(--primary); }
        .rr-x { color: var(--text-faint); font-size: 11.5px; }
        .rr-ta { background: var(--surface); border: 1px solid var(--border-strong); border-radius: 6px; color: var(--text); font-size: 12.5px;
          padding: 8px 9px; min-height: 58px; resize: vertical; font-family: inherit; outline: none; line-height: 1.5; }
        .rr-ta:focus { border-color: var(--primary); }
        .rr-div { height: 1px; background: var(--border); margin: 1px 0; }
        .rr-none { color: var(--text-faint); font-size: 12px; }
        .rr-file { display: flex; align-items: center; gap: 7px; font-size: 12.5px; padding: 3px 0; }
        .rr-fi { color: var(--text-faint); flex: none; }
        .rr-file a { color: var(--text-link); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .rr-file a:hover { text-decoration: underline; }
        .rr-file span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rr-file button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 15px; flex: none; line-height: 1; } .rr-file button:hover { color: var(--danger); }
        .rr-up { background: var(--surface); border: 1px dashed var(--border-strong); color: var(--text-dim); border-radius: 6px; padding: 8px; cursor: pointer; font-size: 12.5px; transition: border-color .12s, color .12s; }
        .rr-up:hover { color: var(--primary); border-color: var(--primary); }
        .asb-filters { padding: 0 16px 10px; display: flex; flex-direction: column; gap: 8px; }
        .ff { display: flex; align-items: center; gap: 6px; }
        .ff-l { color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; width: 32px; }
        .chip { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim);
          border-radius: 20px; padding: 3px 12px; font-size: 12px; cursor: pointer; }
        .chip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
        .chip.dis { opacity: .4; cursor: default; }
        .asb-times { display: flex; align-items: flex-start; gap: 8px; padding: 0 16px 10px; }
        .at-l { color: var(--text-faint); font-size: 10.5px; letter-spacing: .5px; padding-top: 6px; flex: none; }
        .at-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .atc { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 14px; padding: 3px 11px; font-size: 11.5px; cursor: pointer; }
        .atc:hover { color: var(--text); }
        .atc.on { background: var(--primary); border-color: var(--primary); color: #fff; }
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
        .cfwrap { display: inline-flex; align-items: center; gap: 3px; flex: none; cursor: pointer; padding: 2px; margin: -2px; }
        .cf-ic { width: 15px; height: 15px; object-fit: contain; display: block; }
        .cf-tip { position: fixed; z-index: 200; transform: translate(-100%, -100%); margin: -5px 0 0 -2px; pointer-events: none;
          background: #0c1016; border: 1px solid var(--border-strong); border-radius: 9px; padding: 9px 11px;
          box-shadow: 0 10px 30px rgba(0,0,0,.55); min-width: 170px; max-width: 260px; display: flex; flex-direction: column; gap: 8px;
          animation: cftipIn .12s ease; }
        @keyframes cftipIn { from { opacity: 0; transform: translate(-100%, -100%) scale(.96); } to { opacity: 1; transform: translate(-100%, -100%) scale(1); } }
        .cf-row { display: flex; flex-direction: column; gap: 2px; }
        .cf-b { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; }
        .cf-b.blockout { color: var(--danger); } .cf-b.time { color: var(--st-unconfirmed); }
        .cf-ti { width: 13px; height: 13px; object-fit: contain; }
        .cf-d { color: var(--text-dim); font-size: 11.5px; padding-left: 19px; line-height: 1.4; }
        .tgt { font-size: 10px; border-radius: 10px; padding: 0 6px; border: 1px solid; white-space: nowrap; }
        .tgt.below { color: var(--product); border-color: rgba(87,185,138,.5); }
        .tgt.met { color: var(--text-faint); border-color: var(--border-strong); }
        .rost { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--product); box-shadow: 0 0 0 2px rgba(87,185,138,.22); }
        .wk { color: var(--text-faint); font-size: 11px; min-width: 32px; text-align: right; }
        .cand.here { opacity: .75; cursor: default; } .here-b { color: var(--product); }
        .asb-muted { color: var(--text-faint); font-size: 12.5px; padding: 10px 8px; }
      `}</style>
    </aside>
  );
}
