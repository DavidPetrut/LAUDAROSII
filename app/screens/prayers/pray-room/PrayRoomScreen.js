import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenHeader, TiledBackground } from "../../../global/components";
import { api, showError, showSuccess } from "../../../global/functions";
import { useAuth, useTheme } from "../../../global/context";
import { usePrayRoomSocket } from "./prayRoomSocket";
import { PrayRoomCard } from "./PrayRoomCard";
import { PrayRoulette } from "./PrayRoulette";
import { AddPrayerMenu } from "./AddPrayerMenu";
import { ExistingPrayerPicker } from "./ExistingPrayerPicker";
import { PrayerFormModal } from "../lists/PrayerFormModal";
import { prayRoomStyles as styles } from "./styles";

const BG_LIGHT = require("../../../public/images/day-light-mode-background.png");
const BG_DARK = require("../../../public/images/dark-mode-small.png");

const TYPE_LABELS = {
  common: "Motive Comune",
  targeted: "Motive de Grup",
  roulette: "Tragere la Sort",
};

export const PrayRoomScreen = ({ navigation, route }) => {
  const { roomId } = route.params;
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [addMenu, setAddMenu] = useState(false);
  const [formModal, setFormModal] = useState({ open: false, editing: null });
  const [existingModal, setExistingModal] = useState(false);
  const [crudPrayer, setCrudPrayer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [rouletteMode, setRouletteMode] = useState("pray");
  const [showRoulette, setShowRoulette] = useState(false);
  const [assignedMember, setAssignedMember] = useState(null);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [assignedPrayers, setAssignedPrayers] = useState([]);

  const { roomUpdatedAt, emitPrayerChanged } = usePrayRoomSocket(roomId, user?._id);

  const isRoulette = room?.roomType === "roulette";
  const isTargeted = room?.roomType === "targeted";
  const isCreator = room?.createdBy?._id === user?._id;

  const loadRoom = useCallback(async () => {
    try {
      const data = await api.get(`/pray-rooms/${roomId}`);
      setRoom(data);
    } catch (e) {
      showError(e.response?.data?.error || "Eroare la incarcare");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadAssignment = useCallback(async () => {
    try {
      const data = await api.get(`/pray-rooms/${roomId}/my-assignment`);
      if (data.ready) {
        setAssignedMember(data.assignedTo);
        setHasRevealed(!!data.revealed);
      } else {
        setAssignedMember(null);
        setHasRevealed(false);
      }
    } catch {}
  }, [roomId]);

  const loadAssignedPrayers = useCallback(async () => {
    try {
      const data = await api.get(`/pray-rooms/${roomId}/assigned-prayers`);
      setAssignedPrayers(data.hasAssignment ? data.prayers || [] : []);
    } catch {}
  }, [roomId]);

  useFocusEffect(useCallback(() => { loadRoom(); }, [loadRoom]));

  useEffect(() => {
    if (isRoulette) loadAssignment();
  }, [isRoulette, loadAssignment]);

  useEffect(() => {
    if (hasRevealed && isRoulette) loadAssignedPrayers();
  }, [hasRevealed, isRoulette, loadAssignedPrayers]);

  useEffect(() => {
    if (roomUpdatedAt) {
      loadRoom();
      if (isRoulette && hasRevealed) loadAssignedPrayers();
    }
  }, [roomUpdatedAt]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoom();
    if (isRoulette) {
      await loadAssignment();
      if (hasRevealed) await loadAssignedPrayers();
    }
    setRefreshing(false);
  };

  const applyPrayers = (prayers) => {
    setRoom((prev) => (prev ? { ...prev, prayers } : prev));
    emitPrayerChanged();
  };

  const submitNew = async (text, isUrgent, mood) => {
    setSubmitting(true);
    try {
      if (formModal.editing) {
        const res = await api.patch(`/pray-rooms/${roomId}/prayers/${formModal.editing._id}`, { text, isUrgent, mood });
        applyPrayers(res.prayers);
        showSuccess("Motiv actualizat");
      } else {
        const res = await api.post(`/pray-rooms/${roomId}/prayers`, { text, isUrgent, mood });
        applyPrayers(res.prayers);
        showSuccess("Motiv adaugat");
      }
      setFormModal({ open: false, editing: null });
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const pickExisting = async ({ text, isUrgent, mood }) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/pray-rooms/${roomId}/prayers`, { text, isUrgent, mood });
      applyPrayers(res.prayers);
      setExistingModal(false);
      showSuccess("Motiv adaugat");
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePrayer = async (prayer) => {
    setConfirmDelete(null);
    try {
      const res = await api.delete(`/pray-rooms/${roomId}/prayers/${prayer._id}`);
      applyPrayers(res.prayers);
      showSuccess("Motiv sters");
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const handleCopyCode = async () => {
    try {
      if (Platform.OS === "web" && navigator?.clipboard) {
        await navigator.clipboard.writeText(room?.roomCode);
      }
      showSuccess("Cod copiat!");
    } catch {
      showError("Nu s-a putut copia");
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await api.post(`/pray-rooms/${roomId}/leave`);
      showSuccess("Ai iesit din camera");
      setShowSettings(false);
      navigation.goBack();
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const handleRevealComplete = () => {
    setHasRevealed(true);
    loadAssignedPrayers();
    api.post(`/pray-rooms/${roomId}/mark-revealed`).catch(() => {});
    setTimeout(() => setShowRoulette(false), 500);
  };

  const myPrayers = (room?.prayers || []).filter((p) => (p.userId?._id || p.userId) === user?._id);
  const maxP = room?.settings?.maxPrayers || 2;
  const canPost = (() => {
    if (!room) return false;
    if (isTargeted) return isCreator;
    return myPrayers.length < maxP;
  })();

  const daysLeft = room?.endDate
    ? Math.max(0, Math.ceil((new Date(room.endDate) - new Date()) / 86400000))
    : 0;

  const activeMembers = room?.members?.filter((m) => m.hasAccepted) || [];
  const rouletteMembers = (() => {
    if (!isRoulette || !assignedMember) return activeMembers;
    const list = [...activeMembers];
    const id = assignedMember._id;
    if (!list.some((m) => (m.userId?._id || m.userId) === id)) {
      list.push({ userId: assignedMember, hasAccepted: true });
    }
    return list;
  })();

  const openMenu = (prayer) => setCrudPrayer(prayer);

  const renderCard = ({ item }) => (
    <PrayRoomCard
      prayer={item}
      isMine={(item.userId?._id || item.userId) === user?._id}
      onMenu={openMenu}
    />
  );

  if (loading) {
    return (
      <TiledBackground tileSource={BG_DARK} solidSource={BG_LIGHT} useTiled={isDarkMode} style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Se incarca...</Text>
        </View>
      </TiledBackground>
    );
  }

  const commonList = (data, emptyText) => (
    <FlatList
      data={data}
      keyExtractor={(item) => item._id}
      renderItem={renderCard}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{emptyText}</Text>
        </View>
      }
    />
  );

  return (
    <TiledBackground tileSource={BG_DARK} solidSource={BG_LIGHT} useTiled={isDarkMode} style={styles.container}>
      <View style={styles.roomHeader}>
        <ScreenHeader
          title={room?.name || "Pray Room"}
          subtitle={`Cod: ${room?.roomCode}`}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleCopyCode} accessibilityLabel="Copiaza codul">
            <Ionicons name="copy-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowSettings(true)} accessibilityLabel="Setari camera">
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.roomInfoBar}>
        <Text style={styles.roomInfoText}>{TYPE_LABELS[room?.roomType]}</Text>
        <Text style={styles.roomInfoText}>•</Text>
        <Text style={styles.roomInfoText}>{daysLeft} zile ramase</Text>
      </View>

      {isRoulette && (
        <View style={styles.segmentRow}>
          {[["pray", "De rugat"], ["mine", "Ale mele"]].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.segmentBtn, rouletteMode === key && styles.segmentBtnActive]}
              onPress={() => setRouletteMode(key)}
            >
              <Text style={[styles.segmentText, rouletteMode === key && styles.segmentTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isRoulette ? (
        rouletteMode === "mine" ? (
          commonList(myPrayers, "Nu ai adaugat motive. Apasa + ca sa te roage cineva.")
        ) : !hasRevealed ? (
          <View style={styles.revealCenterWrap}>
            {assignedMember ? (
              <TouchableOpacity style={styles.revealCenterBtn} onPress={() => setShowRoulette(true)}>
                <Text style={styles.revealCenterText}>Vezi cine ti-a picat</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.waitingText}>Se pregateste tragerea la sort (minim 3 persoane)...</Text>
            )}
          </View>
        ) : (
          <FlatList
            data={assignedPrayers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <PrayRoomCard prayer={item} isMine={false} onMenu={() => {}} />}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  {assignedMember?.personalData?.fullName || "Persoana"} nu a adaugat motive inca
                </Text>
              </View>
            }
          />
        )
      ) : (
        commonList(room?.prayers || [], "Nu sunt motive inca")
      )}

      {canPost && (!isRoulette || rouletteMode === "mine") && (
        <TouchableOpacity style={styles.fab} onPress={() => setAddMenu(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <AddPrayerMenu
        visible={addMenu}
        onClose={() => setAddMenu(false)}
        onNew={() => { setAddMenu(false); setFormModal({ open: true, editing: null }); }}
        onExisting={() => { setAddMenu(false); setExistingModal(true); }}
      />

      <PrayerFormModal
        visible={formModal.open}
        submitting={submitting}
        title={formModal.editing ? "Editeaza motivul" : "Adauga un motiv"}
        initial={formModal.editing}
        onClose={() => setFormModal({ open: false, editing: null })}
        onSubmit={submitNew}
      />

      <ExistingPrayerPicker
        visible={existingModal}
        currentUserId={user?._id}
        submitting={submitting}
        onClose={() => setExistingModal(false)}
        onPick={pickExisting}
      />

      <PrayRoulette
        visible={showRoulette}
        members={rouletteMembers}
        assignedMember={assignedMember}
        onRevealComplete={handleRevealComplete}
        onClose={() => setShowRoulette(false)}
      />

      <Modal visible={!!crudPrayer} transparent animationType="fade" onRequestClose={() => setCrudPrayer(null)}>
        <Pressable style={styles.crudBackdrop} onPress={() => setCrudPrayer(null)}>
          <View style={styles.crudSheet}>
            <TouchableOpacity
              style={styles.crudItem}
              onPress={() => { const p = crudPrayer; setCrudPrayer(null); setFormModal({ open: true, editing: p }); }}
            >
              <Ionicons name="create-outline" size={20} color="#e5e7eb" />
              <Text style={styles.crudItemText}>Editeaza</Text>
            </TouchableOpacity>
            <View style={styles.crudDivider} />
            <TouchableOpacity
              style={styles.crudItem}
              onPress={() => { const p = crudPrayer; setCrudPrayer(null); setConfirmDelete(p); }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.crudItemText, { color: "#ef4444" }]}>Sterge</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <Pressable style={styles.crudBackdrop} onPress={() => setConfirmDelete(null)}>
          <View style={styles.crudSheet}>
            <Text style={[styles.crudItemText, { paddingHorizontal: 24, paddingTop: 16 }]}>Stergi motivul?</Text>
            <TouchableOpacity style={styles.crudItem} onPress={() => deletePrayer(confirmDelete)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.crudItemText, { color: "#ef4444" }]}>Da, sterge</Text>
            </TouchableOpacity>
            <View style={styles.crudDivider} />
            <TouchableOpacity style={styles.crudItem} onPress={() => setConfirmDelete(null)}>
              <Ionicons name="close-outline" size={20} color="#e5e7eb" />
              <Text style={styles.crudItemText}>Anuleaza</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showSettings} transparent animationType="fade">
        <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingsOption} onPress={handleLeaveRoom}>
              <Ionicons name="exit-outline" size={20} color="#f59e0b" />
              <Text style={styles.settingsOptionTextWarn}>Iesi din camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsCancel} onPress={() => setShowSettings(false)}>
              <Text style={styles.settingsCancelText}>Anuleaza</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TiledBackground>
  );
};
