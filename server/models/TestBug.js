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

// Elementul selectat. Doua ancore posibile, dupa sursa raportului:
//  - MOBIL (native-point): punct pe screenshot (tap/rel/view) - nu exista DOM.
//  - LOCAL/WEB (dom-element): elementul real din DOM + stack de componente React,
//    mult mai precis (vezi webInspector.js din app).
const elementSchema = new mongoose.Schema(
  {
    kind: { type: String, default: "native-point" }, // native-point | dom-element

    // ---- ancora nativa (mobil) ----
    tap: { x: Number, y: Number }, // px pe imagine
    rel: { x: Number, y: Number }, // 0..1 (rezolutie-independent)
    view: { width: Number, height: Number },

    // ---- ancora web (local, din DOM) ----
    tag: { type: String, default: null, maxlength: 40 }, // ex: button, div, Text
    domId: { type: String, default: null, maxlength: 120 },
    testId: { type: String, default: null, maxlength: 120 }, // data-testid / testID
    selector: { type: String, default: null, maxlength: 400 }, // cale CSS scurta
    text: { type: String, default: null, maxlength: 200 }, // textul vizibil din element
    label: { type: String, default: null, maxlength: 200 }, // aria-label / accessibilityLabel
    componentStack: { type: [String], default: undefined }, // ex: ["ProfileScreen","SaveButton"]
    rect: { x: Number, y: Number, width: Number, height: Number }, // bounding box in px
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

    // ---- natura raportului ----
    // bug     = ceva nu merge / arata prost (fluxul clasic)
    // feature = dorinta de imbunatatire / functionalitate noua (testerii sunt si utilizatori)
    kind: {
      type: String,
      required: true,
      index: true,
      enum: ["bug", "feature"],
      default: "bug",
    },
    // De unde vine raportul: mobil (native-point) sau local/web (dom-element, mai precis)
    source: {
      type: String,
      index: true,
      enum: ["mobile", "local"],
      default: "mobile",
    },

    // ---- element selectat ----
    element: { type: elementSchema, default: null },

    // ---- clasificare ----
    // Pentru bug: categoriile din bugTaxonomy. Pentru feature: categoriile din
    // featureTaxonomy. Ambele folosesc aceleasi doua campuri (type + code) ca sa
    // pastram acelasi flux/JSON/prompt in admin.
    bugType: {
      type: String,
      required: true,
      index: true,
      enum: [
        // bug
        "INTERFATA", "ACCES", "STRICAT", "EXPERIENTA", "CONTINUT", "ALTELE",
        // feature
        "FUNCTIE_NOUA", "IMBUNATATIRE", "CONTINUT_NOU", "INTEGRARE", "AUTOMATIZARE", "PERSONALIZARE",
      ],
    },
    bugCode: { type: String, default: null, index: true, maxlength: 40 },
    problem: { type: String, default: "", maxlength: 4000 },
    solution: { type: String, default: "", maxlength: 4000 },

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
    // Flux status:
    //  new          -> neatins (default, apare in lista activa)
    //  in_progress  -> Claude lucreaza activ la el
    //  ready_testing-> Claude l-a reparat, asteapta sa il testezi tu (border verde, tab "Gata de testat")
    //  fixed        -> confirmat de tine (se poate sterge)
    //  failed       -> Claude nu a reusit sa repare (revine in atentie)
    //  fixed_ai     -> LEGACY, sinonim vechi pentru ready_testing
    //  wontfix / duplicate -> optionale
    status: {
      type: String,
      enum: [
        "new",
        "in_progress",
        "ready_testing",
        "fixed_ai",
        "fixed",
        "failed",
        "wontfix",
        "duplicate",
      ],
      default: "new",
      index: true,
    },
    // Note lasate de Claude cand schimba statusul (ce a facut / de ce a esuat)
    resolutionNote: { type: String, default: "", maxlength: 2000 },
  },
  { timestamps: true }
);

// Index compus pentru interogarile din admin (tab -> screen -> tip)
testBugSchema.index({ tab: 1, screen: 1, bugType: 1, createdAt: -1 });
// Filtrele din admin: bug/feature si mobile/local
testBugSchema.index({ kind: 1, source: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("TestBug", testBugSchema);
