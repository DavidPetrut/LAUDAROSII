import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { useAuth } from "../../global/context";
import { showError } from "../../global/functions";
import { teamRoleLabels } from "../../global/functions/formatters";
import { styles } from "./styles";

export const RegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    teamRoles: [],
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleRole = (role) => {
    setForm((prev) => ({
      ...prev,
      teamRoles: prev.teamRoles.includes(role)
        ? prev.teamRoles.filter((r) => r !== role)
        : [...prev.teamRoles, role],
    }));
  };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.fullName) {
      showError("Completeaza toate câmpurile obligatorii");
      return;
    }

    setLoading(true);
    try {
      await register(form);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const roleKeys = Object.keys(teamRoleLabels);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Bine ai venit!</Text>
        <Text style={styles.subtitle}>Creeaza-ți contul în echipa</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nume complet *</Text>
          <TextInput
            style={styles.input}
            value={form.fullName}
            onChangeText={(v) => updateForm("fullName", v)}
            placeholder="Ion Popescu"
            placeholderTextColor="#64748b"
            accessibilityLabel="Câmp nume"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={(v) => updateForm("email", v)}
            placeholder="email@exemplu.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Câmp email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Parola *</Text>
          <TextInput
            style={styles.input}
            value={form.password}
            onChangeText={(v) => updateForm("password", v)}
            placeholder="Minim 6 caractere"
            placeholderTextColor="#64748b"
            secureTextEntry
            accessibilityLabel="Câmp parola"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Roluri în echipa</Text>
          <View style={styles.roleSelector}>
            {roleKeys.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleChip,
                  form.teamRoles.includes(role) && styles.roleChipActive,
                ]}
                onPress={() => toggleRole(role)}
                accessibilityRole="checkbox"
              >
                <Text
                  style={[
                    styles.roleChipText,
                    form.teamRoles.includes(role) && styles.roleChipTextActive,
                  ]}
                >
                  {teamRoleLabels[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Înregistrare</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>Ai deja cont? Autentifica-te</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};
