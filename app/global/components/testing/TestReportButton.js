import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTesting } from "../../testing/TestingContext";

/**
 * Buton TEST mic, de pus IN INTERIORUL popup-urilor (RN Modal).
 *
 * De ce e nevoie: butonul flotant global de la root e acoperit de ferestrele
 * Modal (RN monteaza Modal-ul intr-o fereastra separata, deasupra). Ca butonul
 * de testare sa fie disponibil si peste popup-uri, il randam si inauntrul lor.
 * Apasarea porneste ACELASI flow (care se deschide corect peste popup).
 *
 * Se pozitioneaza absolut in coltul containerului parinte. Suprascrie stilul cu `style`.
 */
export const TestReportButton = ({ style }) => {
  const { enabled, startReport } = useTesting();
  if (!enabled) return null;
  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={startReport}
      activeOpacity={0.85}
      accessibilitylabel="Raportează un bug aici"
      accessibilityRole="button"
    >
      <Ionicons name="bug" size={16} color="#fff" />
      <Text style={styles.txt}>TEST</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 99999999,
    elevation: 99,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  txt: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
});

export default TestReportButton;
