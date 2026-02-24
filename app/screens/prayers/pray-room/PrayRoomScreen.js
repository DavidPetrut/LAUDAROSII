import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenHeader, TiledBackground } from "../../../global/components";
import { api, showError, showSuccess } from "../../../global/functions";
import { useAuth, useTheme } from "../../../global/context";
import { usePrayRoomSocket } from "./prayRoomSocket";
import { MilestoneBar } from "./MilestoneBar";
import { FinalScoreModal } from "./FinalScoreModal";
import { PrayRoomCard } from "./PrayRoomCard";
import { PrayRoulette } from "./PrayRoulette";
import { PrayerCard } from "../PrayerCard";
import { prayRoomStyles as styles } from "./styles";

const BG_LIGHT = require("../../../public/images/day-light-mode-background.png");
const BG_DARK = require("../../../public/images/dark-mode-small.png");
const VITRALIU = require("../../../public/assets/vitraliu.png");

export const PrayRoomScreen = ({ navigation, route }) => {
  const { roomId } = route.params;
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedPrayerIds, setCompletedPrayerIds] = useState([]);
  const [dailyScore, setDailyScore] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [finalData, setFinalData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Roulette state
  const [showRoulette, setShowRoulette] = useState(false);
  const [assignedMember, setAssignedMember] = useState(null);
  const [assignedPrayers, setAssignedPrayers] = useState([]);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [rouletteTotal, setRouletteTotal] = useState(0);
  const [roulettePrayed, setRoulettePrayed] = useState(0);

  const { socketProgress, emitPrayerCompleted } = usePrayRoomSocket(roomId, user?._id);

  const loadRoom = useCallback(async () => {
    try {
      const data = await api.get(`/pray-rooms/${roomId}`);
      setRoom(data);
      if (data.state === "FINISHED") {
        setFinalData({ finalScore: data.finalScore });
        setShowFinalModal(true);
      }
    } catch {
      showError("Eroare la incarcare");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const loadProgress = useCallback(async () => {
    try {
      const data = await api.get(`/pray-rooms/${roomId}/progress`);
      setDailyScore(data.dailyScore || 0);
      setCompletedPrayerIds(data.completedPrayerIds || []);
    } catch {}
  }, [roomId]);

  // Roulette: verifica atribuirea si daca a fost deja revealed
  const loadAssignment = useCallback(async () => {
    try {
      const data = await api.get(`/pray-rooms/${roomId}/my-assignment`);
      if (data.ready) {
        setAssignedMember(data.assignedTo);
        if (data.revealed) setHasRevealed(true);
      }
    } catch {}
  }, [roomId]);

  // Roulette: incarca TOATE motivele PERSONALE ale persoanei atribuite (progres independent de BISERICA)
  const loadAssignedPrayers = useCallback(async () => {
    try {
      const data = await api.get(`/pray-rooms/${roomId}/assigned-prayers`);
      if (!data.hasAssignment) return;
      const notCompleted = (data.prayers || []).filter((p) => !p.completedInRoom);
      setAssignedPrayers(notCompleted);
      setRouletteTotal(data.total || 0);
      setRoulettePrayed(data.completedCount || 0);
    } catch (e) {
      showError("Nu s-au putut incarca motivele");
    }
  }, [roomId]);

  useFocusEffect(useCallback(() => { loadRoom(); loadProgress(); }, [loadRoom, loadProgress]));

  useEffect(() => {
    if (room?.roomType === "roulette") loadAssignment();
  }, [room?.roomType, loadAssignment]);

  // Incarca motivele doar dupa reveal
  useEffect(() => {
    if (hasRevealed && room?.roomType === "roulette") loadAssignedPrayers();
  }, [hasRevealed, room?.roomType, loadAssignedPrayers]);

  useEffect(() => {
    if (socketProgress) setDailyScore(socketProgress.dailyScore ?? dailyScore);
  }, [socketProgress]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRoom(), loadProgress()]);
    if (room?.roomType === "roulette") {
      await loadAssignment();
      await loadAssignedPrayers();
    }
    setRefreshing(false);
  };

  // Pentru motive comune si targetate (logica existenta din pray room)
  const handleCompletePrayer = async (prayerId) => {
    try {
      const res = await api.post(`/pray-rooms/${roomId}/complete-prayer/${prayerId}`);
      setDailyScore(res.dailyScore);
      setCompletedPrayerIds(res.completedPrayerIds || []);
      emitPrayerCompleted(prayerId);
      showSuccess("Te-ai rugat!");
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const handleAddPrayer = async () => {
    if (!newPrayer.trim()) return showError("Scrie un motiv");
    setSubmitting(true);
    try {
      await api.post(`/pray-rooms/${roomId}/prayers`, { text: newPrayer.trim() });
      showSuccess("Motiv adaugat");
      setNewPrayer("");
      setShowAddModal(false);
      loadRoom();
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    } finally {
      setSubmitting(false);
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

  const handleFinalize = async () => {
    try {
      const res = await api.post(`/pray-rooms/${roomId}/finalize`);
      setFinalData({ finalScore: res.finalScore });
      setShowSettings(false);
      setShowFinalModal(true);
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
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

  const handleAcknowledgeFinish = async () => {
    try {
      await api.post(`/pray-rooms/${roomId}/acknowledge-finish`);
      setShowFinalModal(false);
      navigation.goBack();
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const handleRevealComplete = async () => {
    setHasRevealed(true);
    loadAssignedPrayers();
    api.post(`/pray-rooms/${roomId}/mark-revealed`).catch(() => {});
    setTimeout(() => setShowRoulette(false), 500);
  };

  // Roulette: marcheaza motivul ca completat in room (UI local)
  const handleRoulettePrayed = (prayerId) => {
    setAssignedPrayers((prev) => prev.filter((p) => p._id !== prayerId));
    setRoulettePrayed((prev) => prev + 1);
  };

  // Roulette: apeleaza endpoint dedicat (completedPrayerIds + prayedBy)
  const roulettePrayHandler = (prayerId) =>
    api.post(`/pray-rooms/${roomId}/roulette-pray/${prayerId}`);

  const isCreator = room?.createdBy?._id === user?._id;
  const isRoulette = room?.roomType === "roulette";
  const isTargeted = room?.roomType === "targeted";
  const isFinished = room?.state === "FINISHED";
  const maxP = room?.settings?.maxPrayers || 2;
  const myCount = room?.prayers?.filter((p) => p.userId?._id === user?._id).length || 0;
  const canPost = !isFinished && !isRoulette && (room?.settings?.whoCanPost === "ALL" || isCreator) && myCount < maxP;

  const getVisiblePrayers = () => {
    if (!room) return [];
    if (isRoulette) return [];
    return room.prayers || [];
  };

  const canPrayFor = (prayer) => {
    if (isFinished) return false;
    if (isTargeted) return true;
    return prayer.userId?._id !== user?._id;
  };

  const prayers = getVisiblePrayers();
  const activeMembers = room?.members?.filter((m) => m.hasAccepted) || [];
  const rouletteScore = rouletteTotal > 0 ? Math.round((roulettePrayed / rouletteTotal) * 100) : 0;
  const rouletteComplete = isRoulette && hasRevealed && rouletteTotal > 0 && roulettePrayed >= rouletteTotal;

  // Roulette: lista pentru animatie include si assignedMember chiar daca nu a dat join inca
  const rouletteMembers = (() => {
    if (!isRoulette || !assignedMember) return activeMembers;
    const list = [...activeMembers];
    const assignedId = assignedMember._id;
    if (!list.some((m) => (m.userId?._id || m.userId) === assignedId)) {
      list.push({ userId: assignedMember, hasAccepted: true });
    }
    return list;
  })();

  if (loading) {
    return (
      <TiledBackground tileSource={BG_DARK} solidSource={BG_LIGHT} useTiled={isDarkMode} style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Se incarca...</Text>
        </View>
      </TiledBackground>
    );
  }

  return (
    <TiledBackground tileSource={BG_DARK} solidSource={BG_LIGHT} useTiled={isDarkMode} style={styles.container}>
      <View style={styles.roomHeader}>
        <ScreenHeader
          title={room?.name || "Pray Room"}
          subtitle={`Cod: ${room?.roomCode}`}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleCopyCode}
            accessibilityLabel="Copiaza codul"
          >
            <Ionicons name="copy-outline" size={20} color="#fff" />
          </TouchableOpacity>
          {!isFinished && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => setShowSettings(true)}
              accessibilityLabel="Setari camera"
            >
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {(!isRoulette || hasRevealed) && (
        <MilestoneBar score={isRoulette ? rouletteScore : (socketProgress?.dailyScore ?? dailyScore)} />
      )}

      {isRoulette && !isFinished && !hasRevealed && (
        <View style={styles.revealCenterWrap}>
          {assignedMember ? (
            <TouchableOpacity style={styles.revealCenterBtn} onPress={() => setShowRoulette(true)}>
              <Text style={styles.revealCenterText}>Vezi cine ti-a picat</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.waitingText}>Se pregateste camera...</Text>
          )}
        </View>
      )}

      {isRoulette && hasRevealed ? (
        rouletteComplete ? (
          <View style={styles.vitraliu100Wrap}>
            <Image source={VITRALIU} style={styles.vitraliuImg} resizeMode="contain" />
          </View>
        ) : (
        <FlatList
          data={assignedPrayers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PrayerCard
              prayer={item}
              isOwner={false}
              showPrayedButton={!isFinished}
              showPrayedCount={false}
              currentUserId={user?._id}
              onPrayed={handleRoulettePrayed}
              onCustomPray={roulettePrayHandler}
              tab="church"
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {assignedMember?.personalData?.fullName || "Persoana"} nu are motive de rugaciune inca
              </Text>
            </View>
          }
        />
        )
      ) : (
        <FlatList
          data={prayers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PrayRoomCard
              prayer={item}
              canPray={canPrayFor(item)}
              isCompleted={completedPrayerIds.includes(item._id)}
              onPray={handleCompletePrayer}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !isRoulette ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Nu sunt motive inca</Text>
              </View>
            ) : null
          }
        />
      )}

      {canPost && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Adauga motiv</Text>
            <TextInput style={[styles.modalInput, { color: theme.textPrimary }]}
              value={newPrayer} onChangeText={setNewPrayer}
              placeholder="Scrie motivul tau..." placeholderTextColor="#666"
              multiline maxLength={500} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>Anuleaza</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, submitting && styles.btnDisabled]}
                onPress={handleAddPrayer} disabled={submitting}>
                <Text style={styles.modalSubmitText}>{submitting ? "..." : "Adauga"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PrayRoulette
        visible={showRoulette}
        members={rouletteMembers}
        assignedMember={assignedMember}
        onRevealComplete={handleRevealComplete}
        onClose={() => setShowRoulette(false)}
      />

      <Modal visible={showSettings} transparent animationType="fade">
        <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
          <View style={styles.settingsCard}>
            {isCreator && (
              <TouchableOpacity style={styles.settingsOption} onPress={handleFinalize}>
                <Ionicons name="flag-outline" size={20} color="#ef4444" />
                <Text style={styles.settingsOptionTextDanger}>Finalizeaza camera</Text>
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

      <FinalScoreModal visible={showFinalModal} finalScore={finalData?.finalScore}
        onClose={handleAcknowledgeFinish} />
    </TiledBackground>
  );
};
