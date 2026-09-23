const { AuditLog } = require("../models");

/**
 * Scrie o intrare de audit. Nu arunca niciodata: un esec de audit nu trebuie
 * sa rupa actiunea de baza (dar il logam in consola pentru investigatie).
 */
const writeAudit = async ({ action, req, targetType, targetId, meta }) => {
  try {
    await AuditLog.create({
      action,
      actorId: req?.user?.id || null,
      actorRole: req?.user?.role || "",
      targetType: targetType || "",
      targetId: targetId ? String(targetId) : "",
      meta: meta || {},
      ip: req?.ip || "",
    });
  } catch (err) {
    console.error("[audit] nu am putut scrie intrarea:", action, err.message);
  }
};

module.exports = { writeAudit };
