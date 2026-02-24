import AsyncStorage from "@react-native-async-storage/async-storage";
import { INITIAL_PLAYER_DATA } from "../db/schema";

const STORAGE_KEY_PREFIX = "pray_realm_player_";

const AsyncStorageGetPlayer = async (userId) => {
  try {
    const data = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const AsyncStorageSavePlayer = async (userId, playerData) => {
  try {
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${userId}`,
      JSON.stringify(playerData)
    );
  } catch (error) {
    console.error("AsyncStorage save error:", error);
  }
};

const TransactionApi = {
  logTransaction: async (userId, transaction) => {
    console.log("Transaction logged:", { userId, transaction });
  },
};

export const PlayerApi = {
  getPlayer: async (userId) => {
    try {
      const savedData = await AsyncStorageGetPlayer(userId);
      if (savedData) return savedData;

      return {
        id: userId,
        ...INITIAL_PLAYER_DATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("PlayerApi.getPlayer error:", error);
      throw error;
    }
  },

  createPlayer: async (userId) => {
    try {
      const playerData = {
        id: userId,
        ...INITIAL_PLAYER_DATA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorageSavePlayer(userId, playerData);
      return playerData;
    } catch (error) {
      console.error("PlayerApi.createPlayer error:", error);
      throw error;
    }
  },

  updatePlayer: async (userId, updates) => {
    try {
      const currentPlayer = await PlayerApi.getPlayer(userId);
      const updatedPlayer = {
        ...currentPlayer,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorageSavePlayer(userId, updatedPlayer);
      return updatedPlayer;
    } catch (error) {
      console.error("PlayerApi.updatePlayer error:", error);
      throw error;
    }
  },

  updateAlabastru: async (userId, amount, source, sourceId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const newBalance = player.alabastru.current + amount;

      if (newBalance < 0) {
        throw new Error("Insufficient alabastru");
      }

      const updatedAlabastru = {
        current: newBalance,
        totalEarned:
          amount > 0
            ? player.alabastru.totalEarned + amount
            : player.alabastru.totalEarned,
        totalSpent:
          amount < 0
            ? player.alabastru.totalSpent + Math.abs(amount)
            : player.alabastru.totalSpent,
      };

      await PlayerApi.updatePlayer(userId, { alabastru: updatedAlabastru });

      await TransactionApi.logTransaction(userId, {
        type: amount > 0 ? "EARN" : "SPEND",
        amount: Math.abs(amount),
        source,
        sourceId,
        balanceAfter: newBalance,
      });

      return updatedAlabastru;
    } catch (error) {
      console.error("PlayerApi.updateAlabastru error:", error);
      throw error;
    }
  },

  unlockLevel: async (userId, level, cost) => {
    try {
      const player = await PlayerApi.getPlayer(userId);

      if (player.alabastru.current < cost) {
        throw new Error("Insufficient alabastru");
      }

      if (player.progress.unlockedLevels.includes(level)) {
        throw new Error("Level already unlocked");
      }

      if (cost > 0) {
        await PlayerApi.updateAlabastru(
          userId,
          -cost,
          "level_unlock",
          String(level)
        );
      }

      const updatedProgress = {
        ...player.progress,
        currentLevel: level,
        unlockedLevels: [...player.progress.unlockedLevels, level],
      };

      await PlayerApi.updatePlayer(userId, { progress: updatedProgress });
      return updatedProgress;
    } catch (error) {
      console.error("PlayerApi.unlockLevel error:", error);
      throw error;
    }
  },

  // Pay unlock fee for a level (persisted)
  payUnlockFee: async (userId, level, fee) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const paidFees = player.progress.paidFees || [];

      if (paidFees.includes(level)) {
        console.log("Fee already paid for level:", level);
        return player.progress;
      }

      if (fee > 0 && player.alabastru.current < fee) {
        throw new Error("Insufficient alabastru for fee");
      }

      // Deduct fee if not free
      if (fee > 0) {
        await PlayerApi.updateAlabastru(
          userId,
          -fee,
          "unlock_fee",
          String(level)
        );
      }

      // Save paid fee
      const updatedProgress = {
        ...player.progress,
        paidFees: [...paidFees, level],
      };

      await PlayerApi.updatePlayer(userId, { progress: updatedProgress });
      console.log("Fee paid and saved for level:", level);
      return updatedProgress;
    } catch (error) {
      console.error("PlayerApi.payUnlockFee error:", error);
      throw error;
    }
  },

  // Get paid fees for a player
  getPaidFees: async (userId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      return player.progress.paidFees || [];
    } catch (error) {
      console.error("PlayerApi.getPaidFees error:", error);
      return [];
    }
  },

  // Belzy: Record victory or defeat
  // IMPORTANT: Adăugăm level la encounteredAt INDIFERENT de rezultat (1 singură dată pe level)
  recordBelzyEncounter: async (userId, level, playerWon) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const belzy = player.belzy || {
        defeatedAt: [],
        encounteredAt: [], // TOATE nivelele unde Belzy a apărut
        victories: 0,
        defeats: 0,
        health: 100,
        pendingBelzyLevel: null, // Level unde Belzy așteaptă (pentru refresh)
        pendingFeeMultiplier: 1, // Multiplicator pentru fee (x2 când pierzi)
      };

      // Adaugă level la encounteredAt (Belzy nu va mai apărea la acest level)
      const newEncounteredAt = belzy.encounteredAt?.includes(level)
        ? belzy.encounteredAt
        : [...(belzy.encounteredAt || []), level];

      const updatedBelzy = {
        ...belzy,
        encounteredAt: newEncounteredAt, // Belzy a apărut aici (nu mai apare)
        defeatedAt: playerWon ? [...belzy.defeatedAt, level] : belzy.defeatedAt,
        victories: playerWon ? belzy.victories + 1 : belzy.victories,
        defeats: playerWon ? belzy.defeats : belzy.defeats + 1,
        pendingBelzyLevel: null, // Clear pending - encounter completat
        pendingFeeMultiplier: playerWon ? 1 : 2, // x2 dacă ai pierdut
      };

      await PlayerApi.updatePlayer(userId, { belzy: updatedBelzy });
      return updatedBelzy;
    } catch (error) {
      console.error("PlayerApi.recordBelzyEncounter error:", error);
      throw error;
    }
  },

  // Setează pending Belzy (când fee e plătit dar Belzy nu a fost încă înfruntat)
  setPendingBelzy: async (userId, level) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const belzy = player.belzy || {
        defeatedAt: [],
        encounteredAt: [],
        victories: 0,
        defeats: 0,
        health: 100,
        pendingBelzyLevel: null,
        pendingFeeMultiplier: 1,
      };

      const updatedBelzy = {
        ...belzy,
        pendingBelzyLevel: level,
      };

      await PlayerApi.updatePlayer(userId, { belzy: updatedBelzy });
      console.log("Pending Belzy set for level:", level);
      return updatedBelzy;
    } catch (error) {
      console.error("PlayerApi.setPendingBelzy error:", error);
      throw error;
    }
  },

  // Clear pending Belzy
  clearPendingBelzy: async (userId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      if (player.belzy) {
        const updatedBelzy = {
          ...player.belzy,
          pendingBelzyLevel: null,
        };
        await PlayerApi.updatePlayer(userId, { belzy: updatedBelzy });
      }
    } catch (error) {
      console.error("PlayerApi.clearPendingBelzy error:", error);
    }
  },

  // Salvează pedeapsa pending (pentru când user-ul iese în timpul roții)
  setPendingPunishment: async (userId, level, punishment) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const belzy = player.belzy || {};
      const updatedBelzy = {
        ...belzy,
        pendingPunishment: { level, punishment, timestamp: Date.now() },
      };
      await PlayerApi.updatePlayer(userId, { belzy: updatedBelzy });
      console.log("Pending punishment saved:", punishment?.id);
      return updatedBelzy;
    } catch (error) {
      console.error("PlayerApi.setPendingPunishment error:", error);
      throw error;
    }
  },

  // Obține pedeapsa pending
  getPendingPunishment: async (userId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      return player.belzy?.pendingPunishment || null;
    } catch (error) {
      console.error("PlayerApi.getPendingPunishment error:", error);
      return null;
    }
  },

  // Șterge pedeapsa pending (după ce a fost aplicată)
  clearPendingPunishment: async (userId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      if (player.belzy?.pendingPunishment) {
        const updatedBelzy = {
          ...player.belzy,
          pendingPunishment: null,
        };
        await PlayerApi.updatePlayer(userId, { belzy: updatedBelzy });
      }
    } catch (error) {
      console.error("PlayerApi.clearPendingPunishment error:", error);
    }
  },

  // Reset paid fee for a level (used when Belzy punishes player)
  resetFeeForLevel: async (userId, level) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const paidFees = player.progress.paidFees || [];

      const updatedProgress = {
        ...player.progress,
        paidFees: paidFees.filter((l) => l !== level),
      };

      await PlayerApi.updatePlayer(userId, { progress: updatedProgress });
      console.log("Fee reset for level:", level);
      return updatedProgress;
    } catch (error) {
      console.error("PlayerApi.resetFeeForLevel error:", error);
      throw error;
    }
  },

  completeStage: async (userId, stage) => {
    try {
      const player = await PlayerApi.getPlayer(userId);

      if (player.progress.completedStages.includes(stage)) {
        return player;
      }

      const updatedProgress = {
        ...player.progress,
        completedStages: [...player.progress.completedStages, stage],
      };

      const updatedAchievements = {
        ...player.achievements,
        unlocked: [...player.achievements.unlocked, `stage_${stage}_complete`],
        unlockedAt: {
          ...player.achievements.unlockedAt,
          [`stage_${stage}_complete`]: new Date().toISOString(),
        },
      };

      const updatedCollection = {
        ...player.collection,
        trees: [...player.collection.trees, `tree_stage_${stage}`],
        trophies: [...player.collection.trophies, `trophy_stage_${stage}`],
      };

      await PlayerApi.updatePlayer(userId, {
        progress: updatedProgress,
        achievements: updatedAchievements,
        collection: updatedCollection,
      });

      return await PlayerApi.getPlayer(userId);
    } catch (error) {
      console.error("PlayerApi.completeStage error:", error);
      throw error;
    }
  },

  // ========== INVENTORY MANAGEMENT - SCALABIL CU CANTITĂȚI ==========

  /**
   * Adaugă un item în inventar (cu cantitate)
   * @param {string} userId
   * @param {string} itemType - "tools" sau "items"
   * @param {string} itemId - ID-ul itemului (ex: "hammer")
   * @param {number} quantity - Cantitatea de adăugat (default: 1)
   */
  addToInventory: async (userId, itemType, itemId, quantity = 1) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const inventory = {
        tools: { ...(player.inventory?.tools || {}) },
        items: { ...(player.inventory?.items || {}) },
      };

      if (itemType === "tools") {
        inventory.tools[itemId] = (inventory.tools[itemId] || 0) + quantity;
      } else {
        inventory.items[itemId] = (inventory.items[itemId] || 0) + quantity;
      }

      await PlayerApi.updatePlayer(userId, { inventory });
      console.log(`Added ${quantity}x ${itemId} to inventory`);
      return inventory;
    } catch (error) {
      console.error("PlayerApi.addToInventory error:", error);
      throw error;
    }
  },

  /**
   * Scade un item din inventar (când e folosit)
   * @param {string} userId
   * @param {string} itemType - "tools" sau "items"
   * @param {string} itemId - ID-ul itemului
   * @param {number} quantity - Cantitatea de scăzut (default: 1)
   * @returns {boolean} - true dacă a avut suficiente, false dacă nu
   */
  useInventoryItem: async (userId, itemType, itemId, quantity = 1) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const inventory = {
        tools: { ...(player.inventory?.tools || {}) },
        items: { ...(player.inventory?.items || {}) },
      };

      const category = itemType === "tools" ? inventory.tools : inventory.items;
      const currentQuantity = category[itemId] || 0;

      if (currentQuantity < quantity) {
        console.log(
          `Not enough ${itemId}: have ${currentQuantity}, need ${quantity}`
        );
        return false;
      }

      if (itemType === "tools") {
        inventory.tools[itemId] = currentQuantity - quantity;
        // Șterge dacă e 0
        if (inventory.tools[itemId] <= 0) {
          delete inventory.tools[itemId];
        }
      } else {
        inventory.items[itemId] = currentQuantity - quantity;
        if (inventory.items[itemId] <= 0) {
          delete inventory.items[itemId];
        }
      }

      await PlayerApi.updatePlayer(userId, { inventory });
      console.log(
        `Used ${quantity}x ${itemId}, remaining: ${
          inventory.tools[itemId] || 0
        }`
      );
      return true;
    } catch (error) {
      console.error("PlayerApi.useInventoryItem error:", error);
      throw error;
    }
  },

  /**
   * Obține cantitatea unui item din inventar
   * @param {string} userId
   * @param {string} itemType - "tools" sau "items"
   * @param {string} itemId - ID-ul itemului
   * @returns {number} - Cantitatea (0 dacă nu există)
   */
  getInventoryQuantity: async (userId, itemType, itemId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const category =
        itemType === "tools"
          ? player.inventory?.tools || {}
          : player.inventory?.items || {};
      return category[itemId] || 0;
    } catch (error) {
      console.error("PlayerApi.getInventoryQuantity error:", error);
      return 0;
    }
  },

  /**
   * Verifică dacă player-ul are suficient dintr-un item
   * @param {string} userId
   * @param {string} itemType - "tools" sau "items"
   * @param {string} itemId - ID-ul itemului
   * @param {number} requiredQuantity - Cantitatea necesară (default: 1)
   * @returns {boolean}
   */
  hasInventoryItem: async (userId, itemType, itemId, requiredQuantity = 1) => {
    const quantity = await PlayerApi.getInventoryQuantity(
      userId,
      itemType,
      itemId
    );
    return quantity >= requiredQuantity;
  },

  /**
   * Obține tot inventarul playerului
   * @param {string} userId
   * @returns {object} - { tools: { hammer: 2 }, items: { potion: 5 } }
   */
  getInventory: async (userId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      return {
        tools: player.inventory?.tools || {},
        items: player.inventory?.items || {},
      };
    } catch (error) {
      console.error("PlayerApi.getInventory error:", error);
      return { tools: {}, items: {} };
    }
  },

  unlockAchievement: async (userId, achievementId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);

      if (player.achievements.unlocked.includes(achievementId)) {
        return player.achievements;
      }

      const updatedAchievements = {
        unlocked: [...player.achievements.unlocked, achievementId],
        unlockedAt: {
          ...player.achievements.unlockedAt,
          [achievementId]: new Date().toISOString(),
        },
      };

      await PlayerApi.updatePlayer(userId, {
        achievements: updatedAchievements,
      });
      return updatedAchievements;
    } catch (error) {
      console.error("PlayerApi.unlockAchievement error:", error);
      throw error;
    }
  },

  updateStats: async (userId, statsUpdate) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const updatedStats = {
        ...player.stats,
        ...statsUpdate,
      };

      await PlayerApi.updatePlayer(userId, { stats: updatedStats });
      return updatedStats;
    } catch (error) {
      console.error("PlayerApi.updateStats error:", error);
      throw error;
    }
  },

  // ========== ACTIVE BUFFS MANAGEMENT ==========

  /**
   * Obține buff-urile active ale playerului
   */
  getActiveBuffs: async (userId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      return player.activeBuffs || { shield: false, sword: false };
    } catch (error) {
      console.error("PlayerApi.getActiveBuffs error:", error);
      return { shield: false, sword: false };
    }
  },

  /**
   * Setează un buff activ
   * @param {string} buffType - 'shield' sau 'sword'
   * @param {boolean} active - true pentru activare, false pentru dezactivare
   */
  setActiveBuff: async (userId, buffType, active) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const activeBuffs = {
        ...(player.activeBuffs || { shield: false, sword: false }),
        [buffType]: active,
      };

      await PlayerApi.updatePlayer(userId, { activeBuffs });
      console.log(`Buff ${buffType} set to ${active}`);
      return activeBuffs;
    } catch (error) {
      console.error("PlayerApi.setActiveBuff error:", error);
      throw error;
    }
  },

  // ========== VILLAINS MANAGEMENT ==========

  /**
   * Obține starea tuturor villain-ilor
   */
  getVillains: async (userId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      return (
        player.villains || {
          belzy: {
            status: "alive",
            killedAt: null,
            killedWith: null,
            banishedUntil: null,
          },
        }
      );
    } catch (error) {
      console.error("PlayerApi.getVillains error:", error);
      return {
        belzy: {
          status: "alive",
          killedAt: null,
          killedWith: null,
          banishedUntil: null,
        },
      };
    }
  },

  /**
   * Obține starea unui villain specific
   */
  getVillainStatus: async (userId, villainId) => {
    try {
      const villains = await PlayerApi.getVillains(userId);
      return villains[villainId] || { status: "alive" };
    } catch (error) {
      console.error("PlayerApi.getVillainStatus error:", error);
      return { status: "alive" };
    }
  },

  /**
   * Actualizează starea unui villain
   */
  updateVillainStatus: async (userId, villainId, updates) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const villains = player.villains || {
        belzy: {
          status: "alive",
          killedAt: null,
          killedWith: null,
          banishedUntil: null,
        },
      };

      const updatedVillains = {
        ...villains,
        [villainId]: {
          ...villains[villainId],
          ...updates,
        },
      };

      await PlayerApi.updatePlayer(userId, { villains: updatedVillains });
      console.log(`Villain ${villainId} updated:`, updates);
      return updatedVillains[villainId];
    } catch (error) {
      console.error("PlayerApi.updateVillainStatus error:", error);
      throw error;
    }
  },

  /**
   * Ucide un villain (cu sabia sau altă armă)
   */
  killVillain: async (userId, villainId, weapon = "sword") => {
    try {
      const updates = {
        status: "dead",
        killedAt: new Date().toISOString(),
        killedWith: weapon,
      };

      return await PlayerApi.updateVillainStatus(userId, villainId, updates);
    } catch (error) {
      console.error("PlayerApi.killVillain error:", error);
      throw error;
    }
  },

  /**
   * Exilează temporar un villain
   * @param {number} days - Numărul de zile de exil (0 = pentru totdeauna)
   */
  banishVillain: async (userId, villainId, days = 3) => {
    try {
      const banishedUntil =
        days > 0
          ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
          : null;

      const updates = {
        status: days > 0 ? "banished_temp" : "banished_forever",
        banishedUntil,
      };

      return await PlayerApi.updateVillainStatus(userId, villainId, updates);
    } catch (error) {
      console.error("PlayerApi.banishVillain error:", error);
      throw error;
    }
  },

  /**
   * Verifică dacă un villain este activ (poate apărea)
   */
  isVillainActive: async (userId, villainId) => {
    try {
      const villain = await PlayerApi.getVillainStatus(userId, villainId);

      if (villain.status === "dead") return false;
      if (villain.status === "banished_forever") return false;
      if (villain.status === "banished_temp" && villain.banishedUntil) {
        const banishEnd = new Date(villain.banishedUntil);
        if (banishEnd > new Date()) return false;

        // Exilul a expirat, resetează la alive
        await PlayerApi.updateVillainStatus(userId, villainId, {
          status: "alive",
          banishedUntil: null,
        });
      }

      return true;
    } catch (error) {
      console.error("PlayerApi.isVillainActive error:", error);
      return true; // Default to active if error
    }
  },

  // ========== STAGE INTROS MANAGEMENT ==========

  hasWatchedStageIntro: async (userId, stageId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const watched = player.progress?.stageIntrosWatched || [];
      return watched.includes(stageId);
    } catch (error) {
      console.error("PlayerApi.hasWatchedStageIntro error:", error);
      return false;
    }
  },

  markStageIntroWatched: async (userId, stageId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const watched = player.progress?.stageIntrosWatched || [];
      
      if (watched.includes(stageId)) return player.progress;
      
      const updatedProgress = {
        ...player.progress,
        stageIntrosWatched: [...watched, stageId],
      };
      
      await PlayerApi.updatePlayer(userId, { progress: updatedProgress });
      return updatedProgress;
    } catch (error) {
      console.error("PlayerApi.markStageIntroWatched error:", error);
      throw error;
    }
  },

  // ========== DAILY REWARD MANAGEMENT ==========

  updateDailyReward: async (userId, dailyRewardData) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const updatedDailyReward = {
        ...(player.dailyReward || {}),
        ...dailyRewardData,
      };
      
      await PlayerApi.updatePlayer(userId, { dailyReward: updatedDailyReward });
      return updatedDailyReward;
    } catch (error) {
      console.error("PlayerApi.updateDailyReward error:", error);
      throw error;
    }
  },

  getDailyReward: async (userId) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      return player.dailyReward || {
        claimedDays: [],
        currentDay: 1,
        lastClaimDate: null,
      };
    } catch (error) {
      console.error("PlayerApi.getDailyReward error:", error);
      return { claimedDays: [], currentDay: 1, lastClaimDate: null };
    }
  },

  // DEV ONLY: Reset player data for testing
  resetPlayerForTesting: async (userId) => {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
      console.log("Player data reset for testing - userId:", userId);
      return true;
    } catch (error) {
      console.error("PlayerApi.resetPlayerForTesting error:", error);
      throw error;
    }
  },
};
