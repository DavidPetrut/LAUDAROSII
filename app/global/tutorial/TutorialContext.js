import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context";
import { tutorialApi } from "./tutorialApi";

const TutorialContext = createContext(null);

const NOOP = () => {};
const SAFE = {
  canAuthor: false,
  authoringEnabled: false,
  isAuthorRole: false,
  mode: "idle",
  registryVersion: 0,
  registerTarget: NOOP,
  unregisterTarget: NOOP,
  measureTarget: async () => null,
  recordSteps: [],
  startRecording: NOOP,
  captureTarget: NOOP,
  finishRecording: NOOP,
  cancelRecording: NOOP,
  reviewOpen: false,
  closeReview: NOOP,
  setRecordSteps: NOOP,
  playTutorial: null,
  playIndex: 0,
  currentPlayStep: null,
  playTargetId: null,
  startPlay: NOOP,
  advancePlay: NOOP,
  stopPlay: NOOP,
  reloadConfig: NOOP,
};

/**
 * Motorul tutorialelor de tip spotlight: tine registrul elementelor tinta
 * (<TutorialTarget>), starea de inregistrare (autor) si de redare (user).
 */
export const TutorialProvider = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const role = user?.role;
  const isAuthorRole = isSuperAdmin || role === "developer";

  const [authoringEnabled, setAuthoringEnabled] = useState(false);
  const [mode, setMode] = useState("idle"); // idle | record | play
  const [recordSteps, setRecordSteps] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [playTutorial, setPlayTutorial] = useState(null);
  const [playIndex, setPlayIndex] = useState(0);
  const [registryVersion, setRegistryVersion] = useState(0);

  const registry = useRef(new Map());

  const canAuthor = authoringEnabled && isAuthorRole;

  const reloadConfig = useCallback(() => {
    tutorialApi
      .config()
      .then((r) => setAuthoringEnabled(!!r.authoringEnabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setAuthoringEnabled(false);
      return;
    }
    reloadConfig();
  }, [user?.id, reloadConfig]);

  const registerTarget = useCallback((id, ref, label) => {
    registry.current.set(id, { ref, label });
    setRegistryVersion((v) => v + 1);
  }, []);

  const unregisterTarget = useCallback((id) => {
    registry.current.delete(id);
    setRegistryVersion((v) => v + 1);
  }, []);

  const measureTarget = useCallback(
    (id) =>
      new Promise((resolve) => {
        const node = registry.current.get(id)?.ref?.current;
        if (!node || !node.measureInWindow) return resolve(null);
        node.measureInWindow((x, y, w, h) => {
          if (!w && !h) return resolve(null);
          resolve({ x, y, w, h });
        });
      }),
    []
  );

  // ---- Inregistrare (autor) ----
  const startRecording = useCallback(() => {
    setRecordSteps([]);
    setReviewOpen(false);
    setMode("record");
  }, []);

  const captureTarget = useCallback((id) => {
    const label = registry.current.get(id)?.label || id;
    setRecordSteps((prev) => [...prev, { targetId: id, label, instruction: "" }]);
  }, []);

  const finishRecording = useCallback(() => {
    setMode("idle");
    setReviewOpen(true);
  }, []);

  const cancelRecording = useCallback(() => {
    setMode("idle");
    setRecordSteps([]);
    setReviewOpen(false);
  }, []);

  const closeReview = useCallback(() => {
    setReviewOpen(false);
    setRecordSteps([]);
  }, []);

  // ---- Redare (user) ----
  const startPlay = useCallback((tutorial) => {
    if (!tutorial?.steps?.length) return;
    setPlayTutorial(tutorial);
    setPlayIndex(0);
    setMode("play");
  }, []);

  const stopPlay = useCallback(() => {
    setMode("idle");
    setPlayTutorial(null);
    setPlayIndex(0);
  }, []);

  const advancePlay = useCallback(() => {
    setPlayIndex((i) => {
      const total = playTutorial?.steps?.length || 0;
      if (i + 1 >= total) {
        setMode("idle");
        setPlayTutorial(null);
        return 0;
      }
      return i + 1;
    });
  }, [playTutorial]);

  const currentPlayStep = mode === "play" && playTutorial ? playTutorial.steps[playIndex] : null;
  const playTargetId = currentPlayStep?.targetId || null;

  return (
    <TutorialContext.Provider
      value={{
        canAuthor,
        authoringEnabled,
        isAuthorRole,
        mode,
        registryVersion,
        registerTarget,
        unregisterTarget,
        measureTarget,
        recordSteps,
        startRecording,
        captureTarget,
        finishRecording,
        cancelRecording,
        reviewOpen,
        closeReview,
        setRecordSteps,
        playTutorial,
        playIndex,
        currentPlayStep,
        playTargetId,
        startPlay,
        advancePlay,
        stopPlay,
        reloadConfig,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => useContext(TutorialContext) || SAFE;
