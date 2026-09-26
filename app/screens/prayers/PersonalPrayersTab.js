import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  UIManager,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BG_LIGHT = require("../../public/images/day-light-mode-background.png");
const BG_DARK = require("../../public/images/dark-mode-small.png");

import { api, showError } from "../../global/functions";
import { useAuth, useTheme, useNotifications } from "../../global/context";
import { useTesting } from "../../global/testing";
import {
  ScreenHeader,
  TiledBackground,
  NotificationBadge,
} from "../../global/components";
import { AnalyzeTab } from "./AnalyzeTab";
import { personalStyles as styles } from "./personalStyles";
import { PrayerListsView } from "./lists";
import { ChurchListView } from "./ChurchListView";

const FILTERS = [
  { key: "mine", label: "RUGACIUNI" },
  { key: "all", label: "BISERICA" },
  { key: "analyze", label: "MAI MULTE" },
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
  const { isDarkMode } = useTheme();
  const { counts, markAsSeen } = useNotifications();
  const { setLayer, clearLayer } = useTesting();
  const insets = useSafeAreaInsets();

  // Aliniaza butonul "+" exact cu butonul flotant TEST (aceeasi distanta fata de
  // baza reala a ecranului), dinamic pe orice telefon. Bara de taburi oglindeste
  // formula din CustomTabBar; pe web ecranul se intinde sub bara, pe nativ deasupra ei.
  const tabBarHeight = 64 + (insets.bottom > 0 ? insets.bottom : 8);
  const fabBottom =
    Platform.OS === "web"
      ? insets.bottom + 92
      : insets.bottom + 92 - tabBarHeight;

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

  // Reset + reincarcare la schimbarea userului
  useEffect(() => {
    setPrayers([]);
    setFilter("all");
    if (currentUserId) {
      loadPrayers();
    }
  }, [currentUserId, loadPrayers]);

  // La schimbarea tabului, marcheaza notificarile lui ca vazute
  const handleFilterChange = useCallback(
    (newFilter) => {
      if (newFilter === "mine") {
        markAsSeen("personal");
      } else if (newFilter === "all") {
        markAsSeen("church");
      }
      setFilter(newFilter);
    },
    [markAsSeen]
  );

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
        <AnalyzeTab navigation={navigation} />
      ) : filter === "mine" ? (
        <PrayerListsView currentUserId={currentUserId} fabBottom={fabBottom} />
      ) : (
        <ChurchListView currentUserId={currentUserId} fabBottom={fabBottom} />
      )}
    </TiledBackground>
  );
};
