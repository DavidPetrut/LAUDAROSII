/**
 * DATABASE SCHEMA FOR PRAY REALM GAME
 * This file defines the data structure for Firebase/Supabase/Backend
 *
 * Collection: pray_realm_players
 * Document ID: {userId}
 */

export const PLAYER_SCHEMA = {
  // Basic info
  id: "string", // Same as Firebase Auth UID
  createdAt: "timestamp",
  updatedAt: "timestamp",

  // Currency
  alabastru: {
    current: "number", // Current balance
    totalEarned: "number", // Lifetime earned
    totalSpent: "number", // Lifetime spent
  },

  // Progress
  progress: {
    currentStage: "number", // 1, 2, 3...
    currentLevel: "number", // 1-26 within stage
    unlockedLevels: "array", // [1, 2, 3, 4]
    paidFees: "array", // [2, 3, 4] - levels with paid unlock fees
    completedStages: "array", // [1] after finishing stage 1
    stageIntrosWatched: "array", // [1, 2] - stages whose intro was watched
  },

  // Belzy encounters (legacy - kept for compatibility)
  belzy: {
    defeatedAt: "array", // Levels where Belzy was defeated [4, 7]
    victories: "number", // Times player beat Belzy
    defeats: "number", // Times Belzy won
    health: "number", // Future: Belzy's remaining health
  },

  // Active buffs on avatar (from drag and drop)
  activeBuffs: {
    shield: "boolean", // Shield is active (protects from Belzy once)
    sword: "boolean", // Sword is active (can kill Belzy)
  },

  // Villains status - scalabil pentru mai mulți villain-i
  villains: {
    belzy: {
      status: "string", // 'alive', 'dead', 'banished_3days', 'banished_forever'
      killedAt: "timestamp | null",
      killedWith: "string | null", // 'sword', etc.
      banishedUntil: "timestamp | null", // For temporary banishments
    },
    // Future villains can be added here
  },

  // Inventory - scalabil cu cantități
  inventory: {
    tools: "object", // { hammer: 2, pickaxe: 1 } - tool id -> quantity
    items: "object", // { potion: 5 } - item id -> quantity
  },

  // Achievements
  achievements: {
    unlocked: "array", // ['stage_1_complete', 'tree_stage_1']
    unlockedAt: "map", // { 'stage_1_complete': timestamp }
  },

  // Collection (trees, trophies unlocked)
  collection: {
    trees: "array", // ['tree_stage_1']
    trophies: "array", // ['trophy_stage_1']
  },

  // Statistics
  stats: {
    totalPrayers: "number",
    longestStreak: "number",
    currentStreak: "number",
    lastPrayerDate: "timestamp",
    totalPlayTime: "number", // in seconds
  },
};

/**
 * Collection: pray_realm_challenges
 * Document ID: {oderId}_{challengeId}
 */
export const PLAYER_CHALLENGE_SCHEMA = {
  id: "string",
  oderId: "string",
  challengeId: "string", // From STAGE_1_CHALLENGES
  stage: "number",

  status: "string", // 'ACTIVE', 'COMPLETED', 'CLAIMED', 'EXPIRED'

  progress: {
    current: "number", // Current progress count
    required: "number", // Required to complete
  },

  startedAt: "timestamp",
  completedAt: "timestamp | null",
  claimedAt: "timestamp | null",
  expiresAt: "timestamp", // 31 days from startedAt

  reward: "number", // Alabastru amount
};

/**
 * Collection: pray_realm_transactions
 * Document ID: auto-generated
 */
export const TRANSACTION_SCHEMA = {
  id: "string",
  oderId: "string",
  type: "string", // 'EARN', 'SPEND', 'REFUND'
  amount: "number",
  source: "string", // 'challenge', 'shop', 'level_unlock'
  sourceId: "string", // challengeId, itemId, or level number
  timestamp: "timestamp",
  balanceAfter: "number",
};

export const INITIAL_PLAYER_DATA = {
  alabastru: {
    current: 100, // Starting alabastru for new players
    totalEarned: 100,
    totalSpent: 0,
  },
  progress: {
    currentStage: 1,
    currentLevel: 1,
    unlockedLevels: [1],
    paidFees: [],
    completedStages: [],
    stageIntrosWatched: [],
  },
  belzy: {
    defeatedAt: [], // Levels where Belzy was defeated
    encounteredAt: [], // All levels where Belzy appeared
    victories: 0,
    defeats: 0,
    health: 100, // Future use
    pendingBelzyLevel: null,
    pendingFeeMultiplier: 1,
  },
  activeBuffs: {
    shield: false,
    sword: false,
  },
  villains: {
    belzy: {
      status: "alive", // 'alive', 'dead', 'banished_3days', 'banished_forever'
      killedAt: null,
      killedWith: null,
      banishedUntil: null,
    },
  },
  inventory: {
    tools: {}, // { hammer: 2 } - tool id -> quantity
    items: {}, // { potion: 5 } - item id -> quantity
  },
  achievements: {
    unlocked: [],
    unlockedAt: {},
  },
  collection: {
    trees: [],
    trophies: [],
  },
  stats: {
    totalPrayers: 0,
    longestStreak: 0,
    currentStreak: 0,
    lastPrayerDate: null,
    totalPlayTime: 0,
  },
};
