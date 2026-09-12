const mongoose = require("mongoose");

/**
 * Raport de bug/feedback din modul de TESTARE.
 *
 * Organizare ierarhica pentru admin:
 *   nivel 1: tab      (Home / Prayers / Courses / Games / Profile / ...)
 *   nivel 2: screen   (ecranul din tab; poate fi si un "layer" intern)
 *   nivel 3: bug-ul in sine (acest document)
 *
 * `folder` + `file` = locatia in cod (anti-token: gasim rapid ce sa reparam).
 * `screenshot` = data-URI JPEG (poate lipsi). NU se returneaza in listari (proiectie).
 */

const elementSchema = new mongoose.Schema(
  {
    kind: { type: String, default: "native-point" },
    tap: { x: Number, y: Number }, // px pe imagine
    rel: { x: Number, y: Number }, // 0..1 (rezolutie-independent)
    view: { width: Number, height: Number },
  },
  { _id: false }
);

const testBugSchema = new mongoose.Schema(
  {
    // ---- ierarhie ----
    tab: { type: String, required: true, index: true, maxlength: 60 },
    screen: { type: String, required: true, index: true, maxlength: 120 },
    route: { type: String, default: null, maxlength: 120 },
    layer: { type: String, default: null, maxlength: 120 },
    folder: { type: String, default: null, maxlength: 200 },
    file: { type: String, default: null, maxlength: 240 },

    // ---- element selectat ----
    element: { type: elementSchema, default: null },

    // ---- clasificare ----
    bugType: {
      type: String,
      required: true,
      index: true,
      enum: ["INTERFATA", "ACCES", "STRICAT", "EXPERIENTA", "CONTINUT", "ALTELE"],
    },
    bugCode: { type: String, default: null, index: true, maxlength: 40 },
    problem: { type: String, default: "", maxlength: 2000 },
    solution: { type: String, default: "", maxlength: 2000 },

    // ---- media ----
    screenshot: { type: String, default: null }, // data-URI JPEG, optional

    // ---- context tehnic sigur (fara date sensibile) ----
    context: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ---- raportor (PII minim) ----
    reporter: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      fullName: { type: String, default: "" },
      role: { type: String, default: "" },
    },

    // ---- flux de lucru admin ----
    status: {
      type: String,
      enum: ["new", "triaged", "in_progress", "fixed", "wontfix", "duplicate"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

// Index compus pentru interogarile din admin (tab -> screen -> tip)
testBugSchema.index({ tab: 1, screen: 1, bugType: 1, createdAt: -1 });

module.exports = mongoose.model("TestBug", testBugSchema);
