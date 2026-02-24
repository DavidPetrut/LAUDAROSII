import React, { useState, useRef } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { api, showError } from "../../global/functions";
import { PrayerIntegrationService } from "../games/game_pray-realm/services/prayerIntegrationService";

// Componenta Cross Icon
const CrossIcon = ({ size = 28, color = "#21c063" }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <Path
      d="M12 4v16"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7.5 8.5h9"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PrayedButton = ({ 
  prayerOwnerId, 
  currentUserId, 
  prayerId, 
  onPrayed,
  onCustomPray,
  tab = "personal", 
  forPerson = false 
}) => {
  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }),
    ]).start();
  };

  const handlePress = async () => {
    animatePress();
    setLoading(true);
    try {
      if (onCustomPray) {
        await onCustomPray(prayerId);
      } else {
        await api.post(`/prayers/personal/${prayerOwnerId}/${prayerId}/prayed`);
      }
      
      if (currentUserId) {
        await PrayerIntegrationService.onPrayerCompleted(currentUserId, {
          prayerId,
          tab,
          forPerson,
        });
      }
      
      onPrayed?.(prayerId);
    } catch (e) {
      showError(e.message || "Eroare");
      setLoading(false);
    }
  };

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}
    >
      <TouchableOpacity
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.8}
        accessibilityLabel="M-am rugat"
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#21c063" />
        ) : (
          <View style={styles.content}>
            <CrossIcon size={14} color="#21c063" />
            <Text style={styles.text}>M-am rugat</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    shadowColor: "#21c063",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderRadius: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#21c063",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  icon: {
    width: 16,
    height: 16,
  },
  text: {
    color: "#21c063",
    fontWeight: "600",
    fontSize: 13,
  },
});
