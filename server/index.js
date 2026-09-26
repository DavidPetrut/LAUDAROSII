require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const {
  authRoutes,
  usersRoutes,
  prayersRoutes,
  prayerBoardsRoutes,
  churchPrayersRoutes,
  announcementsRoutes,
  coursesRoutes,
  gamesRoutes,
  songsRoutes,
  prayerProgramsRoutes,
  devotionalPlansRoutes,
  devotionalsRoutes,
  broadcastsRoutes,
  notificationsRoutes,
  statsRoutes,
  missionsRoutes,
  prayRoomsRoutes,
  testingRoutes,
  accessRoutes,
  devotionalTemplatesRoutes,
} = require("./routes");
const {
  setupGameSockets,
  setupMissionSockets,
  setupPrayRoomSockets,
  startBroadcastScheduler,
  startPrayRoomScheduler,
} = require("./services");
const { securityLog } = require("./middleware/securityLog");
const { socketAuth } = require("./middleware/socketAuth");
const { limiter } = require("./middleware/rateLimit");

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

// Security headers (CSP/HSTS/X-Frame-Options/no-sniff). CORP dezactivat ca sa nu
// blocheze resurse cross-origin cat timp CORS ramane deschis (decizie de infra).
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
// Anti NoSQL operator-injection: curata $ / . din body, query, params.
app.use(mongoSanitize());
// Rate-limit GLOBAL pe toate rutele (nu doar auth) - plafon foarte generos
// (600/min per IP+ruta) ca sa NU afecteze testerii (chiar pe acelasi WiFi/NAT),
// dar sa taie potopul real de cereri (DoS/enumerare). Tunabil.
app.use(limiter(600));
app.use(securityLog); // inregistreaza tentativele blocate (401/403/429)

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/prayers", prayersRoutes);
app.use("/api/prayer-boards", prayerBoardsRoutes);
app.use("/api/church-prayers", churchPrayersRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/songs", songsRoutes);
app.use("/api/prayer-programs", prayerProgramsRoutes);
app.use("/api/devotional-plans", devotionalPlansRoutes);
app.use("/api/devotionals", devotionalsRoutes);
app.use("/api/admin/broadcasts", broadcastsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/missions", missionsRoutes);
app.use("/api/pray-rooms", prayRoomsRoutes);
app.use("/api/testing", testingRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/devotional-templates", devotionalTemplatesRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Laudarosii API funcționeaza" });
});

// Auth pe WebSocket: root namespace (game + mission) si namespace-ul /pray-rooms.
// Refuza conexiunile fara token valid si leaga identitatea de socket.
io.use(socketAuth);
io.of("/pray-rooms").use(socketAuth);

// Setup WebSocket handlers
setupGameSockets(io);
setupMissionSockets(io);
setupPrayRoomSockets(io);
startBroadcastScheduler();
startPrayRoomScheduler();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server pornit pe portul ${PORT}`);
});
