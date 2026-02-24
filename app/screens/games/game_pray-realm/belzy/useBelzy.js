import { useState, useCallback } from "react";
import { shouldBelzyAppear, BELZY_LEVELS } from "./belzyConfig";
import { getActivePunishment, applyPunishment } from "./belzyRewards";
import { PlayerApi } from "../api/playerApi";
import { VILLAIN_STATUS, VILLAINS } from "./belzyVillainState";

/**
 * Hook for managing Belzy encounters
 *
 * IMPORTANT:
 * - Belzy apare O SINGURĂ DATĂ pe level (fie că câștigi sau pierzi)
 * - encounteredAt = toate nivelele unde Belzy a apărut deja
 * - Când pierzi, fee-ul se dublează (x2)
 * - pendingBelzyLevel = pentru a re-triggera Belzy la refresh
 * - Dacă Belzy e mort (villains.belzy.status === 'dead'), nu apare niciodată
 * - Shield protejează de Belzy (1 use)
 * - Sword poate ucide pe Belzy permanent
 */
export const useBelzy = (userId) => {
  const [showBelzy, setShowBelzy] = useState(false);
  const [belzyLevel, setBelzyLevel] = useState(null);
  const [encounteredLevels, setEncounteredLevels] = useState([]); // Toate nivelele unde Belzy a apărut
  const [pendingFeeMultiplier, setPendingFeeMultiplier] = useState(1); // For x2 punishment
  const [belzyStatus, setBelzyStatus] = useState(VILLAIN_STATUS.ALIVE); // Starea lui Belzy

  // Check if Belzy should appear at this level
  // Folosește encounteredLevels (nu defeatedLevels) - Belzy apare O SINGURĂ DATĂ
  // Dacă Belzy e mort, nu apare niciodată
  const checkBelzyTrigger = useCallback(
    (level) => {
      // Dacă Belzy e mort sau exilat, nu apare
      if (belzyStatus !== VILLAIN_STATUS.ALIVE) {
        console.log("Belzy is not alive, skipping:", belzyStatus);
        return false;
      }

      const shouldAppear = shouldBelzyAppear(level, encounteredLevels);
      console.log("Belzy check:", {
        level,
        shouldAppear,
        encounteredLevels,
        belzyStatus,
      });
      return shouldAppear;
    },
    [encounteredLevels, belzyStatus]
  );

  // Trigger Belzy encounter - și persistă pending state pentru refresh
  const triggerBelzy = useCallback(
    async (level) => {
      console.log("Triggering Belzy at level:", level);

      // Persist pending state (pentru cazul de refresh)
      await PlayerApi.setPendingBelzy(userId, level);

      setBelzyLevel(level);
      setShowBelzy(true);
    },
    [userId]
  );

  // Handle encounter result
  const handleBelzyResult = useCallback(
    async (playerWon, level) => {
      console.log("Belzy result:", { playerWon, level });

      try {
        // Record the encounter (adaugă level la encounteredAt - nu va mai apărea)
        const updatedBelzy = await PlayerApi.recordBelzyEncounter(
          userId,
          level,
          playerWon
        );

        // Update local state cu encounteredAt
        setEncounteredLevels(updatedBelzy.encounteredAt || []);

        if (playerWon) {
          // Player defeated Belzy at this level
          setPendingFeeMultiplier(1);
        } else {
          // Player lost - apply punishment (fee x2)
          const punishment = getActivePunishment();

          // Reset the fee for this level - player must pay again
          await PlayerApi.resetFeeForLevel(userId, level);

          // Set multiplier for next fee payment (x2)
          const multiplier = punishment.multiplier || 2;
          setPendingFeeMultiplier(multiplier);

          console.log("Belzy punishment applied - fee multiplier:", multiplier);
        }
      } catch (error) {
        console.error("Error handling Belzy result:", error);
      }

      setShowBelzy(false);
      setBelzyLevel(null);
    },
    [userId]
  );

  // Close Belzy overlay
  const closeBelzy = useCallback(() => {
    setShowBelzy(false);
    setBelzyLevel(null);
  }, []);

  // Load Belzy data from storage (encounteredAt, pendingBelzyLevel, villain status, etc.)
  const loadBelzyData = useCallback(async () => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const belzy = player.belzy;

      // Load villain status
      const villains = player.villains || {};
      const belzyVillain = villains.belzy || { status: VILLAIN_STATUS.ALIVE };
      setBelzyStatus(belzyVillain.status);

      // Dacă Belzy e mort sau exilat, nu încărcăm pending
      if (belzyVillain.status !== VILLAIN_STATUS.ALIVE) {
        console.log("Belzy is not alive:", belzyVillain.status);
        return belzy;
      }

      if (belzy) {
        // Load encounteredAt (toate nivelele unde Belzy a apărut)
        if (belzy.encounteredAt) {
          setEncounteredLevels(belzy.encounteredAt);
        }

        // Load pending fee multiplier
        if (belzy.pendingFeeMultiplier && belzy.pendingFeeMultiplier > 1) {
          setPendingFeeMultiplier(belzy.pendingFeeMultiplier);
        }

        // Check for pending Belzy (player a dat refresh în timpul encounter-ului)
        if (belzy.pendingBelzyLevel) {
          console.log("Pending Belzy found at level:", belzy.pendingBelzyLevel);
          // Re-trigger Belzy
          setBelzyLevel(belzy.pendingBelzyLevel);
          setShowBelzy(true);
        }
      }

      return player.belzy;
    } catch (error) {
      console.error("Error loading Belzy data:", error);
      return null;
    }
  }, [userId]);

  // Alias pentru compatibilitate
  const loadDefeatedLevels = loadBelzyData;

  // Check if level is a Belzy level
  const isBelzyLevel = useCallback((level) => {
    return BELZY_LEVELS.includes(level);
  }, []);

  // Ucide pe Belzy cu sabia (permanent)
  const killBelzy = useCallback(async () => {
    try {
      await PlayerApi.killVillain(userId, VILLAINS.BELZY, "sword");
      setBelzyStatus(VILLAIN_STATUS.DEAD);
      setShowBelzy(false);
      setBelzyLevel(null);

      // Clear pending Belzy
      await PlayerApi.clearPendingBelzy(userId);

      console.log("Belzy has been killed with sword!");
      return true;
    } catch (error) {
      console.error("Error killing Belzy:", error);
      return false;
    }
  }, [userId]);

  // Verifică dacă Belzy e mort
  const isBelzyDeadCheck = useCallback(() => {
    return belzyStatus === VILLAIN_STATUS.DEAD;
  }, [belzyStatus]);

  return {
    showBelzy,
    belzyLevel,
    encounteredLevels, // Toate nivelele unde Belzy a apărut
    pendingFeeMultiplier,
    belzyStatus, // Starea lui Belzy (alive, dead, banished)
    checkBelzyTrigger,
    triggerBelzy,
    handleBelzyResult,
    closeBelzy,
    loadDefeatedLevels, // Alias pentru loadBelzyData
    loadBelzyData,
    isBelzyLevel,
    setPendingFeeMultiplier,
    killBelzy, // Ucide pe Belzy cu sabia
    isBelzyDead: isBelzyDeadCheck, // Verifică dacă Belzy e mort
  };
};

export default useBelzy;
