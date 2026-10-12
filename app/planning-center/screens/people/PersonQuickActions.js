/** Mini-sheet acțiuni rapide pe o persoană (§9 [PEOPLE-QUICKACTION]) — email/chat/telefon + profil. */
import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PcBottomSheet, PcAvatar } from "../../components";
import { pcColors } from "../../theme";

export function PersonQuickActions({ person, visible, onClose, onViewProfile }) {
  if (!person) return null;
  const email = person.emails?.find((e) => e.primary)?.address || person.emails?.[0]?.address;
  const phone = person.phones?.find((p) => p.primary)?.number || person.phones?.[0]?.number;

  const act = (icon, enabled, onPress) => (
    <Pressable
      style={[styles.action, !enabled && styles.actionOff]}
      disabled={!enabled}
      onPress={onPress}
      hitSlop={8}
    >
      <Ionicons name={icon} size={26} color={enabled ? pcColors.primary : pcColors.textMuted} />
    </Pressable>
  );

  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.5}>
      <View style={styles.wrap}>
        <PcAvatar uri={person.avatar} initials={person.initials} size={88} />
        <Text style={styles.name}>{person.fullName}</Text>
        <View style={styles.actions}>
          {act("mail", !!email, () => email && Linking.openURL(`mailto:${email}`))}
          {act("chatbubble", true, () => {})}
          {act("call", !!phone, () => phone && Linking.openURL(`tel:${phone}`))}
        </View>
        <Pressable style={styles.profileBtn} onPress={onViewProfile}>
          <Text style={styles.profileTxt}>Vezi profilul</Text>
        </Pressable>
      </View>
    </PcBottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  name: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "700", marginTop: 14, textAlign: "center" },
  actions: { flexDirection: "row", gap: 36, marginTop: 18 },
  action: { alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  actionOff: { opacity: 0.4 },
  profileBtn: { marginTop: 22, borderWidth: 1, borderColor: pcColors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 },
  profileTxt: { color: pcColors.primary, fontWeight: "700", fontSize: 15 },
});

export default PersonQuickActions;
