import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenHeader, UserAvatar } from "../../../global/components";
import { useTheme } from "../../../global/context";
import { accessApi } from "./accessApi";
import { ac, ROLE_META } from "./appControlStyles";

const FILTER_ROLES = ["superadmin", "admin", "developer", "editor", "user"];

export const AppControlMembers = ({ navigation }) => {
  const { theme } = useTheme();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await accessApi.members({ search: search.trim(), role: roleFilter });
      setMembers(data || []);
    } catch {}
  }, [search, roleFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, roleFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const meta = ROLE_META[item.role] || ROLE_META.user;
    return (
      <TouchableOpacity
        style={[ac.memberRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate("AppControlMemberDetail", { id: item._id })}
        activeOpacity={0.85}
      >
        <UserAvatar profilePicture={item.profilePicture} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={[ac.memberName, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.fullName || "Fara nume"}
          </Text>
          <Text style={ac.memberEmail} numberOfLines={1}>{item.email}</Text>
          {item.isBanned && <Text style={ac.bannedTag}>BLOCAT</Text>}
        </View>
        <View style={[ac.roleBadge, { backgroundColor: meta.color + "22" }]}>
          <Text style={[ac.roleBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[ac.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Membri" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={[ac.searchWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[ac.searchInput, { color: theme.textPrimary }]}
            placeholder="Cauta dupa nume sau email..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={[ac.rolesRow, { marginBottom: 8 }]}>
          <TouchableOpacity
            style={[ac.roleChip, { borderColor: theme.border, backgroundColor: !roleFilter ? "rgba(124,58,237,0.15)" : "transparent" }]}
            onPress={() => setRoleFilter(null)}
          >
            <Text style={[ac.roleChipText, { color: !roleFilter ? "#7c3aed" : theme.textMuted }]}>Toti</Text>
          </TouchableOpacity>
          {FILTER_ROLES.map((r) => {
            const meta = ROLE_META[r];
            const active = roleFilter === r;
            return (
              <TouchableOpacity
                key={r}
                style={[ac.roleChip, { borderColor: meta.color, backgroundColor: active ? meta.color + "22" : "transparent" }]}
                onPress={() => setRoleFilter(active ? null : r)}
              >
                <Text style={[ac.roleChipText, { color: active ? meta.color : theme.textMuted }]}>{meta.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={[ac.muted, { marginTop: 40 }]}>Niciun utilizator gasit.</Text>}
      />
    </View>
  );
};
