import { getLevelCost } from "./levelCosts";
import { BREAK_LEVELS } from "../constants/gameConfig";

export const ITEM_CATEGORIES = {
  TOOLS: "TOOLS",
  BOOSTS: "BOOSTS",
  COSMETICS: "COSMETICS",
};

/**
 * TOOL TYPES - pentru scalabilitate
 * Fiecare tool poate fi asociat cu anumite nivele/acțiuni
 */
export const TOOL_TYPES = {
  HAMMER: "hammer",
  SHIELD: "shield",
  SWORD: "sword",
};

/**
 * Definirea tool-urilor și proprietăților lor
 * Scalabil - adaugă noi tool-uri aici
 */
export const TOOLS_CONFIG = {
  [TOOL_TYPES.HAMMER]: {
    id: TOOL_TYPES.HAMMER,
    category: ITEM_CATEGORIES.TOOLS,
    name: "Ciocan",
    description: "Unealta folositoare pentru a sparge intariturile",
    image: "hammer",
    requiredAtLevels: BREAK_LEVELS,
    getPriceForLevel: (level) => {
      const levelCost = getLevelCost(level);
      return Math.floor(levelCost / 2);
    },
    basePrice: 50,
    isStackable: true,
    isConsumable: true,
  },
  [TOOL_TYPES.SHIELD]: {
    id: TOOL_TYPES.SHIELD,
    category: ITEM_CATEGORIES.TOOLS,
    name: "Scut",
    description: "Te protejează împotriva atacurilor arzătoare ale duhurilor rele",
    image: "shield",
    requiredAtLevels: [],
    basePrice: 70,
    isStackable: true,
    isConsumable: true,
  },
  [TOOL_TYPES.SWORD]: {
    id: TOOL_TYPES.SWORD,
    category: ITEM_CATEGORIES.TOOLS,
    name: "Sabie",
    description: "Tăișul ei este ascuțit prin puterea Cuvântului",
    image: "sword",
    requiredAtLevels: [],
    basePrice: 500,
    isStackable: false,
    isConsumable: false,
  },
};

/**
 * SHOP_ITEMS - lista de items pentru magazin
 */
export const SHOP_ITEMS = Object.values(TOOLS_CONFIG).map((tool) => ({
  id: tool.id,
  category: tool.category,
  name: tool.name,
  description: tool.description,
  price: tool.basePrice,
  image: tool.image,
  isStackable: tool.isStackable,
  isConsumable: tool.isConsumable,
}));

export const getItemsByCategory = (category) => {
  return SHOP_ITEMS.filter((item) => item.category === category);
};

export const getItemById = (id) => {
  return SHOP_ITEMS.find((item) => item.id === id);
};

export const getItemPrice = (id) => {
  const item = getItemById(id);
  return item?.price ?? 0;
};

/**
 * Obține tool-ul necesar pentru un nivel specific
 * @param {number} level - Nivelul curent
 * @returns {object|null} - Tool config sau null dacă nu e necesar
 */
export const getRequiredToolForLevel = (level) => {
  for (const tool of Object.values(TOOLS_CONFIG)) {
    if (tool.requiredAtLevels?.includes(level)) {
      return tool;
    }
  }
  return null;
};

/**
 * Verifică dacă un nivel necesită un tool specific
 * @param {number} level - Nivelul curent
 * @param {string} toolId - ID-ul tool-ului
 * @returns {boolean}
 */
export const levelRequiresTool = (level, toolId) => {
  const tool = TOOLS_CONFIG[toolId];
  return tool?.requiredAtLevels?.includes(level) ?? false;
};

/**
 * Obține prețul unui tool pentru un nivel specific
 * @param {string} toolId - ID-ul tool-ului
 * @param {number} level - Nivelul pentru care se calculează prețul
 * @returns {number}
 */
export const getToolPriceForLevel = (toolId, level) => {
  const tool = TOOLS_CONFIG[toolId];
  if (tool?.getPriceForLevel) {
    return tool.getPriceForLevel(level);
  }
  return tool?.basePrice ?? 0;
};
