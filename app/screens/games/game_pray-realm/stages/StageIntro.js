import React, { useState, useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Modal } from "react-native";
import IntroScene from "./IntroScene";
import { STAGE_1_INTRO } from "./stage1IntroData";

const FADE_DURATION = 1000;
const BLACK_SCREEN_DURATION = 1000;
const FINAL_BLACK_DURATION = 1500;

/**
 * StageIntro - Componenta principală pentru stage intro
 * Gestionează toate scenele și tranzițiile
 */
const StageIntro = ({ stageId, visible, onComplete }) => {
  const [phase, setPhase] = useState("initial-black");
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const introData = getIntroData(stageId);
  const scenes = introData?.scenes || [];

  useEffect(() => {
    if (visible) {
      setPhase("initial-black");
      setCurrentSceneIndex(0);
      fadeAnim.setValue(1);

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }).start(() => setPhase("scenes"));
      }, BLACK_SCREEN_DURATION);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleNextScene = () => {
    if (currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
    } else {
      handleIntroComplete();
    }
  };

  const handleIntroComplete = () => {
    setPhase("final-black");
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        onComplete?.();
      }, FINAL_BLACK_DURATION - FADE_DURATION);
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        {phase === "scenes" &&
          scenes.map((scene, index) => (
            <IntroScene
              key={scene.id}
              scene={scene}
              isActive={index === currentSceneIndex}
              onNext={handleNextScene}
            />
          ))}

        {(phase === "initial-black" || phase === "final-black") && (
          <Animated.View style={[styles.blackScreen, { opacity: fadeAnim }]} />
        )}
      </View>
    </Modal>
  );
};

const getIntroData = (stageId) => {
  switch (stageId) {
    case 1:
      return STAGE_1_INTRO;
    default:
      return STAGE_1_INTRO;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  blackScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 100,
  },
});

export default StageIntro;
