/**
 * pc_orderTemplates — șabloane de ORDER (structura serviciului) reutilizabile.
 * Se salvează din „Save as Template" (snapshot al itemilor planului, curățat de user), au nume, pot fi
 * globale sau legate de un service type, și pot fi „default" (apar automat la crearea unui plan nou).
 * La aplicare se recreează PcPlanItem din `items`. Aditiv — nu atinge plan/order existent.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const OID = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;

// Snapshot de item (câmpurile necesare recreării ordinii). Voci/slujiri/lideri/medley = Mixed (flexibil).
const itemSnap = {
  type: { type: String, default: "item" },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  lengthSec: { type: Number, default: 0 },
  keyName: { type: String, default: "" },
  placement: { type: String, default: "during" },
  duringAll: { type: Boolean, default: true },
  rowColor: { type: String, default: "" },
  sortOrder: { type: Number, default: 0 },
  isTransition: { type: Boolean, default: false },
  lights: { type: [Mixed], default: [] },
  lightsTiming: { type: String, default: "after" },
  voices: { type: [Mixed], default: [] },
  ministries: { type: [Mixed], default: [] },
  leaders: { type: [Mixed], default: [] },
  transition: { type: Mixed, default: null }, // tip „transition": gamă (key/autoKey) + lumini; persoana de rugăciune se scoate
  songId: { type: OID, ref: "PcSong", default: null },
  arrangementId: { type: OID, ref: "PcArrangement", default: null },
  keyId: { type: OID, ref: "PcKey", default: null },
  sequence: { type: [String], default: [] },
  medley: { type: [Mixed], default: [] },
};

const schema = pcSchema({
  name: { type: String, required: true, trim: true },
  serviceTypeId: { type: OID, ref: "PcServiceType", default: null }, // null = global (apare la orice service type)
  isDefault: { type: Boolean, default: false },                       // apare pre-selectat la Add plan
  createdByPersonId: { type: OID, ref: "PcPerson", default: null },
  items: { type: [itemSnap], default: [] },
});

schema.index({ orgId: 1, serviceTypeId: 1 });

module.exports = pcModel("PcOrderTemplate", schema, "pc_orderTemplates");
