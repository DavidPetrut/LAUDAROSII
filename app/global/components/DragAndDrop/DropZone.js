import React, { useEffect, useRef, useCallback, useState } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useDrag } from "./DragContext";

/**
 * DropZone - Definește o zonă unde se pot face drop-uri
 *
 * Props:
 * - id: identificator unic pentru zona de drop
 * - acceptTypes: array de tipuri de iteme acceptate (ex: ['shield', 'sword'])
 * - onDrop: callback când se face drop valid
 * - onDragOver: callback când un item este deasupra zonei
 * - onDragLeave: callback când un item părăsește zona
 * - highlightStyle: stil aplicat când un item valid este deasupra
 * - children: conținutul zonei
 * - style: stiluri pentru container
 */
const DropZone = ({
  id,
  acceptTypes = [],
  onDrop,
  onDragOver,
  onDragLeave,
  highlightStyle,
  children,
  style,
}) => {
  const {
    registerDropZone,
    unregisterDropZone,
    isDragging,
    getActiveDropZone,
    draggedItem,
  } = useDrag();

  const viewRef = useRef(null);
  const boundsRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const wasActiveRef = useRef(false);

  // Măsoară și înregistrează zona
  const measureAndRegister = useCallback(() => {
    if (viewRef.current) {
      viewRef.current.measureInWindow((x, y, width, height) => {
        boundsRef.current = { x, y, width, height };

        registerDropZone(id, {
          bounds: boundsRef.current,
          acceptTypes,
          onDrop,
        });
      });
    }
  }, [id, acceptTypes, onDrop, registerDropZone]);

  // Înregistrează zona la mount
  useEffect(() => {
    measureAndRegister();

    return () => {
      unregisterDropZone(id);
    };
  }, [id, measureAndRegister, unregisterDropZone]);

  // Re-măsoară când se schimbă layout-ul
  const onLayout = useCallback(() => {
    measureAndRegister();
  }, [measureAndRegister]);

  // Verifică dacă zona este activă când se face drag
  useEffect(() => {
    if (isDragging) {
      const activeZone = getActiveDropZone();
      const nowActive = activeZone === id;

      if (nowActive !== wasActiveRef.current) {
        if (nowActive) {
          onDragOver?.(draggedItem);
          // Animație de highlight
          Animated.spring(highlightAnim, {
            toValue: 1,
            useNativeDriver: false,
          }).start();
        } else {
          onDragLeave?.(draggedItem);
          Animated.spring(highlightAnim, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
        wasActiveRef.current = nowActive;
      }

      setIsActive(nowActive);
    } else {
      if (wasActiveRef.current) {
        wasActiveRef.current = false;
        Animated.spring(highlightAnim, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
      setIsActive(false);
    }
  }, [
    isDragging,
    getActiveDropZone,
    id,
    draggedItem,
    onDragOver,
    onDragLeave,
    highlightAnim,
  ]);

  // Stil de highlight animat
  const animatedHighlightStyle = highlightStyle
    ? {
        ...highlightStyle,
        opacity: highlightAnim,
      }
    : {
        borderWidth: highlightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 3],
        }),
        borderColor: "rgba(100, 200, 255, 0.8)",
        borderRadius: 10,
      };

  return (
    <View ref={viewRef} onLayout={onLayout} style={[styles.container, style]}>
      {children}

      {/* Overlay de highlight */}
      {isDragging && (
        <Animated.View
          style={[styles.highlightOverlay, animatedHighlightStyle]}
          pointerEvents="none"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
});

export default DropZone;
