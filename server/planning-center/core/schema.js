/**
 * Convenții de schemă pentru TOT modulul Planning Center (pc_).
 * Vezi PLANNING_CENTER_ARCHITECTURE.md §4.3 + §1.2 (aditiv) + §1.13 (org-scoping seam).
 *
 * Fiecare colecție pc_ poartă:
 *  - orgId        → seam multi-tenant (invariant §1.13). Single-org acum, dar prezent peste tot
 *                   ca activarea multi-tenant să fie flip-a-switch, fără rescriere. „Portița deschisă."
 *  - schemaVersion→ migrații aditive sigure (invariant §1.2).
 *  - createdAt/updatedAt → timestamps.
 *  - deletedAt    → soft-delete reversibil/auditabil (unde e nevoie).
 */
const mongoose = require("mongoose");

const SCHEMA_VERSION = 1;

/**
 * Construiește o schemă pc_ cu câmpurile de bază injectate automat.
 * @param {object} definition  definiția câmpurilor specifice colecției
 * @param {object} options     opțiuni mongoose + { tenantRoot?: bool }
 *   tenantRoot=true → colecția E rădăcina de tenant (pc_org): nu primește orgId
 *   (propriul _id ESTE orgId-ul). Restul colecțiilor îl referențiază.
 */
function pcSchema(definition, options = {}) {
  const { tenantRoot = false, ...mongooseOptions } = options;

  const base = {
    schemaVersion: { type: Number, default: SCHEMA_VERSION },
    deletedAt: { type: Date, default: null, index: true },
  };
  if (!tenantRoot) {
    base.orgId = {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PcOrg",
      required: true,
      index: true,
    };
  }

  const schema = new mongoose.Schema(
    { ...base, ...definition },
    { timestamps: true, ...mongooseOptions }
  );
  return schema;
}

/**
 * Înregistrează un model pc_ cu NUME de colecție EXPLICIT (ex. "pc_people"),
 * ca să se grupeze vizual în DB (§14.2) și să nu depindă de pluralizarea mongoose.
 * Idempotent: dacă modelul există deja (hot-reload), îl refolosește.
 */
function pcModel(name, schema, collection) {
  return mongoose.models[name] || mongoose.model(name, schema, collection);
}

module.exports = { pcSchema, pcModel, SCHEMA_VERSION };
