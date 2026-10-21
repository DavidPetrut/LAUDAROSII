/**
 * Generator PDF — monospace Unicode (Roboto Mono embedat) ca să randeze CORECT diacriticele
 * românești (ă â î ș ț) și fără letter-spacing urât. Multi-pagină cu header repetat (cerința D).
 * Dacă fontul nu se încarcă, cade grațios pe fonturile standard jsPDF.
 */
import { paginateLines } from "@/lib/songs/paginate";

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#2f6fe0");
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [47, 111, 224];
}

function abToBase64(buf) {
  let bin = ""; const bytes = new Uint8Array(buf); const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}

let fontCache = null;
async function loadFont() {
  if (fontCache !== null) return fontCache;
  try {
    const [reg, bold] = await Promise.all([
      fetch("/fonts/RobotoMono.ttf").then((r) => r.arrayBuffer()),
      fetch("/fonts/RobotoMono-Bold.ttf").then((r) => r.arrayBuffer()),
    ]);
    fontCache = { reg: abToBase64(reg), bold: abToBase64(bold) };
  } catch { fontCache = false; }
  return fontCache;
}

const stripFmt = (s) => String(s || "").replace(/<\/?[biu]>/gi, "");

export async function generateChartPdf({
  title, keyLabel, bpm, meter, arrName, author, seqTokens = [], lines = [],
  chordColorHex = "#2f6fe0", fontSize = 16, variant = "chart",
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Font Unicode embedat (sau fallback standard).
  const fc = await loadFont();
  let F = "courier", FB = "courier", FH = "helvetica";
  if (fc) {
    doc.addFileToVFS("RobotoMono.ttf", fc.reg); doc.addFont("RobotoMono.ttf", "RobotoMono", "normal");
    doc.addFileToVFS("RobotoMono-Bold.ttf", fc.bold); doc.addFont("RobotoMono-Bold.ttf", "RobotoMono", "bold");
    F = "RobotoMono"; FB = "RobotoMono"; FH = "RobotoMono";
  }

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 34;
  const fs = Math.max(9, Math.round(fontSize * 0.9)); // px (preview) → pt (print)
  const [cr, cg, cb] = hexToRgb(chordColorHex);
  let y = 0;

  function header(pi) {
    // „Words": fără chenar gri; doar titlul bold, o singură dată, pe prima pagină.
    if (variant === "words") {
      if (pi === 0) {
        doc.setFont(FH, "bold"); doc.setFontSize(18); doc.setTextColor(17, 17, 17);
        const tlines = doc.splitTextToSize(title || "", pageW - 2 * margin); // word-wrap pt. titluri lungi
        let ty = 38;
        for (const tl of tlines) { doc.text(tl, margin, ty); ty += 22; }
        y = ty + 10;
      } else { y = margin + 6; }
      return;
    }
    const bx = margin - 10, bw = pageW - 2 * (margin - 10), bh = 66;
    doc.setFillColor(237, 238, 240);
    doc.roundedRect(bx, 16, bw, bh, 2, 2, "F"); // card gri aproape PĂTRAT, ca PCO
    doc.setTextColor(20, 20, 20);
    doc.setFont(FH, "bold"); doc.setFontSize(18);
    doc.text(`${title || ""} [${keyLabel}, ${bpm || "—"} bpm, ${meter || "4/4"}]`, margin, 40);
    doc.setFont(FH, "bold"); doc.setFontSize(8); doc.setTextColor(70, 70, 70);
    doc.text(`[${arrName || ""}]${author ? ` by ${author}` : ""}`, margin, 53);
    if (seqTokens.length) { doc.setFontSize(12); doc.setTextColor(20, 20, 20); doc.text(seqTokens.join(", "), margin, 70); }
    y = 16 + bh + 22;
  }

  const pages = paginateLines(lines, { fontSize: fs });
  pages.forEach((pageLines, pi) => {
    if (pi > 0) doc.addPage();
    header(pi);
    doc.setFont(F, "normal"); doc.setFontSize(fs);
    for (const ln of pageLines) {
      if (ln.kind === "empty") { y += fs * 0.9; continue; }
      if (ln.kind === "section") {
        y += fs * 0.7; // spațiu înainte de secțiune
        doc.setFont(FB, "bold"); doc.setFontSize(fs + 1); doc.setTextColor(17, 17, 17);
        doc.text(stripFmt(ln.label), margin, y); doc.setFont(F, "normal");
        y += fs * 1.55; continue;
      }
      doc.setFontSize(fs);
      if (ln.chordRow) {
        doc.setTextColor(cr, cg, cb); doc.setFont(FB, "bold");
        doc.text(ln.chordRow, margin, y); doc.setFont(F, "normal");
        y += fs * 1.12; // acordul deasupra versului
      }
      const lyric = stripFmt(ln.lyricRow);
      if (lyric.trim() || !ln.chordRow) { doc.setTextColor(17, 17, 17); doc.text(lyric || " ", margin, y); y += fs * 1.45; }
    }
    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(`${pi + 1} / ${pages.length}`, pageW - margin, pageH - 20, { align: "right" });
  });

  return doc.output("blob");
}
