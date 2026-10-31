"use client";
/**
 * „+ Adaugă" în Order — meniu cu tipurile de item (Item / Header / Song / Media / Medley),
 * cu litere-shortcut vizuale (i/h/s/m) ca în PCO. Song → picker; Medley → builder (Faza 4).
 */
import { useState } from "react";

const TYPES = [
  { type: "song", label: "Cântec", short: "s", d: "Din biblioteca de cântece (cu aranjament, gamă, fișiere)." },
  { type: "songEmpty", label: "Cântec fără muzică", short: "", d: "Cântec gol — pui doar vocile (lead/suport/alto/tenor); muzica o legi după din tab-ul Song. Ideal pt. template." },
  { type: "header", label: "Secțiune", short: "h", d: "Bară de secțiune (ex. ÎNCHINARE PRIN CÂNTARE)." },
  { type: "item", label: "Element", short: "i", d: "Element liber (ex. Verificări, Welcome, anunțuri)." },
  { type: "media", label: "Media", short: "m", d: "Element media (video/imagine)." },
  { type: "medley", label: "Medley", short: "", d: "Mai multe cântece combinate, cu tranziții." },
  { type: "transition", label: "Tranziție", short: "t", d: "Punte între momente: gamă, lumini, rugăciune (toate opționale)." },
];

export default function AddItemMenu({ onAdd, onAddSong, onAddEmptySong, onAddMedley, onTypeDragStart, onTypeDragEnd }) {
  const [open, setOpen] = useState(false);
  function pick(type) {
    setOpen(false);
    if (type === "song") return onAddSong?.();
    if (type === "songEmpty") return onAddEmptySong?.();
    if (type === "medley") return onAddMedley ? onAddMedley() : onAdd?.("medley");
    onAdd?.(type);
  }
  return (
    <div className="aim">
      <button className="add-btn" onClick={() => setOpen((v) => !v)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
        Adaugă
      </button>
      {open && (
        <>
          <div className="aim-back" onClick={() => setOpen(false)} />
          <div className="aim-menu" role="menu">
            <div className="aim-hint">Click = la final · trage un tip între itemi ca să-l pui unde vrei</div>
            {TYPES.map((t) => (
              <button
                key={t.type} className="aim-it" onClick={() => pick(t.type)} role="menuitem"
                draggable={!!onTypeDragStart}
                onDragStart={(e) => { try { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", t.type); } catch {} setOpen(false); onTypeDragStart?.(t.type); }}
                onDragEnd={() => onTypeDragEnd?.()}
              >
                <span className="aim-l">{t.label}</span>
                {t.short && <span className="aim-k">{t.short}</span>}
                <span className="aim-d">{t.d}</span>
                <span className="aim-grip" aria-hidden="true">⠿</span>
              </button>
            ))}
          </div>
        </>
      )}
      <style jsx>{`
        .aim { position: relative; }
        .add-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--primary); border: none; color: #fff; border-radius: 6px; height: 30px; padding: 0 13px; cursor: pointer; font-weight: 600; font-size: 13px; }
        .add-btn:hover { filter: brightness(1.08); }
        .aim-back { position: fixed; inset: 0; z-index: 44; }
        .aim-menu { position: absolute; right: 0; top: 36px; z-index: 45; min-width: 272px; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: 0 14px 40px rgba(0,0,0,.45); padding: 6px; display: flex; flex-direction: column; animation: aimIn .13s ease; }
        @keyframes aimIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
        .aim-hint { color: var(--text-faint); font-size: 10.5px; line-height: 1.4; padding: 2px 10px 7px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
        .aim-it { position: relative; display: grid; grid-template-columns: auto auto; column-gap: 8px; align-items: center; text-align: left; background: transparent; border: none; color: var(--text); padding: 8px 10px; border-radius: 7px; cursor: grab; }
        .aim-it:hover { background: var(--surface-2); }
        .aim-it:active { cursor: grabbing; }
        .aim-l { font-size: 13.5px; font-weight: 600; }
        .aim-k { justify-self: end; font-size: 10px; color: var(--text-faint); border: 1px solid var(--border-strong); border-radius: 4px; padding: 0 5px; text-transform: uppercase; margin-right: 16px; }
        .aim-d { grid-column: 1 / -1; color: var(--text-faint); font-size: 11.5px; margin-top: 2px; padding-right: 16px; }
        .aim-grip { position: absolute; right: 8px; top: 8px; color: var(--text-faint); font-size: 12px; opacity: 0; transition: opacity .12s; letter-spacing: -1px; }
        .aim-it:hover .aim-grip { opacity: .7; }
      `}</style>
    </div>
  );
}
