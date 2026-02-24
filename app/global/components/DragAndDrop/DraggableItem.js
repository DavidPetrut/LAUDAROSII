import React, { useRef, useState, useEffect, useCallback } from "react";
import { Animated, Platform, StyleSheet } from "react-native";
import { useDrag } from "./DragContext";

/**
 * DraggableItem - Face orice element child draggable
 * Suportă atât mobile (touch) cât și web (mouse)
 */
const DraggableItem = ({
  item,
  disabled = false,
  onDragStart,
  onDragEnd,
  holdDuration = 200,
  children,
  style,
}) => {
  const { startDrag, updateDragPosition, endDrag, isDragging, draggedItem } =
    useDrag();

  // State pentru drag
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);

  // Poziția animată pentru smooth movement
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Referințe pentru poziții
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const holdTimer = useRef(null);
  const isDraggingRef = useRef(false);

  const isThisItemDragging = isDragging && draggedItem?.id === item?.id;

  // Cleanup la unmount
  useEffect(() => {
    return () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
      }
    };
  }, []);

  // Funcție pentru a începe drag-ul
  const handleDragStart = useCallback(() => {
    if (disabled) return;

    isDraggingRef.current = true;
    setIsDraggingLocal(true);

    // Animație de "ridicare"
    Animated.spring(scale, {
      toValue: 1.15,
      friction: 5,
      useNativeDriver: true,
    }).start();

    // Notifică context-ul
    startDrag(item, startPos.current);
    onDragStart?.(item);
  }, [disabled, item, startDrag, onDragStart, scale]);

  // Handler pentru mouse/touch down
  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;

      // Previne selectarea textului
      e.preventDefault?.();

      // Obține coordonatele
      const clientX =
        e.clientX ?? e.touches?.[0]?.clientX ?? e.nativeEvent?.pageX;
      const clientY =
        e.clientY ?? e.touches?.[0]?.clientY ?? e.nativeEvent?.pageY;

      startPos.current = { x: clientX, y: clientY };
      currentPos.current = { x: clientX, y: clientY };

      // Începe timer pentru hold
      holdTimer.current = setTimeout(() => {
        handleDragStart();
      }, holdDuration);
    },
    [disabled, holdDuration, handleDragStart]
  );

  // Handler pentru mouse/touch move
  const handlePointerMove = useCallback(
    (e) => {
      if (disabled) return;

      const clientX =
        e.clientX ?? e.touches?.[0]?.clientX ?? e.nativeEvent?.pageX;
      const clientY =
        e.clientY ?? e.touches?.[0]?.clientY ?? e.nativeEvent?.pageY;

      // Calculează distanța
      const dx = clientX - startPos.current.x;
      const dy = clientY - startPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Dacă s-a mișcat prea mult înainte de hold, anulează hold-ul
      if (!isDraggingRef.current && distance > 10 && holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
        return;
      }

      // Dacă nu e în drag, nu face nimic
      if (!isDraggingRef.current) return;

      currentPos.current = { x: clientX, y: clientY };

      // Actualizează poziția animată
      translateX.setValue(dx);
      translateY.setValue(dy);

      // Actualizează poziția în context
      updateDragPosition({ x: clientX, y: clientY });
    },
    [disabled, translateX, translateY, updateDragPosition]
  );

  // Handler pentru mouse/touch up
  const handlePointerUp = useCallback(
    (e) => {
      // Curăță timer-ul
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }

      // Dacă nu era în drag, nu face nimic
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDraggingLocal(false);

      // Termină drag-ul și verifică drop
      const dropResult = endDrag(currentPos.current);

      // Animație de revenire
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      onDragEnd?.(item, dropResult);
    },
    [item, endDrag, translateX, translateY, scale, onDragEnd]
  );

  // Pentru web - adaugă event listeners globali când drag-ul începe
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isDraggingLocal) return;

    const handleGlobalMouseMove = (e) => handlePointerMove(e);
    const handleGlobalMouseUp = (e) => handlePointerUp(e);

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchmove", handleGlobalMouseMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalMouseMove);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDraggingLocal, handlePointerMove, handlePointerUp]);

  // Props pentru web
  const webProps =
    Platform.OS === "web"
      ? {
          onMouseDown: handlePointerDown,
          onTouchStart: handlePointerDown,
          style: {
            cursor: disabled
              ? "default"
              : isDraggingLocal
              ? "grabbing"
              : "grab",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
          },
        }
      : {};

  // Props pentru mobile (React Native)
  const mobileProps =
    Platform.OS !== "web"
      ? {
          onStartShouldSetResponder: () => !disabled,
          onMoveShouldSetResponder: () => !disabled && isDraggingRef.current,
          onResponderGrant: handlePointerDown,
          onResponderMove: handlePointerMove,
          onResponderRelease: handlePointerUp,
          onResponderTerminate: handlePointerUp,
        }
      : {};

  return (
    <Animated.View
      {...webProps}
      {...mobileProps}
      style={[
        style,
        {
          transform: [
            { translateX: translateX },
            { translateY: translateY },
            { scale: scale },
          ],
          zIndex: isThisItemDragging ? 9999 : 1,
        },
        Platform.OS === "web" && webProps.style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default DraggableItem;
