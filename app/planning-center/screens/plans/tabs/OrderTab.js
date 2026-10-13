/** ORDER tab — ordinea serviciului. Play/Print/Live + secțiuni + itemi + Add (Item/Header/Song/Media). */
import React, { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { showError, showInfo } from "../../../../global/functions";
import { pcApi } from "../../../api/pcApi";
import { pcColors, hexToRgba } from "../../../theme";
import { PcButton, PcAvatar, PcBottomSheet } from "../../../components";
import { usePc } from "../../../navigation/PcContext";

const ADD_TYPES = [
  { key: "item", label: "Item", icon: "ellipse-outline", short: "i" },
  { key: "header", label: "Header", icon: "remove-outline", short: "h" },
  { key: "song", label: "Song", icon: "musical-notes-outline", short: "s" },
  { key: "media", label: "Media", icon: "videocam-outline", short: "m" },
];

export function OrderTab({ planId, navigation }) {
  const { me } = usePc();
  const canEdit = !!me?.capabilities?.editOrder;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await pcApi.plans.order(planId)).items || []); }
    catch (e) { showError(e?.message || "Eroare la ordine."); }
    finally { setLoading(false); }
  }, [planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addType = async (type) => {
    setAddOpen(false);
    if (type === "song") { navigation.navigate("PcSelectSong", { planId }); return; }
    try {
      const res = await pcApi.plans.addItem(planId, { type });
      await load();
      if (type !== "header") navigation.navigate("PcItemDetail", { planId, itemId: res.id });
    } catch (e) { showError(e?.message || "Nu s-a putut adăuga."); }
  };

  const openItem = (item) => navigation.navigate("PcItemDetail", { planId, itemId: item.id });

  const renderItem = ({ item }) => {
    if (item.type === "header") {
      return (
        <Pressable style={styles.sectionBar} onPress={() => openItem(item)} disabled={!canEdit}>
          <Text style={styles.sectionTxt}>{item.title}</Text>
        </Pressable>
      );
    }
    return (
      <Pressable
        style={[
          styles.row,
          item.rowColor ? { backgroundColor: hexToRgba(item.rowColor, 0.16), borderLeftWidth: 3, borderLeftColor: item.rowColor } : null,
        ]}
        onPress={() => openItem(item)}
      >
        <Text style={styles.len}>{item.lengthLabel}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            {!!item.keyName && <View style={styles.keyBadge}><Text style={styles.keyTxt}>{item.keyName}</Text></View>}
          </View>
          {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
        </View>
        {(item.leaders || []).slice(0, 3).map((l, i) =>
          l.needed ? (
            <View key={i} style={styles.neededDot}><Text style={styles.neededNum}>1</Text></View>
          ) : (
            <View key={i} style={{ marginLeft: i ? -10 : 0 }}><PcAvatar uri={l.avatar} initials={l.initials} size={30} /></View>
          )
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.actions}>
        <PcButton title="Play" variant="outline" icon="play-circle-outline" onPress={() => showInfo("Media player — în curând")} style={styles.actBtn} textStyle={styles.actTxt} />
        <PcButton title="Print" variant="outline" icon="print-outline" onPress={() => showInfo("Print report — în curând")} style={styles.actBtn} textStyle={styles.actTxt} />
        <PcButton title="Live" variant="outline" icon="radio-outline" onPress={() => showInfo("Services LIVE — în curând")} style={styles.actBtn} textStyle={styles.actTxt} />
      </View>
      <View style={styles.colHeader}>
        <Text style={styles.colLen}>Length</Text>
        <Text style={styles.colTitle}>TITLE</Text>
        <Ionicons name="reorder-three" size={22} color={pcColors.textMuted} />
      </View>
      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>No items for this plan yet</Text>
          {canEdit && <PcButton title="Add your first item" onPress={() => setAddOpen(true)} style={{ marginTop: 14, paddingHorizontal: 24 }} />}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, i) => String(it.id || i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 90 }}
        />
      )}

      {canEdit && items.length > 0 && (
        <Pressable style={styles.fab} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={30} color="#0A0A0A" />
        </Pressable>
      )}

      <PcBottomSheet visible={addOpen} onClose={() => setAddOpen(false)} maxHeightPct={0.55}>
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          <Text style={styles.addTitle}>Drag or click</Text>
          {ADD_TYPES.map((t) => (
            <Pressable key={t.key} style={styles.addRow} onPress={() => addType(t.key)}>
              <Ionicons name={t.icon} size={22} color={pcColors.textPrimary} />
              <Text style={styles.addLabel}>{t.label}</Text>
              <View style={styles.shortKey}><Text style={styles.shortTxt}>{t.short}</Text></View>
            </Pressable>
          ))}
          <Pressable style={styles.importRow} onPress={() => { setAddOpen(false); showInfo("Import template — în curând"); }}>
            <Text style={styles.importTxt}>Import template</Text>
          </Pressable>
        </View>
      </PcBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  actBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 8 },
  actTxt: { fontSize: 14 },
  colHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#1A1A1C", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: pcColors.divider },
  colLen: { color: pcColors.primary, fontWeight: "700", width: 72 },
  colTitle: { color: pcColors.textSecondary, fontWeight: "700", flex: 1, letterSpacing: 0.5 },
  sectionBar: { backgroundColor: "#1A1A1C", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 2, borderTopColor: pcColors.primary },
  sectionTxt: { color: pcColors.textMuted, fontWeight: "700", letterSpacing: 0.5, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  len: { color: pcColors.textSecondary, width: 60, fontSize: 15 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flexShrink: 1 },
  keyBadge: { backgroundColor: pcColors.primary, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  keyTxt: { color: "#0A0A0A", fontSize: 12, fontWeight: "800" },
  desc: { color: pcColors.textSecondary, fontSize: 14, marginTop: 4, lineHeight: 19 },
  neededDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: pcColors.orange, alignItems: "center", justifyContent: "center" },
  neededNum: { color: "#0A0A0A", fontWeight: "800", fontSize: 12 },
  emptyWrap: { alignItems: "center", marginTop: 50 },
  empty: { color: pcColors.textMuted, fontSize: 16 },
  fab: { position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center", elevation: 6 },
  addTitle: { color: pcColors.textMuted, fontSize: 13, fontWeight: "700", textAlign: "center", paddingVertical: 8 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 12 },
  addLabel: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600", flex: 1 },
  shortKey: { width: 24, height: 24, borderRadius: 5, backgroundColor: "#2A2A2C", alignItems: "center", justifyContent: "center" },
  shortTxt: { color: pcColors.textMuted, fontWeight: "700", fontSize: 12 },
  importRow: { marginTop: 6, marginHorizontal: 12, borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  importTxt: { color: pcColors.textPrimary, fontWeight: "600" },
});

export default OrderTab;
