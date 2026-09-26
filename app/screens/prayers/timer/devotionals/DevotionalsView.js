import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalCard } from "./DevotionalCard";
import { devotionalsApi } from "./devotionalsApi";
import { WD_ORDER, WD_LABELS } from "./weekdays";

const FULL_DAY = { 1: "Duminica", 2: "Luni", 3: "Marti", 4: "Miercuri", 5: "Joi", 6: "Vineri", 7: "Sambata" };

/**
 * Lista devotionalelor userului: creare, activare (default), editare, share,
 * stergere si acceptarea devotionalelor primite de la alti useri.
 */
export const DevotionalsView = ({ onCreate, onChooseTemplate, onEdit, onShare, onChanged }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [shares, setShares] = useState([]);
  const [menu, setMenu] = useState(null);
  const [newMenu, setNewMenu] = useState(false);
  const [dayPicker, setDayPicker] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, inc] = await Promise.all([
        devotionalsApi.list(),
        devotionalsApi.incomingShares().catch(() => ({ shares: [] })),
      ]);
      setItems(list.devotionals || []);
      setShares(inc.shares || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const makeDefault = async (item) => {
    setMenu(null);
    try {
      await devotionalsApi.setDefault(item._id);
      await load();
      onChanged?.();
    } catch (e) {}
  };

  const del = async (item) => {
    setMenu(null);
    try {
      await devotionalsApi.remove(item._id);
      setItems((prev) => prev.filter((d) => d._id !== item._id));
      onChanged?.();
    } catch (e) {}
  };

  const doAssign = async (wd, devotionalId) => {
    setDayPicker(null);
    try {
      const res = await devotionalsApi.assignDay(wd, devotionalId);
      setItems(res.devotionals || []);
      onChanged?.();
    } catch (e) {}
  };

  const acceptShare = async (s) => {
    try {
      await devotionalsApi.acceptShare(s._id);
      await load();
      onChanged?.();
    } catch (e) {}
  };

  const declineShare = async (s) => {
    try {
      await devotionalsApi.declineShare(s._id);
      setShares((prev) => prev.filter((x) => x._id !== s._id));
    } catch (e) {}
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {shares.length > 0 && (
          <>
            <Text style={styles.stepLabel}>Primite ({shares.length})</Text>
            {shares.map((s) => (
              <View key={s._id} style={styles.shareRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.devCardName} numberOfLines={1}>{s.snapshot?.name}</Text>
                  <Text style={styles.devCardMeta}>de la {s.fromUserName} · {s.snapshot?.tasks?.length || 0} momente</Text>
                </View>
                <TouchableOpacity style={styles.shareAccept} onPress={() => acceptShare(s)}>
                  <Text style={styles.shareAcceptText}>Acceptă</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareDecline} onPress={() => declineShare(s)}>
                  <Ionicons name="close" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <View style={styles.listHeaderRow}>
          <Text style={styles.stepLabel}>Devotionalele mele</Text>
          <TouchableOpacity style={styles.newBtn} onPress={() => setNewMenu(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.newBtnText}>Nou</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyPersonal}>
            <Text style={styles.introDesc}>
              Nu ai încă niciun devotional. Creează unul ca să-ți structurezi timpul cu Dumnezeu.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <DevotionalCard
              key={item._id}
              item={item}
              onPress={() => onEdit(item)}
              onLongPress={() => setMenu(item)}
            />
          ))
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={[styles.daysDock, { paddingBottom: insets.bottom + 90 }]}>
          <Text style={[styles.stepLabel, { marginTop: 0 }]}>Program pe zile (1 devotional / zi)</Text>
          <View style={styles.daysProgramRow}>
            {WD_ORDER.map((wd) => {
              const assigned = items.find((d) => (d.schedule?.weekdays || []).includes(wd));
              return (
                <TouchableOpacity
                  key={wd}
                  style={[styles.dayProgramChip, assigned && styles.dayProgramChipActive]}
                  onPress={() => setDayPicker(wd)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayProgramLabel, assigned && { color: "#fff" }]}>{WD_LABELS[wd]}</Text>
                  {assigned ? (
                    <View style={[styles.dayDot, { backgroundColor: assigned.color || "#10b981" }]} />
                  ) : (
                    <Text style={styles.dayProgramEmpty}>–</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <Modal visible={newMenu} transparent animationType="fade" onRequestClose={() => setNewMenu(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setNewMenu(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setNewMenu(false); onCreate(); }}>
              <Ionicons name="create-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuItemText}>Creeaza nou</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setNewMenu(false); onChooseTemplate(); }}>
              <Ionicons name="albums-outline" size={20} color="#10b981" />
              <Text style={styles.menuItemText}>Alege template</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={dayPicker !== null} transparent animationType="fade" onRequestClose={() => setDayPicker(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setDayPicker(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuHeader}>Devotional pentru {dayPicker !== null ? FULL_DAY[dayPicker] : ""}</Text>
            {items.map((d) => {
              const active = (d.schedule?.weekdays || []).includes(dayPicker);
              return (
                <TouchableOpacity key={d._id} style={styles.menuItem} onPress={() => doAssign(dayPicker, d._id)}>
                  <View style={[styles.dayDot, { backgroundColor: d.color || "#10b981" }]} />
                  <Text style={styles.menuItemText} numberOfLines={1}>{d.name}</Text>
                  {active && <Ionicons name="checkmark" size={18} color="#10b981" />}
                </TouchableOpacity>
              );
            })}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => doAssign(dayPicker, null)}>
              <Ionicons name="close-circle-outline" size={20} color="#94a3b8" />
              <Text style={styles.menuItemText}>Niciunul</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuHeader} numberOfLines={1}>{menu?.name}</Text>
            {!menu?.isDefault && (
              <TouchableOpacity style={styles.menuItem} onPress={() => makeDefault(menu)}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#e5e7eb" />
                <Text style={styles.menuItemText}>Activează (default)</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(null); onEdit(menu); }}>
              <Ionicons name="create-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuItemText}>Editează</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(null); onShare(menu); }}>
              <Ionicons name="share-social-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuItemText}>Distribuie unui membru</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => del(menu)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: "#ef4444" }]}>Șterge</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default DevotionalsView;
