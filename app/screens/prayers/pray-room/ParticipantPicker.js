import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UserAvatar } from "../../../global/components";
import { api } from "../../../global/functions";

// Normalizeaza textul (fara diacritice) pentru cautare fuzzy
const normalize = (str) =>
  (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const ParticipantPicker = ({ selectedIds, onSelectionChange }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/pray-rooms/users/available").then(setUsers).catch(() => {});
  }, []);

  const toggle = (userId) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  // Filtreaza + sorteaza alfabetic
  const filteredUsers = useMemo(() => {
    const q = normalize(search.trim());
    const list = q
      ? users.filter((u) => normalize(u.personalData?.fullName).includes(q))
      : [...users];
    return list.sort((a, b) =>
      (a.personalData?.fullName || "").localeCompare(b.personalData?.fullName || "", "ro")
    );
  }, [users, search]);

  const selectedUsers = users.filter((u) => selectedIds.includes(u._id));

  return (
    <View style={ps.container}>
      <View style={ps.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#888" style={ps.searchIcon} />
        <TextInput
          style={ps.searchInput}
          placeholder="Cauta dupa nume..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Cauta utilizator"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={ps.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        style={ps.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item._id);
          return (
            <TouchableOpacity
              onPress={() => toggle(item._id)}
              style={[ps.row, isSelected && ps.rowSelected]}
              activeOpacity={0.7}
            >
              <UserAvatar
                profilePicture={item.personalData?.profilePicture}
                size={40}
              />
              <Text style={ps.name} numberOfLines={1}>
                {item.personalData?.fullName || "User"}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color="#21c063" />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={ps.empty}>
            {search ? "Niciun rezultat" : "Nu sunt utilizatori disponibili"}
          </Text>
        }
      />

      {selectedUsers.length > 0 && (
        <View style={ps.board}>
          <Text style={ps.boardTitle}>
            Selectati: {selectedUsers.length}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedUsers.map((u) => (
              <View key={u._id} style={ps.boardItem}>
                <UserAvatar
                  profilePicture={u.personalData?.profilePicture}
                  size={44}
                />
                <Text style={ps.boardName} numberOfLines={1}>
                  {u.personalData?.fullName?.split(" ")[0]}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const ps = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 10,
  },
  clearBtn: { padding: 4 },
  list: { flex: 1, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  rowSelected: {
    backgroundColor: "rgba(33,192,99,0.15)",
    borderWidth: 1,
    borderColor: "#21c063",
  },
  name: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "500" },
  empty: { color: "#666", textAlign: "center", marginTop: 40 },
  board: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 12,
  },
  boardTitle: { color: "#21c063", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  boardItem: { alignItems: "center", marginRight: 16, width: 56 },
  boardName: { color: "#fff", fontSize: 11, marginTop: 4, textAlign: "center" },
});
