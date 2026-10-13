/**
 * Import CSV People (§4.2 pc_imports, doc #Import). Montat la /api/pc/v1/people/import.
 * Flux PCO: upload → match fields → preview (create/update/errors) → finish → undo 48h.
 * Pe mobil (fără web): CSV vine ca TEXT (paste) sau ca fișier (seam file-picker). Mapare pe
 * `people_import_template.csv`. Pur logic, idempotent prin remote_id/email.
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcPerson, PcHousehold, PcMembershipType, PcImport, PcOrg,
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");
const { toObjects } = require("../lib/csv");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);

// Alias-uri header → câmp canonic (lowercase). Acoperă template-ul + variații uzuale.
const FIELD_ALIASES = {
  remoteId: ["remote_id", "remoteid", "id"],
  firstName: ["first_name", "firstname", "first", "prenume"],
  lastName: ["last_name", "lastname", "last", "nume"],
  middleName: ["middle_name", "middlename"],
  namePrefix: ["name_prefix", "prefix"],
  nameSuffix: ["name_suffix", "suffix"],
  nickname: ["nickname", "porecla"],
  gender: ["gender", "gen", "sex"],
  birthdate: ["birthdate", "birthday", "data_nasterii", "dob"],
  maritalStatus: ["marital_status", "maritalstatus"],
  email: ["email", "email_address", "e-mail"],
  mobilePhone: ["mobile_phone", "mobile", "telefon", "phone"],
  homePhone: ["home_phone", "homephone"],
  addressStreet: ["address_street", "street", "strada"],
  addressCity: ["address_city", "city", "oras"],
  addressCounty: ["address_county", "county", "judet", "state"],
  addressZip: ["address_zip", "zip", "cod_postal", "postal_code"],
  addressCountry: ["address_country", "country", "tara"],
  householdName: ["household_name", "household", "familia"],
  householdPrimary: ["household_primary_contact", "household_primary", "primary_contact"],
  membershipType: ["membership_type", "membership", "membership_class"],
  campus: ["campus"],
  status: ["status"],
  inactiveReason: ["inactive_reason", "inactivereason"],
  notes: ["notes", "note", "notita"],
};

function autoMap(header) {
  const map = {}; // canonicField -> columnName
  const lower = header.map((h) => ({ raw: h, low: h.toLowerCase().trim() }));
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const hit = lower.find((h) => aliases.includes(h.low));
    if (hit) map[field] = hit.raw;
  }
  return map;
}

const truthy = (v) => /^(y|yes|true|1|da)$/i.test(String(v || "").trim());
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
function normGender(v) {
  const s = String(v || "").trim().toLowerCase();
  if (["m", "male", "masculin", "b", "barbat"].includes(s)) return "M";
  if (["f", "female", "feminin"].includes(s)) return "F";
  return "";
}
function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Construiește obiectul-persoană normalizat dintr-un record CSV + mapare. */
function buildPerson(rec, map) {
  const g = (f) => (map[f] ? rec[map[f]] : "");
  const emails = [];
  if (g("email")) emails.push({ address: g("email").toLowerCase(), location: "Home", primary: true });
  const phones = [];
  if (g("mobilePhone")) phones.push({ number: g("mobilePhone"), location: "Mobile", primary: true });
  if (g("homePhone")) phones.push({ number: g("homePhone"), location: "Home" });
  const addresses = [];
  if (g("addressStreet") || g("addressCity")) {
    addresses.push({
      street: g("addressStreet"), city: g("addressCity"), county: g("addressCounty"),
      zip: g("addressZip"), country: g("addressCountry") || "Romania", location: "Home",
    });
  }
  const statusRaw = g("status").toLowerCase();
  return {
    remoteId: g("remoteId"),
    firstName: g("firstName"),
    lastName: g("lastName"),
    middleName: g("middleName"),
    namePrefix: g("namePrefix"),
    nameSuffix: g("nameSuffix"),
    nickname: g("nickname"),
    gender: normGender(g("gender")),
    birthdate: parseDate(g("birthdate")),
    maritalStatus: g("maritalStatus"),
    emails, phones, addresses,
    householdName: g("householdName"),
    householdPrimary: truthy(g("householdPrimary")),
    membershipTypeName: g("membershipType"),
    status: statusRaw === "inactive" ? "inactive" : "active",
    inactiveReason: g("inactiveReason"),
    notes: g("notes"),
  };
}

function rowErrors(p) {
  const errs = [];
  if (!p.firstName || !p.lastName) errs.push("First and Last name fields must be selected.");
  for (const e of p.emails) if (!emailOk(e.address)) errs.push(`Email address has invalid formatting: ${e.address}`);
  return errs;
}

/* ───────── POST /preview — parsează + clasifică + salvează jobul (status preview) ───────── */
router.post("/preview", requireCan("people.import"), async (req, res) => {
  try {
    const csv = req.body?.csv;
    if (!csv || typeof csv !== "string" || !csv.trim()) {
      return res.status(400).json({ error: "Trimite conținutul CSV (text)." });
    }
    const { header, records } = toObjects(csv);
    if (!header.length) return res.status(400).json({ error: "CSV gol sau invalid." });
    const map = (req.body?.mapping && Object.keys(req.body.mapping).length) ? req.body.mapping : autoMap(header);
    if (!map.firstName || !map.lastName) {
      return res.status(400).json({ error: "Lipsesc coloanele obligatorii: first_name și last_name." });
    }

    let create = 0, update = 0, errorsCount = 0;
    const prepared = [];
    for (let idx = 0; idx < records.length; idx++) {
      const p = buildPerson(records[idx], map);
      const errs = rowErrors(p);
      let action = "create";
      let matchId = null;
      if (errs.length) {
        action = "error";
      } else {
        // match prin remoteId, apoi email primar
        let existing = null;
        if (p.remoteId) existing = await PcPerson.findOne(scoped(req, { remoteId: p.remoteId })).select("_id").lean();
        if (!existing && p.emails[0]) existing = await PcPerson.findOne(scoped(req, { "emails.address": p.emails[0].address })).select("_id").lean();
        if (existing) { action = "update"; matchId = existing._id; }
      }
      if (action === "create") create++;
      else if (action === "update") update++;
      else errorsCount++;
      prepared.push({ row: idx + 1, action, matchId, person: p, errors: errs });
    }

    const job = await PcImport.create(
      stamp(req, {
        type: "people",
        status: "preview",
        mapping: map,
        header,
        preparedRows: prepared,
        rowCount: records.length,
        importedBy: req.user.id,
      })
    );

    res.json({
      importId: job._id,
      header,
      mapping: map,
      summary: { total: records.length, create, update, errors: errorsCount },
      sample: prepared.slice(0, 15).map((p) => ({
        row: p.row, action: p.action,
        name: [p.person.firstName, p.person.lastName].filter(Boolean).join(" "),
        email: p.person.emails[0]?.address || "",
        errors: p.errors,
      })),
      errorRows: prepared.filter((p) => p.action === "error").slice(0, 50).map((p) => ({ row: p.row, errors: p.errors })),
    });
  } catch (err) {
    console.error("[pc] POST /people/import/preview:", err.message);
    res.status(500).json({ error: "Eroare la citirea CSV: " + err.message });
  }
});

/* ───────── POST /:id/commit — aplică importul (create/update) + undo 48h ───────── */
router.post("/:id/commit", requireCan("people.import"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const job = await PcImport.findOne(scoped(req, { _id: id }));
    if (!job) return res.status(404).json({ error: "Import inexistent." });
    if (job.status !== "preview") return res.status(400).json({ error: "Importul nu mai e în preview." });

    const ignore = new Set((req.body?.ignoreRows || []).map(Number));
    const org = await PcOrg.findById(req.pcOrgId).select("defaultCampusId").lean();
    const defaultCampusId = org?.defaultCampusId || null;

    const householdCache = {};
    const membershipCache = {};
    let created = 0, updated = 0;
    const createdIds = [];

    for (const pr of job.preparedRows) {
      if (pr.action === "error" || ignore.has(pr.row)) continue;
      const p = pr.person;

      // household find-or-create
      let householdId = null;
      if (p.householdName) {
        if (householdCache[p.householdName]) householdId = householdCache[p.householdName];
        else {
          let hh = await PcHousehold.findOne(scoped(req, { name: p.householdName }));
          if (!hh) hh = await PcHousehold.create(stamp(req, { name: p.householdName }));
          householdId = hh._id; householdCache[p.householdName] = hh._id;
        }
      }
      // membership find-or-create
      let membershipTypeId = null;
      if (p.membershipTypeName) {
        if (membershipCache[p.membershipTypeName]) membershipTypeId = membershipCache[p.membershipTypeName];
        else {
          let mt = await PcMembershipType.findOne(scoped(req, { name: p.membershipTypeName }));
          if (!mt) mt = await PcMembershipType.create(stamp(req, { name: p.membershipTypeName }));
          membershipTypeId = mt._id; membershipCache[p.membershipTypeName] = mt._id;
        }
      }

      const fields = {
        firstName: p.firstName, lastName: p.lastName, middleName: p.middleName,
        namePrefix: p.namePrefix, nameSuffix: p.nameSuffix, nickname: p.nickname,
        gender: p.gender, birthdate: p.birthdate, maritalStatus: p.maritalStatus,
        emails: p.emails, phones: p.phones, addresses: p.addresses,
        status: p.status, inactiveReason: p.inactiveReason, notes: p.notes,
        remoteId: p.remoteId || undefined,
        householdId: householdId || undefined,
        membershipTypeId: membershipTypeId || undefined,
        campusId: defaultCampusId || undefined,
      };
      Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

      if (pr.action === "update" && pr.matchId) {
        await PcPerson.updateOne(scoped(req, { _id: pr.matchId }), { $set: fields });
        updated++;
        if (householdId && p.householdPrimary) {
          await PcHousehold.updateOne(scoped(req, { _id: householdId }), { $set: { primaryContactPersonId: pr.matchId } });
        }
      } else {
        const person = await PcPerson.create(stamp(req, fields));
        created++; createdIds.push(person._id);
        if (householdId && p.householdPrimary) {
          await PcHousehold.updateOne(scoped(req, { _id: householdId }), { $set: { primaryContactPersonId: person._id } });
        }
      }
    }

    job.status = "committed";
    job.createdCount = created;
    job.updatedCount = updated;
    job.createdPersonIds = createdIds;
    job.undoableUntil = new Date(Date.now() + 48 * 3600 * 1000);
    await job.save();

    res.json({ ok: true, created, updated, undoableUntil: job.undoableUntil });
  } catch (err) {
    console.error("[pc] POST /people/import/:id/commit:", err.message);
    res.status(500).json({ error: "Eroare la aplicarea importului: " + err.message });
  }
});

/* ───────── POST /:id/undo — anulează (soft-delete persoanele CREATE) în 48h ───────── */
router.post("/:id/undo", requireCan("people.import"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const job = await PcImport.findOne(scoped(req, { _id: id }));
    if (!job) return res.status(404).json({ error: "Import inexistent." });
    if (job.status !== "committed") return res.status(400).json({ error: "Importul nu poate fi anulat." });
    if (!job.undoableUntil || job.undoableUntil < new Date()) {
      return res.status(400).json({ error: "Fereastra de undo (48h) a expirat." });
    }
    // Confirmare ca în PCO: clientul trimite confirm:"Undo import".
    if (String(req.body?.confirm || "").trim().toLowerCase() !== "undo import") {
      return res.status(400).json({ error: 'Confirmă cu textul "Undo import".' });
    }
    const ids = job.createdPersonIds || [];
    if (ids.length) {
      await PcPerson.updateMany(scoped(req, { _id: { $in: ids } }), { $set: { deletedAt: new Date() } });
    }
    job.status = "undone";
    await job.save();
    res.json({ ok: true, removed: ids.length });
  } catch (err) {
    console.error("[pc] POST /people/import/:id/undo:", err.message);
    res.status(500).json({ error: "Eroare la anularea importului." });
  }
});

/* ───────── GET /:id — rezultatele unui import ───────── */
router.get("/:id", requireCan("people.import"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const job = await PcImport.findOne(scoped(req, { _id: id })).lean();
    if (!job) return res.status(404).json({ error: "Import inexistent." });
    res.json({
      importId: job._id, status: job.status, rowCount: job.rowCount,
      createdCount: job.createdCount, updatedCount: job.updatedCount,
      undoableUntil: job.undoableUntil,
      canUndo: job.status === "committed" && job.undoableUntil && new Date(job.undoableUntil) > new Date(),
    });
  } catch (err) {
    console.error("[pc] GET /people/import/:id:", err.message);
    res.status(500).json({ error: "Eroare la citirea importului." });
  }
});

module.exports = router;
