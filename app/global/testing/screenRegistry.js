/**
 * Harta ARHITECTURII aplicatiei: numele rutei (React Navigation) -> unde se afla
 * in cod. Scopul principal: cand un utilizator raporteaza un bug, sa stim EXACT
 * folderul + fisierul ecranului, ca sa NU pierdem tokeni cautand codul mai tarziu.
 *
 * `tab`    - unul din cele 5 taburi principale (nivelul 1 in DB)
 * `screen` - eticheta prietenoasa a ecranului (nivelul 2 in DB)
 * `folder` - folderul care contine ecranul (relativ la /app)
 * `file`   - fisierul principal al ecranului (relativ la /app)
 *
 * Unele ecrane au "layere" interne (ex: tabul Pray -> "NU SLUJESC" -> 3 sub-taburi)
 * care NU sunt rute separate. Acele layere se seteaza dinamic prin TestingContext
 * (setLayer) si suprascriu screen/folder/file cand sunt active.
 */

export const TAB_LABELS = {
  Home: "Home",
  Prayers: "Pray",
  Courses: "Learn",
  Games: "Games",
  Profile: "Profile",
};

// Cheie = numele rutei din navigator. Valoare = locatia in cod.
export const SCREEN_REGISTRY = {
  // ---- HOME tab ----
  Home: { tab: "Home", screen: "Home", folder: "screens/home", file: "screens/home/HomeScreen.js" },
  HomeScreen: { tab: "Home", screen: "Home", folder: "screens/home", file: "screens/home/HomeScreen.js" },
  Announcements: { tab: "Home", screen: "Anunțuri", folder: "screens/announcements", file: "screens/announcements/AnnouncementsScreen.js" },
  AnnouncementDetail: { tab: "Home", screen: "Detaliu anunț", folder: "screens/announcements", file: "screens/announcements/AnnouncementDetailScreen.js" },

  // ---- PRAYERS tab ----
  Prayers: { tab: "Prayers", screen: "Rugăciuni (selector)", folder: "screens/prayers", file: "screens/prayers/PrayersScreen.js" },
  PrayersMain: { tab: "Prayers", screen: "Rugăciuni (selector)", folder: "screens/prayers", file: "screens/prayers/PrayersScreen.js" },
  PrayRoomList: { tab: "Prayers", screen: "Pray Rooms - listă", folder: "screens/prayers/pray-room", file: "screens/prayers/pray-room/PrayRoomList.js" },
  PrayRoomEntry: { tab: "Prayers", screen: "Pray Room - intrare", folder: "screens/prayers/pray-room", file: "screens/prayers/pray-room/PrayRoomEntry.js" },
  PrayRoomSetup: { tab: "Prayers", screen: "Pray Room - configurare", folder: "screens/prayers/pray-room", file: "screens/prayers/pray-room/PrayRoomSetup.js" },
  PrayRoomScreen: { tab: "Prayers", screen: "Pray Room - sesiune", folder: "screens/prayers/pray-room", file: "screens/prayers/pray-room/PrayRoomScreen.js" },
  PrayerAnalysis: { tab: "Prayers", screen: "Analiză rugăciuni", folder: "screens/prayers/analyze", file: "screens/prayers/analyze/AnalysisScreen.js" },
  PrayerTimer: { tab: "Prayers", screen: "Timer rugăciune", folder: "screens/prayers/timer", file: "screens/prayers/timer/TimerScreen.js" },
  Achievements: { tab: "Prayers", screen: "Realizări", folder: "screens/prayers", file: "screens/prayers/AchievementsScreen.js" },

  // ---- COURSES tab ----
  Courses: { tab: "Courses", screen: "Cursuri", folder: "screens/courses", file: "screens/courses/CoursesScreen.js" },
  CourseDetail: { tab: "Courses", screen: "Detaliu curs", folder: "screens/courses", file: "screens/courses/CourseDetailScreen.js" },

  // ---- GAMES tab ----
  Games: { tab: "Games", screen: "Jocuri", folder: "screens/games", file: "screens/games/GamesScreen.js" },
  QuizGame: { tab: "Games", screen: "Quiz Biblic", folder: "screens/games", file: "screens/games/QuizGameScreen.js" },
  MemoryGame: { tab: "Games", screen: "Memorează versetul", folder: "screens/games", file: "screens/games/MemoryGameScreen.js" },
  Leaderboard: { tab: "Games", screen: "Clasament", folder: "screens/games", file: "screens/games/LeaderboardScreen.js" },
  MultiplayerLobby: { tab: "Games", screen: "Lobby multiplayer", folder: "screens/games", file: "screens/games/MultiplayerLobbyScreen.js" },

  // ---- PROFILE tab ----
  Profile: { tab: "Profile", screen: "Profil", folder: "screens/profile", file: "screens/profile/ProfileScreen.js" },
  EditProfile: { tab: "Profile", screen: "Editează profil", folder: "screens/profile", file: "screens/profile/EditProfileScreen.js" },
  Settings: { tab: "Profile", screen: "Setări", folder: "screens/profile", file: "screens/profile/SettingsScreen.js" },
  Admin: { tab: "Profile", screen: "Admin", folder: "screens/admin", file: "screens/admin/AdminScreen.js" },

  // ---- AUTH (in afara taburilor) ----
  Login: { tab: "Auth", screen: "Autentificare", folder: "screens/auth", file: "screens/auth/LoginScreen.js" },
  Register: { tab: "Auth", screen: "Înregistrare", folder: "screens/auth", file: "screens/auth/RegisterScreen.js" },
  ForgotPassword: { tab: "Auth", screen: "Resetare parolă", folder: "screens/auth", file: "screens/auth/ForgotPasswordScreen.js" },
};

// Rute "container" pe care le ignoram cand cautam ruta activa reala.
const CONTAINER_ROUTES = new Set(["MainTabs", "AppStack", "AuthStack"]);

const DEFAULT_ENTRY = {
  tab: "Necunoscut",
  screen: "Ecran necunoscut",
  folder: "screens",
  file: "necunoscut",
};

export const resolveScreen = (routeName) => {
  if (!routeName) return { ...DEFAULT_ENTRY };
  return SCREEN_REGISTRY[routeName]
    ? { ...SCREEN_REGISTRY[routeName], route: routeName }
    : { ...DEFAULT_ENTRY, route: routeName, screen: routeName };
};

/**
 * Extrage numele rutei active dintr-un obiect de stare de navigatie
 * (coboara recursiv prin nested navigators pana la ecranul cel mai adanc).
 */
export const getActiveRouteName = (state) => {
  if (!state || !state.routes || state.routes.length === 0) return null;
  let route = state.routes[state.index ?? state.routes.length - 1];
  // coboara prin nested state
  while (route?.state) {
    const inner = route.state;
    route = inner.routes[inner.index ?? inner.routes.length - 1];
  }
  if (route && CONTAINER_ROUTES.has(route.name)) return null;
  return route ? route.name : null;
};
