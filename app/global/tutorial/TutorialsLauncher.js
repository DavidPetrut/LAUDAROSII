import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTutorial } from "./TutorialContext";
import { tutorialApi } from "./tutorialApi";

/**
 * Buton "Tutoriale" (pentru orice user): deschide lista tutorialelor active si
 * porneste redarea ghidata la alegere.
 */
export const TutorialsLauncher = ({ style }) => {
  const { startPlay } = useTutorial();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    try {
      const r = await tutorialApi.list();
      setItems(r.tutorials || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const play = (tut) => {
    setOpen(false);
    startPlay(tut);
  };

  return (
    <>
      <TouchableOpacity style={[styles.btn, style]} onPress={load} activeOpacity={0.9}>
        <Ionicons name="school" size={24} color="#fff" />
        <Text style={styles.btnText}>Tutoriale</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>Tutoriale</Text>
            {loading ? (
              <ActivityIndicator color="#21c063" style={{ marginVertical: 20 }} />
            ) : items.length === 0 ? (
              <Text style={styles.empty}>Niciun tutorial disponibil momentan.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {items.map((tut) => (
                  <TouchableOpacity key={tut._id} style={styles.row} onPress={() => play(tut)} activeOpacity={0.85}>
                    <Ionicons name="play-circle" size={26} color="#21c063" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{tut.name}</Text>
                      {!!tut.description && <Text style={styles.desc} numberOfLines={2}>{tut.description}</Text>}
                      <Text style={styles.meta}>{tut.steps?.length || 0} pași</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(229,231,235,0.4)" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.close} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Închide</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0f766e",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1a1f2b", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  title: { color: "#f3f4f6", fontSize: 18, fontWeight: "700", marginBottom: 14 },
  empty: { color: "rgba(229,231,235,0.5)", textAlign: "center", paddingVertical: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  name: { color: "#f3f4f6", fontSize: 15, fontWeight: "600" },
  desc: { color: "rgba(229,231,235,0.6)", fontSize: 13, marginTop: 2 },
  meta: { color: "rgba(229,231,235,0.4)", fontSize: 12, marginTop: 2 },
  close: { paddingVertical: 12, alignItems: "center", marginTop: 6 },
  closeText: { color: "rgba(229,231,235,0.6)", fontSize: 14 },
});

export default TutorialsLauncher;
