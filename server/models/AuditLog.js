const mongoose = require("mongoose");

/**
 * Jurnal de audit pentru actiuni sensibile/distructive (cine, ce, cand, asupra cui).
 * Scop: urma imutabila care protejeaza datele chiar si de un cont de admin compromis.
 * Nu se sterge si nu se modifica din aplicatie (append-only).
 */
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    // ex: user.delete, user.role-change, user.ban, user.unban
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  actorRole: {
    type: String,
    default: "",
  },
  targetType: {
    type: String,
    default: "",
  },
  targetId: {
    type: String,
    default: "",
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ip: {
    type: String,
    default: "",
  },
  at: {
    type: Date,
    default: Date.now,
  },
});

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ actorId: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
