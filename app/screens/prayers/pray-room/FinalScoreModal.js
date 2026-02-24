import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, Animated } from "react-native";
import { prayRoomStyles as styles } from "./styles";

const getVerdict = (score) => {
  if (score === 0) return "Rugaciune Absenta";
  if (score < 25) return "Nivel scazut de rugaciune";
  if (score < 50) return "Nivel mediu de rugaciune";
  if (score < 90) return "Nivel ridicat de rugaciune";
  if (score < 100) return "Nivel foarte ridicat de rugaciune";
  return "Toti s-au rugat de fiecare data";
};

const getEmoji = (score) => {
  if (score === 0) return "😔";
  if (score < 25) return "🙁";
  if (score < 50) return "😐";
  if (score < 90) return "😊";
  if (score < 100) return "🎉";
  return "🏆";
};

const getColor = (score) => {
  if (score < 25) return "#ef4444";
  if (score < 50) return "#f59e0b";
  if (score < 90) return "#84cc16";
  return "#21c063";
};

export const FinalScoreModal = ({ visible, finalScore = 0, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const verdict = getVerdict(finalScore);
  const emoji = getEmoji(finalScore);
  const color = getColor(finalScore);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.finalOverlay}>
        <Animated.View
          style={[
            styles.finalCard,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <Text style={styles.finalEmoji}>{emoji}</Text>
          <Text style={styles.finalTitle}>Camera s-a terminat!</Text>
          <View style={[styles.finalScoreCircle, { borderColor: color }]}>
            <Text style={[styles.finalScoreText, { color }]}>{finalScore}%</Text>
          </View>
          <Text style={[styles.finalVerdict, { color }]}>{verdict}</Text>
          <TouchableOpacity style={styles.finalBtn} onPress={onClose}>
            <Text style={styles.finalBtnText}>Inchide</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};
