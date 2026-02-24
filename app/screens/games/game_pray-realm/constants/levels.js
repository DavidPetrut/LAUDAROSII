// Reveal progresiv la nivele cheie (20% per break level)
export const REVEAL_THRESHOLDS = [
  { level: 1, reveal: 0 }, // Start - piatra 100%
  { level: 5, reveal: 0.2 }, // 20% reveal
  { level: 10, reveal: 0.4 }, // 40% reveal
  { level: 15, reveal: 0.6 }, // 60% reveal
  { level: 20, reveal: 0.8 }, // 80% reveal
  { level: 25, reveal: 1 }, // 100% reveal - fully revealed
];

export const INITIAL_LEVEL = 1;
export const INITIAL_TARGET_LEVEL = 2;
