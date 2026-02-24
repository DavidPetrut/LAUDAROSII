const express = require("express");
const router = express.Router();
const { Mission, User } = require("../models");
const { authMiddleware } = require("../middleware/auth");
const { isMissionAdmin } = require("../config/missionAdmins");

/**
 * Middleware pentru a verifica dacă user-ul e admin de misiuni
 */
const missionAdminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !isMissionAdmin(user.email)) {
      return res
        .status(403)
        .json({ error: "Nu ai permisiuni pentru această acțiune" });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Eroare la verificarea permisiunilor" });
  }
};

/**
 * GET /api/missions
 * Returnează toate misiunile active pentru toți userii
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const missions = await Mission.find({
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .populate(
        "createdBy",
        "email personalData.fullName personalData.profilePicture"
      )
      .sort({ createdAt: -1 });

    // Formatează pentru client cu statusul userului curent
    // și filtrează misiunile claimed (nu le mai arătăm)
    const formattedMissions = missions
      .map((m) => {
        const obj = m.toClientFormat(req.user.id);
        obj.createdBy = {
          id: m.createdBy._id,
          name:
            m.createdBy.personalData?.fullName ||
            m.createdBy.email.split("@")[0],
          avatar: m.createdBy.personalData?.profilePicture || null,
        };
        return obj;
      })
      .filter((m) => m.userStatus?.status !== "claimed");

    res.json(formattedMissions);
  } catch (error) {
    console.error("Error fetching missions:", error);
    res.status(500).json({ error: "Eroare la încărcarea misiunilor" });
  }
});

/**
 * POST /api/missions
 * Crează o misiune nouă (doar admini)
 */
router.post("/", authMiddleware, missionAdminMiddleware, async (req, res) => {
  try {
    const { title, description, reward, expiresAt } = req.body;

    // Validări
    if (!title || title.length > 18) {
      return res
        .status(400)
        .json({ error: "Titlul trebuie să aibă maxim 18 caractere" });
    }
    if (!description || description.length > 180) {
      return res
        .status(400)
        .json({ error: "Descrierea trebuie să aibă maxim 180 caractere" });
    }
    if (![80, 100, 150].includes(reward)) {
      return res
        .status(400)
        .json({ error: "Reward-ul trebuie să fie 80, 100 sau 150" });
    }
    if (!expiresAt || new Date(expiresAt) <= new Date()) {
      return res
        .status(400)
        .json({ error: "Data expirării trebuie să fie în viitor" });
    }

    const mission = new Mission({
      title,
      description,
      reward,
      expiresAt: new Date(expiresAt),
      createdBy: req.user.id,
    });

    await mission.save();
    await mission.populate(
      "createdBy",
      "email personalData.fullName personalData.profilePicture"
    );

    const formatted = mission.toClientFormat();
    formatted.createdBy = {
      id: mission.createdBy._id,
      name:
        mission.createdBy.personalData?.fullName ||
        mission.createdBy.email.split("@")[0],
      avatar: mission.createdBy.personalData?.profilePicture || null,
    };

    // Emit socket event pentru noua misiune
    const io = req.app.get("io");
    if (io) {
      io.emit("mission:new", formatted);
    }

    res.status(201).json(formatted);
  } catch (error) {
    console.error("Error creating mission:", error);
    res.status(500).json({ error: "Eroare la crearea misiunii" });
  }
});

/**
 * DELETE /api/missions/:id
 * Închide o misiune (doar admin creator)
 */
router.delete(
  "/:id",
  authMiddleware,
  missionAdminMiddleware,
  async (req, res) => {
    try {
      const mission = await Mission.findById(req.params.id);

      if (!mission) {
        return res.status(404).json({ error: "Misiunea nu a fost găsită" });
      }
      if (mission.createdBy.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Nu poți închide o misiune creată de altcineva" });
      }

      mission.status = "closed";
      await mission.save();

      // Emit socket event
      const io = req.app.get("io");
      if (io) {
        io.emit("mission:closed", { missionId: mission._id });
      }

      res.json({ success: true, message: "Misiunea a fost închisă" });
    } catch (error) {
      console.error("Error closing mission:", error);
      res.status(500).json({ error: "Eroare la închiderea misiunii" });
    }
  }
);

/**
 * GET /api/missions/admin/my
 * Returnează misiunile create de admin-ul curent
 */
router.get(
  "/admin/my",
  authMiddleware,
  missionAdminMiddleware,
  async (req, res) => {
    try {
      const missions = await Mission.find({ createdBy: req.user.id }).sort({
        createdAt: -1,
      });

      const formatted = missions.map((m) => ({
        id: m._id,
        title: m.title,
        description: m.description,
        reward: m.reward,
        expiresAt: m.expiresAt,
        createdAt: m.createdAt,
        status: m.status,
        totalPlayers: m.userStatuses.length,
        requestsCount: m.userStatuses.filter((us) => us.status === "requested")
          .length,
        approvedCount: m.userStatuses.filter(
          (us) => us.status === "approved" || us.status === "claimed"
        ).length,
      }));

      res.json(formatted);
    } catch (error) {
      console.error("Error fetching admin missions:", error);
      res.status(500).json({ error: "Eroare la încărcarea misiunilor" });
    }
  }
);

/**
 * GET /api/missions/:id/players
 * Lista tuturor jucătorilor pentru o misiune (doar admin creator)
 */
router.get(
  "/:id/players",
  authMiddleware,
  missionAdminMiddleware,
  async (req, res) => {
    try {
      const mission = await Mission.findById(req.params.id);

      if (!mission) {
        return res.status(404).json({ error: "Misiunea nu a fost găsită" });
      }
      if (mission.createdBy.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Nu ai acces la această misiune" });
      }

      // Obține toți userii
      const users = await User.find({ "status.isActive": true }).select(
        "email personalData.fullName personalData.profilePicture"
      );

      const players = users.map((user) => {
        const userStatus = mission.getUserStatus(user._id);
        return {
          id: user._id,
          name: user.personalData?.fullName || user.email.split("@")[0],
          email: user.email,
          avatar: user.personalData?.profilePicture || null,
          status: userStatus.status,
          approvedAt: userStatus.approvedAt,
        };
      });

      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Eroare la încărcarea jucătorilor" });
    }
  }
);

/**
 * GET /api/missions/:id/requests
 * Lista cererilor de aprobare pentru o misiune (doar admin creator)
 */
router.get(
  "/:id/requests",
  authMiddleware,
  missionAdminMiddleware,
  async (req, res) => {
    try {
      const mission = await Mission.findById(req.params.id);

      if (!mission) {
        return res.status(404).json({ error: "Misiunea nu a fost găsită" });
      }
      if (mission.createdBy.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Nu ai acces la această misiune" });
      }

      // Filtrează doar userii cu status "requested"
      const requestedUserIds = mission.userStatuses
        .filter((us) => us.status === "requested")
        .map((us) => us.userId);

      const users = await User.find({ _id: { $in: requestedUserIds } }).select(
        "email personalData.fullName personalData.profilePicture"
      );

      const requests = users.map((user) => {
        const userStatus = mission.userStatuses.find(
          (us) => us.userId.toString() === user._id.toString()
        );
        return {
          id: user._id,
          name: user.personalData?.fullName || user.email.split("@")[0],
          email: user.email,
          avatar: user.personalData?.profilePicture || null,
          requestedAt: userStatus?.requestedAt,
        };
      });

      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ error: "Eroare la încărcarea cererilor" });
    }
  }
);

/**
 * POST /api/missions/:id/request
 * User cere răsplata pentru o misiune
 */
router.post("/:id/request", authMiddleware, async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id);

    if (!mission) {
      return res.status(404).json({ error: "Misiunea nu a fost găsită" });
    }
    if (mission.status !== "active" || mission.isExpired()) {
      return res.status(400).json({ error: "Misiunea nu mai este activă" });
    }

    const currentStatus = mission.getUserStatus(req.user.id);
    if (currentStatus.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Ai trimis deja o cerere pentru această misiune" });
    }

    mission.updateUserStatus(req.user.id, "requested");
    await mission.save();

    res.json({ success: true, status: "requested" });
  } catch (error) {
    console.error("Error requesting mission:", error);
    res.status(500).json({ error: "Eroare la trimiterea cererii" });
  }
});

/**
 * POST /api/missions/:id/approve/:userId
 * Admin aprobă un user pentru misiune
 */
router.post(
  "/:id/approve/:userId",
  authMiddleware,
  missionAdminMiddleware,
  async (req, res) => {
    try {
      const mission = await Mission.findById(req.params.id);

      if (!mission) {
        return res.status(404).json({ error: "Misiunea nu a fost găsită" });
      }
      if (mission.createdBy.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Nu ai acces la această misiune" });
      }

      mission.updateUserStatus(req.params.userId, "approved");
      await mission.save();

      // Emit socket event către user-ul specific
      const io = req.app.get("io");
      if (io) {
        io.emit("mission:approved", {
          missionId: mission._id,
          userId: req.params.userId,
        });
      }

      res.json({ success: true, message: "Utilizatorul a fost aprobat" });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ error: "Eroare la aprobarea utilizatorului" });
    }
  }
);

/**
 * POST /api/missions/:id/reject/:userId
 * Admin refuză un user pentru misiune
 */
router.post(
  "/:id/reject/:userId",
  authMiddleware,
  missionAdminMiddleware,
  async (req, res) => {
    try {
      const mission = await Mission.findById(req.params.id);

      if (!mission) {
        return res.status(404).json({ error: "Misiunea nu a fost găsită" });
      }
      if (mission.createdBy.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Nu ai acces la această misiune" });
      }

      mission.updateUserStatus(req.params.userId, "rejected");
      await mission.save();

      // Emit socket event către user-ul specific
      const io = req.app.get("io");
      if (io) {
        io.emit("mission:rejected", {
          missionId: mission._id,
          userId: req.params.userId,
        });
      }

      res.json({ success: true, message: "Utilizatorul a fost refuzat" });
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ error: "Eroare la refuzarea utilizatorului" });
    }
  }
);

/**
 * POST /api/missions/:id/claim
 * User revendică premiul pentru o misiune aprobată
 */
router.post("/:id/claim", authMiddleware, async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id);

    if (!mission) {
      return res.status(404).json({ error: "Misiunea nu a fost găsită" });
    }

    const currentStatus = mission.getUserStatus(req.user.id);
    if (currentStatus.status !== "approved") {
      return res.status(400).json({
        error:
          "Nu poți revendica premiul. Statusul tău: " + currentStatus.status,
      });
    }

    mission.updateUserStatus(req.user.id, "claimed");
    await mission.save();

    // Adaugă efectiv alabastru-ul în contul utilizatorului
    const user = await User.findById(req.user.id);
    if (user) {
      // Verifică dacă user are pray-realm game data
      if (!user.games) user.games = {};
      if (!user.games.prayRealm) {
        user.games.prayRealm = {
          alabastru: { current: 0, total: 0 },
          progress: { currentLevel: 1, unlockedLevels: [1], paidFees: [] },
          inventory: { tools: {}, items: {} },
        };
      }
      if (!user.games.prayRealm.alabastru) {
        user.games.prayRealm.alabastru = { current: 0, total: 0 };
      }

      user.games.prayRealm.alabastru.current += mission.reward;
      user.games.prayRealm.alabastru.total += mission.reward;
      await user.save();

      console.log(
        `User ${user.email} claimed mission reward: +${mission.reward} alabastru`
      );
    }

    // Returnează reward-ul pentru a fi adăugat în frontend
    res.json({
      success: true,
      reward: mission.reward,
      status: "claimed",
    });
  } catch (error) {
    console.error("Error claiming mission:", error);
    res.status(500).json({ error: "Eroare la revendicarea premiului" });
  }
});

/**
 * GET /api/missions/check-admin
 * Verifică dacă user-ul curent e admin de misiuni
 */
router.get("/check-admin", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const isAdmin = user && isMissionAdmin(user.email);
    res.json({ isMissionAdmin: isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Eroare la verificare" });
  }
});

module.exports = router;
