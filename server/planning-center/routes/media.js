/**
 * Rute Media (biblioteca media, separată de Songs). /api/pc/v1/media.
 * kind: file|youtube|vimeo|video|image|link. Video linkat prin EMBED (nu download) → fără copyright,
 * randare curată: YouTube = youtube-nocookie /embed, Vimeo = player.vimeo.
 * ⚠️ Upload real de pe device = seam (storage); acum URL/link + imagini base64 mici.
 */
const express = require("express");
const mongoose = require("mongoose");
const { PcMediaItem } = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const rxEsc = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

/** Detectează kind + ID din URL și întoarce {kind, embedUrl, thumbnailUrl}. */
function analyzeUrl(url, kindHint) {
  const u = String(url || "").trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "youtube", videoId: yt[1], embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`, thumbnailUrl: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` };
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  if (vm) return { kind: "vimeo", videoId: vm[1], embedUrl: `https://player.vimeo.com/video/${vm[1]}`, thumbnailUrl: "" };
  if (kindHint === "image" || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(u) || u.startsWith("data:image")) return { kind: "image", embedUrl: u, thumbnailUrl: u };
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return { kind: "video", embedUrl: u, thumbnailUrl: "" };
  if (/\.(mp3|m4a|aac|wav)(\?|$)/i.test(u)) return { kind: "file", embedUrl: u, thumbnailUrl: "" };
  return { kind: kindHint && ["file", "link"].includes(kindHint) ? kindHint : "link", embedUrl: u, thumbnailUrl: "" };
}

const dto = (m) => {
  const a = analyzeUrl(m.url, m.kind);
  return { id: m._id, title: m.title, kind: m.kind, url: m.url, embedUrl: a.embedUrl, thumbnailUrl: m.thumbnailUrl || a.thumbnailUrl, description: m.description, author: m.author, tagIds: (m.tagIds || []).map(String) };
};

/* GET / — listă + search + filtru kind. */
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    const { q, kind } = req.query;
    const filter = scoped(req, { archived: false });
    if (q) { const rx = rxEsc(q); filter.$or = [{ title: rx }, { author: rx }]; }
    if (kind) filter.kind = kind;
    const items = await PcMediaItem.find(filter).collation({ locale: "ro", strength: 1 }).sort({ title: 1 }).limit(300).lean();
    res.json({ items: items.map(dto) });
  } catch (err) { console.error("[pc] GET /media:", err.message); res.status(500).json({ error: "Eroare la media." }); }
});

/* POST / — creează (link/video/imagine). */
router.post("/", requireCan("media.edit"), async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const url = String(req.body?.url || "").trim();
    if (!title) return res.status(400).json({ error: "Titlul e obligatoriu." });
    const a = analyzeUrl(url, req.body?.kind);
    const item = await PcMediaItem.create(stamp(req, {
      title, url, kind: a.kind, thumbnailUrl: req.body?.thumbnailUrl || a.thumbnailUrl || "",
      description: req.body?.description || "", author: req.body?.author || "",
    }));
    res.status(201).json(dto(item.toObject()));
  } catch (err) { console.error("[pc] POST /media:", err.message); res.status(500).json({ error: "Eroare la creare." }); }
});

/* GET /:id */
router.get("/:id", requireCan("people.view"), async (req, res) => {
  try {
    const m = await PcMediaItem.findOne(scoped(req, { _id: OID(req.params.id) })).lean();
    if (!m) return res.status(404).json({ error: "Media inexistentă." });
    res.json(dto(m));
  } catch (err) { console.error("[pc] GET /media/:id:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* PATCH /:id */
router.patch("/:id", requireCan("media.edit"), async (req, res) => {
  try {
    const b = req.body || {}; const set = {};
    if (b.title !== undefined) set.title = String(b.title).trim();
    if (b.description !== undefined) set.description = String(b.description);
    if (b.author !== undefined) set.author = String(b.author);
    if (b.url !== undefined) { const a = analyzeUrl(b.url, b.kind); set.url = String(b.url); set.kind = a.kind; if (!b.thumbnailUrl) set.thumbnailUrl = a.thumbnailUrl || ""; }
    if (b.thumbnailUrl !== undefined) set.thumbnailUrl = String(b.thumbnailUrl);
    const m = await PcMediaItem.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: set }, { new: true }).lean();
    if (!m) return res.status(404).json({ error: "Media inexistentă." });
    res.json(dto(m));
  } catch (err) { console.error("[pc] PATCH /media/:id:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* DELETE /:id */
router.delete("/:id", requireCan("media.edit"), async (req, res) => {
  try {
    const m = await PcMediaItem.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: { deletedAt: new Date() } }).select("_id").lean();
    if (!m) return res.status(404).json({ error: "Media inexistentă." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE /media/:id:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
