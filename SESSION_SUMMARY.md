# SESSION SUMMARY - Laudarosii App

## Descriere Proiect

Aplicație React Native (Expo) pentru echipa de închinare a unei biserici. Include:

- Sistem de rugăciuni (personal + programe SIM Duminica/Kingdom Youth)
- Anunțuri cu reactions și expiry
- Cursuri video
- Jocuri biblice
- Timer rugăciune cu programe audio

## Structura Proiect

```
LAUDAROSII/
├── app/                          # React Native (Expo)
│   ├── screens/
│   │   ├── prayers/              # Rugăciuni (toate tipurile)
│   │   │   ├── PrayersScreen.js  # Tab-uri principale cu imagini bg
│   │   │   ├── ProgramPrayersTab.js # SIM/Kingdom Youth
│   │   │   ├── PersonalPrayersTab.js # "Nu slujesc"
│   │   │   ├── PrayerCard.js     # Card cu expand/collapse
│   │   │   ├── UserPrayersList.js # Lista pentru user selectat
│   │   │   ├── analyze/          # AI Analysis (ChatGPT)
│   │   │   └── timer/            # Timer rugăciune
│   │   ├── announcements/        # Anunțuri cu reactions
│   │   ├── admin/                # Panel admin
│   │   ├── profile/              # Profil + avatar
│   │   ├── courses/              # Cursuri
│   │   └── games/                # Jocuri
│   ├── global/
│   │   ├── components/           # ScreenHeader, BackArrowIcon, UserAvatar
│   │   ├── context/              # AuthContext
│   │   └── functions/            # api, showError, getTimeAgo
│   └── public/
│       ├── images/               # Imagini pentru prayers bg
│       ├── fonts/                # PilotCommand, Seagoe, Raleway
│       └── styles/global/        # colors, spacing, typography
├── server/                       # Node.js + Express + MongoDB
│   ├── models/                   # Mongoose schemas
│   ├── routes/                   # API endpoints
│   └── middleware/               # authMiddleware, isAdmin
└── sass/                         # DOAR REFERINȚĂ - din tema WP
```

## Funcționalități Implementate

### 1. Prayers Screen

- **3 tab-uri** cu imagini de fundal: SIM Duminica, Kingdom Youth, Nu slujesc
- **Reacții** (long press mobil / double click PC): 👍❤️🙏😂
- **Popup reacții** animat, poziționat lângă iconița apăsată
- **"Citește mai mult"** pentru texte > 18 cuvinte cu animație
- **Limită 500 caractere** pentru rugăciuni
- **Avatar user** în footer card și header când selectat
- **Badge URGENT** pe carduri
- **Expirare automată**: SIM (Luni→Luni), Youth (Sâmbătă→Sâmbătă)

### 2. Announcements

- **Reacții** identice cu prayers (long press / double click)
- **Expiry time**: Admin setează zile, afișează "X zile/ore rămase"
- **Ștergere automată** când expiră
- **Background colors**: 6 opțiuni (plain + 5 culori)
- **Avatar + nume autor** în header card
- **Delete button** pentru admin

### 3. Header Global

- **ScreenHeader** component cu:
  - Background verde (`colors.primary`)
  - Font `PilotCommand` uppercase
  - BackArrowIcon cu prop `light` pentru contrast
  - Suport pentru subtitle și rightComponent

### 4. Timer Rugăciune

- **Programe**: Just Pray (10/15/30 min), Worship (15/30 min)
- **Full screen overlay** cu timer mare
- **Control dinamic** minute/secunde cu +/- buttons
- **expo-av** pentru audio (necesită MP3 direct, nu YouTube)

### 5. Analyze Tab

- **Carousel** rugăciuni împlinite cu scroll manual
- **Butoane**: "Analiza rugăciuni" (ChatGPT), "Start praying" (timer)
- Pregătit pentru integrare AI

## Componente Globale (app/global/components/)

```javascript
// BackArrowIcon - săgeată back cu 2 moduri
<BackArrowIcon size={32} light /> // alb pe fundal colorat
<BackArrowIcon size={32} />       // verde pe fundal deschis

// ScreenHeader - header unificat
<ScreenHeader title="Titlu" subtitle="Subtitlu" onBack={fn} />

// UserAvatar - avatar cu fallback emoji
<UserAvatar profilePicture={base64} size={36} />

// RibbonBadge - badge tip panglică
<RibbonBadge label="URGENT" />
```

## API Endpoints Principale

```
Auth:
POST /api/auth/login
POST /api/auth/register

Users:
GET  /api/users/me
PUT  /api/users/me (+ profilePicture base64)

Prayers Personal:
POST /api/prayers/personal
PUT  /api/prayers/personal/:id/answered

Prayer Lists (SIM/Youth):
GET  /api/prayers/lists/current/:type
POST /api/prayers/lists (admin)
POST /api/prayers/lists/:code/submit
POST /api/prayers/lists/:id/prayers/:prayerId/react

Announcements:
GET    /api/announcements
POST   /api/announcements (admin + bgColor)
DELETE /api/announcements/:id (admin)
POST   /api/announcements/:id/react
```

## Stiluri și Convenții

### SCSS (doar referință în `/sass/`)

- Variabile globale din tema WordPress
- **NU modifica** - doar pentru insight

### React Native Styles

- Fișiere `styles.js` per screen
- Export multiple: `programStyles`, `userDetailStyles`, `modalStyles`
- Folosește `colors`, `spacing`, `typography` din global

### Reguli Cod

- **FĂRĂ console.log** în producție
- **FĂRĂ inline styles** în JS - doar StyleSheet
- **Maxim 150 linii** per fișier
- **Comentarii** doar când necesare, pe linie separată
- **Reutilizare** obsesivă - DRY
- **Semantic HTML/Components** - nu div în div în div

## De Făcut (Pending)

1. **YouTube audio** - nu merge direct, necesită:

   - `react-native-youtube-iframe` SAU
   - MP3 links directe în DB

2. **AI Analysis** - endpoint ChatGPT neimplementat încă
   - Fișier `creierAnalizator.js` pregătit cu prompt

## Comenzi

```bash
# Frontend (Expo)
cd app && npx expo start --web --clear

# Backend
cd server && npm run dev
```

## Notă pentru Continuare

Codul respectă regulile stricte ale utilizatorului:

- Semantic tags, nu divuri inutile
- SCSS nesting, nu CSS simplu
- Fără hackuri sau cod experimental
- Responsive (rem, %, vw/vh)
- Comentarii în română, on its own line
- Error handling minimal dar robust
