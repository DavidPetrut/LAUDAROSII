import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../global/components";
import { useTheme } from "../../../global/context";
import { showError, showSuccess } from "../../../global/functions";
import { accessApi } from "./accessApi";
import { RoleDropdown } from "./RoleDropdown";
import { ac, ACCENT } from "./appControlStyles";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AppControlCreateMember = ({ navigation }) => {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const needsPassword = role !== "user";
  const input = (val, set, opts = {}) => (
    <TextInput
      style={[styles(theme).input]}
      value={val}
      onChangeText={set}
      placeholderTextColor={theme.textMuted}
      {...opts}
    />
  );

  const submit = async () => {
    if (!EMAIL_RX.test(email.trim())) return showError("Email invalid");
    if (needsPassword && !password) return showError("Confirma cu parola ta");
    setSubmitting(true);
    try {
      const res = await accessApi.invite({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        password: needsPassword ? password : undefined,
      });
      setResult(res);
      showSuccess(res.emailSent ? "Invitatie trimisa pe email" : "Membru creat");
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      if (Platform.OS === "web" && navigator?.clipboard && result?.link) {
        await navigator.clipboard.writeText(result.link);
        showSuccess("Link copiat");
      }
    } catch {}
  };

  const s = styles(theme);

  if (result) {
    return (
      <View style={[ac.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Membru creat" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={ac.content}>
          <View style={s.resultCard}>
            <Ionicons name="checkmark-circle" size={44} color="#22c55e" style={{ alignSelf: "center" }} />
            <Text style={[s.resultTitle, { color: theme.textPrimary }]}>{result.fullName || result.email}</Text>
            <Text style={[ac.muted, { marginBottom: 12 }]}>
              {result.emailSent
                ? "I-am trimis un email cu link de setare a parolei."
                : result.emailConfigured
                ? "Emailul nu a putut fi trimis acum. Trimite-i tu linkul de mai jos."
                : "Emailul nu e configurat inca. Trimite-i tu linkul de mai jos."}
            </Text>
            <Text style={[s.label, { color: theme.textMuted }]}>Link de setare parola</Text>
            <View style={s.linkBox}>
              <Text style={[s.linkText, { color: theme.textPrimary }]} numberOfLines={3} selectable>
                {result.link}
              </Text>
            </View>
            {Platform.OS === "web" && (
              <TouchableOpacity style={[ac.saveBtn, { marginTop: 12 }]} onPress={copyLink}>
                <Text style={ac.saveBtnText}>Copiaza link</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.secondaryBtn} onPress={() => { setResult(null); setFullName(""); setEmail(""); setPhone(""); setPassword(""); setRole("user"); }}>
              <Text style={[s.secondaryBtnText, { color: ACCENT }]}>Adauga inca unul</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[ac.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Adauga membru" subtitle="Creezi contul; el isi seteaza parola din email" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ac.content}>
        <Text style={[s.label, { color: theme.textMuted }]}>Nume complet</Text>
        {input(fullName, setFullName, { placeholder: "Ex: Andrei Popescu" })}

        <Text style={[s.label, { color: theme.textMuted }]}>Email</Text>
        {input(email, setEmail, { placeholder: "email@exemplu.com", keyboardType: "email-address", autoCapitalize: "none" })}

        <Text style={[s.label, { color: theme.textMuted }]}>Telefon (optional)</Text>
        {input(phone, setPhone, { placeholder: "07xx xxx xxx", keyboardType: "phone-pad" })}

        <Text style={[s.label, { color: theme.textMuted }]}>Rol</Text>
        <RoleDropdown value={role} onSelect={setRole} />

        {needsPassword && (
          <>
            <Text style={[s.label, { color: theme.textMuted, marginTop: 14 }]}>Confirma cu parola ta</Text>
            <Text style={[ac.muted, { textAlign: "left", marginBottom: 6 }]}>Rol elevat — confirma ca nu e din greseala.</Text>
            {input(password, setPassword, { placeholder: "Parola ta", secureTextEntry: true, autoCapitalize: "none" })}
          </>
        )}

        <TouchableOpacity
          style={[ac.saveBtn, { marginTop: 20 }, submitting && ac.saveBtnDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={ac.saveBtnText}>{submitting ? "Se creeaza..." : "Creeaza si invita"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = (theme) => ({
  label: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.textPrimary,
  },
  resultCard: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 20 },
  resultTitle: { fontSize: 18, fontWeight: "800", textAlign: "center", marginTop: 8, marginBottom: 6 },
  linkBox: { backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 12, marginTop: 4 },
  linkText: { fontSize: 13 },
  secondaryBtn: { alignItems: "center", paddingVertical: 14, marginTop: 6 },
  secondaryBtnText: { fontSize: 15, fontWeight: "700" },
});
