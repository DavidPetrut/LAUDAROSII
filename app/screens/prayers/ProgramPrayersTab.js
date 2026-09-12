import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { headerGradient } from "../../public/styles/global";

const BG_LIGHT = require("../../public/images/day-light-mode-background.png");
const BG_DARK = require("../../public/images/dark-mode-small.png");

import { api, showError } from "../../global/functions";
import { useAuth, useTheme } from "../../global/context";
import { useTesting } from "../../global/testing";
import { CONFIG } from "../../global/config";
import {
  RibbonBadge,
  UserAvatar,
  BackArrowIcon,
  TiledBackground,
} from "../../global/components";
import { storage } from "../../global/utils/storage";
import { programStyles as styles } from "./styles";
import { UserPrayersList } from "./UserPrayersList";
import { CreateListModal } from "./CreateListModal";
import { AddPrayerModal } from "./AddPrayerModal";
import { ShareMenuModal } from "./ShareMenuModal";

const getNextMonday = () => {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 1, 0, 0);
  return nextMonday.getTime();
};

const REACTIONS = [
  { key: "thumbsup", emoji: "👍" },
  { key: "heart", emoji: "❤️" },
  { key: "pray", emoji: "🙏" },
  { key: "laugh", emoji: "😂" },
];

export const ProgramPrayersTab = ({
  programType,
  shareCode: initialShareCode,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const { setLayer, clearLayer } = useTesting();

  // Layer intern pentru modul de testare (SIM Duminica / Kingdom Youth)
  useEffect(() => {
    setLayer({
      screen:
        programType === "sim"
          ? "S.I.M. Duminica"
          : programType === "tineret"
          ? "Kingdom Youth"
          : "Program rugăciune",
      folder: "screens/prayers",
      file: "screens/prayers/ProgramPrayersTab.js",
    });
    return () => clearLayer();
  }, [programType, setLayer, clearLayer]);
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [reactedPrayers, setReactedPrayers] = useState({});
  const [prayerReactors, setPrayerReactors] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [predicators, setPredicators] = useState([]);
  const [selectedPredicator, setSelectedPredicator] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeShareCode, setActiveShareCode] = useState(initialShareCode);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [canAddMore, setCanAddMore] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasShownInitialModal = useRef(false);

  const checkCanAddMore = useCallback(async () => {
    try {
      const timeout = await storage.getItem(`prayerTimeout_${programType}`);
      if (timeout) {
        const timeoutDate = parseInt(timeout, 10);
        if (Date.now() < timeoutDate) {
          setCanAddMore(false);
          return false;
        } else {
          await storage.deleteItem(`prayerTimeout_${programType}`);
        }
      }
      return true;
    } catch {
      return true;
    }
  }, [programType]);

  const loadList = useCallback(async () => {
    try {
      const data = await api.get(`/prayers/lists/current/${programType}`);
      setList(data);
      if (data?.shareCode) setActiveShareCode(data.shareCode);
      if (data?.userReactions) {
        setReactedPrayers(data.userReactions);
      }
      if (data?.prayerReactors) {
        setPrayerReactors(data.prayerReactors);
      }
    } catch {
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [programType]);

  const loadPredicators = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await api.get("/prayers/predicators");
      setPredicators(data);
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    loadList();
    loadPredicators();
    checkCanAddMore();
  }, [loadList, loadPredicators, checkCanAddMore]);

  useEffect(() => {
    const showModal = async () => {
      if (initialShareCode && list && !hasShownInitialModal.current) {
        const canAdd = await checkCanAddMore();
        if (canAdd) {
          hasShownInitialModal.current = true;
          setTimeout(() => setShowAddModal(true), 300);
        }
      }
    };
    showModal();
  }, [initialShareCode, list, checkCanAddMore]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadList();
    setRefreshing(false);
  };

  const handleBack = () => {
    if (selectedUser) {
      setSelectedUser(null);
    } else if (onBack) {
      onBack();
    }
  };

  const handleCreateList = async () => {
    setCreating(true);
    try {
      const data = await api.post("/prayers/lists", {
        programType,
        predicatorId: selectedPredicator,
      });
      setShowCreateModal(false);
      setSelectedPredicator(null);
      loadList();
      if (data.shareCode) {
        handleShareLink(`${CONFIG.APP_URL}/prayers/form/${data.shareCode}`);
      }
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    } finally {
      setCreating(false);
    }
  };

  const getShareUrl = () => `${CONFIG.APP_URL}/prayers/form/${list?.shareCode}`;

  const handleDeleteList = async () => {
    if (!list?._id) return;
    setDeleting(true);
    try {
      await api.delete(`/prayers/lists/${list._id}`);
      setShowShareMenu(false);
      setList(null);
      setActiveShareCode(null);
    } catch (e) {
      showError("Eroare la ștergerea listei");
    } finally {
      setDeleting(false);
    }
  };

  const handleReact = async (prayerId, type) => {
    if (reactedPrayers[prayerId]) return;

    setReactedPrayers((prev) => ({ ...prev, [prayerId]: type }));
    setSelectedPrayer(null);

    if (selectedUser) {
      setSelectedUser((prev) => ({
        ...prev,
        prayers: prev.prayers.map((p) =>
          p._id === prayerId
            ? {
                ...p,
                reactions: {
                  ...p.reactions,
                  [type]: (p.reactions[type] || 0) + 1,
                },
                totalReactions: p.totalReactions + 1,
              }
            : p
        ),
      }));
    }

    try {
      await api.post(`/prayers/lists/${list._id}/prayers/${prayerId}/react`, {
        type,
      });
      loadList();
    } catch {}
  };

  const handleSubmitPrayer = async () => {
    if (!newPrayer.trim()) return showError("Scrie un motiv");
    const code = activeShareCode || list?.shareCode;
    if (!code) return showError("Nu exista lista activa");

    setSubmitting(true);
    try {
      await api.post(`/prayers/lists/${code}/submit`, {
        text: newPrayer.trim(),
        isUrgent,
        mood: selectedMood,
      });
      setNewPrayer("");
      setIsUrgent(false);
      setSelectedMood(null);
      setShowAddModal(false);
      setShowContinueModal(true);
      loadList();
    } catch {
      showError("Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueChoice = async (wantMore) => {
    setShowContinueModal(false);
    if (wantMore) {
      setShowAddModal(true);
    } else {
      const nextMonday = getNextMonday();
      await storage.setItem(
        `prayerTimeout_${programType}`,
        nextMonday.toString()
      );
      setCanAddMore(false);
    }
  };

  const hasUrgentPrayers = (userItem) => {
    return userItem.prayers?.some((p) => p.isUrgent);
  };

  const getUserTopReactions = (userItem) => {
    if (!userItem.prayers?.length) return null;
    let topPrayer = null;
    let maxReactions = 0;

    userItem.prayers.forEach((p) => {
      if (p.totalReactions > maxReactions) {
        maxReactions = p.totalReactions;
        topPrayer = p;
      }
    });

    if (!topPrayer || maxReactions === 0) return null;

    const reactions = [];
    REACTIONS.forEach((r) => {
      if (topPrayer.reactions[r.key] > 0) {
        reactions.push({ ...r, count: topPrayer.reactions[r.key] });
      }
    });

    return reactions.length > 0 ? reactions : null;
  };

  const getTitle = () => {
    if (selectedUser) {
      return `${selectedUser.personalData?.fullName || "Anonim"}${
        selectedUser.isPredicator ? " 🎤" : ""
      }`;
    }
    return programType === "sim" ? "S.I.M. Duminica" : "Kingdom Youth";
  };

  const getSubtitle = () => {
    if (selectedUser) {
      return `${selectedUser.prayers.length} motive de rugaciune`;
    }
    return `${list?.users?.length || 0} persoane`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Se încarca...</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <TiledBackground
        tileSource={BG_DARK}
        solidSource={BG_LIGHT}
        useTiled={isDarkMode}
        solidResizeMode="contain"
        style={styles.container}
      >
        <LinearGradient
          colors={headerGradient.colors}
          start={headerGradient.start}
          end={headerGradient.end}
          style={[styles.unifiedHeader, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <BackArrowIcon size={32} light />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {programType === "sim" ? "S.I.M. Duminica" : "Kingdom Youth"}
            </Text>
            <Text style={styles.headerSubtitle}>Nicio lista activa</Text>
          </View>
        </LinearGradient>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>
            Nu exista lista pentru saptamâna aceasta
          </Text>
          <Text style={styles.emptySubtitle}>
            {programType === "sim" ? "Duminica" : "Vinerea"} aceasta nu are
            lista
          </Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createBtnText}>+ Creeaza lista</Text>
            </TouchableOpacity>
          )}
        </View>
        <CreateListModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          programType={programType}
          predicators={predicators}
          selectedPredicator={selectedPredicator}
          setSelectedPredicator={setSelectedPredicator}
          onCreate={handleCreateList}
          creating={creating}
        />
      </TiledBackground>
    );
  }

  return (
    <TiledBackground
      tileSource={BG_DARK}
      solidSource={BG_LIGHT}
      useTiled={isDarkMode}
      solidResizeMode="cover"
      style={styles.container}
    >
      <LinearGradient
        colors={headerGradient.colors}
        start={headerGradient.start}
        end={headerGradient.end}
        style={styles.unifiedHeader}
      >
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <BackArrowIcon size={32} light />
        </TouchableOpacity>
        {selectedUser && (
          <UserAvatar
            profilePicture={selectedUser.personalData?.profilePicture}
            size={36}
            style={styles.headerAvatar}
          />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getTitle()}
          </Text>
          <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
        </View>
        {isAdmin && !selectedUser && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => setShowShareMenu(true)}
          >
            <Text style={styles.shareBtnText}>🔗</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {selectedUser ? (
        <UserPrayersList
          selectedUser={selectedUser}
          selectedPrayer={selectedPrayer}
          setSelectedPrayer={setSelectedPrayer}
          reactedPrayers={reactedPrayers}
          onReact={handleReact}
          refreshing={refreshing}
          onRefresh={onRefresh}
          prayerReactors={prayerReactors}
        />
      ) : (
        <>
          <FlatList
            data={list.users || []}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => {
              const topReactions = getUserTopReactions(item);
              return (
                <TouchableOpacity
                  style={[styles.userCard, { backgroundColor: theme.surface }]}
                  onPress={() => setSelectedUser(item)}
                >
                  {hasUrgentPrayers(item) && <RibbonBadge label="URGENT!" />}
                  <UserAvatar
                    profilePicture={item.personalData?.profilePicture}
                    size={48}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userDetails}>
                    <Text
                      style={[
                        styles.userCardName,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {item.personalData?.fullName || "Anonim"}
                      {item.isPredicator && " 🎤"}
                    </Text>
                    <Text
                      style={[styles.userCardCount, { color: theme.textMuted }]}
                    >
                      {item.prayers.length} motive
                    </Text>
                  </View>
                  {topReactions && (
                    <View style={styles.userReactions}>
                      {topReactions.map((r) => (
                        <View
                          key={r.key}
                          style={[
                            styles.userReactionBadge,
                            { backgroundColor: theme.surface },
                          ]}
                        >
                          <Text style={styles.userReactionEmoji}>
                            {r.emoji}
                          </Text>
                          <Text
                            style={[
                              styles.userReactionCount,
                              { color: theme.textMuted },
                            ]}
                          >
                            {r.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={[styles.chevron, { color: theme.textMuted }]}>
                    ›
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.usersList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>
                  Nu sunt rugaciuni. Distribuie link-ul!
                </Text>
              </View>
            }
          />

          {canAddMore && (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <AddPrayerModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        newPrayer={newPrayer}
        setNewPrayer={setNewPrayer}
        isUrgent={isUrgent}
        setIsUrgent={setIsUrgent}
        selectedMood={selectedMood}
        setSelectedMood={setSelectedMood}
        onSubmit={handleSubmitPrayer}
        submitting={submitting}
      />

      <Modal visible={showContinueModal} transparent animationType="fade">
        <View style={styles.continueOverlay}>
          <View style={styles.continueModal}>
            <Text style={styles.continueTitle}>Rugaciune adaugata! 🙏</Text>
            <Text style={styles.continueText}>Mai ai alte motive?</Text>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => handleContinueChoice(true)}
            >
              <Text style={styles.continueBtnText}>Da, mai am alte motive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.continueBtn, styles.continueBtnSecondary]}
              onPress={() => handleContinueChoice(false)}
            >
              <Text style={styles.continueBtnTextSecondary}>
                Nu, am terminat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ShareMenuModal
        visible={showShareMenu}
        onClose={() => setShowShareMenu(false)}
        shareUrl={getShareUrl()}
        onDelete={handleDeleteList}
        deleting={deleting}
      />
    </TiledBackground>
  );
};
