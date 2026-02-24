import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { GameImages } from "../assets";

const LevelCostBadge = ({
  cost,
  isUnlocked,
  canAfford,
  onPress,
  disabled = false,
}) => {
  if (cost === 0 && !isUnlocked) {
    return null;
  }

  if (isUnlocked) {
    return (
      <View style={[styles.container, styles.unlockedContainer]}>
        <Text style={styles.unlockedText}>✓</Text>
      </View>
    );
  }

  const isDisabled = disabled || !canAfford;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        canAfford ? styles.enabledContainer : styles.disabledContainer,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {!canAfford && <Text style={styles.lockIcon}>🔒</Text>}
      <Image
        source={GameImages.alabastru}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text
        style={[
          styles.cost,
          canAfford ? styles.costEnabled : styles.costDisabled,
        ]}
      >
        {cost}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  enabledContainer: {
    backgroundColor: "rgba(139, 92, 246, 0.8)",
  },
  disabledContainer: {
    backgroundColor: "rgba(100, 100, 100, 0.5)",
  },
  unlockedContainer: {
    backgroundColor: "rgba(34, 197, 94, 0.3)",
    paddingHorizontal: 12,
  },
  icon: {
    width: 16,
    height: 16,
  },
  cost: {
    fontSize: 12,
    fontWeight: "700",
  },
  costEnabled: {
    color: "#fff",
  },
  costDisabled: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  lockIcon: {
    fontSize: 10,
    marginRight: 2,
  },
  unlockedText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default React.memo(LevelCostBadge);
