/**
 * Add person — wizard 3 pași (§9 [ADD-PERSON]). Convertit din web light → mobil dark+verde.
 * Campusurile IGNORATE (1 biserică). Pași: Edit profile → Permission details → Review.
 * Persoana se creează FĂRĂ login; permisiunea aleasă = accessIntent (materializată la primul login).
 */
import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcButton, PcSelect, PcCheckbox, PcAvatar } from "../../components";

const PP_LEVELS = [
  { value: "scheduledViewer", label: "Scheduled Viewer" },
  { value: "viewer", label: "Viewer" },
  { value: "scheduler", label: "Scheduler" },
  { value: "editor", label: "Editor" },
  { value: "administrator", label: "Administrator" },
];
const SM_LEVELS = PP_LEVELS.filter((l) => l.value !== "scheduler");
const EMAIL_LOC = ["Home", "Work", "Other"];
const PHONE_LOC = ["Mobile", "Home", "Work"];
const GENDER = [{ value: "", label: "—" }, { value: "M", label: "Masculin" }, { value: "F", label: "Feminin" }];
const ADULT = [{ value: false, label: "Adult" }, { value: true, label: "Copil" }];
const MARITAL = ["", "Single", "Married", "Widowed", "Divorced", "Separated"].map((m) => ({ value: m, label: m || "—" }));
const labelOf = (arr, v) => arr.find((x) => x.value === v)?.label || v;

export function AddPersonScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emails, setEmails] = useState([{ location: "Home", address: "" }]);
  const [phones, setPhones] = useState([{ location: "Mobile", number: "" }]);
  const [child, setChild] = useState(false);
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [anniversary, setAnniversary] = useState("");

  const [ppLevel, setPpLevel] = useState("scheduledViewer");
  const [songLevel, setSongLevel] = useState("scheduledViewer");
  const [mediaLevel, setMediaLevel] = useState("scheduledViewer");
  const [fileAccess, setFileAccess] = useState({ plan: true, song: true, media: true });

  const setEmail = (i, patch) => setEmails((a) => a.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const setPhone = (i, patch) => setPhones((a) => a.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const validProfile = () => {
    if (!firstName.trim()) { showError("Prenumele este obligatoriu."); return false; }
    if (!lastName.trim()) { showError("Numele este obligatoriu."); return false; }
    for (const e of emails) if (e.address.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.address.trim())) {
      showError(`Email invalid: ${e.address}`); return false;
    }
    return true;
  };

  const next = () => {
    Keyboard.dismiss();
    if (step === 0 && !validProfile()) return;
    setStep((s) => Math.min(s + 1, 2));
  };
  const back = () => (step === 0 ? navigation.goBack() : setStep((s) => s - 1));

  const submit = async () => {
    setSaving(true);
    try {
      const person = await pcApi.people.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emails: emails.filter((e) => e.address.trim()),
        phones: phones.filter((p) => p.number.trim()),
        gender, birthdate: birthdate.trim() || undefined, anniversary: anniversary.trim() || undefined,
        maritalStatus, child,
        accessIntent: { peoplePlansLevel: ppLevel, songLevel, mediaLevel, fileAccess },
      });
      showSuccess("Persoană creată");
      navigation.replace("PcProfile", { personId: person.id });
    } catch (e) {
      showError(e?.message || "Nu s-a putut crea persoana.");
    } finally {
      setSaving(false);
    }
  };

  const subtitle = ["Edit profile", "Permission details", "Review"][step];
  const primaryEmail = emails.find((e) => e.address.trim())?.address || "";
  const initials = ((firstName[0] || "") + (lastName[0] || "")).toUpperCase();

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Add person</Text>
          <Text style={styles.headerSub}>{subtitle}</Text>
        </View>
        <Text style={styles.stepDots}>{step + 1}/3</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <View style={{ alignItems: "center", marginBottom: 18 }}>
              <PcAvatar initials={initials || "—"} size={88} />
              <Text style={styles.noLogin}>(Fără cont de login)</Text>
            </View>
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Prenume</Text>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First" placeholderTextColor={pcColors.textMuted} />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Nume</Text>
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last" placeholderTextColor={pcColors.textMuted} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Email addresses</Text>
            {emails.map((e, i) => (
              <View key={i} style={styles.rowField}>
                <PcSelect value={e.location} options={EMAIL_LOC} onChange={(v) => setEmail(i, { location: v })} compact style={{ width: 110 }} />
                <TextInput style={styles.flexInput} value={e.address} onChangeText={(v) => setEmail(i, { address: v })} placeholder="email@exemplu.com" placeholderTextColor={pcColors.textMuted} keyboardType="email-address" autoCapitalize="none" />
                <Pressable onPress={() => setEmails((a) => a.filter((_, idx) => idx !== i))} hitSlop={6}><Ionicons name="remove-circle-outline" size={22} color={pcColors.textMuted} /></Pressable>
              </View>
            ))}
            <Pressable onPress={() => setEmails((a) => [...a, { location: "Home", address: "" }])}><Text style={styles.addLink}>+ Add Email</Text></Pressable>

            <Text style={styles.sectionLabel}>Phone numbers</Text>
            {phones.map((p, i) => (
              <View key={i} style={styles.rowField}>
                <PcSelect value={p.location} options={PHONE_LOC} onChange={(v) => setPhone(i, { location: v })} compact style={{ width: 110 }} />
                <TextInput style={styles.flexInput} value={p.number} onChangeText={(v) => setPhone(i, { number: v })} placeholder="07xx xxx xxx" placeholderTextColor={pcColors.textMuted} keyboardType="phone-pad" />
                <Pressable onPress={() => setPhones((a) => a.filter((_, idx) => idx !== i))} hitSlop={6}><Ionicons name="remove-circle-outline" size={22} color={pcColors.textMuted} /></Pressable>
              </View>
            ))}
            <Pressable onPress={() => setPhones((a) => [...a, { location: "Mobile", number: "" }])}><Text style={styles.addLink}>+ Add Phone</Text></Pressable>

            <Text style={styles.sectionLabel}>Detalii</Text>
            <View style={styles.grid2}>
              <View style={styles.cell}><Text style={styles.fieldLabel}>Tip</Text><PcSelect value={child} options={ADULT} onChange={setChild} /></View>
              <View style={styles.cell}><Text style={styles.fieldLabel}>Gen</Text><PcSelect value={gender} options={GENDER} onChange={setGender} /></View>
            </View>
            <View style={styles.grid2}>
              <View style={styles.cell}><Text style={styles.fieldLabel}>Data nașterii</Text><TextInput style={styles.boxInput} value={birthdate} onChangeText={setBirthdate} placeholder="AAAA-LL-ZZ" placeholderTextColor={pcColors.textMuted} /></View>
              <View style={styles.cell}><Text style={styles.fieldLabel}>Aniversare</Text><TextInput style={styles.boxInput} value={anniversary} onChangeText={setAnniversary} placeholder="AAAA-LL-ZZ" placeholderTextColor={pcColors.textMuted} /></View>
            </View>
            <Text style={styles.fieldLabel}>Marital Status</Text>
            <PcSelect value={maritalStatus} options={MARITAL} onChange={setMaritalStatus} />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.permNote}>Nivelurile de acces. (Service Types pe foldere/campusuri = N/A — 1 biserică.)</Text>
            <Text style={styles.fieldLabel}>People and Plans</Text>
            <PcSelect value={ppLevel} options={PP_LEVELS} onChange={setPpLevel} />
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Songs</Text>
            <PcSelect value={songLevel} options={SM_LEVELS} onChange={setSongLevel} />
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Media</Text>
            <PcSelect value={mediaLevel} options={SM_LEVELS} onChange={setMediaLevel} />
            <Text style={[styles.fieldLabel, { marginTop: 22 }]}>File Access</Text>
            <View style={styles.fileRow}>
              {["plan", "song", "media"].map((k) => (
                <Pressable key={k} style={styles.fileItem} onPress={() => setFileAccess((f) => ({ ...f, [k]: !f[k] }))}>
                  <PcCheckbox checked={fileAccess[k]} onPress={() => setFileAccess((f) => ({ ...f, [k]: !f[k] }))} size={22} />
                  <Text style={styles.fileTxt}>{k === "plan" ? "Plan" : k === "song" ? "Song" : "Media"}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <View style={{ alignItems: "center" }}>
            <PcAvatar initials={initials || "—"} size={96} />
            <Text style={styles.reviewName}>{[firstName, lastName].filter(Boolean).join(" ")}</Text>
            {!!primaryEmail && <Text style={styles.reviewSub}>{primaryEmail}</Text>}
            <Text style={styles.reviewPerm}>Highest permission: {labelOf(PP_LEVELS, ppLevel)}</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewHint}>
                Persoana se creează ca profil (fără login). Emailul de welcome + acordarea accesului de
                logare se trimit când integrăm fluxul de invitație (seam).
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions (peste tab bar, regula ta) */}
      <View style={[styles.actions, { paddingBottom: (insets.bottom || 8) + 10 }]}>
        <PcButton title={step === 0 ? "Cancel" : "Back"} variant="ghost" onPress={back} style={{ flex: 1 }} />
        {step < 2 ? (
          <PcButton title="Continuă" onPress={next} style={{ flex: 1 }} />
        ) : (
          <PcButton title="Creează" onPress={submit} loading={saving} style={{ flex: 1 }} />
        )}
      </View>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700" },
  headerSub: { color: pcColors.textSecondary, fontSize: 13, marginTop: 1 },
  stepDots: { color: pcColors.textMuted, fontWeight: "700" },
  noLogin: { color: pcColors.textMuted, fontSize: 13, marginTop: 10 },
  nameRow: { flexDirection: "row" },
  fieldLabel: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 2 },
  sectionLabel: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "700", marginTop: 22, marginBottom: 10 },
  input: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "600", borderBottomWidth: 1, borderBottomColor: pcColors.inputBorder, paddingVertical: 8 },
  boxInput: { color: pcColors.textPrimary, fontSize: 15, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  rowField: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  flexInput: { flex: 1, color: pcColors.textPrimary, fontSize: 15, backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  addLink: { color: pcColors.primary, fontWeight: "700", fontSize: 15, marginTop: 4 },
  grid2: { flexDirection: "row", gap: 12, marginBottom: 6 },
  cell: { flex: 1 },
  permNote: { color: pcColors.textMuted, fontSize: 13, marginBottom: 16 },
  fileRow: { flexDirection: "row", gap: 24, marginTop: 10 },
  fileItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  fileTxt: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "600" },
  reviewName: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700", marginTop: 14 },
  reviewSub: { color: pcColors.textSecondary, fontSize: 15, marginTop: 4 },
  reviewPerm: { color: pcColors.primary, fontSize: 15, fontWeight: "700", marginTop: 10 },
  reviewCard: { backgroundColor: pcColors.card, borderRadius: 12, padding: 16, marginTop: 24 },
  reviewHint: { color: pcColors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: "center" },
  actions: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 10, backgroundColor: pcColors.bgHeader, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
});

export default AddPersonScreen;
