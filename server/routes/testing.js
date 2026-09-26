const express = require("express");
const { TestBug, TestConfig, User } = require("../models");
const { authMiddleware, requireAccess, limiter } = require("../middleware");

const router = express.Router();

// Categorii valide per natura raportului (trebuie sa oglindeasca bug/featureTaxonomy din app)
const BUG_TYPES = ["INTERFATA", "ACCES", "STRICAT", "EXPERIENTA", "CONTINUT", "ALTELE"];
const FEATURE_TYPES = ["FUNCTIE_NOUA", "IMBUNATATIRE", "CONTINUT_NOU", "INTEGRARE", "AUTOMATIZARE", "PERSONALIZARE", "ALTELE"];
const MAX_SHOT_CHARS = 4 * 1024 * 1024; // ~4MB data-URI (sub limita de 10mb a body-ului)

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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
router.put("/config", authMiddleware, requireAccess("testing.manage"), async (req, res) => {
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

    const kind = b.kind === "feature" ? "feature" : "bug";
    const source = b.source === "local" ? "local" : "mobile";

    const allowedTypes = kind === "feature" ? FEATURE_TYPES : BUG_TYPES;
    if (!allowedTypes.includes(b.bugType)) {
      return res.status(400).json({ error: "Categorie invalidă pentru acest tip de raport" });
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

    // element: whitelisting explicit. Doua forme:
    //  - native-point (mobil): tap/rel/view
    //  - dom-element (web/local): structura reala din DOM + stack de componente
    let element = null;
    if (b.element && typeof b.element === "object") {
      const el = b.element;
      const elKind = clip(el.kind, 40) || "native-point";
      element = { kind: elKind };

      if (elKind === "dom-element") {
        element.tag = clip(el.tag, 40) || null;
        element.domId = clip(el.domId, 120) || null;
        element.testId = clip(el.testId, 120) || null;
        element.selector = clip(el.selector, 400) || null;
        element.text = clip(el.text, 200) || null;
        element.label = clip(el.label, 200) || null;
        if (Array.isArray(el.componentStack)) {
          element.componentStack = el.componentStack.slice(0, 8).map((s) => clip(s, 80)).filter(Boolean);
        }
        // handler-ele (onPress/onClick...) le pastram in text-ul de context al elementului
        if (Array.isArray(el.handlers) && el.handlers.length) {
          element.label = clip(
            [element.label, `handlers: ${el.handlers.slice(0, 8).map((h) => clip(h, 30)).join(", ")}`]
              .filter(Boolean)
              .join(" · "),
            200
          );
        }
        if (el.rect && typeof el.rect === "object") {
          element.rect = { x: num(el.rect.x), y: num(el.rect.y), width: num(el.rect.width), height: num(el.rect.height) };
        }
        if (el.view && typeof el.view === "object") {
          element.view = { width: num(el.view.width), height: num(el.view.height) };
        }
      } else {
        element.tap = el.tap && { x: num(el.tap.x), y: num(el.tap.y) };
        element.rel = el.rel && { x: num(el.rel.x), y: num(el.rel.y) };
        element.view = el.view && { width: num(el.view.width), height: num(el.view.height) };
      }
    }

    // reporter: PII minim (nume din DB, o singura interogare usoara)
    let fullName = "";
    try {
      const u = await User.findById(req.user.id).select("personalData.fullName").lean();
      fullName = u?.personalData?.fullName || "";
    } catch (e) {}

    const doc = await TestBug.create({
      kind,
      source,
      tab: clip(b.tab, 60) || "Necunoscut",
      screen: clip(b.screen, 120) || "Ecran necunoscut",
      route: clip(b.route, 120) || null,
      layer: clip(b.layer, 120) || null,
      folder: clip(b.folder, 200) || null,
      file: clip(b.file, 240) || null,
      element,
      bugType: b.bugType,
      bugCode: clip(b.bugCode, 40) || null,
      problem: clip(b.problem, 4000),
      solution: clip(b.solution, 4000),
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
