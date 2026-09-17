const express = require("express");
const { PrayerProgram } = require("../models");
const { authMiddleware, isAdmin } = require("../middleware");

const router = express.Router();

/**
 * GET /prayer-programs - Returneaza toate programele active
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const programs = await PrayerProgram.find({ isActive: true });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcare" });
  }
});

/**
 * POST /prayer-programs/seed - Creeaza programele inițiale (doar admin)
 */
router.post("/seed", authMiddleware, isAdmin, async (req, res) => {
  try {
    const existing = await PrayerProgram.countDocuments();
    if (existing > 0) {
      return res.json({ message: "Programele exista deja" });
    }

    const programs = [
      {
        programId: "just-pray",
        name: "Just Pray",
        emoji: "🙏",
        description: "Rugaciune cu muzica ambientala",
        durations: [10, 15, 30],
        hasOptions: false,
        playlist: [
          {
            title: "Ambient Prayer",
            url: "https://www.youtube.com/watch?v=vJX0QMfMof4",
          },
        ],
      },
      {
        programId: "worship",
        name: "Worship",
        emoji: "🎵",
        description: "Lauda și închinare",
        durations: [15, 30],
        hasOptions: true,
        playlist: [
          {
            title: "Worship 1",
            url: "https://www.youtube.com/watch?v=Ng0Hw4MXOx0",
          },
          {
            title: "Worship 2",
            url: "https://www.youtube.com/watch?v=879VY-tA1pY",
          },
          {
            title: "Worship 3",
            url: "https://www.youtube.com/watch?v=H5duAw3t3mM",
          },
        ],
      },
    ];

    await PrayerProgram.insertMany(programs);
    res
      .status(201)
      .json({ message: "Programe create", count: programs.length });
  } catch (error) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

/**
 * GET /prayer-programs/worship - Programul worship (DEVOTIONAL) activ + playlist.
 * Folosit de ecranul DEVOTIONAL din app.
 */
router.get("/worship", authMiddleware, async (req, res) => {
  try {
    const program = await PrayerProgram.findOne({
      type: "worship",
      ownerId: null,
      isActive: true,
    });
    if (!program) return res.status(404).json({ error: "Program worship negasit (ruleaza seed-devotional)" });
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcare" });
  }
});

/**
 * POST /prayer-programs/seed-devotional - Creeaza/asigura programul worship built-in (admin).
 * Nu sterge piese existente; doar garanteaza structura corecta. Piesele hosted se adauga apoi.
 */
router.post("/seed-devotional", authMiddleware, isAdmin, async (req, res) => {
  try {
    const program = await PrayerProgram.findOneAndUpdate(
      { programId: "worship" },
      {
        $set: {
          type: "worship",
          ownerId: null,
          name: "Worship",
          emoji: "🎵",
          description: "Închinare cu muzică",
          hasOptions: true,
          minMinutes: 15,
          isActive: true,
        },
        $setOnInsert: { durations: [15, 30, 60], playlist: [] },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: "Program worship pregatit", id: program._id });
  } catch (error) {
    res.status(500).json({ error: "Eroare la seed" });
  }
});

/**
 * POST /prayer-programs/:id/playlist - Adauga melodie în playlist (admin)
 */
router.post("/:id/playlist", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { title, url, duration, category } = req.body;
    if (!url) return res.status(400).json({ error: "URL obligatoriu" });
    const cat = category === "lyrics" ? "lyrics" : "instrumental";

    const program = await PrayerProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ error: "Program negasit" });

    program.playlist.push({ title, url, duration, category: cat });
    await program.save();

    res.json(program);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * PATCH /prayer-programs/:id/playlist/:trackId - Editeaza o piesa (admin)
 */
router.patch("/:id/playlist/:trackId", authMiddleware, isAdmin, async (req, res) => {
  try {
    const program = await PrayerProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ error: "Program negasit" });
    const track = program.playlist.id(req.params.trackId);
    if (!track) return res.status(404).json({ error: "Piesa negasita" });

    const { title, url, duration, category } = req.body;
    if (typeof title === "string") track.title = title;
    if (typeof url === "string" && url) track.url = url;
    if (typeof duration === "number") track.duration = duration;
    if (category === "lyrics" || category === "instrumental") track.category = category;
    await program.save();

    res.json(program);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

/**
 * DELETE /prayer-programs/:id/playlist/:trackId - Sterge o piesa (admin)
 */
router.delete("/:id/playlist/:trackId", authMiddleware, isAdmin, async (req, res) => {
  try {
    const program = await PrayerProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ error: "Program negasit" });
    program.playlist.pull({ _id: req.params.trackId });
    await program.save();
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
