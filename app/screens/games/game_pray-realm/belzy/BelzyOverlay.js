import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { GameImages } from "../assets";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants/dimensions";
import {
  BELZY_STATES,
  RESULT_DISPLAY_TIME,
  BELZY_MESSAGES,
  getRandomGreeting,
  getLevelConfig,
} from "./belzyConfig";
import { getRandomQuestions } from "./belzyQuestions";
import { getActivePunishment } from "./belzyRewards";

// ========== RESPONSIVE HELPERS ==========
const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");

// Base rem unit (bazat pe un ecran de referință de 375px width)
const BASE_WIDTH = 375;
const rem = (size) => (WINDOW_WIDTH / BASE_WIDTH) * size;

// Detect dacă e tabletă (width > 600)
const isTablet = WINDOW_WIDTH > 600;

// ===== BELZY - 30% MAI MARE =====
// Dimensiuni Belzy - responsive, mari pe mobil, limitate pe tabletă
const BELZY_WIDTH_PERCENT = 0.62; // 48% * 1.30 = ~62% din lățimea ecranului (30% mai mare)
const BELZY_SIZE = Math.min(
  WINDOW_WIDTH * BELZY_WIDTH_PERCENT,
  isTablet ? 360 : 310 // max crescut cu 30%
);

// ===== NOR - 60% MAI MARE =====
// Dimensiuni nor - responsive, bazat pe lățimea ecranului
const CLOUD_WIDTH_PERCENT = 0.9;
const CLOUD_WIDTH = Math.min(
  WINDOW_WIDTH * CLOUD_WIDTH_PERCENT,
  isTablet ? 550 : 480
);
const CLOUD_HEIGHT = CLOUD_WIDTH * 0.5; // Aspect ratio ajustat pentru nor mai lat

// Gap constant între nor și Belzy - mărit pentru a nu se suprapune
const GAP_BETWEEN = rem(2);

const PHASES = {
  GREETING: "greeting",
  QUIZ: "quiz",
  RESULT: "result",
};

const BelzyOverlay = ({ visible, level, onComplete, onClose }) => {
  const [phase, setPhase] = useState(PHASES.GREETING);
  const [belzyState, setBelzyState] = useState(BELZY_STATES.HAPPY);
  const [greeting, setGreeting] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timer, setTimer] = useState(10);
  const [levelConfig, setLevelConfig] = useState({ questions: 3, timer: 10 });
  const [playerWon, setPlayerWon] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const hasCalledComplete = React.useRef(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  // Initialize when visible
  useEffect(() => {
    if (visible) {
      hasCalledComplete.current = false;
      const config = getLevelConfig(level);
      setLevelConfig(config);
      setPhase(PHASES.GREETING);
      setBelzyState(BELZY_STATES.HAPPY);
      setGreeting(getRandomGreeting());
      setQuestions(getRandomQuestions(config.questions));
      setCurrentQuestionIndex(0);
      setTimer(config.timer);
      setPlayerWon(false);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, level]);

  // Timer for quiz
  useEffect(() => {
    if (phase !== PHASES.QUIZ) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleAnswer(-1);
          return levelConfig.timer;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentQuestionIndex, levelConfig.timer]);

  const handleStartQuiz = useCallback(() => {
    setPhase(PHASES.QUIZ);
    setTimer(levelConfig.timer);
  }, [levelConfig.timer]);

  const handleAnswer = useCallback(
    (selectedIndex) => {
      const currentQuestion = questions[currentQuestionIndex];
      const isCorrect = selectedIndex === currentQuestion?.correctIndex;

      if (!isCorrect) {
        // Pierdut - trece direct la roata pedepselor (fără ecran intermediar)
        if (hasCalledComplete.current) return;

        setBelzyState(BELZY_STATES.LAUGH);
        setPlayerWon(false);
        setPhase(PHASES.RESULT); // Oprește timer-ul!

        // Închide imediat și lasă GamePlayScreen să arate roata
        setTimeout(() => {
          if (!hasCalledComplete.current) {
            hasCalledComplete.current = true;
            onComplete?.(false, level);
          }
        }, 500);
      } else {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          setTimer(levelConfig.timer);
        } else {
          setBelzyState(BELZY_STATES.ANGRY);
          setPlayerWon(true);
          setResultMessage(BELZY_MESSAGES.victory);
          setPhase(PHASES.RESULT);

          setTimeout(() => {
            if (!hasCalledComplete.current) {
              hasCalledComplete.current = true;
              onComplete?.(true, level);
            }
          }, RESULT_DISPLAY_TIME);
        }
      }
    },
    [currentQuestionIndex, questions, level, onComplete, levelConfig.timer]
  );

  const getBelzyImage = () => {
    switch (belzyState) {
      case BELZY_STATES.ANGRY:
        return GameImages.belzyAngry;
      case BELZY_STATES.LAUGH:
        return GameImages.belzyLaugh;
      case BELZY_STATES.SCARED:
        return GameImages.belzyScared;
      default:
        return GameImages.belzyHappy;
    }
  };

  if (!visible) return null;

  const currentQuestion = questions[currentQuestionIndex];

  // Când player pierde, nu arăta nimic (roata pedepselor va apărea)
  if (phase === PHASES.RESULT && !playerWon) {
    return null;
  }

  // Greeting & Result (doar când câștigă) - Nor sus-centru, Belzy jos-centru
  if (phase === PHASES.GREETING || (phase === PHASES.RESULT && playerWon)) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.overlay} />

          {/* Wrapper vertical - nor sus, Belzy jos, totul centrat */}
          <Animated.View
            style={[
              styles.belzyCloudWrapper,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            {/* Speech bubble - SUS, centrat */}
            <View style={styles.cloudContainer}>
              <Image
                source={GameImages.talkingCloud}
                style={styles.cloudImage}
                resizeMode="contain"
              />
              <View style={styles.cloudContent}>
                {phase === PHASES.GREETING ? (
                  <>
                    <Text style={styles.greetingText}>{greeting}</Text>
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={handleStartQuiz}
                    >
                      <Text style={styles.startButtonText}>ÎNCEPE!</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text
                    style={[
                      styles.resultText,
                      playerWon ? styles.resultWin : styles.resultLose,
                    ]}
                  >
                    {resultMessage}
                  </Text>
                )}
              </View>
            </View>

            {/* Belzy - JOS, centrat */}
            <Image
              source={getBelzyImage()}
              style={styles.belzyImageBottom}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  // Quiz phase - Game-like container
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.overlay} />

        {/* Timer and Progress - Top */}
        <View style={styles.quizHeader}>
          <View style={styles.timerContainer}>
            <Text style={styles.timerIcon}>⏱️</Text>
            <Text style={[styles.timerText, timer <= 3 && styles.timerDanger]}>
              {timer}s
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1} / {questions.length}
            </Text>
          </View>
        </View>

        {/* Belzy small in corner */}
        <Animated.Image
          source={getBelzyImage()}
          style={[styles.belzySmall, { transform: [{ scale: scaleAnim }] }]}
          resizeMode="contain"
        />

        {/* Question Container - Game-like */}
        <Animated.View
          style={[
            styles.questionContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.questionHeader}>
            <Text style={styles.questionLabel}>
              ÎNTREBAREA {currentQuestionIndex + 1}
            </Text>
          </View>

          <Text style={styles.questionText}>{currentQuestion?.question}</Text>

          {/* Answer Buttons - Game-like */}
          <View style={styles.answersContainer}>
            {currentQuestion?.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.answerButton}
                onPress={() => handleAnswer(index)}
                activeOpacity={0.7}
              >
                <View style={styles.answerButtonInner}>
                  <Text style={styles.answerLetter}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                  <Text style={styles.answerText}>{option}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },

  // === Greeting/Result Phase Styles ===
  // Container pentru Belzy + Nor - layout VERTICAL, CENTRAT PE Y-AXIS (mijlocul ecranului)
  belzyCloudWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column", // VERTICAL - nor sus, Belzy jos
    alignItems: "center", // Centrat orizontal (X-axis)
    justifyContent: "center", // CENTRAT VERTICAL (Y-axis) - mijlocul ecranului
    zIndex: 100,
  },

  // Belzy - dimensiuni responsive bazate pe % din ecran (30% mai mare)
  belzyImageBottom: {
    width: BELZY_SIZE,
    height: BELZY_SIZE,
    marginTop: GAP_BETWEEN, // Gap pozitiv între nor și Belzy
  },

  // Container pentru nor - centrat, deasupra lui Belzy (60% mai mare)
  cloudContainer: {
    width: CLOUD_WIDTH,
    height: rem(300),
    alignItems: "center",
    justifyContent: "center",
  },
  cloudImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  // Content perfect centrat în nor pe ambele axe
  cloudContent: {
    position: "absolute",
    top: 0,
    bottom: rem(30), // Offset pentru coada norului
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: "15%",
  },
  greetingText: {
    fontSize: rem(16),
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: rem(12),
    lineHeight: rem(24),
  },
  startButton: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: rem(36),
    paddingVertical: rem(12),
    borderRadius: rem(28),
    borderWidth: 3,
    borderColor: "#a78bfa",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: "#fff",
    fontSize: rem(18),
    fontWeight: "900",
    letterSpacing: 1,
  },
  resultText: {
    fontSize: rem(15),
    fontWeight: "800",
    textAlign: "center",
    lineHeight: rem(22),
  },
  resultWin: {
    color: "#22c55e",
  },
  resultLose: {
    color: "#dc2626",
  },

  // === Quiz Phase Styles ===
  quizHeader: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 50, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#8b5cf6",
  },
  timerIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  timerText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  timerDanger: {
    color: "#ef4444",
  },
  progressContainer: {
    backgroundColor: "rgba(30, 30, 50, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#8b5cf6",
  },
  progressText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#a78bfa",
  },
  belzySmall: {
    position: "absolute",
    top: 100,
    right: 10,
    width: 100,
    height: 100,
  },

  questionContainer: {
    width: SCREEN_WIDTH * 0.92,
    backgroundColor: "rgba(25, 25, 45, 0.98)",
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#8b5cf6",
    overflow: "hidden",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 15,
  },
  questionHeader: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    alignItems: "center",
  },
  questionLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
  },
  questionText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    padding: 20,
    lineHeight: 24,
  },
  answersContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  answerButton: {
    marginBottom: 10,
  },
  answerButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.5)",
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  answerLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8b5cf6",
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 32,
    marginRight: 12,
  },
  answerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#e2e8f0",
  },
});

export default BelzyOverlay;
