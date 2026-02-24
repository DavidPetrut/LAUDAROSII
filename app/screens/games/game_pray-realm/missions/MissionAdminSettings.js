import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
} from "react-native";
import { rem } from "../constants/dimensions";

/**
 * Componenta pentru iconița de settings și modal cu opțiuni admin
 * Vizibilă doar pentru admini de misiuni
 */
const MissionAdminSettings = ({
  visible,
  onCreateMission,
  onManageMissions,
}) => {
  const [showModal, setShowModal] = useState(false);

  if (!visible) return null;

  return (
    <>
      {/* Settings Icon - în colțul din dreapta sus */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>

      {/* Modal cu opțiuni */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Administrare Misiuni</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowModal(false);
                onCreateMission?.();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>➕</Text>
              <Text style={styles.optionText}>Creează Misiune Nouă</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowModal(false);
                onManageMissions?.();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>🎁</Text>
              <Text style={styles.optionText}>Răsplătire</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Închide</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  settingsButton: {
    position: "absolute",
    top: rem(50),
    left: rem(16),
    width: rem(44),
    height: rem(44),
    borderRadius: rem(22),
    backgroundColor: "rgba(100, 100, 120, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 100,
  },
  settingsIcon: {
    fontSize: rem(20),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxWidth: rem(350),
    backgroundColor: "rgba(25, 25, 35, 0.98)",
    borderRadius: rem(20),
    padding: rem(24),
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.5)",
  },
  modalTitle: {
    color: "#fbbf24",
    fontSize: rem(20),
    fontWeight: "800",
    textAlign: "center",
    marginBottom: rem(24),
    letterSpacing: 1,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    padding: rem(16),
    borderRadius: rem(12),
    marginBottom: rem(12),
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  optionIcon: {
    fontSize: rem(24),
    marginRight: rem(12),
  },
  optionText: {
    color: "#fff",
    fontSize: rem(16),
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    padding: rem(14),
    borderRadius: rem(12),
    marginTop: rem(8),
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  closeButtonText: {
    color: "#ef4444",
    fontSize: rem(14),
    fontWeight: "700",
    textAlign: "center",
  },
});

export default MissionAdminSettings;
