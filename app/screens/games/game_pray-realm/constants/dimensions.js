import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

// ========== RESPONSIVE HELPERS ==========
// Base rem unit (bazat pe un ecran de referință de 375px width)
const BASE_WIDTH = 375;
export const rem = (size) => (SCREEN_WIDTH / BASE_WIDTH) * size;

// Detect dacă e tabletă (width > 600)
export const isTablet = SCREEN_WIDTH > 600;

// Detect telefoane mici (height < 750px) - ex: iPhone XR, iPhone SE
// Acestea au nevoie de ajustări speciale pentru background
export const isSmallPhone = !isTablet && SCREEN_HEIGHT < 750;

// ========== SCALE FACTORS ==========
// Factor de scalare pentru tabletă
const TABLET_SCALE = isTablet ? 1.25 : 1.0; // 25% mai mare pe tabletă

// Factor de scalare pentru mobil - MĂRIT pentru scări și avatar mai mari
const MOBILE_BOOST = isTablet ? 1.0 : 1.25; // 25% boost pe mobil (era 15%)

// ========== AVATAR - RESPONSIVE ==========
// Avatar size bazat pe procent din lățimea ecranului
// MĂRIT pe mobil pentru look mai bun
const AVATAR_WIDTH_PERCENT = 0.21; // 21% din lățimea ecranului (era 19%)
export const AVATAR_SIZE =
  SCREEN_WIDTH * AVATAR_WIDTH_PERCENT * TABLET_SCALE * MOBILE_BOOST;
export const AVATAR_RADIUS = AVATAR_SIZE / 2;

// Offset pentru avatar - cât de sus stă deasupra scării
// Mărit pentru a nu intra în scară
export const AVATAR_STAND_OFFSET = rem(45); // Offset mai mare să fie deasupra scării

// ========== LEVEL/TREPTE - RESPONSIVE ==========
// Distanța între nivele - MAI MARE pe tabletă pentru scări mai depărtate
const LEVEL_HEIGHT_PERCENT = isTablet ? 0.18 : 0.15; // 18% tabletă (mărit), 15% mobil (mărit)
export const LEVEL_HEIGHT =
  SCREEN_HEIGHT * LEVEL_HEIGHT_PERCENT * TABLET_SCALE * MOBILE_BOOST;

// Scala scărilor - MĂRIT pe mobil (+5%)
export const STEP_SCALE = isTablet ? 0.68 : 0.68; // Scări 5% mai mari pe mobil (era 0.65)

// ========== ALTE ELEMENTE - RESPONSIVE ==========
export const TROPHY_SIZE = rem(70) * TABLET_SCALE * MOBILE_BOOST;
export const HAMMER_SIZE = rem(45) * TABLET_SCALE * MOBILE_BOOST;
export const LEVEL_NUMBER_FONT_SIZE = rem(32);

// ========== BADGE SCALE - Pentru alabastru/fees pe scări ==========
// Pe mobil: badge-uri 25% mai mari pentru vizibilitate (era 50%, prea mult)
export const BADGE_SCALE = isTablet ? 1.0 : 1.25; // 25% mai mari pe mobil

// ========== BACKGROUND/PIETRE - RESPONSIVE ==========
// Dimensiuni pentru pietrele transparente și copac
// Pe tabletă: pietre mai late pe X-axis
export const BG_TREE_WIDTH_PERCENT = isTablet ? 1.35 : 1.2; // Mărit pe tabletă de la 1.0 la 1.35
export const BG_TREE_HEIGHT_MULTIPLIER = isTablet ? 5.0 : 5.0; // Același multiplicator
