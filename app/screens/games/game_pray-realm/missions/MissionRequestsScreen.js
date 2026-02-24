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
 * Ecran pentru cererile de aprobare pentru o misiune
 */
const MissionRequestsScreen = ({
  visible,
  onClose,
  mission,
  onActionComplete,
}) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadRequests = useCallback(async () => {
    if (!mission?.id) return;
    setLoading(true);
    try {
      const data = await MissionsApi.getRequests(mission.id);
      setRequests(data);
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  }, [mission?.id]);

  useEffect(() => {
    if (visible && mission?.id) {
      loadRequests();
    }
  }, [visible, mission?.id, loadRequests]);

  const handleApprove = async (userId) => {
    setProcessingId(userId);
    try {
      await MissionsApi.approveUser(mission.id, userId);
      // Elimină din listă
      setRequests((prev) => prev.filter((r) => r.id !== userId));
      // Notifică parent-ul că s-a schimbat ceva
      onActionComplete?.();
    } catch (err) {
      console.error("Error approving user:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId) => {
    setProcessingId(userId);
    try {
      await MissionsApi.rejectUser(mission.id, userId);
      // Elimină din listă
      setRequests((prev) => prev.filter((r) => r.id !== userId));
      // Notifică parent-ul că s-a schimbat ceva
      onActionComplete?.();
    } catch (err) {
      console.error("Error rejecting user:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            <Text style={styles.headerTitle}>Cereri de Aprobare</Text>
            <Text style={styles.headerSubtitle}>{mission?.title}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadRequests}
              tintColor="#8b5cf6"
            />
          }
        >
          {requests.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Nu sunt cereri de aprobare</Text>
            </View>
          )}

          {requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              {/* Avatar */}
              {request.avatar ? (
                <Image source={{ uri: request.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {request.name?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}

              {/* Info */}
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{request.name}</Text>
                <Text style={styles.requestEmail}>{request.email}</Text>
                <Text style={styles.requestDate}>
                  Cerut la: {formatDate(request.requestedAt)}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actionsColumn}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(request.id)}
                  disabled={processingId === request.id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.approveButtonText}>
                    {processingId === request.id ? "..." : "APROBĂ"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rejectButtonText}>REFUZĂ</Text>
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
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderRadius: rem(12),
    padding: rem(12),
    marginBottom: rem(12),
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  avatar: {
    width: rem(48),
    height: rem(48),
    borderRadius: rem(24),
  },
  avatarPlaceholder: {
    width: rem(48),
    height: rem(48),
    borderRadius: rem(24),
    backgroundColor: "rgba(251, 191, 36, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: rem(20),
    fontWeight: "700",
  },
  requestInfo: {
    flex: 1,
    marginLeft: rem(12),
  },
  requestName: {
    color: "#fff",
    fontSize: rem(14),
    fontWeight: "600",
  },
  requestEmail: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: rem(11),
    marginTop: rem(2),
  },
  requestDate: {
    color: "#fbbf24",
    fontSize: rem(10),
    marginTop: rem(4),
  },
  actionsColumn: {
    marginLeft: rem(8),
    gap: rem(6),
  },
  approveButton: {
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    paddingHorizontal: rem(16),
    paddingVertical: rem(8),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: "#4ade80",
    alignItems: "center",
  },
  approveButtonText: {
    color: "#4ade80",
    fontSize: rem(11),
    fontWeight: "700",
  },
  rejectButton: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: rem(16),
    paddingVertical: rem(8),
    borderRadius: rem(8),
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#ef4444",
    fontSize: rem(11),
    fontWeight: "700",
  },
});

export default MissionRequestsScreen;
