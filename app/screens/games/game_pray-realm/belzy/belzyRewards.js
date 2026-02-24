/**
 * BELZY REWARDS & PUNISHMENTS
 * Consequences of winning or losing against Belzy
 */

// Punishment types
export const PUNISHMENT_TYPES = {
  PAY_DOUBLE_FEE: "pay_double_fee", // Must pay fee x2 again
  LOSE_ALABASTRU: "lose_alabastru", // Future: lose some alabastru
  GO_BACK_LEVEL: "go_back_level", // Future: go back one level
  EXTRA_QUESTION: "extra_question", // Future: answer more questions
};

// Reward types (for future use)
export const REWARD_TYPES = {
  BONUS_ALABASTRU: "bonus_alabastru", // Get extra alabastru
  SKIP_FEE: "skip_fee", // Next fee is free
  DAMAGE_BELZY: "damage_belzy", // Reduce Belzy's health
  POWER_UP: "power_up", // Get a temporary power-up
};

// Active punishments (currently only one)
export const PUNISHMENTS = [
  {
    id: "pay_double_fee",
    type: PUNISHMENT_TYPES.PAY_DOUBLE_FEE,
    name: "Taxa Dublă",
    description: "Trebuie să plătești din nou taxa de unlock, de 2 ori!",
    multiplier: 2,
    isActive: true,
  },
  // Future punishments (inactive for now)
  {
    id: "lose_10_alabastru",
    type: PUNISHMENT_TYPES.LOSE_ALABASTRU,
    name: "Pierdere Alabastru",
    description: "Pierzi 10 Alabastru!",
    amount: 10,
    isActive: false,
  },
  {
    id: "go_back_one",
    type: PUNISHMENT_TYPES.GO_BACK_LEVEL,
    name: "Înapoi un Nivel",
    description: "Te întorci un nivel înapoi!",
    levels: 1,
    isActive: false,
  },
];

// Rewards for defeating Belzy (future use - currently empty)
export const REWARDS = [
  {
    id: "bonus_50_alabastru",
    type: REWARD_TYPES.BONUS_ALABASTRU,
    name: "Bonus Alabastru",
    description: "Primești 50 Alabastru bonus!",
    amount: 50,
    isActive: false, // Currently no rewards
  },
  {
    id: "damage_belzy_10",
    type: REWARD_TYPES.DAMAGE_BELZY,
    name: "Lovitură",
    description: "Îi dai o lovitură lui Belzy! (-10 HP)",
    damage: 10,
    isActive: false,
  },
];

// Get the active punishment for losing
export const getActivePunishment = () => {
  return PUNISHMENTS.find((p) => p.isActive) || PUNISHMENTS[0];
};

// Get active rewards for winning (currently none)
export const getActiveRewards = () => {
  return REWARDS.filter((r) => r.isActive);
};

// Apply punishment to player
export const applyPunishment = async (punishment, context) => {
  const { userId, level, fee, PlayerApi } = context;

  switch (punishment.type) {
    case PUNISHMENT_TYPES.PAY_DOUBLE_FEE:
      // Reset the paid fee for this level - player must pay again
      await PlayerApi.resetFeeForLevel(userId, level);
      // The x2 multiplier will be applied when they try to pay again
      return {
        success: true,
        message: `Taxa pentru nivelul ${level} a fost resetată. Trebuie să plătești ${
          fee * punishment.multiplier
        } Alabastru.`,
      };

    case PUNISHMENT_TYPES.LOSE_ALABASTRU:
      await PlayerApi.updateAlabastru(
        userId,
        -punishment.amount,
        "belzy_punishment",
        "lose_alabastru"
      );
      return {
        success: true,
        message: `Ai pierdut ${punishment.amount} Alabastru!`,
      };

    default:
      return { success: false, message: "Pedeapsă necunoscută" };
  }
};

// Apply reward to player (future use)
export const applyReward = async (reward, context) => {
  const { userId, PlayerApi } = context;

  switch (reward.type) {
    case REWARD_TYPES.BONUS_ALABASTRU:
      await PlayerApi.updateAlabastru(
        userId,
        reward.amount,
        "belzy_reward",
        "bonus"
      );
      return {
        success: true,
        message: `Ai primit ${reward.amount} Alabastru bonus!`,
      };

    case REWARD_TYPES.DAMAGE_BELZY:
      // Future: implement Belzy health system
      return {
        success: true,
        message: `Belzy a primit ${reward.damage} damage!`,
      };

    default:
      return { success: false, message: "Recompensă necunoscută" };
  }
};
