/** pc_org — rădăcina de tenant (§4.2). `_id` ESTE orgId-ul referențiat de toate colecțiile. */
const { pcSchema, pcModel } = require("../core/schema");

const schema = pcSchema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "" },
    website: { type: String, default: "" },
    phone: { type: String, default: "" },
    taxId: { type: String, default: "" },
    mailingAddress: { type: String, default: "" },
    logoLight: { type: String, default: "" },
    logoDark: { type: String, default: "" },
    defaultCampusId: { type: Object, default: null }, // ObjectId (pc_campus), setat la seed
    // branding/replicabilitate (§14.4): numele „Planning Center" afișat, culori temă override.
    brandLabel: { type: String, default: "Planificare" },
  },
  { tenantRoot: true } // NU primește orgId — el e org-ul
);

module.exports = pcModel("PcOrg", schema, "pc_org");
