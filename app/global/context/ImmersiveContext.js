import React, { createContext, useContext, useState } from "react";

/**
 * Mod imersiv: cat timp e activ, ascunde cromul aplicatiei (ex: bara de navigatie
 * de jos) pentru ecranele care cer atentie totala (ex: sesiunea Devotional).
 * Global fiindca bara de jos e la nivel de aplicatie, nu de ecran.
 */
const ImmersiveContext = createContext({ immersive: false, setImmersive: () => {} });

export const ImmersiveProvider = ({ children }) => {
  const [immersive, setImmersive] = useState(false);
  return (
    <ImmersiveContext.Provider value={{ immersive, setImmersive }}>
      {children}
    </ImmersiveContext.Provider>
  );
};

export const useImmersive = () => useContext(ImmersiveContext);
