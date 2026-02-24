import React, { useState, useRef } from "react";
import { View, Text, Image, Modal, StyleSheet, Animated } from "react-native";
import { GameImages } from "../assets";
import { rem, SCREEN_WIDTH } from "../constants/dimensions";
import BelzyPunishmentWheel from "./BelzyPunishmentWheel";
import { WHEEL_PUNISHMENT_TYPES } from "./belzyPunishments";

const BelzyPunishmentOverlay = ({
  visible,
  level,
  onPunishmentComplete,
  onPunishmentDetermined,
}) => {
  const [showWheel, setShowWheel] = useState(true);
  const [showBelzyReaction, setShowBelzyReaction] = useState(false);
  const [showHeaderAndBelzy, setShowHeaderAndBelzy] = useState(true);
  const [punishment, setPunishment] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const hasCompleted = useRef(false);

  React.useEffect(() => {
    if (visible) {
      setShowWheel(true);
      setShowBelzyReaction(false);
      setShowHeaderAndBelzy(true);
      setPunishment(null);
      headerOpacity.setValue(1);
      hasCompleted.current = false;
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSpinStart = (determinedPunishment) => {
    // SALVEAZĂ pedeapsa IMEDIAT când user-ul apasă ÎNVÂRTE
    // Astfel chiar dacă iese în timpul animației, pedeapsa e deja salvată
    onPunishmentDetermined?.(determinedPunishment, level);

    Animated.timing(headerOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setShowHeaderAndBelzy(false);
    });
  };

  const handleSpinComplete = (result) => {
    if (hasCompleted.current) return;

    setPunishment(result);

    setTimeout(() => {
      setShowWheel(false);
      setShowBelzyReaction(true);

      setTimeout(() => {
        if (hasCompleted.current) return;
        hasCompleted.current = true;

        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onPunishmentComplete?.(result);
        });
      }, 3500);
    }, 1500);
  };

  const getBelzyImage = () => {
    if (!punishment) return GameImages.belzyLaugh;
    if (punishment.id === WHEEL_PUNISHMENT_TYPES.NO_PUNISHMENT) {
      return GameImages.belzyAngry;
    }
    return GameImages.belzyLaugh;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {showWheel && (
          <View style={styles.wheelSection}>
            {showHeaderAndBelzy && (
              <Animated.View
                style={{ opacity: headerOpacity, alignItems: "center" }}
              >
                <Text style={styles.title}>RASPUNS GRESIT! </Text>
                <Text style={styles.subtitle}>
                  Învârte roata să vezi ce pedeapsă primești!
                </Text>
              </Animated.View>
            )}

            <BelzyPunishmentWheel
              onSpinComplete={handleSpinComplete}
              onSpinStart={handleSpinStart}
            />

            {showHeaderAndBelzy && (
              <Animated.Image
                source={GameImages.belzyHappy}
                style={[styles.belzyUnderWheel, { opacity: headerOpacity }]}
                resizeMode="contain"
              />
            )}
          </View>
        )}

        {showBelzyReaction && punishment && (
          <View style={styles.reactionSection}>
            <View style={styles.messageContainer}>
              <Image
                source={GameImages.talkingCloud}
                style={styles.cloudImage}
                resizeMode="contain"
              />
              <View style={styles.cloudContent}>
                <Text style={styles.messageText}>
                  {punishment.belzyMessage}
                </Text>
              </View>
            </View>

            <Image
              source={getBelzyImage()}
              style={styles.belzyImage}
              resizeMode="contain"
            />
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  wheelSection: {
    alignItems: "center",
    paddingHorizontal: rem(20),
  },
  title: {
    fontSize: rem(26),
    fontWeight: "bold",
    color: "#E74C3C",
    marginBottom: rem(6),
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: rem(13),
    color: "#aaa",
    marginBottom: rem(12),
    textAlign: "center",
  },
  belzyUnderWheel: {
    width: rem(180),
    height: rem(180),
    marginTop: rem(15),
  },
  reactionSection: {
    alignItems: "center",
    paddingHorizontal: rem(20),
  },
  messageContainer: {
    width: SCREEN_WIDTH * 0.95,
    height: rem(280),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rem(5),
  },
  cloudImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  cloudContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: rem(50),
    paddingBottom: rem(40),
  },
  messageText: {
    fontSize: rem(18),
    color: "#333",
    textAlign: "center",
    fontWeight: "700",
    lineHeight: rem(26),
  },
  belzyImage: {
    width: rem(200),
    height: rem(200),
  },
});

export default BelzyPunishmentOverlay;
