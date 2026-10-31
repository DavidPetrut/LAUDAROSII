/**
 * Router rădăcină Planning Center. Montat O SINGURĂ DATĂ în server/index.js:
 *   app.use("/api/pc", require("./planning-center"));
 * Toate rutele cer auth (user existent) + org-scope (req.pcOrgId). API versionat /v1 (§11.1).
 */
const express = require("express");
const { authMiddleware } = require("../../middleware");
const { orgScope } = require("../core/orgScope");

const router = express.Router();

// Callback OAuth Google = PUBLIC (Google redirectează fără Bearer); identificare prin `state` (JWT). ÎNAINTE de auth.
router.use("/v1/integrations/google/callback", require("./integrations").callback);

router.use(authMiddleware); // req.user = { id, role }
router.use(orgScope); // req.pcOrgId (seam multi-tenant §1.13)

router.use("/v1/people/import", require("./peopleImport")); // ÎNAINTE de /v1/people (altfel „import" = :id)
router.use("/v1/people", require("./people"));
router.use("/v1/plans", require("./plans"));
router.use("/v1/order-templates", require("./orderTemplates"));
router.use("/v1/light-arrangements", require("./lightArrangements"));
router.use("/v1/service-types", require("./services"));
router.use("/v1/teams", require("./teams"));
router.use("/v1/songs", require("./songs"));
router.use("/v1/media", require("./media"));
router.use("/v1/uploads", require("./uploads"));
router.use("/v1/schedule", require("./schedule"));
router.use("/v1/alerts", require("./alerts"));
router.use("/v1/integrations", require("./integrations").router);
router.use("/v1/matrix", require("./matrix"));
router.use("/v1/whatsapp", require("./whatsapp"));
router.use("/v1/reports", require("./reports"));
router.use("/v1/ai", require("./ai"));
router.use("/v1/admin", require("./bootstrap"));

module.exports = router;
