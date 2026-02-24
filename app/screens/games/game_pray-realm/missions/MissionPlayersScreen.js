import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  RefreshControl,
} from "react-native";
import { rem } from "../constants/dimensions";
import { MissionsApi } from "./missionsApi";

/**
 * Ecran pentru lista tuturor jucătorilor pentru o misiune
 */
const MissionPlayersScreen = ({
  visible,
  onClose,
  mission,
}) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const loadPlayers = useCallback(async () => {
    if (!mission?.id) return;
    setLoading(true);
    try {
      const data = await MissionsApi.getPlayers(mission.id);
      setPlayers(data);
    } catch (err) {
      console.error("Error loading players:", err);
    } finally {
      setLoading(false);
    }
  }, [mission?.id]);

  useEffect(() => {
    if (visible && mission?.id) {
      loadPlayers();
    }
  }, [visible, mission?.id, loadPlayers]);

  const handleApprove = async (userId) => {
    setApprovingId(userId);
    try {
      await MissionsApi.approveUser(mission.id, userId);
      // Actualizează local
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === userId ? { ...p, status: "approved" } : p
        )
      );
    } catch (err) {
      console.error("Error approving user:", err);
    } finally {
      setApprovingId(null);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "approved":
        return "APROBAT";
      case "claimed":
        return "REVENDICAT";
      case "requested":
        return "CERERE";
      case "rejected":
        return "REFUZAT";
      default:
        return "PENDING";
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "approved":
      case "claimed":
        return styles.statusApproved;
      case "rejected":
        return styles.statusRejected;
      case "requested":
        return styles.statusRequested;
      default:
        return {};
    }
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
          <View>
            <Text style={styles.headerTitle}>Jucători</Text>
            <Text style={styles.headerSubtitle}>{mission?.title}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadPlayers}
              tintColor="#8b5cf6"
            />
          }
        >
          {players.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>
                Nu sunt jucători încă
              </Text>
            </View>
          )}

          {players.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              {/* Avatar */}
              {player.avatar ? (
                <Image
                  source={{ uri: player.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {player.name?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}

              {/* Info */}
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerEmail}>{player.email}</Text>
              </View>

              {/* Status/Action */}
              <View style={styles.actionContainer}>
                {player.status === "pending" ? (
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(player.id)}
                    disabled={approvingId === player.id}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.approveButtonText}>
                      {approvingId === player.id ? "..." : "APROBĂ"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(player.status),
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusLabel(player.status)}
                    </Text>
                  </View>
                )}
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
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: rem(12),
    marginTop: rem(2),
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
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: rem(12),
    padding: rem(12),
    marginBottom: rem(10),
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
  },
  avatar: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
  },
  avatarPlaceholder: {
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    backgroundColor: "rgba(139, 92, 246, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: rem(18),
    fontWeight: "700",
  },
  playerInfo: {
    flex: 1,
    marginLeft: rem(12),
  },
  playerName: {
    color: "#fff",
    fontSize: rem(14),
    fontWeight: "600",
  },
  playerEmail: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: rem(11),
    marginTop: rem(2),
  },
  actionContainer: {
    marginLeft: rem(8),
  },
  approveButton: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    paddingHorizontal: rem(14),
    paddingVertical: rem(8),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  approveButtonText: {
    color: "#4ade80",
    fontSize: rem(11),
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: rem(12),
    paddingVertical: rem(6),
    borderRadius: rem(8),
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  statusApproved: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
  },
  statusRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  statusRequested: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  statusText: {
    color: "#fff",
    fontSize: rem(10),
    fontWeight: "600",
  },
});

export default MissionPlayersScreen;
