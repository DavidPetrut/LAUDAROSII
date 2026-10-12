/**
 * Router rădăcină Planning Center. Montat O SINGURĂ DATĂ în server/index.js:
 *   app.use("/api/pc", require("./planning-center"));
 * Toate rutele cer auth (user existent) + org-scope (req.pcOrgId). API versionat /v1 (§11.1).
 */
const express = require("express");
const { authMiddleware } = require("../../middleware");
const { orgScope } = require("../core/orgScope");

const router = express.Router();

router.use(authMiddleware); // req.user = { id, role }
router.use(orgScope); // req.pcOrgId (seam multi-tenant §1.13)

router.use("/v1/people", require("./people"));
router.use("/v1/admin", require("./bootstrap"));

module.exports = router;
