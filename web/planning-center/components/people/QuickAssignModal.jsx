"use client";
/**
 * QuickAssignModal — asignare rapidă a unei persoane în roster (lucrări → poziții), din People.
 * Sus: pozițiile pe care slujește ACUM (chip-uri removibile) ca să vezi dintr-o privire unde e.
 * Jos: lucrările (collapsible) cu pozițiile ca bife; o bifă = persoana e în rosterul acelei poziții
 * (pe toate SIM-urile cu același nume). Câteva clicuri → o bagi în 15 slujiri. ZERO email.
 */
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { peopleApi } from "@/lib/api/client";

const norm = (s) => String(s).toLowerCase();

export default function QuickAssignModal({ person, onClose, onChanged }) {
  const [ministries, setMinistries] = useState(null);
  const [roster, setRoster] = useState(() => new Set()); // positionId-urile persoanei
  const [busy, setBusy] = useState(null); // numele poziției în curs
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(() => new Set()); // ministere expandate manual

  useEffect(() => {
    let alive = true;
    Promise.all([peopleApi.ministries(), peopleApi.roster(person.id)])
      .then(([m, r]) => {
        if (!alive) return;
        const mins = m.ministries || [];
        setMinistries(mins);
        const rs = new Set((r.positionIds || []).map(String));
        setRoster(rs);
        // deschide din start lucrările unde persoana slujește deja (ca să nu pară gol)
        const pre = new Set();
        mins.forEach((mm) => { if (mm.positions.some((p) => (p.positionIds || []).some((id) => rs.has(String(id))))) pre.add(mm.name); });
        setOpen(pre);
      })
      .catch(() => alive && setMinistries([]));
    return () => { alive = false; };
  }, [person.id]);

  const isOn = (pos) => (pos.positionIds || []).some((id) => roster.has(String(id)));

  async function toggle(pos, ministryName) {
    const on = isOn(pos);
    setBusy(`${ministryName}|${pos.name}`);
    const ids = pos.positionIds.map(String);
    setRoster((s) => { const n = new Set(s); if (on) ids.forEach((x) => n.delete(x)); else ids.forEach((x) => n.add(x)); return n; }); // optimist
    try {
      if (on) await peopleApi.rosterRemove(person.id, pos.positionIds);
      else await peopleApi.rosterAdd(person.id, pos.positionIds);
      onChanged?.();
    } catch { peopleApi.roster(person.id).then((r) => setRoster(new Set((r.positionIds || []).map(String)))).catch(() => {}); }
    finally { setBusy(null); }
  }

  // pozițiile pe care slujește ACUM, aplatizate (pt. secțiunea de sus)
  const current = useMemo(() => {
    if (!ministries) return [];
    const out = [];
    ministries.forEach((m) => m.positions.forEach((p) => { if (isOn(p)) out.push({ ...p, ministry: m.name }); }));
    return out.sort((a, b) => a.ministry.localeCompare(b.ministry) || a.name.localeCompare(b.name));
    // eslint-disable-next-line
  }, [ministries, roster]);

  const filtered = useMemo(() => {
    if (!ministries) return [];
    const s = norm(q.trim());
    if (!s) return ministries;
    return ministries
      .map((m) => ({ ...m, positions: m.positions.filter((p) => norm(p.name).includes(s) || norm(m.name).includes(s)) }))
      .filter((m) => m.positions.length);
  }, [ministries, q]);

  // în căutare: lucrările care au potriviri se auto-deschid, dar rămân collapsible (din `open`)
  const isExpanded = (mName, matched) => open.has(mName) || (!!q.trim() && matched);

  return (
    <Modal title={`Slujiri — ${person.name}`} onClose={onClose} width={580}>
      <div className="qa-sub">
        {current.length ? <>Slujește pe <b>{current.length}</b> poziție(i). Bifează ca să adaugi/scoți.</> : <>Nu slujește încă nicăieri. Bifează o poziție ca să-l adaugi.</>}
        <span className="qa-noemail">· fără email</span>
      </div>

      {/* SLUJEȘTE ACUM — chip-uri removibile */}
      {current.length > 0 && (
        <div className="qa-now">
          {current.map((p) => (
            <button key={`${p.ministry}|${p.name}`} className="qa-nchip" disabled={busy === `${p.ministry}|${p.name}`}
              title={`${p.ministry} · scoate din roster`} onClick={() => toggle(p, p.ministry)}>
              <span className="qa-nm">{p.name}</span><span className="qa-nmin">{p.ministry}</span><span className="qa-nx">×</span>
            </button>
          ))}
        </div>
      )}

      <div className="qa-searchwrap">
        <input className="qa-search" placeholder="Caută lucrare sau poziție…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="qa-sx" onClick={() => setQ("")}>×</button>}
      </div>

      {ministries === null ? <div className="qa-load">Se încarcă lucrările…</div> : (
        <div className="qa-list">
          {filtered.map((m) => {
            const onN = m.positions.filter(isOn).length;
            const exp = isExpanded(m.name, true);
            return (
              <div key={m.name} className="qa-min">
                <button className="qa-mh" onClick={() => setOpen((s) => { const n = new Set(s); n.has(m.name) ? n.delete(m.name) : n.add(m.name); return n; })}>
                  <span className={`qa-car ${exp ? "" : "col"}`}>▾</span>
                  <span className="qa-mn">{m.name}</span>
                  {onN > 0 && <span className="qa-mb">{onN}</span>}
                  <span className="qa-mc">{m.positions.length} poz.</span>
                </button>
                {exp && (
                  <div className="qa-pos">
                    {m.positions.map((p) => {
                      const k = `${m.name}|${p.name}`;
                      return (
                        <button key={p.name} className={`qa-chip ${isOn(p) ? "on" : ""}`} disabled={busy === k} onClick={() => toggle(p, m.name)}>
                          {isOn(p) && <span className="qa-ck">✓</span>}{p.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="qa-load">Nicio lucrare/poziție pentru „{q}".</div>}
        </div>
      )}
      <style jsx>{`
        .qa-sub { color: var(--text-dim); font-size: 12.5px; margin-bottom: 12px; } .qa-sub b { color: var(--text); }
        .qa-noemail { color: var(--text-faint); }
        .qa-now { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
        .qa-nchip { display: inline-flex; align-items: center; gap: 7px; background: rgba(87,185,138,.12); border: 1px solid rgba(87,185,138,.4);
          color: var(--text); border-radius: 16px; padding: 4px 6px 4px 11px; font-size: 12px; cursor: pointer; transition: all .12s; }
        .qa-nchip:hover { background: rgba(229,83,75,.12); border-color: rgba(229,83,75,.45); }
        .qa-nchip:disabled { opacity: .5; cursor: default; }
        .qa-nm { font-weight: 600; }
        .qa-nmin { color: var(--text-faint); font-size: 10.5px; }
        .qa-nx { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%;
          background: rgba(255,255,255,.06); color: var(--text-dim); font-size: 13px; line-height: 1; }
        .qa-nchip:hover .qa-nx { color: var(--danger); }
        .qa-searchwrap { position: relative; margin-bottom: 10px; }
        .qa-search { width: 100%; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 8px; height: 36px; padding: 0 30px 0 12px; color: var(--text); font-size: 13px; outline: none; }
        .qa-search:focus { border-color: var(--primary); }
        .qa-sx { position: absolute; right: 8px; top: 7px; background: transparent; border: none; color: var(--text-faint); font-size: 16px; cursor: pointer; }
        .qa-sx:hover { color: var(--text); }
        .qa-load { color: var(--text-faint); font-size: 13px; padding: 16px 0; text-align: center; }
        .qa-list { display: flex; flex-direction: column; gap: 6px; max-height: 50vh; overflow: auto; padding-right: 2px; }
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
