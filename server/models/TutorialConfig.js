const mongoose = require("mongoose");

/**
 * Configurare singleton pentru modul de AUTOR al tutorialelor.
 * `authoringEnabled` afiseaza butonul global de inregistrare (doar pt.
 * super-admin/developer). Se comuta din dashboard, fara OTA/build.
 */
const tutorialConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "singleton" },
    authoringEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TutorialConfig", tutorialConfigSchema);
