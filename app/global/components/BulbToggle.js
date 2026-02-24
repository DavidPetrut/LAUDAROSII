import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
} from "react-native";

/**
 * BulbToggle - Toggle modern în formă de bec cu sparks
 *
 * Props:
 * - value: boolean - starea toggle-ului
 * - onValueChange: (value) => void - callback când se schimbă starea
 * - activeColor: string - culoarea centrului când e activ (default: "#fef401")
 * - activeGlowColor: string - culoarea glow-ului când e activ (default: "#fdb843")
 * - sparkColor: string - culoarea sparks (default: "#d1b82b")
 * - trackColor: string - culoarea track-ului inactiv (default: "#39315a")
 * - activeTrackColor: string - culoarea track-ului activ (default: null - derivată din activeGlowColor)
 * - activeBorderColor: string - culoarea border-ului când e activ (default: activeGlowColor)
 * - bulbColor: string - culoarea bulb-ului inactiv (default: "#4a426b")
 * - activeBulbColor: string - culoarea bulb-ului activ (default: null - derivată din activeGlowColor)
 * - size: "small" | "medium" | "large" - dimensiunea (default: "medium")
 */
export const BulbToggle = ({
  value = false,
  onValueChange,
  activeColor = "#fef401",
  activeGlowColor = "#fdb843",
  sparkColor = "#d1b82b",
  trackColor = "#39315a",
  activeTrackColor = null,
  activeBorderColor = null,
  bulbColor = "#4a426b",
  activeBulbColor = null,
  size = "medium",
}) => {
  // Derivă culorile active dacă nu sunt specificate
  const finalActiveTrackColor = activeTrackColor || activeGlowColor + "25";
  const finalActiveBorderColor = activeBorderColor || activeGlowColor;
  const finalActiveBulbColor = activeBulbColor || activeGlowColor + "40";
  // Animații
  const bulbPosition = useRef(new Animated.Value(value ? 1 : 0)).current;
  const glowOpacity = useRef(new Animated.Value(value ? 1 : 0)).current;
  const spark1Anim = useRef(new Animated.Value(0)).current;
  const spark2Anim = useRef(new Animated.Value(0)).current;
  const spark3Anim = useRef(new Animated.Value(0)).current;
  const spark4Anim = useRef(new Animated.Value(0)).current;

  // Dimensiuni bazate pe size
  const dimensions = {
    small: { track: { w: 60, h: 30 }, bulb: 24, center: 10, spark: 2 },
    medium: { track: { w: 80, h: 40 }, bulb: 32, center: 14, spark: 3 },
    large: { track: { w: 110, h: 55 }, bulb: 45, center: 18, spark: 4 },
  };

  const dim = dimensions[size] || dimensions.medium;
  const padding = (dim.track.h - dim.bulb) / 2;
  const translateX = dim.track.w - dim.bulb - padding * 2;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(bulbPosition, {
        toValue: value ? 1 : 0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: value ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Sparks animation când devine activ
    if (value) {
      // Reset sparks
      spark1Anim.setValue(0);
      spark2Anim.setValue(0);
      spark3Anim.setValue(0);
      spark4Anim.setValue(0);

      // Animate sparks cu delay-uri diferite
      setTimeout(() => {
        Animated.timing(spark1Anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }, 100);

      setTimeout(() => {
        Animated.timing(spark2Anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }).start();
      }, 200);

      setTimeout(() => {
        Animated.timing(spark3Anim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }).start();
      }, 300);

      setTimeout(() => {
        Animated.timing(spark4Anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }).start();
      }, 150);
    }
  }, [value]);

  const handlePress = () => {
    onValueChange?.(!value);
  };

  // Interpolări
  const bulbTranslateX = bulbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, translateX],
  });

  const bulbScale = bulbPosition.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1],
  });

  const centerScale = bulbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  // Spark animations
  const spark1Style = {
    opacity: spark1Anim.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: spark1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 25],
        }),
      },
      {
        translateY: spark1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -15],
        }),
      },
      {
        scale: spark1Anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.5, 1.2, 0.3],
        }),
      },
    ],
  };

  const spark2Style = {
    opacity: spark2Anim.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: spark2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -20],
        }),
      },
      {
        translateY: spark2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -25],
        }),
      },
      {
        scale: spark2Anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.5, 1, 0.2],
        }),
      },
    ],
  };

  const spark3Style = {
    opacity: spark3Anim.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: spark3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 20],
        }),
      },
      {
        translateY: spark3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 20],
        }),
      },
      {
        scale: spark3Anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.5, 1, 0.2],
        }),
      },
    ],
  };

  const spark4Style = {
    opacity: spark4Anim.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: spark4Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -25],
        }),
      },
      {
        translateY: spark4Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 15],
        }),
      },
      {
        scale: spark4Anim.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.5, 1.1, 0.3],
        }),
      },
    ],
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View
        style={[
          styles.track,
          {
            width: dim.track.w,
            height: dim.track.h,
            borderRadius: dim.track.h / 2,
            backgroundColor: value ? finalActiveTrackColor : trackColor,
            borderWidth: value ? 2 : 0,
            borderColor: value ? finalActiveBorderColor : "transparent",
          },
        ]}
      >
        {/* Glow effect când e activ */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowOpacity,
              backgroundColor: activeGlowColor + "10",
              borderRadius: dim.track.h / 2,
            },
          ]}
        />

        {/* Bulb principal */}
        <Animated.View
          style={[
            styles.bulb,
            {
              width: dim.bulb,
              height: dim.bulb,
              borderRadius: dim.bulb / 2,
              left: value ? padding - 2 : padding,
              top: value ? padding - 2 : padding,
              backgroundColor: value ? finalActiveBulbColor : bulbColor,
              transform: [{ translateX: bulbTranslateX }, { scale: bulbScale }],
              shadowColor: value ? activeGlowColor : "#000",
              shadowOpacity: value ? 0.4 : 0.3,
              shadowRadius: value ? 6 : 5,
            },
          ]}
        >
          {/* Inner glow ring */}
          <View
            style={[
              styles.innerRing,
              {
                width: dim.bulb - 6,
                height: dim.bulb - 6,
                borderRadius: (dim.bulb - 6) / 2,
                borderColor: value ? activeGlowColor + "60" : bulbColor + "80",
              },
            ]}
          />

          {/* Bulb center - luminează */}
          <Animated.View
            style={[
              styles.bulbCenter,
              {
                width: dim.center,
                height: dim.center,
                borderRadius: dim.center / 2,
                backgroundColor: value ? activeColor : "#5a527b",
                transform: [{ scale: centerScale }],
                shadowColor: value ? activeColor : "transparent",
                shadowOpacity: value ? 0.8 : 0,
                shadowRadius: value ? 8 : 0,
              },
            ]}
          >
            {/* Inner dot */}
            <View
              style={[
                styles.innerDot,
                {
                  width: dim.center * 0.5,
                  height: dim.center * 0.5,
                  borderRadius: dim.center * 0.25,
                  backgroundColor: value ? "#fff" : "#7b7394",
                },
              ]}
            />
          </Animated.View>

          {/* Filament decorativ */}
          <View style={styles.filamentContainer}>
            <View
              style={[
                styles.filament,
                {
                  borderColor: value ? activeColor + "80" : bulbColor,
                  transform: [{ rotate: "-45deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.filament,
                {
                  borderColor: value ? activeColor + "80" : bulbColor,
                  transform: [{ rotate: "45deg" }],
                },
              ]}
            />
          </View>

          {/* Reflection */}
          <View style={styles.reflection} />

          {/* Sparks */}
          <Animated.View
            style={[
              styles.spark,
              {
                width: dim.spark,
                height: dim.spark,
                borderRadius: dim.spark / 2,
                backgroundColor: sparkColor,
                top: -5,
                right: -8,
              },
              spark1Style,
            ]}
          />
          <Animated.View
            style={[
              styles.spark,
              {
                width: dim.spark,
                height: dim.spark,
                borderRadius: dim.spark / 2,
                backgroundColor: sparkColor,
                top: -10,
                left: dim.bulb / 2 - dim.spark / 2,
              },
              spark2Style,
            ]}
          />
          <Animated.View
            style={[
              styles.spark,
              {
                width: dim.spark * 0.8,
                height: dim.spark * 0.8,
                borderRadius: dim.spark * 0.4,
                backgroundColor: sparkColor,
                bottom: -5,
                right: dim.bulb / 3,
              },
              spark3Style,
            ]}
          />
          <Animated.View
            style={[
              styles.spark,
              {
                width: dim.spark * 0.7,
                height: dim.spark * 0.7,
                borderRadius: dim.spark * 0.35,
                backgroundColor: sparkColor,
                bottom: 2,
                left: -6,
              },
              spark4Style,
            ]}
          />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  track: {
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  glowEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bulb: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  innerRing: {
    position: "absolute",
    borderWidth: 2,
  },
  bulbCenter: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  innerDot: {
    position: "absolute",
  },
  filamentContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  filament: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  reflection: {
    position: "absolute",
    top: 4,
    left: 5,
    width: 8,
    height: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 4,
    transform: [{ rotate: "-30deg" }],
  },
  spark: {
    position: "absolute",
  },
});

export default BulbToggle;
