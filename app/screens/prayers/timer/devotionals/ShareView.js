import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { colors } from "../../../../public/styles/global";
import { showSuccess, showError } from "../../../../global/functions";
import { devotionalsApi } from "./devotionalsApi";

/**
 * Cauta un membru dupa nume si trimite-i devotionalul. Cautarea e debounced si
 * expune doar nume/poza (endpoint minimal, fara date sensibile).
 */
export const ShareView = ({ devotional, onDone, onCancel }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  const onChange = (text) => {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await devotionalsApi.searchUsers(text.trim());
        setResults(res.users || []);
      } catch (e) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const send = async (user) => {
    try {
      await devotionalsApi.share(devotional._id, user._id);
      showSuccess(`Trimis către ${user.fullName}`);
      setQuery("");
      setResults([]);
    } catch (e) {
      showError("Nu s-a putut trimite. Încearcă din nou.");
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Distribuie „{devotional.name}”</Text>
        <Text style={styles.introDesc}>Caută un membru după nume și trimite-i devotionalul.</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onChange}
          placeholder="Nume membru"
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
      </View>

      {searching && <ActivityIndicator color="#10b981" style={{ marginTop: 16 }} />}
      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <Text style={styles.helperNote}>Niciun membru găsit.</Text>
      )}

      {results.map((u) => (
        <View key={u._id} style={styles.userRow}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={18} color={colors.textMuted} />
          </View>
          <Text style={styles.userName} numberOfLines={1}>{u.fullName}</Text>
          <TouchableOpacity style={styles.shareAccept} onPress={() => send(u)}>
            <Text style={styles.shareAcceptText}>Trimite</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.skipBtn} onPress={onCancel}>
        <Text style={styles.skipBtnText}>Înapoi</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ShareView;
