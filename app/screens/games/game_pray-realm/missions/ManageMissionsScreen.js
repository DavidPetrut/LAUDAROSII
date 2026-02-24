import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  RefreshControl,
} from "react-native";
import { rem } from "../constants/dimensions";
import { useMissionAdmin } from "./useMissions";

/**
 * Ecran pentru administrarea misiunilor proprii
 */
const ManageMissionsScreen = ({
  visible,
  onClose,
  userId,
  onOpenPlayers,
  onOpenRequests,
  onRequestsChanged,
}) => {
  const {
    myMissions,
    loading,
    loadMyMissions,
    closeMission,
  } = useMissionAdmin(userId);

  const [closingId, setClosingId] = useState(null);

  // Reîncarcă datele când se deschide ecranul sau când se schimbă cererile
  React.useEffect(() => {
    if (visible) {
      loadMyMissions();
    }
  }, [visible, loadMyMissions]);

  const handleCloseMission = async (missionId) => {
    setClosingId(missionId);
    await closeMission(missionId);
    setClosingId(null);
  };

  const getDaysRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Misiunile Mele</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadMyMissions}
              tintColor="#8b5cf6"
            />
          }
        >
          {myMissions.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>
                Nu ai creat nicio misiune încă
              </Text>
            </View>
          )}

          {myMissions.map((mission) => (
            <View key={mission.id} style={styles.missionCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.missionTitle}>{mission.title}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    mission.status === "closed" && styles.statusClosed,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {mission.status === "active" ? "Activ" : "Închis"}
                  </Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{mission.totalPlayers}</Text>
                  <Text style={styles.statLabel}>Jucători</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{mission.requestsCount}</Text>
                  <Text style={styles.statLabel}>Cereri</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{mission.approvedCount}</Text>
                  <Text style={styles.statLabel}>Aprobați</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {getDaysRemaining(mission.expiresAt)}
                  </Text>
                  <Text style={styles.statLabel}>Zile</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    mission.status === "closed" && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleCloseMission(mission.id)}
                  disabled={
                    mission.status === "closed" || closingId === mission.id
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>
                    {closingId === mission.id ? "..." : "ÎNCHIDE MISIUNE"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={() => onOpenPlayers?.(mission)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextPrimary,
                    ]}
                  >
                    JUCĂTORI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.actionButtonHighlight,
                    mission.requestsCount === 0 && styles.actionButtonDisabled,
                  ]}
                  onPress={() => onOpenRequests?.(mission)}
                  disabled={mission.requestsCount === 0}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextHighlight,
                    ]}
                  >
                    CERERI ({mission.requestsCount})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f19",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: rem(20),
    paddingTop: rem(50),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 92, 246, 0.2)",
  },
  backButton: {
    padding: rem(8),
    marginRight: rem(12),
  },
  backButtonText: {
    color: "#fff",
    fontSize: rem(24),
  },
  headerTitle: {
    color: "#fbbf24",
    fontSize: rem(20),
    fontWeight: "800",
    letterSpacing: 1,
  },
  scrollContent: {
    padding: rem(16),
    paddingBottom: rem(40),
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: rem(60),
  },
  emptyIcon: {
    fontSize: rem(48),
    marginBottom: rem(16),
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: rem(14),
  },
  missionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: rem(16),
    padding: rem(16),
    marginBottom: rem(16),
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rem(12),
  },
  missionTitle: {
    color: "#fff",
    fontSize: rem(16),
    fontWeight: "700",
  },
  statusBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    paddingHorizontal: rem(10),
    paddingVertical: rem(4),
    borderRadius: rem(8),
  },
  statusClosed: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  statusText: {
    color: "#4ade80",
    fontSize: rem(11),
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: rem(16),
    paddingVertical: rem(12),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: "#fbbf24",
    fontSize: rem(20),
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: rem(10),
    marginTop: rem(2),
  },
  actionsRow: {
    flexDirection: "row",
    gap: rem(8),
  },
  actionButton: {
    flex: 1,
    paddingVertical: rem(10),
    borderRadius: rem(8),
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
  },
  actionButtonPrimary: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  actionButtonHighlight: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    color: "#ef4444",
    fontSize: rem(10),
    fontWeight: "700",
  },
  actionButtonTextPrimary: {
    color: "#8b5cf6",
  },
  actionButtonTextHighlight: {
    color: "#fbbf24",
  },
});

export default ManageMissionsScreen;
