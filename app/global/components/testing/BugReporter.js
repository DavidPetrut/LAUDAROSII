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
import { useTesting } from "../../testing/TestingContext";
import { BUG_TYPES } from "../../testing/bugTaxonomy";
import { showSuccess, showError } from "../../functions";

// Culoare stridenta pentru marcarea elementului selectat (vizibil clar pe orice fundal)
const MARKER_COLOR = "#FF00E5";

const PHASES = {
  IDLE: "idle",
  CONSENT: "consent",
  CAPTURING: "capturing",
  PICK: "pick",
  TYPE: "type",
  DETAILS: "details",
  SAVING: "saving",
};

export const BugReporter = () => {
  const insets = useSafeAreaInsets();
  const { enabled, consentGiven, giveConsent, resolveCurrentScreen, submit, startSignal } =
    useTesting();

  const [phase, setPhase] = useState(PHASES.IDLE);
  const [shotUri, setShotUri] = useState(null);
  const [marker, setMarker] = useState(null); // { x, y } in px pe imagine
  const [imgLayout, setImgLayout] = useState({ width: 0, height: 0 });
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");

  const resetAll = useCallback(() => {
    setPhase(PHASES.IDLE);
    setShotUri(null);
    setMarker(null);
    setSelectedType(null);
    setSelectedCode(null);
    setProblem("");
    setSolution("");
  }, []);

  const doCapture = useCallback(async () => {
    setPhase(PHASES.CAPTURING);
    // Asteptam un frame ca butonul flotant sa dispara din captura
    InteractionManager.runAfterInteractions(async () => {
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

  const onFabPress = useCallback(() => {
    if (consentGiven) doCapture();
    else setPhase(PHASES.CONSENT);
  }, [consentGiven, doCapture]);

  const onConsentAccept = useCallback(async () => {
    await giveConsent();
    doCapture();
  }, [giveConsent, doCapture]);

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

  const confirmMarker = useCallback(() => setPhase(PHASES.TYPE), []);

  const onSelectType = useCallback((typeKey) => {
    setSelectedType(typeKey);
    setSelectedCode(null);
    setPhase(PHASES.DETAILS);
  }, []);

  const buildElement = useCallback(() => {
    const w = imgLayout.width || 1;
    const h = imgLayout.height || 1;
    return {
      tap: marker ? { x: Math.round(marker.x), y: Math.round(marker.y) } : null,
      rel: marker ? { x: +(marker.x / w).toFixed(4), y: +(marker.y / h).toFixed(4) } : null,
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
        element: buildElement(),
        bugType: selectedType,
        bugCode: selectedCode,
        problem,
        solution,
        screenshot: shotUri,
      });
      showSuccess("Mulțumim! Feedback-ul a fost trimis. 🙏");
      resetAll();
    } catch (e) {
      showError(e?.message || "Nu am putut trimite feedback-ul.");
      setPhase(PHASES.DETAILS);
    }
  }, [selectedType, selectedCode, problem, solution, shotUri, submit, buildElement, resetAll]);

  if (!enabled) return null;

  const screenInfo = resolveCurrentScreen();
  const activeType = BUG_TYPES.find((t) => t.key === selectedType);

  return (
    <>
      {/* ---- BUTON FLOTANT (stanga jos, deasupra footer-ului) ---- */}
      {phase === PHASES.IDLE && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 92, left: 16 }]}
          onPress={onFabPress}
          activeOpacity={0.85}
          accessibilityLabel="Raportează un bug / feedback"
          accessibilityRole="button"
        >
          <Ionicons name="bug" size={22} color="#fff" />
          <Text style={styles.fabText}>TEST</Text>
        </TouchableOpacity>
      )}

      {/* ---- CONSIMTAMANT ---- */}
      <Modal visible={phase === PHASES.CONSENT} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <View style={styles.card}>
            <Ionicons name="shield-checkmark-outline" size={40} color="#22c55e" style={{ alignSelf: "center" }} />
            <Text style={styles.cardTitle}>Mod testare</Text>
            <Text style={styles.cardBody}>
              Când raportezi ceva, aplicația va face o <Text style={styles.bold}>captură a ecranului</Text> curent
              și va salva locul apăsat, plus detalii tehnice (versiune, model
              telefon). NU se salvează parole, token-uri sau date de conectare.
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

      {/* ---- CAPTURING: nu afisam NIMIC (niciun overlay), ca sa nu apara in captura.
           Butonul flotant se ascunde oricum pentru ca phase != IDLE. ---- */}

      {/* ---- PICK: alege elementul pe screenshot-ul inghetat ---- */}
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
              {marker ? "Ai selectat acest loc?" : "Apasă pe elementul cu probleme"}
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

      {/* ---- TYPE: alege tipul de bug ---- */}
      <Modal visible={phase === PHASES.TYPE} transparent animationType="slide">
        <View style={styles.sheetRoot}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ce fel de problemă e?</Text>
              <TouchableOpacity onPress={resetAll}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              {screenInfo.tab} · {screenInfo.screen}
            </Text>
            <View style={styles.typeGrid}>
              {BUG_TYPES.map((t) => (
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

      {/* ---- DETAILS: sub-problema + descriere problema + solutie ---- */}
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
                  <Text style={styles.fieldLabel}>Alege problema</Text>
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

              <Text style={styles.fieldLabel}>Descrie problema</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Ce nu e în regulă, în cuvintele tale…"
                placeholderTextColor="#64748b"
                value={problem}
                onChangeText={setProblem}
                multiline
                maxLength={1000}
              />

              <Text style={styles.fieldLabel}>Soluție / părere (opțional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Cum crezi că ar fi mai bine?"
                placeholderTextColor="#64748b"
                value={solution}
                onChangeText={setSolution}
                multiline
                maxLength={1000}
              />

              <View style={styles.saveRow}>
                <TouchableOpacity style={styles.ghostBtn} onPress={resetAll}>
                  <Text style={styles.ghostBtnText}>Închide</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, marginLeft: 12, opacity: problem.trim() || selectedCode ? 1 : 0.5 }]}
                  onPress={onSave}
                  disabled={!(problem.trim() || selectedCode)}
                >
                  <Text style={styles.primaryBtnText}>Salvează</Text>
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
  primaryBtn: { backgroundColor: "#7c3aed", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  ghostBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#334155", alignItems: "center", marginTop: 6 },
  ghostBtnText: { color: "#e2e8f0", fontWeight: "700", fontSize: 14 },
});

export default BugReporter;
