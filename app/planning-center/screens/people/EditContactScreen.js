/** Edit Contact Info (§9 [EDIT-CONTACT]) — nume + emails + phones (+ Enable Text) + adrese. */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcAvatar } from "../../components";

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await pcApi.people.get(personId);
      setAvatar(p.avatar || "");
      setFirstName(p.firstName || "");
      setLastName(p.lastName || "");
      setEmails(p.emails?.length ? p.emails : []);
      setPhones(p.phones?.length ? p.phones : []);
    } catch (e) {
      showError(e?.message || "Nu s-a putut încărca.");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { load(); }, [load]);

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
    <View style={styles.container}>
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
            <Pressable style={styles.photoBtn} onPress={() => {}}>
              <Text style={styles.photoTxt}>Update Photo</Text>
            </Pressable>
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
                  <Pressable style={styles.checkRow} onPress={() => setPhone(i, { enableText: !p.enableText })}>
                    <View style={[styles.checkbox, p.enableText && styles.checkboxOn]}>
                      {p.enableText && <Ionicons name="checkmark" size={14} color="#000" />}
                    </View>
                    <Text style={styles.checkLabel}>Enable Text Messaging</Text>
                  </Pressable>
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: pcColors.bg },
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  save: { color: pcColors.primary, fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  photoBtn: { borderWidth: 1, borderColor: pcColors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, marginTop: 14 },
  photoTxt: { color: pcColors.primary, fontWeight: "700" },
  nameRow: { flexDirection: "row", marginBottom: 20 },
  input: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "600", paddingVertical: 6 },
  line: { height: StyleSheet.hairlineWidth, backgroundColor: pcColors.inputBorder, marginTop: 6 },
  section: { flexDirection: "row", marginTop: 24 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldLoc: { color: pcColors.textSecondary, fontSize: 15, fontWeight: "600" },
  fieldInput: { flex: 1, color: pcColors.textPrimary, fontSize: 16, textAlign: "right", paddingVertical: 6 },
  addLink: { color: pcColors.primary, fontWeight: "700", fontSize: 15, marginTop: 6 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: pcColors.chipBorder, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: pcColors.primary, borderColor: pcColors.primary },
  checkLabel: { color: pcColors.textSecondary, fontSize: 16 },
});

export default EditContactScreen;
