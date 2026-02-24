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
 * POST /prayer-programs/:id/playlist - Adauga melodie în playlist (admin)
 */
router.post("/:id/playlist", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { title, url, duration } = req.body;
    if (!url) return res.status(400).json({ error: "URL obligatoriu" });

    const program = await PrayerProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ error: "Program negasit" });

    program.playlist.push({ title, url, duration });
    await program.save();

    res.json(program);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
