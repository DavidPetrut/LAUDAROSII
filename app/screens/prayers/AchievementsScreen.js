import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, TiledBackground } from "../../global/components";
import { api } from "../../global/functions";
import { useTheme } from "../../global/context";

const BG_DARK = require("../../public/images/dark-mode-small.png");
const BG_LIGHT = require("../../public/images/day-light-mode-background.png");

const StatRow = ({ icon, iconColor, label, value, emoji }) => (
  <View style={styles.statRow}>
    <View style={styles.statLeft}>
      {emoji ? (
        <Text style={styles.statEmoji}>{emoji}</Text>
      ) : (
        <Ionicons name={icon} size={24} color={iconColor} />
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

export const AchievementsScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.get("/stats");
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <TiledBackground
        tileSource={BG_DARK}
        solidSource={BG_LIGHT}
        useTiled={isDarkMode}
        style={styles.container}
      >
        <ScreenHeader title="Achievements" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#21c063" />
        </View>
      </TiledBackground>
    );
  }

  return (
    <TiledBackground
      tileSource={BG_DARK}
      solidSource={BG_LIGHT}
      useTiled={isDarkMode}
      style={styles.container}
    >
      <ScreenHeader title="Achievements" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Realizările tale</Text>
          </View>

          <View style={styles.card}>
            <StatRow
              emoji="📖"
              label="Zile de devotional finalizate"
              value={stats?.devotionalDaysCompleted || 0}
            />
            <View style={styles.divider} />
            <StatRow
              emoji="🔥"
              label="Streak zile de activitate"
              value={stats?.activityStreak || 0}
            />
            <View style={styles.divider} />
            <StatRow
              emoji="✅"
              label="Rugăciuni împlinite"
              value={stats?.totalPrayersAnswered || 0}
            />
          </View>
        </View>
      </ScrollView>
    </TiledBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  statLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  statLabel: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#21c063",
    fontFamily: "PilotCommand",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  motivationCard: {
    backgroundColor: "rgba(33, 192, 99, 0.15)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(33, 192, 99, 0.3)",
  },
  motivationEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 15,
    color: "#21c063",
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 22,
  },
});
