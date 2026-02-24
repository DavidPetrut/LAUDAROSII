# Arhitectura DB - Laudarosii App

## Modele (server/models/)

| Model         | Fișier           | Descriere                                        |
| ------------- | ---------------- | ------------------------------------------------ |
| User          | User.js          | Utilizatori cu prayers personale, profile, games |
| Announcement  | Announcement.js  | Anunțuri cu reactions, expiry, bgColor           |
| PrayerList    | PrayerList.js    | Liste rugăciuni SIM/Kingdom Youth cu reactions   |
| PrayerProgram | PrayerProgram.js | Programe timer rugăciune cu playlisturi          |
| Course        | Course.js        | Cursuri video                                    |
| Game          | Game.js          | Jocuri cu highscores                             |
| Song          | Song.js          | Biblioteca melodii                               |

## Rute API (server/routes/)

```javascript
// server/index.js - Montare rute
app.use("/api/auth", authRoutes); // Login, register
app.use("/api/users", usersRoutes); // Profile, avatar
app.use("/api/prayers", prayersRoutes); // Liste rugăciuni SIM/Youth
app.use("/api/prayer-programs", prayerProgramsRoutes); // Timer programe
app.use("/api/announcements", announcementsRoutes); // Anunțuri
app.use("/api/courses", coursesRoutes); // Cursuri
app.use("/api/games", gamesRoutes); // Jocuri
app.use("/api/songs", songsRoutes); // Melodii
```

## Scheme Principale

### User (embedded prayers personale)

```
personalData: { fullName, phone, birthDate, profilePicture }
content.prayers[]: { text, answered, isUrgent, mood, date }
role: user | admin | superadmin | developer
teamRoles[]: vocalist, predicator, pian, etc.
games: Map<gameKey, { highScore, gamesPlayed }>
```

### Announcement (reactions + expiry)

```
title, body, authorId → User
bgColor: null | #hex (pentru carduri colorate)
expiresAt: Date (se șterge automat când expiră)
reactions[]: { userId, type: thumbsup|heart|pray|laugh }
reactionCounts: virtual (counts per type + total)
```

### PrayerList (SIM Duminica / Kingdom Youth)

```
programType: sim | tineret
weekStart, weekEnd: Date (expirare automată săptămânală)
shareCode: String unic pentru deep linking
predicatorId → User
prayers[]: { userId, text, isUrgent, mood, reactions[] }
```

### PrayerProgram (Timer rugăciune)

```
programId: just-pray | worship
name, emoji, description
durations[]: [10, 15, 30] minute
playlist[]: { title, url, duration }
```

## Endpoints Principale

### Auth

- `POST /api/auth/login` - Autentificare
- `POST /api/auth/register` - Înregistrare

### Users

- `GET /api/users/me` - Profil curent
- `PUT /api/users/me` - Update profil + profilePicture (base64)

### Prayers (Personal - "Nu slujesc")

- `GET /api/users/me` → content.prayers
- `POST /api/prayers/personal` - Adaugă rugăciune personală
- `PUT /api/prayers/personal/:id/answered` - Marchează împlinită

### Prayer Lists (SIM/Youth)

- `GET /api/prayers/lists/current/:type` - Lista curentă
- `POST /api/prayers/lists` - Creează listă (admin)
- `POST /api/prayers/lists/:code/submit` - Trimite rugăciune
- `POST /api/prayers/lists/:id/prayers/:prayerId/react` - Reacție

### Prayer Programs (Timer)

- `GET /api/prayer-programs` - Lista programe
- `POST /api/prayer-programs/seed` - Seed inițial (superadmin)

### Announcements

- `GET /api/announcements` - Lista (șterge automat expirate)
- `POST /api/announcements` - Creează (admin) + bgColor
- `DELETE /api/announcements/:id` - Șterge (admin)
- `POST /api/announcements/:id/react` - Reacție

## Relații & Cascade

```
User ←── Announcement.authorId (null la delete user)
User ←── PrayerList.prayers[].userId
User ←── Announcement.reactions[].userId
User ←── Game.highScores[].userId (cleanup la delete)
```

## Import Modele

```javascript
const { User, Announcement, PrayerList, PrayerProgram } = require("../models");
```

## Middleware Auth

```javascript
const { authMiddleware, isAdmin } = require("../middleware");

router.get("/", authMiddleware, async (req, res) => {
  // req.user.id disponibil
});

router.post("/", authMiddleware, isAdmin, async (req, res) => {
  // Doar admin/superadmin
});
```

## Virtuals & Helpers

```javascript
// Announcement - reactionCounts virtual
announcement.reactionCounts; // { thumbsup: 2, heart: 5, total: 7 }

// PrayerList - getWeekBounds helper
const { getWeekBounds } = require("./prayersHelpers");
const { weekStart, weekEnd } = getWeekBounds(programType);
// sim: Luni 00:01 → Luni 00:01
// tineret: Sâmbătă 00:01 → Sâmbătă 00:01
```
