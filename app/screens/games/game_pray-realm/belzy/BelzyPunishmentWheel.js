import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
import { WHEEL_SEGMENTS, WHEEL_PUNISHMENTS } from "./belzyPunishments";
import { rem, SCREEN_WIDTH } from "../constants/dimensions";

const WHEEL_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);
const NUM_SEGMENTS = WHEEL_SEGMENTS.length;
const ANGLE_PER_SEGMENT = 360 / NUM_SEGMENTS;

const BelzyPunishmentWheel = ({
  onSpinComplete,
  onSpinStart,
  disabled = false,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(true);
  const [result, setResult] = useState(null);
  const hasCompletedRef = useRef(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  const spin = () => {
    if (isSpinning || disabled || !buttonVisible) return;

    setIsSpinning(true);
    setResult(null);

    // IMPORTANT: Determinăm pedeapsa ACUM (înainte de animație)
    // Astfel chiar dacă user-ul iese, pedeapsa e deja determinată
    const randomSegment = Math.floor(Math.random() * NUM_SEGMENTS);
    const winningType = WHEEL_SEGMENTS[randomSegment];
    const determinedPunishment = WHEEL_PUNISHMENTS[winningType];

    // Notifică parent cu pedeapsa determinată IMEDIAT (pentru a fi salvată)
    onSpinStart?.(determinedPunishment);

    // Fade out buton și scale up roata simultan - 2.5 secunde
    Animated.parallel([
      Animated.timing(buttonOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.35,
        duration: 2500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setButtonVisible(false);
    });

    const baseAngle = (430 - randomSegment * ANGLE_PER_SEGMENT) % 360;
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalAngle = spins * 360 + baseAngle;

    Animated.timing(rotateAnim, {
      toValue: finalAngle,
      duration: 4000 + Math.random() * 1000,
      easing: Easing.bezier(0.17, 0.67, 0.12, 0.99),
      useNativeDriver: true,
    }).start(() => {
      // Roata s-a oprit - scale înapoi la 1 în 2.5 secunde
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      setIsSpinning(false);
      setResult(determinedPunishment);

      setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onSpinComplete?.(determinedPunishment);
        }
      }, 1200);
    });
  };

  const renderSegments = () => {
    const segments = [];
    const radius = WHEEL_SIZE / 2;
    const centerX = radius;
    const centerY = radius;

    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const startAngle = (i * ANGLE_PER_SEGMENT - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * ANGLE_PER_SEGMENT - 90) * (Math.PI / 180);

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const pathData = `
        M ${centerX} ${centerY}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 0 1 ${x2} ${y2}
        Z
      `;

      const punishmentType = WHEEL_SEGMENTS[i];
      const punishment = WHEEL_PUNISHMENTS[punishmentType];

      const textAngle =
        (i * ANGLE_PER_SEGMENT + ANGLE_PER_SEGMENT / 2 - 90) * (Math.PI / 180);
      const textRadius = radius * 0.58;
      const textX = centerX + textRadius * Math.cos(textAngle);
      const textY = centerY + textRadius * Math.sin(textAngle);
      // Rotație radială - textul orientat spre exterior (citibil)
      const textRotation = i * ANGLE_PER_SEGMENT + ANGLE_PER_SEGMENT / 2 - 90;

      segments.push(
        <G key={i}>
          <Path
            d={pathData}
            fill={punishment.color}
            stroke="#222"
            strokeWidth="2"
          />
          <SvgText
            x={textX}
            y={textY}
            fill={punishment.textColor || "#FFFFFF"}
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
          >
            {punishment.label}
          </SvgText>
        </G>
      );
    }

    return segments;
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.wheelWrapper, { transform: [{ scale: scaleAnim }] }]}
      >
        <View style={styles.pointer}>
          <View style={styles.pointerArrow} />
        </View>

        <Animated.View
          style={[
            styles.wheelContainer,
            { transform: [{ rotate: rotateInterpolate }] },
          ]}
        >
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            {renderSegments()}
          </Svg>
        </Animated.View>
      </Animated.View>

      {buttonVisible && (
        <Animated.View style={{ opacity: buttonOpacity }}>
          <TouchableOpacity
            style={styles.spinButton}
            onPress={spin}
            disabled={isSpinning || disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.spinButtonText}>ÎNVÂRTE</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {result && (
        <View
          style={[
            styles.resultContainer,
            { backgroundColor: result.color + "40" },
          ]}
        >
          <Text
            style={[styles.resultText, { color: result.textColor || "#fff" }]}
          >
            {result.description}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  wheelWrapper: {
    position: "relative",
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    borderWidth: 5,
    borderColor: "#222",
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  pointer: {
    position: "absolute",
    right: -12,
    top: "50%",
    marginTop: -18,
    zIndex: 10,
  },
  pointerArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderBottomWidth: 18,
    borderRightWidth: 28,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#FFD700",
  },
  spinButton: {
    marginTop: rem(16),
    paddingHorizontal: rem(36),
    paddingVertical: rem(12),
    backgroundColor: "#8b5cf6",
    borderRadius: rem(25),
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  spinButtonText: {
    color: "#fff",
    fontSize: rem(16),
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  resultContainer: {
    marginTop: rem(12),
    paddingHorizontal: rem(16),
    paddingVertical: rem(10),
    borderRadius: rem(10),
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  resultText: {
    fontSize: rem(14),
    fontWeight: "600",
    textAlign: "center",
  },
});

export default BelzyPunishmentWheel;
