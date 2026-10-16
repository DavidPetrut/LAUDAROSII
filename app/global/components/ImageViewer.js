import React, { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Pressable,
  Animated,
  PanResponder,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

const dist = (t) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Viewer fullscreen reutilizabil pentru o imagine: pinch-zoom + pan + dublu-tap, buton X și
 * back (onRequestClose), plus rotire în landscape. Pur JS → livrabil prin OTA, cross-platform.
 */
export const ImageViewer = ({ visible, uri, onClose }) => {
  const { width, height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const curScale = useRef(1);
  const lastScale = useRef(1);
  const lastTranslate = useRef({ x: 0, y: 0 });
  const startDist = useRef(0);
  const startScale = useRef(1);
  const lastTap = useRef(0);

  const reset = (animated = true) => {
    curScale.current = 1;
    lastScale.current = 1;
    lastTranslate.current = { x: 0, y: 0 };
    startDist.current = 0;
    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
        Animated.spring(translate, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
      ]).start();
    } else {
      scale.setValue(1);
      translate.setValue({ x: 0, y: 0 });
    }
  };

  const zoomTo = (v) => {
    curScale.current = v;
    lastScale.current = v;
    Animated.spring(scale, { toValue: v, useNativeDriver: false }).start();
  };

  // Permite rotirea în landscape cât timp viewerul e deschis; revine la portret la închidere.
  const lockPortrait = () => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  useEffect(() => {
    if (visible) ScreenOrientation.unlockAsync().catch(() => {});
    return () => { if (visible) lockPortrait(); };
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        g.numberActiveTouches === 2 || Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          startDist.current = dist(touches);
          startScale.current = lastScale.current;
          return;
        }
        const now = Date.now();
        if (now - lastTap.current < 280) {
          lastScale.current > 1 ? reset() : zoomTo(DOUBLE_TAP_SCALE);
          lastTap.current = 0;
        } else {
          lastTap.current = now;
        }
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          // Al doilea deget poate ateriza după grant (care a pornit cu 1 deget) → init aici.
          if (startDist.current === 0) {
            startDist.current = dist(touches);
            startScale.current = lastScale.current;
            return;
          }
          const next = clamp(startScale.current * (dist(touches) / startDist.current), 1, MAX_SCALE);
          curScale.current = next;
          scale.setValue(next);
        } else if (touches.length === 1 && lastScale.current > 1) {
          translate.setValue({ x: lastTranslate.current.x + g.dx, y: lastTranslate.current.y + g.dy });
        }
      },
      onPanResponderRelease: (_, g) => {
        if (startDist.current > 0) {
          lastScale.current = clamp(curScale.current, 1, MAX_SCALE);
          startDist.current = 0;
          if (lastScale.current <= 1.01) reset();
          return;
        }
        if (lastScale.current > 1) {
          lastTranslate.current = {
            x: lastTranslate.current.x + g.dx,
            y: lastTranslate.current.y + g.dy,
          };
        }
      },
    }),
  ).current;

  const handleClose = () => {
    reset(false);
    lockPortrait();
    onClose && onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={handleClose}
      onShow={() => reset(false)}
    >
      <View style={styles.backdrop}>
        <StatusBar hidden />
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
          {uri ? (
            <Animated.Image
              source={{ uri }}
              resizeMode="contain"
              style={[
                { width, height },
                { transform: [{ translateX: translate.x }, { translateY: translate.y }, { scale }] },
              ]}
            />
          ) : null}
        </View>
        <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={10}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  closeBtn: {
    position: "absolute",
    top: 44,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ImageViewer;
