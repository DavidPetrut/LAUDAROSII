import React, { useEffect, useRef } from "react";
import { TouchableOpacity, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DevotionalIcon } from "./DevotionalIcon";

const GREEN = "#10b981";

// Chip subtil verde din bara Bibliei (mod layer): iconul momentului + timpul care
// curge; cand timpul s-a scurs, timpul devine o bifa pulsand. Tap = inapoi in player.
export const DevotionalReturnChip = ({ iconSet, icon, timeLabel, done, onReturn }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!done) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [done]);

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onReturn}
      activeOpacity={0.8}
      accessibilityLabel="Înapoi la devotional"
    >
      <DevotionalIcon set={iconSet} name={icon} size={18} color={GREEN} />
      {done ? (
        <Animated.View style={{ opacity: pulse }}>
          <Ionicons name="checkmark-circle" size={18} color={GREEN} />
        </Animated.View>
      ) : (
        <Text style={styles.time}>{timeLabel}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(16,185,129,0.14)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.5)",
    marginRight: 6,
    shadowColor: GREEN,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  time: { color: GREEN, fontWeight: "700", fontSize: 13 },
});

export default DevotionalReturnChip;
