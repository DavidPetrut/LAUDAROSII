/**
 * BELZY CONFIGURATION
 * Central config for the Belzy antagonist character
 */

// Levels where Belzy appears (after paying fee)
export const BELZY_LEVELS = [4, 7, 13, 17, 22, 24];

// Level-specific settings (questions count and timer)
export const BELZY_LEVEL_CONFIG = {
  4: { questions: 2, timer: 20 },
  7: { questions: 3, timer: 10 },
  13: { questions: 3, timer: 7 },
  17: { questions: 4, timer: 10 },
  22: { questions: 5, timer: 10 },
  24: { questions: 6, timer: 8 },
};

// Get config for a specific level
export const getLevelConfig = (level) => {
  return BELZY_LEVEL_CONFIG[level] || { questions: 3, timer: 10 };
};

// Belzy states/moods
export const BELZY_STATES = {
  HAPPY: "happy", // Default when appearing
  ANGRY: "angry", // When player wins
  LAUGH: "laugh", // When player loses (belzy_laugh.png)
  SCARED: "scared", // Future use
};

// Check if Belzy should appear at a level
// IMPORTANT: Belzy apare O SINGURĂ DATĂ pe level (fie că câștigi sau pierzi)
export const shouldBelzyAppear = (level, encounteredAt = []) => {
  // Belzy appears if: level is in BELZY_LEVELS AND player hasn't encountered Belzy at this level yet
  // encounteredAt = toate nivelele unde Belzy a apărut deja (câștigate SAU pierdute)
  return BELZY_LEVELS.includes(level) && !encounteredAt.includes(level);
};

// Duration to show result screen (in ms)
export const RESULT_DISPLAY_TIME = 3000;

// Belzy stats for future health system
export const BELZY_INITIAL_STATS = {
  maxHealth: 100,
  currentHealth: 100,
  level: 1,
  attackPower: 10,
  defense: 5,
};

// Messages Belzy says
export const BELZY_MESSAGES = {
  greeting: [
    "Haha! Credeai că poți trece așa ușor?",
    "Oprește-te! Nu te las să avansezi!",
    "Ei, ei, ei... unde crezi că te duci?",
    "Am o surpriză pentru tine!",
    "Să vedem cât de deștept ești!",
  ],
  victory: "Arghhh!!!!",
  defeat: "Te-am prins!!",
  punishment: "Acum trebuie să plătești din nou taxa... de 2 ori!",
};

// Get a random greeting
export const getRandomGreeting = () => {
  const greetings = BELZY_MESSAGES.greeting;
  return greetings[Math.floor(Math.random() * greetings.length)];
};
