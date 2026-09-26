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
  ScrollView,
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

  const [manageOpen, setManageOpen] = useState(false);
  const [startingRoulette, setStartingRoulette] = useState(false);
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

  const startRoulette = async () => {
    setStartingRoulette(true);
    try {
      await api.post(`/pray-rooms/${roomId}/roulette/start`);
      showSuccess("Tragerea la sort a inceput");
      await loadRoom();
      await loadAssignment();
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare");
    } finally {
      setStartingRoulette(false);
    }
  };

  const approveRequest = async (userId) => {
    try {
      await api.post(`/pray-rooms/${roomId}/requests/${userId}/approve`);
      await loadRoom();
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const rejectRequest = async (userId) => {
    try {
      await api.post(`/pray-rooms/${roomId}/requests/${userId}/reject`);
      await loadRoom();
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const memberName = (m) => m.userId?.personalData?.fullName || "Cineva";
  const memberId = (m) => m.userId?._id || m.userId;
  const rouletteStarted = !!room?.rouletteStarted;
  const allMembers = room?.members || [];
  const requests = allMembers.filter((m) => m.status === "requested");
  const pendingInvites = allMembers.filter((m) => m.status === "invited");
  const refusals = allMembers.filter((m) => m.status === "refused" || m.status === "rejected");
  const acceptedCount = allMembers.filter((m) => m.status === "accepted").length;

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

  const activeMembers = room?.members?.filter((m) => m.status === "accepted") || [];
  const rouletteMembers = (() => {
    if (!isRoulette || !assignedMember) return activeMembers;
    const list = [...activeMembers];
    const id = assignedMember._id;
    if (!list.some((m) => (m.userId?._id || m.userId) === id)) {
      list.push({ userId: assignedMember, status: "accepted" });
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
        ) : !rouletteStarted ? (
          <View style={styles.rouletteWaitWrap}>
            <Ionicons name="hourglass-outline" size={40} color="rgba(255,255,255,0.4)" />
            {isCreator ? (
              <>
                <Text style={styles.rouletteWaitText}>
                  {acceptedCount} confirmati{pendingInvites.length ? ` • ${pendingInvites.length} in asteptare` : ""}.
                  {"\n"}Ii poti astepta sau incepe acum (cei neconfirmati ies).
                </Text>
                <TouchableOpacity style={[styles.rouletteStartBtn, startingRoulette && styles.btnDisabled]} onPress={startRoulette} disabled={startingRoulette}>
                  <Text style={styles.rouletteStartBtnText}>{startingRoulette ? "Se porneste..." : "Incepe pentru toti"}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.rouletteWaitText}>Organizatorul nu a inceput tragerea la sort inca.</Text>
            )}
          </View>
        ) : !hasRevealed ? (
          <View style={styles.revealCenterWrap}>
            {assignedMember ? (
              <TouchableOpacity style={styles.revealCenterBtn} onPress={() => setShowRoulette(true)}>
                <Text style={styles.revealCenterText}>Vezi cine ti-a picat</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.waitingText}>Se pregateste tragerea la sort...</Text>
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
            {isCreator && (
              <TouchableOpacity style={styles.settingsOption} onPress={() => { setShowSettings(false); setManageOpen(true); }}>
                <Ionicons name="people-outline" size={20} color="#7c3aed" />
                <Text style={[styles.settingsOptionTextWarn, { color: "#a78bfa" }]}>
                  Gestioneaza{requests.length ? ` (${requests.length} cereri)` : ""}
                </Text>
              </TouchableOpacity>
            )}
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

      <Modal visible={manageOpen} transparent animationType="slide" onRequestClose={() => setManageOpen(false)}>
        <Pressable style={styles.crudBackdrop} onPress={() => setManageOpen(false)}>
          <Pressable style={[styles.crudSheet, { maxHeight: "80%", padding: 16 }]} onPress={() => {}}>
            <Text style={styles.manageSectionTitle}>Gestioneaza camera</Text>
            <ScrollView>
              {requests.length > 0 && (
                <View style={styles.manageSection}>
                  <Text style={styles.manageSectionTitle}>Cereri de intrare</Text>
                  {requests.map((m) => (
                    <View key={memberId(m)} style={styles.manageRow}>
                      <Text style={styles.manageName} numberOfLines={1}>{memberName(m)}</Text>
                      <TouchableOpacity style={[styles.manageBtn, { backgroundColor: "rgba(33,192,99,0.15)" }]} onPress={() => approveRequest(memberId(m))}>
                        <Text style={[styles.manageBtnText, { color: "#21c063" }]}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.manageBtn, { backgroundColor: "rgba(239,68,68,0.15)" }]} onPress={() => rejectRequest(memberId(m))}>
                        <Text style={[styles.manageBtnText, { color: "#ef4444" }]}>Refuz</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {pendingInvites.length > 0 && (
                <View style={styles.manageSection}>
                  <Text style={styles.manageSectionTitle}>Invitatii in asteptare</Text>
                  {pendingInvites.map((m) => (
                    <View key={memberId(m)} style={styles.manageRow}>
                      <Text style={styles.manageName} numberOfLines={1}>{memberName(m)}</Text>
                      <Text style={[styles.manageStatus, { color: "#f59e0b" }]}>in asteptare</Text>
                    </View>
                  ))}
                </View>
              )}
              {refusals.length > 0 && (
                <View style={styles.manageSection}>
                  <Text style={styles.manageSectionTitle}>Refuzuri</Text>
                  {refusals.map((m) => (
                    <View key={memberId(m)} style={styles.manageRow}>
                      <Text style={styles.manageName} numberOfLines={1}>{memberName(m)}</Text>
                      <Text style={[styles.manageStatus, { color: "#ef4444" }]}>
                        {m.status === "refused" ? "a refuzat" : "respins"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {requests.length === 0 && pendingInvites.length === 0 && refusals.length === 0 && (
                <Text style={[styles.manageName, { padding: 12 }]}>Nimic de gestionat momentan.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.settingsCancel} onPress={() => setManageOpen(false)}>
              <Text style={styles.settingsCancelText}>Inchide</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </TiledBackground>
  );
};
