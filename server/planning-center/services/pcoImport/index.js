/**
 * Migrare PCO → pc_ (one-time, reutilizabilă). Entry-point.
 *   runImport({ orgId, dryRun, appId, secret })
 * Credențialele implicit din env (PCO_APP_ID/PCO_SECRET). dryRun=true → doar numără (nu scrie).
 *
 * Exemplu (dry-run, validare pull complet, FĂRĂ scriere):
 *   const { runImport } = require("./services/pcoImport");
 *   const report = await runImport({ orgId, dryRun: true });
 */
const { PcoClient } = require("./client");
const { ImportRunner } = require("./runner");

async function runImport({ orgId, dryRun = true, appId = process.env.PCO_APP_ID, secret = process.env.PCO_SECRET, log = console.log } = {}) {
  if (!orgId) throw new Error("runImport: orgId necesar (tenantul țintă la noi).");
  if (!appId || !secret) throw new Error("runImport: PCO_APP_ID + PCO_SECRET lipsesc (env sau argumente).");
  const client = new PcoClient({ appId, secret });
  const runner = new ImportRunner({ client, orgId, dryRun, log });
  log(`[pcoImport] start (dryRun=${dryRun}) → org ${orgId}`);
  const report = await runner.run();
  log("[pcoImport] raport:", JSON.stringify(report, null, 2));
  return report;
}

module.exports = { runImport, PcoClient, ImportRunner };
