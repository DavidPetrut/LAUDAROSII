import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, ImageBackground, ActivityIndicator, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { useAuth } from "../../../../global/context";
import { showError, showSuccess } from "../../../../global/functions";
import { DevotionalIcon } from "./DevotionalIcon";
import { resolveImage } from "./devotionalImages";
import { templatesApi } from "./templatesApi";

/**
 * Rasfoirea template-urilor: bannere mari (ca la filme) cu filtru dupa nume.
 * Tap pe un template -> import. Cei cu grant pot sterge (apasare lunga).
 */
export const TemplatesView = ({ onImport }) => {
  const { can } = useAuth();
  const canManage = can("templates.manage", "edit");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await templatesApi.list(q.trim());
      setItems(res.templates || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q]);

  const del = async (item) => {
    setMenu(null);
    try {
      await templatesApi.remove(item._id);
      setItems((prev) => prev.filter((t) => t._id !== item._id));
      showSuccess("Template sters");
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cauta template dupa nume..."
          placeholderTextColor="rgba(229,231,235,0.4)"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#10b981" style={{ marginTop: 30 }} />
      ) : items.length === 0 ? (
        <Text style={[styles.helperNote, { textAlign: "center", marginTop: 30 }]}>
          {q ? "Niciun template gasit." : "Nu exista template-uri inca."}
        </Text>
      ) : (
        items.map((t) => {
          const src = resolveImage(t.image);
          return (
            <TouchableOpacity
              key={t._id}
              style={[styles.devImageCard, { height: 150 }]}
              onPress={() => onImport(t._id)}
              onLongPress={() => canManage && setMenu(t)}
              delayLongPress={280}
              activeOpacity={0.9}
            >
              {src ? (
                <ImageBackground source={src} style={styles.devImageBg} imageStyle={styles.headerImageRadius}>
                  <View style={styles.devImageBar}>
                    <Text style={styles.devImageName} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.devImageMeta}>{t.tasksCount} momente · {t.createdByName || "Anonim"}</Text>
                  </View>
                </ImageBackground>
              ) : (
                <View style={[styles.devImageBg, { backgroundColor: (t.color || "#10b981") + "22", justifyContent: "center", alignItems: "center" }]}>
                  <DevotionalIcon set={t.iconSet} name={t.icon} size={40} color={t.color || "#10b981"} />
                  <View style={styles.devImageBar}>
                    <Text style={styles.devImageName} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.devImageMeta}>{t.tasksCount} momente · {t.createdByName || "Anonim"}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}

      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuHeader} numberOfLines={1}>{menu?.name}</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => del(menu)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: "#ef4444" }]}>Sterge template-ul</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

export default TemplatesView;
