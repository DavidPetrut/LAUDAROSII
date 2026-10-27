"use client";
/**
 * QuickAssignModal — asignare rapidă a unei persoane în roster (lucrări → poziții), din People.
 * Arată toate lucrările (ministere) cu pozițiile lor ca bife; o bifă = persoana e în rosterul acelei
 * poziții (pe toate SIM-urile cu același nume). Câteva clicuri → o bagi în 15 slujiri. ZERO email.
 */
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { peopleApi } from "@/lib/api/client";

export default function QuickAssignModal({ person, onClose, onChanged }) {
  const [ministries, setMinistries] = useState(null);
  const [roster, setRoster] = useState(() => new Set()); // positionId-urile persoanei
  const [busy, setBusy] = useState(null); // numele poziției în curs
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(() => new Set()); // ministere expandate

  useEffect(() => {
    let alive = true;
    Promise.all([peopleApi.ministries(), peopleApi.roster(person.id)])
      .then(([m, r]) => { if (!alive) return; setMinistries(m.ministries || []); setRoster(new Set((r.positionIds || []).map(String))); })
      .catch(() => alive && setMinistries([]));
    return () => { alive = false; };
  }, [person.id]);

  const isOn = (pos) => (pos.positionIds || []).some((id) => roster.has(String(id)));
  async function toggle(pos) {
    const on = isOn(pos);
    setBusy(pos.name);
    const ids = pos.positionIds.map(String);
    setRoster((s) => { const n = new Set(s); if (on) ids.forEach((x) => n.delete(x)); else ids.forEach((x) => n.add(x)); return n; }); // optimist
    try {
      if (on) await peopleApi.rosterRemove(person.id, pos.positionIds);
      else await peopleApi.rosterAdd(person.id, pos.positionIds);
      onChanged?.();
    } catch { /* la eroare, reîncarcă rosterul */ peopleApi.roster(person.id).then((r) => setRoster(new Set((r.positionIds || []).map(String)))).catch(() => {}); }
    finally { setBusy(null); }
  }

  const filtered = useMemo(() => {
    if (!ministries) return [];
    const s = q.trim().toLowerCase();
    if (!s) return ministries;
    return ministries
      .map((m) => ({ ...m, positions: m.positions.filter((p) => p.name.toLowerCase().includes(s) || m.name.toLowerCase().includes(s)) }))
      .filter((m) => m.positions.length);
  }, [ministries, q]);

  const onCount = useMemo(() => {
    if (!ministries) return 0;
    return ministries.reduce((acc, m) => acc + m.positions.filter(isOn).length, 0);
    // eslint-disable-next-line
  }, [ministries, roster]);

  return (
    <Modal title={`Asignează — ${person.name}`} onClose={onClose} width={560}>
      <div className="qa-top">
        <div className="qa-sub">{person.name} e în rosterul a <b>{onCount}</b> poziție(i). Bifează ca să-l adaugi/scoți. Fără email.</div>
        <input className="qa-search" placeholder="Caută lucrare sau poziție…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {ministries === null ? <div className="qa-load">Se încarcă lucrările…</div> : (
        <div className="qa-list">
          {filtered.map((m) => {
            const col = !q && !open.has(m.name);
            const onN = m.positions.filter(isOn).length;
            return (
              <div key={m.name} className="qa-min">
                <button className="qa-mh" onClick={() => setOpen((s) => { const n = new Set(s); n.has(m.name) ? n.delete(m.name) : n.add(m.name); return n; })}>
                  <span className={`qa-car ${col ? "col" : ""}`}>▾</span>
                  <span className="qa-mn">{m.name}</span>
                  {onN > 0 && <span className="qa-mb">{onN}</span>}
                  <span className="qa-mc">{m.positions.length} poz.</span>
                </button>
                {!col && (
                  <div className="qa-pos">
                    {m.positions.map((p) => (
                      <button key={p.name} className={`qa-chip ${isOn(p) ? "on" : ""}`} disabled={busy === p.name} onClick={() => toggle(p)}>
                        {isOn(p) && <span className="qa-ck">✓</span>}{p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="qa-load">Nicio lucrare/poziție.</div>}
        </div>
      )}
      <style jsx>{`
        .qa-top { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
        .qa-sub { color: var(--text-dim); font-size: 12.5px; } .qa-sub b { color: var(--text); }
        .qa-search { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 7px; height: 34px; padding: 0 11px; color: var(--text); font-size: 13px; outline: none; }
        .qa-search:focus { border-color: var(--primary); }
        .qa-load { color: var(--text-faint); font-size: 13px; padding: 16px 0; text-align: center; }
        .qa-list { display: flex; flex-direction: column; gap: 6px; max-height: 56vh; overflow: auto; }
        .qa-min { border: 1px solid var(--border); border-radius: 9px; overflow: hidden; }
        .qa-mh { display: flex; align-items: center; gap: 9px; width: 100%; background: var(--surface-2); border: none; padding: 10px 12px; cursor: pointer; }
        .qa-mh:hover { background: var(--surface-3); }
        .qa-car { color: var(--text-faint); font-size: 10px; transition: transform .12s; } .qa-car.col { transform: rotate(-90deg); }
        .qa-mn { color: var(--text); font-size: 13.5px; font-weight: 600; flex: 1; text-align: left; }
        .qa-mb { background: rgba(87,185,138,.18); color: var(--product); border-radius: 20px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
        .qa-mc { color: var(--text-faint); font-size: 11px; }
        .qa-pos { display: flex; flex-wrap: wrap; gap: 7px; padding: 11px 12px; }
        .qa-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 16px; padding: 5px 12px; font-size: 12.5px; cursor: pointer; transition: all .12s; }
        .qa-chip:hover { color: var(--text); border-color: var(--primary); }
        .qa-chip.on { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
        .qa-chip:disabled { opacity: .55; cursor: default; }
        .qa-ck { font-size: 11px; }
      `}</style>
    </Modal>
  );
}
