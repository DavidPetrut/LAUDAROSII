import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * TransitionContext - Sistem global pentru tranziții animate între ecrane
 *
 * Utilizare simplă:
 * const { playTransition } = useTransition();
 *
 * playTransition({
 *   video: require("path/to/video.mp4"),
 *   onComplete: () => navigateToScreen(),
 *   duration: 2000, // optional, default detectat automat
 * });
 */

const TransitionContext = createContext(null);

// Configurare video-uri predefinite pentru acces rapid
export const TRANSITION_VIDEOS = {
  washingFeet: require("../../public/videos/washing_feet.mp4"),
  // Adauga aici alte video-uri pentru tranziții
  // example: require("../../public/videos/example.mp4"),
};

export const TransitionProvider = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTransition, setCurrentTransition] = useState(null);

  /**
   * Pornește o tranziție animată
   * @param {Object} config - Configurarea tranziției
   * @param {any} config.video - Sursa video (require sau uri)
   * @param {Function} config.onComplete - Callback după terminarea animației
   * @param {number} config.duration - Durata în ms (optional, default: autodetect)
   * @param {string} config.backgroundColor - Culoarea de fundal (default: #000)
   * @param {string} config.resizeMode - "contain" | "cover" | "stretch" (default: contain)
   * @param {number} config.scale - Scala video-ului 0.1-1.0 (default: 0.65 = 65% din ecran)
   */
  const playTransition = useCallback(
    (config) => {
      if (isPlaying) return; // Previne suprapunerea tranzițiilor

      setCurrentTransition({
        video: config.video,
        onComplete: config.onComplete || (() => {}),
        duration: config.duration || null, // null = autodetect din video
        backgroundColor: config.backgroundColor || "#1e1e1e",
        resizeMode: config.resizeMode || null, // null = CONTAIN (default)
        scale: config.scale || 1, // 100% din ecran default
      });
      setIsPlaying(true);
    },
    [isPlaying]
  );

  /**
   * Oprește tranziția curentă (folosit intern)
   */
  const stopTransition = useCallback(() => {
    if (currentTransition?.onComplete) {
      currentTransition.onComplete();
    }
    setIsPlaying(false);
    setCurrentTransition(null);
  }, [currentTransition]);

  /**
   * Shortcut pentru tranziții predefinite
   * @param {string} name - Numele tranziției din TRANSITION_VIDEOS
   * @param {Function} onComplete - Callback după terminare
   */
  const playPreset = useCallback(
    (name, onComplete) => {
      const video = TRANSITION_VIDEOS[name];
      if (video) {
        playTransition({ video, onComplete });
      } else {
        console.warn(`Transition "${name}" not found in TRANSITION_VIDEOS`);
        onComplete?.();
      }
    },
    [playTransition]
  );

  return (
    <TransitionContext.Provider
      value={{
        isPlaying,
        currentTransition,
        playTransition,
        playPreset,
        stopTransition,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
};

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error("useTransition must be used within TransitionProvider");
  }
  return context;
};
