"use client";
/**
 * „Alte slujiri" pe un item (element) — slujiri non-vocale din Matrix-ul săptămânii:
 * Gazdă serviciu / Vorbitor cină / Îndemn rugăciune / Predică. Fiecare = o persoană (avatar + nume), ca Lead.
 * La Predică se poate căuta și printre TOȚI predicatorii (rosterul poziției), nu doar cei programați.
 * Apare sub Lead la item; butonul „+ Alte slujiri" coboară pe măsură ce adaugi.
 */
import { useMemo, useState } from "react";
import PersonAvatar from "@/components/plans/PersonAvatar";

const KINDS = [
  { k: "host", l: "Gazdă serviciu" },
  { k: "communion", l: "Vorbitor cină" },
  { k: "prayer", l: "Îndemn rugăciune" },
  { k: "preach", l: "Predică" },
  { k: "worship", l: "Lider de închinare" },
];
const kindLabel = (k) => (KINDS.find((x) => x.k === k) || {}).l || k;

export default function MinistriesPicker({ value = [], week = [], preachers = [], byKind = {}, canEdit = false, onChange }) {
  const [openIdx, setOpenIdx] = useState(null); // indexul rândului cu picker-ul de persoană deschis
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState("");

  const addKind = (k) => { onChange([...value, { kind: k, personId: null, name: "", avatar: "", initials: "" }]); setAddOpen(false); setQ(""); setOpenIdx(value.length); };
  const setPerson = (idx, p) => { onChange(value.map((m, i) => (i === idx ? { ...m, personId: p.personId, name: p.name, avatar: p.avatar, initials: p.initials } : m))); setOpenIdx(null); setQ(""); };
  const removeAt = (idx) => onChange(value.filter((_, i) => i !== idx));

  // Implicit: DOAR cine are slujirea asta pe Matrix săpt. asta (byKind). La search: restul programaților.
  const poolFor = (kind) => {
    const s = q.trim().toLowerCase();
    if (!s) return byKind[kind] || [];
    return week.filter((p) => p.name.toLowerCase().includes(s));
  };

  return (
    <div className="mp">
      {(openIdx !== null || addOpen) && <div className="mp-back" onClick={() => { setOpenIdx(null); setAddOpen(false); setQ(""); }} />}
      <div className="mp-h">Alte slujiri</div>

      {value.map((m, idx) => (
        <div key={idx} className="mrow">
          <span className="mr-l">{kindLabel(m.kind)}</span>
          <div className="mr-people">
            {m.personId || m.name ? (
              <span className="mchip">
                {m.personId ? <PersonAvatar person={m} size={18} /> : <span className="mchip-ini">{(m.name || "?").slice(0, 1).toUpperCase()}</span>}
                {m.name || "—"}
                {canEdit && <button onClick={() => removeAt(idx)} title="Șterge">✕</button>}
              </span>
            ) : canEdit ? (
              <button className="mr-pick" onClick={() => { setOpenIdx(openIdx === idx ? null : idx); setQ(""); }}>+ alege persoana</button>
            ) : <span className="mr-none">—</span>}
            {canEdit && (m.personId || m.name) && <button className="mr-change" onClick={() => { setOpenIdx(openIdx === idx ? null : idx); setQ(""); }} title="Schimbă">✎</button>}
          </div>

          {openIdx === idx && canEdit && (
            <div className="mp-pop">
              <input className="mp-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută altă persoană…" />
              <div className="mp-list">
                {!q.trim() && !(byKind[m.kind] || []).length && <div className="mp-empty">Nimeni pe această slujire săptămâna asta. Caută mai jos.</div>}
                {poolFor(m.kind).map((p) => (
                  <button key={p.personId} className="mp-item" onClick={() => setPerson(idx, p)}>
                    <PersonAvatar person={p} size={22} />
                    <span className="mp-nm">{p.name}</span>
                  </button>
                ))}
                {!poolFor(m.kind).length && <div className="mp-empty">Nimic găsit.</div>}
              </div>
            </div>
          )}
        </div>
      ))}

      {canEdit && (
        <div className="mp-add-wrap">
          <button className="mp-add" onClick={() => { setAddOpen((v) => !v); setOpenIdx(null); }}>+ Alte slujiri</button>
          {addOpen && (
            <div className="mp-pop mp-pop-add">
              {KINDS.map((k) => <button key={k.k} className="mp-kind" onClick={() => addKind(k.k)}>{k.l}</button>)}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .mp { position: relative; margin-top: 12px; }
        .mp-back { position: fixed; inset: 0; z-index: 5; }
        .mp-h { color: var(--text-faint); font-size: 10px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 7px; font-weight: 700; }
        .mrow { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; position: relative; flex-wrap: wrap; }
        .mr-l { color: var(--text-dim); font-size: 12.5px; width: 118px; flex: none; }
        .mr-people { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
        .mchip { display: inline-flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 14px; padding: 2px 8px 2px 3px; font-size: 12.5px; color: var(--text); }
        .mchip-ini { width: 18px; height: 18px; border-radius: 50%; background: #3a4552; color: #fff; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; }
        .mchip button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 11px; }
        .mchip button:hover { color: var(--danger); }
        .mr-pick { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 13px; padding: 3px 11px; font-size: 12px; cursor: pointer; }
        .mr-pick:hover { color: var(--primary); border-color: var(--primary); }
        .mr-change { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 14px; line-height: 1; }
        .mr-change:hover { color: var(--text); }
        .mr-none { color: var(--text-faint); font-size: 12px; }
        .mp-add-wrap { position: relative; margin-top: 4px; }
        .mp-add { background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 8px; padding: 6px 12px; font-size: 12.5px; cursor: pointer; }
        .mp-add:hover { color: var(--primary); border-color: var(--primary); }
        .mp-pop { position: absolute; z-index: 10; top: 100%; left: 0; margin-top: 5px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 14px 40px rgba(0,0,0,.5); padding: 7px; width: 280px; max-width: 86vw; }
        .mp-pop-add { width: 220px; display: flex; flex-direction: column; gap: 2px; }
        .mp-kind { text-align: left; background: transparent; border: none; color: var(--text); font-size: 13px; padding: 8px 10px; border-radius: 7px; cursor: pointer; }
        .mp-kind:hover { background: var(--surface-2); color: var(--primary); }
        .mp-search { width: 100%; height: 32px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 7px; color: var(--text); font-size: 12.5px; padding: 0 10px; outline: none; margin-bottom: 6px; }
        .mp-search:focus { border-color: var(--primary); }
        .mp-list { max-height: 240px; overflow: auto; display: flex; flex-direction: column; gap: 1px; }
        .mp-item { display: flex; align-items: center; gap: 9px; background: transparent; border: none; color: var(--text); font-size: 13px; padding: 6px 8px; border-radius: 7px; cursor: pointer; text-align: left; }
        .mp-item:hover { background: var(--surface-2); }
        .mp-nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mp-tag { font-size: 9px; font-weight: 800; color: var(--product); border: 1px solid var(--product); border-radius: 9px; padding: 0 6px; letter-spacing: .3px; }
        .mp-empty { color: var(--text-faint); font-size: 12px; padding: 8px; }
      `}</style>
    </div>
  );
}
