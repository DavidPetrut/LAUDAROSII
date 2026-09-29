import React, { useState } from "react";
import { Keyboard,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useAuth } from "../../global/context";
import { showError, showSuccess, api } from "../../global/functions";
import { ServerSettingsModal } from "../../global/components";
import { styles } from "./styles";

export const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverModal, setServerModal] = useState(false);
  const [cpOpen, setCpOpen] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const { login, applyAuth } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      showError("Completeaza toate câmpurile");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!email || !cpCurrent || !cpNew) {
      showError("Completeaza toate câmpurile");
      return;
    }
    setCpLoading(true);
    try {
      const res = await api.post("/auth/change-password", {
        email,
        currentPassword: cpCurrent,
        newPassword: cpNew,
      });
      await applyAuth(res);
      setCpOpen(false);
      setCpCurrent("");
      setCpNew("");
      showSuccess("Parola a fost schimbată");
    } catch (error) {
      showError(error.message);
    } finally {
      setCpLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Laudarosii Vertical</Text>
        <Text style={styles.subtitle}>Bine ai venit în echipa!</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplu.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Câmp email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Parola</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            accessibilityLabel="Câmp parola"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Buton autentificare"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Autentificare</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setCpOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Schimbă parola"
        >
          <Text style={styles.linkText}>Schimbă parola</Text>
        </TouchableOpacity>

        <View style={[styles.linkButton, { opacity: 0.4 }]} pointerEvents="none">
          <Text style={styles.linkText}>Nu ai cont? Inregistreaza-te</Text>
        </View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setServerModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Setari server"
        >
          <Text style={[styles.linkText, { fontSize: 12, opacity: 0.6 }]}>
            Setari server
          </Text>
        </TouchableOpacity>
      </View>

      <ServerSettingsModal
        visible={serverModal}
        onClose={() => setServerModal(false)}
      />

      <Modal visible={cpOpen} transparent animationType="fade" onRequestClose={() => setCpOpen(false)}>
        <Pressable style={cpStyles.backdrop} onPress={() => setCpOpen(false)}>
          <Pressable style={cpStyles.card} onPress={() => Keyboard.dismiss()}>
            <Text style={cpStyles.title}>Schimbă parola</Text>
            <Text style={cpStyles.hint}>
              Intră cu parola primită (implicit „Test1234!") și pune-ți una nouă.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplu.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Parola actuală</Text>
            <TextInput
              style={styles.input}
              value={cpCurrent}
              onChangeText={setCpCurrent}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Parola nouă</Text>
            <TextInput
              style={styles.input}
              value={cpNew}
              onChangeText={setCpNew}
              placeholder="minim 6 caractere"
              placeholderTextColor="#64748b"
              secureTextEntry
            />

            <TouchableOpacity style={[styles.button, { marginTop: 18 }]} onPress={handleChangePassword} disabled={cpLoading}>
              {cpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvează parola</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => setCpOpen(false)}>
              <Text style={[styles.linkText, { opacity: 0.7 }]}>Anulează</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const cpStyles = {
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#161a24", borderRadius: 18, padding: 22 },
  title: { color: "#f3f4f6", fontSize: 20, fontWeight: "700", marginBottom: 6 },
  hint: { color: "rgba(229,231,235,0.6)", fontSize: 13, marginBottom: 18, lineHeight: 19 },
};
