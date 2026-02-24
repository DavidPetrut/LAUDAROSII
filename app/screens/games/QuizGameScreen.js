import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { api, showSuccess } from "../../global/functions";
import { BackArrowIcon } from "../../global/components";
import { quizStyles as styles } from "./styles";

const localQuestions = [
  {
    question: "Cine a scris Psalmul 23?",
    options: ["Moise", "David", "Solomon", "Isaia"],
    correct: 1,
  },
  {
    question: "Câte carți are Noul Testament?",
    options: ["27", "39", "66", "22"],
    correct: 0,
  },
  {
    question: "Cine a fost aruncat în groapa cu lei?",
    options: ["Iona", "Daniel", "Ilie", "Ieremia"],
    correct: 1,
  },
  {
    question: "Care a fost primul miracol al lui Isus?",
    options: ["Vindecarea orbului", "Pâinile", "Apa în vin", "Pe apa"],
    correct: 2,
  },
  {
    question: "Câți ucenici a avut Isus?",
    options: ["10", "12", "7", "14"],
    correct: 1,
  },
];

export const QuizGameScreen = ({ route, navigation }) => {
  const { gameKey, gameName } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const fadeAnim = new Animated.Value(1);

  const currentQuestion = localQuestions[currentIndex];

  const handleAnswer = async (index) => {
    if (selected !== null) return;

    setSelected(index);
    const isCorrect = index === currentQuestion.correct;

    if (isCorrect) {
      setScore((prev) => prev + 100);
    }

    setShowResult(true);

    setTimeout(() => {
      if (currentIndex < localQuestions.length - 1) {
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        setCurrentIndex((prev) => prev + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        endGame();
      }
    }, 1500);
  };

  const endGame = async () => {
    setGameEnded(true);
    try {
      await api.post(`/games/${gameKey}/score`, { score: score + 100 });
      showSuccess("Scor salvat!");
    } catch (e) {}
  };

  const getOptionStyle = (index) => {
    if (!showResult) {
      return selected === index ? styles.optionSelected : {};
    }
    if (index === currentQuestion.correct) return styles.optionCorrect;
    if (index === selected) return styles.optionWrong;
    return {};
  };

  if (gameEnded) {
    const finalScore =
      score + (selected === currentQuestion?.correct ? 100 : 0);
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultEmoji}>
          {finalScore >= 400 ? "🏆" : finalScore >= 200 ? "⭐" : "💪"}
        </Text>
        <Text style={styles.resultTitle}>Bravo!</Text>
        <Text style={styles.resultScore}>{finalScore} puncte</Text>
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
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.progress}>
          {currentIndex + 1} / {localQuestions.length}
        </Text>
        <Text style={styles.score}>🏆 {score}</Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </View>

      <View style={styles.optionsContainer}>
        {currentQuestion.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.option, getOptionStyle(index)]}
            onPress={() => handleAnswer(index)}
            disabled={selected !== null}
            accessibilityRole="button"
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};
