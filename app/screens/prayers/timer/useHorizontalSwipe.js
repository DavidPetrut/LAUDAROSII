import { useRef } from "react";
import { PanResponder } from "react-native";

/**
 * Detecteaza swipe orizontal (stanga/dreapta) fara element vizual. Capteaza doar
 * miscari clar orizontale, ca sa nu blocheze scroll-ul vertical (ex: modul Listă)
 * si sa nu fure tap-urile pe butoane. Intoarce panHandlers de pus pe overlay.
 */
export const useHorizontalSwipe = ({ onSwipeLeft, onSwipeRight, enabled = true, threshold = 55 }) => {
  const cb = useRef({ onSwipeLeft, onSwipeRight, enabled });
  cb.current = { onSwipeLeft, onSwipeRight, enabled };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        cb.current.enabled && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_e, g) => {
        if (!cb.current.enabled) return;
        if (g.dx >= threshold) cb.current.onSwipeRight?.();
        else if (g.dx <= -threshold) cb.current.onSwipeLeft?.();
      },
    })
  ).current;

  return responder.panHandlers;
};

export default useHorizontalSwipe;
