import { useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";

/**
 * Intercepteaza butonul BACK hardware in timpul unei sesiuni: la prima apasare
 * pune pauza si cere confirmare, la a doua (pe dialog) revine. Nu iese brusc din
 * ecran. `stay` reia, `exit` chiar iese.
 */
export const useExitConfirm = ({ onExit, onPause, onResume }) => {
  const [visible, setVisible] = useState(false);
  const state = useRef({ visible: false });
  state.current.visible = visible;
  state.current.onExit = onExit;
  state.current.onPause = onPause;
  state.current.onResume = onResume;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (state.current.visible) {
        setVisible(false);
        state.current.onResume?.();
        return true;
      }
      state.current.onPause?.();
      setVisible(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  const stay = () => {
    setVisible(false);
    state.current.onResume?.();
  };
  const exit = () => {
    setVisible(false);
    state.current.onExit?.();
  };

  return { visible, stay, exit };
};

export default useExitConfirm;
