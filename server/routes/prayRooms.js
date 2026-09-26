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
const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

const safeStr = (s, max) => String(s || "").trim().slice(0, max);
const safeMood = (m) => (MOODS.includes(m) ? m : null);

const POPULATE_PRAYERS = { path: "prayers.userId", select: "personalData" };

const populatedPrayers = async (roomId) => {
  const room = await PrayRoom.findById(roomId).populate(POPULATE_PRAYERS);
  return room ? room.prayers : [];
};

// Acces la camera: creator sau membru acceptat
const hasAccess = (room, userId) => {
  if (room.createdBy.toString() === userId) return true;
  return room.members.some((m) => m.userId.toString() === userId && m.status === "accepted");
};

const inviteExpired = (member) =>
  !member.invitedAt || Date.now() - new Date(member.invitedAt).getTime() > INVITE_TTL_MS;

const notify = async (userId, type, title, body, data) => {
  try {
    await Notification.create({ userId, type, category: "more", title, body, data: data || {} });
  } catch (e) {}
};

const creatorName = async (id) => {
  const u = await User.findById(id).select("personalData.fullName");
  return u?.personalData?.fullName || "Cineva";
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

// Creeaza un room nou. Participantii alesi devin INVITATII (nu membri directi).
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
    const requireApproval = type === "roulette" ? false : !!settings?.requireApproval;

    const roomCode = await PrayRoom.generateRoomCode();
    const now = new Date();

    const members = [{ userId: req.user.id, status: "accepted", joinedAt: now }];
    for (const uid of invited) {
      members.push({ userId: uid, status: "invited", invitedBy: req.user.id, invitedAt: now });
    }

    const room = new PrayRoom({
      roomCode,
      name: safeStr(name, 100) || `Pray Room #${roomCode}`,
      icon: ["room_icon1", "room_icon2", "room_icon3"].includes(icon) ? icon : "room_icon1",
      roomType: type,
      createdBy: req.user.id,
      members,
      settings: { durationDays, whoCanPost, maxPrayers, requireApproval },
      selectedParticipants: [req.user.id, ...invited],
      startDate: now,
      endDate: PrayRoom.computeEndDate(durationDays),
      joinDeadline: new Date(now.getTime() + INVITE_TTL_MS),
    });

    await room.save();

    const byName = await creatorName(req.user.id);
    for (const uid of invited) {
      await notify(uid, "pray_room_invite", "Ai o invitatie", `${byName} te-a invitat in ${room.name}`, {
        roomId: room._id,
        roomCode: room.roomCode,
        screen: "PrayRoomList",
      });
    }

    const populated = await PrayRoom.findById(room._id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: "Eroare la creare" });
  }
});

// Roomurile userului (membru acceptat)
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const rooms = await PrayRoom.find({
      members: { $elemMatch: { userId: req.user.id, status: "accepted" } },
    })
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData")
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Eroare la incarcare" });
  }
});

// Invitatiile mele (status invited, neexpirate 48h)
router.get("/invites", authMiddleware, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - INVITE_TTL_MS);
    const rooms = await PrayRoom.find({
      members: { $elemMatch: { userId: req.user.id, status: "invited", invitedAt: { $gte: cutoff } } },
    })
      .populate("createdBy", "personalData")
      .sort({ createdAt: -1 });

    const list = rooms.map((r) => {
      const mine = r.members.find((m) => m.userId.toString() === req.user.id);
      return {
        _id: r._id,
        name: r.name,
        icon: r.icon,
        roomType: r.roomType,
        createdBy: r.createdBy,
        invitedAt: mine?.invitedAt,
        expiresAt: mine ? new Date(new Date(mine.invitedAt).getTime() + INVITE_TTL_MS) : null,
      };
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Detalii room dupa cod (ecranul de intrare)
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

// Detalii room dupa ID (creator sau membru acceptat)
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

// Accepta o invitatie -> devii membru
router.post("/:id/accept-invite", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const member = room.members.find((m) => m.userId.toString() === req.user.id);
    if (!member || member.status !== "invited") {
      return res.status(400).json({ error: "Nu ai o invitatie activa aici" });
    }
    if (inviteExpired(member)) {
      return res.status(400).json({ error: "Invitatia a expirat" });
    }

    const canJoin = await PrayRoom.canJoinOrCreate(req.user.id);
    if (!canJoin) return res.status(400).json({ error: `Poti fi in maxim ${MAX_ROOMS} camere` });

    member.status = "accepted";
    member.joinedAt = new Date();
    await room.save();

    const populated = await PrayRoom.findById(room._id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Refuza o invitatie
router.post("/:id/refuse-invite", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const member = room.members.find((m) => m.userId.toString() === req.user.id);
    if (!member || member.status !== "invited") {
      return res.status(400).json({ error: "Nu ai o invitatie activa aici" });
    }
    member.status = "refused";
    await room.save();
    res.json({ message: "Invitatie refuzata" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Intrare cu cod (doar comune/grup). Cu aprobare -> cerere; fara -> intra direct.
router.post("/join/:code", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findOne({ roomCode: req.params.code });
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (room.roomType === "roulette") {
      return res.status(403).json({ error: "Tragerea la sort nu permite intrare cu cod. Cere organizatorului sa te adauge." });
    }
    if (room.joinDeadline && new Date() > room.joinDeadline) {
      return res.status(400).json({ error: "Perioada de intrare a expirat" });
    }

    const existing = room.members.find((m) => m.userId.toString() === req.user.id);
    if (existing?.status === "accepted") {
      return res.status(400).json({ error: "Esti deja in aceasta camera" });
    }
    if (existing?.status === "requested") {
      return res.status(400).json({ error: "Cererea ta e deja in asteptare" });
    }

    const requireApproval = !!room.settings?.requireApproval;

    if (requireApproval) {
      if (existing) {
        existing.status = "requested";
        existing.invitedAt = new Date();
      } else {
        room.members.push({ userId: req.user.id, status: "requested", invitedAt: new Date() });
      }
      await room.save();
      const who = await creatorName(req.user.id);
      await notify(room.createdBy, "pray_room_request", "Cerere de intrare", `${who} vrea sa intre in ${room.name}`, {
        roomId: room._id,
        screen: "PrayRoomScreen",
        params: { roomId: room._id },
      });
      return res.json({ pending: true });
    }

    const canJoin = await PrayRoom.canJoinOrCreate(req.user.id);
    if (!canJoin) return res.status(400).json({ error: `Poti fi in maxim ${MAX_ROOMS} camere` });

    if (existing) {
      existing.status = "accepted";
      existing.joinedAt = new Date();
    } else {
      room.members.push({ userId: req.user.id, status: "accepted", joinedAt: new Date() });
    }
    await room.save();

    const who = await creatorName(req.user.id);
    await notify(room.createdBy, "pray_room_request", "Membru nou", `${who} s-a alaturat camerei ${room.name}`, {
      roomId: room._id,
      screen: "PrayRoomScreen",
      params: { roomId: room._id },
    });

    const populated = await PrayRoom.findById(room._id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");
    res.json({ pending: false, room: populated });
  } catch (error) {
    res.status(500).json({ error: "Eroare la intrare" });
  }
});

// Creator: aproba o cerere de intrare
router.post("/:id/requests/:userId/approve", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (room.createdBy.toString() !== req.user.id) return res.status(403).json({ error: "Nu ai permisiunea" });

    const member = room.members.find((m) => m.userId.toString() === req.params.userId && m.status === "requested");
    if (!member) return res.status(404).json({ error: "Cererea nu exista" });

    const canJoin = await PrayRoom.canJoinOrCreate(req.params.userId);
    if (!canJoin) return res.status(400).json({ error: "Persoana e deja in 5 camere" });

    member.status = "accepted";
    member.joinedAt = new Date();
    await room.save();
    res.json({ message: "Aprobat" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Creator: respinge o cerere de intrare
router.post("/:id/requests/:userId/reject", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (room.createdBy.toString() !== req.user.id) return res.status(403).json({ error: "Nu ai permisiunea" });

    const member = room.members.find((m) => m.userId.toString() === req.params.userId && m.status === "requested");
    if (!member) return res.status(404).json({ error: "Cererea nu exista" });

    member.status = "rejected";
    await room.save();
    await notify(req.params.userId, "pray_room_rejected", "Cerere refuzata", `Nu ai fost acceptat in ${room.name}`, {
      roomId: room._id,
      screen: "PrayRoomList",
    });
    res.json({ message: "Respins" });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Creator: porneste tragerea la sort pentru toti confirmatii
router.post("/:id/roulette/start", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (room.roomType !== "roulette") return res.status(400).json({ error: "Camera nu e de tip tragere la sort" });
    if (room.createdBy.toString() !== req.user.id) return res.status(403).json({ error: "Doar organizatorul poate porni" });
    if (room.rouletteStarted) return res.status(400).json({ error: "Tragerea a inceput deja" });

    const result = room.startRoulette();
    if (!result.ok) return res.status(400).json({ error: result.error });

    await room.save();
    for (const uid of result.memberIds) {
      if (uid !== req.user.id) {
        await notify(uid, "pray_room_started", "Tragerea la sort a inceput", `Vezi cine ti-a picat in ${room.name}`, {
          roomId: room._id,
          screen: "PrayRoomScreen",
          params: { roomId: room._id },
        });
      }
    }

    const populated = await PrayRoom.findById(room._id)
      .populate("createdBy", "personalData")
      .populate("members.userId", "personalData");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: "Eroare la pornire" });
  }
});

// Scoate un membru (doar creator)
router.delete("/:id/members/:userId", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });
    if (room.createdBy.toString() !== req.user.id) return res.status(403).json({ error: "Nu ai permisiunea" });
    if (req.params.userId === req.user.id) return res.status(400).json({ error: "Nu te poti scoate pe tine" });

    room.members = room.members.filter((m) => m.userId.toString() !== req.params.userId);
    room.selectedParticipants = room.selectedParticipants.filter((p) => p.toString() !== req.params.userId);

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

    const member = room.members.find((m) => m.userId.toString() === req.user.id && m.status === "accepted");
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

    if (!room.rouletteStarted) {
      return res.json({ ready: false, notStarted: true });
    }

    if (room.ensureRouletteForToday()) await room.save();

    const assignment = room.rouletteAssignments.find((a) => a.userId.toString() === req.user.id);
    if (!assignment) {
      return res.json({ ready: false, notStarted: false });
    }

    const assignedTo = await User.findById(assignment.assignedTo, { personalData: 1 });
    res.json({ ready: true, revealed: assignment.revealed || false, assignedTo });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Marcheaza reveal-ul zilei
router.post("/:id/mark-revealed", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const assignment = room.rouletteAssignments.find((a) => a.userId.toString() === req.user.id);
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
    if (!room.rouletteStarted) return res.json({ prayers: [], hasAssignment: false });

    const assignment = room.rouletteAssignments.find((a) => a.userId.toString() === req.user.id);
    if (!assignment) return res.json({ prayers: [], hasAssignment: false });

    const prayers = room.prayers.filter(
      (p) => (p.userId?._id || p.userId).toString() === assignment.assignedTo.toString()
    );
    res.json({ prayers, hasAssignment: true, assignedToId: assignment.assignedTo });
  } catch (error) {
    res.status(500).json({ error: "Eroare" });
  }
});

// Iesi din camera. Fara membri acceptati -> sterge camera.
router.post("/:id/leave", authMiddleware, async (req, res) => {
  try {
    const room = await PrayRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Camera nu exista" });

    const member = room.members.find((m) => m.userId.toString() === req.user.id && m.status === "accepted");
    if (!member) return res.status(400).json({ error: "Nu esti in aceasta camera" });

    room.members = room.members.filter((m) => m.userId.toString() !== req.user.id);

    const remaining = room.members.filter((m) => m.status === "accepted");
    if (remaining.length === 0) {
      await PrayRoom.findByIdAndDelete(room._id);
      return res.json({ message: "Ai iesit din camera" });
    }

    if (room.roomType === "roulette" && room.rouletteStarted) {
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
