/**
 * simBackfill — populează `programIntent` (SIM) pe pc_people din markerul din nume.
 * Liderii au pus „(1)"/"(2)" (sau „(SIM 1)/(SIM 2)") în numele oamenilor ca să marcheze
 * programul. Îl mutăm într-un atribut REAL, filtrabil (programIntent: "1"|"2"), fără să
 * ne mai bazăm pe parsing de nume la runtime. One-time, idempotent, reversibil.
 *
 * Rulare:
 *   node server/planning-center/services/simBackfill.js --dry   (doar numără, nu scrie)
 *   node server/planning-center/services/simBackfill.js --run   (scrie în DB)
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") }); // server/.env
const mongoose = require("mongoose");

const has = (f) => process.argv.includes(f);

// „(1)", „(2)", „(SIM 1)", „(SIM2)" la finalul numelui → "1"/"2"
function simOf(name = "") {
  const m = String(name).match(/\(\s*(?:sim\s*)?([12])\s*\)/i);
  return m ? m[1] : "";
}

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("Lipsește MONGODB_URI în env."); process.exit(1); }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const { PcPerson } = require("../models");

  const people = await PcPerson.find({ deletedAt: null }).select("firstName lastName programIntent").lean();
  let s1 = 0, s2 = 0, none = 0, already = 0, toWrite = [];
  for (const p of people) {
    const full = `${p.firstName || ""} ${p.lastName || ""}`;
    const sim = simOf(full);
    if (!sim) { none++; continue; }
    if (sim === "1") s1++; else s2++;
    if (String(p.programIntent || "") === sim) { already++; continue; }
    toWrite.push({ _id: p._id, sim });
  }

  console.log(`Total: ${people.length} | SIM1: ${s1} | SIM2: ${s2} | fără marker: ${none} | deja corect: ${already} | de scris: ${toWrite.length}`);

  if (has("--run") && toWrite.length) {
    const ops = toWrite.map((w) => ({ updateOne: { filter: { _id: w._id }, update: { $set: { programIntent: w.sim } } } }));
    const r = await PcPerson.bulkWrite(ops);
    console.log(`Scris: ${r.modifiedCount} actualizări (programIntent setat din nume).`);
  } else if (!has("--run")) {
    console.log("DRY-RUN — nimic scris. Rulează cu --run ca să scrie.");
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
