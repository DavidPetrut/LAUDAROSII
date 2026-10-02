import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../global/components";
import { useToast } from "../../../global/context";
import {
  fetchMyBugs,
  reopenMyBug,
  closeMyBug,
  closeAllMyBugs,
} from "../../../global/testing";
import { myBugsStyles as styles } from "./myBugsStyles";

const bugLabel = (b) =>
  b.problem?.trim() || b.solution?.trim() || `${b.tab} · ${b.screen}`;

/**
 * Bug-urile mele: lista bugurilor raportate de user si marcate "Rezolvat" de dev.
 * Userul confirma inchiderea (stergere definitiva) sau redeschide (revine ca "Esuat").
 */
export const MyBugsScreen = () => {
  const { showSuccess, showError } = useToast();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reopenId, setReopenId] = useState(null);
  const [reopenText, setReopenText] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyBugs();
      setBugs(Array.isArray(data) ? data : []);
    } catch (e) {
      showError("Nu s-au putut încărca bugurile");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const startReopen = (id) => {
    setReopenId(id);
    setReopenText("");
  };

  const cancelReopen = () => {
    setReopenId(null);
    setReopenText("");
    Keyboard.dismiss();
  };

  const sendReopen = async (id) => {
    setBusyId(id);
    try {
      await reopenMyBug(id, reopenText.trim());
      setBugs((prev) => prev.filter((b) => b._id !== id));
      cancelReopen();
      showSuccess("Trimis! Bugul a revenit la dezvoltator.");
    } catch (e) {
      showError("Eroare la trimitere");
    } finally {
      setBusyId(null);
    }
  };

  const confirmClose = (id) => {
    Alert.alert(
      "Închizi bugul?",
      "Va fi șters definitiv și nu va mai apărea aici.",
      [
        { text: "Anulează", style: "cancel" },
        { text: "Închide", style: "destructive", onPress: () => doClose(id) },
      ]
    );
  };

  const doClose = async (id) => {
    setBusyId(id);
    try {
      await closeMyBug(id);
      setBugs((prev) => prev.filter((b) => b._id !== id));
      showSuccess("Bug închis");
    } catch (e) {
      showError("Eroare la închidere");
    } finally {
      setBusyId(null);
    }
  };

  const confirmCloseAll = () => {
    Alert.alert(
      "Închizi toate?",
      `Cele ${bugs.length} buguri rezolvate vor fi șterse definitiv.`,
      [
        { text: "Anulează", style: "cancel" },
        { text: "Închide toate", style: "destructive", onPress: doCloseAll },
      ]
    );
  };

  const doCloseAll = async () => {
    try {
      await closeAllMyBugs();
      setBugs([]);
      showSuccess("Toate bugurile au fost închise");
    } catch (e) {
      showError("Eroare la închiderea tuturor");
    }
  };

  const renderItem = ({ item }) => {
    const open = reopenId === item._id;
    const busy = busyId === item._id;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓ Rezolvat</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {item.tab} · {item.screen}
          </Text>
        </View>

        <Text style={styles.problem}>{bugLabel(item)}</Text>
        {item.resolutionNote ? (
          <Text style={styles.note} numberOfLines={2}>
            {item.resolutionNote}
          </Text>
        ) : null}

        {open ? (
          <View style={styles.reopenBox}>
            <TextInput
              style={styles.input}
              placeholder="Fii cât mai specific: de ce nu merge încă?"
              placeholderTextColor="#9ca3af"
              value={reopenText}
              onChangeText={setReopenText}
              multiline
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={cancelReopen}
                disabled={busy}
              >
                <Text style={styles.btnGhostText}>Renunță</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSend]}
                onPress={() => sendReopen(item._id)}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnSendText}>Trimite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnReopen]}
              onPress={() => startReopen(item._id)}
              disabled={busy}
            >
              <Ionicons name="refresh" size={16} color="#b45309" />
              <Text style={styles.btnReopenText}>Redeschide</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnClose]}
              onPress={() => confirmClose(item._id)}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color="#fff" />
                  <Text style={styles.btnCloseText}>Închide</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Bug-urile mele" />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={bugs}
          keyExtractor={(b) => b._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            bugs.length > 0 ? (
              <>
                <Text style={styles.intro}>
                  Buguri raportate de tine care au fost rezolvate. Confirmă
                  închiderea sau redeschide dacă încă nu merge.
                </Text>
                <TouchableOpacity style={styles.closeAll} onPress={confirmCloseAll}>
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  <Text style={styles.closeAllText}>
                    Închide toate ({bugs.length})
                  </Text>
                </TouchableOpacity>
              </>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="checkmark-circle-outline" size={56} color="#9ca3af" />
              <Text style={styles.emptyText}>Niciun bug rezolvat momentan.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default MyBugsScreen;
