/**
 * Stage Configuration - Scalabil pentru multiple stages
 * Fiecare stage are: id, name, intro data, levels range, etc.
 */

export const STAGES = {
  1: {
    id: 1,
    name: "The Beginning",
    levelsRange: [1, 26],
    introDataFile: "stage1IntroData",
    isUnlocked: true,
  },
  // Viitoare stages:
  // 2: { id: 2, name: "The Trials", levelsRange: [1, 26], introDataFile: "stage2IntroData" },
};

export const getCurrentStage = (stageId) => STAGES[stageId] || STAGES[1];

export const getNextStage = (currentStageId) => {
  const nextId = currentStageId + 1;
  return STAGES[nextId] || null;
};

export const hasWatchedStageIntro = (watchedIntros, stageId) => {
  return watchedIntros?.includes(stageId) || false;
};
