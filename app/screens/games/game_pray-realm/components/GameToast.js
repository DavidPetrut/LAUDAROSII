import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Image } from "react-native";
import { rem } from "../constants/dimensions";

/**
 * GameToast - Toast component reutilizabil pentru joc
 *
 * Props:
 * - visible: boolean - dacă toast-ul e vizibil
 * - message: string - mesajul simplu de afișat (pentru backward compatibility)
 * - title: string - titlul toast-ului (opțional, afișat deasupra)
 * - subtitle: string - subtitlu (opțional, afișat dedesubt)
 * - icon: ImageSource - iconița de afișat (opțional)
 * - onHide: function - callback când toast-ul dispare
 * - duration: number - durata în ms (default 2000)
 * - variant: "default" | "warning" | "success" | "info" - tipul de toast
 */
const GameToast = ({
  visible,
  message,
  title,
  subtitle,
  icon,
  onHide,
  duration = 2000,
  variant = "default",
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Animație de apariție
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // După duration ms, dispare
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  // Stiluri bazate pe variant
  const variantStyles = {
    default: {
      borderColor: "rgba(139, 92, 246, 0.6)",
      shadowColor: "#8b5cf6",
    },
    warning: {
      borderColor: "rgba(251, 191, 36, 0.7)",
      shadowColor: "#fbbf24",
    },
    success: {
      borderColor: "rgba(34, 197, 94, 0.7)",
      shadowColor: "#22c55e",
    },
    info: {
      borderColor: "rgba(59, 130, 246, 0.7)",
      shadowColor: "#3b82f6",
    },
  };

  const currentVariantStyle = variantStyles[variant] || variantStyles.default;

  // Determină dacă e toast simplu sau complex
  const isSimple = !title && !icon && !subtitle;
  // Toast inline: icon și message pe aceeași linie
  const isInline = icon && message && !title && !subtitle;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          currentVariantStyle,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        {isSimple ? (
          // Toast simplu (backward compatible)
          <Text style={styles.message}>{message}</Text>
        ) : isInline ? (
          // Toast inline: icon + message pe aceeași linie
          <View style={styles.inlineContent}>
            <Image
              source={icon}
              style={styles.inlineIcon}
              resizeMode="contain"
            />
            <Text style={styles.inlineMessage}>{message}</Text>
          </View>
        ) : (
          // Toast complex cu titlu, iconă și subtitlu
          <View style={styles.complexContent}>
            {title && <Text style={styles.title}>{title}</Text>}
            {icon && (
              <View style={styles.iconContainer}>
                <Image source={icon} style={styles.icon} resizeMode="contain" />
              </View>
            )}
            {(message || subtitle) && (
              <Text style={styles.subtitle}>{subtitle || message}</Text>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    backgroundColor: "rgba(15, 15, 25, 0.95)",
    paddingHorizontal: rem(24),
    paddingVertical: rem(16),
    borderRadius: rem(16),
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    maxWidth: "85%",
    minWidth: rem(180),
  },
  // Toast simplu
  message: {
    color: "#fbbf24",
    fontSize: rem(15),
    fontWeight: "700",
    textAlign: "center",
  },
  // Toast inline (icon + message pe aceeași linie)
  inlineContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineIcon: {
    width: rem(28),
    height: rem(28),
    marginRight: rem(8),
  },
  inlineMessage: {
    color: "#fbbf24",
    fontSize: rem(18),
    fontWeight: "700",
  },
  // Toast complex
  complexContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#e2e8f0",
    fontSize: rem(14),
    fontWeight: "600",
    textAlign: "center",
    marginBottom: rem(10),
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  iconContainer: {
    marginVertical: rem(8),
    padding: rem(8),
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: rem(12),
  },
  icon: {
    width: rem(50),
    height: rem(50),
  },
  subtitle: {
    color: "#a78bfa",
    fontSize: rem(13),
    fontWeight: "500",
    textAlign: "center",
    marginTop: rem(8),
  },
});

export default GameToast;
