/**
 * Conversie wall-clock (ora locală a campusului) → instant UTC, corect cu DST (zero deps).
 * Stocăm mereu UTC (invariant §1.9); afișarea se face în tz-ul campusului.
 * Folosit la crearea service times / plan times din wizard.
 */
function wallToUtc(dateStr, timeStr, tz = "Europe/Bucharest") {
  const [y, mo, d] = String(dateStr).split("-").map(Number);
  const [h, mi] = String(timeStr).split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;

  const targetLocal = Date.UTC(y, mo - 1, d, h, mi); // ce vrem ca "perete" local
  let ts = targetLocal; // prima ghicire: tratăm ca UTC
  // 2 iterații convergente (acoperă și granițele DST)
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(ts));
    const get = (t) => Number(parts.find((p) => p.type === t)?.value);
    let hh = get("hour"); if (hh === 24) hh = 0;
    const asLocal = Date.UTC(get("year"), get("month") - 1, get("day"), hh, get("minute"), get("second"));
    ts += targetLocal - asLocal;
  }
  return new Date(ts);
}

module.exports = { wallToUtc };
