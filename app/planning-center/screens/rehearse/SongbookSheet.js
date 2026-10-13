/** Songbook (din poză, concept web): „Files to include" — un singur PDF ce combină PDF-urile planului.
 *  Alegi ce incluzi → generează. ⚠️ Export PDF real = seam (expo-print); aici deschidem un
 *  „songbook view" in-app (toate charturile/versurile la rând). Capo/Other PDFs = seam (fișiere reale). */
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { pcColors } from "../../theme";
import { PcBottomSheet, PcButton, PcCheckbox } from "../../components";

const OPTIONS = [
  { key: "order", label: "Order of Service" },
  { key: "chordCharts", label: "Services Chord Charts" },
  { key: "capoChordCharts", label: "Services Capo Chord Charts", seam: true },
  { key: "lyrics", label: "Services Lyrics" },
  { key: "otherPdfs", label: "Other PDFs", seam: true },
];

export function SongbookSheet({ visible, onClose, planId, songs = [], navigation }) {
  const nav = navigation;
  const [sel, setSel] = useState({ lyrics: true });
  useEffect(() => { if (visible) setSel({ lyrics: true }); }, [visible]);

  const toggle = (k) => setSel((s) => ({ ...s, [k]: !s[k] }));
  const uncheckAll = () => setSel({});
  const accept = () => {
    onClose();
    // în lipsa navigării directe, folosim un event global prin require lazy nu e curat → cerem nav din părinte
    if (nav) nav.navigate("PcSongbookView", { planId, opts: sel });
  };

  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.6}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={styles.head}>
          <Text style={styles.title}>Songbook</Text>
          <Pressable onPress={uncheckAll} style={styles.uncheck}><Text style={styles.uncheckTxt}>Uncheck all</Text></Pressable>
        </View>
        <Text style={styles.sub}>Files to include — un singur document care combină conținutul acestui plan.</Text>
        {OPTIONS.map((o) => (
          <Pressable key={o.key} style={styles.row} onPress={() => toggle(o.key)}>
            <PcCheckbox checked={!!sel[o.key]} onPress={() => toggle(o.key)} size={22} />
            <Text style={styles.rowTxt}>{o.label}</Text>
            {o.seam && <Text style={styles.seam}>(fișiere reale = seam)</Text>}
          </Pressable>
        ))}
        <View style={styles.actions}>
          <PcButton title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <PcButton title="Accept" onPress={accept} style={{ flex: 1 }} />
        </View>
      </View>
    </PcBottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700" },
  uncheck: { backgroundColor: pcColors.input, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  uncheckTxt: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700" },
  sub: { color: pcColors.textMuted, fontSize: 13, marginTop: 8, marginBottom: 14, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  rowTxt: { color: pcColors.textPrimary, fontSize: 16 },
  seam: { color: pcColors.textMuted, fontSize: 11, marginLeft: "auto" },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
});

export default SongbookSheet;
