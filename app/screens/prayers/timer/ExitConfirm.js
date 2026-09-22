import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { devotionalStyles as styles } from "./devotionalStyles";

/**
 * Dialog de confirmare iesire, in tema intunecata a redarii (nu Alert-ul nativ).
 * Apare cand userul da BACK in timpul sesiunii; sesiunea e deja pe pauza.
 */
export const ExitConfirm = ({ visible, onStay, onExit, message = "Sesiunea e pusă pe pauză." }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
    <Pressable style={styles.confirmBackdrop} onPress={onStay}>
      <Pressable style={styles.confirmSheet} onPress={() => {}}>
        <Text style={styles.confirmTitle}>Sigur vrei să ieși?</Text>
        <Text style={styles.confirmDesc}>{message}</Text>
        <View style={styles.confirmRow}>
          <TouchableOpacity style={styles.confirmStay} onPress={onStay} activeOpacity={0.85}>
            <Text style={styles.confirmStayText}>Rămân</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmExit} onPress={onExit} activeOpacity={0.85}>
            <Text style={styles.confirmExitText}>Ies</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

export default ExitConfirm;
