import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { colors } from "../../../../public/styles/global";

const ITEMS = [
  { key: "devotionals", icon: "book-outline", title: "Devotionalele mele", desc: "Creează, editează, partajează" },
  { key: "progress", icon: "trending-up-outline", title: "Progresul meu", desc: "Completări și consecvență" },
];

/**
 * Hub-ul "Personale": punctul de acces catre devotionale, progres si notificari.
 */
export const PersonalHubView = ({ onNavigate }) => (
  <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
    <View style={styles.introCard}>
      <Text style={styles.introTitle}>Personale</Text>
      <Text style={styles.introDesc}>Tot ce ține de parcursul tău devotional.</Text>
    </View>

    {ITEMS.map((it) => (
      <TouchableOpacity key={it.key} style={styles.hubRow} onPress={() => onNavigate(it.key)} activeOpacity={0.85}>
        <View style={styles.hubIcon}>
          <Ionicons name={it.icon} size={22} color="#10b981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hubTitle}>{it.title}</Text>
          <Text style={styles.hubDesc}>{it.desc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    ))}
  </ScrollView>
);

export default PersonalHubView;
