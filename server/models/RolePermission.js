const mongoose = require("mongoose");

/**
 * Permisiunile acordate unui rol (in afara de super-admin, care are tot prin
 * bypass). Un document per rol; `perms` = harta cheie-capabilitate -> nivel
 * ("view"|"edit"). Absenta unei chei = fara acces ("none"). Catalogul de
 * capabilitati traieste in cod (config/capabilities.js), nu aici.
 */
const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
    enum: ["admin", "developer", "editor", "user"],
  },
  perms: {
    type: Map,
    of: String,
    default: {},
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

module.exports = mongoose.model("RolePermission", rolePermissionSchema);
