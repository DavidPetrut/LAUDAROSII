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
  Planificare: "Planificare",
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
  PrayerTimer: { tab: "Prayers", screen: "Devotional", folder: "screens/prayers/timer", file: "screens/prayers/timer/DevotionalScreen.js" },
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

  // ---- PLANIFICARE (Planning Center, app-in-app cu navigator propriu) ----
  // Rutele traiesc in planning-center/navigation/PlanningCenterNavigator.js.
  // Toate apartin tabului principal „Planificare" (al 6-lea tab, dupa Profile).
  PcTabs: { tab: "Planificare", screen: "Planning Center (home)", folder: "planning-center/screens/people", file: "planning-center/screens/people/PeopleListScreen.js" },
  // Bottom tabs interne
  Schedule: { tab: "Planificare", screen: "Programul meu (Schedule)", folder: "planning-center/screens/schedule", file: "planning-center/screens/schedule/MyScheduleScreen.js" },
  Plans: { tab: "Planificare", screen: "Planuri (Plans)", folder: "planning-center/screens/plans", file: "planning-center/screens/plans/PlansScreen.js" },
  Songs: { tab: "Planificare", screen: "Cântece (Songs)", folder: "planning-center/screens/songs", file: "planning-center/screens/songs/SongsScreen.js" },
  Media: { tab: "Planificare", screen: "Media (listă)", folder: "planning-center/screens/media", file: "planning-center/screens/media/MediaListScreen.js" },
  People: { tab: "Planificare", screen: "Persoane (People)", folder: "planning-center/screens/people", file: "planning-center/screens/people/PeopleListScreen.js" },
  // People — ecrane full-screen
  PcProfile: { tab: "Planificare", screen: "Profil persoană", folder: "planning-center/screens/people", file: "planning-center/screens/people/ProfileScreen.js" },
  PcMyTeams: { tab: "Planificare", screen: "Echipele mele", folder: "planning-center/screens/people", file: "planning-center/screens/people/MyTeamsScreen.js" },
  PcEditContact: { tab: "Planificare", screen: "Editează contact", folder: "planning-center/screens/people", file: "planning-center/screens/people/EditContactScreen.js" },
  PcSettings: { tab: "Planificare", screen: "Setări Planificare", folder: "planning-center/screens/people", file: "planning-center/screens/people/PcSettingsScreen.js" },
  PcAddPerson: { tab: "Planificare", screen: "Adaugă persoană", folder: "planning-center/screens/people", file: "planning-center/screens/people/AddPersonScreen.js" },
  PcImport: { tab: "Planificare", screen: "Import persoane", folder: "planning-center/screens/people", file: "planning-center/screens/people/ImportScreen.js" },
  PcPersonTags: { tab: "Planificare", screen: "Etichete persoană", folder: "planning-center/screens/people", file: "planning-center/screens/people/PersonTagsScreen.js" },
  // Plans — ecrane full-screen
  PcServiceTypePlans: { tab: "Planificare", screen: "Planuri pe tip serviciu", folder: "planning-center/screens/plans", file: "planning-center/screens/plans/ServiceTypePlansScreen.js" },
  PcPlan: { tab: "Planificare", screen: "Plan (detaliu)", folder: "planning-center/screens/plans", file: "planning-center/screens/plans/PlanScreen.js" },
  PcItemDetail: { tab: "Planificare", screen: "Detaliu element plan", folder: "planning-center/screens/plans", file: "planning-center/screens/plans/ItemDetailScreen.js" },
  PcAddServiceType: { tab: "Planificare", screen: "Adaugă tip serviciu", folder: "planning-center/screens/plans", file: "planning-center/screens/plans/AddServiceTypeScreen.js" },
  PcSelectSong: { tab: "Planificare", screen: "Selectează cântec", folder: "planning-center/screens/plans", file: "planning-center/screens/plans/SelectSongScreen.js" },
  PcServiceTypeSettings: { tab: "Planificare", screen: "Setări tip serviciu", folder: "planning-center/screens/plans", file: "planning-center/screens/plans/ServiceTypeSettingsScreen.js" },
  PcMatrix: { tab: "Planificare", screen: "Matrice (Matrix)", folder: "planning-center/screens/plans", file: "planning-center/screens/plans/MatrixScreen.js" },
  // Songs — ecrane full-screen
  PcSongDetail: { tab: "Planificare", screen: "Detaliu cântec", folder: "planning-center/screens/songs", file: "planning-center/screens/songs/SongDetailScreen.js" },
  PcArrangement: { tab: "Planificare", screen: "Aranjament", folder: "planning-center/screens/songs", file: "planning-center/screens/songs/ArrangementScreen.js" },
  PcIntegrations: { tab: "Planificare", screen: "Integrări (Songs)", folder: "planning-center/screens/songs", file: "planning-center/screens/songs/IntegrationsScreen.js" },
  PcSequenceEditor: { tab: "Planificare", screen: "Editor secvență", folder: "planning-center/screens/songs", file: "planning-center/screens/songs/SequenceEditorScreen.js" },
  PcTagsManager: { tab: "Planificare", screen: "Manager etichete", folder: "planning-center/screens/songs", file: "planning-center/screens/songs/TagsManagerScreen.js" },
  PcLyricsChords: { tab: "Planificare", screen: "Editor versuri + acorduri", folder: "planning-center/screens/songs", file: "planning-center/screens/songs/LyricsChordsEditor.js" },
  PcChartViewer: { tab: "Planificare", screen: "Vizualizare chart", folder: "planning-center/screens/songs", file: "planning-center/screens/songs/LyricsChordsEditor.js" },
  // Rehearse — player + music stand + songbook
  PcMediaPlayer: { tab: "Planificare", screen: "Player media", folder: "planning-center/screens/rehearse", file: "planning-center/screens/rehearse/MediaPlayerScreen.js" },
  PcMusicStand: { tab: "Planificare", screen: "Music stand", folder: "planning-center/screens/rehearse", file: "planning-center/screens/rehearse/MusicStandScreen.js" },
  PcSongbookView: { tab: "Planificare", screen: "Songbook", folder: "planning-center/screens/rehearse", file: "planning-center/screens/rehearse/SongbookViewScreen.js" },
  // Media — detaliu + adaugare
  PcMediaItem: { tab: "Planificare", screen: "Detaliu media", folder: "planning-center/screens/media", file: "planning-center/screens/media/MediaItemScreen.js" },
  PcAddMedia: { tab: "Planificare", screen: "Adaugă media", folder: "planning-center/screens/media", file: "planning-center/screens/media/AddMediaScreen.js" },
  // Schedule — calendar + blockout
  PcCalendar: { tab: "Planificare", screen: "Calendar", folder: "planning-center/screens/schedule", file: "planning-center/screens/schedule/CalendarScreen.js" },
  PcBlockoutEditor: { tab: "Planificare", screen: "Editor blockout", folder: "planning-center/screens/schedule", file: "planning-center/screens/schedule/BlockoutEditorScreen.js" },
  // Reporting
  PcReports: { tab: "Planificare", screen: "Rapoarte", folder: "planning-center/screens/reports", file: "planning-center/screens/reports/ReportsScreen.js" },

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
