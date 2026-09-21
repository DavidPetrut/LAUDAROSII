import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { listsStyles as styles } from "./listsStyles";
import { AnimatedPrayerCard } from "../AnimatedPrayerCard";

/**
 * Detaliul unei liste (publica sau privata): antet cu back, banner de expirare cu
 * actiunile reincarca/termina si cardurile de motive (aceleasi ca in Personale).
 * Datele si actiunile vin din parinte; aceasta componenta doar afiseaza.
 */
export const PrayerListDetail = ({
  title,
  prayers,
  isPublic,
  expired,
  canAdd,
  fabColor = "#21c063",
  fabBottom = 28,
  currentUserId,
  onBack,
  onAddPress,
  onDeletePrayer,
  onAnswerPrayer,
  onReload,
  onEnd,
}) => {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.subBack} onPress={onBack}>
          <Ionicons name="chevron-back" size={26} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.subTitle} numberOfLines={1}>{title}</Text>
      </View>

      {expired && (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredTitle}>Lista a expirat</Text>
          <Text style={styles.expiredDesc}>
            Reîncarcă pentru a prelungi durata (motivele rămân), sau termină pentru a
            șterge lista și toate motivele.
          </Text>
          <View style={styles.expiredActions}>
            <TouchableOpacity style={[styles.expiredBtn, styles.expiredBtnReload]} onPress={onReload}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.expiredBtnReloadText}>Reîncarcă</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.expiredBtn, styles.expiredBtnEnd]} onPress={onEnd}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={styles.expiredBtnEndText}>Termină</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={prayers}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <AnimatedPrayerCard
            prayer={item}
            isOwner
            showPrayedButton={false}
            showPrayedCount={false}
            hideUserInfo
            onMarkAnswered={() => onAnswerPrayer(item._id)}
            onDelete={() => onDeletePrayer(item._id)}
            tab="personal"
            currentUserId={currentUserId}
          />
        )}
        contentContainerStyle={styles.detailList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>
              {expired ? "Lista este inactivă" : "Niciun motiv încă"}
            </Text>
          </View>
        }
      />

      {canAdd && !expired && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: fabColor, bottom: fabBottom }]}
          onPress={onAddPress}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PrayerListDetail;
