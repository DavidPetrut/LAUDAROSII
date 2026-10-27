"use client";
/**
 * BlockedPeopleModal — toți oamenii blocați ACUM (status Pauză/Suspendat + church-block activ),
 * în timp real, cu deblocare pe loc. Gated: se deschide doar de cine poate planifica.
 * Church-block dated → se vede „până la"; expiră singur. ZERO email.
 */
import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { peopleApi } from "@/lib/api/client";

const KIND = {
  churchBlock: { label: "Blocat de biserică", cls: "church" },
  onBreak: { label: "Pauză", cls: "pause" },
  suspended: { label: "Suspendat", cls: "susp" },
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function BlockedPeopleModal({ onClose, onChanged, initialRows = null }) {
  const [rows, setRows] = useState(initialRows || []);
  const [loading, setLoading] = useState(!initialRows);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    peopleApi.blocked().then((r) => { setRows(r.blocked || []); setErr(""); })
      .catch((e) => setErr(e?.message || "Eroare la listă."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (!initialRows) load(); }, [load]); // preview: nu fetch-uim

  async function unblock(row) {
    setBusyId(row.id);
    try {
      if (row.kind === "churchBlock") await peopleApi.clearChurchBlock(row.id);
      else await peopleApi.update(row.id, { schedulingStatus: "available" });
      setRows((l) => l.filter((x) => String(x.id) !== String(row.id)));
      onChanged?.();
    } catch (e) { setErr(e?.message || "Eroare la deblocare."); }
    finally { setBusyId(null); }
  }

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={load} disabled={loading}>Reîmprospătează</button>
      <button className="btn btn-primary" onClick={onClose}>Gata</button>
    </>
  );

  return (
    <Modal title={`Blocați acum${rows.length ? ` (${rows.length})` : ""}`} onClose={onClose} footer={footer} width={520}>
      <div className="bp">
        {err ? <div className="bp-err">{err}</div> : null}
        {loading ? <div className="bp-muted">Se încarcă…</div> : rows.length === 0 ? (
          <div className="bp-empty"><span className="bp-ok">Nimeni blocat acum.</span><span className="bp-sub">Toți oamenii apar în listele de planificare.</span></div>
        ) : (
          <div className="bp-list">
            {rows.map((r) => {
              const k = KIND[r.kind] || KIND.suspended;
              return (
                <div key={r.id} className={`bp-row ${busyId === r.id ? "busy" : ""}`}>
                  {r.avatar ? <img className="bp-av" src={r.avatar} alt="" /> : <span className="bp-av ini">{r.initials}</span>}
                  <div className="bp-info">
                    <span className="bp-name">{r.name}</span>
                    <span className="bp-meta">
                      <span className={`bp-tag ${k.cls}`}>{k.label}</span>
                      {r.kind === "churchBlock" && <span className="bp-until">{r.until ? `până ${fmt(r.until)}` : "nelimitat"}</span>}
                      {r.reason ? <span className="bp-reason">· {r.reason}</span> : null}
                    </span>
                  </div>
                  <button className="bp-unb" disabled={busyId === r.id} onClick={() => unblock(r)}>{busyId === r.id ? "…" : "Deblochează"}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .bp { display: flex; flex-direction: column; gap: 10px; animation: bpIn .18s ease; }
        @keyframes bpIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        .bp-err { background: rgba(229,83,75,.12); border: 1px solid var(--danger); color: #f0a9a4; padding: 8px 11px; border-radius: 6px; font-size: 12.5px; }
        .bp-muted { color: var(--text-faint); font-size: 13px; padding: 16px 0; }
        .bp-empty { display: flex; flex-direction: column; gap: 3px; padding: 20px 0; text-align: center; }
        .bp-ok { color: var(--product); font-size: 14px; font-weight: 600; }
        .bp-sub { color: var(--text-faint); font-size: 12.5px; }
        .bp-list { display: flex; flex-direction: column; max-height: 54vh; overflow: auto; margin: 0 -4px; }
        .bp-row { display: flex; align-items: center; gap: 11px; padding: 9px 4px; border-bottom: 1px solid var(--border-soft); transition: opacity .12s; }
        .bp-row:last-child { border-bottom: none; } .bp-row.busy { opacity: .5; }
        .bp-av { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex: none; }
        .bp-av.ini { background: #3a4552; color: #fff; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
        .bp-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .bp-name { color: var(--text); font-size: 13.5px; }
        .bp-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .bp-tag { font-size: 10.5px; font-weight: 600; border-radius: 10px; padding: 1px 8px; border: 1px solid; }
        .bp-tag.church { color: #9cc4f5; border-color: var(--primary); background: rgba(47,129,247,.12); }
        .bp-tag.pause { color: #e0c977; border-color: #c9a227; background: rgba(201,162,39,.12); }
        .bp-tag.susp { color: #f0a7a2; border-color: var(--danger); background: rgba(229,83,75,.12); }
        .bp-until, .bp-reason { color: var(--text-faint); font-size: 11.5px; }
        .bp-unb { flex: none; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 6px 12px; font-size: 12.5px; cursor: pointer; transition: border-color .12s; }
        .bp-unb:hover { border-color: var(--product); }
        .bp-unb:disabled { opacity: .6; cursor: default; }
      `}</style>
    </Modal>
  );
}
