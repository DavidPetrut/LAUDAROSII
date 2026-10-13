/**
 * pc_people — profilul AUTORITATIV al persoanei (§4.1). Poate exista FĂRĂ login.
 * Link opțional la `users` existent prin `userId` (1:0..1) — auth/acțiuni; profilul trăiește aici.
 * Fișierele (avatar) = URL/string, NU în DB (invariant §1.8). Avatar poate fi și base64 moștenit.
 */
const mongoose = require("mongoose");
const { pcSchema, pcModel } = require("../core/schema");

const emailSchema = new mongoose.Schema(
  {
    address: { type: String, trim: true, lowercase: true },
    location: { type: String, default: "Home" }, // Home/Work/Other
    primary: { type: Boolean, default: false },
  },
  { _id: false }
);

const phoneSchema = new mongoose.Schema(
  {
    number: { type: String, trim: true },
    location: { type: String, default: "Mobile" }, // Mobile/Home/Work
    enableText: { type: Boolean, default: false },
    primary: { type: Boolean, default: false },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    county: { type: String, default: "" },
    zip: { type: String, default: "" },
    country: { type: String, default: "Romania" },
    location: { type: String, default: "Home" },
  },
  { _id: false }
);

const schema = pcSchema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, default: "", trim: true },
  middleName: { type: String, default: "" },
  namePrefix: { type: String, default: "" },
  nameSuffix: { type: String, default: "" },
  nickname: { type: String, default: "" },
  gender: { type: String, enum: ["M", "F", ""], default: "" },
  birthdate: { type: Date, default: null },
  maritalStatus: { type: String, default: "" }, // single/married/…
  emails: { type: [emailSchema], default: [] },
  phones: { type: [phoneSchema], default: [] },
  addresses: { type: [addressSchema], default: [] },
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: "PcHousehold", default: null },
  membershipTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PcMembershipType", default: null },
  campusId: { type: mongoose.Schema.Types.ObjectId, ref: "PcCampus", default: null },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  inactiveReason: { type: String, default: "" },
  deceased: { type: Boolean, default: false },
  child: { type: Boolean, default: false }, // copil (poate n-avea login)
  avatar: { type: String, default: "" }, // URL sau base64 moștenit din users.personalData.profilePicture
  tagIds: { type: [mongoose.Schema.Types.ObjectId], ref: "PcTag", default: [] },
  anniversary: { type: Date, default: null },
  notes: { type: String, default: "" }, // notă generică (ex. din import CSV)
  medicalNotes: { type: String, default: "" }, // HIPAA — sensibil
  directoryStatus: { type: String, default: "notListed" },
  remoteId: { type: String, default: "" }, // pt. import CSV (idempotent)
  // Permisiunea ALEASĂ la Add Person pt. o persoană FĂRĂ login (nu putem crea pc_permissions
  // fără userId). Când persoana primește login (userId), accessIntent → pc_permissions. Lossless.
  accessIntent: {
    peoplePlansLevel: { type: String, default: "" },
    songLevel: { type: String, default: "" },
    mediaLevel: { type: String, default: "" },
    fileAccess: {
      plan: { type: Boolean, default: false },
      song: { type: Boolean, default: false },
      media: { type: Boolean, default: false },
    },
  },
  // Link login (opțional). Referă colecția `users` existentă a app-ului.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
});

// Indici pt. listă + search + sort (§6).
schema.index({ orgId: 1, firstName: 1 });
schema.index({ orgId: 1, lastName: 1 });
schema.index({ orgId: 1, status: 1 });
schema.index({ orgId: 1, remoteId: 1 });
schema.index(
  { firstName: "text", lastName: "text", nickname: "text", "emails.address": "text" },
  { name: "pc_people_text" }
);

// Nume complet derivat (ca în screenshot: „Abel Cretu-Catanoiu (1)").
schema.virtual("fullName").get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(" ").trim();
});
schema.set("toJSON", { virtuals: true });
schema.set("toObject", { virtuals: true });

module.exports = pcModel("PcPerson", schema, "pc_people");
