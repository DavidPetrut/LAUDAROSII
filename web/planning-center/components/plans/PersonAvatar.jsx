"use client";
/**
 * PersonAvatar — avatarul persoanei cu BADGE de status în colț (jos-dreapta),
 * exact ca în PCO: poza (sau inițiale) + un cerculeț mic verde (confirmat) /
 * galben (neconfirmat) / roșu (refuzat). Înlocuiește vechile iconițe check/?
 * puse la stânga numelui. Folosit în Matrix, Teams și bara de asignare.
 */
const STATUS = {
  confirmed: { c: "var(--st-confirmed)", t: "Confirmat" },
  unconfirmed: { c: "var(--st-unconfirmed)", t: "Neconfirmat" },
  declined: { c: "var(--st-declined)", t: "Refuzat" },
};

export default function PersonAvatar({ person, status, size = 26, showBadge = true }) {
  const s = STATUS[status];
  const px = `${size}px`;
  const bs = Math.max(8, Math.round(size * 0.42)); // diametru badge
  return (
    <span className="pa" style={{ width: px, height: px }} title={person?.name || ""}>
      {person?.avatar
        ? <img src={person.avatar} alt="" className="pa-img" />
        : <span className="pa-ini">{person?.initials || "?"}</span>}
      {showBadge && s && (
        <span className="pa-badge" style={{ width: bs, height: bs, background: s.c }} title={s.t}>
          {status === "confirmed" && (
            <svg viewBox="0 0 16 16" width={bs - 3} height={bs - 3}><path d="M4 8.3l2.4 2.4L12 5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          {status === "unconfirmed" && <span className="pa-q">?</span>}
          {status === "declined" && <span className="pa-q">×</span>}
        </span>
      )}
      <style jsx>{`
        .pa { position: relative; display: inline-flex; flex: none; border-radius: 50%; }
        .pa-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
        .pa-ini { width: 100%; height: 100%; border-radius: 50%; background: #3a4552; color: #fff;
          font-size: ${Math.round(size * 0.38)}px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; }
        .pa-badge { position: absolute; right: -1px; bottom: -1px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px var(--bg); }
        .pa-q { color: #fff; font-size: ${Math.max(7, Math.round(bs * 0.72))}px; font-weight: 800; line-height: 1; }
      `}</style>
    </span>
  );
}
