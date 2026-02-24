import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Image } from "react-native";
import { prayRoomStyles as styles } from "./styles";

const PRAYING_ICON = require("../../../public/icons/praying.png");

export const MilestoneBar = ({ score = 0 }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();

    if (score === 100) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [score]);

  const getBarColor = () => {
    if (score < 30) return "#ef4444";
    if (score < 60) return "#f59e0b";
    if (score < 90) return "#84cc16";
    return "#21c063";
  };

  const widthInterpolate = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.milestoneContainer}>
      <View style={styles.milestoneHeader}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Image source={PRAYING_ICON} style={styles.milestoneIcon} />
        </Animated.View>
        <Text style={styles.milestoneLabel}>Progres Azi</Text>
        <Text style={styles.milestonePercent}>{Math.round(score)}%</Text>
      </View>
      <View style={styles.milestoneTrack}>
        <Animated.View
          style={[
            styles.milestoneProgress,
            { width: widthInterpolate, backgroundColor: getBarColor() },
          ]}
        />
      </View>
    </View>
  );
};
