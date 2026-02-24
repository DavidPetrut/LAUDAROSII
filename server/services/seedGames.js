require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const { Game } = require("../models");

const games = [
  {
    gameKey: "quizBiblic",
    name: "Quiz Biblic",
    description:
      "Testeaza-ți cunoștințele biblice cu întrebari din Vechiul și Noul Testament",
    multiplayer: true,
    highScores: [],
    rules: {
      questionsPerGame: 8,
      timePerQuestion: 15,
      pointsPerCorrect: 100,
    },
  },
  {
    gameKey: "memoreazaVerset",
    name: "Memoreaza Versetul",
    description:
      "Aranjeaza cuvintele în ordine corecta pentru a reconstrui versetul biblic",
    multiplayer: false,
    highScores: [],
    rules: {
      questionsPerGame: 4,
      timePerQuestion: 30,
      pointsPerCorrect: 100,
    },
  },
  {
    gameKey: "ghicesteCantecu",
    name: "Ghicește Cântecul",
    description:
      "Asculta primele secunde și ghicește care este cântarea de lauda",
    multiplayer: true,
    highScores: [],
    rules: {
      questionsPerGame: 5,
      timePerQuestion: 20,
      pointsPerCorrect: 100,
    },
  },
];

const seedGames = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Conectat la MongoDB");

    for (const game of games) {
      const existing = await Game.findOne({ gameKey: game.gameKey });

      if (existing) {
        await Game.findOneAndUpdate(
          { gameKey: game.gameKey },
          {
            name: game.name,
            description: game.description,
            multiplayer: game.multiplayer,
            rules: game.rules,
          }
        );
        console.log(`✅ Joc actualizat: ${game.name}`);
      } else {
        await Game.create(game);
        console.log(`✅ Joc creat: ${game.name}`);
      }
    }

    console.log("\n🎮 Seed jocuri complet!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Eroare seed:", error);
    process.exit(1);
  }
};

seedGames();
