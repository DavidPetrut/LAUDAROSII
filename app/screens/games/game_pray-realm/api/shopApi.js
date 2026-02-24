import { PlayerApi } from "./playerApi";
import { SHOP_ITEMS, getItemById, getItemPrice, ITEM_CATEGORIES } from "../data/shopItems";

export const ShopApi = {
  getAllItems: async () => {
    return SHOP_ITEMS;
  },

  getItemsByCategory: async (category) => {
    return SHOP_ITEMS.filter((item) => item.category === category);
  },

  canAffordItem: async (userId, itemId, customPrice = null) => {
    try {
      const player = await PlayerApi.getPlayer(userId);
      const price = customPrice ?? getItemPrice(itemId);
      return player.alabastru.current >= price;
    } catch (error) {
      console.error("ShopApi.canAffordItem error:", error);
      return false;
    }
  },

  /**
   * Verifică dacă player-ul are cel puțin 1 din item
   */
  hasItem: async (userId, itemId) => {
    try {
      const quantity = await PlayerApi.getInventoryQuantity(
        userId,
        getItemById(itemId)?.category === ITEM_CATEGORIES.TOOLS ? "tools" : "items",
        itemId
      );
      return quantity > 0;
    } catch (error) {
      console.error("ShopApi.hasItem error:", error);
      return false;
    }
  },

  /**
   * Obține cantitatea unui item din inventar
   */
  getItemQuantity: async (userId, itemId) => {
    try {
      const item = getItemById(itemId);
      const itemType = item?.category === ITEM_CATEGORIES.TOOLS ? "tools" : "items";
      return await PlayerApi.getInventoryQuantity(userId, itemType, itemId);
    } catch (error) {
      console.error("ShopApi.getItemQuantity error:", error);
      return 0;
    }
  },

  /**
   * Cumpără un item (cu preț opțional custom pentru prețuri dinamice)
   */
  purchaseItem: async (userId, itemId, quantity = 1, customPrice = null) => {
    try {
      const item = getItemById(itemId);
      if (!item) {
        throw new Error("Item not found");
      }

      const unitPrice = customPrice ?? item.price;
      const totalPrice = unitPrice * quantity;

      const player = await PlayerApi.getPlayer(userId);
      if (player.alabastru.current < totalPrice) {
        throw new Error("Insufficient alabastru");
      }

      // Deduct alabastru
      await PlayerApi.updateAlabastru(userId, -totalPrice, "shop", itemId);

      // Add to inventory cu cantitatea specificată
      const itemType = item.category === ITEM_CATEGORIES.TOOLS ? "tools" : "items";
      await PlayerApi.addToInventory(userId, itemType, itemId, quantity);

      return {
        success: true,
        item,
        quantity,
        totalPrice,
        message: `Successfully purchased ${quantity}x ${item.name}`,
      };
    } catch (error) {
      console.error("ShopApi.purchaseItem error:", error);
      throw error;
    }
  },

  /**
   * Folosește un item din inventar
   */
  useItem: async (userId, itemId, quantity = 1) => {
    try {
      const item = getItemById(itemId);
      if (!item) {
        throw new Error("Item not found");
      }

      const itemType = item.category === ITEM_CATEGORIES.TOOLS ? "tools" : "items";
      const success = await PlayerApi.useInventoryItem(userId, itemType, itemId, quantity);

      if (!success) {
        throw new Error(`Not enough ${item.name}`);
      }

      return {
        success: true,
        item,
        message: `Used ${quantity}x ${item.name}`,
      };
    } catch (error) {
      console.error("ShopApi.useItem error:", error);
      throw error;
    }
  },

  getPlayerInventory: async (userId) => {
    try {
      return await PlayerApi.getInventory(userId);
    } catch (error) {
      console.error("ShopApi.getPlayerInventory error:", error);
      return { tools: {}, items: {} };
    }
  },

  getAvailableItems: async (userId) => {
    // Toate itemele sunt acum disponibile (pot fi cumpărate de mai multe ori)
    return SHOP_ITEMS;
  },
};
