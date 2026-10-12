/**
 * Barrel pentru modelele Planning Center (pc_).
 * Toate colecțiile încep cu `pc_` și trăiesc în aceeași bază `laudarosii` (§14.6.B).
 * Un singur loc de import: `const { PcPerson } = require("../models");`
 */
module.exports = {
  PcOrg: require("./PcOrg"),
  PcCampus: require("./PcCampus"),
  PcServicesDefaults: require("./PcServicesDefaults"),
  PcServiceType: require("./PcServiceType"),
  PcPerson: require("./PcPerson"),
  PcHousehold: require("./PcHousehold"),
  PcTeam: require("./PcTeam"),
  PcPosition: require("./PcPosition"),
  PcTeamMember: require("./PcTeamMember"),
  PcPermission: require("./PcPermission"),
  PcMembershipType: require("./PcMembershipType"),
  PcTagGroup: require("./PcTagGroup"),
  PcTag: require("./PcTag"),
  PcImport: require("./PcImport"),
};
