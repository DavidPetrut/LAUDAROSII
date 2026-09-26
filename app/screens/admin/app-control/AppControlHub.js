import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenHeader } from "../../../global/components";
import { useTheme } from "../../../global/context";
import { accessApi } from "./accessApi";
import { ac, ACCENT, ROLE_META } from "./appControlStyles";

const CARDS = [
  { key: "AppControlAccess", icon: "key", title: "Accesibilitate", desc: "Acorda accese pe rol (functionalitati + ecrane)" },
  { key: "AppControlMembers", icon: "people", title: "Membri", desc: "Cauta, schimba rol, accese extra, blocheaza" },
  { key: "AppControlAddMember", icon: "person-add", title: "Adauga membru", desc: "Promoveaza un membru existent la un rol" },
];

export const AppControlHub = ({ navigation }) => {
  const { theme } = useTheme();
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    try {
      const members = await accessApi.members();
      const c = {};
      (members || []).forEach((m) => (c[m.role] = (c[m.role] || 0) + 1));
      setCounts(c);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[ac.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="App Control" subtitle="Zona super-admin" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ac.content}>
        <View style={ac.statsRow}>
          {Object.keys(ROLE_META).map((role) => (
            <View key={role} style={[ac.statPill, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={[ac.statDot, { backgroundColor: ROLE_META[role].color }]} />
              <Text style={[ac.statText, { color: theme.textPrimary }]}>
                {ROLE_META[role].label}: {counts[role] || 0}
              </Text>
            </View>
          ))}
        </View>

        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.key}
            style={[ac.hubCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate(card.key)}
            activeOpacity={0.85}
          >
            <View style={ac.hubIcon}>
              <Ionicons name={card.icon} size={24} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ac.hubTitle, { color: theme.textPrimary }]}>{card.title}</Text>
              <Text style={[ac.hubDesc, { color: theme.textMuted }]}>{card.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
