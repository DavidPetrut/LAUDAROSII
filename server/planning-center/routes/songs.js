/**
 * Rute Songs (felia muzicală). /api/pc/v1/songs.
 * Song → Arrangement → Key → Files. Integrare MultiTracks (principala) ca sursă de import.
 * ⚠️ MultiTracks fără API public (§11.6) → linkarea + import = seam; structura + fișiere linkate merg.
 * Lyrics&Chords (ChordPro) + transpunere audio DSP = seam (felie ulterioară).
 */
const express = require("express");
const mongoose = require("mongoose");
const {
  PcSong, PcArrangement, PcKey, PcSongFile, PcIntegration, PcIntegrationAccount,
  PcTagGroup, PcTag,
} = require("../models");
const { scoped, stamp } = require("../core/orgScope");
const { requireCan } = require("../core/permissions");

const router = express.Router();
const OID = (v) => (mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null);
const fmtLen = (s) => { const x = Math.max(0, Math.floor(s || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };
const keyLabel = (k) => (k.endKey && k.endKey !== "Same" && k.endKey !== k.startKey ? `${k.startKey} → ${k.endKey}` : k.startKey);

/* ───────── GET / — listă/search cântări (+ filtre Music/Content/Tags) ───────── */
const rxEsc = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
const splitIds = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean).map(OID).filter(Boolean);
router.get("/", requireCan("people.view"), async (req, res) => {
  try {
    const { q, author, copyright, theme, startKey, meter, bpmMin, bpmMax, songTagIds, arrTagIds } = req.query;
    const filter = scoped(req, { archived: false });
    if (q) { const rx = rxEsc(q); filter.$or = [{ title: rx }, { author: rx }]; }
    if (author) filter.author = rxEsc(author);
    if (copyright) filter.copyrightYear = rxEsc(copyright);
    if (theme) filter.themes = rxEsc(theme);
    const songTagList = splitIds(songTagIds);
    if (songTagList.length) filter.tagIds = { $all: songTagList };

    // Filtre la nivel de ARANJAMENT/CHEIE (meter/bpm/startKey/arrTags) → restrânge songId-urile.
    const arrTagList = splitIds(arrTagIds);
    const arrFilter = scoped(req, { archived: false });
    let useArr = false;
    if (meter) { arrFilter.meter = rxEsc(meter); useArr = true; }
    if (bpmMin || bpmMax) { arrFilter.bpm = {}; if (bpmMin) arrFilter.bpm.$gte = Number(bpmMin); if (bpmMax) arrFilter.bpm.$lte = Number(bpmMax); useArr = true; }
    if (arrTagList.length) { arrFilter.tagIds = { $all: arrTagList }; useArr = true; }
    if (useArr) {
      const arrs = await PcArrangement.find(arrFilter).select("songId").lean();
      const ids = [...new Set(arrs.map((a) => String(a.songId)))].map(OID).filter(Boolean);
      filter._id = filter._id ? { $in: ids, ...filter._id } : { $in: ids };
    }
    if (startKey) {
      const keys = await PcKey.find(scoped(req, { startKey })).select("songId").lean();
      const ids = [...new Set(keys.map((k) => String(k.songId)))].map(OID).filter(Boolean);
      filter._id = filter._id && filter._id.$in ? { $in: filter._id.$in.filter((x) => ids.some((y) => String(y) === String(x))) } : { $in: ids };
    }

    const songs = await PcSong.find(filter).collation({ locale: "ro", strength: 1 }).sort({ title: 1 }).limit(200).lean();
    // Chei agregate per cântec (coloana KEYS) — un singur query pe toate cheile rezultatelor.
    const songIds = songs.map((s) => s._id);
    const allKeys = songIds.length ? await PcKey.find(scoped(req, { songId: { $in: songIds } })).select("songId startKey").lean() : [];
    const keysBySong = {};
    allKeys.forEach((k) => { (keysBySong[String(k.songId)] ||= new Set()).add(k.startKey); });
    res.json({
      songs: songs.map((s) => ({
        id: s._id, title: s.title, defaultKey: s.defaultKey, bpm: s.bpm, author: s.author,
        keys: [...(keysBySong[String(s._id)] || [])], tagIds: (s.tagIds || []).map(String),
      })),
    });
  } catch (err) { console.error("[pc] GET /songs:", err.message); res.status(500).json({ error: "Eroare la cântări." }); }
});

/* ───────── POST / — creează cântec ───────── */
router.post("/", requireCan("songs.edit"), async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "Titlul e obligatoriu." });
    const song = await PcSong.create(stamp(req, {
      title, defaultKey: req.body?.defaultKey || "", bpm: Number(req.body?.bpm) || null,
      author: req.body?.author || "", ccli: req.body?.ccli || "", copyrightYear: req.body?.copyrightYear || "",
    }));
    res.status(201).json({ id: song._id, title: song.title });
  } catch (err) { console.error("[pc] POST /songs:", err.message); res.status(500).json({ error: "Eroare la creare." }); }
});

/* ───────── GET /:id — detaliu cântec + aranjamente ───────── */
router.get("/:id", requireCan("people.view"), async (req, res) => {
  try {
    const id = OID(req.params.id);
    const song = await PcSong.findOne(scoped(req, { _id: id })).lean();
    if (!song) return res.status(404).json({ error: "Cântec inexistent." });
    const arrangements = await PcArrangement.find(scoped(req, { songId: id, archived: false })).sort({ createdAt: 1 }).lean();
    res.json({
      id: song._id, title: song.title, ccli: song.ccli, author: song.author, copyrightYear: song.copyrightYear,
      themes: song.themes || [], tagIds: (song.tagIds || []).map(String),
      arrangements: arrangements.map((a) => ({ id: a._id, name: a.name, lengthLabel: fmtLen(a.lengthSec), bpm: a.bpm, meter: a.meter })),
    });
  } catch (err) { console.error("[pc] GET /songs/:id:", err.message); res.status(500).json({ error: "Eroare la cântec." }); }
});

/* ───────── GET /:id/arrangements/:aid — detaliu aranjament (chei + fișiere) ───────── */
router.get("/:id/arrangements/:aid", requireCan("people.view"), async (req, res) => {
  try {
    const aid = OID(req.params.aid);
    const arr = await PcArrangement.findOne(scoped(req, { _id: aid })).lean();
    if (!arr) return res.status(404).json({ error: "Aranjament inexistent." });
    const [keys, files] = await Promise.all([
      PcKey.find(scoped(req, { arrangementId: aid })).sort({ sortOrder: 1, createdAt: 1 }).lean(),
      PcSongFile.find(scoped(req, { arrangementId: aid })).sort({ sortOrder: 1 }).lean(),
    ]);
    const fileDto = (f) => ({ id: f._id, kind: f.kind, name: f.name, url: f.url, source: f.source, pending: f.transposeStatus === "pending" || (!f.url && f.source === "multitracks"), transposeStatus: f.transposeStatus || "" });
    // Master ChordPro (Lyrics & Chords) → charturile per cheie sunt DERIVATE la randare din el.
    const master = files.find((f) => f.scope === "arrangement" && f.kind === "chordChart" && f.source === "chordpro");
    const hasChordChart = !!(master && (master.chordpro || "").trim());
    const derivedChart = (startKey) => ({ id: `cp-${startKey}`, kind: "chordChart", name: `Chord Chart in ${startKey}`, source: "chordpro", derived: true, displayKey: startKey, pending: false });
    res.json({
      id: arr._id, songId: arr.songId, name: arr.name,
      lengthLabel: fmtLen(arr.lengthSec), lengthSec: arr.lengthSec, bpm: arr.bpm, meter: arr.meter,
      sequence: arr.sequence || [], albumArtUrl: arr.albumArtUrl || "", tagIds: (arr.tagIds || []).map(String),
      chordChart: { exists: hasChordChart, originalKey: master?.originalKey || "" },
      arrangementFiles: files.filter((f) => f.scope === "arrangement" && !(f.kind === "chordChart" && f.source === "chordpro")).map(fileDto),
      keys: keys.map((k) => ({
        id: k._id, startKey: k.startKey, endKey: k.endKey, description: k.description,
        label: keyLabel(k), capos: k.capos || [],
        files: [
          ...(hasChordChart ? [derivedChart(k.startKey)] : []),
          ...files.filter((f) => String(f.keyId) === String(k._id)).map(fileDto),
        ],
      })),
    });
  } catch (err) { console.error("[pc] GET /songs/:id/arrangements/:aid:", err.message); res.status(500).json({ error: "Eroare la aranjament." }); }
});

/* ───────── POST /:id/arrangements — adaugă aranjament (+ cheie + import MultiTracks) ───────── */
router.post("/:id/arrangements", requireCan("songs.edit"), async (req, res) => {
  try {
    const songId = OID(req.params.id);
    const b = req.body || {};
    const name = String(b.name || "").trim();
    if (!name) return res.status(400).json({ error: "Numele aranjamentului e obligatoriu." });
    const arr = await PcArrangement.create(stamp(req, {
      songId, name, bpm: Number(b.bpm) || null, meter: b.meter || "", lengthSec: Number(b.lengthSec) || 0,
    }));
    let keyId = null;
    if (b.startKey) {
      const key = await PcKey.create(stamp(req, { arrangementId: arr._id, songId, startKey: b.startKey, endKey: b.endKey || "", capos: b.capos || [] }));
      keyId = key._id;
      if (b.importMultitracks) {
        await PcSongFile.create(stamp(req, { songId, arrangementId: arr._id, keyId, scope: "key", kind: "chordChart", name: `Chord Chart in ${b.startKey}`, source: "multitracks", keyLabel: b.startKey }));
      }
    }
    res.status(201).json({ id: arr._id, keyId });
  } catch (err) { console.error("[pc] POST arrangements:", err.message); res.status(500).json({ error: "Eroare: " + err.message }); }
});

/* ───────── PATCH /:id/arrangements/:aid ───────── */
router.patch("/:id/arrangements/:aid", requireCan("songs.edit"), async (req, res) => {
  try {
    const b = req.body || {}; const set = {};
    ["name", "meter"].forEach((k) => b[k] !== undefined && (set[k] = String(b[k])));
    if (b.bpm !== undefined) set.bpm = Number(b.bpm) || null;
    if (b.lengthSec !== undefined) set.lengthSec = Number(b.lengthSec) || 0;
    if (Array.isArray(b.sequence)) set.sequence = b.sequence;
    const a = await PcArrangement.findOneAndUpdate(scoped(req, { _id: OID(req.params.aid) }), { $set: set }, { new: true }).select("_id").lean();
    if (!a) return res.status(404).json({ error: "Aranjament inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH arrangement:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── DELETE /:id/arrangements/:aid ───────── */
router.delete("/:id/arrangements/:aid", requireCan("songs.edit"), async (req, res) => {
  try {
    const aid = OID(req.params.aid);
    await PcArrangement.updateOne(scoped(req, { _id: aid }), { $set: { deletedAt: new Date() } });
    await PcKey.updateMany(scoped(req, { arrangementId: aid }), { $set: { deletedAt: new Date() } });
    await PcSongFile.updateMany(scoped(req, { arrangementId: aid }), { $set: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE arrangement:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── POST /:id/arrangements/:aid/keys — Add Key ───────── */
router.post("/:id/arrangements/:aid/keys", requireCan("songs.edit"), async (req, res) => {
  try {
    const songId = OID(req.params.id), aid = OID(req.params.aid);
    const b = req.body || {};
    if (!b.startKey) return res.status(400).json({ error: "Alege cheia de start." });
    const count = await PcKey.countDocuments(scoped(req, { arrangementId: aid }));
    const key = await PcKey.create(stamp(req, {
      arrangementId: aid, songId, startKey: b.startKey, endKey: b.endKey || "",
      description: b.description || "", capos: Array.isArray(b.capos) ? b.capos : [], sortOrder: count,
    }));
    if (b.importMultitracks) {
      await PcSongFile.create(stamp(req, { songId, arrangementId: aid, keyId: key._id, scope: "key", kind: "chordChart", name: `Chord Chart in ${b.startKey}`, source: "multitracks", keyLabel: b.startKey }));
    }
    res.status(201).json({ id: key._id });
  } catch (err) { console.error("[pc] POST keys:", err.message); res.status(500).json({ error: "Eroare: " + err.message }); }
});

/* ───────── PATCH /keys/:kid · DELETE /keys/:kid ───────── */
router.patch("/:id/arrangements/:aid/keys/:kid", requireCan("songs.edit"), async (req, res) => {
  try {
    const b = req.body || {}; const set = {};
    ["startKey", "endKey", "description"].forEach((k) => b[k] !== undefined && (set[k] = String(b[k])));
    if (Array.isArray(b.capos)) set.capos = b.capos;
    const k = await PcKey.findOneAndUpdate(scoped(req, { _id: OID(req.params.kid) }), { $set: set }, { new: true }).select("_id").lean();
    if (!k) return res.status(404).json({ error: "Cheie inexistentă." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH key:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.delete("/:id/arrangements/:aid/keys/:kid", requireCan("songs.edit"), async (req, res) => {
  try {
    const kid = OID(req.params.kid);
    await PcKey.updateOne(scoped(req, { _id: kid }), { $set: { deletedAt: new Date() } });
    await PcSongFile.updateMany(scoped(req, { keyId: kid }), { $set: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE key:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── POST /:id/arrangements/:aid/files — adaugă fișier (link). Upload de pe device = seam. ───────── */
router.post("/:id/arrangements/:aid/files", requireCan("songs.edit"), async (req, res) => {
  try {
    const songId = OID(req.params.id), aid = OID(req.params.aid);
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: "Nume fișier necesar." });
    const file = await PcSongFile.create(stamp(req, {
      songId, arrangementId: aid, keyId: OID(b.keyId) || null, scope: b.keyId ? "key" : "arrangement",
      kind: b.kind || "link", name: String(b.name), url: b.url || "", source: b.source || "link",
    }));
    res.status(201).json({ id: file._id });
  } catch (err) { console.error("[pc] POST song file:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ───────── Integrations (MultiTracks principala) ───────── */
router.get("/meta/integrations", requireCan("people.view"), async (req, res) => {
  try {
    const PROVIDERS = [{ key: "multitracks", label: "MultiTracks.com", primary: true }];
    const accounts = await PcIntegrationAccount.find(scoped(req, { userId: req.user.id })).lean();
    const byProv = Object.fromEntries(accounts.map((a) => [a.provider, a]));
    res.json({
      integrations: PROVIDERS.map((p) => ({
        ...p,
        status: byProv[p.key]?.status || "disconnected",
        linkedAt: byProv[p.key]?.linkedAt || null,
      })),
    });
  } catch (err) { console.error("[pc] GET integrations:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* Link MultiTracks (seam — OAuth real necesită acces MultiTracks; marcăm linkat ca placeholder). */
router.post("/meta/integrations/:provider/link", requireCan("songs.edit"), async (req, res) => {
  try {
    const provider = req.params.provider;
    if (provider !== "multitracks") return res.status(400).json({ error: "Doar MultiTracks acum." });
    await PcIntegrationAccount.findOneAndUpdate(
      scoped(req, { provider, userId: req.user.id }),
      { $set: { status: "connected", linkedAt: new Date() }, $setOnInsert: stamp(req, { provider, userId: req.user.id }) },
      { upsert: true, new: true }
    );
    await PcIntegration.findOneAndUpdate(
      scoped(req, { provider }),
      { $set: { enabled: true }, $setOnInsert: stamp(req, { provider }) },
      { upsert: true }
    );
    res.json({ ok: true, note: "Link marcat. Fetch-ul real de fișiere depinde de accesul MultiTracks (§11.6)." });
  } catch (err) { console.error("[pc] link integration:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* ═════════════════════ LYRICS & CHORDS (ChordPro) ═════════════════════ */

/* GET master ChordPro al aranjamentului (editabil). */
router.get("/:id/arrangements/:aid/chordchart", requireCan("people.view"), async (req, res) => {
  try {
    const aid = OID(req.params.aid);
    const f = await PcSongFile.findOne(scoped(req, { arrangementId: aid, scope: "arrangement", kind: "chordChart", source: "chordpro" })).lean();
    res.json(f ? { exists: true, id: f._id, chordpro: f.chordpro || "", originalKey: f.originalKey || "", formatting: f.formatting || {} } : { exists: false, chordpro: "", originalKey: "", formatting: {} });
  } catch (err) { console.error("[pc] GET chordchart:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* PUT (upsert) master ChordPro. „Charturile în fiecare cheie" sunt derivate la randare din acesta. */
router.put("/:id/arrangements/:aid/chordchart", requireCan("songs.edit"), async (req, res) => {
  try {
    const songId = OID(req.params.id), aid = OID(req.params.aid);
    const b = req.body || {};
    const set = {
      chordpro: String(b.chordpro || ""), originalKey: String(b.originalKey || ""),
      formatting: typeof b.formatting === "object" && b.formatting ? b.formatting : {},
      name: "Lyrics & Chords", kind: "chordChart", source: "chordpro", scope: "arrangement",
    };
    const f = await PcSongFile.findOneAndUpdate(
      scoped(req, { arrangementId: aid, scope: "arrangement", kind: "chordChart", source: "chordpro" }),
      { $set: set, $setOnInsert: stamp(req, { songId, arrangementId: aid }) },
      { upsert: true, new: true }
    ).lean();
    res.json({ ok: true, id: f._id });
  } catch (err) { console.error("[pc] PUT chordchart:", err.message); res.status(500).json({ error: "Eroare: " + err.message }); }
});

/* ═════════════════════ TRANSPOSE AUDIO (DSP = seam) ═════════════════════ */

/* POST transpunere audio: pune în coadă un job/cheie-țintă. Fetch/DSP real = seam (§8). */
router.post("/:id/arrangements/:aid/transpose-audio", requireCan("songs.edit"), async (req, res) => {
  try {
    const songId = OID(req.params.id), aid = OID(req.params.aid);
    const b = req.body || {};
    const src = await PcSongFile.findOne(scoped(req, { _id: OID(b.sourceFileId), arrangementId: aid })).lean();
    if (!src) return res.status(400).json({ error: "Fișier sursă inexistent." });
    const fromKey = String(b.fromKey || "");
    const toKeys = Array.isArray(b.toKeys) ? b.toKeys.filter(Boolean) : [];
    if (!fromKey || toKeys.length === 0) return res.status(400).json({ error: "Alege cheia sursă și cel puțin o cheie țintă." });
    const base = String(b.baseName || src.name.replace(/\.[^.]+$/, ""));
    const created = [];
    for (const toKey of toKeys) {
      // ensure key exists pe aranjament (PCO o creează dacă lipsește)
      let key = await PcKey.findOne(scoped(req, { arrangementId: aid, startKey: toKey })).lean();
      if (!key) {
        const count = await PcKey.countDocuments(scoped(req, { arrangementId: aid }));
        key = await PcKey.create(stamp(req, { arrangementId: aid, songId, startKey: toKey, endKey: "", sortOrder: count }));
      }
      const file = await PcSongFile.create(stamp(req, {
        songId, arrangementId: aid, keyId: key._id, scope: "key", kind: "audio",
        name: `${base}-${toKey}`, source: "transpose", transposeStatus: "pending", fromKey, toKey, url: "",
      }));
      created.push({ id: file._id, toKey });
    }
    res.status(201).json({ ok: true, created, note: "În coadă. Transpunerea audio reală (DSP, ~1-5 min) = seam — depinde de motorul de pitch-shift (server/queue)." });
  } catch (err) { console.error("[pc] transpose-audio:", err.message); res.status(500).json({ error: "Eroare: " + err.message }); }
});

/* ═════════════════════ TAGS (Song & Arrangement) ═════════════════════ */

/* GET /meta/tags?domain=song|arrangement — catalog grupuri+tag-uri (picker, filtru, manager). */
router.get("/meta/tags", requireCan("people.view"), async (req, res) => {
  try {
    const domain = ["song", "arrangement"].includes(req.query.domain) ? req.query.domain : "song";
    const [groups, tags] = await Promise.all([
      PcTagGroup.find(scoped(req, { domain })).sort({ sortOrder: 1, name: 1 }).lean(),
      PcTag.find(scoped(req, { domain })).sort({ sortOrder: 1, name: 1 }).lean(),
    ]);
    res.json({
      domain,
      groups: groups.map((g) => ({
        id: g._id, name: g.name, allowMultiple: g.allowMultiple !== false,
        tags: tags.filter((t) => String(t.tagGroupId) === String(g._id)).map((t) => ({ id: t._id, name: t.name, color: t.color || "" })),
      })),
    });
  } catch (err) { console.error("[pc] GET /songs/meta/tags:", err.message); res.status(500).json({ error: "Eroare la tag-uri." }); }
});

/* POST /meta/tag-groups — creează grup (Edit Tags). */
router.post("/meta/tag-groups", requireCan("songs.edit"), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const domain = ["song", "arrangement"].includes(req.body?.domain) ? req.body.domain : "song";
    if (!name) return res.status(400).json({ error: "Numele grupului e obligatoriu." });
    const count = await PcTagGroup.countDocuments(scoped(req, { domain }));
    const g = await PcTagGroup.create(stamp(req, { name, domain, allowMultiple: req.body?.allowMultiple !== false, sortOrder: count }));
    res.status(201).json({ id: g._id });
  } catch (err) { console.error("[pc] POST tag-group:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.patch("/meta/tag-groups/:id", requireCan("songs.edit"), async (req, res) => {
  try {
    const set = {};
    if (req.body?.name !== undefined) set.name = String(req.body.name).trim();
    if (req.body?.allowMultiple !== undefined) set.allowMultiple = !!req.body.allowMultiple;
    const g = await PcTagGroup.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: set }, { new: true }).select("_id").lean();
    if (!g) return res.status(404).json({ error: "Grup inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH tag-group:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.delete("/meta/tag-groups/:id", requireCan("songs.edit"), async (req, res) => {
  try {
    const gid = OID(req.params.id);
    await PcTagGroup.updateOne(scoped(req, { _id: gid }), { $set: { deletedAt: new Date() } });
    await PcTag.updateMany(scoped(req, { tagGroupId: gid }), { $set: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE tag-group:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* POST /meta/tags — creează tag într-un grup. */
router.post("/meta/tags", requireCan("songs.edit"), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const tagGroupId = OID(req.body?.tagGroupId);
    if (!name || !tagGroupId) return res.status(400).json({ error: "Nume + grup necesare." });
    const grp = await PcTagGroup.findOne(scoped(req, { _id: tagGroupId })).select("domain").lean();
    if (!grp) return res.status(400).json({ error: "Grup inexistent." });
    const count = await PcTag.countDocuments(scoped(req, { tagGroupId }));
    const t = await PcTag.create(stamp(req, { name, tagGroupId, domain: grp.domain, color: req.body?.color || "", sortOrder: count }));
    res.status(201).json({ id: t._id });
  } catch (err) { console.error("[pc] POST tag:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.patch("/meta/tags/:id", requireCan("songs.edit"), async (req, res) => {
  try {
    const set = {};
    if (req.body?.name !== undefined) set.name = String(req.body.name).trim();
    if (req.body?.color !== undefined) set.color = String(req.body.color);
    const t = await PcTag.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: set }, { new: true }).select("_id").lean();
    if (!t) return res.status(404).json({ error: "Tag inexistent." });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] PATCH tag:", err.message); res.status(500).json({ error: "Eroare." }); }
});
router.delete("/meta/tags/:id", requireCan("songs.edit"), async (req, res) => {
  try {
    const tid = OID(req.params.id);
    await PcTag.updateOne(scoped(req, { _id: tid }), { $set: { deletedAt: new Date() } });
    // Scoate tag-ul din orice cântec/aranjament care-l are.
    await PcSong.updateMany(scoped(req, { tagIds: tid }), { $pull: { tagIds: tid } });
    await PcArrangement.updateMany(scoped(req, { tagIds: tid }), { $pull: { tagIds: tid } });
    res.json({ ok: true });
  } catch (err) { console.error("[pc] DELETE tag:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* PATCH /:id/tags — set tag-uri la nivel de SONG. */
router.patch("/:id/tags", requireCan("songs.edit"), async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.tagIds) ? req.body.tagIds.map(OID).filter(Boolean) : [];
    const valid = await PcTag.find(scoped(req, { _id: { $in: incoming }, domain: "song" })).select("_id").lean();
    const tagIds = valid.map((t) => t._id);
    const s = await PcSong.findOneAndUpdate(scoped(req, { _id: OID(req.params.id) }), { $set: { tagIds } }, { new: true }).select("tagIds").lean();
    if (!s) return res.status(404).json({ error: "Cântec inexistent." });
    res.json({ ok: true, tagIds: (s.tagIds || []).map(String) });
  } catch (err) { console.error("[pc] PATCH song tags:", err.message); res.status(500).json({ error: "Eroare." }); }
});

/* PATCH /:id/arrangements/:aid/tags — set tag-uri la nivel de ARANJAMENT. */
router.patch("/:id/arrangements/:aid/tags", requireCan("songs.edit"), async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.tagIds) ? req.body.tagIds.map(OID).filter(Boolean) : [];
    const valid = await PcTag.find(scoped(req, { _id: { $in: incoming }, domain: "arrangement" })).select("_id").lean();
    const tagIds = valid.map((t) => t._id);
    const a = await PcArrangement.findOneAndUpdate(scoped(req, { _id: OID(req.params.aid) }), { $set: { tagIds } }, { new: true }).select("tagIds").lean();
    if (!a) return res.status(404).json({ error: "Aranjament inexistent." });
    res.json({ ok: true, tagIds: (a.tagIds || []).map(String) });
  } catch (err) { console.error("[pc] PATCH arrangement tags:", err.message); res.status(500).json({ error: "Eroare." }); }
});

module.exports = router;
