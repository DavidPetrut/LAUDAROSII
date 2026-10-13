/**
 * Upload fișiere → Cloudinary (refolosește contul vostru). /api/pc/v1/uploads.
 * App trimite multipart (câmp „file"); serverul urcă pe Cloudinary și întoarce URL-ul securizat.
 * Deps: `cloudinary` + `multer` (server). Chei din env: CLOUDINARY_URL SAU
 *   CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET.
 * Degradează grațios: dacă lipsesc deps/cheile → 503 (nu crapă boot-ul modulului).
 */
const express = require("express");
const { can } = require("../core/permissions");

const router = express.Router();

// Lazy + tolerant: dacă nu-s instalate, modulul tot pornește (feature = 503).
let multer, cloudinary, upload, configured = false;
try {
  multer = require("multer");
  cloudinary = require("cloudinary").v2;
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } }); // 60MB
  if (process.env.CLOUDINARY_URL) { configured = true; } // SDK auto-config
  else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
  }
} catch (e) { /* deps neinstalate → feature indisponibil */ }

async function canUpload(req, res, next) {
  try {
    if ((await can(req, "songs.edit")) || (await can(req, "media.edit"))) return next();
    return res.status(403).json({ error: "Nu ai permisiunea să încarci fișiere." });
  } catch (e) { return res.status(500).json({ error: "Eroare la permisiuni." }); }
}

router.post("/", canUpload, (req, res) => {
  if (!upload || !cloudinary) return res.status(503).json({ error: "Upload indisponibil pe server: rulează `npm install cloudinary multer` în server/." });
  if (!configured) return res.status(503).json({ error: "Cloudinary neconfigurat: adaugă CLOUDINARY_URL (sau CLOUD_NAME/API_KEY/API_SECRET) în server/.env." });
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: "Fișier invalid: " + err.message });
    if (!req.file) return res.status(400).json({ error: "Niciun fișier primit (câmpul file)." });
    const folder = `pc/${req.pcOrgId || "org"}`;
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "auto", folder, use_filename: true, unique_filename: true },
      (error, result) => {
        if (error) { console.error("[pc] cloudinary:", error.message); return res.status(500).json({ error: "Eroare la Cloudinary." }); }
        res.status(201).json({
          url: result.secure_url,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
          name: req.file.originalname,
        });
      }
    );
    stream.end(req.file.buffer);
  });
});

/** Status util (frontend poate verifica dacă upload-ul e disponibil). */
router.get("/status", (req, res) => res.json({ available: !!(upload && cloudinary && configured) }));

module.exports = router;
