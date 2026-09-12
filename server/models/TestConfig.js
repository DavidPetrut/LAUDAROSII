const mongoose = require("mongoose");

/**
 * Configurare singleton pentru modul de TESTARE.
 * `enabled` controleaza afisarea butonului de feedback in aplicatie (instant,
 * fara OTA/build). Documentul are un `key` fix = "singleton".
 */
const testConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "singleton" },
    enabled: { type: Boolean, default: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestConfig", testConfigSchema);
