import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { api, showSuccess } from "../../global/functions";
import { BackArrowIcon } from "../../global/components";
import { memoryStyles as styles } from "./styles";

const verses = [
  {
    reference: "Ioan 3:16",
    words: ["Fiindca", "atât", "de", "mult", "a", "iubit", "Dumnezeu", "lumea"],
  },
  {
    reference: "Psalm 23:1",
    words: ["Domnul", "este", "Pastorul", "meu", "nu", "voi", "duce", "lipsa"],
  },
  {
    reference: "Filipeni 4:13",
    words: ["Pot", "totul", "în", "Hristos", "care", "ma", "întarește"],
  },
  {
    reference: "Romani 8:28",
    words: ["Toate", "lucrurile", "lucreaza", "împreuna", "spre", "bine"],
  },
];

export const MemoryGameScreen = ({ navigation }) => {
  const [currentVerse, setCurrentVerse] = useState(null);
  const [shuffledWords, setShuffledWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);

  useEffect(() => {
    startLevel();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      checkAnswer();
    }
  }, [timeLeft]);

  const startLevel = () => {
    if (level >= verses.length) {
      endGame();
      return;
    }

    const verse = verses[level];
    setCurrentVerse(verse);
    setShuffledWords([...verse.words].sort(() => Math.random() - 0.5));
    setSelectedWords([]);
    setShowResult(false);
    setTimeLeft(30);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
  };

  const selectWord = (word, index) => {
    if (showResult) return;

    const newSelected = [...selectedWords, word];
    setSelectedWords(newSelected);

    const newShuffled = [...shuffledWords];
    newShuffled.splice(index, 1);
    setShuffledWords(newShuffled);

    if (newSelected.length === currentVerse.words.length) {
      checkAnswer(newSelected);
    }
  };

  const removeWord = (index) => {
    if (showResult) return;

    const word = selectedWords[index];
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setShuffledWords([...shuffledWords, word]);
  };

  const checkAnswer = (words = selectedWords) => {
    clearInterval(timerRef.current);
    setShowResult(true);

    const isCorrect = words.join(" ") === currentVerse.words.join(" ");

    if (isCorrect) {
      const bonus = timeLeft * 5;
      setScore((prev) => prev + 100 + bonus);
    }

    setTimeout(() => {
      setLevel((prev) => prev + 1);
      if (level + 1 < verses.length) {
        startLevel();
      } else {
        endGame();
      }
    }, 2000);
  };

  const endGame = async () => {
    setGameEnded(true);
    try {
      await api.post("/games/memoreazaVerset/score", { score });
      showSuccess("Scor salvat!");
    } catch (e) {}
  };

  if (gameEnded) {
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultEmoji}>
          {score >= 300 ? "🏆" : score >= 150 ? "⭐" : "💪"}
        </Text>
        <Text style={styles.resultTitle}>Bravo!</Text>
        <Text style={styles.resultScore}>{score} puncte</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Înapoi la jocuri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.reference}>{currentVerse?.reference}</Text>
        <View style={styles.stats}>
          <Text style={styles.timer}>⏱️ {timeLeft}s</Text>
          <Text style={styles.scoreText}>🏆 {score}</Text>
        </View>
      </View>

      <View style={styles.selectedArea}>
        <Text style={styles.areaLabel}>Aranjeaza versetul:</Text>
        <View style={styles.wordsRow}>
          {selectedWords.map((word, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.wordChip, styles.selectedChip]}
              onPress={() => removeWord(idx)}
            >
              <Text style={styles.wordText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.shuffledArea}>
        <Text style={styles.areaLabel}>Cuvinte disponibile:</Text>
        <View style={styles.wordsRow}>
          {shuffledWords.map((word, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.wordChip}
              onPress={() => selectWord(word, idx)}
            >
              <Text style={styles.wordText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showResult && (
        <View style={styles.feedback}>
          <Text style={styles.feedbackText}>
            {selectedWords.join(" ") === currentVerse?.words.join(" ")
              ? "✅ Corect!"
              : "❌ Greșit"}
          </Text>
        </View>
      )}
    </View>
  );
};
