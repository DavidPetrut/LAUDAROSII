"use client";
/**
 * Management aranjament: redenumire, prioritate (ordine) și ștergere cu cascadă.
 * - „Implicit" = primul aranjament (nu primește prioritate).
 * - Prioritatea apare doar dacă există ≥2 aranjamente non-implicite de reordonat.
 * - Ștergerea e definitivă și duce cu ea cheile + fișierele (avertisment de validare).
 */
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { songsApi } from "@/lib/api/client";

export default function ArrangementModal({ songId, arrangement, arrangements = [], onClose, onDone }) {
  const [name, setName] = useState(arrangement.name || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const nonDefault = arrangements.filter((a) => !a.isDefault);
  const canPrioritize = !arrangement.isDefault && nonDefault.length >= 2;
  const curPriority = nonDefault.findIndex((a) => a.id === arrangement.id) + 1; // 1-based
  const isOnly = arrangements.length <= 1;

  async function saveName() {
    const nm = name.trim();
    if (!nm) { setErr("Numele e obligatoriu."); return; }
    if (nm === arrangement.name) { onClose(); return; }
    setBusy(true); setErr("");
    try { await songsApi.updateArrangement(songId, arrangement.id, { name: nm }); onDone?.(); }
    catch (e) { setErr(e?.message || "Eroare la redenumire."); setBusy(false); }
  }

  async function changePriority(p) {
    // reconstruiește ordinea: implicitul rămâne primul, non-implicitele în noua ordine
    const others = nonDefault.filter((a) => a.id !== arrangement.id);
    others.splice(p - 1, 0, arrangement); // inserează pe poziția p (1-based)
    const defaults = arrangements.filter((a) => a.isDefault);
    const order = [...defaults, ...others].map((a) => a.id);
    setBusy(true); setErr("");
    try { await songsApi.reorderArrangements(songId, order); onDone?.(); }
    catch (e) { setErr(e?.message || "Eroare la prioritate."); setBusy(false); }
  }

  async function doDelete() {
    setBusy(true); setErr("");
    try { await songsApi.deleteArrangement(songId, arrangement.id); onDone?.({ deleted: arrangement.id }); }
    catch (e) { setErr(e?.message || "Eroare la ștergere."); setBusy(false); }
  }

  return (
    <Modal title={`Aranjament · ${arrangement.name}`} onClose={onClose} width={440}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Închide</button>
        <button className="btn btn-primary" onClick={saveName} disabled={busy}>{busy ? "…" : "Salvează"}</button>
      </>}>
      {err && <div className="err">{err}</div>}

      <label className="lbl">Nume aranjament</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && saveName()} autoFocus />

      {arrangement.isDefault && <div className="hint">Acesta e aranjamentul <b>implicit</b> (primul) — nu se prioritizează.</div>}

      {canPrioritize && (
        <>
          <label className="lbl">Prioritate <span className="muted">(ordinea între cele {nonDefault.length} non-implicite)</span></label>
          <select className="input" value={curPriority} onChange={(e) => changePriority(Number(e.target.value))} disabled={busy}>
            {Array.from({ length: nonDefault.length }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>{p} din {nonDefault.length}</option>
            ))}
          </select>
        </>
      )}

      <div className="danger-zone">
        {!confirmDel ? (
          <button className="btn btn-danger-outline" onClick={() => setConfirmDel(true)} disabled={isOnly}
            title={isOnly ? "Un cântec trebuie să aibă cel puțin un aranjament" : ""}>
            Șterge aranjamentul
          </button>
        ) : (
          <div className="confirm">
            <p className="warn">Se șterge <b>definitiv</b> „{arrangement.name}" împreună cu <b>toate cheile și fișierele</b> din el. Ireversibil.</p>
            <div className="confirm-foot">
              <button className="btn btn-link" onClick={() => setConfirmDel(false)}>Anulează</button>
              <button className="btn btn-danger" onClick={doDelete} disabled={busy}>{busy ? "…" : "Șterge definitiv"}</button>
            </div>
          </div>
        )}
        {isOnly && <div className="hint">Nu poți șterge singurul aranjament al cântecului.</div>}
      </div>

      <style jsx>{`
        .lbl { display: block; font-size: 12.5px; color: var(--text); margin: 16px 0 6px; font-weight: 500; }
        .lbl .muted { color: var(--text-faint); font-weight: 400; }
        .input { width: 100%; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 9px 11px; font-size: 13.5px; }
        .hint { font-size: 12px; color: var(--text-faint); margin-top: 8px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; }
        .danger-zone { margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--border); }
        .warn { font-size: 13px; color: #f0a7a2; line-height: 1.5; margin: 0 0 12px; }
        .confirm-foot { display: flex; justify-content: flex-end; gap: 12px; }
        :global(.btn-danger-outline) { background: transparent; border: 1px solid var(--danger); color: #f0a7a2; }
        :global(.btn-danger-outline:hover:not(:disabled)) { background: rgba(229,83,75,.12); }
        :global(.btn-danger-outline:disabled) { opacity: .5; cursor: not-allowed; }
      `}</style>
    </Modal>
  );
}
