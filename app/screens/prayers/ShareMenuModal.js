import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Platform,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { headerGradient, colors } from "../../public/styles/global";
import { showSuccess, showError } from "../../global/functions";

const MENU_OPTIONS = [
  {
    key: "share",
    icon: "share-social",
    label: "Distribuie",
    desc: "Trimite link-ul către prieteni",
    color: "#10b981",
  },
  {
    key: "copy",
    icon: "copy",
    label: "Copiază link",
    desc: "Copiază în clipboard",
    color: "#3b82f6",
  },
  {
    key: "delete",
    icon: "trash",
    label: "Șterge lista",
    desc: "Elimină lista curentă",
    color: "#ef4444",
  },
];

export const ShareMenuModal = ({
  visible,
  onClose,
  shareUrl,
  onDelete,
  deleting,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      if (Platform.OS === "web") {
        if (navigator.share) {
          await navigator.share({
            title: "Motive de rugăciune",
            text: "Adaugă motivele tale de rugăciune:",
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          showSuccess("Link copiat!");
        }
      } else {
        await Share.share({
          message: `Adaugă motivele tale de rugăciune: ${shareUrl}`,
          url: shareUrl,
        });
      }
      onClose();
    } catch (e) {
      if (e.name !== "AbortError") showError("Eroare la distribuire");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess("Link copiat în clipboard!");
      onClose();
    } catch {
      showError("Eroare la copiere");
    }
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Ești sigur că vrei să ștergi această listă?")) {
        onDelete();
      }
    } else {
      onDelete();
    }
  };

  const handleOption = (key) => {
    switch (key) {
      case "share":
        handleShare();
        break;
      case "copy":
        handleCopy();
        break;
      case "delete":
        handleDelete();
        break;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
        >
          <LinearGradient
            colors={headerGradient.colors}
            start={headerGradient.start}
            end={headerGradient.end}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Opțiuni listă</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.optionsContainer}>
            {MENU_OPTIONS.map((opt, index) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.optionRow,
                  index === MENU_OPTIONS.length - 1 && styles.optionRowLast,
                ]}
                onPress={() => handleOption(opt.key)}
                disabled={opt.key === "delete" && deleting}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: opt.color + "20" },
                  ]}
                >
                  <Ionicons name={opt.icon} size={28} color={opt.color} />
                </View>
                <View style={styles.textWrap}>
                  <Text
                    style={[
                      styles.optionLabel,
                      opt.key === "delete" && styles.deleteLabel,
                    ]}
                  >
                    {opt.key === "delete" && deleting
                      ? "Se șterge..."
                      : opt.label}
                  </Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  closeBtn: {
    padding: 4,
  },
  optionsContainer: {
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionRowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deleteLabel: {
    color: "#ef4444",
  },
  optionDesc: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
