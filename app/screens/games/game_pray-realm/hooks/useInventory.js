import { useState, useCallback, useEffect } from "react";
import { PlayerApi } from "../api/playerApi";
import { ShopApi } from "../api/shopApi";
import { TOOL_TYPES, getRequiredToolForLevel, TOOLS_CONFIG } from "../data/shopItems";

/**
 * Hook pentru gestionarea inventarului playerului
 * Scalabil pentru orice tip de tool sau item
 */
export const useInventory = (userId) => {
  const [inventory, setInventory] = useState({ tools: {}, items: {} });
  const [loading, setLoading] = useState(true);

  // Încarcă inventarul din storage
  const loadInventory = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const inv = await PlayerApi.getInventory(userId);
      setInventory(inv);
    } catch (error) {
      console.error("useInventory.loadInventory error:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Încarcă la mount și când se schimbă userId
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  /**
   * Obține cantitatea unui tool
   */
  const getToolQuantity = useCallback(
    (toolId) => {
      return inventory.tools[toolId] || 0;
    },
    [inventory.tools]
  );

  /**
   * Verifică dacă player-ul are cel puțin 1 din tool
   */
  const hasTool = useCallback(
    (toolId) => {
      return getToolQuantity(toolId) > 0;
    },
    [getToolQuantity]
  );

  /**
   * Verifică dacă un nivel necesită un tool și dacă player-ul îl are
   * @param {number} level - Nivelul curent
   * @returns {{ required: boolean, hasTool: boolean, tool: object|null }}
   */
  const checkToolRequirement = useCallback(
    (level) => {
      const requiredTool = getRequiredToolForLevel(level);
      if (!requiredTool) {
        return { required: false, hasTool: true, tool: null };
      }
      return {
        required: true,
        hasTool: hasTool(requiredTool.id),
        tool: requiredTool,
      };
    },
    [hasTool]
  );

  /**
   * Folosește un tool (scade din inventar)
   */
  const useTool = useCallback(
    async (toolId, quantity = 1) => {
      try {
        const success = await PlayerApi.useInventoryItem(userId, "tools", toolId, quantity);
        if (success) {
          // Update local state
          setInventory((prev) => ({
            ...prev,
            tools: {
              ...prev.tools,
              [toolId]: Math.max(0, (prev.tools[toolId] || 0) - quantity),
            },
          }));
        }
        return success;
      } catch (error) {
        console.error("useInventory.useTool error:", error);
        return false;
      }
    },
    [userId]
  );

  /**
   * Adaugă un tool (după cumpărare)
   */
  const addTool = useCallback(
    async (toolId, quantity = 1) => {
      try {
        await PlayerApi.addToInventory(userId, "tools", toolId, quantity);
        // Update local state
        setInventory((prev) => ({
          ...prev,
          tools: {
            ...prev.tools,
            [toolId]: (prev.tools[toolId] || 0) + quantity,
          },
        }));
        return true;
      } catch (error) {
        console.error("useInventory.addTool error:", error);
        return false;
      }
    },
    [userId]
  );

  /**
   * Cumpără un tool din shop
   */
  const purchaseTool = useCallback(
    async (toolId, quantity = 1, customPrice = null) => {
      try {
        const result = await ShopApi.purchaseItem(userId, toolId, quantity, customPrice);
        if (result.success) {
          // Update local state
          setInventory((prev) => ({
            ...prev,
            tools: {
              ...prev.tools,
              [toolId]: (prev.tools[toolId] || 0) + quantity,
            },
          }));
        }
        return result;
      } catch (error) {
        console.error("useInventory.purchaseTool error:", error);
        throw error;
      }
    },
    [userId]
  );

  /**
   * Verifică dacă player-ul poate folosi un nivel (are tool-ul necesar)
   */
  const canUseLevel = useCallback(
    (level) => {
      const { required, hasTool: has } = checkToolRequirement(level);
      return !required || has;
    },
    [checkToolRequirement]
  );

  return {
    inventory,
    loading,
    loadInventory,
    getToolQuantity,
    hasTool,
    checkToolRequirement,
    useTool,
    addTool,
    purchaseTool,
    canUseLevel,
    // Shortcut pentru hammer
    hammerCount: inventory.tools[TOOL_TYPES.HAMMER] || 0,
    hasHammer: (inventory.tools[TOOL_TYPES.HAMMER] || 0) > 0,
  };
};

export default useInventory;
