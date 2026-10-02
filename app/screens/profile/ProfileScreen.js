import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useTheme, useToast } from "../../global/context";
import { TutorialsLauncher } from "../../global/tutorial";
import { api } from "../../global/functions";
import { teamRoleLabels } from "../../global/functions/formatters";
import { headerGradient } from "../../public/styles/global";
import { refreshNow } from "./updateHelper";
import { styles } from "./styles";

export const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUser, isSuperAdmin, can } = useAuth();
  const { theme } = useTheme();
  const { showSuccess, showError } = useToast();
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [otaBusy, setOtaBusy] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  // Refresh OTA intr-un pas: daca exista update, reporneste singur cu noul bundle.
  const handleOtaRefresh = async () => {
    if (otaBusy) return;
    setOtaBusy(true);
    try {
      const res = await refreshNow();
      if (!res.reloaded) {
        showSuccess(res.message || "Ești deja la zi");
        setOtaBusy(false);
      }
    } catch (e) {
      showError("Nu s-a putut face refresh. Încearcă din nou.");
      setOtaBusy(false);
    }
  };

  const userData = profile || user;

  return (
    <View style={styles.screenBg}>
      <View style={styles.container}>
        <LinearGradient
          colors={headerGradient.colors}
          start={headerGradient.start}
          end={headerGradient.end}
          style={[styles.gradientHeader, { paddingTop: insets.top + 12 }]}
        >
          <Text style={styles.headerTitle}>PROFILE</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={handleOtaRefresh}
              disabled={otaBusy}
              accessibilityLabel="Refresh aplicație"
            >
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate("Settings")}
              accessibilityLabel="Setări"
            >
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContainer}
        >
          <TouchableOpacity
            style={styles.myBugsButton}
            onPress={() => navigation.navigate("MyBugs")}
            activeOpacity={0.9}
          >
            <Ionicons name="bug" size={22} color="#fff" />
            <Text style={styles.myBugsButtonText}>Bug-urile mele</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              Roluri în echipă
            </Text>

            {userData?.teamRoles?.length > 0 ? (
              <View style={styles.teamRoles}>
                {userData.teamRoles.map((role) => (
                  <View key={role} style={styles.teamRoleChip}>
                    <Text style={styles.teamRoleText}>
                      {teamRoleLabels[role] || role}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Niciun rol asignat
              </Text>
            )}
          </View>

          <TutorialsLauncher style={{ marginTop: 4 }} />

          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.adminButton, { backgroundColor: "#7c3aed", marginTop: 12 }]}
              onPress={() => navigation.navigate("AppControl")}
            >
              <Ionicons name="options" size={24} color="#fff" />
              <Text style={styles.adminButtonText}>App Control</Text>
            </TouchableOpacity>
          )}

          {can("screen.admin_panel", "view") && (
            <TouchableOpacity
              style={[styles.adminButton, { marginTop: 12 }]}
              onPress={() => navigation.navigate("Admin")}
            >
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
              <Text style={styles.adminButtonText}>Panel Admin</Text>
            </TouchableOpacity>
          )}

          {can("broadcasts.manage", "edit") && (
            <TouchableOpacity
              style={[styles.adminButton, { backgroundColor: "#0ea5e9", marginTop: 12 }]}
              onPress={() => navigation.navigate("Broadcast")}
            >
              <Ionicons name="megaphone" size={24} color="#fff" />
              <Text style={styles.adminButtonText}>Notificări broadcast</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {otaBusy && (
        <View style={styles.otaOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.otaText}>Se face refresh…</Text>
          <Text style={styles.otaSubtext}>
            Aducem ultimele schimbări. Durează câteva secunde.
          </Text>
        </View>
      )}
    </View>
  );
};
