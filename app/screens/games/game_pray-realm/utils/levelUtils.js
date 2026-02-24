import { REVEAL_THRESHOLDS } from "../constants/levels";
import { BREAK_LEVELS } from "../constants/gameConfig";
import { TROPHY_LEVEL } from "../data/levelCosts";

export const isBreakLevel = (level) => {
  return BREAK_LEVELS.includes(level);
};

export const isTrophyLevel = (level, maxLevel) => {
  return level === maxLevel || level === TROPHY_LEVEL;
};

export const getRevealTargetForLevel = (level) => {
  for (let i = REVEAL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (level >= REVEAL_THRESHOLDS[i].level) {
      return REVEAL_THRESHOLDS[i].reveal;
    }
  }
  return 0;
};

export const getVisibleLevelsRange = (
  currentLevel,
  maxLevel,
  lookahead = 7
) => {
  const start = 1;
  const end = Math.min(maxLevel, currentLevel + lookahead);
  return { start, end };
};
