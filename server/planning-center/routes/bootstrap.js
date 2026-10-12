/**
 * Rute admin pt. bootstrap/seed/migrare (felia People). /api/pc/v1/admin/*
 * Idempotent. Gate: admin app (superadmin/admin/developer).
 */
const express = require("express");
const { isAdmin } = require("../../middleware");
const { PcOrg, PcCampus, PcPerson } = require("../models");
const { scoped, clearOrgCache } = require("../core/orgScope");
const { ensureBootstrap, migratePeople } = require("../services/seed");

const router = express.Router();

/** Stare modul: org + câți campus/oameni. */
router.get("/status", isAdmin, async (req, res) => {
  try {
    const org = await PcOrg.findById(req.pcOrgId).lean();
    const [campuses, people] = await Promise.all([
      PcCampus.countDocuments(scoped(req)),
      PcPerson.countDocuments(scoped(req)),
    ]);
    res.json({
      org: org ? { id: org._id, name: org.name, brandLabel: org.brandLabel } : null,
      campuses,
      people,
    });
  } catch (err) {
    console.error("[pc] GET /admin/status:", err.message);
    res.status(500).json({ error: "Eroare la citirea stării modulului." });
  }
});

/** Rulează bootstrap + migrare useri→pc_people (idempotent). */
router.post("/seed", isAdmin, async (req, res) => {
  try {
    clearOrgCache();
    await ensureBootstrap();
    const result = await migratePeople();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[pc] POST /admin/seed:", err.message);
    res.status(500).json({ error: "Eroare la seed/migrare: " + err.message });
  }
});

module.exports = router;
