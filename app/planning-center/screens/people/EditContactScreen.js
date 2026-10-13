/** Edit Contact Info (§9 [EDIT-CONTACT]) — folosește primitivele globale (PcScreen/PcButton/PcCheckbox). */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { uploadAsset } from "../../api/upload";
import { pcColors } from "../../theme";
import { PcScreen, PcAvatar, PcButton, PcCheckbox, PcDateField } from "../../components";

export function EditContactScreen({ route, navigation }) {
  const { personId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emails, setEmails] = useState([]);
  const [phones, setPhones] = useState([]);
  const [birthDate, setBirthDate] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await pcApi.people.get(personId);
      setAvatar(p.avatar || "");
      setFirstName(p.firstName || "");
      setLastName(p.lastName || "");
      setEmails(p.emails?.length ? p.emails : []);
      setPhones(p.phones?.length ? p.phones : []);
      setBirthDate(p.birthdate ? String(p.birthdate).slice(0, 10) : "");
      setAnniversary(p.anniversary ? String(p.anniversary).slice(0, 10) : "");
    } catch (e) {
      showError(e?.message || "Nu s-a putut încărca.");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { load(); }, [load]);

  const updatePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") return showError("Permisiunea pentru galerie e necesară.");
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      setUploading(true);
      const r = await uploadAsset({ uri: a.uri, name: a.fileName || "avatar.jpg", mimeType: a.mimeType || "image/jpeg" });
      if (r?.url) { setAvatar(r.url); showSuccess("Poză urcată."); }
    } catch (e) { showError(e?.message || "Eroare la poză."); }
    finally { setUploading(false); }
  };

  const save = async () => {
    Keyboard.dismiss();
    if (!firstName.trim()) return showError("Prenumele este obligatoriu.");
    setSaving(true);
    try {
      await pcApi.people.updateContact(personId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emails: emails.filter((e) => e.address?.trim()),
        phones: phones.filter((p) => p.number?.trim()),
        avatar,
        birthdate: birthDate || null,
        anniversary: anniversary || null,
      });
      showSuccess("Contact salvat");
      navigation.goBack();
    } catch (e) {
      showError(e?.message || "Nu s-a putut salva.");
    } finally {
      setSaving(false);
    }
  };

  const setEmail = (i, patch) => setEmails((arr) => arr.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const setPhone = (i, patch) => setPhones((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Contact Info</Text>
        <Pressable onPress={save} hitSlop={10} disabled={saving}>
          <Text style={styles.save}>{saving ? "..." : "SAVE"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <PcAvatar uri={avatar} initials={(firstName[0] || "") + (lastName[0] || "")} size={110} />
            <PcButton variant="outline" title={uploading ? "Se urcă…" : "Update Photo"} onPress={updatePhoto} loading={uploading} style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 24 }} />
          </View>

          <View style={styles.nameRow}>
            <Ionicons name="person" size={22} color={pcColors.textMuted} style={{ marginTop: 10, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={pcColors.textMuted} />
              <View style={styles.line} />
              <TextInput style={[styles.input, { marginTop: 16 }]} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={pcColors.textMuted} />
              <View style={styles.line} />
            </View>
          </View>

          {/* Emails */}
          <View style={styles.section}>
            <Ionicons name="mail" size={22} color={pcColors.textMuted} style={{ marginTop: 8, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              {emails.map((e, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLoc}>{e.location || "Home"} ▾</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={e.address}
                      onChangeText={(v) => setEmail(i, { address: v })}
                      placeholder="email@exemplu.com"
                      placeholderTextColor={pcColors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setEmails((arr) => arr.filter((_, idx) => idx !== i))} hitSlop={8}>
                      <Ionicons name="close" size={20} color={pcColors.textMuted} />
                    </Pressable>
                  </View>
                  <View style={styles.line} />
                </View>
              ))}
              <Pressable onPress={() => setEmails((arr) => [...arr, { location: "Home", address: "" }])}>
                <Text style={styles.addLink}>+ Add Email</Text>
              </Pressable>
            </View>
          </View>

          {/* Phones */}
          <View style={styles.section}>
            <Ionicons name="call" size={22} color={pcColors.textMuted} style={{ marginTop: 8, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              {phones.map((p, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLoc}>{p.location || "Mobile"} ▾</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={p.number}
                      onChangeText={(v) => setPhone(i, { number: v })}
                      placeholder="07xx xxx xxx"
                      placeholderTextColor={pcColors.textMuted}
                      keyboardType="phone-pad"
                    />
                    <Pressable onPress={() => setPhones((arr) => arr.filter((_, idx) => idx !== i))} hitSlop={8}>
                      <Ionicons name="close" size={20} color={pcColors.textMuted} />
                    </Pressable>
                  </View>
                  <View style={styles.checkRow}>
                    <PcCheckbox size={22} checked={!!p.enableText} onPress={() => setPhone(i, { enableText: !p.enableText })} />
                    <Text style={styles.checkLabel}>Enable Text Messaging</Text>
                  </View>
                  <View style={styles.line} />
                </View>
              ))}
              <Pressable onPress={() => setPhones((arr) => [...arr, { location: "Mobile", number: "", enableText: false }])}>
                <Text style={styles.addLink}>+ Add Phone</Text>
              </Pressable>
              <Pressable onPress={() => {}} style={{ marginTop: 16 }}>
                <Text style={styles.addLink}>+ Add Address</Text>
              </Pressable>
            </View>
          </View>

          {/* Birth Date / Anniversary */}
          <View style={styles.section}>
            <Ionicons name="calendar" size={22} color={pcColors.textMuted} style={{ marginTop: 8, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <View style={styles.dateRow}>
                <Text style={styles.fieldLoc}>Birth Date</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <PcDateField value={birthDate} onChange={setBirthDate} placeholder="N/A" style={{ minWidth: 150 }} />
                  {!!birthDate && <Pressable onPress={() => setBirthDate("")} hitSlop={8}><Ionicons name="close" size={18} color={pcColors.textMuted} /></Pressable>}
                </View>
              </View>
              <View style={[styles.dateRow, { marginTop: 14 }]}>
                <Text style={styles.fieldLoc}>Anniversary</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <PcDateField value={anniversary} onChange={setAnniversary} placeholder="N/A" style={{ minWidth: 150 }} />
                  {!!anniversary && <Pressable onPress={() => setAnniversary("")} hitSlop={8}><Ionicons name="close" size={18} color={pcColors.textMuted} /></Pressable>}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  save: { color: pcColors.primary, fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  nameRow: { flexDirection: "row", marginBottom: 20 },
  input: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "600", paddingVertical: 6 },
  line: { height: StyleSheet.hairlineWidth, backgroundColor: pcColors.inputBorder, marginTop: 6 },
  section: { flexDirection: "row", marginTop: 24 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldLoc: { color: pcColors.textSecondary, fontSize: 15, fontWeight: "600" },
  fieldInput: { flex: 1, color: pcColors.textPrimary, fontSize: 16, textAlign: "right", paddingVertical: 6 },
  addLink: { color: pcColors.primary, fontWeight: "700", fontSize: 15, marginTop: 6 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  checkLabel: { color: pcColors.textSecondary, fontSize: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

export default EditContactScreen;
