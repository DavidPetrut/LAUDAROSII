"use client";
/**
 * Grafică Reporting — SVG pur, zero dependințe, temă PCO (dark + verde/albastru).
 * Componente mici și reutilizabile: StatCard, Donut, ColumnChart, BarList, Legend.
 * Culorile vin din tokens (globals.css) ca totul să fie reglabil dintr-un loc.
 */

/** Card KPI: număr mare + etichetă + (opțional) accent de culoare. */
export function StatCard({ label, value, hint, color = "var(--text)" }) {
  return (
    <div className="statcard">
      <div className="sc-val" style={{ color }}>{value}</div>
      <div className="sc-label">{label}</div>
      {hint ? <div className="sc-hint">{hint}</div> : null}
      <style jsx>{`
        .statcard { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; min-width: 0; }
        .sc-val { font-size: 28px; font-weight: 700; line-height: 1.1; }
        .sc-label { color: var(--text-dim); font-size: 12px; margin-top: 4px; }
        .sc-hint { color: var(--text-faint); font-size: 11px; margin-top: 3px; }
      `}</style>
    </div>
  );
}

/** Donut pe segmente [{label, value, color}] + total în centru. */
export function Donut({ segments = [], size = 150, thickness = 22, centerLabel = "" }) {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {total > 0 && segments.map((s, i) => {
          const frac = (s.value || 0) / total;
          const len = frac * C;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" className="donut-total">{total}</text>
        {centerLabel ? <text x={cx} y={cy + 15} textAnchor="middle" className="donut-cap">{centerLabel}</text> : null}
      </svg>
      <style jsx>{`
        .donut-wrap :global(.donut-total) { fill: var(--text); font-size: 26px; font-weight: 700; }
        .donut-wrap :global(.donut-cap) { fill: var(--text-faint); font-size: 10px; letter-spacing: .4px; text-transform: uppercase; }
      `}</style>
    </div>
  );
}

/** Legendă [{label, color, value}]. */
export function Legend({ items = [] }) {
  return (
    <ul className="legend">
      {items.map((it, i) => (
        <li key={i}>
          <span className="dot" style={{ background: it.color }} />
          <span className="lg-label">{it.label}</span>
          {it.value != null ? <span className="lg-val">{it.value}</span> : null}
        </li>
      ))}
      <style jsx>{`
        .legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-dim); }
        .dot { width: 10px; height: 10px; border-radius: 3px; flex: none; }
        .lg-label { color: var(--text); }
        .lg-val { margin-left: auto; color: var(--text-dim); font-variant-numeric: tabular-nums; }
      `}</style>
    </ul>
  );
}

/** Grafic coloane verticale pe bars [{label, value}]. */
export function ColumnChart({ bars = [], height = 160, color = "var(--primary)" }) {
  const max = Math.max(1, ...bars.map((b) => b.value || 0));
  return (
    <div className="col-chart" style={{ height }}>
      {bars.length === 0 ? <div className="empty">Fără date în interval.</div> : bars.map((b, i) => (
        <div key={i} className="col">
          <div className="col-barwrap">
            <div className="col-val">{b.value || 0}</div>
            <div className="col-bar" style={{ height: `${((b.value || 0) / max) * 100}%`, background: color }} />
          </div>
          <div className="col-label">{b.label}</div>
        </div>
      ))}
      <style jsx>{`
        .col-chart { display: flex; align-items: flex-end; gap: 6px; padding-top: 8px; }
        .empty { color: var(--text-faint); font-size: 13px; align-self: center; margin: auto; }
        .col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; height: 100%; }
        .col-barwrap { flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; }
        .col-val { font-size: 11px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
        .col-bar { width: 72%; min-height: 2px; border-radius: 4px 4px 0 0; transition: height .35s ease; }
        .col-label { margin-top: 6px; font-size: 10.5px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      `}</style>
    </div>
  );
}

/** Listă de bare orizontale: rows [{label, value, sub}] cu bară proporțională. */
export function BarList({ rows = [], color = "var(--product)", valueSuffix = "" }) {
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  return (
    <div className="barlist">
      {rows.length === 0 ? <div className="empty">Fără date.</div> : rows.map((r, i) => (
        <div key={i} className="row">
          <div className="row-top">
            <span className="row-label" title={r.label}>{r.label}</span>
            <span className="row-val">{r.value}{valueSuffix}</span>
          </div>
          {r.sub ? <div className="row-sub">{r.sub}</div> : null}
          <div className="track"><div className="fill" style={{ width: `${((r.value || 0) / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
      <style jsx>{`
        .barlist { display: flex; flex-direction: column; gap: 12px; }
        .empty { color: var(--text-faint); font-size: 13px; }
        .row-top { display: flex; align-items: baseline; gap: 10px; }
        .row-label { color: var(--text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .row-val { margin-left: auto; color: var(--text-dim); font-size: 13px; font-variant-numeric: tabular-nums; flex: none; }
        .row-sub { color: var(--text-faint); font-size: 11px; margin: 1px 0 3px; }
        .track { height: 7px; background: var(--surface-2); border-radius: 4px; overflow: hidden; margin-top: 5px; }
        .fill { height: 100%; border-radius: 4px; transition: width .35s ease; }
      `}</style>
    </div>
  );
}
