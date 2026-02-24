import React, { useRef, useEffect, useState } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";
import { PrayerCard } from "./PrayerCard";
import { GoldenMedalAnimation } from "./GoldenMedalAnimation";
import { useTheme } from "../../global/context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PARTICLE_COUNT = 8;

const createParticles = () => {
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
    const distance = 60 + Math.random() * 100;
    particles.push({
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: (Math.random() - 0.5) * 360,
      delay: i * 30,
    });
  }
  return particles;
};

export const AnimatedPrayerCard = ({
  prayer,
  isOwner,
  showPrayedButton,
  showPrayedCount,
  hideUserInfo,
  onPrayed,
  onMarkAnswered,
  onDelete,
  isShatterring,
  onShatterComplete,
  tab = "personal",
  currentUserId,
}) => {
  const { isDarkMode } = useTheme();
  const [showParticles, setShowParticles] = useState(false);
  const [showMedalAnimation, setShowMedalAnimation] = useState(false);
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const particleAnims = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }))
  ).current;

  const particles = useRef(createParticles()).current;

  useEffect(() => {
    if (isShatterring) {
      runShatterAnimation();
    }
  }, [isShatterring]);

  const handleMarkAnswered = () => {
    setShowMedalAnimation(true);
    Animated.timing(cardOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleMedalComplete = () => {
    setShowMedalAnimation(false);
    onMarkAnswered?.();
  };

  const runShatterAnimation = () => {
    setShowParticles(true);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const animations = particles.map((particle, index) => {
      const anim = particleAnims[index];
      return Animated.parallel([
        Animated.timing(anim.x, {
          toValue: particle.x,
          duration: 500,
          delay: particle.delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim.y, {
          toValue: particle.y,
          duration: 500,
          delay: particle.delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: particle.rotate,
          duration: 500,
          delay: particle.delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim.scale, {
          toValue: 0.3,
          duration: 500,
          delay: particle.delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 350,
          delay: particle.delay + 150,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onShatterComplete?.();
    });
  };

  const particleColor = isDarkMode ? "#10b981" : "#059669";
  const particleSize = 20;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
          },
        ]}
      >
        <PrayerCard
          prayer={prayer}
          isOwner={isOwner}
          showPrayedButton={showPrayedButton}
          showPrayedCount={showPrayedCount}
          hideUserInfo={hideUserInfo}
          onPrayed={onPrayed}
          onMarkAnswered={handleMarkAnswered}
          onDelete={onDelete}
          tab={tab}
          currentUserId={currentUserId}
        />
      </Animated.View>

      <GoldenMedalAnimation
        visible={showMedalAnimation}
        onComplete={handleMedalComplete}
      />

      {showParticles && (
        <View style={styles.particlesContainer} pointerEvents="none">
          {particles.map((particle, index) => {
            const anim = particleAnims[index];
            return (
              <Animated.View
                key={particle.id}
                style={[
                  styles.particle,
                  {
                    width: particleSize + Math.random() * 10,
                    height: particleSize + Math.random() * 10,
                    backgroundColor: particleColor,
                    opacity: anim.opacity,
                    transform: [
                      { translateX: anim.x },
                      { translateY: anim.y },
                      {
                        rotate: anim.rotate.interpolate({
                          inputRange: [-360, 360],
                          outputRange: ["-360deg", "360deg"],
                        }),
                      },
                      { scale: anim.scale },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "visible",
  },
  cardWrapper: {
    overflow: "visible",
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    zIndex: 100,
  },
  particle: {
    position: "absolute",
    borderRadius: 4,
  },
});
