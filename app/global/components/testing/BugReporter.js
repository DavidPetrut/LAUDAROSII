import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  InteractionManager,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureScreen } from "react-native-view-shot";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useTesting } from "../../testing/TestingContext";
import { useAuth } from "../../context";
import { BUG_TYPES } from "../../testing/bugTaxonomy";
import { FEATURE_TYPES } from "../../testing/featureTaxonomy";
import { DESIGN_TYPES, UX_TYPES, ANIMATION_EXAMPLES } from "../../testing/uiuxTaxonomy";
import { showSuccess, showError } from "../../functions";
import { startWebInspect } from "./webInspector";
import { RatingReporter } from "./RatingReporter";

// Meniul butonului TEST: capabilitate -> intrare (label/icon/culoare/hint).
const CAP_MENU = {
  bug: { label: "Bug", icon: "bug", color: "#7c3aed", hint: "Ceva nu merge / arată prost" },
  uiux: { label: "UI / UX", icon: "color-wand", color: "#ec4899", hint: "Design sau experiență" },
  features: { label: "Feature", icon: "bulb", color: "#22c55e", hint: "O idee / îmbunătățire" },
  uiuxdev: { label: "UI/UX-dev", icon: "brush", color: "#0ea5e9", hint: "Design din Figma (dev)" },
  rating: { label: "Rating", icon: "star", color: "#f59e0b", hint: "Dă o notă" },
};
const CAP_ORDER = ["bug", "uiux", "features", "uiuxdev", "rating"];

// Culoare stridenta pentru marcarea elementului selectat (vizibil clar pe orice fundal)
const MARKER_COLOR = "#FF00E5";

// Pe web (PC) folosim inspectorul DOM real; pe nativ, punct pe screenshot.
const IS_WEB = Platform.OS === "web";

const PHASES = {
  IDLE: "idle",
  CONSENT: "consent",
  CHOOSE: "choose", // meniul cu capabilitatile alocate
  UIUX_CHOICE: "uiux_choice", // Design vs Experienta (UX)
  SCOPE: "scope", // (feature) element / tot ecranul / ecran nou
  DEV_SCOPE: "dev_scope", // (uiux-dev) element vs tot ecranul
  CAPTURING: "capturing",
  PICK: "pick", // nativ: alege punctul pe screenshot
  INSPECT: "inspect", // web: alege elementul real din DOM
  TYPE: "type",
  DETAILS: "details",
  UX_FORM: "ux_form", // formularul obligatoriu de experienta
  DEV_FORM: "dev_form", // formularul Figma (uiux-dev)
  SAVING: "saving",
};

const getTaxonomy = (kind) =>
  kind === "feature" ? FEATURE_TYPES : kind === "ui_design" ? DESIGN_TYPES : kind === "ux" ? UX_TYPES : BUG_TYPES;

export const BugReporter = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // Capabilitatile alocate userului (default doar "bug"). Ordonate pentru meniu.
  const caps = CAP_ORDER.filter((c) =>
    (Array.isArray(user?.testCaps) && user.testCaps.length ? user.testCaps : ["bug"]).includes(c)
  );
  const { enabled, consentGiven, giveConsent, resolveCurrentScreen, submit, startSignal } =
    useTesting();

  const [phase, setPhase] = useState(PHASES.IDLE);
  const [kind, setKind] = useState("bug"); // "bug" | "feature"
  const [source, setSource] = useState(IS_WEB ? "local" : "mobile");
  const [shotUri, setShotUri] = useState(null);
  const [marker, setMarker] = useState(null); // { x, y } in px pe imagine (nativ)
  const [imgLayout, setImgLayout] = useState({ width: 0, height: 0 });
  const [webElement, setWebElement] = useState(null); // descriptor DOM (web)
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  // UX
  const [whatTrying, setWhatTrying] = useState("");
  const [didFinish, setDidFinish] = useState(null); // true | false | null
  const [stress, setStress] = useState(0); // 1..5
  // UI/UX-dev (Figma)
  const [figmaLink, setFigmaLink] = useState("");
  const [figmaElement, setFigmaElement] = useState("");
  const [animation, setAnimation] = useState("");
  const [images, setImages] = useState([]);
  // Rating (controlat din meniu)
  const [ratingOpen, setRatingOpen] = useState(false);

  const inspectStopRef = useRef(null);
  const kindRef = useRef(kind);
  kindRef.current = kind;

  // Faza dupa selectarea elementului depinde de categorie.
  const afterPickPhase = () => (kindRef.current === "uiux_dev" ? PHASES.DEV_FORM : PHASES.TYPE);

  const stopInspect = useCallback(() => {
    if (inspectStopRef.current) {
      try {
        inspectStopRef.current();
      } catch (e) {}
      inspectStopRef.current = null;
    }
  }, []);

  const resetAll = useCallback(() => {
    stopInspect();
    setPhase(PHASES.IDLE);
    setKind("bug");
    setSource(IS_WEB ? "local" : "mobile");
    setShotUri(null);
    setMarker(null);
    setWebElement(null);
    setSelectedType(null);
    setSelectedCode(null);
    setProblem("");
    setSolution("");
    setWhatTrying("");
    setDidFinish(null);
    setStress(0);
    setFigmaLink("");
    setFigmaElement("");
    setAnimation("");
    setImages([]);
    setRatingOpen(false);
  }, [stopInspect]);

  // La demontare, opreste inspectorul DOM daca era pornit.
  useEffect(() => stopInspect, [stopInspect]);

  // ---- captura nativa (mobil) ----
  const doCapture = useCallback(() => {
    setPhase(PHASES.CAPTURING);
    // Asteptam un frame ca butonul flotant sa dispara din captura
    InteractionManager.runAfterInteractions(() => {
      setTimeout(async () => {
        try {
          const uri = await captureScreen({
            format: "jpg",
            quality: 0.5,
            result: "data-uri",
          });
          setShotUri(uri);
          setMarker(null);
          setPhase(PHASES.PICK);
        } catch (e) {
          showError("Nu am putut face captura ecranului. Încearcă din nou.");
          resetAll();
        }
      }, 60);
    });
  }, [resetAll]);

  // ---- inspectie web (PC): alege elementul real din DOM ----
  const doInspect = useCallback(() => {
    setPhase(PHASES.INSPECT);
    // Lasam modalul precedent sa se inchida inainte sa citim DOM-ul de sub cursor.
    setTimeout(() => {
      stopInspect();
      inspectStopRef.current = startWebInspect(
        (_el, descriptor) => {
          inspectStopRef.current = null;
          setWebElement(descriptor);
          setPhase(afterPickPhase());
        },
        () => {
          inspectStopRef.current = null;
          resetAll();
        }
      );
    }, 80);
  }, [resetAll, stopInspect]);

  // Porneste selectia de element (web = inspect DOM, nativ = captura + punct).
  const beginPick = useCallback(() => {
    if (IS_WEB) {
      setSource("local");
      doInspect();
    } else {
      setSource("mobile");
      doCapture();
    }
  }, [doInspect, doCapture]);

  // Alegerea BUG / FEATURE (primul ecran, nimic altceva).
  const chooseKind = useCallback(
    (k) => {
      setKind(k);
      setSelectedType(null);
      setSelectedCode(null);
      if (k === "feature") {
        // Un feature poate viza un element anume SAU tot ecranul.
        setPhase(PHASES.SCOPE);
      } else {
        beginPick();
      }
    },
    [beginPick]
  );

  // (feature) alege domeniul: element anume vs tot ecranul
  const chooseScopeWhole = useCallback(() => {
    setSource(IS_WEB ? "local" : "mobile");
    setWebElement(null);
    setMarker(null);
    setShotUri(null);
    setPhase(PHASES.TYPE);
  }, []);

  // Feature: un ecran nou care ar trebui sa porneasca de aici.
  const chooseScopeNew = useCallback(() => {
    setSource(IS_WEB ? "local" : "mobile");
    setWebElement(null);
    setMarker(null);
    setShotUri(null);
    setSelectedType("FUNCTIE_NOUA");
    setSelectedCode("ECRAN_NOU");
    setPhase(PHASES.DETAILS);
  }, []);

  // Din meniul TEST: rutam pe capabilitatea aleasa.
  const chooseCap = useCallback(
    (cap) => {
      setSelectedType(null);
      setSelectedCode(null);
      if (cap === "rating") {
        setPhase(PHASES.IDLE);
        setRatingOpen(true);
      } else if (cap === "bug") {
        setKind("bug");
        beginPick();
      } else if (cap === "features") {
        setKind("feature");
        setPhase(PHASES.SCOPE);
      } else if (cap === "uiux") {
        setPhase(PHASES.UIUX_CHOICE);
      } else if (cap === "uiuxdev") {
        setKind("uiux_dev");
        setPhase(PHASES.DEV_SCOPE);
      }
    },
    [beginPick]
  );

  // UI/UX: Design (vizual) sau Experienta (UX).
  const chooseUiux = useCallback(
    (sub) => {
      setSelectedType(null);
      setSelectedCode(null);
      if (sub === "design") {
        setKind("ui_design");
        beginPick();
      } else {
        setKind("ux");
        setPhase(PHASES.SCOPE);
      }
    },
    [beginPick]
  );

  // UI/UX-dev: element anume vs tot ecranul -> formularul Figma.
  const chooseDevScope = useCallback(
    (whole) => {
      if (whole) {
        setSource(IS_WEB ? "local" : "mobile");
        setWebElement(null);
        setMarker(null);
        setShotUri(null);
        setFigmaElement("");
        setPhase(PHASES.DEV_FORM);
      } else {
        beginPick();
      }
    },
    [beginPick]
  );

  // Alege poze din galerie (Figma), le redimensioneaza si le tine ca data-URI.
  const pickImages = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.7,
      });
      if (res.canceled) return;
      const out = [];
      for (const a of (res.assets || []).slice(0, 6)) {
        try {
          const m = await ImageManipulator.manipulateAsync(
            a.uri,
            [{ resize: { width: 1000 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (m.base64) out.push(`data:image/jpeg;base64,${m.base64}`);
        } catch (e) {}
      }
      setImages((prev) => [...prev, ...out].slice(0, 6));
    } catch (e) {
      showError("Nu am putut alege pozele.");
    }
  }, []);

  const onFabPress = useCallback(() => {
    if (consentGiven) setPhase(PHASES.CHOOSE);
    else setPhase(PHASES.CONSENT);
  }, [consentGiven]);

  const onConsentAccept = useCallback(async () => {
    await giveConsent();
    setPhase(PHASES.CHOOSE);
  }, [giveConsent]);

  // Pornire raportare declansata din alt loc (ex: buton din interiorul unui popup).
  const onFabPressRef = useRef(onFabPress);
  onFabPressRef.current = onFabPress;
  useEffect(() => {
    if (startSignal > 0) onFabPressRef.current();
  }, [startSignal]);

  const onPickTap = useCallback((e) => {
    const { locationX, locationY } = e.nativeEvent;
    setMarker({ x: locationX, y: locationY });
  }, []);

  const confirmMarker = useCallback(() => setPhase(afterPickPhase()), []);

  const onSelectType = useCallback((typeKey) => {
    setSelectedType(typeKey);
    setSelectedCode(null);
    setPhase(kindRef.current === "ux" ? PHASES.UX_FORM : PHASES.DETAILS);
  }, []);

  // Elementul nativ (punct pe screenshot).
  const buildNativeElement = useCallback(() => {
    if (!marker) return null;
    const w = imgLayout.width || 1;
    const h = imgLayout.height || 1;
    return {
      tap: { x: Math.round(marker.x), y: Math.round(marker.y) },
      rel: { x: +(marker.x / w).toFixed(4), y: +(marker.y / h).toFixed(4) },
      view: { width: Math.round(w), height: Math.round(h) },
      // Pe nativ nu exista HTML/DOM; ancora elementului este pozitia pe screenshot
      // coroborata cu fisierul ecranului (vezi folder/file din payload).
      kind: "native-point",
    };
  }, [marker, imgLayout]);

  const onSave = useCallback(async () => {
    if (!selectedType) return;
    setPhase(PHASES.SAVING);
    try {
      await submit({
        kind,
        source,
        element: source === "local" ? webElement : buildNativeElement(),
        bugType: selectedType,
        bugCode: selectedCode,
        problem,
        solution,
        screenshot: source === "local" ? null : shotUri,
      });
      showSuccess(
        kind === "feature" ? "Mulțumim pentru idee! 💡" : "Mulțumim! Feedback-ul a fost trimis. 🙏"
      );
      resetAll();
    } catch (e) {
      showError(e?.message || "Nu am putut trimite feedback-ul.");
      setPhase(PHASES.DETAILS);
    }
  }, [
    kind,
    source,
    webElement,
    selectedType,
    selectedCode,
    problem,
    solution,
    shotUri,
    submit,
    buildNativeElement,
    resetAll,
  ]);

  // UX: formular obligatoriu (ce incerca / a reusit / descriere / stres).
  const uxValid = whatTrying.trim() && didFinish !== null && problem.trim() && stress >= 1;
  const onSaveUX = useCallback(async () => {
    if (!uxValid) return;
    setPhase(PHASES.SAVING);
    try {
      await submit({
        kind: "ux",
        source,
        element: source === "local" ? webElement : buildNativeElement(),
        bugType: selectedType,
        whatTrying: whatTrying.trim(),
        didFinish,
        problem: problem.trim(),
        solution: solution.trim(),
        stress,
        screenshot: source === "local" ? null : shotUri,
      });
      showSuccess("Mulțumim pentru feedback! 🙏");
      resetAll();
    } catch (e) {
      showError(e?.message || "Nu am putut trimite.");
      setPhase(PHASES.UX_FORM);
    }
  }, [uxValid, source, webElement, selectedType, whatTrying, didFinish, problem, solution, stress, shotUri, submit, buildNativeElement, resetAll]);

  // UI/UX-dev: formular Figma (link obligatoriu + poze).
  const onSaveDev = useCallback(async () => {
    if (!figmaLink.trim()) return;
    setPhase(PHASES.SAVING);
    try {
      await submit({
        kind: "uiux_dev",
        source,
        element: source === "local" ? webElement : buildNativeElement(),
        bugType: "UIUX_DEV",
        figmaLink: figmaLink.trim(),
        figmaElement: figmaElement.trim(),
        animation: animation.trim(),
        problem: problem.trim(),
        images,
        screenshot: source === "local" ? null : shotUri,
      });
      showSuccess("Mulțumim! Design-ul a fost trimis. 🎨");
      resetAll();
    } catch (e) {
      showError(e?.message || "Nu am putut trimite.");
      setPhase(PHASES.DEV_FORM);
    }
  }, [figmaLink, figmaElement, animation, problem, images, source, webElement, shotUri, submit, buildNativeElement, resetAll]);

  if (!enabled) return null;
  // Fara nicio capabilitate vizibila -> nu afisam nimic.
  if (caps.length === 0) return null;

  const isFeature = kind === "feature";
  const screenInfo = resolveCurrentScreen();
  const activeType = getTaxonomy(kind).find((t) => t.key === selectedType);
  const KIND_ACCENT = { bug: "#7c3aed", feature: "#22c55e", ui_design: "#ec4899", ux: "#f59e0b", uiux_dev: "#0ea5e9" };
  const accent = KIND_ACCENT[kind] || "#7c3aed";

  return (
    <>
      {/* ---- BUTON FLOTANT (stanga jos, deasupra footer-ului) ---- */}
      {phase === PHASES.IDLE && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 92, left: 16 }]}
          onPress={onFabPress}
          activeOpacity={0.85}
          accessibilityLabel="Raportează un bug sau propune un feature"
          accessibilityRole="button"
        >
          <Ionicons name="flask" size={22} color="#fff" />
          <Text style={styles.fabText}>TEST</Text>
        </TouchableOpacity>
      )}

      {/* ---- RATING (deschis din meniu) ---- */}
      <RatingReporter controlled open={ratingOpen} onClose={() => setRatingOpen(false)} />

      {/* ---- CONSIMTAMANT ---- */}
      <Modal visible={phase === PHASES.CONSENT} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <View style={styles.card}>
            <Ionicons name="shield-checkmark-outline" size={40} color="#22c55e" style={{ alignSelf: "center" }} />
            <Text style={styles.cardTitle}>Mod testare</Text>
            <Text style={styles.cardBody}>
              Când raportezi ceva, aplicația salvează <Text style={styles.bold}>elementul ales</Text> și
              detalii tehnice (versiune, model telefon). Pe telefon se face și o{" "}
              <Text style={styles.bold}>captură a ecranului</Text> curent. NU se salvează parole,
              token-uri sau date de conectare.
              {"\n\n"}Captura poate conține text de pe ecran — nu raporta pe ecrane
              cu date pe care nu vrei să le trimiți.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onConsentAccept}>
              <Text style={styles.primaryBtnText}>Am înțeles, continuă</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={resetAll}>
              <Text style={styles.ghostBtnText}>Anulează</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- CHOOSE: meniul cu capabilitatile alocate ---- */}
      <Modal visible={phase === PHASES.CHOOSE} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ce vrei să ne spui?</Text>
            <Text style={[styles.cardBody, { textAlign: "center", marginBottom: 16 }]}>
              {screenInfo.tab} · {screenInfo.screen}
            </Text>
            {caps.map((cap) => {
              const m = CAP_MENU[cap];
              return (
                <TouchableOpacity key={cap} style={[styles.capRow, { borderColor: m.color }]} onPress={() => chooseCap(cap)} activeOpacity={0.85}>
                  <View style={[styles.capIcon, { backgroundColor: m.color + "22" }]}>
                    <Ionicons name={m.icon} size={22} color={m.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.capLabel}>{m.label}</Text>
                    <Text style={styles.capHint}>{m.hint}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#64748b" />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.ghostBtn, { marginTop: 14 }]} onPress={resetAll}>
              <Text style={styles.ghostBtnText}>Închide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- UIUX_CHOICE: Design vs Experienta ---- */}
      <Modal visible={phase === PHASES.UIUX_CHOICE} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Despre ce e vorba?</Text>
            <View style={styles.kindRow}>
              <TouchableOpacity style={[styles.kindCard, { borderColor: "#ec4899" }]} onPress={() => chooseUiux("design")} activeOpacity={0.85}>
                <View style={[styles.kindIcon, { backgroundColor: "#ec489922" }]}>
                  <Ionicons name="color-palette" size={28} color="#ec4899" />
                </View>
                <Text style={styles.kindLabel}>DESIGN</Text>
                <Text style={styles.kindHint}>Cum arată (vizual)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.kindCard, { borderColor: "#f59e0b" }]} onPress={() => chooseUiux("ux")} activeOpacity={0.85}>
                <View style={[styles.kindIcon, { backgroundColor: "#f59e0b22" }]}>
                  <Ionicons name="walk" size={28} color="#f59e0b" />
                </View>
                <Text style={styles.kindLabel}>EXPERIENȚĂ</Text>
                <Text style={styles.kindHint}>Cum te simți folosind</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.ghostBtn, { marginTop: 16 }]} onPress={() => setPhase(PHASES.CHOOSE)}>
              <Text style={styles.ghostBtnText}>Înapoi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- DEV_SCOPE (uiux-dev): element vs tot ecranul ---- */}
      <Modal visible={phase === PHASES.DEV_SCOPE} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <View style={styles.card}>
            <Ionicons name="brush-outline" size={38} color="#0ea5e9" style={{ alignSelf: "center" }} />
            <Text style={styles.cardTitle}>Design din Figma pentru…</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#0ea5e9" }]} onPress={() => chooseDevScope(false)}>
              <Ionicons name="locate-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{IS_WEB ? "  Un element anume (îl aleg)" : "  Un element anume (îl arăt)"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ghostBtn, { marginTop: 10 }]} onPress={() => chooseDevScope(true)}>
              <Text style={styles.ghostBtnText}>Tot ecranul</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ghostBtn, { marginTop: 8 }]} onPress={() => setPhase(PHASES.CHOOSE)}>
              <Text style={styles.ghostBtnText}>Înapoi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- SCOPE (feature / ux): element / tot ecranul / ecran nou ---- */}
      <Modal visible={phase === PHASES.SCOPE} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <View style={styles.card}>
            <Ionicons name={kind === "ux" ? "walk-outline" : "bulb-outline"} size={38} color={accent} style={{ alignSelf: "center" }} />
            <Text style={styles.cardTitle}>{kind === "ux" ? "La ce se referă experiența?" : "La ce se referă ideea?"}</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accent }]} onPress={beginPick}>
              <Ionicons name="locate-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {IS_WEB ? "  Un element anume (îl aleg)" : "  Un element anume (îl arăt)"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ghostBtn, { marginTop: 10 }]} onPress={chooseScopeWhole}>
              <Text style={styles.ghostBtnText}>E despre tot ecranul</Text>
            </TouchableOpacity>
            {isFeature && (
              <TouchableOpacity style={[styles.ghostBtn, { marginTop: 8 }]} onPress={chooseScopeNew}>
                <Text style={styles.ghostBtnText}>Un ecran nou care ar trebui să pornească de aici</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.ghostBtn, { marginTop: 8 }]} onPress={() => setPhase(kind === "ux" ? PHASES.UIUX_CHOICE : PHASES.CHOOSE)}>
              <Text style={styles.ghostBtnText}>Înapoi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- CAPTURING: nu afisam NIMIC (niciun overlay), ca sa nu apara in captura.
           Butonul flotant se ascunde oricum pentru ca phase != IDLE. ---- */}

      {/* ---- INSPECT (web): banda-hint neblocanta; overlay-ul real e din DOM ---- */}
      {phase === PHASES.INSPECT && (
        <View style={[styles.inspectHint, { top: insets.top + 10 }]} pointerEvents="none">
          <Ionicons name="scan-outline" size={16} color="#fff" />
          <Text style={styles.inspectHintText}>
            {isFeature ? "Alege elementul pentru idee" : "Alege elementul cu probleme"} · Esc anulează
          </Text>
        </View>
      )}

      {/* ---- PICK (nativ): alege elementul pe screenshot-ul inghetat ---- */}
      <Modal visible={phase === PHASES.PICK} transparent animationType="fade">
        <View style={styles.pickRoot}>
          {shotUri && (
            <Pressable
              style={styles.pickImageWrap}
              onPress={onPickTap}
              onLayout={(e) =>
                setImgLayout({
                  width: e.nativeEvent.layout.width,
                  height: e.nativeEvent.layout.height,
                })
              }
            >
              <Image source={{ uri: shotUri }} style={styles.pickImage} resizeMode="stretch" />
              {marker && (
                <>
                  {/* linii crosshair + cerc strident */}
                  <View pointerEvents="none" style={[styles.crosshairH, { top: marker.y }]} />
                  <View pointerEvents="none" style={[styles.crosshairV, { left: marker.x }]} />
                  <View
                    pointerEvents="none"
                    style={[styles.markerDot, { left: marker.x - 26, top: marker.y - 26 }]}
                  />
                </>
              )}
            </Pressable>
          )}

          {/* bara sus */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <Text style={styles.topBarText}>
              {marker
                ? "Ai selectat acest loc?"
                : isFeature
                ? "Apasă pe elementul pentru idee"
                : "Apasă pe elementul cu probleme"}
            </Text>
            <TouchableOpacity onPress={resetAll} style={styles.closeX}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* bara jos DA / ALTUL */}
          {marker && (
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceAlt]} onPress={() => setMarker(null)}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.choiceText}>Altul</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.choiceBtn, styles.choiceYes]} onPress={confirmMarker}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.choiceText}>Da, ăsta e</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* ---- TYPE: alege categoria (bug sau feature, dupa kind) ---- */}
      <Modal visible={phase === PHASES.TYPE} transparent animationType="slide">
        <View style={styles.sheetRoot}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {isFeature ? "Ce fel de idee ai?" : "Ce fel de problemă e?"}
              </Text>
              <TouchableOpacity onPress={resetAll}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              {screenInfo.tab} · {screenInfo.screen}
            </Text>
            <View style={styles.typeGrid}>
              {getTaxonomy(kind).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeCard, { borderColor: t.color }]}
                  onPress={() => onSelectType(t.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.typeIcon, { backgroundColor: t.color + "22" }]}>
                    <Ionicons name={t.icon} size={24} color={t.color} />
                  </View>
                  <Text style={styles.typeLabel}>{t.label}</Text>
                  <Text style={styles.typeHint}>{t.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ---- DETAILS: sub-categorie + descriere + solutie ---- */}
      <Modal visible={phase === PHASES.DETAILS} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.sheetRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.sheet, { maxHeight: "92%" }]}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setPhase(PHASES.TYPE)} style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="chevron-back" size={22} color="#94a3b8" />
                <Text style={[styles.sheetTitle, activeType && { color: activeType.color }]}>
                  {activeType?.label}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetAll}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {activeType?.problems?.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>{isFeature ? "Alege tipul ideii" : "Alege problema"}</Text>
                  <View style={styles.problemsWrap}>
                    {activeType.problems.map((p) => {
                      const active = selectedCode === p.code;
                      return (
                        <TouchableOpacity
                          key={p.code}
                          style={[
                            styles.problemBtn,
                            active && { backgroundColor: activeType.color, borderColor: activeType.color },
                          ]}
                          onPress={() => setSelectedCode(active ? null : p.code)}
                        >
                          <Text style={[styles.problemText, active && { color: "#fff" }]}>{p.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>{isFeature ? "Ce ți-ai dori" : "Descrie problema"}</Text>
              <TextInput
                style={styles.textArea}
                placeholder={
                  isFeature
                    ? "Ce funcționalitate/îmbunătățire vrei aici…"
                    : "Ce nu e în regulă, în cuvintele tale…"
                }
                placeholderTextColor="#64748b"
                value={problem}
                onChangeText={setProblem}
                multiline
                maxLength={isFeature ? 8000 : 1000}
              />

              <Text style={styles.fieldLabel}>
                {isFeature ? "Cum ai vrea să funcționeze (opțional)" : "Soluție / părere (opțional)"}
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder={isFeature ? "Descrie pe scurt cum ar merge ideal…" : "Cum crezi că ar fi mai bine?"}
                placeholderTextColor="#64748b"
                value={solution}
                onChangeText={setSolution}
                multiline
                maxLength={isFeature ? 8000 : 1000}
              />

              <View style={styles.saveRow}>
                <TouchableOpacity style={styles.ghostBtn} onPress={resetAll}>
                  <Text style={styles.ghostBtnText}>Închide</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { flex: 1, marginLeft: 12, backgroundColor: accent, opacity: problem.trim() || selectedCode ? 1 : 0.5 },
                  ]}
                  onPress={onSave}
                  disabled={!(problem.trim() || selectedCode)}
                >
                  <Text style={styles.primaryBtnText}>Trimite</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---- UX_FORM: experienta (obligatoriu + stres) ---- */}
      <Modal visible={phase === PHASES.UX_FORM} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.sheetRoot} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.sheet, { maxHeight: "92%" }]}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setPhase(PHASES.TYPE)} style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="chevron-back" size={22} color="#94a3b8" />
                <Text style={[styles.sheetTitle, { color: "#f59e0b" }]}>{activeType?.label || "Experiență"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetAll}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.fieldLabel}>Ce încercai să faci? *</Text>
              <TextInput style={styles.textArea} placeholder="Ex: voiam să adaug un motiv de rugăciune…" placeholderTextColor="#64748b" value={whatTrying} onChangeText={setWhatTrying} multiline maxLength={1000} />

              <Text style={styles.fieldLabel}>Ai reușit să finalizezi? *</Text>
              <View style={styles.yesNoRow}>
                <TouchableOpacity style={[styles.yesNoBtn, didFinish === true && styles.yesOn]} onPress={() => setDidFinish(true)}>
                  <Ionicons name="checkmark" size={18} color={didFinish === true ? "#fff" : "#22c55e"} />
                  <Text style={[styles.yesNoText, didFinish === true && { color: "#fff" }]}>Da</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.yesNoBtn, didFinish === false && styles.noOn]} onPress={() => setDidFinish(false)}>
                  <Ionicons name="close" size={18} color={didFinish === false ? "#fff" : "#ef4444"} />
                  <Text style={[styles.yesNoText, didFinish === false && { color: "#fff" }]}>Nu</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Descrie experiența *</Text>
              <TextInput style={styles.textArea} placeholder="Cum a fost, ce te-a încurcat / ajutat…" placeholderTextColor="#64748b" value={problem} onChangeText={setProblem} multiline maxLength={2000} />

              <Text style={styles.fieldLabel}>Soluția la care te-ai gândit (opțional)</Text>
              <TextInput style={styles.textArea} placeholder="Cum ar fi fost mai bine?" placeholderTextColor="#64748b" value={solution} onChangeText={setSolution} multiline maxLength={2000} />

              <Text style={styles.fieldLabel}>Nivel de stres (1 = deloc, 5 = foarte stresant) *</Text>
              <View style={styles.stressRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} style={[styles.stressBtn, stress === n && styles.stressOn]} onPress={() => setStress(n)}>
                    <Text style={[styles.stressText, stress === n && { color: "#fff" }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.saveRow}>
                <TouchableOpacity style={styles.ghostBtn} onPress={resetAll}><Text style={styles.ghostBtnText}>Închide</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 12, backgroundColor: "#f59e0b", opacity: uxValid ? 1 : 0.5 }]} onPress={onSaveUX} disabled={!uxValid}>
                  <Text style={styles.primaryBtnText}>Trimite</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---- DEV_FORM: design Figma (uiux-dev) ---- */}
      <Modal visible={phase === PHASES.DEV_FORM} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.sheetRoot} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.sheet, { maxHeight: "92%" }]}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setPhase(PHASES.DEV_SCOPE)} style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="chevron-back" size={22} color="#94a3b8" />
                <Text style={[styles.sheetTitle, { color: "#0ea5e9" }]}>Design Figma</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetAll}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.fieldLabel}>Link Figma *</Text>
              <TextInput style={styles.inputLine} placeholder="https://figma.com/…" placeholderTextColor="#64748b" value={figmaLink} onChangeText={setFigmaLink} autoCapitalize="none" autoCorrect={false} />

              {webElement || marker ? (
                <>
                  <Text style={styles.fieldLabel}>Denumire element (ex: buton-active, notification-success)</Text>
                  <TextInput style={styles.inputLine} placeholder="nume element Figma" placeholderTextColor="#64748b" value={figmaElement} onChangeText={setFigmaElement} />
                  <Text style={styles.fieldLabel}>Animație (opțional)</Text>
                  <TextInput style={styles.inputLine} placeholder={"ex: " + ANIMATION_EXAMPLES.slice(0, 3).join(", ")} placeholderTextColor="#64748b" value={animation} onChangeText={setAnimation} />
                  <Text style={styles.hintSmall}>Exemple: {ANIMATION_EXAMPLES.join(" · ")}</Text>
                </>
              ) : (
                <Text style={styles.hintSmall}>Tot ecranul — descrie mai jos elementele.</Text>
              )}

              <Text style={styles.fieldLabel}>{webElement || marker ? "Alte mențiuni / descriere" : "Descrie elementele"}</Text>
              <TextInput style={styles.textArea} placeholder="Detalii utile pentru construcție…" placeholderTextColor="#64748b" value={problem} onChangeText={setProblem} multiline maxLength={4000} />

              <Text style={styles.fieldLabel}>Poze din Figma ({images.length}/6)</Text>
              <View style={styles.imgRow}>
                {images.map((uri, i) => (
                  <View key={i} style={styles.imgThumbWrap}>
                    <Image source={{ uri }} style={styles.imgThumb} />
                    <TouchableOpacity style={styles.imgRemove} onPress={() => setImages((p) => p.filter((_, idx) => idx !== i))}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 6 && (
                  <TouchableOpacity style={styles.imgAdd} onPress={pickImages}>
                    <Ionicons name="add" size={26} color="#0ea5e9" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.saveRow}>
                <TouchableOpacity style={styles.ghostBtn} onPress={resetAll}><Text style={styles.ghostBtnText}>Închide</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 12, backgroundColor: "#0ea5e9", opacity: figmaLink.trim() ? 1 : 0.5 }]} onPress={onSaveDev} disabled={!figmaLink.trim()}>
                  <Text style={styles.primaryBtnText}>Trimite</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ---- SAVING ---- */}
      <Modal visible={phase === PHASES.SAVING} transparent animationType="fade">
        <View style={styles.captureOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 12 }}>Se trimite…</Text>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    zIndex: 99999999,
    elevation: 99,
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  fabText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginTop: 1 },

  centerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1f2430",
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 420,
  },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center", marginTop: 8, marginBottom: 10 },
  cardBody: { color: "#cbd5e1", fontSize: 14, lineHeight: 21, marginBottom: 18 },
  bold: { fontWeight: "800", color: "#fff" },

  // ---- CHOOSE bug/feature ----
  kindRow: { flexDirection: "row", gap: 12 },
  kindCard: {
    flex: 1,
    backgroundColor: "#161a22",
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  kindIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  kindLabel: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  kindHint: { color: "#94a3b8", fontSize: 11, textAlign: "center", marginTop: 4 },

  // ---- meniul de capabilitati (TEST) ----
  capRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#161a22", borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  capIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  capLabel: { color: "#fff", fontSize: 15, fontWeight: "800" },
  capHint: { color: "#94a3b8", fontSize: 12, marginTop: 2 },

  // ---- da/nu (UX) ----
  yesNoRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  yesNoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "#334155", borderRadius: 12, paddingVertical: 12, backgroundColor: "#161a22" },
  yesOn: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  noOn: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  yesNoText: { color: "#cbd5e1", fontWeight: "800", fontSize: 15 },

  // ---- scala de stres (UX) ----
  stressRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  stressBtn: { flex: 1, borderWidth: 1.5, borderColor: "#334155", borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "#161a22" },
  stressOn: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  stressText: { color: "#cbd5e1", fontWeight: "800", fontSize: 16 },

  // ---- input pe o linie (dev) ----
  inputLine: { backgroundColor: "#161a22", borderWidth: 1, borderColor: "#334155", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: "#fff", fontSize: 14 },
  hintSmall: { color: "#64748b", fontSize: 12, marginTop: 6, lineHeight: 17 },

  // ---- poze atasate (dev) ----
  imgRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  imgThumbWrap: { position: "relative" },
  imgThumb: { width: 70, height: 100, borderRadius: 10, backgroundColor: "#161a22" },
  imgRemove: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  imgAdd: { width: 70, height: 100, borderRadius: 10, borderWidth: 1.5, borderColor: "#0ea5e9", borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "#0ea5e911" },

  // ---- INSPECT hint (web) ----
  inspectHint: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(17,24,39,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 99999999,
    left: 0,
    right: 0,
    marginHorizontal: "auto",
    maxWidth: 340,
    justifyContent: "center",
  },
  inspectHintText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  captureOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },

  pickRoot: { flex: 1, backgroundColor: "#000" },
  pickImageWrap: { ...StyleSheet.absoluteFillObject },
  pickImage: { width: "100%", height: "100%" },
  crosshairH: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: MARKER_COLOR, opacity: 0.9 },
  crosshairV: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: MARKER_COLOR, opacity: 0.9 },
  markerDot: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: MARKER_COLOR,
    backgroundColor: "rgba(255,0,229,0.18)",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  topBarText: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 },
  closeX: { padding: 4 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  choiceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  choiceAlt: { backgroundColor: "#475569" },
  choiceYes: { backgroundColor: "#22c55e" },
  choiceText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  sheetRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1f2430",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  sheetSub: { color: "#94a3b8", fontSize: 12, marginTop: 2, marginBottom: 14 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: {
    width: "31%",
    backgroundColor: "#161a22",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  typeLabel: { color: "#fff", fontSize: 13, fontWeight: "700", textAlign: "center" },
  typeHint: { color: "#94a3b8", fontSize: 10, textAlign: "center", marginTop: 2 },

  fieldLabel: { color: "#e2e8f0", fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  problemsWrap: { gap: 8 },
  problemBtn: {
    borderWidth: 1.5,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#161a22",
  },
  problemText: { color: "#cbd5e1", fontSize: 14, fontWeight: "500" },
  textArea: {
    backgroundColor: "#161a22",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    color: "#fff",
    fontSize: 14,
    textAlignVertical: "top",
  },
  saveRow: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  primaryBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  ghostBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#334155", alignItems: "center", marginTop: 6 },
  ghostBtnText: { color: "#e2e8f0", fontWeight: "700", fontSize: 14 },
});

export default BugReporter;
