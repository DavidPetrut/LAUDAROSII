import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Platform,
} from "react-native";
import { colors } from "../../public/styles/global";
import { PersonalPrayersTab } from "./PersonalPrayersTab";
import { ProgramPrayersTab } from "./ProgramPrayersTab";
import { api } from "../../global/functions";
import { useAuth, useTransition, TRANSITION_VIDEOS } from "../../global/context";

const TABS = [
  {
    key: "sim",
    label: "S.I.M.\nDUMINICA",
    emoji: "⛪",
    image: require("../../public/images/sim_duminica2.jpg"),
  },
  {
    key: "tineret",
    label: "KINGDOM\nYOUTH",
    emoji: "🔥",
    image: require("../../public/images/kingdom_youth.jpg"),
  },
  {
    key: "personal",
    label: "NU\nSLUJESC",
    emoji: "🙏",
    image: require("../../public/images/nu_slujesc.jpg"),
  },
];

export const PrayersScreen = ({ navigation }) => {
  const { pendingShareCode, clearPendingShareCode } = useAuth();
  const { playTransition } = useTransition();
  const [activeTab, setActiveTab] = useState(null);
  const [shareCode, setShareCode] = useState(null);

  // Handler pentru selectarea tab-ului cu animație
  const handleTabSelect = (tabKey) => {
    playTransition({
      video: TRANSITION_VIDEOS.washingFeet,
      onComplete: () => setActiveTab(tabKey),
    });
  };

  useEffect(() => {
    if (!pendingShareCode) return;

    const handleDeepLink = async () => {
      try {
        const data = await api.get(
          `/prayers/lists/by-code/${pendingShareCode}`
        );
        if (data?.programType) {
          setShareCode(pendingShareCode);
          setActiveTab(data.programType);
          clearPendingShareCode();
        }
      } catch (e) {
        clearPendingShareCode();
      }
    };

    const timer = setTimeout(handleDeepLink, 500);
    return () => clearTimeout(timer);
  }, [pendingShareCode]);

  if (!activeTab) {
    return (
      <View style={styles.container}>
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabCard,
              index < TABS.length - 1 && styles.tabBorder,
            ]}
            onPress={() => handleTabSelect(tab.key)}
            accessibilityLabel={tab.label.replace("\n", " ")}
            activeOpacity={0.9}
          >
            <ImageBackground
              source={tab.image}
              style={styles.bgImage}
              resizeMode="cover"
            >
              <View style={styles.overlay} />
              <View style={styles.content}>
                <View style={styles.labelContainer}>
                  {tab.label.split("\n").map((line, i) => (
                    <Text key={i} style={styles.tabLabel}>
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.activeContainer}>
      {activeTab === "personal" ? (
        <PersonalPrayersTab
          navigation={navigation}
          onBack={() => setActiveTab(null)}
        />
      ) : (
        <ProgramPrayersTab
          programType={activeTab}
          navigation={navigation}
          shareCode={activeTab !== "personal" ? shareCode : null}
          onBack={() => setActiveTab(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabCard: {
    flex: 1,
    overflow: "hidden",
  },
  tabBorder: {
    borderBottomWidth: 2,
    borderBottomColor: "rgba(255,255,255,0.3)",
  },
  bgImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 24,
  },
  labelContainer: {
    alignItems: "flex-start",
  },
  tabLabel: {
    fontSize: 42,
    fontFamily: "PilotCommand",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 3,
    lineHeight: 50,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  activeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: Platform.OS === "web" ? "100vh" : "100%",
  },
});
