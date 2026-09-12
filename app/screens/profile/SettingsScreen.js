import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useAuth } from "../../global/context";
import {
  api,
  showConfirm,
  showError,
  showSuccess,
} from "../../global/functions";
import { CONFIG } from "../../global/config";
import { ServerSettingsModal } from "../../global/components";
import { headerGradient } from "../../public/styles/global";
import { settingsStyles } from "./settingsStyles";
import { checkForUpdate, applyUpdate } from "./updateHelper";

const roleLabels = {
  user: "Membru",
  admin: "Administrator",
  superadmin: "Super Admin",
  developer: "Developer",
};

export const SettingsScreen = ({ navigation }) => {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [serverModal, setServerModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.get("/users/me");
      setProfile(data);
      updateUser(data);
    } catch (e) {}
  };

  const handleLogout = () => {
    showConfirm("Deconectare", "Ești sigur ca vrei sa te deconectezi?", logout);
  };

  // Verificare update OTA (doar pe nativ, nu pe web)
  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    const result = await checkForUpdate();
    setUpdateStatus(result);
    setCheckingUpdate(false);
    if (result.available) {
      showSuccess("Update disponibil!");
    } else {
      showSuccess(result.message || "Esti la ultima versiune");
    }
  };

  const handleApplyUpdate = async () => {
    setCheckingUpdate(true);
    await applyUpdate();
  };

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showError("Permisiunea pentru galerie este necesara");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        setUploadingPicture(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;

        await api.put("/users/me", { profilePicture: base64Image });
        await loadProfile();
        showSuccess("Poza a fost actualizata!");
        setUploadingPicture(false);
      }
    } catch (e) {
      setUploadingPicture(false);
      showError("Eroare la încarcarea pozei");
    }
  };

  const userData = profile || user;
  const fullName =
    userData?.personalData?.fullName || userData?.fullName || "Membru";
  const profilePicture = userData?.personalData?.profilePicture;

  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    surface: { backgroundColor: theme.surface },
    text: { color: theme.textPrimary },
    textMuted: { color: theme.textMuted },
  };

  return (
    <View style={[settingsStyles.container, dynamicStyles.container]}>
      <LinearGradient
        colors={headerGradient.colors}
        start={headerGradient.start}
        end={headerGradient.end}
        style={settingsStyles.header}
      >
        <TouchableOpacity
          style={settingsStyles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={settingsStyles.headerTitle}>SETĂRI</Text>
        <View style={settingsStyles.placeholder} />
      </LinearGradient>

      <ScrollView style={settingsStyles.content}>
        <View style={[settingsStyles.profileCard, dynamicStyles.surface]}>
          <TouchableOpacity
            style={settingsStyles.avatarWrapper}
            onPress={handlePickImage}
            disabled={uploadingPicture}
          >
            <View style={settingsStyles.avatarContainer}>
              {uploadingPicture ? (
                <ActivityIndicator color="#10b981" size="large" />
              ) : profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={settingsStyles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={40} color="#10b981" />
              )}
            </View>
            <View style={settingsStyles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={settingsStyles.profileInfo}>
            <Text style={[settingsStyles.profileName, dynamicStyles.text]}>
              {fullName}
            </Text>
            <Text
              style={[settingsStyles.profileEmail, dynamicStyles.textMuted]}
            >
              {userData?.email}
            </Text>
            <View style={settingsStyles.roleBadge}>
              <Text style={settingsStyles.roleText}>
                {roleLabels[userData?.role] || "Membru"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[settingsStyles.section, dynamicStyles.surface]}>
          <Text style={[settingsStyles.sectionTitle, dynamicStyles.textMuted]}>
            Cont
          </Text>

          <TouchableOpacity
            style={settingsStyles.settingRow}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <View style={settingsStyles.settingInfo}>
              <Text style={settingsStyles.settingIcon}>✏️</Text>
              <View style={settingsStyles.settingText}>
                <Text style={[settingsStyles.settingLabel, dynamicStyles.text]}>
                  Editează Profilul
                </Text>
                <Text
                  style={[settingsStyles.settingDesc, dynamicStyles.textMuted]}
                >
                  Modifică datele tale personale
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textMuted}
            />
          </TouchableOpacity>

          <View style={settingsStyles.divider} />

          <TouchableOpacity style={settingsStyles.settingRow}>
            <View style={settingsStyles.settingInfo}>
              <Text style={settingsStyles.settingIcon}>📋</Text>
              <View style={settingsStyles.settingText}>
                <Text style={[settingsStyles.settingLabel, dynamicStyles.text]}>
                  Informații Personale
                </Text>
                <Text
                  style={[settingsStyles.settingDesc, dynamicStyles.textMuted]}
                >
                  Email, telefon, vârstă
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={[settingsStyles.section, dynamicStyles.surface]}>
          <Text style={[settingsStyles.sectionTitle, dynamicStyles.textMuted]}>
            Aspect
          </Text>

          <View style={settingsStyles.settingRow}>
            <View style={settingsStyles.settingInfo}>
              <Text style={settingsStyles.settingIcon}>
                {isDarkMode ? "🌙" : "☀️"}
              </Text>
              <View style={settingsStyles.settingText}>
                <Text style={[settingsStyles.settingLabel, dynamicStyles.text]}>
                  {isDarkMode ? "Dark Mode" : "Light Mode"}
                </Text>
                <Text
                  style={[settingsStyles.settingDesc, dynamicStyles.textMuted]}
                >
                  {isDarkMode
                    ? "Tema întunecată activată"
                    : "Tema luminoasă activată"}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: "#e2e8f0", true: "#1f1f1f" }}
              thumbColor={isDarkMode ? "#10b981" : "#ffffff"}
              ios_backgroundColor="#e2e8f0"
            />
          </View>
        </View>

        <View style={[settingsStyles.section, dynamicStyles.surface]}>
          <Text style={[settingsStyles.sectionTitle, dynamicStyles.textMuted]}>
            Aplicatie
          </Text>

          <View style={settingsStyles.settingRow}>
            <View style={settingsStyles.settingInfo}>
              <Text style={settingsStyles.settingIcon}>📱</Text>
              <View style={settingsStyles.settingText}>
                <Text style={[settingsStyles.settingLabel, dynamicStyles.text]}>
                  Versiune
                </Text>
                <Text style={[settingsStyles.settingDesc, dynamicStyles.textMuted]}>
                  v{CONFIG.VERSION}
                </Text>
              </View>
            </View>
          </View>

          <View style={settingsStyles.divider} />
          <TouchableOpacity
            style={settingsStyles.settingRow}
            onPress={() => setServerModal(true)}
          >
            <View style={settingsStyles.settingInfo}>
              <Text style={settingsStyles.settingIcon}>🌐</Text>
              <View style={settingsStyles.settingText}>
                <Text style={[settingsStyles.settingLabel, dynamicStyles.text]}>
                  Adresa serverului
                </Text>
                <Text
                  style={[settingsStyles.settingDesc, dynamicStyles.textMuted]}
                  numberOfLines={1}
                >
                  {CONFIG.SERVER_BASE}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textMuted}
            />
          </TouchableOpacity>

          {Platform.OS !== "web" && (
            <>
              <View style={settingsStyles.divider} />
              <TouchableOpacity
                style={settingsStyles.settingRow}
                onPress={updateStatus?.available ? handleApplyUpdate : handleCheckUpdate}
                disabled={checkingUpdate}
              >
                <View style={settingsStyles.settingInfo}>
                  <Text style={settingsStyles.settingIcon}>
                    {checkingUpdate ? "⏳" : updateStatus?.available ? "⬆️" : "🔄"}
                  </Text>
                  <View style={settingsStyles.settingText}>
                    <Text style={[settingsStyles.settingLabel, dynamicStyles.text]}>
                      {checkingUpdate
                        ? "Se verifica..."
                        : updateStatus?.available
                        ? "Instaleaza update"
                        : "Verifica update"}
                    </Text>
                    <Text style={[settingsStyles.settingDesc, dynamicStyles.textMuted]}>
                      {updateStatus?.available
                        ? "O noua versiune este disponibila"
                        : "Verifica daca exista actualizari"}
                    </Text>
                  </View>
                </View>
                {checkingUpdate ? (
                  <ActivityIndicator size="small" color={theme.textMuted} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[settingsStyles.section, dynamicStyles.surface]}>
          <TouchableOpacity
            style={settingsStyles.logoutRow}
            onPress={handleLogout}
          >
            <View style={settingsStyles.settingInfo}>
              <Text style={settingsStyles.settingIcon}>🚪</Text>
              <View style={settingsStyles.settingText}>
                <Text style={settingsStyles.logoutLabel}>Deconectare</Text>
                <Text style={settingsStyles.logoutDesc}>Ieși din cont</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ServerSettingsModal
        visible={serverModal}
        onClose={() => setServerModal(false)}
      />
    </View>
  );
};
