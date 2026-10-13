/**
 * Endpoint PUBLIC (fără auth) pt. Accept/Decline din emailul de programare.
 * Montat separat în server/index.js: app.use("/api/pc-respond", require("./planning-center/public"))
 * Autentificarea = tokenul unic din link (responseToken). NU e sub /api/pc (care cere login).
 */
const express = require("express");
const { PcAssignment } = require("./models");
const { notifyAssignmentDeclined } = require("./services/notifyService");

const router = express.Router();

function page(title, msg, color) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title></head>
  <body style="margin:0;background:#0E0E0E;color:#fff;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
    <div style="text-align:center;padding:32px;max-width:420px">
      <div style="font-size:48px;color:${color || "#86C13F"};margin-bottom:12px">●</div>
      <h1 style="font-size:24px;margin:0 0 10px">${title}</h1>
      <p style="font-size:16px;color:#9A9A9A;line-height:1.5">${msg}</p>
    </div>
  </body></html>`;
}

router.get("/:token", async (req, res) => {
  const token = String(req.params.token || "");
  const action = req.query.a;
  if (!["accept", "decline"].includes(action)) {
    return res.status(400).send(page("Link invalid", "Acțiune necunoscută.", "#F5A623"));
  }
  try {
    const a = await PcAssignment.findOne({ responseToken: token, deletedAt: null });
    if (!a) return res.status(404).send(page("Link expirat", "Programarea nu mai există sau a fost anulată.", "#F5A623"));
    const wasConfirmed = a.status === "confirmed";
    if (action === "accept") { a.status = "confirmed"; a.acceptedAt = new Date(); }
    else { if (wasConfirmed) a.declinedAfterConfirm = true; a.status = "declined"; a.declinedAt = new Date(); }
    await a.save();
    if (action === "accept") return res.send(page("Confirmat", "Ai confirmat programarea. Mulțumim!", "#86C13F"));
    // Anunță liderul/adminii (email real), fără a bloca răspunsul.
    notifyAssignmentDeclined(a.toObject()).catch(() => {});
    return res.send(page("Refuzat", "Ai refuzat programarea. Liderul a fost anunțat.", "#EF4444"));
  } catch (e) {
    console.error("[pc] respond public:", e.message);
    return res.status(500).send(page("Eroare", "A apărut o eroare. Încearcă din nou.", "#EF4444"));
  }
});

module.exports = router;
