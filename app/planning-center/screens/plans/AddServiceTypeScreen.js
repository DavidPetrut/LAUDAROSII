/**
 * Add a Service Type — wizard „Create a service" (Name → Times → Teams). Web light → mobil dark.
 * Finish → creează service type + PRIMUL plan + service times + echipele conduse (viewer = lider).
 */
import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcButton, PcSelect, PcCheckbox, PcDateField } from "../../components";

const EXAMPLES = ["Weekend Service", "Sunday Service", "Special Events", "Contemporary Service", "Traditional Service", "Celebrate Recovery", "Children's Ministry", "High School", "Middle School"];
const RECUR = [
  { value: "randomly", label: "Randomly" }, { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" }, { value: "everyWeekday", label: "Every Weekday" },
  { value: "everyOtherWeek", label: "Every Other Week" }, { value: "monthly", label: "Monthly" },
];
const COMMON_TEAMS = [
  { group: "MUSIC", teams: ["Band", "Choir", "Orchestra", "Praise Team", "Vocals"] },
  { group: "TECHNICAL", teams: ["Audio/Visual", "Media", "Production", "Tech", "Video"] },
  { group: "KIDS", teams: ["Nursery", "Toddlers", "Pre-K", "K-1st", "2nd-3rd", "Preteen", "Middle School", "High School"] },
  { group: "HOSPITALITY", teams: ["First Impressions", "Greeters", "Guest Services", "Hospitality", "Ushers", "Welcome Team"] },
  { group: "OTHER", teams: ["Cafe", "Leadership", "Parking", "Security", "Speaking Team"] },
];
const STEPS = ["Name", "Times", "Teams"];
const validTime = (t) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(t || "").trim());

export function AddServiceTypeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [firstDate, setFirstDate] = useState("");
  const [times, setTimes] = useState([{ start: "08:00", end: "09:00" }]);
  const [teams, setTeams] = useState([]);

  const setTime = (i, patch) => setTimes((a) => a.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const toggleTeam = (name) => setTeams((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const next = () => {
    Keyboard.dismiss();
    if (step === 0) {
      if (!name.trim()) return showError("Scrie numele service type-ului.");
    }
    if (step === 1) {
      if (!firstDate) return showError("Alege prima dată.");
      for (const t of times) {
        if (!validTime(t.start) || (t.end && !validTime(t.end))) return showError("Ore invalide (format HH:MM).");
      }
    }
    setStep((s) => Math.min(s + 1, 2));
  };
  const back = () => (step === 0 ? navigation.goBack() : setStep((s) => s - 1));

  const finish = async () => {
    setSaving(true);
    try {
      const res = await pcApi.serviceTypes.create({
        name: name.trim(), frequency, firstDate,
        serviceTimes: times.filter((t) => validTime(t.start)),
        teams,
      });
      showSuccess("Service type creat");
      navigation.replace("PcPlan", { planId: res.planId });
    } catch (e) {
      showError(e?.message || "Nu s-a putut crea.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Create a service</Text>
      </View>

      {/* Stepper */}
      <View style={styles.stepper}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.dot, i <= step && styles.dotOn]}>
              {i < step ? <Ionicons name="checkmark" size={12} color="#0A0A0A" /> : null}
            </View>
            <Text style={[styles.stepTxt, i === step && { color: pcColors.primary }]}>{s}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Text style={styles.h1}>Add a Service Type</Text>
            <Text style={styles.p}>Un tip de serviciu care are loc la biserica ta, de obicei recurent săptămânal.</Text>
            <Text style={styles.label}>Exemple</Text>
            <View style={styles.exGrid}>
              {EXAMPLES.map((ex) => (
                <Pressable key={ex} style={styles.exChip} onPress={() => setName(ex)}>
                  <Text style={styles.exTxt}>{ex}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 20 }]}>Numele service type-ului</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ex. Serviciu de duminică" placeholderTextColor={pcColors.textMuted} />
            <Text style={[styles.label, { marginTop: 18 }]}>Planurile recură</Text>
            <PcSelect value={frequency} options={RECUR} onChange={setFrequency} />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.h1}>Set up your service times</Text>
            <Text style={styles.p}>Când pot participa oamenii la „{name}"? Adaugă ora(ele) pentru prima dată pe care vrei s-o planifici.</Text>
            <Text style={styles.label}>Prima dată</Text>
            <PcDateField value={firstDate} onChange={setFirstDate} />
            <Text style={[styles.label, { marginTop: 18 }]}>Ore de serviciu</Text>
            {times.map((t, i) => (
              <View key={i} style={styles.timeRow}>
                <Text style={styles.timeFromTo}>de la</Text>
                <TextInput style={styles.timeInput} value={t.start} onChangeText={(v) => setTime(i, { start: v })} placeholder="08:00" placeholderTextColor={pcColors.textMuted} />
                <Text style={styles.timeFromTo}>la</Text>
                <TextInput style={styles.timeInput} value={t.end} onChangeText={(v) => setTime(i, { end: v })} placeholder="09:00" placeholderTextColor={pcColors.textMuted} />
                {times.length > 1 && (
                  <Pressable onPress={() => setTimes((a) => a.filter((_, idx) => idx !== i))} hitSlop={6}>
                    <Ionicons name="remove-circle-outline" size={22} color={pcColors.textMuted} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable onPress={() => setTimes((a) => [...a, { start: "", end: "" }])}>
              <Text style={styles.addLink}>+ Adaugă altă oră de serviciu</Text>
            </Pressable>
            <Text style={styles.note}>*Dacă serviciul are mai multe ore, adaugă-le aici. NU adăuga repetiții sau alte ore.</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.h1}>Lastly, add teams you lead</Text>
            <Text style={styles.p}>„{name}" are nevoie de echipe. Alege echipele comune pe care le conduci (le poți edita/copia mai târziu).</Text>
            {COMMON_TEAMS.map((g) => (
              <View key={g.group} style={{ marginTop: 18 }}>
                <Text style={styles.teamGroup}>{g.group}</Text>
                {g.teams.map((tn) => (
                  <Pressable key={tn} style={styles.teamRow} onPress={() => toggleTeam(tn)}>
                    <PcCheckbox checked={teams.includes(tn)} onPress={() => toggleTeam(tn)} size={22} />
                    <Text style={styles.teamName}>{tn}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
            <Text style={styles.note}>*Vei fi adăugat ca lider la echipele selectate.</Text>
          </>
        )}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: (insets.bottom || 8) + 10 }]}>
        <PcButton title={step === 0 ? "Cancel" : "Back"} variant="ghost" onPress={back} style={{ flex: 1 }} />
        {step < 2 ? (
          <PcButton title={step === 0 ? "Next: Add Times" : "Next: Add Teams"} onPress={next} style={{ flex: 1.4 }} />
        ) : (
          <PcButton title="Finish" onPress={finish} loading={saving} style={{ flex: 1.4 }} />
        )}
      </View>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", marginLeft: 12 },
  stepper: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 14, backgroundColor: "#141416" },
  stepItem: { alignItems: "center", gap: 6 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#3A3A3C", alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: pcColors.primary },
  stepTxt: { color: pcColors.textMuted, fontSize: 13, fontWeight: "600" },
  h1: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 8 },
  p: { color: pcColors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  label: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  exGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  exChip: { backgroundColor: pcColors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  exTxt: { color: pcColors.textPrimary, fontSize: 13, fontWeight: "600" },
  input: { color: pcColors.textPrimary, fontSize: 17, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  timeFromTo: { color: pcColors.textMuted, fontSize: 14 },
  timeInput: { width: 78, color: pcColors.textPrimary, fontSize: 16, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 10, height: 44, textAlign: "center" },
  addLink: { color: pcColors.primary, fontWeight: "700", fontSize: 15, marginTop: 6 },
  note: { color: pcColors.textMuted, fontSize: 12, marginTop: 14, lineHeight: 17 },
  teamGroup: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  teamName: { color: pcColors.textPrimary, fontSize: 16 },
  actions: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 10, backgroundColor: pcColors.bgHeader, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
});

export default AddServiceTypeScreen;
