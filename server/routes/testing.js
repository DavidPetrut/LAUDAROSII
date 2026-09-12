const express = require("express");
const { TestBug, TestConfig, User } = require("../models");
const { authMiddleware, isAdmin, limiter } = require("../middleware");

const router = express.Router();

const VALID_TYPES = ["INTERFATA", "ACCES", "STRICAT", "EXPERIENTA", "CONTINUT", "ALTELE"];
const MAX_SHOT_CHARS = 4 * 1024 * 1024; // ~4MB data-URI (sub limita de 10mb a body-ului)

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

/**
 * GET /api/testing/config
 * Returneaza flag-ul care controleaza afisarea butonului de feedback.
 * Creeaza documentul singleton daca nu exista (default: enabled = true).
 */
router.get("/config", authMiddleware, async (req, res) => {
  try {
    let cfg = await TestConfig.findOne({ key: "singleton" });
    if (!cfg) cfg = await TestConfig.create({ key: "singleton", enabled: true });
    res.json({ enabled: cfg.enabled });
  } catch (error) {
    res.status(500).json({ error: "Eroare la configurarea testarii" });
  }
});

/**
 * PUT /api/testing/config  (doar admin)
 * Porneste/opreste modul de testare instant, fara OTA/build.
 */
router.put("/config", authMiddleware, isAdmin, async (req, res) => {
  try {
    const enabled = !!req.body.enabled;
    const cfg = await TestConfig.findOneAndUpdate(
      { key: "singleton" },
      { enabled, note: clip(req.body.note, 200) },
      { new: true, upsert: true }
    );
    res.json({ enabled: cfg.enabled });
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizarea configurarii" });
  }
});

/**
 * POST /api/testing/bugs
 * Salveaza un raport de bug/feedback. Necesita autentificare.
 *
 * SECURITATE / GDPR:
 *  - accepta DOAR campuri din whitelist (ignora orice altceva trimite clientul)
 *  - nu stocam token-uri/parole/headere/body-uri de retea (nu vin din client)
 *  - PII minim: userId + numele afisat + rol
 *  - limitam dimensiunea screenshot-ului si lungimile textelor
 */
router.post("/bugs", authMiddleware, limiter(20), async (req, res) => {
  try {
    const b = req.body || {};

    if (!VALID_TYPES.includes(b.bugType)) {
      return res.status(400).json({ error: "Tip de bug invalid" });
    }

    // screenshot: acceptam doar data-URI de imagine, sub limita de marime
    let screenshot = null;
    if (typeof b.screenshot === "string" && b.screenshot.startsWith("data:image/")) {
      if (b.screenshot.length > MAX_SHOT_CHARS) {
        return res.status(413).json({ error: "Captura este prea mare" });
      }
      screenshot = b.screenshot;
    }

    // context: acceptam doar un obiect simplu (fara functii/refs); il pastram ca Mixed
    let context = {};
    if (b.context && typeof b.context === "object" && !Array.isArray(b.context)) {
      try {
        context = JSON.parse(JSON.stringify(b.context));
      } catch (e) {
        context = {};
      }
    }

    // element: whitelisting explicit
    let element = null;
    if (b.element && typeof b.element === "object") {
      element = {
        kind: clip(b.element.kind, 40) || "native-point",
        tap: b.element.tap && {
          x: Number(b.element.tap.x) || 0,
          y: Number(b.element.tap.y) || 0,
        },
        rel: b.element.rel && {
          x: Number(b.element.rel.x) || 0,
          y: Number(b.element.rel.y) || 0,
        },
        view: b.element.view && {
          width: Number(b.element.view.width) || 0,
          height: Number(b.element.view.height) || 0,
        },
      };
    }

    // reporter: PII minim (nume din DB, o singura interogare usoara)
    let fullName = "";
    try {
      const u = await User.findById(req.user.id).select("personalData.fullName").lean();
      fullName = u?.personalData?.fullName || "";
    } catch (e) {}

    const doc = await TestBug.create({
      tab: clip(b.tab, 60) || "Necunoscut",
      screen: clip(b.screen, 120) || "Ecran necunoscut",
      route: clip(b.route, 120) || null,
      layer: clip(b.layer, 120) || null,
      folder: clip(b.folder, 200) || null,
      file: clip(b.file, 240) || null,
      element,
      bugType: b.bugType,
      bugCode: clip(b.bugCode, 40) || null,
      problem: clip(b.problem, 2000),
      solution: clip(b.solution, 2000),
      screenshot,
      context,
      reporter: {
        userId: req.user.id,
        fullName,
        role: req.user.role || "",
      },
      status: "new",
    });

    res.status(201).json({ success: true, id: doc._id });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ error: "Date invalide pentru raport" });
    }
    res.status(500).json({ error: "Eroare la salvarea raportului" });
  }
});

module.exports = router;
