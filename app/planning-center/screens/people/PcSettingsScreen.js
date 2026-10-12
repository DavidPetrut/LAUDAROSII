/** Settings (§9 [SETTINGS]) — Appearance / Notifications / Audio Files / Advanced / About. */
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcColors } from "../../theme";

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);
const Row = ({ title, sub, right, onPress }) => (
  <Pressable style={styles.row} onPress={onPress}>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
    </View>
    {right}
  </Pressable>
);

export function PcSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [staging, setStaging] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Section title="Appearance">
          <Row title="Theme" sub="Match system theme" onPress={() => {}} />
        </Section>
        <Section title="Notifications">
          <Row title="Team and schedule" onPress={() => {}} />
          <Row title="Chat conversations" onPress={() => {}} />
          <Row title="Open system settings" onPress={() => {}} />
        </Section>
        <Section title="Audio Files">
          <Row title="Delete audio files" onPress={() => {}} />
          <Row title="Manage audio files" onPress={() => {}} />
        </Section>
        <Section title="Advanced Features">
          <Row
            title="Enable Staging"
            sub="Enable experimental features for 1 hour"
            right={
              <Pressable onPress={() => setStaging((v) => !v)} style={[styles.checkbox, staging && styles.checkboxOn]}>
                {staging && <Ionicons name="checkmark" size={16} color="#000" />}
              </Pressable>
            }
          />
        </Section>
        <Section title="About">
          <Row title="Open source" onPress={() => {}} />
          <Row title="Privacy policy" onPress={() => {}} />
          <Row title="Terms of service" onPress={() => {}} />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: pcColors.bg },
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "700", marginLeft: 12 },
  section: { paddingTop: 24 },
  sectionTitle: { color: pcColors.primary, fontSize: 15, fontWeight: "700", paddingHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  rowTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "600" },
  rowSub: { color: pcColors.textSecondary, fontSize: 14, marginTop: 4 },
  checkbox: { width: 26, height: 26, borderRadius: 5, borderWidth: 2, borderColor: pcColors.chipBorder, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: pcColors.primary, borderColor: pcColors.primary },
});

export default PcSettingsScreen;
