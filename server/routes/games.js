const express = require("express");
const { Game, User } = require("../models");
const { authMiddleware, isAdmin } = require("../middleware");
const { cleanupGameData } = require("../services/cleanupService");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const games = await Game.find().select("-highScores");
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcarea jocurilor" });
  }
});

router.get("/:gameKey/leaderboard", authMiddleware, async (req, res) => {
  try {
    const game = await Game.findOne({ gameKey: req.params.gameKey }).populate(
      "highScores.userId",
      "personalData.fullName"
    );

    if (!game) {
      return res.status(404).json({ error: "Joc negasit" });
    }

    const leaderboard = game.highScores
      .filter((entry) => entry.userId != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry, index) => ({
        rank: index + 1,
        playerId: entry.userId._id,
        playerName: entry.userId.personalData?.fullName || "Anonim",
        score: entry.score,
        date: entry.date,
      }));

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: "Eroare la încarcarea clasamentului" });
  }
});

router.post("/:gameKey/score", authMiddleware, async (req, res) => {
  try {
    const { score } = req.body;
    const { gameKey } = req.params;

    if (typeof score !== "number" || score < 0) {
      return res.status(400).json({ error: "Scor invalid" });
    }

    const game = await Game.findOne({ gameKey });
    if (!game) {
      return res.status(404).json({ error: "Joc negasit" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Utilizator negasit" });
    }

    const currentStats = user.games.get(gameKey) || {
      highScore: 0,
      gamesPlayed: 0,
    };

    const newHighScore = score > currentStats.highScore;

    user.games.set(gameKey, {
      highScore: Math.max(score, currentStats.highScore),
      gamesPlayed: currentStats.gamesPlayed + 1,
      lastPlayed: new Date(),
    });

    await user.save();

    if (newHighScore) {
      const existingIndex = game.highScores.findIndex(
        (hs) => hs.userId?.toString() === req.user.id
      );

      if (existingIndex !== -1) {
        game.highScores[existingIndex].score = score;
        game.highScores[existingIndex].date = new Date();
      } else {
        game.highScores.push({
          userId: req.user.id,
          score,
          date: new Date(),
        });
      }

      game.highScores.sort((a, b) => b.score - a.score);
      if (game.highScores.length > 50) {
        game.highScores = game.highScores.slice(0, 50);
      }

      await game.save();
    }

    res.json({
      message: "Scor salvat",
      newHighScore,
      personalBest: Math.max(score, currentStats.highScore),
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare la salvarea scorului" });
  }
});

router.delete("/:gameKey", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { gameKey } = req.params;

    const game = await Game.findOne({ gameKey });
    if (!game) {
      return res.status(404).json({ error: "Joc negasit" });
    }

    await cleanupGameData(gameKey);

    await Game.findOneAndDelete({ gameKey });

    res.json({ message: "Joc și scoruri asociate șterse" });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergere" });
  }
});

module.exports = router;
