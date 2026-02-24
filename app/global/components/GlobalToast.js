import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_DURATION = 3000;

const TOAST_TYPES = {
  success: {
    bgColor: "#1a2e2a",
    icon: "checkmark-circle",
    iconColor: "#2eea9d",
  },
  error: {
    bgColor: "#2e1a1a",
    icon: "close-circle",
    iconColor: "#fe6c9b",
  },
  info: {
    bgColor: "#1a1a2e",
    icon: "information-circle",
    iconColor: "#5a81ff",
  },
  mission: {
    bgColor: "#2e2a1a",
    icon: "megaphone",
    iconColor: "#fbbf24",
  },
};

export const GlobalToast = ({
  visible,
  type = "success",
  title,
  message,
  onClose,
  onPress,
  duration = DEFAULT_DURATION,
  icon,
}) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const config = TOAST_TYPES[type] || TOAST_TYPES.success;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose?.());
  };

  const handlePress = () => {
    if (onPress) {
      hideToast();
      onPress();
    }
  };

  if (!visible) return null;

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? { onPress: handlePress, activeOpacity: 0.9 }
    : {};

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity style={styles.closeBtn} onPress={hideToast}>
        <Ionicons name="close" size={18} color="#d9d9d9" />
      </TouchableOpacity>

      <Container style={styles.content} {...containerProps}>
        {icon && typeof icon === "object" ? (
          <Image source={icon} style={styles.customIcon} resizeMode="contain" />
        ) : (
          <Ionicons name={config.icon} size={32} color={config.iconColor} />
        )}
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          {onPress && (
            <Text style={styles.tapHint}>Apasă pentru a vedea</Text>
          )}
        </View>
      </Container>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 85,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 9999,
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  message: {
    color: "#ccc",
    fontSize: 13,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  customIcon: {
    width: 32,
    height: 32,
  },
  tapHint: {
    color: "#fbbf24",
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },
});
