import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Image,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BG_LIGHT = require("../../public/images/day-light-mode-background.png");
const BG_DARK = require("../../public/images/dark-mode-small.png");
const TAG_BEFORE = require("../../public/icons/before_tag.png");
const TAG_AFTER = require("../../public/icons/after_tag.png");

import { api, showError, showSuccess } from "../../global/functions";
import { useAuth, useTheme, useNotifications } from "../../global/context";
import { useTesting } from "../../global/testing";
import {
  ScreenHeader,
  TiledBackground,
  NotificationBadge,
  BulbToggle,
  TestReportButton,
} from "../../global/components";
import { PrayerCard } from "./PrayerCard";
import { AnimatedPrayerCard } from "./AnimatedPrayerCard";
import { AnalyzeTab } from "./AnalyzeTab";
import {
  personalStyles as styles,
  personalModalStyles as modalStyles,
} from "./personalStyles";
import { PrayerWinstreak } from "./PrayerWinstreak";

const FILTERS = [
  { key: "mine", label: "PERSONALE" },
  { key: "all", label: "BISERICA" },
  { key: "analyze", label: "MAI MULTE" },
];

const MOODS = [
  { key: "nelinistit", label: "Ma simt nelinistit" },
  { key: "astept", label: "Aștept un răspuns" },
  { key: "eliberare", label: "Nevoie de eliberare" },
  { key: "voia_lui", label: "Accept Voia Lui" },
  { key: "persistent", label: "Persistent" },
];

// Componenta TabButton cu animatie underline si badge notificari
const TabButton = ({
  label,
  isActive,
  onPress,
  isDarkMode,
  notificationCount,
}) => {
  const underlineAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(underlineAnim, {
        toValue: isActive ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1 : 0.95,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const underlineWidth = underlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const textColor = isActive
    ? isDarkMode
      ? "#fff"
      : "#fff"
    : isDarkMode
    ? "rgba(255,255,255,0.5)"
    : "rgba(255,255,255,0.6)";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={tabStyles.tabButton}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={{ position: "relative" }}>
          <Text style={[tabStyles.tabText, { color: textColor }]}>{label}</Text>
          <NotificationBadge
            count={notificationCount}
            offsetRight={-18}
            offsetBottom={12}
          />
        </View>
      </Animated.View>
      <View style={tabStyles.underlineContainer}>
        <Animated.View
          style={[
            tabStyles.underline,
            {
              width: underlineWidth,
              backgroundColor: "#fff",
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const tabStyles = {
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 15.5,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  underlineContainer: {
    width: "100%",
    height: 2,
    marginTop: 8,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  underline: {
    height: 2,
    borderRadius: 1,
  },
};

export const PersonalPrayersTab = ({ onBack, navigation }) => {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const { counts, markAsSeen } = useNotifications();
  const { setLayer, clearLayer } = useTesting();

  // Marcheaza layer-ul intern pentru modul de testare (sub-nivel al tabului Pray)
  useEffect(() => {
    setLayer({
      screen: "NU SLUJESC (personal)",
      folder: "screens/prayers",
      file: "screens/prayers/PersonalPrayersTab.js",
    });
    return () => clearLayer();
  }, [setLayer, clearLayer]);
  const [prayers, setPrayers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Memorează user ID pentru a detecta schimbări
  const currentUserId = user?._id;

  const loadPrayers = useCallback(async () => {
    if (!currentUserId) {
      setPrayers([]);
      return;
    }
    try {
      const data = await api.get("/prayers/personal");
      setPrayers(data || []);
    } catch (e) {
      console.error("Error loading prayers:", e);
      showError("Eroare la încarcare");
    }
  }, [currentUserId]);

  // Reset complet al state-ului și reîncărcare când user-ul se schimbă
  useEffect(() => {
    // Reset state când user-ul se schimbă
    setPrayers([]);
    setFilter("all");
    setHasInteracted(false);

    // Încarcă datele pentru noul user
    if (currentUserId) {
      loadPrayers();
    }
  }, [currentUserId, loadPrayers]);

  // Handler pentru schimbarea tab-ului
  // Când navighezi la un tab NOU, marchează notificările acelui tab ca văzute
  const handleFilterChange = useCallback(
    (newFilter) => {
      // Marchează notificările noului tab ca văzute (navigare = seen)
      if (newFilter === "mine") {
        markAsSeen("personal");
      } else if (newFilter === "all") {
        markAsSeen("church");
      }
      setFilter(newFilter);
      setHasInteracted(false); // Reset pentru logica de interacțiune în tab
    },
    [markAsSeen]
  );

  // Handler pentru orice interacțiune (scroll, click) pe tab-ul curent
  // Folosit când userul stă pe un tab și primește notificări noi
  const handleUserInteraction = useCallback(() => {
    if (hasInteracted) return;
    setHasInteracted(true);

    // Marchează notificările ca văzute pentru tab-ul curent
    if (filter === "mine") {
      markAsSeen("personal");
    } else if (filter === "all") {
      markAsSeen("church");
    }
  }, [filter, hasInteracted, markAsSeen]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrayers();
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (!newPrayer.trim()) return showError("Scrie un motiv");
    setSubmitting(true);
    try {
      await api.post("/prayers/personal", {
        text: newPrayer.trim(),
        isUrgent,
        mood: selectedMood,
      });
      showSuccess("Adaugat!");
      setNewPrayer("");
      setIsUrgent(false);
      setSelectedMood(null);
      setShowModal(false);
      loadPrayers();
    } catch (e) {
      showError("Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAnswered = async (id) => {
    try {
      await api.put(`/prayers/personal/${id}`, { answered: true });
      loadPrayers();
    } catch (e) {
      showError("Eroare");
    }
  };
  const handleDelete = async (id) => {
    try {
      await api.delete(`/prayers/personal/${id}`);
      loadPrayers();
    } catch (e) {
      showError("Eroare");
    }
  };

  const answeredPrayers = prayers.filter(
    (p) => p.answered && p.userId?._id === user?._id
  );

  const [shatteringId, setShatteringId] = useState(null);

  // Winstreak state
  const [winstreakCount, setWinstreakCount] = useState(0);
  const [showWinstreak, setShowWinstreak] = useState(false);
  const winstreakTimerRef = useRef(null);
  const WINSTREAK_TIMEOUT = 30 * 60 * 1000; // 30 minute

  // Încarcă winstreak-ul din backend la mount
  useEffect(() => {
    const loadWinstreak = async () => {
      try {
        const stats = await api.get("/stats");
        if (stats?.currentWinstreak > 0 && stats?.lastWinstreakUpdate) {
          const lastUpdate = new Date(stats.lastWinstreakUpdate).getTime();
          const now = Date.now();
          const timePassed = now - lastUpdate;

          // Dacă nu au trecut 30 minute, restaurăm winstreak-ul
          if (timePassed < WINSTREAK_TIMEOUT) {
            setWinstreakCount(stats.currentWinstreak);

            // Setează timer pentru timpul rămas
            const timeRemaining = WINSTREAK_TIMEOUT - timePassed;
            winstreakTimerRef.current = setTimeout(() => {
              setWinstreakCount(0);
              setShowWinstreak(false);
              api.post("/stats/reset-winstreak").catch(console.error);
            }, timeRemaining);
          } else {
            // A trecut prea mult timp, resetăm
            api.post("/stats/reset-winstreak").catch(console.error);
          }
        }
      } catch (error) {
        console.error("Error loading winstreak:", error);
      }
    };

    if (currentUserId) {
      loadWinstreak();
    }

    return () => {
      if (winstreakTimerRef.current) {
        clearTimeout(winstreakTimerRef.current);
      }
    };
  }, [currentUserId]);

  const handlePrayed = (prayerId) => {
    setShatteringId(prayerId);

    // Increment winstreak doar în tabul "all" (Biserica)
    if (filter === "all") {
      // Reset timer dacă există
      if (winstreakTimerRef.current) {
        clearTimeout(winstreakTimerRef.current);
      }

      const newCount = winstreakCount + 1;
      setWinstreakCount(newCount);
      setShowWinstreak(true);

      // Salvează winstreak-ul în backend
      api.post("/stats/winstreak", { count: newCount }).catch(console.error);

      // Reset winstreak după 30 minute de inactivitate
      winstreakTimerRef.current = setTimeout(() => {
        setWinstreakCount(0);
        setShowWinstreak(false);
        // Reset și în backend
        api.post("/stats/reset-winstreak").catch(console.error);
      }, WINSTREAK_TIMEOUT);
    }
  };

  const handleWinstreakHide = () => {
    // Nu resetăm count-ul aici, doar vizibilitatea
    // Count-ul se resetează prin timer
  };

  const handleShatterComplete = (prayerId) => {
    LayoutAnimation.configureNext({
      duration: 400,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
    });
    setPrayers((prev) =>
      prev.map((p) => (p._id === prayerId ? { ...p, isHidden: true } : p))
    );
    setShatteringId(null);
  };

  const userIdString = currentUserId?.toString();

  const filteredPrayers = prayers.filter((p) => {
    const prayerOwnerId = p.userId?._id?.toString();
    const isOwner = prayerOwnerId === userIdString;

    switch (filter) {
      case "mine":
        return isOwner && !p.answered;
      case "analyze":
        return false;
      case "all":
        return !p.answered && !isOwner && !p.isHidden;
      default:
        return true;
    }
  });

  const visibleCount = prayers.filter((p) => !p.answered && !p.isHidden).length;

  return (
    <TiledBackground
      tileSource={BG_DARK}
      solidSource={BG_LIGHT}
      useTiled={isDarkMode}
      solidResizeMode="contain"
      style={styles.container}
    >
      <ScreenHeader
        title="Nu Slujesc"
        subtitle={`${visibleCount} motive`}
        onBack={onBack}
      />
      <View
        style={[
          styles.filtersRow,
          {
            backgroundColor: isDarkMode ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.1)",
            marginHorizontal: 16,
            borderRadius: 12,
          },
        ]}
      >
        {FILTERS.map((f) => {
          // Mapează filtrul la categoria de notificări
          const notifCategory =
            f.key === "mine" ? "personal" : f.key === "all" ? "church" : "more";
          return (
            <TabButton
              key={f.key}
              label={f.label}
              isActive={filter === f.key}
              onPress={() => handleFilterChange(f.key)}
              isDarkMode={isDarkMode}
              notificationCount={counts[notifCategory]}
            />
          );
        })}
      </View>

      {filter === "analyze" ? (
        <AnalyzeTab answeredPrayers={answeredPrayers} navigation={navigation} />
      ) : (
        <FlatList
          data={filteredPrayers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <AnimatedPrayerCard
              prayer={item}
              isOwner={item.userId?._id === user?._id}
              showPrayedButton={filter === "all"}
              showPrayedCount={filter === "mine"}
              hideUserInfo={filter === "mine"}
              onPrayed={handlePrayed}
              onMarkAnswered={() => handleMarkAnswered(item._id)}
              onDelete={() => handleDelete(item._id)}
              isShatterring={shatteringId === item._id}
              onShatterComplete={() => handleShatterComplete(item._id)}
              tab={filter === "mine" ? "personal" : "church"}
              currentUserId={currentUserId}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScrollBeginDrag={handleUserInteraction}
          onTouchStart={handleUserInteraction}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🙏</Text>
              <Text style={styles.emptyText}>Nu sunt rugaciuni</Text>
            </View>
          }
        />
      )}

      {filter === "mine" && filteredPrayers.length < 5 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: "#21c063" }]}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            <TestReportButton style={{ left: undefined, right: 46, top: 6 }} />
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Adauga un motiv</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={modalStyles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Textarea cu counter integrat */}
            <View style={modalStyles.textareaWrapper}>
              <TextInput
                style={modalStyles.input}
                placeholder="Scrie aici…"
                placeholderTextColor="#64748b"
                value={newPrayer}
                onChangeText={setNewPrayer}
                multiline
                maxLength={500}
              />
              <Text style={modalStyles.charCountInside}>
                {newPrayer.length}/500
              </Text>
            </View>

            {/* Toggle urgent modern cu BulbToggle */}
            <View style={modalStyles.urgentToggleRow}>
              <View style={modalStyles.urgentLabelContainer}>
                {isUrgent && (
                  <Image
                    source={TAG_AFTER}
                    style={modalStyles.urgentTagImage}
                  />
                )}
                <Text
                  style={[
                    modalStyles.urgentLabel,
                    isUrgent && modalStyles.urgentLabelActive,
                  ]}
                >
                  {isUrgent ? "URGENT!" : "ESTE URGENTA?"}
                </Text>
              </View>
              <BulbToggle
                value={isUrgent}
                onValueChange={setIsUrgent}
                size="small"
                activeColor="#dc2626"
                activeGlowColor="#ef4444"
                sparkColor="#f87171"
                trackColor="#e5e7eb"
                activeTrackColor="#f87171"
                activeBorderColor="#dc2626"
                bulbColor="#9ca3af"
                activeBulbColor="#ef4444"
              />
            </View>

            <Text style={modalStyles.sectionLabel}>Comunica o stare</Text>
            <View style={modalStyles.moodsContainer}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    modalStyles.moodBtn,
                    selectedMood === m.key && modalStyles.moodActive,
                  ]}
                  onPress={() =>
                    setSelectedMood(selectedMood === m.key ? null : m.key)
                  }
                >
                  <Text
                    style={[
                      modalStyles.moodText,
                      selectedMood === m.key && modalStyles.moodTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Buton Adaugă - success, dreapta jos */}
            <View style={modalStyles.submitRow}>
              <TouchableOpacity
                style={[
                  modalStyles.submitBtn,
                  submitting && modalStyles.submitDisabled,
                ]}
                onPress={handleAdd}
                disabled={submitting}
              >
                <Text style={modalStyles.submitText}>
                  {submitting ? "Se adaugă..." : "Salveaza"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Prayer Winstreak - apare doar în tabul Biserica */}
      <PrayerWinstreak
        count={winstreakCount}
        visible={showWinstreak}
        onHide={handleWinstreakHide}
      />
    </TiledBackground>
  );
};
