import React, { useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Text,
} from "react-native";
import { GameImages } from "../assets";
import { rem, SCREEN_WIDTH } from "../constants/dimensions";

const BelzyDeadIndicator = ({ visible = false }) => {
  const [showPopup, setShowPopup] = useState(false);

  if (!visible) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowPopup(true)}
        activeOpacity={0.7}
      >
        <Image
          source={GameImages.belzyDead}
          style={styles.icon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <Modal
        visible={showPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPopup(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPopup(false)}
        >
          <View style={styles.popupContainer}>
            <Image
              source={GameImages.belzyDead}
              style={styles.popupIcon}
              resizeMode="contain"
            />
            <Text style={styles.popupTitle}>Felicitări!</Text>
            <Text style={styles.popupText}>
              Belzy a fost înfrânt și nu va mai apărea în acest stagiu.
            </Text>
            <Text style={styles.popupSubtext}>
              Totuși lupta nu s-a terminat, deoarece alte primejdii pot apărea,
              așa că fii în gardă!
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPopup(false)}
            >
              <Text style={styles.closeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: rem(62),
    height: rem(62),
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: rem(12),
    borderWidth: 2,
    borderColor: "rgba(139, 90, 43, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: rem(50),
    height: rem(50),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupContainer: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: "rgba(30, 25, 20, 0.95)",
    borderRadius: rem(16),
    borderWidth: 3,
    borderColor: "rgba(139, 90, 43, 0.9)",
    padding: rem(24),
    alignItems: "center",
  },
  popupIcon: {
    width: rem(80),
    height: rem(80),
    marginBottom: rem(16),
  },
  popupTitle: {
    fontSize: rem(24),
    fontWeight: "700",
    color: "#d4a574",
    marginBottom: rem(12),
    textAlign: "center",
  },
  popupText: {
    fontSize: rem(16),
    color: "#fff",
    textAlign: "center",
    lineHeight: rem(24),
    marginBottom: rem(8),
  },
  popupSubtext: {
    fontSize: rem(14),
    color: "#aaa",
    textAlign: "center",
    lineHeight: rem(20),
    fontStyle: "italic",
    marginBottom: rem(20),
  },
  closeButton: {
    backgroundColor: "rgba(139, 90, 43, 0.9)",
    paddingHorizontal: rem(32),
    paddingVertical: rem(12),
    borderRadius: rem(8),
  },
  closeButtonText: {
    color: "#fff",
    fontSize: rem(16),
    fontWeight: "600",
  },
});

export default BelzyDeadIndicator;
