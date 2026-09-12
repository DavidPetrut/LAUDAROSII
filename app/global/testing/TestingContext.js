import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { storage } from "../utils/storage";
import { resolveScreen } from "./screenRegistry";
import { collectContext } from "./collectContext";
import { fetchTestingConfig, submitBugReport } from "./testingApi";

const TestingContext = createContext(null);

// Fallback local daca serverul nu raspunde inca la flag. In perioada de testare
// il tinem pe true; dupa testare, flag-ul de pe server (instant) il poate opri.
const DEFAULT_ENABLED = true;

// Cheie pentru a retine consimtamantul (o singura data per dispozitiv).
const CONSENT_KEY = "testing_consent_v1";

export const TestingProvider = ({ children }) => {
  const [enabled, setEnabled] = useState(DEFAULT_ENABLED);
  const [consentGiven, setConsentGiven] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  // Semnal global pentru a porni raportarea din ORICE loc (inclusiv din popup-uri
  // unde butonul flotant de la root e acoperit de fereastra Modal).
  const [startSignal, setStartSignal] = useState(0);

  // Ruta activa (setata din NavigationContainer.onStateChange)
  const routeNameRef = useRef(null);
  const [routeName, setRouteNameState] = useState(null);

  // Layer intern (setat de ecranele cu sub-nivele: ex. tab-urile din Pray)
  const [layer, setLayerState] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      // consimtamant
      try {
        const c = await storage.getItem(CONSENT_KEY);
        if (active && c === "yes") setConsentGiven(true);
      } catch (e) {}
      // flag de pe server (are prioritate daca raspunde)
      const cfg = await fetchTestingConfig();
      if (active && cfg.remote && typeof cfg.enabled === "boolean") {
        setEnabled(cfg.enabled);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setCurrentRouteName = useCallback((name) => {
    routeNameRef.current = name;
    setRouteNameState(name);
    // cand se schimba ruta, layer-ul vechi nu mai e valabil
    setLayerState(null);
  }, []);

  const setLayer = useCallback((info) => setLayerState(info || null), []);
  const clearLayer = useCallback(() => setLayerState(null), []);

  const giveConsent = useCallback(async () => {
    setConsentGiven(true);
    try {
      await storage.setItem(CONSENT_KEY, "yes");
    } catch (e) {}
  }, []);

  // Ecranul curent = ruta din registru, suprascris de layer (daca exista).
  const resolveCurrentScreen = useCallback(() => {
    const base = resolveScreen(routeNameRef.current || routeName);
    if (layer) {
      return {
        ...base,
        screen: layer.screen || base.screen,
        folder: layer.folder || base.folder,
        file: layer.file || base.file,
        layer: layer.screen || null,
      };
    }
    return { ...base, layer: null };
  }, [routeName, layer]);

  const openFlow = useCallback(() => setFlowOpen(true), []);
  const closeFlow = useCallback(() => setFlowOpen(false), []);

  // Porneste raportarea de oriunde (ex: dintr-un popup). BugReporter asculta acest semnal.
  const startReport = useCallback(() => setStartSignal((s) => s + 1), []);

  /**
   * Construieste payload-ul final si il trimite la server.
   * @param {object} report - { element, bugType, bugCode, problem, solution, screenshot }
   */
  const submit = useCallback(
    async (report) => {
      const screenInfo = resolveCurrentScreen();
      const payload = {
        // ierarhie (nivel 1 tab, nivel 2 ecran)
        tab: screenInfo.tab,
        screen: screenInfo.screen,
        route: screenInfo.route || null,
        layer: screenInfo.layer || null,
        folder: screenInfo.folder,
        file: screenInfo.file,
        // element selectat
        element: report.element || null,
        // clasificare
        bugType: report.bugType,
        bugCode: report.bugCode || null,
        problem: (report.problem || "").trim(),
        solution: (report.solution || "").trim(),
        // media
        screenshot: report.screenshot || null,
        // context tehnic sigur
        context: collectContext(),
      };
      return submitBugReport(payload);
    },
    [resolveCurrentScreen]
  );

  return (
    <TestingContext.Provider
      value={{
        enabled,
        consentGiven,
        giveConsent,
        flowOpen,
        openFlow,
        closeFlow,
        startSignal,
        startReport,
        setCurrentRouteName,
        routeName,
        layer,
        setLayer,
        clearLayer,
        resolveCurrentScreen,
        submit,
      }}
    >
      {children}
    </TestingContext.Provider>
  );
};

export const useTesting = () => {
  const ctx = useContext(TestingContext);
  if (!ctx) {
    // Nu aruncam eroare - ecranele care apeleaza setLayer trebuie sa fie sigure
    // chiar daca provider-ul nu e montat (ex. in teste izolate).
    return {
      enabled: false,
      consentGiven: false,
      giveConsent: () => {},
      flowOpen: false,
      openFlow: () => {},
      closeFlow: () => {},
      startSignal: 0,
      startReport: () => {},
      setCurrentRouteName: () => {},
      routeName: null,
      layer: null,
      setLayer: () => {},
      clearLayer: () => {},
      resolveCurrentScreen: () => ({}),
      submit: async () => {},
    };
  }
  return ctx;
};
