import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "./devotionalStyles";

/**
 * Mica "notificare" centrala aparuta la schimbarea melodiei prin swipe: titlul
 * piesei si o sageata (dreapta = next, stanga = prev). Fade in/out lin, ~1.5s.
 * `toast` = { id, title, dir }; un id nou reporneste animatia.
 */
export const SwipeToast = ({ toast }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast?.id) return;
    opacity.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 650, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [toast?.id]);

  if (!toast?.title) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.swipeToastWrap, { opacity }]}>
      <View style={styles.swipeToast}>
        {toast.dir === "right" && <Ionicons name="arrow-back" size={16} color="#d4d4d8" />}
        <Text style={styles.swipeToastText} numberOfLines={1}>{toast.title}</Text>
        {toast.dir === "left" && <Ionicons name="arrow-forward" size={16} color="#d4d4d8" />}
      </View>
    </Animated.View>
  );
};

export default SwipeToast;
