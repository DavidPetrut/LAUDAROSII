# 🎵 Laudarosii Vertical

Aplicație mobila pentru echipa de lauda "Laudarosii Vertical" - un hub central pentru comunicare, rugaciune, cursuri și distracție în echipa.

## 📱 Funcționalitați Complete

### ✅ Autentificare & Profil

- Login/Register cu email și parola
- Roluri multiple în echipa (vocalist, chitara, tobe, etc.)
- Editare profil cu verset și psalm preferat
- Panel admin pentru gestionare utilizatori

### ✅ Rugaciuni

- Adaugare motive de rugaciune
- Filtrare: Toate / Ale mele / Împlinite / Active
- Marcare rugaciuni ca împlinite
- Vizualizare rugaciuni ale întregii echipe

### ✅ Anunțuri

- Comunicari importante de la lideri
- Marcare ca citit/necitit
- Detalii complete cu atașamente
- Creare anunțuri (doar admini)

### ✅ Cursuri

- Training-uri video integrate
- Categorii: muzica, worship, tehnic
- Marcare progres completat
- Link extern pentru vizionare

### ✅ Jocuri

- **Quiz Biblic** - întrebari din Scripturi
- **Memoreaza Versetul** - puzzle cu cuvinte
- Clasament global (Leaderboard)
- Multiplayer cu lobby și camere
- Socket.IO pentru joc în timp real

### ✅ Notificari Push

- Notificari pentru anunțuri noi
- Suport Expo Notifications
- Salvare device tokens

## 🏗️ Structura Proiectului

```
LAUDAROSII/
├── app/                         # React Native (Expo)
│   ├── global/
│   │   ├── components/          # AnimatedCard, ErrorBoundary, LoadingSpinner
│   │   ├── context/             # AuthContext
│   │   ├── functions/           # API, toast, formatters, cache
│   │   ├── services/            # Socket.IO, notifications
│   │   └── utils/               # Validators
│   ├── public/styles/global/    # Culori, typography, spacing
│   └── screens/
│       ├── auth/                # Login, Register
│       ├── home/                # Dashboard cu scoruri
│       ├── prayers/             # Rugaciuni cu filtre
│       ├── announcements/       # Anunțuri + Detail
│       ├── courses/             # Cursuri + Detail
│       ├── games/               # Quiz, Memory, Lobby, Leaderboard
│       ├── profile/             # Profil + Edit
│       └── admin/               # Panel admin
│
└── server/                      # Backend Node.js
    ├── config/                  # DB connection
    ├── middleware/              # Auth, roles, rate limiting
    ├── models/                  # User, Announcement, Course, Game, Song
    ├── routes/                  # Toate API endpoints
    └── services/                # Socket.IO games, seeds
```

## 🚀 Instalare și Rulare

### Prerequisites

- Node.js v18+
- npm sau yarn
- Expo CLI (`npm install -g expo-cli`)
- MongoDB Atlas account

### 1. Instalare Server

```bash
cd server
npm install
```

### 2. Configurare .env

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/laudarosii
JWT_SECRET=your_secret_key
PORT=3000
```

### 3. Pornire Server

```bash
npm run dev
```

### 4. Seed Jocuri

```bash
cd server/services
node seedGames.js
```

### 5. Instalare App

```bash
cd app
npm install
```

### 6. Configurare API URL

Editeaza `app/global/config.js`:

```javascript
API_URL: 'http://192.168.1.XXX:3000/api',
SOCKET_URL: 'http://192.168.1.XXX:3000',
```

### 7. Pornire App

```bash
npx expo start --web --clear
```

### 8. New Updates App DEV MODE (server running on pc, same wifi)
cd LAUDAROSII\app
eas update --channel development --message "Descrierea update-ului"



## 📋 API Endpoints

| Endpoint                      | Metoda         | Descriere               | Acces      |
| ----------------------------- | -------------- | ----------------------- | ---------- |
| `/api/auth/register`          | POST           | Înregistrare            | Public     |
| `/api/auth/login`             | POST           | Autentificare           | Public     |
| `/api/users/me`               | GET/PUT        | Profil propriu          | Auth       |
| `/api/users`                  | GET            | Lista utilizatori       | Admin      |
| `/api/users/device-token`     | POST           | Salvare push token      | Auth       |
| `/api/prayers`                | GET/POST       | Rugaciuni               | Auth       |
| `/api/prayers/:id`            | PUT/DELETE     | Update/Delete rugaciune | Auth       |
| `/api/announcements`          | GET/POST       | Anunțuri                | Auth/Admin |
| `/api/announcements/:id`      | GET/PUT/DELETE | CRUD anunț              | Auth/Admin |
| `/api/announcements/:id/read` | PUT            | Marcare citit           | Auth       |
| `/api/courses`                | GET/POST       | Cursuri                 | Auth/Admin |
| `/api/courses/:id`            | GET            | Detalii curs            | Auth       |
| `/api/courses/progress/:id`   | PUT            | Marcare completat       | Auth       |
| `/api/games`                  | GET            | Lista jocuri            | Auth       |
| `/api/games/:key/leaderboard` | GET            | Clasament joc           | Auth       |
| `/api/games/:key/score`       | POST           | Submit scor             | Auth       |
| `/api/songs`                  | GET/POST       | Melodii                 | Auth/Admin |

## 👥 Roluri

- **user** - Membru echipa (acces de baza)
- **admin** - Lider (creare anunțuri, cursuri, melodii)
- **superadmin** - Control total (gestionare utilizatori)
- **developer** - Echivalent admin

## 🛠️ Tehnologii

**Frontend:**

- React Native + Expo
- React Navigation (Stack + Tab)
- AsyncStorage (caching)
- Socket.IO Client
- Expo Notifications

**Backend:**

- Node.js + Express
- MongoDB + Mongoose
- JWT + bcrypt
- Socket.IO (multiplayer)
- Rate Limiting

## 📝 Arhitectura

### Separare completa client-server

- API RESTful pentru date
- WebSocket pentru real-time (jocuri)
- Token-based authentication

### Modularitate

- Componente reutilizabile
- Stiluri globale consistente
- Error boundaries

### Scalabilitate

- Indexuri MongoDB optimizate
- Paginare pentru liste
- Caching local

---

**Dezvoltat cu ❤️ pentru echipa Laudarosii Vertical**
