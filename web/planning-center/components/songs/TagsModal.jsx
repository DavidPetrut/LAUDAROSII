"use client";
/**
 * Tags — asignează tag-uri pe cântec (domain "song") sau pe aranjament (domain "arrangement").
 * Catalog grupat (grupuri + tag-uri cu culoare) din /songs/meta/tags?domain=…; selecția se salvează
 * prin onSave(ids) → PATCH /songs/:id/tags sau /songs/:id/arrangements/:aid/tags (one source of truth
 * cu mobilul). Permite și crearea unui grup / tag nou (ca pe mobil: Edit Tags), ca pickerul să fie utilizabil.
 * „You'll only see tags that match the tab you're on" → domain controlează catalogul.
 */
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { songsApi } from "@/lib/api/client";

export default function TagsModal({ domain = "song", selectedIds = [], onClose, onSave }) {
  const [groups, setGroups] = useState([]);
  const [sel, setSel] = useState(() => (selectedIds || []).map(String));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [newGroup, setNewGroup] = useState("");       // input „grup nou"
  const [addGroup, setAddGroup] = useState(false);
  const [newTag, setNewTag] = useState({});           // { [groupId]: name } pentru inputul de tag nou
  const [addTagFor, setAddTagFor] = useState(null);   // grupul cu inputul de tag nou deschis

  const load = async (keep = sel) => {
    setLoading(true);
    try { setGroups((await songsApi.tags(domain)).groups || []); setSel(keep.map(String)); }
    catch (e) { setErr(e?.message || "Eroare la tag-uri."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(selectedIds); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const createGroup = async () => {
    const name = newGroup.trim(); if (!name) return;
    setBusy(true); setErr("");
    try { await songsApi.createTagGroup({ name, domain }); setNewGroup(""); setAddGroup(false); await load(); }
    catch (e) { setErr(e?.message || "Nu s-a creat grupul."); }
    finally { setBusy(false); }
  };
  const createTag = async (groupId) => {
    const name = (newTag[groupId] || "").trim(); if (!name) return;
    setBusy(true); setErr("");
    try {
      const r = await songsApi.createTag({ name, tagGroupId: groupId, domain });
      setNewTag((m) => ({ ...m, [groupId]: "" })); setAddTagFor(null);
      await load([...sel, String(r.id)]); // selectează automat tag-ul nou
    } catch (e) { setErr(e?.message || "Nu s-a creat tag-ul."); }
    finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true); setErr("");
    try { await onSave(sel); onClose(); }
    catch (e) { setErr(e?.message || "Nu s-a salvat."); setBusy(false); }
  };

  return (
    <Modal title={domain === "arrangement" ? "Arrangement tags" : "Song tags"} onClose={onClose} width={440}
      footer={<>
        <button className="btn btn-link" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || loading}>{busy ? "…" : "Salvează"}</button>
      </>}>
      {err && <div className="err">{err}</div>}
      {loading ? (
        <div className="dim">Se încarcă…</div>
      ) : (
        <>
          {groups.length === 0 && <div className="dim">Niciun grup de tag-uri. Creează unul mai jos.</div>}
          {groups.map((g) => (
            <div key={String(g.id)} className="grp">
              <div className="grp-h">{g.name}</div>
              <div className="tag-list">
                {g.tags.map((t) => {
                  const on = sel.includes(String(t.id));
                  return (
                    <button key={String(t.id)} type="button" className={`tag ${on ? "on" : ""}`} onClick={() => toggle(String(t.id))}>
                      <span className="dot" style={{ background: t.color || "var(--text-faint)" }} />
                      {t.name}
                    </button>
                  );
                })}
                {g.tags.length === 0 && <span className="dim sm">— fără tag-uri —</span>}
              </div>
              {addTagFor === String(g.id) ? (
                <div className="add-row">
                  <input className="input sm" autoFocus placeholder="Nume tag" value={newTag[String(g.id)] || ""}
                    onChange={(e) => setNewTag((m) => ({ ...m, [String(g.id)]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") createTag(String(g.id)); if (e.key === "Escape") setAddTagFor(null); }} />
                  <button className="mini-btn" onClick={() => createTag(String(g.id))} disabled={busy}>Adaugă</button>
                </div>
              ) : (
                <button className="add-link" onClick={() => setAddTagFor(String(g.id))}>＋ tag nou</button>
              )}
            </div>
          ))}

          {addGroup ? (
            <div className="add-row mt">
              <input className="input sm" autoFocus placeholder="Nume grup" value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createGroup(); if (e.key === "Escape") setAddGroup(false); }} />
              <button className="mini-btn" onClick={createGroup} disabled={busy}>Creează</button>
            </div>
          ) : (
            <button className="add-link mt" onClick={() => setAddGroup(true)}>＋ grup nou</button>
          )}
        </>
      )}
      <style jsx>{`
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2; padding: 9px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; }
        .dim { color: var(--text-dim); font-size: 13px; }
        .dim.sm { font-size: 12.5px; }
        .grp { margin-bottom: 16px; }
        .grp-h { color: var(--primary); font-size: 13px; font-weight: 700; margin-bottom: 8px; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag { display: inline-flex; align-items: center; gap: 7px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 999px; padding: 5px 12px; font-size: 13px; cursor: pointer; transition: border-color .12s, color .12s, background .12s; }
        .tag:hover { border-color: var(--primary); color: var(--text); }
        .tag.on { border-color: var(--primary); color: var(--text); background: rgba(134,193,63,.12); }
        .dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
        .add-row { display: flex; gap: 8px; margin-top: 10px; }
        .add-row.mt, .add-link.mt { margin-top: 6px; }
        .input.sm { flex: 1; height: 32px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 0 10px; font-size: 13px; min-width: 0; }
        .mini-btn { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); border-radius: 6px; padding: 0 12px; cursor: pointer; font-size: 12.5px; }
        .mini-btn:hover { border-color: var(--primary); }
        .add-link { background: transparent; border: none; color: var(--primary); cursor: pointer; font-size: 12.5px; padding: 6px 0 0; }
      `}</style>
    </Modal>
  );
}
