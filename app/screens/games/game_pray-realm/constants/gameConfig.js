import { isTablet, rem } from "./dimensions";

export const MOVE_SPEED = 1.3;
export const MOVE_SPEED_FINAL = 0.6;
export const PAUSE_TIME = 1400;
export const MAX_LEVEL = 26;

// Break levels - nivele care necesită ciocanul
export const BREAK_LEVELS = [5, 10, 15, 20, 25];

// START_LEVEL_OFFSET - responsive pentru tabletă
// Pe tabletă: offset mai mic = jocul începe mai jos, vezi mai mult background
// Pe mobil: offset normal
export const START_LEVEL_OFFSET = isTablet ? 0.5 : 2;

export const BG_SCROLL_FACTOR = isTablet ? 0.12 : 0.15; // Factor parallax ajustat pentru tabletă
export const TREE_BASE_OFFSET = isTablet ? rem(-50) : -100; // Offset ajustat pentru tabletă
export const REVEAL_SMOOTH_FACTOR = 0.06;
