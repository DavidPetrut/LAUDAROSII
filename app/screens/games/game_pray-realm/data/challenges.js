export const CHALLENGE_TYPES = {
  PRAY_COUNT: "PRAY_COUNT",
  DAILY_STREAK: "DAILY_STREAK",
  PRAY_FOR_PEOPLE: "PRAY_FOR_PEOPLE",
  ADD_PRAYERS: "ADD_PRAYERS",
  COMPLETE_PROGRAM: "COMPLETE_PROGRAM",
  CHURCH_PRAYERS: "CHURCH_PRAYERS",
  PERSONAL_PRAYERS: "PERSONAL_PRAYERS",
};

export const CHALLENGE_STATUS = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CLAIMED: "CLAIMED",
  EXPIRED: "EXPIRED",
};

export const CHALLENGE_EXPIRY_DAYS = 31;

export const STAGE_1_CHALLENGES = [
  {
    id: "s1_c1",
    stage: 1,
    type: CHALLENGE_TYPES.PRAY_COUNT,
    title: "Prima rugăciune",
    description: "Roagă-te cel puțin o dată în tabul Personal Prayers",
    action: "Mergi la Nu Slujesc → Personale și completează o rugăciune",
    reward: 30,
    requirement: { count: 1, tab: "personal" },
  },
  {
    id: "s1_c2",
    stage: 1,
    type: CHALLENGE_TYPES.PRAY_COUNT,
    title: "Rugăciuni dedicate",
    description: "Completează 5 rugăciuni personale",
    action: "Mergi la Nu Slujesc → Personale și completează 5 rugăciuni",
    reward: 50,
    requirement: { count: 5, tab: "personal" },
  },
  {
    id: "s1_c3",
    stage: 1,
    type: CHALLENGE_TYPES.DAILY_STREAK,
    title: "Streak de 3 zile",
    description: "Roagă-te 3 zile consecutive",
    action: "Roagă-te în fiecare zi timp de 3 zile consecutive",
    reward: 70,
    requirement: { streakDays: 3 },
  },
  {
    id: "s1_c4",
    stage: 1,
    type: CHALLENGE_TYPES.ADD_PRAYERS,
    title: "Adaugă rugăciuni",
    description: "Adaugă 3 rugăciuni noi în lista ta",
    action: "Mergi la Nu Slujesc → Personale și adaugă 3 rugăciuni noi",
    reward: 40,
    requirement: { count: 3, action: "add" },
  },
  {
    id: "s1_c5",
    stage: 1,
    type: CHALLENGE_TYPES.PRAY_FOR_PEOPLE,
    title: "Roagă-te pentru alții",
    description: "Roagă-te pentru 5 persoane diferite",
    action: "Completează rugăciuni pentru 5 persoane în Personale",
    reward: 60,
    requirement: { count: 5, type: "people" },
  },
  {
    id: "s1_c6",
    stage: 1,
    type: CHALLENGE_TYPES.DAILY_STREAK,
    title: "Streak de 7 zile",
    description: "Roagă-te 7 zile consecutive",
    action: "Menține un streak de rugăciune timp de 7 zile",
    reward: 100,
    requirement: { streakDays: 7 },
  },
  {
    id: "s1_c7",
    stage: 1,
    type: CHALLENGE_TYPES.CHURCH_PRAYERS,
    title: "Rugăciuni pentru biserică",
    description: "Completează 3 rugăciuni din tabul Biserica",
    action: "Mergi la Nu Slujesc → Biserica și completează 3 rugăciuni",
    reward: 50,
    requirement: { count: 3, tab: "church" },
  },
  {
    id: "s1_c8",
    stage: 1,
    type: CHALLENGE_TYPES.PRAY_COUNT,
    title: "10 Rugăciuni",
    description: "Completează 10 rugăciuni în total",
    action: "Completează 10 rugăciuni în orice tab",
    reward: 70,
    requirement: { count: 10, tab: "any" },
  },
  {
    id: "s1_c9",
    stage: 1,
    type: CHALLENGE_TYPES.DAILY_STREAK,
    title: "Streak de 10 zile",
    description: "Roagă-te 10 zile consecutive",
    action: "Menține un streak de rugăciune timp de 10 zile",
    reward: 100,
    requirement: { streakDays: 10 },
  },
  {
    id: "s1_c10",
    stage: 1,
    type: CHALLENGE_TYPES.PRAY_COUNT,
    title: "25 Rugăciuni",
    description: "Completează 25 de rugăciuni",
    action: "Completează 25 de rugăciuni în orice tab",
    reward: 100,
    requirement: { count: 25, tab: "any" },
  },
];

export const getChallengesByStage = (stage) => {
  if (stage === 1) return STAGE_1_CHALLENGES;
  return [];
};

export const getChallengeById = (id) => {
  return STAGE_1_CHALLENGES.find((c) => c.id === id);
};
