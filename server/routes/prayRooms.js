const express = require("express");
const { PrayRoom, User, Notification } = require("../models");
const { authMiddleware } = require("../middleware");

const router = express.Router();

const MOODS = [
  "tulburat",
  "incredere",
  "eliberare",
  "voia_lui",
  "persistent",
  "nelinistit",
  "astept",
];
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const MAX_ROOMS = 5;

const safeStr = (s, max) => String(s || "").trim().slice(0, max);
const safeMood = (m) => (MOODS.includes(m) ? m : null);

const POPULATE_PRAYERS = { path: "prayers.userId", select: "personalData" };

// Populeaza si serializeaza motivele unei camere (pentru raspunsurile de CRUD)
const populatedPrayers = async (roomId) => {
  const room = await PrayRoom.findById(roomId).populate(POPULATE_PRAYERS);
  return room ? room.prayers : [];
};

// Verifica daca userul are acces la camera (creator, membru activ sau invitat)
const hasAccess = (room, userId) => {
  if (room.createdBy.toString() === userId) return true;
  if (room.members.some((m) => m.userId.toString() === userId && m.hasAccepted)) return true;
  if (room.selectedParticipants?.some((p) => p.toString() === userId)) return true;
  return false;
};

// Lista de useri disponibili pentru selectia participantilor
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
      return res.status(400).json({ error: `Poti fi in maxim ${MAX_ROOMS} camere` });
    }

    const { name, icon, roomType, settings, selectedParticipants } = req.body;
    const type = ["common", "targeted", "roulette"].includes(roomType) ? roomType : "common";

    const invited = [
      ...new Set(
        (Array.isArray(selectedParticipants) ? selectedParticipants : [])
          .map((id) => String(id))
          .filter((id) => OBJECT_ID.test(id) && id !== req.user.id)
      ),
    ];

    if (type === "roulette" && invited.length < 2) {
      return res.status(400).json({ error: "Tragerea la sort are nevoie de minim 3 persoane" });
    }

    const durationDays = parseInt(settings?.durationDays, 10) || 1;
    const whoCanPost = type === "targeted" ? "CREATOR_ONLY" : "ALL";
    const maxPrayers = type === "common" ? 2 : type === "roulette" ? 10 : 20;

    const roomCode = await PrayRoom.generateRoomCode();
    const now = new Date();

    const members = [{ userId: req.user.id, hasAccepted: true, joinedAt: now }];
    for (const uid of invited) {
      const ok = await PrayRoom.canJoinOrCreate(uid);
      if (ok) members.push({ userId: uid, hasAccepted: true, joinedAt: now });
    }

    const room = new PrayRoom({
      roomCode,
      name: safeStr(name, 100) || `Pray Room #${roomCode}`,
      icon: ["room_icon1", "room_icon2", "room_icon3"].includes(icon) ? icon : "room_icon1",
      roomType: type,
      createdBy: req.user.id,
      members,
      settings: { durationDays, whoCanPost, maxPrayers },
      selectedParticipants: [req.user.id, ...invited],
      startDate: now,
      endDate: PrayRoom.computeEndDate(durationDays),
      joinDeadline: new Date(now.getTime() + 48 * 60 * 60 * 1000),
    });

    if (type === "roulette") room.ensureRouletteForToday();

    await room.save();

    for (const uid of invited) {
      if (members.some((m) => m.userId.toString() === uid)) {
        await Notification.create({
          userId: uid,
          type: "pray_room_joined",
          category: "more",
          title: "Ai fost adaugat intr-o camera",
          body: `Faci parte din ${room.name}`,
          data: { roomId: room._id, roomCode: room.roomCode },
        });
      }
    }

    const populated = await PrayRoom.findById(room._id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

// Roomurile userului (in care e membru activ)
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const rooms = await PrayRoom.find({
      members: { $elemMatch: { userId: req.user.id, hasAccepted: true } },
    })
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData")
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Eroare la incarcare" });
  }
});

// Detalii room dupa cod (pentru ecranul de join)
router.get("/code/:code", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findOne({ roomCode: req.params.code })
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");

    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Detalii room dupa ID (doar membri/invitati)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (!hasAccess(room, req.user.id)) {
      return res.status(403).json({ error: "Nu ai acces la aceasta camera" });
    }

    if (room.roomType === "roulette" && room.ensureRouletteForToday()) {
      await room.save();
    }

    const populated = await PrayRoom.findById(room._id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData")
      .populate(POPULATE_PRAYERS);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Join cu cod
router.post("/join/:code", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findOne({ roomCode: req.params.code });
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (room.joinDeadline && new Date() > room.joinDeadline) {
      return res.status(400).json({ error: "Perioada de intrare a expirat" });
    }

    // Daca exista o lista de participanti, doar ei pot intra cu cod
    if (room.selectedParticipants?.length > 0) {
      const invited = room.selectedParticipants.some((p) => p.toString() === req.user.id);
      if (!invited) return res.status(403).json({ error: "Nu ai fost invitat in aceasta camera" });
    }

    const existing = room.members.find((m) => m.userId.toString() === req.user.id);
    if (existing?.hasAccepted) {
      return res.status(400).json({ error: "Esti deja in aceasta camera" });
    }

    const canJoin = await PrayRoom.canJoinOrCreate(req.user.id);
    if (!canJoin) return res.status(400).json({ error: `Poti fi in maxim ${MAX_ROOMS} camere` });

    if (existing) {
      existing.hasAccepted = true;
      existing.joinedAt = new Date();
    } else {
      room.members.push({ userId: req.user.id, hasAccepted: true, joinedAt: new Date() });
    }

    if (room.roomType === "roulette") {
      room.rouletteDay = null;
      room.ensureRouletteForToday();
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
    res.status(500).json({ error: "Eroare la intrare" });
  }
});

// Scoate un membru (doar creator)
router.delete("/:id/members/:userId", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Nu ai permisiunea" });
    }
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: "Nu te poti scoate pe tine" });
    }

    const member = room.members.find((m) => m.userId.toString() === req.params.userId);
    if (member) member.hasAccepted = false;
    room.selectedParticipants = room.selectedParticipants.filter(
      (p) => p.toString() !== req.params.userId
    );

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
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const member = room.members.find(
      (m) => m.userId.toString() === req.user.id && m.hasAccepted
    );
    if (!member) return res.status(403).json({ error: "Nu esti in aceasta camera" });

    if (room.settings.whoCanPost === "CREATOR_ONLY" && room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Doar creatorul poate adauga motive" });
    }

    const userCount = room.prayers.filter((p) => p.userId.toString() === req.user.id).length;
    const max = room.settings.maxPrayers || 2;
    if (userCount >= max) {
      return res.status(400).json({ error: `Ai atins limita de ${max} motive` });
    }

    const text = safeStr(req.body.text, 1000);
    if (!text) return res.status(400).json({ error: "Motivul este obligatoriu" });

    room.prayers.push({
      userId: req.user.id,
      text,
      isUrgent: !!req.body.isUrgent,
      mood: safeMood(req.body.mood),
    });
    await room.save();

    res.status(201).json({ prayers: await populatedPrayers(room._id) });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Editeaza propriul motiv
router.patch("/:id/prayers/:prayerId", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const prayer = room.prayers.id(req.params.prayerId);
    if (!prayer) return res.status(404).json({ error: "Motivul nu exista" });
    if (prayer.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Poti edita doar motivele tale" });
    }

    if (req.body.text !== undefined) {
      const text = safeStr(req.body.text, 1000);
      if (!text) return res.status(400).json({ error: "Motivul este obligatoriu" });
      prayer.text = text;
    }
    if (req.body.isUrgent !== undefined) prayer.isUrgent = !!req.body.isUrgent;
    if (req.body.mood !== undefined) prayer.mood = safeMood(req.body.mood);

    await room.save();
    res.json({ prayers: await populatedPrayers(room._id) });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Sterge propriul motiv
router.delete("/:id/prayers/:prayerId", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const prayer = room.prayers.id(req.params.prayerId);
    if (!prayer) return res.status(404).json({ error: "Motivul nu exista" });
    if (prayer.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Poti sterge doar motivele tale" });
    }

    room.prayers.pull(req.params.prayerId);
    await room.save();
    res.json({ prayers: await populatedPrayers(room._id) });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Tragere la sort: cine i-a picat userului azi
router.get("/:id/my-assignment", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room || room.roomType !== "roulette") {
      return res.status(400).json({ error: "Camera nu e de tip tragere la sort" });
    }
    if (!hasAccess(room, req.user.id)) {
      return res.status(403).json({ error: "Nu ai acces la aceasta camera" });
    }

    if (room.ensureRouletteForToday()) await room.save();

    const assignment = room.rouletteAssignments.find(
      (a) => a.userId.toString() === req.user.id
    );
    if (!assignment) {
      const active = room.members.filter((m) => m.hasAccepted).length;
      return res.json({ ready: false, activeMembers: active });
    }

    const assignedTo = await User.findById(assignment.assignedTo, { personalData: 1 });
    res.json({
      ready: true,
      revealed: assignment.revealed || false,
      assignedTo,
    });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Marcheaza reveal-ul zilei
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

// Motivele persoanei care i-a picat userului (motivele ei din camera)
router.get("/:id/assigned-prayers", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id).populate(POPULATE_PRAYERS);
    if (!room || room.roomType !== "roulette") {
      return res.status(400).json({ error: "Camera nu e de tip tragere la sort" });
    }
    if (!hasAccess(room, req.user.id)) {
      return res.status(403).json({ error: "Nu ai acces la aceasta camera" });
    }

    const assignment = room.rouletteAssignments.find(
      (a) => a.userId.toString() === req.user.id
    );
    if (!assignment) return res.json({ prayers: [], hasAssignment: false });

    const prayers = room.prayers.filter(
      (p) => (p.userId?._id || p.userId).toString() === assignment.assignedTo.toString()
    );
    res.json({ prayers, hasAssignment: true, assignedToId: assignment.assignedTo });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Iesi din camera (elibereaza slot). Fara membri activi -> sterge camera.
router.post("/:id/leave", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const member = room.members.find((m) => m.userId.toString() === req.user.id);
    if (!member || !member.hasAccepted) {
      return res.status(400).json({ error: "Nu esti in aceasta camera" });
    }

    member.hasAccepted = false;

    const remaining = room.members.filter((m) => m.hasAccepted);
    if (remaining.length === 0) {
      await PrayRoom.findByIdAndDelete(room._id);
      return res.json({ message: "Ai iesit din camera" });
    }

    if (room.roomType === "roulette") {
      room.rouletteDay = null;
      room.ensureRouletteForToday();
    }

    await room.save();
    res.json({ message: "Ai iesit din camera" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

module.exports = router;
