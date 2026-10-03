import React, { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Registry pentru atribuirea corecta a fisierului in rapoartele de testare pe NATIV.
 * Fiecare ecran/sub-view e impachetat automat (de plugin-ul Babel screen-source) cu
 * withScreenSource, care isi inregistreaza calea fisierului cat timp ecranul e focusat.
 * Asa raportul stie EXACT componenta vizibila, nu doar ruta de baza (care e des gresita).
 */

const stack = [];
let seq = 0;

// Toate fisierele componentelor montate+focusate acum (candidati pentru raport).
export const getScreenSources = () => stack.map((e) => e.file);

// Cel mai specific fisier montat: euristica = calea cea mai adanca (apoi cea mai lunga).
export const getBestScreenSource = () => {
  if (!stack.length) return null;
  const depth = (f) => f.split("/").length;
  let best = stack[0];
  for (const e of stack) {
    if (depth(e.file) > depth(best.file) || (depth(e.file) === depth(best.file) && e.file.length > best.file.length)) {
      best = e;
    }
  }
  return best.file;
};

// HOC injectat automat de plugin: inregistreaza fisierul cat timp ecranul e focusat.
export const withScreenSource = (Comp, file) => {
  const Wrapped = (props) => {
    useFocusEffect(
      useCallback(() => {
        const id = ++seq;
        stack.push({ id, file });
        return () => {
          const i = stack.findIndex((e) => e.id === id);
          if (i >= 0) stack.splice(i, 1);
        };
      }, [])
    );
    return React.createElement(Comp, props);
  };
  Wrapped.displayName = `S(${Comp.displayName || Comp.name || "Component"})`;
  return Wrapped;
};
