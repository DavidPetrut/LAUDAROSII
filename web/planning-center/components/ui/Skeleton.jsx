"use client";
/**
 * Skeleton — animația de încărcare STANDARD (shimmer), folosită oriunde se încarcă date din API
 * (modale, taburi, liste) în loc de text „Se încarcă…". Vezi web/planning-center/DESIGN.md.
 *  - <Skeleton /> → 3 bare shimmer de lățimi variate.
 *  - <Skeleton lines={n} /> → n bare.
 *  - <Skeleton rows={n} /> → n rânduri „avatar + 2 linii" (liste de persoane/carduri).
 * Clasele sunt globale (globals.css), deci merge și montat în orice componentă.
 */
const WIDTHS = ["w80", "w65", "w50", "w35"];

export default function Skeleton({ lines = 3, rows = 0, className = "" }) {
  if (rows > 0) {
    return (
      <div className={`pc-sk-wrap ${className}`} aria-busy="true" aria-live="polite">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="pc-sk-row">
            <div className="pc-sk-circle" style={{ width: 34, height: 34 }} />
            <div style={{ flex: 1 }}>
              <div className="pc-sk-line w50" />
              <div className="pc-sk-line w80 sk-last" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`pc-sk-wrap ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`pc-sk-line ${WIDTHS[i % WIDTHS.length]} ${i === lines - 1 ? "sk-last" : ""}`} />
      ))}
    </div>
  );
}
