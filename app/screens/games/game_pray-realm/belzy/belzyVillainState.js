import { PlayerApi } from "../api/playerApi";

/**
 * Villain State Management
 * Gestionează starea villain-ilor în joc (Belzy, și viitori villain-i)
 *
 * Status-uri posibile:
 * - 'alive' - villain activ, poate apărea
 * - 'dead' - villain mort permanent
 * - 'banished_temp' - exilat temporar (banishedUntil)
 * - 'banished_forever' - exilat permanent
 */

export const VILLAIN_STATUS = {
  ALIVE: "alive",
  DEAD: "dead",
  BANISHED_TEMP: "banished_temp",
  BANISHED_FOREVER: "banished_forever",
};

export const VILLAINS = {
  BELZY: "belzy",
  // Viitori villain-i pot fi adăugați aici
};

/**
 * Verifică dacă un villain poate apărea (este activ)
 */
export const isVillainActive = async (userId, villainId) => {
  return await PlayerApi.isVillainActive(userId, villainId);
};

/**
 * Verifică dacă Belzy este mort
 */
export const isBelzyDead = async (userId) => {
  try {
    const villain = await PlayerApi.getVillainStatus(userId, VILLAINS.BELZY);
    return villain.status === VILLAIN_STATUS.DEAD;
  } catch (error) {
    console.error("isBelzyDead error:", error);
    return false;
  }
};

/**
 * Ucide pe Belzy cu sabia
 */
export const killBelzyWithSword = async (userId) => {
  try {
    await PlayerApi.killVillain(userId, VILLAINS.BELZY, "sword");
    console.log("Belzy has been killed with sword!");
    return true;
  } catch (error) {
    console.error("killBelzyWithSword error:", error);
    return false;
  }
};

/**
 * Exilează pe Belzy temporar (pentru X zile)
 */
export const banishBelzyTemp = async (userId, days = 3) => {
  try {
    await PlayerApi.banishVillain(userId, VILLAINS.BELZY, days);
    console.log(`Belzy has been banished for ${days} days!`);
    return true;
  } catch (error) {
    console.error("banishBelzyTemp error:", error);
    return false;
  }
};

/**
 * Exilează pe Belzy permanent
 */
export const banishBelzyForever = async (userId) => {
  try {
    await PlayerApi.banishVillain(userId, VILLAINS.BELZY, 0);
    console.log("Belzy has been banished forever!");
    return true;
  } catch (error) {
    console.error("banishBelzyForever error:", error);
    return false;
  }
};

/**
 * Readuce pe Belzy la viață (pentru debugging sau evenimente speciale)
 */
export const reviveBelzy = async (userId) => {
  try {
    await PlayerApi.updateVillainStatus(userId, VILLAINS.BELZY, {
      status: VILLAIN_STATUS.ALIVE,
      killedAt: null,
      killedWith: null,
      banishedUntil: null,
    });
    console.log("Belzy has been revived!");
    return true;
  } catch (error) {
    console.error("reviveBelzy error:", error);
    return false;
  }
};

/**
 * Obține detalii despre starea lui Belzy
 */
export const getBelzyStatus = async (userId) => {
  try {
    return await PlayerApi.getVillainStatus(userId, VILLAINS.BELZY);
  } catch (error) {
    console.error("getBelzyStatus error:", error);
    return { status: VILLAIN_STATUS.ALIVE };
  }
};

export default {
  VILLAIN_STATUS,
  VILLAINS,
  isVillainActive,
  isBelzyDead,
  killBelzyWithSword,
  banishBelzyTemp,
  banishBelzyForever,
  reviveBelzy,
  getBelzyStatus,
};
