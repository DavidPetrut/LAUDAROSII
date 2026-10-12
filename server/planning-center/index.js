/**
 * Planning Center — entry al modulului (backend).
 * TOT modulul trăiește în acest folder (`server/planning-center/`): core/ models/ routes/ services/.
 * Singura atingere în afara folderului = 1 linie în server/index.js:
 *   app.use("/api/pc", require("./planning-center"));
 */
module.exports = require("./routes");
