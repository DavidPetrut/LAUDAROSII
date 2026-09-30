import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, Platform, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTesting } from "../../testing/TestingContext";
import { showSuccess, showError } from "../../functions";

const IS_WEB = Platform.OS === "web";
const ACCENT = "#f59e0b";

// Statusul afisat sub stele, pe pasi de 0.5.
const STATUS = {
  0.5: "Slab",
  1: "Slab",
  1.5: "Se putea mai bine",
  2: "E ok, e bun",
  2.5: "E chiar fain",
  3: "E super tare",
};

// O stea cu doua zone de atingere (jumatate stanga = x-0.5, dreapta = x).
const Star = ({ index, value, onPick }) => {
  const name = value >= index ? "star" : value >= index - 0.5 ? "star-half" : "star-outline";
  return (
    <View style={styles.starWrap}>
      <Ionicons name={name} size={44} color={ACCENT} />
      <Pressable style={styles.starLeft} onPress={() => onPick(index - 0.5)} />
      <Pressable style={styles.starRight} onPress={() => onPick(index)} />
    </View>
  );
};

/**
 * Butonul de feedback pentru userii cu acces "rating": rating pe stele (1..3, pas
 * 0.5) + status + feedback scris. In spate se pastreaza ecranul/path/persoana
 * (prin submit-ul din TestingContext).
 */
export const RatingReporter = ({ controlled = false, open: openProp = false, onClose }) => {
  const insets = useSafeAreaInsets();
  const { enabled, resolveCurrentScreen, submit } = useTesting();
  const [openState, setOpenState] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  if (!enabled) return null;

  // Controlat din meniul TEST (BugReporter) sau standalone (cu FAB propriu).
  const open = controlled ? openProp : openState;
  const screenInfo = resolveCurrentScreen();

  const reset = () => {
    setRating(0);
    setFeedback("");
    if (controlled) onClose?.();
    else setOpenState(false);
  };

  const send = async () => {
    if (!rating) return showError("Alege un rating");
    setSending(true);
    try {
      await submit({
        kind: "rating",
        source: IS_WEB ? "local" : "mobile",
        rating,
        bugType: "RATING",
        problem: feedback.trim(),
      });
      showSuccess("Mulțumim pentru feedback! 🙏");
      reset();
    } catch (e) {
      showError(e.message || "Eroare la trimitere");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!controlled && !open && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 92, left: 16 }]}
          onPress={() => setOpenState(true)}
          activeOpacity={0.85}
          accessibilityLabel="Dă un rating"
        >
          <Ionicons name="star" size={20} color="#fff" />
          <Text style={styles.fabText}>RATING</Text>
        </TouchableOpacity>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={reset}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Cât de bună e această funcționalitate?</Text>
            <Text style={styles.sub}>{screenInfo.tab} · {screenInfo.screen}</Text>

            <View style={styles.stars}>
              {[1, 2, 3].map((i) => (
                <Star key={i} index={i} value={rating} onPick={setRating} />
              ))}
            </View>
            <Text style={styles.status}>{rating ? STATUS[rating] : "Atinge stelele"}</Text>

            <TextInput
              style={styles.input}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Spune-ne mai multe (opțional)"
              placeholderTextColor="rgba(229,231,235,0.4)"
              multiline
              maxLength={1000}
            />

            <TouchableOpacity style={[styles.primaryBtn, (!rating || sending) && { opacity: 0.5 }]} onPress={send} disabled={!rating || sending} activeOpacity={0.9}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Trimite</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={reset}>
              <Text style={styles.ghostBtnText}>Închide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    zIndex: 99999999,
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#161a24", borderRadius: 20, padding: 24 },
  title: { color: "#f3f4f6", fontSize: 18, fontWeight: "700", textAlign: "center" },
  sub: { color: "rgba(229,231,235,0.5)", fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 18 },
  stars: { flexDirection: "row", justifyContent: "center", gap: 10 },
  starWrap: { width: 44, height: 44, position: "relative" },
  starLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: 22 },
  starRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: 22 },
  status: { color: ACCENT, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: 12, minHeight: 22 },
  input: {
    color: "#f3f4f6",
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
    minHeight: 80,
    textAlignVertical: "top",
  },
  primaryBtn: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 18 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghostBtn: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  ghostBtnText: { color: "rgba(229,231,235,0.6)", fontSize: 14 },
});

export default RatingReporter;
