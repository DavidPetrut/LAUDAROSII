import React from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import { UserAvatar } from "../../global/components";
import { modalStyles as styles } from "./styles";

export const CreateListModal = ({
  visible,
  onClose,
  programType,
  predicators,
  selectedPredicator,
  setSelectedPredicator,
  onCreate,
  creating,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Creeaza lista rugaciuni</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.programInfo}>
            <Text style={styles.programLabel}>Program:</Text>
            <Text style={styles.programValue}>
              {programType === "sim"
                ? "S.I.M. Duminica"
                : "Kingdom Youth (Tineret)"}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Predicator (opțional)</Text>
          <ScrollView style={styles.predicatorsList}>
            {predicators.length === 0 ? (
              <Text style={styles.noPredicators}>
                Nu sunt predicatori înregistrați
              </Text>
            ) : (
              predicators.map((p) => (
                <TouchableOpacity
                  key={p._id}
                  style={[
                    styles.predicatorRow,
                    selectedPredicator === p._id && styles.predicatorSelected,
                  ]}
                  onPress={() =>
                    setSelectedPredicator(
                      selectedPredicator === p._id ? null : p._id
                    )
                  }
                >
                  <UserAvatar
                    profilePicture={p.personalData?.profilePicture}
                    size={40}
                    style={styles.predicatorAvatar}
                  />
                  <Text style={styles.predicatorName}>
                    {p.personalData?.fullName || p.email}
                  </Text>
                  {selectedPredicator === p._id && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, creating && styles.submitDisabled]}
            onPress={onCreate}
            disabled={creating}
          >
            <Text style={styles.submitText}>
              {creating ? "Se creeaza..." : "Creeaza și copiaza link"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
