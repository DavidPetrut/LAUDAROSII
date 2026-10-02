const express = require("express");
const mongoose = require("mongoose");
const { TestBug, TestConfig, User } = require("../models");
const { authMiddleware, requireAccess, limiter } = require("../middleware");

const router = express.Router();

// Statusul la care un bug devine vizibil pentru userul care l-a raportat, pentru
// confirmarea finala (dev-ul l-a marcat "Rezolvat" in dashboard). Userul vede DOAR
// bugurile proprii cu acest status si poate actiona DOAR asupra lor.
const USER_CONFIRM_STATUS = "fixed";

// Categorii valide per natura raportului (trebuie sa oglindeasca bug/featureTaxonomy din app)
const BUG_TYPES = ["INTERFATA", "ACCES", "STRICAT", "EXPERIENTA", "CONTINUT", "ALTELE"];
const FEATURE_TYPES = ["FUNCTIE_NOUA", "IMBUNATATIRE", "CONTINUT_NOU", "INTEGRARE", "AUTOMATIZARE", "PERSONALIZARE", "ALTELE"];
const DESIGN_TYPES = ["ALINIERE", "CULORI", "TIPOGRAFIE"];
const UX_TYPES = ["INTELEGERE", "PASI", "INCREDERE"];
const ALLOWED_KINDS = ["bug", "feature", "rating", "ui_design", "ux", "uiux_dev"];
const MAX_SHOT_CHARS = 4 * 1024 * 1024; // ~4MB data-URI (sub limita de 10mb a body-ului)
const MAX_IMAGES = 6;

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

    const kind = ALLOWED_KINDS.includes(b.kind) ? b.kind : "bug";
    const source = b.source === "local" ? "local" : "mobile";

    let bugType = b.bugType;
    let rating = null;
    if (kind === "rating") {
      bugType = "RATING";
      const r = Number(b.rating);
      if (!(r >= 0.5 && r <= 3)) {
        return res.status(400).json({ error: "Rating invalid" });
      }
      rating = Math.round(r * 2) / 2; // pas de 0.5
    } else if (kind === "uiux_dev") {
      bugType = "UIUX_DEV";
    } else {
      const allowedTypes =
        kind === "feature" ? FEATURE_TYPES : kind === "ui_design" ? DESIGN_TYPES : kind === "ux" ? UX_TYPES : BUG_TYPES;
      if (!allowedTypes.includes(b.bugType)) {
        return res.status(400).json({ error: "Categorie invalidă pentru acest tip de raport" });
      }
    }

    // UX: campuri obligatorii (ce incerca, a reusit da/nu, stres 1..5)
    const whatTrying = clip(b.whatTrying, 1000);
    const didFinish = typeof b.didFinish === "boolean" ? b.didFinish : null;
    const stressNum = Number(b.stress);
    const stress = stressNum >= 1 && stressNum <= 5 ? Math.round(stressNum) : null;

    // UI/UX-dev: link Figma + poze atasate
    const figmaLink = clip(b.figmaLink, 500);
    const figmaElement = clip(b.figmaElement, 120);
    const animation = clip(b.animation, 300);
    let images;
    if (Array.isArray(b.images)) {
      images = b.images
        .filter((s) => typeof s === "string" && s.startsWith("data:image/") && s.length <= MAX_SHOT_CHARS)
        .slice(0, MAX_IMAGES);
      if (images.length === 0) images = undefined;
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
      bugType,
      bugCode: clip(b.bugCode, 40) || null,
      problem: clip(b.problem, 8000),
      solution: clip(b.solution, 8000),
      rating,
      whatTrying,
      didFinish,
      stress,
      figmaLink,
      figmaElement,
      animation,
      images,
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

/**
 * GET /api/testing/bugs/mine
 * Bugurile raportate de userul curent care au fost marcate "Rezolvat" de dev, pentru
 * confirmare finala. NU returneaza bugurile altor useri, cele nerezolvate sau cele sterse.
 */
router.get("/bugs/mine", authMiddleware, async (req, res) => {
  try {
    const bugs = await TestBug.find({
      "reporter.userId": req.user.id,
      status: USER_CONFIRM_STATUS,
    })
      .select("-screenshot -images")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(bugs);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcarea bugurilor" });
  }
});

/**
 * PATCH /api/testing/bugs/:id/reopen
 * Userul respinge un bug propriu "Rezolvat": trece pe "failed" si lasa o nota vizibila
 * dev-ului. Dubla conditie (owner + status) face imposibila atingerea altor buguri.
 */
router.patch("/bugs/:id/reopen", authMiddleware, limiter(30), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Bug inexistent" });
  }
  try {
    const note = clip(req.body?.note, 2000);
    const bug = await TestBug.findOneAndUpdate(
      {
        _id: req.params.id,
        "reporter.userId": req.user.id,
        status: USER_CONFIRM_STATUS,
      },
      {
        status: "failed",
        reopenedByUser: true,
        resolutionNote: `⚠️ REDESCHIS DE USER${note ? ": " + note : " (fara detalii)"}`,
      },
      { new: true }
    ).select("_id");
    if (!bug) return res.status(404).json({ error: "Bug inexistent" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare la redeschidere" });
  }
});

/**
 * DELETE /api/testing/bugs/:id
 * Userul inchide definitiv un bug propriu "Rezolvat" (hard delete). Dubla conditie
 * (owner + status) garanteaza ca sterge DOAR acel bug al lui, nimic altceva.
 */
router.delete("/bugs/:id", authMiddleware, limiter(30), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "Bug inexistent" });
  }
  try {
    const bug = await TestBug.findOneAndDelete({
      _id: req.params.id,
      "reporter.userId": req.user.id,
      status: USER_CONFIRM_STATUS,
    });
    if (!bug) return res.status(404).json({ error: "Bug inexistent" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare la închidere" });
  }
});

/**
 * DELETE /api/testing/bugs/mine/closed
 * "Inchide toate": sterge definitiv toate bugurile proprii "Rezolvat" ale userului.
 * Scope strict la owner + status, deci nu atinge bugurile active sau ale altora.
 */
router.delete("/bugs/mine/closed", authMiddleware, limiter(10), async (req, res) => {
  try {
    const r = await TestBug.deleteMany({
      "reporter.userId": req.user.id,
      status: USER_CONFIRM_STATUS,
    });
    res.json({ success: true, deleted: r.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ error: "Eroare la închiderea tuturor" });
  }
});

module.exports = router;
