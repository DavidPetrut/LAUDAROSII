/**
 * Item row colors (§16 serviceTypeSettings.itemRowColors) — culori pe rândurile din Order.
 * Reguli: `match` = tip ("header"/"song"/"media") SAU keyword (substring în titlu). color = hex (base).
 * Pe mobil dark aplicăm culoarea ca tentă translucidă.
 */
const DEFAULT_ITEM_ROW_COLORS = [
  { match: "header", label: "Header", color: "" }, // header = bară gri, fără tentă
  { match: "song", label: "Song", color: "#86C13F" },
  { match: "media", label: "Media", color: "#5AA9F6" },
  { match: "announcements", label: "Announcements", color: "#B794F6" },
  { match: "message", label: "Message", color: "#F27BA0" },
  { match: "prayer", label: "Prayer", color: "#4FD1C5" },
  { match: "welcome", label: "Welcome", color: "#F6C453" },
  { match: "call to worship", label: "Call to worship", color: "#F6A86B" },
];

const TYPE_MATCHES = ["header", "song", "media"];

/** Returnează hex-ul (base) pentru un item, după reguli. "" = fără culoare. */
function rowColorFor(item, rules) {
  if (!rules || !rules.length) return "";
  const t = item.type;
  if (t === "header") return rules.find((r) => r.match.toLowerCase() === "header")?.color || "";
  if (t === "song") {
    const s = rules.find((r) => r.match.toLowerCase() === "song");
    if (s && s.color) return s.color;
  }
  if (t === "media") {
    const m = rules.find((r) => r.match.toLowerCase() === "media");
    if (m && m.color) return m.color;
  }
  // keyword pe titlu (prima regulă non-tip care se potrivește)
  const title = String(item.title || "").toLowerCase();
  for (const r of rules) {
    const m = r.match.toLowerCase();
    if (TYPE_MATCHES.includes(m)) continue;
    if (m && title.includes(m)) return r.color || "";
  }
  return "";
}

module.exports = { DEFAULT_ITEM_ROW_COLORS, rowColorFor };
