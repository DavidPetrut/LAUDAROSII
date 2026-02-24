/**
 * Belzy Punishments Configuration
 * 9 fețe pe roată: 4 pedepse x 2 fețe + 1 "Fără pedeapsă"
 */

export const WHEEL_PUNISHMENT_TYPES = {
  TAX_X2: "TAX_X2",
  GO_BACK: "GO_BACK",
  MINUS_100: "MINUS_100",
  MINUS_75: "MINUS_75",
  NO_PUNISHMENT: "NO_PUNISHMENT",
};

export const WHEEL_PUNISHMENTS = {
  [WHEEL_PUNISHMENT_TYPES.TAX_X2]: {
    id: WHEEL_PUNISHMENT_TYPES.TAX_X2,
    label: "TAXA X2",
    color: "#E74C3C",
    description: "Replătești taxa de 2 ori!",
    belzyMessage: "Trebuie să replătești taxa de level din nou, de 2 ori!",
  },
  [WHEEL_PUNISHMENT_TYPES.GO_BACK]: {
    id: WHEEL_PUNISHMENT_TYPES.GO_BACK,
    label: "ÎNAPOI",
    color: "#8E44AD",
    description: "Te trimit înapoi 2 nivele!",
    belzyMessage: "Înapoi cu tine! Hai să vedem cum refaci drumul!",
  },
  [WHEEL_PUNISHMENT_TYPES.MINUS_100]: {
    id: WHEEL_PUNISHMENT_TYPES.MINUS_100,
    label: "-100",
    color: "#D35400",
    description: "Pierzi 100 Alabastru!",
    belzyMessage: "Mmm, ce gustos e alabastrul tău! Îmi iau 100!",
  },
  [WHEEL_PUNISHMENT_TYPES.MINUS_75]: {
    id: WHEEL_PUNISHMENT_TYPES.MINUS_75,
    label: "-75",
    color: "#C0392B",
    description: "Pierzi 75 Alabastru!",
    belzyMessage: "Puțin alabastru pentru mine... doar 75!",
  },
  [WHEEL_PUNISHMENT_TYPES.NO_PUNISHMENT]: {
    id: WHEEL_PUNISHMENT_TYPES.NO_PUNISHMENT,
    label: "LIBER",
    color: "#FFFFFF",
    textColor: "#333333",
    description: "Ai scăpat fără pedeapsă!",
    belzyMessage: "Grr... ai avut noroc de data asta!",
  },
};

// Ordinea segmentelor pe roată (9 total)
export const WHEEL_SEGMENTS = [
  WHEEL_PUNISHMENT_TYPES.TAX_X2,
  WHEEL_PUNISHMENT_TYPES.GO_BACK,
  WHEEL_PUNISHMENT_TYPES.MINUS_100,
  WHEEL_PUNISHMENT_TYPES.TAX_X2,
  WHEEL_PUNISHMENT_TYPES.MINUS_75,
  WHEEL_PUNISHMENT_TYPES.GO_BACK,
  WHEEL_PUNISHMENT_TYPES.MINUS_100,
  WHEEL_PUNISHMENT_TYPES.MINUS_75,
  WHEEL_PUNISHMENT_TYPES.NO_PUNISHMENT,
];

export const getPunishment = (type) => WHEEL_PUNISHMENTS[type];
