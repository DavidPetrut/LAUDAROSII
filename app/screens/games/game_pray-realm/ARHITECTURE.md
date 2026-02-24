🎮 PRAY REALM - Arhitectură Completă
📁 Structura Fișierelor
game_pray-realm/│├── 📄 index.js                     # Export principal├── 📄 PrayRealmNavigator.js        # Navigatorul principal (entry point)├── 📄 PrayRealmGame.js             # Componenta de joc static originală│├── 📂 api/                         # API-uri pentru comunicare│   ├── playerApi.js                # CRUD pentru jucători (AsyncStorage acum, backend later)│   ├── challengesApi.js            # Managementul challenge-urilor│   ├── shopApi.js                  # Shop/magazin│   └── index.js│├── 📂 data/                        # Date statice ale jocului│   ├── levelCosts.js               # Prețurile pentru fiecare nivel (1-26)│   ├── challenges.js               # Definițiile challenge-urilor Stage 1│   ├── shopItems.js                # Itemele din shop (hammer, etc.)│   ├── achievements.js             # Achievements și trofee│   └── index.js│├── 📂 db/                          # Schema bazei de date│   ├── schema.js                   # Definițiile pentru Firebase/Backend│   └── index.js│├── 📂 screens/                     # Ecranele jocului│   ├── GameEntry.js                # Animația de intrare (logo + tranziție)│   ├── MainMenu.js                 # Meniul principal (5 opțiuni)│   ├── GamePlayScreen.js           # Jocul în sine cu unlock levels│   ├── ChallengesScreen.js         # Lista de challenge-uri│   ├── PrayerShopScreen.js         # Magazinul│   ├── AchievementsScreen.js       # Achievements (Trophies, Collection, Milestones)│   ├── index.js│   └── styles/                     # Stiluri pentru ecrane│├── 📂 components/                  # Componente reutilizabile│   ├── Avatar.js                   # Avatarul jucătorului│   ├── Platform.js / PlatformList.js│   ├── Background.js               # Fundal piatră → copac│   ├── LevelNumber.js / HammerIcon.js / TrophyIcon.js│   ├── WinOverlay.js               # Modal de victorie│   ├── GameWorld.js                # Container pentru joc│   ├── ChallengeCard.js            # Card pentru challenge│   ├── ShopItem.js                 # Item în shop│   ├── AchievementCard.js          # Card achievement│   ├── TreasureBag.js              # Iconița treasure bag + count│   ├── AlabastruBadge.js           # Badge cu alabastru│   ├── LevelCostBadge.js           # Badge pentru cost nivel│   ├── GameIcon.js                 # Iconița jocului în meniu games│   └── index.js│├── 📂 hooks/                       # React Hooks│   ├── useGameState.js             # State management joc│   ├── useCamera.js                # Control cameră│   ├── useReveal.js                # Reveal tree animation│   ├── useAvatarMovement.js        # Mișcare avatar│   ├── useGameLoop.js              # Game loop│   ├── usePrayerGameIntegration.js # 🔗 INTEGRARE CU PRAYERS│   └── index.js│├── 📂 context/                     # React Context│   ├── GameContext.js              # Context stare joc│   ├── PlayerContext.js            # Context player complet│   ├── UserProgressContext.js      # Context progres│   └── index.js│├── 📂 services/                    # Servicii business logic│   ├── gameService.js              # Serviciu general joc│   ├── taskIntegrationService.js   # Integrare cu taskuri│   ├── prayerIntegrationService.js # 🔗 INTEGRARE CU PRAYERS (important!)│   └── index.js│├── 📂 constants/                   # Constante├── 📂 utils/                       # Funcții utilitare├── 📂 state/                       # State management (reducer)├── 📂 styles/                      # Stiluri game components└── 📂 assets/                      # Imagini (PNG-uri)
🎯 Cum să folosești jocul
1. În GamesScreen sau unde vrei să afișezi iconița:
import { GameIcon, PrayRealmNavigator } from './game_pray-realm';// Afișează iconița<GameIcon onPress={() => setShowGame(true)} hasNotification={hasClaimable} />// Când dai click, afișează navigatorul{showGame && (  <PrayRealmNavigator     userId={currentUser.id}     onExit={() => setShowGame(false)}   />)}
2. În ecranele de Prayers (pentru integrare):
import { usePrayerGameIntegration } from './games/game_pray-realm';const { onPrayerCompleted, onPrayerAdded, onStreakUpdated } = usePrayerGameIntegration(userId);// Când user-ul completează o rugăciuneawait onPrayerCompleted({ tab: 'personal', forPerson: true });// Când user-ul adaugă o rugăciune nouăawait onPrayerAdded();// Când se actualizează streak-ulawait onStreakUpdated(currentStreak);
💰 Prețuri Nivele (Stage 1)
Nivel	Cost	Tip
1	Gratis	Start
2-4	50-60	Normal
5	75	Break
6-9	60-80	Normal
10	100	Break
11-14	80-100	Normal
15	150	Break
16-19	110-130	Normal
20	200	Break
21-24	150-180	Normal
25	300	Break
26	Gratis	🏆 Trofeu
📋 Challenge-uri Stage 1
Prima rugăciune - 30 alabastru
5 rugăciuni personale - 50 alabastru
Streak 3 zile - 70 alabastru
Adaugă 3 rugăciuni - 40 alabastru
Roagă-te pentru 5 persoane - 60 alabastru
Streak 7 zile - 100 alabastru
3 rugăciuni biserică - 50 alabastru
10 rugăciuni total - 70 alabastru
Streak 10 zile - 100 alabastru
25 rugăciuni - 100 alabastru
🛒 Shop Items
Hammer (Ciocan) - 500 Alabastru - pentru break levels
Arhitectura este scalabilă pentru Stage 2+ și complet separată de prayers dar integrată prin servicii!