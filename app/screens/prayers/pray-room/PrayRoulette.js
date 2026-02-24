import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  StyleSheet,
} from "react-native";
import { UserAvatar } from "../../../global/components";

// Animatie de shuffle avatare cu auto-start la deschidere
export const PrayRoulette = ({
  members,
  assignedMember,
  visible,
  onRevealComplete,
  onClose,
}) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  // Porneste animatia automat cand modalul se deschide
  useEffect(() => {
    if (visible && assignedMember && members.length >= 1 && !hasStarted.current) {
      hasStarted.current = true;
      setTimeout(() => reveal(), 300);
    }
    if (!visible) {
      hasStarted.current = false;
      setIsRevealing(false);
      setCurrentIndex(0);
      setRevealed(false);
      scaleAnim.setValue(1);
      nameOpacity.setValue(0);
    }
  }, [visible]);

  const reveal = () => {
    if (isRevealing || !assignedMember || members.length < 1) return;

    setIsRevealing(true);
    setRevealed(false);
    nameOpacity.setValue(0);

    const assignedId = assignedMember._id || assignedMember.userId?._id;
    const targetIdx = members.findIndex(
      (m) => (m.userId?._id || m.userId) === assignedId
    );
    const safeTarget = targetIdx >= 0 ? targetIdx : 0;
    const totalSteps = 3 * members.length + safeTarget;
    let step = 0;
    let speed = 60;

    Animated.timing(scaleAnim, {
      toValue: 1.4,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const animate = () => {
      setCurrentIndex(step % members.length);
      step++;

      if (step <= totalSteps) {
        const progress = step / totalSteps;
        if (progress > 0.65) speed = 60 + (progress - 0.65) * 1400;
        setTimeout(animate, speed);
      } else {
        setCurrentIndex(safeTarget);
        setRevealed(true);
        setIsRevealing(false);

        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(nameOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();

        setTimeout(() => onRevealComplete?.(), 2200);
      }
    };

    animate();
  };

  const displayMember = members[currentIndex] || members[0];
  const assignedName = assignedMember?.personalData?.fullName || "User";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rs.overlay}>
        <View style={rs.content}>
          <Animated.View style={[rs.avatarWrap, { transform: [{ scale: scaleAnim }] }]}>
            {displayMember && (
              <UserAvatar
                profilePicture={
                  displayMember.userId?.personalData?.profilePicture ||
                  displayMember.personalData?.profilePicture
                }
                size={120}
              />
            )}
          </Animated.View>

          {isRevealing && (
            <Text style={rs.revealingText}>Se alege...</Text>
          )}

          {revealed && (
            <>
              <Animated.View style={[rs.resultBox, { opacity: nameOpacity }]}>
                <Text style={rs.resultLabel}>Te vei ruga pentru:</Text>
                <Text style={rs.resultName}>{assignedName}</Text>
              </Animated.View>
              <TouchableOpacity style={rs.closeBtn} onPress={onClose}>
                <Text style={rs.closeBtnText}>Continua</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const rs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  avatarWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#21c063",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 32,
    backgroundColor: "#111",
  },
  resultBox: {
    alignItems: "center",
    backgroundColor: "rgba(33,192,99,0.15)",
    padding: 20,
    borderRadius: 16,
    width: "100%",
    marginBottom: 24,
  },
  resultLabel: {
    color: "#21c063",
    fontSize: 14,
    marginBottom: 8,
  },
  resultName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  revealingText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "600",
  },
  closeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 16,
  },
});
