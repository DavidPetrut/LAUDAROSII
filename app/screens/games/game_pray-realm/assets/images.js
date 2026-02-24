// Array cu toate treptele (9 variante de textură)
const STEP_IMAGES = [
  require("./treapta_noua_1.png"),
  require("./treapta_noua_2.png"),
  require("./treapta_noua_3.png"),
  require("./treapta_noua_4.png"),
  require("./treapta_noua_5.png"),
  require("./treapta_noua_6.png"),
  require("./treapta_noua_7.png"),
  require("./treapta_noua_8.png"),
  require("./treapta_noua_9.png"),
];

// Generează un mapping random dar consistent pentru fiecare nivel
// Folosim un seed bazat pe nivel pentru a fi deterministic
const generateStepMapping = () => {
  const mapping = {};
  // Shuffle array folosind un algoritm simplu
  const shuffled = [...STEP_IMAGES];
  for (let level = 1; level <= 26; level++) {
    // Folosim modulo pentru a cicla prin imagini, dar cu un offset "random" bazat pe level
    const index = (level * 7 + 3) % STEP_IMAGES.length; // Formula pentru pseudo-random
    mapping[level] = shuffled[index];
  }
  return mapping;
};

// Mapping-ul este generat o singură dată la import
const STEP_MAPPING = generateStepMapping();

// Funcție pentru a obține imaginea treptei pentru un nivel
export const getStepImageForLevel = (level) => {
  return STEP_MAPPING[level] || STEP_IMAGES[0];
};

export const GameImages = {
  tree: require("./tree.png"),
  treePiatra: require("./tree_piatra.png"),
  stone: require("./piatra.png"),
  step: require("./scara_1.png"),
  steps: STEP_IMAGES,
  trophy: require("./trophy.png"),
  texture: require("./textura.png"),
  hammer: require("./hammer.png"),
  alabastru: require("./alabastru.png"),
  alabastruCard: require("./alabastru-card.png"),
  treasureBag: require("./treasure-bag.png"),
  backpack: require("./backpack.png"),
  inventory: require("./inventory.png"),
  xButton: require("./x-button.png"),
  toolbar: require("./toolbar.png"),
  swordToolbar: require("./sword_toolbar.png"),
  logoApp: require("./logo-app.png"),
  verticalChurchLogo: require("./vertical-church-logo.png"),
  defaultAvatar: require("./logo-app.png"),
  bgDarkVideo: require("./bg_dark.mp4"),
  bgLight: require("./bg_light.png"),
  shop: require("./shop.png"),
  btnUnelte: require("./btn-unelte.png"),
  btnQuests: require("./btn-quests.png"),
  shield: require("./shield.png"),
  sword: require("./sword.png"),
  door1: require("./door1.png"),
  door2: require("./door2.png"),
  moreInfo: require("./more-info.png"),
  texturaCarduri: require("./textura_carduri.png"),

  // Ecran start - butoane si background
  bgStart: require("./experiment/bg-start1.png"),
  btnIncepeJocul: require("./experiment/btn-incepeJocul2.png"),
  btnContinua: require("./experiment/btn-continua2.png"),
  btnProvocari: require("./experiment/btn-provocari2.png"),
  btnMagazin: require("./experiment/btn-magazin2.png"),
  btnGalerie: require("./experiment/btn-galerie2.png"),
  btnIesire: require("./experiment/btn-iesire2.png"),

  // Ecran galerie
  bgGalerie: require("./experiment/bg-galerie1.png"),
  cardAchievementFrame: require("./experiment/card-achievement-img.png"),
  btnColectie: require("./experiment/btn-colectie.png"),
  btnGalerieSectie: require("./experiment/btn-galerie-sectie.png"),

  // Ecran provocari
  bgProvocari: require("./experiment/bg-provocari.png"),
  bgCard: require("./experiment/bg-card.png"),
  btnActive: require("./experiment/btn-active.png"),
  btnCompletate: require("./experiment/btn-completate.png"),

  // Daily reward
  dailyIcon: require("./experiment/daily.png"),
  bgDaily: require("./experiment/bg-daily.png"),
  // Lore backgrounds and drawings
  loreBg: require("./lore/lore-bg.png"),
  desenCiocan: require("./lore/desen-ciocan.png"),
  desenScut: require("./lore/desen-scut.png"),
  desenSword: require("./lore/desen-sword.png"),
  desenBelzy: require("./lore/desen-belzy.png"),
  // Belzy character
  belzyHappy: require("./belzy_happy.png"),
  belzyAngry: require("./belzi_angry.png"), // Note: filename has typo
  belzyLaugh: require("./bulzy_laugh.png"), // Note: filename has typo
  belzyScared: require("./belzy_scared.png"),
  belzyDead: require("./belzy_dead.png"),
  talkingCloud: require("./talking_cloud.png"),
  // Sword active state
  swordActive: require("./sword_active.png"),
  // Videos
  swordSceneVideo: require("./videos/sword scene/sword_scene.mp4"),
};

/**
 * Mapping pentru imagini de tools - pentru scalabilitate
 * Adaugă noi tool-uri aici
 */
export const ToolImages = {
  hammer: require("./hammer.png"),
  shield: require("./shield.png"),
  sword: require("./sword.png"),
};

/**
 * Obține imaginea unui tool după ID
 */
export const getToolImage = (toolId) => {
  return ToolImages[toolId] || null;
};
