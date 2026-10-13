/**
 * Parser CSV minimal și robust (fără dependințe). Suportă:
 *  - câmpuri între ghilimele cu virgule și newline-uri interne
 *  - ghilimele escapate ("")
 *  - CRLF / LF
 * Folosit la importul de People (§4.2 pc_imports). Pur logic, zero deps.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Transformă CSV în { header:[], records:[{col:val}] }, ignorând rândurile complet goale. */
function toObjects(text) {
  const raw = parseCsv(text).filter((r) => r.length && !(r.length === 1 && String(r[0]).trim() === ""));
  if (!raw.length) return { header: [], records: [] };
  const header = raw[0].map((h) => String(h).trim());
  const records = raw.slice(1).map((r) => {
    const o = {};
    header.forEach((h, idx) => { o[h] = (r[idx] ?? "").toString().trim(); });
    return o;
  });
  return { header, records };
}

module.exports = { parseCsv, toObjects };
