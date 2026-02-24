import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { api, showError, showSuccess } from "../../global/functions";
import { useAuth } from "../../global/context";
import { ScreenHeader, UserAvatar } from "../../global/components";
import { styles } from "./styles";
import { colors } from "../../public/styles/global";

const roleLabels = {
  user: "Membru",
  admin: "Admin",
  superadmin: "Super",
  developer: "Dev",
};

export const AdminScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const data = await api.get("/users");
      setUsers(data);
    } catch (e) {
      showError("Nu am putut încarca utilizatorii");
    } finally {
      setLoading(false);
    }
  };

  const seedPrayerPrograms = async () => {
    try {
      const result = await api.post("/prayer-programs/seed");
      showSuccess(result.message || "Programe create!");
    } catch (e) {
      showError("Eroare la creare programe");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "superadmin":
        return { backgroundColor: colors.error + "20", color: colors.error };
      case "admin":
      case "developer":
        return {
          backgroundColor: colors.success + "20",
          color: colors.success,
        };
      default:
        return { backgroundColor: colors.info + "20", color: colors.info };
    }
  };

  const renderUser = ({ item }) => {
    const badgeStyle = getRoleBadgeStyle(item.role);
    return (
      <View style={styles.userCard}>
        <UserAvatar
          profilePicture={item.personalData?.profilePicture}
          size={44}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.personalData?.fullName || "Fara nume"}
          </Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: badgeStyle.backgroundColor },
          ]}
        >
          <Text style={[styles.roleText, { color: badgeStyle.color }]}>
            {roleLabels[item.role]}
          </Text>
        </View>
      </View>
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Admin" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔒</Text>
          <Text style={styles.emptyText}>Acces restricționat</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="⚙️ Admin Panel" />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Utilizatori</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {
              users.filter((u) => u.role === "admin" || u.role === "superadmin")
                .length
            }
          </Text>
          <Text style={styles.statLabel}>Admini</Text>
        </View>
      </View>

      {isSuperAdmin && (
        <TouchableOpacity style={styles.seedBtn} onPress={seedPrayerPrograms}>
          <Text style={styles.seedBtnText}>🙏 Seed Programe Rugaciune</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>👥 Toți utilizatorii</Text>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>Niciun utilizator</Text>
            </View>
          )
        }
      />
    </View>
  );
};
