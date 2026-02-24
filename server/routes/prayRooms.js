const express = require("express");
const { PrayRoom, User, Notification } = require("../models");
const { authMiddleware } = require("../middleware");

const router = express.Router();

// Lista de useri disponibili pentru selectia roulette
router.get("/users/available", authMiddleware, async (req, res) => {
  try {
    const users = await User.find(
      { "status.isActive": true, _id: { $ne: req.user.id } },
      { personalData: 1 }
    ).limit(50);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Creeaza un room nou
router.post("/", authMiddleware, async (req, res) => {
  try {
    const canCreate = await PrayRoom.canJoinOrCreate(req.user.id);
    if (!canCreate) {
      return res.status(400).json({ error: "Ai atins limita de 3 camere active" });
    }

    const { name, icon, roomType, settings, selectedParticipants } = req.body;
    const roomCode = await PrayRoom.generateRoomCode();
    const defaultName = name || `Pray Room #${roomCode}`;

    const now = new Date();
    const joinDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const startDate = now;
    const endDate = new Date(now.getTime() + settings.durationDays * 24 * 60 * 60 * 1000);

    const room = new PrayRoom({
      roomCode,
      name: defaultName,
      icon: icon || "room_icon1",
      roomType: roomType || "common",
      createdBy: req.user.id,
      members: [{ userId: req.user.id, hasAccepted: true, joinedAt: now }],
      settings: {
        durationDays: settings.durationDays,
        prayerDays: settings.prayerDays,
        minMinutes: settings.minMinutes || 0,
        whoCanPost: settings.whoCanPost || "ALL",
        maxPrayers: settings.maxPrayers || 2,
      },
      selectedParticipants: roomType === "roulette"
        ? [req.user.id, ...(selectedParticipants || [])]
        : [],
      state: "ACTIVE",
      startDate,
      endDate,
      joinDeadline,
    });

    // Roulette: genereaza derangement imediat la creare
    if (roomType === "roulette" && selectedParticipants?.length >= 1) {
      const allIds = [req.user.id, ...selectedParticipants];
      const assignments = PrayRoom.generateDerangement(allIds);
      if (assignments) room.rouletteAssignments = assignments;
    }

    await room.save();
    const populated = await PrayRoom.findById(room._id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

// Roomurile userului: active + finished nefinalizate
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const rooms = await PrayRoom.find({
      members: {
        $elemMatch: {
          userId: req.user.id,
          hasAccepted: true,
          hasFinalized: false,
        },
      },
    })
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData")
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Eroare la incarcare" });
  }
});

// Returneaza detalii room dupa cod
router.get("/code/:code", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findOne({ roomCode: req.params.code })
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");

    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Returneaza detalii room dupa ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData")
      .populate("prayers.userId", "personalData");

    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    const dailyScore = await PrayRoom.calculateDailyScore(room._id, new Date());

    res.json({ ...room.toObject(), dailyScore });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Join cu cod
router.post("/join/:code", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findOne({ roomCode: req.params.code });
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (room.state === "FINISHED") return res.status(400).json({ error: "Camera s-a terminat" });
    if (new Date() > room.joinDeadline) return res.status(400).json({ error: "Perioada de join a expirat" });

    // Roulette: doar participantii selectati pot da join
    if (room.roomType === "roulette" && room.selectedParticipants?.length > 0) {
      const isAuthorized = room.selectedParticipants.some(
        (sp) => sp.toString() === req.user.id
      );
      if (!isAuthorized) {
        return res.status(403).json({ error: "Nu ai fost invitat in aceasta camera" });
      }
    }

    const canJoin = await PrayRoom.canJoinOrCreate(req.user.id);
    if (!canJoin) return res.status(400).json({ error: "Ai atins limita de 3 camere active" });

    const existingMember = room.members.find(
      (m) => m.userId.toString() === req.user.id
    );

    if (existingMember) {
      if (existingMember.hasAccepted) {
        return res.status(400).json({ error: "Esti deja in aceasta camera" });
      }
      existingMember.hasAccepted = true;
      existingMember.joinedAt = new Date();
    } else {
      room.members.push({ userId: req.user.id, hasAccepted: true, joinedAt: new Date() });
    }

    await room.save();

    await Notification.create({
      userId: room.createdBy,
      type: "pray_room_joined",
      category: "more",
      title: "Membru nou in camera",
      body: `Cineva s-a alaturat camerei ${room.name}`,
      data: { roomId: room._id, roomCode: room.roomCode },
    });

    const populated = await PrayRoom.findById(room._id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: "Eroare la join" });
  }
});

// Modifica setarile (doar room-creator)
router.put("/:id/settings", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Nu ai permisiunea" });
    }

    const { minMinutes, whoCanPost } = req.body;
    if (minMinutes !== undefined) room.settings.minMinutes = minMinutes;
    if (whoCanPost !== undefined) room.settings.whoCanPost = whoCanPost;

    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Scoate un membru (doar room-creator)
router.delete("/:id/members/:userId", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Nu ai permisiunea" });
    }

    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: "Nu te poti scoate pe tine" });
    }

    const member = room.members.find(
      (m) => m.userId.toString() === req.params.userId
    );
    if (member) {
      member.hasAccepted = false;
    }

    await room.save();
    res.json({ message: "Membru scos" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Adauga motiv de rugaciune
router.post("/:id/prayers", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    const member = room.members.find(
      (m) => m.userId.toString() === req.user.id && m.hasAccepted
    );
    if (!member) {
      return res.status(403).json({ error: "Nu esti in aceasta camera" });
    }

    if (room.settings.whoCanPost === "CREATOR_ONLY" && 
        room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Doar creatorul poate posta" });
    }

    const userPrayerCount = room.prayers.filter(
      (p) => p.userId.toString() === req.user.id
    ).length;
    const maxPrayers = room.settings.maxPrayers || 2;
    if (userPrayerCount >= maxPrayers) {
      return res.status(400).json({ error: `Ai atins limita de ${maxPrayers} motive` });
    }

    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: "Motivul este obligatoriu" });
    }

    room.prayers.push({ userId: req.user.id, text: text.trim() });
    await room.save();

    res.status(201).json({ message: "Motiv adaugat" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Marcheaza "M-am rugat" pentru un motiv specific
router.post("/:id/complete-prayer/:prayerId", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    const member = room.members.find(
      (m) => m.userId.toString() === req.user.id && m.hasAccepted
    );
    if (!member) {
      return res.status(403).json({ error: "Nu esti in aceasta camera" });
    }

    const prayer = room.prayers.id(req.params.prayerId);
    if (!prayer) {
      return res.status(404).json({ error: "Motivul nu exista" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayIdx = room.dailyProgress.findIndex((dp) => {
      const dpDate = new Date(dp.date);
      dpDate.setHours(0, 0, 0, 0);
      return dpDate.getTime() === today.getTime();
    });

    if (todayIdx === -1) {
      room.dailyProgress.push({ date: today, completions: [] });
      todayIdx = room.dailyProgress.length - 1;
    }

    const alreadyCompleted = room.dailyProgress[todayIdx].completions.find(
      (c) => c.userId.toString() === req.user.id && c.prayerId?.toString() === req.params.prayerId
    );
    if (alreadyCompleted) {
      return res.status(400).json({ error: "Te-ai rugat deja pentru acest motiv" });
    }

    room.dailyProgress[todayIdx].completions.push({
      userId: req.user.id,
      prayerId: prayer._id,
      completedAt: new Date(),
    });

    await room.save();
    const dailyScore = await PrayRoom.calculateDailyScore(room._id, today);

    const completedPrayerIds = room.dailyProgress[todayIdx].completions
      .filter((c) => c.userId.toString() === req.user.id)
      .map((c) => c.prayerId?.toString())
      .filter(Boolean);

    res.json({ dailyScore, completedPrayerIds });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Returneaza progresul curent
router.get("/:id/progress", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    const dailyScore = await PrayRoom.calculateDailyScore(room._id, new Date());
    const activeMembers = room.members.filter((m) => m.hasAccepted).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayProgress = room.dailyProgress.find((dp) => {
      const dpDate = new Date(dp.date);
      dpDate.setHours(0, 0, 0, 0);
      return dpDate.getTime() === today.getTime();
    });

    const completedPrayerIds = todayProgress
      ? todayProgress.completions
          .filter((c) => c.userId.toString() === req.user.id)
          .map((c) => c.prayerId?.toString())
          .filter(Boolean)
      : [];

    res.json({
      dailyScore,
      activeMembers,
      completedPrayerIds,
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Finalizeaza anticipat (doar room-creator)
router.post("/:id/finalize", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Nu ai permisiunea" });
    }

    if (room.state === "FINISHED") {
      return res.status(400).json({ error: "Camera e deja finalizata" });
    }

    const finalScore = await PrayRoom.calculateFinalScore(room._id);
    const verdict = PrayRoom.getVerdict(finalScore);

    room.state = "FINISHED";
    room.finalScore = finalScore;
    room.finishedAt = new Date();
    await room.save();

    const activeMembers = room.members.filter((m) => m.hasAccepted);
    for (const member of activeMembers) {
      await Notification.create({
        userId: member.userId,
        type: "pray_room_finished",
        category: "more",
        title: "Camera s-a terminat",
        body: `${room.name}: ${verdict}`,
        data: { roomId: room._id, finalScore, verdict },
      });
    }

    res.json({ finalScore, verdict, room });
  } catch (error) {
    res.status(500).json({ error: "Eroare la finalizare" });
  }
});

// Returneaza atribuirea roulette pre-aranjata pentru user-ul curent
router.get("/:id/my-assignment", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id)
      .populate("rouletteAssignments.assignedTo", "personalData")
      .populate("members.userId", "personalData");

    if (!room || room.roomType !== "roulette") {
      return res.status(400).json({ error: "Camera nu e de tip roulette" });
    }

    const assignment = room.rouletteAssignments.find(
      (a) => a.userId.toString() === req.user.id
    );

    if (!assignment) {
      const total = room.selectedParticipants?.length || 0;
      const joined = room.members.filter((m) => m.hasAccepted).length;
      return res.json({ ready: false, total, joined });
    }

    res.json({
      ready: true,
      revealed: assignment.revealed || false,
      assignedTo: assignment.assignedTo,
      members: room.members.filter((m) => m.hasAccepted),
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Marcheaza ca user-ul a vazut animatia de reveal
router.post("/:id/mark-revealed", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const assignment = room.rouletteAssignments.find(
      (a) => a.userId.toString() === req.user.id
    );
    if (assignment) {
      assignment.revealed = true;
      await room.save();
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Returneaza TOATE motivele PERSONALE neimplinite ale persoanei atribuite
router.get("/:id/assigned-prayers", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room || room.roomType !== "roulette") {
      return res.status(400).json({ error: "Camera nu e de tip roulette" });
    }

    const assignment = room.rouletteAssignments.find(
      (a) => a.userId.toString() === req.user.id
    );
    if (!assignment) {
      return res.json({ prayers: [], total: 0, hasAssignment: false });
    }

    const owner = await User.findById(assignment.assignedTo, {
      "content.prayers": 1,
      personalData: 1,
    });
    if (!owner) {
      return res.json({ prayers: [], total: 0, hasAssignment: true });
    }

    // Reset zilnic la midnight daca azi e zi de rugaciune (zilele sunt 0-6, 0=Duminica)
    const todayDayNum = new Date().getDay();
    const prayerDays = room.settings?.prayerDays || [];
    const lastReset = assignment.lastCompletedReset ? new Date(assignment.lastCompletedReset) : null;
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);

    if (prayerDays.includes(todayDayNum) && (!lastReset || lastReset < todayMidnight)) {
      assignment.completedPrayerIds = [];
      assignment.lastCompletedReset = new Date();
      await room.save();
    }

    const completed = assignment.completedPrayerIds || [];
    const allActive = (owner.content?.prayers || []).filter((p) => !p.answered);

    const prayers = allActive.map((p) => ({
      _id: p._id,
      text: p.text,
      date: p.date,
      answered: false,
      mood: p.mood,
      isUrgent: p.isUrgent || false,
      prayedBy: p.prayedBy || [],
      prayedCount: p.prayedBy?.length || 0,
      completedInRoom: completed.includes(p._id.toString()),
      userId: { _id: owner._id, personalData: owner.personalData },
    }));

    res.json({
      prayers,
      total: allActive.length,
      completedCount: completed.filter((id) => allActive.some((p) => p._id.toString() === id)).length,
      hasAssignment: true,
      assignedToId: owner._id,
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Marcheaza un motiv ca completat DOAR in contextul roulette (independent de BISERICA)
router.post("/:id/roulette-pray/:prayerId", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const assignment = room.rouletteAssignments.find(
      (a) => a.userId.toString() === req.user.id
    );
    if (!assignment) return res.status(400).json({ error: "Nu ai atribuire" });

    const prayerId = req.params.prayerId;
    if (!assignment.completedPrayerIds.includes(prayerId)) {
      assignment.completedPrayerIds.push(prayerId);
      await room.save();
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Iesi din room (pastreaza datele, elibereaza slot)
router.post("/:id/leave", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    const member = room.members.find(
      (m) => m.userId.toString() === req.user.id
    );
    if (!member || !member.hasAccepted) {
      return res.status(400).json({ error: "Nu esti in aceasta camera" });
    }

    member.hasAccepted = false;
    await room.save();
    res.json({ message: "Ai iesit din camera" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// User-ul confirma ca a vazut scorul final (elibereaza slot)
router.post("/:id/acknowledge-finish", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Camera nu exista" });
    }

    const member = room.members.find(
      (m) => m.userId.toString() === req.user.id
    );
    if (!member) {
      return res.status(400).json({ error: "Nu esti in aceasta camera" });
    }

    member.hasFinalized = true;
    await room.save();

    // Daca toti membrii au finalizat, sterge room-ul din DB
    const remaining = room.members.filter(
      (m) => m.hasAccepted && !m.hasFinalized
    );
    if (remaining.length === 0) {
      await PrayRoom.findByIdAndDelete(room._id);
    }

    res.json({ message: "Camera finalizata" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
