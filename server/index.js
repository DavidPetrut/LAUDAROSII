require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const {
  authRoutes,
  usersRoutes,
  prayersRoutes,
  announcementsRoutes,
  coursesRoutes,
  gamesRoutes,
  songsRoutes,
  prayerProgramsRoutes,
  devotionalPlansRoutes,
  notificationsRoutes,
  statsRoutes,
  missionsRoutes,
  prayRoomsRoutes,
  testingRoutes,
} = require("./routes");
const {
  setupGameSockets,
  setupMissionSockets,
  setupPrayRoomSockets,
} = require("./services");
const { securityLog } = require("./middleware/securityLog");

const app = express();
app.set("trust proxy", 1); // IP real in spatele unui proxy (pentru logurile de securitate)
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Stochez io în app pentru a-l accesa din routes
app.set("io", io);

connectDB();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(securityLog); // inregistreaza tentativele blocate (401/403/429)

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/prayers", prayersRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/songs", songsRoutes);
app.use("/api/prayer-programs", prayerProgramsRoutes);
app.use("/api/devotional-plans", devotionalPlansRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/missions", missionsRoutes);
app.use("/api/pray-rooms", prayRoomsRoutes);
app.use("/api/testing", testingRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Laudarosii API funcționeaza" });
});

// Setup WebSocket handlers
setupGameSockets(io);
setupMissionSockets(io);
setupPrayRoomSockets(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server pornit pe portul ${PORT}`);
});
