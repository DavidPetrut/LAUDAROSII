import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { broadcastStyles as styles } from "./broadcastStyles";
import { colors } from "../../../public/styles/global";
import { broadcastApi } from "./broadcastApi";

/**
 * Gestionarea audientei: creezi/stergi statusuri (etichete) si le atribui membrilor.
 */
export const AudienceView = () => {
  const [catalog, setCatalog] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const debounce = useRef(null);

  const loadTags = useCallback(async () => {
    try {
      const res = await broadcastApi.listTags();
      setCatalog(res.tags || []);
    } catch (e) {}
  }, []);

  useEffect(() => { loadTags(); }, [loadTags]);

  const search = (text) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await broadcastApi.searchUsers(text);
        setUsers(res.users || []);
      } catch (e) { setUsers([]); }
    }, 300);
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      await broadcastApi.createTag(newTag.trim());
      setNewTag("");
      loadTags();
    } catch (e) {}
  };

  const deleteTag = async (id) => {
    try { await broadcastApi.deleteTag(id); loadTags(); } catch (e) {}
  };

  const openUser = (u) => {
    setSelected(u);
    setSelectedTags(u.tags || []);
  };

  const toggleTag = (name) =>
    setSelectedTags((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));

  const saveUser = async () => {
    try {
      const res = await broadcastApi.setUserTags(selected._id, selectedTags);
      setUsers((prev) => prev.map((u) => (u._id === selected._id ? res.user : u)));
      setSelected(null);
    } catch (e) {}
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Statusuri</Text>
      <View style={styles.chipsRow}>
        {catalog.map((t) => (
          <View key={t._id} style={[styles.chip, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
            <Text style={styles.chipText}>{t.name}</Text>
            <TouchableOpacity style={styles.tagDelete} onPress={() => deleteTag(t._id)}>
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.addTagRow}>
        <TextInput style={[styles.input, { flex: 1 }]} value={newTag} onChangeText={setNewTag} placeholder="Status nou (ex: echipa media)" placeholderTextColor={colors.textMuted} maxLength={40} />
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 0, paddingHorizontal: 20 }]} onPress={addTag}>
          <Text style={styles.primaryBtnText}>Adaugă</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Atribuie membrilor</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput style={styles.searchInput} value={query} onChangeText={search} placeholder="Caută membru după nume" placeholderTextColor={colors.textMuted} />
      </View>

      {users.map((u) => (
        <TouchableOpacity key={u._id} style={styles.userRow} onPress={() => openUser(u)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{u.fullName}</Text>
            <Text style={styles.userTags}>{u.tags?.length ? u.tags.join(", ") : "fără status"}</Text>
          </View>
          <Ionicons name="pricetags-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      ))}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{selected?.fullName}</Text>
            {catalog.length === 0 && <Text style={styles.emptyText}>Creează întâi un status.</Text>}
            <View style={styles.chipsRow}>
              {catalog.map((t) => (
                <TouchableOpacity key={t._id} style={[styles.chip, selectedTags.includes(t.name) && styles.chipActive]} onPress={() => toggleTag(t.name)}>
                  <Text style={[styles.chipText, selectedTags.includes(t.name) && styles.chipTextActive]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={saveUser}>
              <Text style={styles.primaryBtnText}>Salvează</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

export default AudienceView;
