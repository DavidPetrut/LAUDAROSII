"use client";
/**
 * MinistryBoard — vederea unei lucrări (minister): sub-taburi = poziții, iar sub fiecare poziție
 * rosterul (cine slujește acolo) + adăugare prin căutare + scoatere. Datele vin din /people/ministries.
 * ZERO email — doar roster (pc_teamMembers).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { peopleApi } from "@/lib/api/client";

export default function MinistryBoard({ ministry, onChanged }) {
  const [posIdx, setPosIdx] = useState(0);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(false);
  const tRef = useRef(null);

  const positions = ministry?.positions || [];
  const pos = positions[Math.min(posIdx, Math.max(0, positions.length - 1))] || null;

  useEffect(() => { setPosIdx(0); setQ(""); setResults([]); }, [ministry?.name]);

  // căutare oameni de adăugat (debounced); excludem pe cei deja în poziție
  useEffect(() => {
    clearTimeout(tRef.current);
    const s = q.trim();
    if (!s) { setResults([]); return; }
    tRef.current = setTimeout(async () => {
      try {
        const r = await peopleApi.list({ q: s, limit: 8 });
        const have = new Set((pos?.members || []).map((m) => String(m.id)));
        setResults((r.results || []).filter((x) => !have.has(String(x.id))));
      } catch { setResults([]); }
    }, 280);
    return () => clearTimeout(tRef.current);
    // eslint-disable-next-line
  }, [q, pos?.name]);

  async function addPerson(personId) {
    if (!pos) return;
    setAdding(true);
    try { await peopleApi.rosterAdd(personId, pos.positionIds); setQ(""); setResults([]); onChanged?.(); }
    catch {} finally { setAdding(false); }
  }
  async function removePerson(personId) {
    if (!pos) return;
    try { await peopleApi.rosterRemove(personId, pos.positionIds); onChanged?.(); } catch {}
  }

  const members = useMemo(() => pos?.members || [], [pos]);

  if (!ministry) return null;
  return (
    <div className="mb">
      <div className="mb-tabs">
        {positions.map((p, i) => (
          <button key={p.name} className={`mb-tab ${i === posIdx ? "on" : ""}`} onClick={() => setPosIdx(i)}>
            {p.name}<span className="mb-tn">{p.members.length}</span>
          </button>
        ))}
        {positions.length === 0 && <div className="mb-empty">Nicio poziție în această lucrare.</div>}
      </div>

      {pos && (
        <div className="mb-body">
          <div className="mb-addrow">
            <input className="mb-search" placeholder={`Adaugă cineva la „${pos.name}"…`} value={q} onChange={(e) => setQ(e.target.value)} />
            {results.length > 0 && (
              <div className="mb-res">
                {results.map((r) => (
                  <button key={r.id} className="mb-ri" disabled={adding} onClick={() => addPerson(r.id)}>
                    {r.avatar ? <img className="mb-av" src={r.avatar} alt="" /> : <span className="mb-av ini">{r.initials}</span>}
                    <span className="mb-rn">{r.firstName} {r.lastName}</span>
                    <span className="mb-plus">+ adaugă</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-members">
            {members.map((m) => (
              <div key={m.id} className="mb-m">
                {m.avatar ? <img className="mb-av" src={m.avatar} alt="" /> : <span className="mb-av ini">{m.initials}</span>}
                <span className="mb-mn">{m.name}</span>
                {m.sim && <span className="mb-sim">SIM {m.sim}</span>}
                <button className="mb-rm" title="Scoate din roster" onClick={() => removePerson(m.id)}>×</button>
              </div>
            ))}
            {members.length === 0 && <div className="mb-empty">Nimeni încă pe „{pos.name}". Caută mai sus ca să adaugi.</div>}
          </div>
        </div>
      )}

      <style jsx>{`
        .mb-tabs { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
        .mb-tab { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 13px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); font-size: 12.5px; cursor: pointer; }
        .mb-tab:hover { color: var(--text); }
        .mb-tab.on { background: rgba(47,129,247,.12); border-color: var(--primary); color: var(--text); font-weight: 600; }
        .mb-tn { background: var(--surface); border-radius: 10px; padding: 0 7px; font-size: 11px; color: var(--text-faint); }
        .mb-tab.on .mb-tn { color: var(--primary); }
        .mb-addrow { position: relative; margin-bottom: 14px; max-width: 420px; }
        .mb-search { width: 100%; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 8px; height: 38px; padding: 0 13px; color: var(--text); font-size: 13.5px; outline: none; }
        .mb-search:focus { border-color: var(--primary); }
        .mb-res { position: absolute; top: 42px; left: 0; right: 0; z-index: 10; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 9px; box-shadow: 0 12px 34px rgba(0,0,0,.45); padding: 5px; display: flex; flex-direction: column; }
        .mb-ri { display: flex; align-items: center; gap: 10px; background: transparent; border: none; padding: 8px 9px; border-radius: 7px; cursor: pointer; }
        .mb-ri:hover { background: var(--surface-2); }
        .mb-rn { color: var(--text); font-size: 13px; flex: 1; text-align: left; }
        .mb-plus { color: var(--product); font-size: 11.5px; font-weight: 600; }
        .mb-members { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
        .mb-m { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 9px; padding: 9px 11px; }
        .mb-m:hover { border-color: var(--border-strong); }
        .mb-av { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex: none; }
        .mb-av.ini { background: #3a4552; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; }
        .mb-mn { color: var(--text); font-size: 13px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mb-sim { flex: none; color: #9cc4f5; background: rgba(47,129,247,.14); border: 1px solid rgba(47,129,247,.4); border-radius: 10px; padding: 0 7px; font-size: 10.5px; font-weight: 600; }
        .mb-rm { flex: none; background: transparent; border: none; color: var(--text-faint); font-size: 18px; line-height: 1; cursor: pointer; padding: 0 3px; border-radius: 5px; }
        .mb-rm:hover { color: var(--danger); background: rgba(248,81,73,.1); }
        .mb-empty { color: var(--text-faint); font-size: 13px; padding: 14px 2px; grid-column: 1 / -1; }
      `}</style>
    </div>
  );
}
