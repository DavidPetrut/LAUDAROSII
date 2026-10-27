/**
 * peopleSync — leagă conturile MOBILE (`users`) de profilurile PC (`pc_people`).
 *
 * MOBILE E SURSA DE ADEVĂR: un cont creat în aplicație apare automat în PCO (People) și
 * devine asignabil. Nu DUPLICĂM: dacă există deja un pc_person cu același email (sau același
 * nume) îl LEGĂM și-l SUPRASCRIEM (overwrite) — altfel îl creăm. Când contul e șters din
 * aplicație (soft-delete / purge), pc_person-ul linkat e soft-deletat și el (iese din liste,
 * dar istoricul de asignări rămâne). ZERO emailuri — totul e doar în baza noastră.
 *
 * Idempotent: a rula de mai multe ori nu creează dubluri (dedupe pe userId → email → nume).
 */
const { PcPerson } = require("../models");
const { resolveOrgId } = require("../core/orgScope");

/** normalizează un nume pt. potrivire: fără diacritice, lowercase, spații colapsate. */
function norm(s = "") {
  return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** „Ion Pop (1)" → { firstName:"Ion", lastName:"Pop", programIntent:"1" } (ca în restul app-ului). */
function splitName(fullName = "") {
  let s = String(fullName || "").trim();
  let programIntent = "";
  const m = s.match(/\((\d)\)\s*$/);           // sufix „(1)"/„(2)" = intenția SIM
  if (m) { programIntent = m[1] === "2" ? "2" : "1"; s = s.replace(/\s*\(\d\)\s*$/, "").trim(); }
  const parts = s.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");
  return { firstName, lastName, programIntent };
}

/**
 * Creează/leagă/suprascrie pc_person-ul pt. un user mobil. Dacă user.deletedAt → soft-delete.
 * @returns {Promise<PcPerson|null>}
 */
async function syncPersonFromUser(user, opts = {}) {
  if (!user || !user._id) return null;
  const orgId = opts.orgId || (await resolveOrgId());
  const email = String(user.email || "").trim().toLowerCase();
  const deleted = !!user.deletedAt;

  // 1) deja linkat prin userId? (include soft-deleted, ca să-l putem reînvia)
  let person = await PcPerson.findOne({ orgId, userId: user._id });

  // 2) potrivire pe EMAIL (overwrite, nu duplicat) — printre cei ne-șterși, nelinkați
  if (!person && email) {
    person = await PcPerson.findOne({ orgId, deletedAt: null, "emails.address": email, $or: [{ userId: null }, { userId: { $exists: false } }] });
  }

  const { firstName, lastName, programIntent } = splitName(user.personalData?.fullName);

  // 3) potrivire pe NUME complet (normalizat), doar dacă nu e deja legat de alt user
  if (!person && firstName) {
    const target = norm(`${firstName} ${lastName}`);
    const cands = await PcPerson.find({ orgId, deletedAt: null }).select("firstName lastName userId").lean();
    const hit = cands.find((c) => !c.userId && norm(`${c.firstName || ""} ${c.lastName || ""}`) === target);
    if (hit) person = await PcPerson.findById(hit._id);
  }

  // Contul e șters în aplicație → soft-delete pc_person-ul linkat (iese din liste).
  if (deleted) {
    if (person && !person.deletedAt) { person.deletedAt = new Date(); person.status = "inactive"; await person.save(); }
    return person || null;
  }

  if (!person) person = new PcPerson({ orgId, firstName: firstName || email || "—", lastName });

  // OVERWRITE câmpurile de bază din MOBILE (sursa de adevăr).
  person.userId = user._id;
  if (firstName) person.firstName = firstName;
  person.lastName = lastName;
  // SIM/program: alegerea explicită de la cont (personalData.sim) are prioritate; altfel markerul din nume.
  const explicitSim = ["1", "2"].includes(String(user.personalData?.sim)) ? String(user.personalData.sim) : "";
  if (explicitSim) person.programIntent = explicitSim;
  else if (programIntent) person.programIntent = programIntent;

  // email: îl punem primul/primary dacă lipsește
  const emails = (Array.isArray(person.emails) ? person.emails : []).filter((e) => e && e.address);
  if (email && !emails.some((e) => String(e.address).toLowerCase() === email)) {
    emails.unshift({ address: email, location: "Home", primary: emails.length === 0 });
  }
  person.emails = emails;

  // telefon / avatar din mobil (fără a șterge ce există)
  const phone = String(user.personalData?.phone || "").trim();
  if (phone && !(person.phones || []).some((p) => p.number === phone)) {
    person.phones = [...(person.phones || []), { number: phone, location: "Mobile", primary: (person.phones || []).length === 0 }];
  }
  const pic = user.personalData?.profilePicture;
  if (pic && !person.avatar) person.avatar = pic;

  // reînvie dacă fusese soft-deletat și acum userul e activ
  if (person.deletedAt) person.deletedAt = null;
  if (person.status !== "active") person.status = "active";

  await person.save();
  return person;
}

/**
 * La ștergerea contului mobil:
 *  - `hard:true` (PURGE / ștergere definitivă) → ȘTERGE FIZIC pc_person-ul din People.
 *    NU atingem istoricul (pc_assignments rămân — doar profilul dispare din liste).
 *  - implicit (soft-delete recuperabil) → soft-delete pc_person (iese din liste, recuperabil).
 */
async function removePersonForUser(userId, opts = {}) {
  if (!userId) return null;
  const orgId = opts.orgId || (await resolveOrgId());
  if (opts.hard) {
    const r = await PcPerson.deleteOne({ orgId, userId });
    return r?.deletedCount ? { _id: null, hardDeleted: true } : null;
  }
  const person = await PcPerson.findOne({ orgId, userId });
  if (person && !person.deletedAt) { person.deletedAt = new Date(); person.status = "inactive"; await person.save(); }
  return person || null;
}

/**
 * Backfill unic pt. cei ~N useri existenți: leagă/overwrite fără dubluri, și soft-delete
 * pc_people ai userilor deja șterși. Rulabil din CLI (vezi peopleSyncCli.js).
 */
async function syncAllUsers(opts = {}) {
  const User = require("../../models/User");
  const orgId = opts.orgId || (await resolveOrgId());
  const users = await User.find({}).select("email personalData deletedAt").lean();
  let linked = 0, created = 0, removed = 0;
  for (const u of users) {
    if (u.deletedAt) { const r = await removePersonForUser(u._id, { orgId }); if (r) removed++; continue; }
    const before = await PcPerson.findOne({ orgId, userId: u._id }).select("_id").lean();
    const p = await syncPersonFromUser(u, { orgId });
    if (p) { before ? linked++ : created++; }
  }
  return { total: users.length, created, linked, removed };
}

module.exports = { syncPersonFromUser, removePersonForUser, syncAllUsers, splitName, norm };
