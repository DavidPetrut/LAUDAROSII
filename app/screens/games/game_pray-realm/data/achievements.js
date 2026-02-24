export const ACHIEVEMENT_CATEGORIES = {
  TROPHIES: "TROPHIES",
  COLLECTION: "COLLECTION",
  MILESTONES: "MILESTONES",
};

export const ACHIEVEMENTS = [
  {
    id: "stage_1_complete",
    category: ACHIEVEMENT_CATEGORIES.TROPHIES,
    name: "Stage 1 Champion",
    description: "Ai completat Stage 1 al jocului Kingdom War",
    icon: "trophy",
    stage: 1,
  },
  {
    id: "tree_stage_1",
    category: ACHIEVEMENT_CATEGORIES.COLLECTION,
    name: "Copacul Rugăciunii",
    description: "Ai deblocat copacul complet în Stage 1",
    icon: "tree",
    stage: 1,
  },
  {
    id: "first_prayer",
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    name: "Prima Rugăciune",
    description: "Ai completat prima ta rugăciune în joc",
    icon: "star",
    stage: 1,
  },
  {
    id: "streak_7",
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    name: "7 Zile de Rugăciune",
    description: "Ai menținut un streak de 7 zile",
    icon: "fire",
    stage: 1,
  },
  {
    id: "break_level_5",
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    name: "Primul Obstacol",
    description: "Ai trecut de nivelul 5",
    icon: "hammer",
    stage: 1,
  },
];

export const getAchievementsByCategory = (category) => {
  return ACHIEVEMENTS.filter((a) => a.category === category);
};

export const getAchievementById = (id) => {
  return ACHIEVEMENTS.find((a) => a.id === id);
};
