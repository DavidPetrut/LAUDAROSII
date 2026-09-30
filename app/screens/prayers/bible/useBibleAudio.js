import { useEffect, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { buildTtsSource } from "./bibleApi";

// Player TTS controlat din ecran. Ecranul decide ce capitol se reda si ce se
// intampla la final (auto-advance). state: idle | loading | playing | paused | error
export const useBibleAudio = ({ onFinished } = {}) => {
  const [state, setState] = useState("idle");
  const playerRef = useRef(null);
  const timeoutRef = useRef(null);
  const activeRef = useRef(true);
  const finishedRef = useRef(onFinished);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  const cleanup = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const p = playerRef.current;
    playerRef.current = null;
    if (p) {
      try {
        p.pause();
        p.remove();
      } catch (e) {}
    }
  };

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      cleanup();
    };
  }, []);

  const playChapter = async (translation, book, chapter) => {
    cleanup();
    setState("loading");
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    } catch (e) {}
    let source;
    try {
      source = await buildTtsSource(translation, book, chapter);
    } catch (e) {
      setState("error");
      return;
    }
    try {
      const player = createAudioPlayer(source);
      playerRef.current = player;
      player.play();
      player.addListener("playbackStatusUpdate", (s) => {
        if (!activeRef.current) return;
        if (s?.didJustFinish) {
          cleanup();
          setState("idle");
          finishedRef.current?.();
        } else if (s?.playing) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setState("playing");
        }
      });
      timeoutRef.current = setTimeout(() => {
        if (activeRef.current) {
          cleanup();
          setState("error");
        }
      }, 90000);
    } catch (e) {
      setState("error");
    }
  };

  const pause = () => {
    try {
      playerRef.current?.pause();
    } catch (e) {}
    setState("paused");
  };

  const resume = () => {
    try {
      playerRef.current?.play();
    } catch (e) {}
    setState("playing");
  };

  const stop = () => {
    cleanup();
    setState("idle");
  };

  return { state, playChapter, pause, resume, stop };
};
