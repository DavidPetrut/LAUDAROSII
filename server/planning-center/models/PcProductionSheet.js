/**
 * pc_productionSheets — „Order-ul Producției" (tab Rehearse). STRAT SEPARAT peste Order.
 *
 * REGULA DE AUR: acest document e DOAR overlay. Nu se scrie NICIODATĂ în `PcPlanItem`.
 * RH citește structura LIVE din Order (gamă, voci, secvență, tranziții) și o îmbracă cu datele
 * producătorului de aici, legate prin `itemId`. Astfel istoricul și munca liderului rămân intacte
 * („update zi aici, dar nu invers" — Paula).
 *
 * Per-producător: cheia e (orgId, planId, ownerId). `scope:"team"` = foaie partajată a echipei.
 * Toate câmpurile sunt OPȚIONALE și aditive — Faza 1 folosește doar label/note/reminders/simFeedback;
 * scene/fixtures/sectionCues/projection se activează în fazele de lumini & proiecție.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const Light = { color: { type: String, default: "" }, label: { type: String, default: "" } };

// Overlay per item din Order (legat prin itemId). Nimic obligatoriu — ce nu e setat cade pe Order.
const ItemOverlay = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlanItem", required: true },
  label: { type: String, default: "" },          // denumire scurtă custom (ex. „Aprinde-mă") — NU schimbă Order
  sceneId: { type: mongoose.Schema.Types.ObjectId, ref: "PcLightScene", default: null }, // scenă de lumini (Faza 2)
  fixtures: { type: [{ fixture: String, color: String }], default: [] }, // Par/LED/Tobe/Laterale/Coroană (Faza 2)
  // Secțiuni personalizabile (fiecare parte din sequence: Verse/Chorus/Bridge…), legate prin `idx` (poziția în sequence).
  // Fiecare secțiune poate avea: notă, culori de lumini, proiecție, remindere. `section` = numele (pt. afișare/print).
  sectionCues: { type: [{
    idx: { type: Number, default: 0 }, section: String,
    lights: { type: [Light], default: [] }, projection: String, note: String,
    reminders: { type: [{ text: String, icon: { type: String, default: "info" }, severity: { type: String, default: "normal" } }], default: [] },
  }], default: [] },
  // Împărțirea sequence-ului pe RÂNDURI (multi-row): indicii din sequence la care începe un rând nou (drag-to-split).
  rowBreaks: { type: [Number], default: [] },
  projection: { type: [{ bgRef: String, note: String }], default: [] }, // fundal/coroană (Faza 3)
  reminders: { type: [{ text: String, icon: { type: String, default: "info" }, severity: { type: String, default: "normal" } }], default: [] },
  note: { type: String, default: "" },           // notă personală a producătorului pe acest item
}, { _id: false });

const schema = pcSchema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlan", required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPerson", default: null }, // producătorul; null+scope:team = partajat
  scope: { type: String, enum: ["owner", "team"], default: "owner" },
  items: { type: [ItemOverlay], default: [] },
  // Remindere „oriunde" — independente de secvență; plasate după un item (anchor) sau la finalul listei:
  reminders: { type: [{ afterItemId: { type: mongoose.Schema.Types.ObjectId, ref: "PcPlanItem", default: null }, text: String, icon: { type: String, default: "info" }, severity: { type: String, default: "normal" }, color: { type: String, default: "" } }], default: [] },
  // Feedback între programe (SIM1/SIM2) — secțiunea de jos, bifabilă:
  simFeedback: { type: [{ text: String, sim: { type: String, default: "" }, severity: { type: String, default: "normal" }, done: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } }], default: [] },
});

schema.index({ orgId: 1, planId: 1, ownerId: 1 }, { unique: true });

module.exports = pcModel("PcProductionSheet", schema, "pc_productionSheets");
