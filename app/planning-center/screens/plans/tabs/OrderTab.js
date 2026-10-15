/** ORDER tab — ordinea serviciului. Play/Print/Live + secțiuni + itemi + Add (Item/Header/Song/Media). */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export function OrderTab({ planId, navigation, head, tabsBar }) {
  const { me } = usePc();
  const insets = useSafeAreaInsets();
  const bottomSafe = insets.bottom > 0 ? insets.bottom : 10; // nu lăsa FAB-ul/lista sub bara nativă (Samsung)
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

  const renderRow = (item) => {
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
          // Default: FĂRĂ fundal special (curat, ca în PCO). Dacă itemul are o culoare,
          // o arătăm doar ca accent subtil pe margine stângă — nu umplem rândul.
          item.rowColor ? { borderLeftWidth: 3, borderLeftColor: item.rowColor } : null,
        ]}
        onPress={() => openItem(item)}
      >
        <Text style={styles.len}>{item.lengthLabel}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
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

  // Scroll UNIC (ca în PCO): la început titlul+data stau DEASUPRA barei de tab-uri; când scrollezi
  // în jos, titlul se ridică, iar bara „ORDER/TEAMS/…" se LIPEȘTE sub header-ul „Plan" (sticky).
  // Scroll înapoi sus → totul revine la aranjarea inițială.
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>{head}</View>
        <View style={styles.stickyTabs}>{tabsBar}</View>
        <View>
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
        </View>
        {loading ? (
          <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No items for this plan yet</Text>
            {canEdit && <PcButton title="Add your first item" onPress={() => setAddOpen(true)} style={{ marginTop: 14, paddingHorizontal: 24 }} />}
          </View>
        ) : (
          items.map((it, i) => <React.Fragment key={String(it.id || i)}>{renderRow(it)}</React.Fragment>)
        )}
      </ScrollView>

      {canEdit && items.length > 0 && (
        <Pressable style={[styles.fab, { bottom: bottomSafe + 16 }]} onPress={() => setAddOpen(true)}>
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
  // Bara de tab-uri sticky are nevoie de fundal opac ca să nu se vadă conținutul pe sub ea la scroll.
  stickyTabs: { backgroundColor: pcColors.bg },
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
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flexShrink: 1, lineHeight: 22 },
  // Pastilă verde de cheie (ex. „Gb", „C#m") — ca în PCO, lățime automată.
  keyBadge: { backgroundColor: pcColors.primary, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 3, minWidth: 34, alignItems: "center", justifyContent: "center", marginTop: 1 },
  keyTxt: { color: "#0A0A0A", fontSize: 13, fontWeight: "800" },
  desc: { color: pcColors.textSecondary, fontSize: 13.5, marginTop: 3, lineHeight: 19 },
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
