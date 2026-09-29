import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { useAuth } from "../context";
import { describeElement } from "../components/testing/webInspector";
import { tutorialApi } from "./tutorialApi";
import { getCurrentTutorialScreen, navigateToTutorialScreen } from "./navigation";

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
  const html2canvasRef = useRef(null);

  // Autoratul (inregistrarea) se face DOAR pe PC/web (clic pe elemente reale din DOM).
  const canAuthor = authoringEnabled && isAuthorRole && IS_WEB;

  // Captura ecranului (web) la momentul pasului. html2canvas cloneaza DOM-ul SINCRON
  // la apel, deci prinde starea de dinainte de click/navigare. Modulul e preincarcat
  // la startul inregistrarii ca sa putem clona sincron in handler-ul de click.
  const captureShotWeb = () => {
    const h2c = html2canvasRef.current;
    if (!IS_WEB || !h2c || typeof document === "undefined") return Promise.resolve(null);
    let p;
    try {
      p = h2c(document.body, {
        backgroundColor: "#0b0f17",
        scale: 0.4,
        logging: false,
        useCORS: true,
        ignoreElements: (el) => !!(el && el.closest && el.closest("[data-tutorial-ui]")),
      });
    } catch (e) {
      return Promise.resolve(null);
    }
    return p.then((canvas) => canvas.toDataURL("image/jpeg", 0.5)).catch(() => null);
  };

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
    // Preincarcam html2canvas ca sa putem captura sincron la fiecare click.
    if (IS_WEB && !html2canvasRef.current) {
      import("html2canvas")
        .then((m) => {
          html2canvasRef.current = m.default || m;
        })
        .catch(() => {});
    }
  }, []);

  const captureTarget = useCallback((id) => {
    const label = registry.current.get(id)?.label || id;
    setRecordSteps((prev) => [...prev, { targetId: id, label, instruction: "", screen: getCurrentTutorialScreen() }]);
  }, []);

  // Inregistreaza un pas dintr-un element DOM (web): orice buton/input/link/etc.
  const captureElement = useCallback((descriptor, localId) => {
    const label =
      (descriptor.componentStack && descriptor.componentStack[descriptor.componentStack.length - 1]) ||
      descriptor.text ||
      descriptor.tag ||
      "element";
    // Ancora preferata = testID (stabil, precis). Fallback pe selectorul CSS scurt.
    const selector = descriptor.testId
      ? `[data-testid="${descriptor.testId}"]`
      : descriptor.selector || null;
    setRecordSteps((prev) => [
      ...prev,
      {
        _localId: localId || null,
        selector,
        label: String(label).slice(0, 80),
        text: descriptor.text || "",
        instruction: "",
        screen: getCurrentTutorialScreen(),
        screenshot: null,
      },
    ]);
  }, []);

  // Ataseaza screenshot-ul (capturat asincron) pasului corect, dupa localId.
  const attachShot = useCallback((localId, screenshot) => {
    if (!localId || !screenshot) return;
    setRecordSteps((prev) => prev.map((s) => (s._localId === localId ? { ...s, screenshot } : s)));
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
    // "Doar la start": ducem userul pe ecranul unde incepe tutorialul.
    navigateToTutorialScreen(tutorial.steps[0]?.screen);
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
      const localId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      try {
        captureElement(describeElement(target), localId);
      } catch (err) {}
      // Capturam ecranul ACUM (clona e sincrona) = starea de dinainte de navigare.
      captureShotWeb().then((shot) => attachShot(localId, shot));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mode, captureElement, attachShot]);

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
