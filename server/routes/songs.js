const express = require("express");
const { Song } = require("../models");
const { authMiddleware, isAdmin } = require("../middleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const songs = await Song.find(filter)
      .populate("addedBy", "personalData.fullName")
      .sort({ title: 1 });

    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcarea melodiilor" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id).populate(
      "addedBy",
      "personalData.fullName"
    );

    if (!song) {
      return res.status(404).json({ error: "Melodie negasita" });
    }

    res.json(song);
  } catch (error) {
    res.status(500).json({ error: "Eroare server" });
  }
});

router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { title, artist, lyrics, key, tempo, videoUrl, audioUrl, category } =
      req.body;

    if (!title) {
      return res.status(400).json({ error: "Titlul este obligatoriu" });
    }

    const song = new Song({
      title,
      artist,
      lyrics,
      key,
      tempo,
      videoUrl,
      audioUrl,
      category,
      addedBy: req.user.id,
    });

    await song.save();
    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ error: "Eroare la adaugarea melodiei" });
  }
});

router.put("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(song);
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizare" });
  }
});

router.delete("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    await Song.findByIdAndDelete(req.params.id);
    res.json({ message: "Melodie ștearsa" });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergere" });
  }
});

module.exports = router;
