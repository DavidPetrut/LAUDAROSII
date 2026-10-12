/** Placeholder stilizat pt. tab-urile neconstruite încă (Schedule/Plans/Songs/Media). */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PcHeader } from "../../components";
import { pcColors } from "../../theme";

export function makeComingSoon(title, icon = "construct-outline") {
  return function ComingSoonScreen() {
    return (
      <View style={styles.container}>
        <PcHeader title={title} />
        <View style={styles.center}>
          <Ionicons name={icon} size={46} color={pcColors.textMuted} />
          <Text style={styles.text}>În curând</Text>
          <Text style={styles.sub}>Modulul „{title}" se construiește pe aceeași arhitectură.</Text>
        </View>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: pcColors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  text: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 12 },
  sub: { color: pcColors.textSecondary, fontSize: 14, marginTop: 6, textAlign: "center" },
});

export default makeComingSoon;
