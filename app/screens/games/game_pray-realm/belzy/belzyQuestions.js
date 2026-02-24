/**
 * BELZY QUESTIONS
 * Quiz questions that Belzy asks the player
 */

export const BELZY_QUESTIONS = [
  {
    id: 1,
    question: "Câte cărți are Noul Testament?",
    options: ["27", "39", "66", "12"],
    correctIndex: 0,
    difficulty: "easy",
  },
  {
    id: 2,
    question: "Cine a scris majoritatea epistolelor din Noul Testament?",
    options: ["Petru", "Pavel", "Ioan", "Iacov"],
    correctIndex: 1,
    difficulty: "easy",
  },
  {
    id: 3,
    question: "Care este primul poruncă din cele 10 porunci?",
    options: [
      "Să nu ucizi",
      "Să nu furi",
      "Să nu ai alți dumnezei",
      "Să nu mărturisești strâmb",
    ],
    correctIndex: 2,
    difficulty: "easy",
  },
  {
    id: 4,
    question: "Câte zile a stat Isus în pustie?",
    options: ["7", "21", "40", "12"],
    correctIndex: 2,
    difficulty: "medium",
  },
  {
    id: 5,
    question: "Care este cel mai scurt verset din Biblie?",
    options: [
      "Dumnezeu este dragoste",
      "Isus a plâns",
      "Bucurați-vă",
      "Rugați-vă neîncetat",
    ],
    correctIndex: 1,
    difficulty: "medium",
  },
  {
    id: 6,
    question: "Câți ucenici a avut Isus?",
    options: ["10", "12", "7", "70"],
    correctIndex: 1,
    difficulty: "easy",
  },
  {
    id: 7,
    question: "Cine a fost primul om creat de Dumnezeu?",
    options: ["Noe", "Adam", "Avraam", "Moise"],
    correctIndex: 1,
    difficulty: "easy",
  },
  {
    id: 8,
    question: "Care carte din Biblie vorbește despre creație?",
    options: ["Exodul", "Geneza", "Leviticul", "Deuteronomul"],
    correctIndex: 1,
    difficulty: "easy",
  },
  {
    id: 9,
    question: "Cine a construit arca?",
    options: ["Avraam", "Moise", "Noe", "David"],
    correctIndex: 2,
    difficulty: "easy",
  },
  {
    id: 10,
    question: "Care este ultimul cuvânt al lui Isus pe cruce?",
    options: [
      "Tată, iartă-i",
      "S-a împlinit",
      "De ce M-ai părăsit?",
      "Mi-e sete",
    ],
    correctIndex: 1,
    difficulty: "hard",
  },
];

// Get random questions for a quiz
export const getRandomQuestions = (count = 5) => {
  const shuffled = [...BELZY_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Get questions by difficulty
export const getQuestionsByDifficulty = (difficulty, count = 5) => {
  const filtered = BELZY_QUESTIONS.filter((q) => q.difficulty === difficulty);
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, filtered.length));
};

