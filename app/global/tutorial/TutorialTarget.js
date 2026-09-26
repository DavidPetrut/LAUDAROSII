import React, { useRef, useEffect } from "react";
import { View, Platform } from "react-native";
import { useTutorial } from "./TutorialContext";

const IS_WEB = Platform.OS === "web";

/**
 * Inveleste un element interactiv ca sa poata fi tinta unui tutorial.
 * In modul "record" atingerea lui adauga un pas; in modul "play", daca e pasul
 * curent, lasa apasarea reala sa se produca si apoi avanseaza. Nu consuma
 * atingerea (foloseste onTouchStart), deci butonul copil functioneaza normal.
 *
 * Trece un `style` care pastreaza rolul de layout al copilului (ex. { flex: 1 }).
 */
export const TutorialTarget = ({ id, label, children, style }) => {
  const { registerTarget, unregisterTarget, mode, captureTarget, playTargetId, advancePlay } = useTutorial();
  const ref = useRef(null);

  useEffect(() => {
    registerTarget(id, ref, label || id);
    return () => unregisterTarget(id);
  }, [id, label, registerTarget, unregisterTarget]);

  // Pe web, inregistrarea si avansul se fac prin DOM (orice element). Aici tratam
  // doar nativul (registry): capturam / avansam pe atingerea elementului tinta.
  const onTouchStart = () => {
    if (mode === "record") {
      captureTarget(id);
    } else if (mode === "play" && id === playTargetId) {
      setTimeout(() => advancePlay(), 350);
    }
  };

  return (
    <View
      ref={ref}
      collapsable={false}
      style={style}
      onTouchStart={!IS_WEB && mode !== "idle" ? onTouchStart : undefined}
    >
      {children}
    </View>
  );
};

export default TutorialTarget;
