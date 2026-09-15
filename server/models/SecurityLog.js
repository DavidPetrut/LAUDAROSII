const mongoose = require("mongoose");

/**
 * Log de securitate: o tentativa de atac / acces respins, detectata automat.
 *
 * Se scrie din middleware/securityLog.js cand o cerere primeste 401/403/429
 * (acces fara token, rol insuficient, flood de cereri). NU schimba comportamentul
 * aplicatiei - doar inregistreaza, ca sa avem un istoric real in dashboard.
 *
 * status: "blocked" = tentativa esuata (apararea a tinut) | "in_progress" = ceva
 * activ | "success" = atac reusit (se marcheaza manual sau prin detectie avansata).
 */
const securityLogSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["blocked", "in_progress", "success"], default: "blocked", index: true },
    attackType: { type: String, default: "unknown", index: true }, // unauthorized | privilege | flood | injection | other
    httpStatus: { type: Number, default: null },
    method: { type: String, default: "" },
    path: { type: String, default: "", maxlength: 300 },
    targetScreen: { type: String, default: null },
    ip: { type: String, default: "" },
    country: { type: String, default: null }, // best-effort; "—" daca neimbogatit
    userAgent: { type: String, default: "", maxlength: 400 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

securityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SecurityLog", securityLogSchema);
