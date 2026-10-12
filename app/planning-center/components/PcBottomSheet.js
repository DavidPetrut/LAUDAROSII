/** Bottom-sheet modal (Filter / Sort / Quick-action). Overlay + panou jos, stil PCO. */
import React from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcColors } from "../theme";

export function PcBottomSheet({ visible, onClose, children, grabber = true, maxHeightPct = 0.85 }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: (insets.bottom || 8) + 8, maxHeight: `${Math.round(maxHeightPct * 100)}%` },
          ]}
          onPress={() => {}}
        >
          {grabber && <View style={styles.grabber} />}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: pcColors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: pcColors.sheet,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4A4A4C",
    marginBottom: 8,
  },
});

export default PcBottomSheet;
