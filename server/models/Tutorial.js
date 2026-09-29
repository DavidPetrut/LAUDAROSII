const mongoose = require("mongoose");

// Un pas dintr-un tutorial: elementul-tinta (dupa id-ul din <TutorialTarget>),
// eticheta lui (pentru autor) si instructiunea aratata userului.
const stepSchema = new mongoose.Schema(
  {
    // Tinta pasului: pe web = selector DOM (orice element); pe nativ = id din <TutorialTarget>.
    selector: { type: String, default: "" },
    targetId: { type: String, default: "" },
    label: { type: String, default: "" },
    // In draft (schema) = descrierea ta pentru AI; in published = textul aratat userului.
    instruction: { type: String, default: "", maxlength: 1000 },
    screen: { type: String, default: "" },
    // Captura ecranului la momentul pasului (doar in draft/schema, ca sa construiesc exact).
    screenshot: { type: String, default: null },
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
    description: { type: String, default: "", maxlength: 2000 },
    steps: { type: [stepSchema], default: [] },
    // draft = schema inregistrata din app (materie prima); published = tutorial construit de AI, redabil.
    status: { type: String, enum: ["draft", "published"], default: "published", index: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tutorial", tutorialSchema);
