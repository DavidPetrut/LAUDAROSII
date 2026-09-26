import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, UserAvatar } from "../../../global/components";
import { useTheme } from "../../../global/context";
import { showError, showSuccess } from "../../../global/functions";
import { accessApi } from "./accessApi";
import { ac, ROLE_META } from "./appControlStyles";

const ASSIGN_ROLES = ["admin", "developer", "editor", "user"];

/**
 * Adauga membru = promoveaza un membru existent la un rol. Userii se inregistreaza
 * singuri; aici doar cauti unul si ii dai rolul (si, dupa, accese din Membri).
 */
export const AppControlAddMember = ({ navigation }) => {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setResults(await accessApi.members({ search: search.trim() }));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const assign = async (role) => {
    const target = selected;
    setSelected(null);
    try {
      await accessApi.changeRole(target._id, role);
      showSuccess(`${target.fullName || "Membru"} → ${ROLE_META[role].label}`);
      navigation.navigate("AppControlMemberDetail", { id: target._id });
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  return (
    <View style={[ac.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Adauga membru" subtitle="Cauta un membru si da-i un rol" onBack={() => navigation.goBack()} />
      <View style={{ padding: 16 }}>
        <View style={[ac.searchWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[ac.searchInput, { color: theme.textPrimary }]}
            placeholder="Nume sau email..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const meta = ROLE_META[item.role] || ROLE_META.user;
          return (
            <TouchableOpacity
              style={[ac.memberRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setSelected(item)}
              activeOpacity={0.85}
            >
              <UserAvatar profilePicture={item.profilePicture} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={[ac.memberName, { color: theme.textPrimary }]} numberOfLines={1}>{item.fullName || "Fara nume"}</Text>
                <Text style={ac.memberEmail} numberOfLines={1}>{item.email}</Text>
              </View>
              <View style={[ac.roleBadge, { backgroundColor: meta.color + "22" }]}>
                <Text style={[ac.roleBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={[ac.muted, { marginTop: 40 }]}>
            {search.trim().length < 2 ? "Scrie cel putin 2 caractere ca sa cauti." : "Niciun membru gasit."}
          </Text>
        }
      />

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={ac.center} onPress={() => setSelected(null)}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 20, width: "100%", maxWidth: 340 }}>
            <Text style={[ac.detailName, { color: theme.textPrimary, fontSize: 17, textAlign: "center" }]}>
              {selected?.fullName || selected?.email}
            </Text>
            <Text style={[ac.muted, { marginVertical: 12 }]}>Alege rolul de asignat</Text>
            <View style={ac.rolesRow}>
              {ASSIGN_ROLES.map((r) => {
                const rm = ROLE_META[r];
                return (
                  <TouchableOpacity
                    key={r}
                    style={[ac.roleChip, { borderColor: rm.color }]}
                    onPress={() => assign(r)}
                  >
                    <View style={[ac.statDot, { backgroundColor: rm.color }]} />
                    <Text style={[ac.roleChipText, { color: theme.textPrimary }]}>{rm.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};
