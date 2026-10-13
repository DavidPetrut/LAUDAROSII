/** Settings (§9 [SETTINGS]) — folosește primitivele globale (PcScreen/PcSectionTitle/PcListRow/PcCheckbox). */
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PcScreen, PcSectionTitle, PcListRow, PcCheckbox } from "../../components";
import { pcColors } from "../../theme";

const Section = ({ title, children }) => (
  <View style={{ paddingTop: 24 }}>
    <PcSectionTitle>{title}</PcSectionTitle>
    {children}
  </View>
);

export function PcSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [staging, setStaging] = useState(false);

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Section title="Appearance">
          <PcListRow title="Theme" sub="Match system theme" onPress={() => {}} />
        </Section>
        <Section title="Notifications">
          <PcListRow title="Team and schedule" onPress={() => {}} />
          <PcListRow title="Chat conversations" onPress={() => {}} />
          <PcListRow title="Open system settings" onPress={() => {}} />
        </Section>
        <Section title="Audio Files">
          <PcListRow title="Delete audio files" onPress={() => {}} />
          <PcListRow title="Manage audio files" onPress={() => {}} />
        </Section>
        <Section title="Advanced Features">
          <PcListRow
            title="Enable Staging"
            sub="Enable experimental features for 1 hour"
            right={<PcCheckbox checked={staging} onPress={() => setStaging((v) => !v)} />}
          />
        </Section>
        <Section title="About">
          <PcListRow title="Open source" onPress={() => {}} />
          <PcListRow title="Privacy policy" onPress={() => {}} />
          <PcListRow title="Terms of service" onPress={() => {}} />
        </Section>
      </ScrollView>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "700", marginLeft: 12 },
});

export default PcSettingsScreen;
