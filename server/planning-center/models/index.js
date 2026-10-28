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
  PcRole: require("./PcRole"),
  PcMembershipType: require("./PcMembershipType"),
  PcTagGroup: require("./PcTagGroup"),
  PcTag: require("./PcTag"),
  PcImport: require("./PcImport"),
  // Services core (Plan page)
  PcFolder: require("./PcFolder"),
  PcSeries: require("./PcSeries"),
  PcPlan: require("./PcPlan"),
  PcPlanTime: require("./PcPlanTime"),
  PcPlanItem: require("./PcPlanItem"),
  PcItemNote: require("./PcItemNote"),
  PcNoteCategory: require("./PcNoteCategory"),
  PcAssignment: require("./PcAssignment"),
  PcPositionGuestLog: require("./PcPositionGuestLog"),
  PcNeededPosition: require("./PcNeededPosition"),
  PcPlanNote: require("./PcPlanNote"),
  PcPlanFile: require("./PcPlanFile"),
  PcPlanTemplate: require("./PcPlanTemplate"),
  PcTimePreferenceOption: require("./PcTimePreferenceOption"),
  PcSchedulingPreference: require("./PcSchedulingPreference"),
  PcSong: require("./PcSong"),
  // Songs felia
  PcArrangement: require("./PcArrangement"),
  PcKey: require("./PcKey"),
  PcSongFile: require("./PcSongFile"),
  PcIntegration: require("./PcIntegration").PcIntegration,
  PcIntegrationAccount: require("./PcIntegration").PcIntegrationAccount,
  PcMediaItem: require("./PcMediaItem"),
  PcBlockout: require("./PcBlockout"),
  PcMessage: require("./PcMessage"),
};
