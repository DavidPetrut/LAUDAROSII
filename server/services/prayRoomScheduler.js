const { PrayRoom } = require("../models");

/**
 * Scheduler in proces (setInterval/minut, fara pachete noi): sterge definitiv
 * camerele expirate (la miezul noptii de dupa ultima zi) si reface tragerea la
 * sort pentru ziua curenta, chiar daca nimeni nu a deschis camera.
 */
const startPrayRoomScheduler = () => {
  const tick = async () => {
    try {
      const now = new Date();
      await PrayRoom.deleteMany({ endDate: { $lte: now } });

      const roulettes = await PrayRoom.find({
        roomType: "roulette",
        endDate: { $gt: now },
      });
      for (const room of roulettes) {
        if (room.ensureRouletteForToday()) await room.save();
      }
    } catch (e) {}
  };
  setInterval(tick, 60 * 1000);
  tick();
};

module.exports = { startPrayRoomScheduler };
