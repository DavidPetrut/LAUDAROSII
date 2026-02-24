import { useState, useCallback, useEffect } from "react";
import { PlayerApi } from "../api/playerApi";
import { TOOL_TYPES } from "../data/shopItems";

/**
 * Hook pentru gestionarea buff-urilor active pe avatar
 * Buff-urile sunt activate prin drag and drop din toolbar pe avatar
 */
export const useActiveBuffs = (userId) => {
  const [activeBuffs, setActiveBuffs] = useState({
    shield: false,
    sword: false,
  });
  const [loading, setLoading] = useState(true);

  // Încarcă buff-urile din storage
  const loadActiveBuffs = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const buffs = await PlayerApi.getActiveBuffs(userId);
      setActiveBuffs(buffs);
    } catch (error) {
      console.error("useActiveBuffs.loadActiveBuffs error:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Încarcă la mount
  useEffect(() => {
    loadActiveBuffs();
  }, [loadActiveBuffs]);

  /**
   * Activează scutul pe avatar
   * @returns {{ success: boolean, message: string }}
   */
  const activateShield = useCallback(async () => {
    if (activeBuffs.shield) {
      return { success: false, message: "Scut deja activat!" };
    }

    try {
      // Consumă scutul din inventar
      const used = await PlayerApi.useInventoryItem(
        userId,
        "tools",
        TOOL_TYPES.SHIELD,
        1
      );
      if (!used) {
        return { success: false, message: "Nu ai niciun scut în inventar!" };
      }

      // Activează buff-ul
      await PlayerApi.setActiveBuff(userId, "shield", true);
      setActiveBuffs((prev) => ({ ...prev, shield: true }));

      return { success: true, message: "Scutul a fost activat!" };
    } catch (error) {
      console.error("useActiveBuffs.activateShield error:", error);
      return { success: false, message: "Eroare la activarea scutului" };
    }
  }, [userId, activeBuffs.shield]);

  /**
   * Dezactivează scutul (după ce a fost folosit)
   */
  const deactivateShield = useCallback(async () => {
    try {
      await PlayerApi.setActiveBuff(userId, "shield", false);
      setActiveBuffs((prev) => ({ ...prev, shield: false }));
    } catch (error) {
      console.error("useActiveBuffs.deactivateShield error:", error);
    }
  }, [userId]);

  /**
   * Activează sabia pe avatar
   * @returns {{ success: boolean, message: string }}
   */
  const activateSword = useCallback(async () => {
    if (activeBuffs.sword) {
      return { success: false, message: "Sabie deja activată!" };
    }

    try {
      // Consumă sabia din inventar
      const used = await PlayerApi.useInventoryItem(
        userId,
        "tools",
        TOOL_TYPES.SWORD,
        1
      );
      if (!used) {
        return { success: false, message: "Nu ai nicio sabie în inventar!" };
      }

      // Activează buff-ul
      await PlayerApi.setActiveBuff(userId, "sword", true);
      setActiveBuffs((prev) => ({ ...prev, sword: true }));

      return { success: true, message: "Sabia a fost activată!" };
    } catch (error) {
      console.error("useActiveBuffs.activateSword error:", error);
      return { success: false, message: "Eroare la activarea săbiei" };
    }
  }, [userId, activeBuffs.sword]);

  /**
   * Dezactivează sabia (după ce a fost folosită)
   */
  const deactivateSword = useCallback(async () => {
    try {
      await PlayerApi.setActiveBuff(userId, "sword", false);
      setActiveBuffs((prev) => ({ ...prev, sword: false }));
    } catch (error) {
      console.error("useActiveBuffs.deactivateSword error:", error);
    }
  }, [userId]);

  /**
   * Verifică dacă un buff specific este activ
   */
  const hasBuff = useCallback(
    (buffType) => {
      return activeBuffs[buffType] || false;
    },
    [activeBuffs]
  );

  /**
   * Handler pentru drop pe avatar
   * @param {object} item - Item-ul care a fost dropped
   * @returns {{ success: boolean, message: string }}
   */
  const handleAvatarDrop = useCallback(
    async (item) => {
      if (!item?.type) {
        return { success: false, message: "Item invalid" };
      }

      switch (item.type) {
        case TOOL_TYPES.SHIELD:
          return await activateShield();
        case TOOL_TYPES.SWORD:
          return await activateSword();
        default:
          return { success: false, message: "Acest item nu poate fi echipat" };
      }
    },
    [activateShield, activateSword]
  );

  return {
    activeBuffs,
    loading,
    loadActiveBuffs,
    activateShield,
    deactivateShield,
    activateSword,
    deactivateSword,
    hasBuff,
    handleAvatarDrop,
    // Shortcuts
    hasShield: activeBuffs.shield,
    hasSword: activeBuffs.sword,
  };
};

export default useActiveBuffs;
