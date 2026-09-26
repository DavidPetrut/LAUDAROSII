import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useTheme } from "../../global/context";
import { api } from "../../global/functions";
import { teamRoleLabels } from "../../global/functions/formatters";
import { headerGradient } from "../../public/styles/global";
import { styles } from "./styles";

export const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUser, isSuperAdmin, can } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate("Settings")}
            accessibilityLabel="Setări"
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContainer}
        >
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

          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.adminButton, { backgroundColor: "#7c3aed" }]}
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
    </View>
  );
};
