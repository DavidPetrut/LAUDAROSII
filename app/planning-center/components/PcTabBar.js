/**
 * Bottom nav Planning Center — IDENTIC cu screenshot-urile (§9 [PC-BOTTOM-NAV]).
 * 5 tab-uri: Schedule / Plans / Songs / Media / People.
 * Activ = icon+label verde + „pill" verde-închis în spatele iconului. Fundal negru.
 */
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pcColors } from "../theme";

const TAB_META = {
  Schedule: { label: "Schedule", lib: "mci", icon: "calendar-check-outline", iconOn: "calendar-check" },
  Plans: { label: "Plans", lib: "ion", icon: "list-outline", iconOn: "list" },
  Songs: { label: "Songs", lib: "ion", icon: "musical-note-outline", iconOn: "musical-note" },
  Media: { label: "Media", lib: "mci", icon: "play-box-outline", iconOn: "play-box" },
  People: { label: "People", lib: "ion", icon: "person-outline", iconOn: "person" },
};

function Icon({ lib, name, color, size = 24 }) {
  return lib === "mci" ? (
    <MaterialCommunityIcons name={name} size={size} color={color} />
  ) : (
    <Ionicons name={name} size={size} color={color} />
  );
}

export function PcTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={[styles.bar, { height: 58 + bottomPad, paddingBottom: bottomPad }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name] || { label: route.name, lib: "ion", icon: "ellipse-outline", iconOn: "ellipse" };
        const color = focused ? pcColors.primary : pcColors.textMuted;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} style={styles.item} onPress={onPress} hitSlop={6}>
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Icon lib={meta.lib} name={focused ? meta.iconOn : meta.icon} color={color} />
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: pcColors.bgNav,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: pcColors.divider,
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconWrap: {
    width: 56,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: pcColors.tabActivePill },
  label: { fontSize: 11, marginTop: 3, fontWeight: "500" },
});

export default PcTabBar;
