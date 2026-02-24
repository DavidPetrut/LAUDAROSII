// Costul pentru a urca pe fiecare nivel (alabastru necesar)
export const LEVEL_COSTS = {
  1: 0,
  2: 50,
  3: 50,
  4: 60,
  5: 75,
  6: 60,
  7: 70,
  8: 70,
  9: 80,
  10: 100,
  11: 80,
  12: 90,
  13: 90,
  14: 100,
  15: 150,
  16: 110,
  17: 120,
  18: 120,
  19: 130,
  20: 200,
  21: 150,
  22: 150,
  23: 170,
  24: 180,
  25: 300,
  26: 0,
};

// Taxa de unlock pentru fiecare nivel (trebuie plătită înainte de a vedea costul)
export const UNLOCK_FEES = {
  1: "free",
  2: "free",
  3: 3,
  4: 3,
  5: 5,
  6: 7,
  7: 7,
  8: 7,
  9: 8,
  10: 10,
  11: 15,
  12: 15,
  13: 15,
  14: 20,
  15: 30,
  16: 35,
  17: 35,
  18: 50,
  19: 50,
  20: 60,
  21: 60,
  22: 70,
  23: 80,
  24: 90,
  25: 100,
  26: 0,
};

export const TROPHY_LEVEL = 26;

export const getLevelCost = (level) => {
  return LEVEL_COSTS[level] ?? 0;
};

export const getUnlockFee = (level) => {
  return UNLOCK_FEES[level] ?? 0;
};

export const getTotalCostToLevel = (targetLevel) => {
  let total = 0;
  for (let i = 1; i <= targetLevel; i++) {
    total += LEVEL_COSTS[i] || 0;
  }
  return total;
};
