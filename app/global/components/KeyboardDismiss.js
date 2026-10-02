import React, { useState, useEffect } from "react";
import { Keyboard, TouchableWithoutFeedback, View, Platform } from "react-native";

/**
 * Regula generala pentru scris pe mobil: apasand ORIUNDE in afara unui input sau
 * buton, tastatura se inchide (pe iPhone input-urile multiline nu au "Done").
 * Taps pe butoane/scroll raman normale (isi capteaza singure atingerea); doar
 * atingerile pe zone goale inchid tastatura. Pe web e no-op (nu exista tastatura).
 *
 * Interceptarea gestului e activa DOAR cat timp tastatura e deschisa; cand e
 * inchisa, wrapper-ul devine pasiv (disabled) ca sa nu "fure" momentan swipe-ul de
 * scroll pe Android. Structura arborelui ramane identica, deci nu remonteaza copiii.
 *
 * Se pune la radacina app-ului SI in interiorul fiecarui <Modal> (modalele RN se
 * randeaza intr-un arbore separat, deci wrapper-ul global nu le acopera).
 */
export const KeyboardDismiss = ({ children, style }) => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS === "web") return children;

  return (
    <TouchableWithoutFeedback
      accessible={false}
      disabled={!keyboardOpen}
      onPress={() => Keyboard.dismiss()}
    >
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );
};

export default KeyboardDismiss;
