"use client";
/**
 * MinistryGroupsModal — mapează fiecare echipă la una din cele 5 slujiri mari.
 * Salvare imediată per schimbare (PATCH /teams/:id). Compatibil import PCO (string liber).
 */
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { teamsApi } from "@/lib/api/client";
import Skeleton from "@/components/ui/Skeleton";

export default function MinistryGroupsModal({ groups = [], onClose, onChanged, initialTeams = null }) {
  const [teams, setTeams] = useState(initialTeams || []);
  const [loading, setLoading] = useState(!initialTeams);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (initialTeams) return; // preview/test (producția nu-l pasează)
    let alive = true;
    teamsApi.list().then((r) => alive && setTeams(r.teams || []))
      .catch((e) => alive && setErr(e?.message || "Eroare la echipe."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  async function setGroup(teamId, value) {
    setSavingId(teamId);
    const prev = teams;
    setTeams((l) => l.map((t) => (String(t.id) === String(teamId) ? { ...t, ministryGroup: value } : t)));
    try { await teamsApi.setGroup(teamId, value); onChanged?.(); }
    catch (e) { setTeams(prev); setErr(e?.message || "Eroare la salvare."); }
    finally { setSavingId(null); }
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return teams;
    return teams.filter((x) => `${x.name} ${x.serviceTypeName}`.toLowerCase().includes(t));
  }, [teams, q]);

  const footer = <button className="btn btn-primary" onClick={onClose}>Gata</button>;

  return (
    <Modal title="Grupuri de slujire" onClose={onClose} footer={footer} width={560}>
      <div className="mg">
        <div className="mg-hint">Mapează fiecare echipă la una din cele 5 slujiri mari.</div>
        <input className="input mg-search" placeholder="Caută echipă" value={q} onChange={(e) => setQ(e.target.value)} />
        {err ? <div className="mg-err">{err}</div> : null}
        {loading ? <Skeleton rows={3} /> : (
          <div className="mg-list">
            {filtered.length === 0 && <div className="mg-muted">Nicio echipă.</div>}
            {filtered.map((t) => (
              <div key={t.id} className={`mg-row ${savingId === t.id ? "saving" : ""}`}>
                <div className="mg-info">
                  <span className="mg-name">{t.name}</span>
                  {t.serviceTypeName ? <span className="mg-st">{t.serviceTypeName}</span> : null}
                </div>
                <select className="mg-sel" value={t.ministryGroup || ""} onChange={(e) => setGroup(t.id, e.target.value)}>
                  <option value="">— fără grup —</option>
                  {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                  {t.ministryGroup && !groups.includes(t.ministryGroup) ? <option value={t.ministryGroup}>{t.ministryGroup}</option> : null}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .mg { display: flex; flex-direction: column; gap: 10px; animation: mgIn .18s ease; }
        @keyframes mgIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        .mg-hint { color: var(--text-faint); font-size: 12px; }
        .mg-search { max-width: 260px; }
        .mg-err { background: rgba(229,83,75,.12); border: 1px solid var(--danger); color: #f0a9a4; padding: 8px 11px; border-radius: 6px; font-size: 12.5px; }
        .mg-muted { color: var(--text-faint); font-size: 13px; padding: 14px 0; }
        .mg-list { display: flex; flex-direction: column; max-height: 50vh; overflow: auto; margin: 0 -4px; }
        .mg-row { display: flex; align-items: center; gap: 12px; padding: 9px 4px; border-bottom: 1px solid var(--border-soft); transition: opacity .12s; }
        .mg-row:last-child { border-bottom: none; }
        .mg-row.saving { opacity: .55; }
        .mg-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .mg-name { color: var(--text); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mg-st { color: var(--text-faint); font-size: 11px; }
        .mg-sel { flex: none; width: 180px; height: 32px; background: var(--surface-2); color: var(--text);
          border: 1px solid var(--border-strong); border-radius: 6px; padding: 0 8px; font-size: 12.5px; outline: none; cursor: pointer; }
        .mg-sel:focus { border-color: var(--primary); }
      `}</style>
    </Modal>
  );
}
