const mongoose = require("mongoose");

// Un pas dintr-un tutorial: elementul-tinta (dupa id-ul din <TutorialTarget>),
// eticheta lui (pentru autor) si instructiunea aratata userului.
const stepSchema = new mongoose.Schema(
  {
    // Tinta pasului: pe web = selector DOM (orice element); pe nativ = id din <TutorialTarget>.
    selector: { type: String, default: "" },
    targetId: { type: String, default: "" },
    label: { type: String, default: "" },
    instruction: { type: String, default: "", maxlength: 240 },
    screen: { type: String, default: "" },
  },
  { _id: true }
);

/**
 * Tutorial de tip "spotlight": o secventa de pasi prin care userul e ghidat sa
 * apese exact pe elementele evidentiate. Creat de super-admin/developer, vizibil
 * (activ) tuturor userilor.
 */
const tutorialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 240 },
    steps: { type: [stepSchema], default: [] },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tutorial", tutorialSchema);
