import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { api, showError } from "../../global/functions";
import { useAuth } from "../../global/context";
import { styles } from "./styles";

/**
 * Ecran de setare a parolei dintr-o invitatie (link din email). Verifica tokenul,
 * lasa userul sa-si aleaga parola si il autentifica direct dupa (auto-login).
 */
export const SetPasswordScreen = ({ navigation }) => {
  const { pendingInviteToken, applyAuth, clearPendingInvite } = useAuth();
  const [info, setInfo] = useState(null);
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pendingInviteToken) {
      setInvalid(true);
      setChecking(false);
      return;
    }
    api
      .get(`/auth/invite/${pendingInviteToken}`)
      .then((d) => setInfo(d))
      .catch(() => setInvalid(true))
      .finally(() => setChecking(false));
  }, [pendingInviteToken]);

  const backToLogin = () => {
    clearPendingInvite();
    navigation.replace("Login");
  };

  const submit = async () => {
    if (password.length < 6) return showError("Parola trebuie sa aiba minim 6 caractere");
    if (password !== confirm) return showError("Parolele nu coincid");
    setLoading(true);
    try {
      const res = await api.post(`/auth/invite/${pendingInviteToken}/set-password`, { password });
      await applyAuth(res);
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (invalid) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Invitatie invalida</Text>
          <Text style={styles.subtitle}>Linkul e gresit sau a expirat. Cere o invitatie noua.</Text>
        </View>
        <View style={styles.form}>
          <TouchableOpacity style={styles.linkButton} onPress={backToLogin}>
            <Text style={styles.linkText}>Inapoi la autentificare</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Bine ai venit{info?.fullName ? `, ${info.fullName}` : ""}!</Text>
        <Text style={styles.subtitle}>Setează-ți parola pentru {info?.email}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Parola</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Minim 6 caractere"
            placeholderTextColor="#64748b"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirmă parola</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repetă parola"
            placeholderTextColor="#64748b"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Intră în cont</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={backToLogin}>
          <Text style={styles.linkText}>Anulează</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
