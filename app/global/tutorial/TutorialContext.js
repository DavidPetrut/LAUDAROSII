import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { useAuth } from "../context";
import { describeElement } from "../components/testing/webInspector";
import { tutorialApi } from "./tutorialApi";

const IS_WEB = Platform.OS === "web";
// Elementul interactiv cel mai relevant din jurul tintei unui click.
const INTERACTIVE_SEL = "button, a, input, textarea, select, [role='button'], [data-testid]";

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
  measureStep: async () => null,
  captureElement: NOOP,
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

  // Autoratul (inregistrarea) se face DOAR pe PC/web (clic pe elemente reale din DOM).
  const canAuthor = authoringEnabled && isAuthorRole && IS_WEB;

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

  // Masoara pozitia tintei unui pas: pe web dupa selectorul DOM; altfel din registry.
  const measureStep = useCallback(
    (step) =>
      new Promise((resolve) => {
        if (!step) return resolve(null);
        if (IS_WEB && step.selector && typeof document !== "undefined") {
          try {
            const node = document.querySelector(step.selector);
            if (node) {
              const r = node.getBoundingClientRect();
              if (r.width || r.height) return resolve({ x: r.left, y: r.top, w: r.width, h: r.height });
            }
          } catch (e) {}
        }
        if (step.targetId) {
          const node = registry.current.get(step.targetId)?.ref?.current;
          if (node?.measureInWindow) {
            return node.measureInWindow((x, y, w, h) => resolve(w || h ? { x, y, w, h } : null));
          }
        }
        resolve(null);
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

  // Inregistreaza un pas dintr-un element DOM (web): orice buton/input/link/etc.
  const captureElement = useCallback((descriptor) => {
    const label =
      (descriptor.componentStack && descriptor.componentStack[descriptor.componentStack.length - 1]) ||
      descriptor.text ||
      descriptor.tag ||
      "element";
    setRecordSteps((prev) => [
      ...prev,
      { selector: descriptor.selector || null, label: String(label).slice(0, 80), text: descriptor.text || "", instruction: "" },
    ]);
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

  // INREGISTRARE (web): fiecare clic pe un element real devine un pas. Nu blocam
  // actiunea (fara preventDefault) ca autorul sa parcurga fluxul normal.
  useEffect(() => {
    if (!IS_WEB || mode !== "record" || typeof document === "undefined") return;
    const onClick = (e) => {
      const el = e.target;
      if (!el || (el.closest && el.closest("[data-tutorial-ui]"))) return;
      const target = (el.closest && el.closest(INTERACTIVE_SEL)) || el;
      try {
        captureElement(describeElement(target));
      } catch (err) {}
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mode, captureElement]);

  // REDARE (web): avanseaza cand userul apasa pe elementul-tinta al pasului curent.
  useEffect(() => {
    if (!IS_WEB || mode !== "play" || typeof document === "undefined") return;
    const step = currentPlayStep;
    if (!step?.selector) return;
    const onClick = (e) => {
      const el = e.target;
      if (!el || (el.closest && el.closest("[data-tutorial-ui]"))) return;
      let node = null;
      try { node = document.querySelector(step.selector); } catch (err) {}
      if (node && (node === el || node.contains(el) || (el.contains && el.contains(node)))) {
        setTimeout(() => advancePlay(), 250);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mode, playIndex, currentPlayStep, advancePlay]);

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
        measureStep,
        captureElement,
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
