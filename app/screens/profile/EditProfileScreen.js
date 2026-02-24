import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../global/context";
import { api, showSuccess, showError } from "../../global/functions";
import { teamRoleLabels } from "../../global/functions/formatters";
import { ScreenHeader } from "../../global/components";
import { editStyles as styles } from "./styles";

export const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.personalData?.fullName || "",
    age: user?.personalData?.age?.toString() || "",
    phone: user?.personalData?.phone || "",
    teamRoles: user?.teamRoles || [],
    favoritePsalm: user?.content?.bible?.favoritePsalm || "",
    favoriteVerse: user?.content?.bible?.favoriteVerse || "",
  });

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

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      showError("Numele este obligatoriu");
      return;
    }

    setLoading(true);
    try {
      const data = {
        fullName: form.fullName,
        age: form.age ? parseInt(form.age) : null,
        phone: form.phone,
        teamRoles: form.teamRoles,
        bible: {
          favoritePsalm: form.favoritePsalm,
          favoriteVerse: form.favoriteVerse,
        },
      };

      const updated = await api.put("/users/me", data);
      updateUser(updated);
      showSuccess("Profil actualizat!");
      navigation.goBack();
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const roleKeys = Object.keys(teamRoleLabels);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Editeaza Profilul" />
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nume complet *</Text>
            <TextInput
              style={styles.input}
              value={form.fullName}
              onChangeText={(v) => updateForm("fullName", v)}
              placeholder="Numele tau"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vârsta</Text>
            <TextInput
              style={styles.input}
              value={form.age}
              onChangeText={(v) => updateForm("age", v)}
              placeholder="25"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(v) => updateForm("phone", v)}
              placeholder="0712345678"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📖 Psalm preferat</Text>
            <TextInput
              style={styles.input}
              value={form.favoritePsalm}
              onChangeText={(v) => updateForm("favoritePsalm", v)}
              placeholder="ex: Psalmul 23"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>✨ Verset preferat</Text>
            <TextInput
              style={styles.input}
              value={form.favoriteVerse}
              onChangeText={(v) => updateForm("favoriteVerse", v)}
              placeholder="ex: Ioan 3:16"
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
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      form.teamRoles.includes(role) &&
                        styles.roleChipTextActive,
                    ]}
                  >
                    {teamRoleLabels[role]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Salveaza</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Anuleaza</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
