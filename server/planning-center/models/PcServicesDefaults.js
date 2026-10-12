/** pc_servicesDefaults — toggle-urile `*` de permisiuni la nivel de org (§5.7). Un doc per org. */
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema({
  newUserDefaultLevel: { type: String, default: "viewer" },
  whoCanCreatePeople: { type: String, default: "editor" }, // scheduler|editor|administrator
  whoCanDeleteAnything: { type: String, default: "administrator" },
  whoCanEditContactInfo: { type: String, default: "scheduler" },
  whoCanEditAssignments: { type: String, default: "scheduler" },
  whoCanCreateDeleteFolders: { type: String, default: "administrator" },
  whoCanRemoveMyTeamsFilter: { type: String, default: "administrator" },
  whoCanControlLive: { type: String, default: "editor" }, // seam LIVE
  directMessagesEnabled: { type: Boolean, default: true },
});

module.exports = pcModel("PcServicesDefaults", schema, "pc_servicesDefaults");
