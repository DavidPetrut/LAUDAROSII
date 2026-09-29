import React, { useState, useCallback, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { showError, showSuccess } from "../functions";
import { useTutorial } from "./TutorialContext";
import { TutorialOverlay } from "./TutorialOverlay";
import { tutorialApi } from "./tutorialApi";

const ACCENT = "#7c3aed";

/**
 * Stratul global al tutorialelor: overlay-ul de redare (pt. oricine) si, pentru
 * autor (super-admin/developer cu flag pornit), butonul flotant + inregistrare +
 * salvare + lista de tutoriale.
 */
export const TutorialLayer = () => {
  const t = useTutorial();
  return (
    <>
      {t.mode === "play" && <TutorialOverlay />}
      {t.canAuthor && <AuthorUI t={t} />}
    </>
  );
};

const AuthorUI = ({ t }) => {
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [tutorials, setTutorials] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(true);
  const [err, setErr] = useState("");

  // La (re)deschiderea sheet-ului de salvare, curatam orice eroare veche.
  useEffect(() => {
    if (t.reviewOpen) setErr("");
  }, [t.reviewOpen]);

  const openList = useCallback(async () => {
    setMenu(false);
    setListOpen(true);
    setLoadingList(true);
    try {
      const r = await tutorialApi.list(true);
      setTutorials(r.tutorials || []);
    } catch (e) {
      showError("Nu am putut încărca tutorialele");
    } finally {
      setLoadingList(false);
    }
  }, []);

  const setStepInstruction = (idx, text) =>
    t.setRecordSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, instruction: text } : s)));

  const removeStep = (idx) => t.setRecordSteps((prev) => prev.filter((_, i) => i !== idx));

  const saveTutorial = async () => {
    if (!name.trim()) return setErr("Dă un nume tutorialului ca să poți salva.");
    if (!t.recordSteps.length) return setErr("Tutorialul nu are niciun pas.");
    setErr("");
    setSaving(true);
    try {
      // Salvam o SCHEMA (draft): materie prima pe care o construiesc din dashboard.
      await tutorialApi.create({
        name: name.trim(),
        description: desc.trim(),
        status: "draft",
        steps: t.recordSteps,
      });
      showSuccess("Schemă salvată — o construiesc din dashboard");
      setName("");
      setDesc("");
      t.closeReview();
    } catch (e) {
      setErr(e.message || "Eroare la salvare. Verifică serverul.");
    } finally {
      setSaving(false);
    }
  };

  const playTutorial = (tut) => {
    setListOpen(false);
    t.startPlay(tut);
  };

  const toggleActive = async (tut) => {
    try {
      const r = await tutorialApi.update(tut._id, { active: !tut.active });
      setTutorials((prev) => prev.map((x) => (x._id === tut._id ? r.tutorial : x)));
    } catch (e) {
      showError("Eroare");
    }
  };

  const deleteTutorial = async (tut) => {
    try {
      await tutorialApi.remove(tut._id);
      setTutorials((prev) => prev.filter((x) => x._id !== tut._id));
    } catch (e) {
      showError("Eroare la ștergere");
    }
  };

  return (
    <>
      {/* Buton flotant autor (deasupra butonului TEST) */}
      {t.mode === "idle" && !t.reviewOpen && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 152, left: 16 }]}
          onPress={() => setMenu(true)}
          activeOpacity={0.85}
          dataSet={{ tutorialUi: "1" }}
        >
          <Ionicons name="school" size={20} color="#fff" />
          <Text style={styles.fabText}>TUTORIAL</Text>
        </TouchableOpacity>
      )}

      {/* Bara de inregistrare + panou live cu pasii (narezi fiecare pas pe loc) */}
      {t.mode === "record" && (
        <>
          <View style={[styles.recBar, { top: insets.top + 8 }]} dataSet={{ tutorialUi: "1" }}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>Înregistrez • {t.recordSteps.length} pași</Text>
            <TouchableOpacity style={styles.recIcon} onPress={() => setStepsOpen((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={stepsOpen ? "chevron-up" : "chevron-down"} size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.recBtn} onPress={t.finishRecording}>
              <Text style={styles.recBtnText}>Termină</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.recCancel} onPress={t.cancelRecording}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {stepsOpen && (
            <View style={[styles.recPanel, { top: insets.top + 60 }]} dataSet={{ tutorialUi: "1" }}>
              <Text style={styles.recPanelHint}>
                Dă click pe elementul din app → devine pasul următor. Scrie ce faci la fiecare pas.
              </Text>
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {t.recordSteps.map((s, i) => (
                  <View key={i} style={styles.recStep}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      {!!s.screen && (
                        <View style={styles.recStepHead}>
                          <Text style={styles.screenTag}>{s.screen}</Text>
                        </View>
                      )}
                      <TextInput
                        style={styles.stepInput}
                        value={s.instruction}
                        onChangeText={(txt) => setStepInstruction(i, txt)}
                        placeholder="Ce faci la pasul ăsta (next step)"
                        placeholderTextColor="rgba(229,231,235,0.4)"
                        maxLength={240}
                      />
                    </View>
                    <TouchableOpacity onPress={() => removeStep(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {t.recordSteps.length === 0 && <Text style={styles.empty}>Niciun pas încă.</Text>}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Meniu autor */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Tutoriale</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(false); t.startRecording(); }}>
              <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
              <Text style={styles.menuText}>Tutorial nou (înregistrează)</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={openList}>
              <Ionicons name="albums-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuText}>Tutoriale salvate</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Review + salvare */}
      <Modal visible={t.reviewOpen} transparent animationType="slide" onRequestClose={t.closeReview}>
        <Pressable style={styles.backdrop} onPress={t.closeReview}>
          <Pressable style={[styles.sheet, { maxHeight: "86%" }]} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Salvează schema tutorialului</Text>
            <Text style={styles.helpNote}>
              Se salvează ca schemă (draft) cu capturi pe fiecare pas. O construiesc eu din dashboard (tab Tutorial → Copy prompt). Nu apare userilor până n-o public eu.
            </Text>
            <TextInput
              style={[styles.input, err && !name.trim() ? styles.inputError : null]}
              value={name}
              onChangeText={(v) => { setName(v); if (err) setErr(""); }}
              placeholder="Nume (ex: Cum adaugi un motiv)"
              placeholderTextColor="rgba(229,231,235,0.4)"
              maxLength={80}
            />
            {err ? <Text style={styles.errText}>{err}</Text> : null}
            <TextInput
              style={[styles.input, { minHeight: 44 }]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Descriere pt AI (ce tutorial e, contextul general) — opțional"
              placeholderTextColor="rgba(229,231,235,0.4)"
              multiline
              maxLength={2000}
            />
            <Text style={styles.label}>Pași ({t.recordSteps.length}) — descrie pt AI ce faci la fiecare</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {t.recordSteps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    {!!s.screen && <Text style={styles.screenTag}>{s.screen}</Text>}
                    <TextInput
                      style={styles.stepInput}
                      value={s.instruction}
                      onChangeText={(txt) => setStepInstruction(i, txt)}
                      placeholder="Descrie pt AI: ce apeși / ce se întâmplă aici"
                      placeholderTextColor="rgba(229,231,235,0.4)"
                      maxLength={1000}
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeStep(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {t.recordSteps.length === 0 && <Text style={styles.empty}>Niciun pas înregistrat.</Text>}
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveTutorial} disabled={saving} activeOpacity={0.9}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvează schema</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={t.closeReview}>
              <Text style={styles.cancelText}>Renunță</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Lista tutoriale */}
      <Modal visible={listOpen} transparent animationType="slide" onRequestClose={() => setListOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setListOpen(false)}>
          <Pressable style={[styles.sheet, { maxHeight: "80%" }]} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Tutoriale salvate</Text>
            {loadingList ? (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {tutorials.map((tut) => (
                  <View key={tut._id} style={styles.tutRow}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => playTutorial(tut)}>
                      <Text style={styles.tutName} numberOfLines={1}>{tut.name}</Text>
                      <Text style={styles.tutMeta}>{tut.steps?.length || 0} pași {tut.active ? "" : "• inactiv"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleActive(tut)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={tut.active ? "eye-outline" : "eye-off-outline"} size={20} color="#e5e7eb" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteTutorial(tut)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 14 }}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {tutorials.length === 0 && <Text style={styles.empty}>Niciun tutorial încă.</Text>}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setListOpen(false)}>
              <Text style={styles.cancelText}>Închide</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    zIndex: 99999990,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 1 },
  recBar: {
    position: "absolute",
    zIndex: 99999992,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#161a24",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ef4444" },
  recText: { flex: 1, color: "#f3f4f6", fontWeight: "700" },
  recIcon: { padding: 6 },
  recBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  recBtnText: { color: "#fff", fontWeight: "700" },
  recCancel: { padding: 6 },
  recPanel: {
    position: "absolute",
    zIndex: 99999992,
    right: 12,
    width: 340,
    maxWidth: "92%",
    backgroundColor: "#161a24",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.4)",
    padding: 12,
  },
  recPanelHint: { color: "rgba(229,231,235,0.6)", fontSize: 12, lineHeight: 17, marginBottom: 10 },
  recStep: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  recStepHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  screenTag: { color: "#a78bfa", fontSize: 11, fontWeight: "700", backgroundColor: "rgba(124,58,237,0.18)", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: "hidden" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1a1f2b", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  sheetTitle: { color: "#f3f4f6", fontSize: 18, fontWeight: "700", marginBottom: 14 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  menuText: { color: "#e5e7eb", fontSize: 15, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  input: { color: "#f3f4f6", fontSize: 15, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingVertical: 10, marginBottom: 16 },
  inputError: { borderColor: "#ef4444" },
  errText: { color: "#ef4444", fontSize: 13, fontWeight: "600", marginTop: -8, marginBottom: 12 },
  helpNote: { color: "rgba(229,231,235,0.6)", fontSize: 12.5, lineHeight: 17, marginBottom: 14 },
  label: { color: "rgba(229,231,235,0.6)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(124,58,237,0.2)", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#a78bfa", fontWeight: "800", fontSize: 13 },
  stepLabel: { color: "rgba(229,231,235,0.6)", fontSize: 12, marginBottom: 2 },
  stepInput: { color: "#f3f4f6", fontSize: 14, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.15)", paddingVertical: 4 },
  saveBtn: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 18 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  cancelText: { color: "rgba(229,231,235,0.6)", fontSize: 14 },
  empty: { color: "rgba(229,231,235,0.5)", textAlign: "center", paddingVertical: 20 },
  tutRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  tutName: { color: "#f3f4f6", fontSize: 15, fontWeight: "600" },
  tutMeta: { color: "rgba(229,231,235,0.5)", fontSize: 12, marginTop: 2 },
});

export default TutorialLayer;
