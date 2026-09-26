import React, { useRef, useEffect } from "react";
import { View } from "react-native";
import { useTutorial } from "./TutorialContext";

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
      onTouchStart={mode === "idle" ? undefined : onTouchStart}
    >
      {children}
    </View>
  );
};

export default TutorialTarget;
