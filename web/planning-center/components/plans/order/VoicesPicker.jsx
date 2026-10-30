"use client";
/**
 * Voci structurate (lead / Suport=S / Alto=A / Tenor=T / Soprano / Bass) alese din pool-ul
 * Matrix al săptămânii (vocaliști întâi). Multi-rol permis (aceeași persoană în mai multe roluri).
 * „Importă din descriere" parsează textul PCO existent („Lead: X/Suport vocal:Y+Z/Alto:W" sau
 * „DAVID\nS: Gabi, A: Nao, T: Kati") în voci structurate.
 */
import { useState } from "react";
import PersonAvatar from "@/components/plans/PersonAvatar";

// DOAR lead/suport/alto/tenor (fără soprano/bass — cerință David).
const ROLES = [
  { k: "lead", l: "Lead", s: "" },
  { k: "support", l: "Suport", s: "S" },
  { k: "alto", l: "Alto", s: "A" },
  { k: "tenor", l: "Tenor", s: "T" },
];

/* ── parser description → voci (best-effort; gestionează ambele stiluri reale) ── */
const ROLE_PATS = [
  { role: "lead", rx: /^(lead|solist|voce\s*principal[ăa]?|vp)$/i },
  { role: "support", rx: /^(suport(\s*vocal)?|support|s)$/i },
  { role: "alto", rx: /^(alto?|a)$/i },
  { role: "tenor", rx: /^(tenor|t)$/i },
];
const splitNames = (s) => s.split(/[+,&]|\bși\b|\bsi\b/i).map((x) => x.trim()).filter(Boolean);
export function parseVoicesText(text) {
  if (!text) return [];
  const top = text.split(/\n\s*\n/)[0] || text; // doar partea de sus (evită versetele de dedesubt)
  const chunks = top.split(/[\/\n]/).map((c) => c.trim()).filter(Boolean);
  const out = [];
  let sawLabel = false;
  for (const chunk of chunks) {
    const subs = chunk.split(/,\s*(?=[A-Za-zĂÂÎȘȚăâîșț]{1,14}\s*:)/);
    for (const sub of subs) {
      const ci = sub.indexOf(":");
      if (ci > -1) {
        const label = sub.slice(0, ci).trim();
        const rest = sub.slice(ci + 1).trim();
        const m = ROLE_PATS.find((p) => p.rx.test(label));
        if (m && rest) { sawLabel = true; for (const n of splitNames(rest)) out.push({ role: m.role, name: n }); continue; }
      }
      if (!sawLabel && !out.length && !sub.includes(":")) for (const n of splitNames(sub)) out.push({ role: "lead", name: n });
    }
  }
  return out;
}

export default function VoicesPicker({ value = [], pool = [], description = "", canEdit = false, onChange, leadOnly = false }) {
  const [openRole, setOpenRole] = useState(null);

  const byRole = (r) => value.filter((v) => v.role === r);
  const activeRoles = leadOnly ? ROLES.filter((r) => r.k === "lead") : ROLES; // la element: doar lead

  const findInPool = (name) => pool.find((p) => p.name.toLowerCase() === name.toLowerCase() || p.name.toLowerCase().startsWith(name.toLowerCase() + " ") || name.toLowerCase().startsWith(p.name.toLowerCase().split(" ")[0].toLowerCase()));

  function toggle(role, person) {
    const key = String(person.personId || person.name);
    const has = value.some((v) => v.role === role && String(v.personId || v.name) === key);
    if (has) { onChange(value.filter((v) => !(v.role === role && String(v.personId || v.name) === key))); return; }
    const entry = { role, personId: person.personId || null, name: person.personId ? "" : (person.name || ""), avatar: person.avatar, initials: person.initials };
    onChange(leadOnly ? [entry] : [...value, entry]); // leadOnly = o singură persoană
  }
  function removeAt(role, idx) { let seen = -1; onChange(value.filter((v) => { if (v.role !== role) return true; seen++; return seen !== idx; })); }
  function importFromDesc() {
    const parsed = parseVoicesText(description);
    if (!parsed.length) return;
    const mapped = parsed.map((v) => { const p = findInPool(v.name); return p ? { role: v.role, personId: p.personId, name: "", avatar: p.avatar, initials: p.initials } : { role: v.role, personId: null, name: v.name }; });
    onChange(mapped);
  }

  return (
    <div className="vp">
      {openRole && <div className="vp-back" onClick={() => setOpenRole(null)} />}
      <div className="vp-head">
        <span className="vp-h">{leadOnly ? "Lead" : "Voci"}</span>
        {canEdit && description && <button className="vp-imp" onClick={importFromDesc} title="Parsează descrierea în voci structurate">Importă din descriere</button>}
      </div>
      {activeRoles.map((r) => {
        const picks = byRole(r.k);
        return (
          <div key={r.k} className="vr">
            <span className="vr-l">{r.s ? <span className="vr-s">{r.s}</span> : null}{r.l}</span>
            <div className="vr-people">
              {picks.map((v, i) => (
                <span key={i} className="vchip">
                  {v.personId ? <PersonAvatar person={v} size={17} /> : <span className="vchip-ini">{(v.name || "?").slice(0, 1).toUpperCase()}</span>}
                  {v.name || "—"}
                  {canEdit && <button onClick={() => removeAt(r.k, i)}>✕</button>}
                </span>
              ))}
              {canEdit && (
                <div className="vadd">
                  <button className="vadd-b" onClick={() => setOpenRole(openRole === r.k ? null : r.k)}>+</button>
                  {openRole === r.k && (
                    <div className="vpool">
                      <div className="vpool-h">Vocaliștii săptămânii</div>
                      <div className="vpool-list">
                        {pool.map((p) => {
                          const on = picks.some((v) => String(v.personId) === String(p.personId));
                          return (
                            <button key={p.personId} className={`vp-it ${on ? "on" : ""} ${p.isVocalist ? "voc" : ""}`} onClick={() => toggle(r.k, p)}>
                              <PersonAvatar person={p} size={18} />
                              <span className="vp-n">{p.name}</span>
                              {p.isVocalist && <span className="vp-tag">voce</span>}
                              {on && <span className="vp-ck">✓</span>}
                            </button>
                          );
                        })}
                        {!pool.length && <div className="vp-none">Nimeni programat pe acest plan încă.</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <style jsx>{`
        .vp { }
        .vp-back { position: fixed; inset: 0; z-index: 6; }
        .vp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .vp-h { color: var(--text-faint); font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; }
        .vp-imp { background: transparent; border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; font-size: 11px; padding: 3px 8px; cursor: pointer; }
        .vp-imp:hover { color: var(--primary); border-color: var(--primary); }
        .vr { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; }
        .vr-l { width: 68px; flex: none; color: var(--text-dim); font-size: 12px; display: flex; align-items: center; gap: 5px; padding-top: 3px; }
        .vr-s { width: 16px; height: 16px; border-radius: 4px; background: var(--surface-3); color: var(--product); font-weight: 800; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; }
        .vr-people { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; flex: 1; }
        .vchip { display: inline-flex; align-items: center; gap: 5px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 15px; padding: 2px 8px 2px 3px; font-size: 12px; color: var(--text); }
        .vchip-ini { width: 17px; height: 17px; border-radius: 50%; background: var(--surface-3); color: var(--text-dim); font-size: 9px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
        .vchip button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 10px; }
        .vadd { position: relative; }
        .vadd-b { width: 22px; height: 22px; border-radius: 50%; background: var(--surface-2); border: 1px dashed var(--border-strong); color: var(--text-faint); cursor: pointer; font-size: 14px; line-height: 1; }
        .vadd-b:hover { color: var(--primary); border-color: var(--primary); }
        .vpool { position: absolute; top: 26px; left: 0; width: 240px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 9px; padding: 7px; z-index: 7; box-shadow: 0 12px 34px rgba(0,0,0,.45); }
        .vpool-h { color: var(--text-faint); font-size: 10px; text-transform: uppercase; letter-spacing: .4px; padding: 2px 6px 6px; }
        .vpool-list { max-height: 240px; overflow: auto; display: flex; flex-direction: column; gap: 1px; }
        .vp-it { display: flex; align-items: center; gap: 8px; text-align: left; background: transparent; border: none; color: var(--text); padding: 6px 7px; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .vp-it:hover { background: var(--surface-2); }
        .vp-it.on { background: rgba(47,129,247,.12); }
        .vp-n { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vp-tag { font-size: 8.5px; text-transform: uppercase; color: var(--product); border: 1px solid rgba(87,185,138,.5); border-radius: 8px; padding: 0 5px; flex: none; }
        .vp-ck { color: var(--primary); font-weight: 700; flex: none; }
        .vp-none { color: var(--text-faint); font-size: 12px; padding: 8px 6px; }
        .vr-extra { display: flex; gap: 6px; margin-top: 6px; }
        .vr-add-role { background: transparent; border: 1px dashed var(--border-strong); color: var(--text-faint); border-radius: 14px; padding: 3px 10px; font-size: 11px; cursor: pointer; }
        .vr-add-role:hover { color: var(--primary); border-color: var(--primary); }
      `}</style>
    </div>
  );
}

/* Formatează vocile pt. afișare (2 rânduri): lead (fără etichetă) pe rândul 1, apoi
   „Suport: X -- Alto: Y -- Tenor: Z" pe rândul 2. Întoarce text cu „\n" (randat pre-line, gri ca descrierea). */
// Doar PRENUMELE (primul cuvânt, fără cratimă) + UPPERCASE — echipă mică, numele complet e inutil.
const firstUpper = (full) => String(full || "").trim().split(/[\s\-–—]+/)[0].toUpperCase();

export function formatVoices(voices = []) {
  if (!voices.length) return "";
  const label = { support: "Suport", alto: "Alto", tenor: "Tenor" };
  const order = ["support", "alto", "tenor"];
  const byRole = {};
  for (const v of voices) { (byRole[v.role] = byRole[v.role] || []).push(v.name); }
  const lead = (byRole.lead || []).map(firstUpper).join(", ");
  const sub = order.filter((r) => byRole[r]).map((r) => `${label[r]}: ${byRole[r].map(firstUpper).join(", ")}`).join(" || ");
  return [lead, sub].filter(Boolean).join("\n");
}
