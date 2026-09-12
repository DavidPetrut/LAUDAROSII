import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../global/context";
import { showError } from "../../global/functions";
import { ServerSettingsModal } from "../../global/components";
import { styles } from "./styles";

export const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverModal, setServerModal] = useState(false);
  const { login } = useAuth();

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

        <View style={[styles.linkButton, { opacity: 0.4 }]} pointerEvents="none">
          <Text style={styles.linkText}>Mi-am uitat parola</Text>
        </View>

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
    </View>
  );
};
