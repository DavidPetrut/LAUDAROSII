import React from "react";
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  View,
  Text,
  Animated,
} from "react-native";
import { GameImages } from "../assets";

const GameIcon = ({ onPress, hasNotification = false, size = 80 }) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.container,
          { width: size, height: size, transform: [{ scale: scaleValue }] },
        ]}
      >
        <Image
          source={GameImages.logoApp}
          style={[styles.icon, { width: size * 0.8, height: size * 0.8 }]}
          resizeMode="contain"
        />
        {hasNotification && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>!</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    borderRadius: 12,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default React.memo(GameIcon);
