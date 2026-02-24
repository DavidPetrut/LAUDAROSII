import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Modal } from "react-native";

const TRANSITION_DURATION = 1500;

/**
 * GameTransition - Tranziție crossfade pentru continue game
 */
const GameTransition = ({ visible, onComplete }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(1);
      
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(() => onComplete?.());
      }, TRANSITION_DURATION - 800);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
});

export default GameTransition;
