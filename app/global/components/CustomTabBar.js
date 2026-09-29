import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, useImmersive, useAuth } from "../context";
import { TutorialTarget } from "../tutorial/TutorialTarget";
import { showError } from "../functions";
import { colors } from "../../public/styles/global";

const TABS = [
  { name: "Home", icon: "home", lib: "ionicons", label: "Home" },
  { name: "Prayers", icon: "hands-pray", lib: "material", label: "Pray" },
  { name: "Courses", icon: "book", lib: "ionicons", label: "Resources" },
  { name: "Games", icon: "game-controller", lib: "ionicons", label: "Games" },
  { name: "Profile", icon: "person", lib: "ionicons", label: "Profile" },
];

const INITIAL_ROUTES = {
  Home: "HomeScreen",
  Prayers: "PrayersMain",
};

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);
const AnimatedMaterialIcons = Animated.createAnimatedComponent(
  MaterialCommunityIcons
);

const TabButton = ({ route, isFocused, onPress, tab, disabled, testID }) => {
  const { isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const bgColor = isDarkMode ? "#103629" : "rgba(99, 102, 241, 0.12)";

  const iconColor = isDarkMode
    ? isFocused ? "#ffffff" : "rgba(255,255,255,0.5)"
    : isFocused ? colors.primary : "#888";

  const labelColor = isDarkMode
    ? isFocused ? "#ffffff" : "rgba(255,255,255,0.45)"
    : isFocused ? colors.primary : "#999";

  const renderIcon = () => {
    if (tab.lib === "material") {
      return (
        <AnimatedMaterialIcons
          name={tab.icon}
          size={25}
          color={iconColor}
          style={{ transform: [{ scale: scaleAnim }] }}
        />
      );
    }
    return (
      <AnimatedIonicons
        name={isFocused ? tab.icon : `${tab.icon}-outline`}
        size={25}
        color={iconColor}
        style={{ transform: [{ scale: scaleAnim }] }}
      />
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      style={[styles.tabButton, disabled && { opacity: 0.3 }]}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <View style={styles.tabContent}>
        <Animated.View
          style={[
            styles.focusBg,
            {
              backgroundColor: bgColor,
              opacity: bgOpacity,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />
        {renderIcon()}
        <Text style={[styles.tabLabel, { color: labelColor }]} numberOfLines={1}>
          {tab.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { isDarkMode, theme } = useTheme();
  const { immersive } = useImmersive();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Taburi permise (gol = toate). Daca lista exclude toate rutele, revenim la toate
  // (nu lasam userul fara niciun tab).
  const rawAllowed = user?.allowedTabs || [];
  const anyAllowed = state.routes.some((r) => rawAllowed.includes(r.name));
  const isAllowed = (name) => rawAllowed.length === 0 || !anyAllowed || rawAllowed.includes(name);

  // Anti-lockout: daca tabul curent nu e permis, muta pe primul permis.
  useEffect(() => {
    const current = state.routes[state.index];
    if (current && !isAllowed(current.name)) {
      const firstAllowed = state.routes.find((r) => isAllowed(r.name));
      if (firstAllowed && firstAllowed.name !== current.name) {
        navigation.navigate(firstAllowed.name);
      }
    }
  }, [state.index, user?.allowedTabs]);

  // In mod imersiv (ex: sesiune Devotional) bara de jos dispare complet.
  if (immersive) return null;

  const gradientColors = isDarkMode
    ? theme.headerGradient
    : [colors.surface, colors.surface];

  // Spatiu pentru bara de navigatie a telefonului (butoane/gesturi).
  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;
  // Inaltimea creste cu inset-ul, ca zona de continut (iconite+text) sa ramana
  // constanta si sa NU fie inghesuita/acoperita de butoanele telefonului.
  const CONTENT_HEIGHT = 56;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.container,
        {
          height: CONTENT_HEIGHT + 8 + bottomInset,
          paddingBottom: bottomInset,
          shadowColor: isDarkMode ? "#000" : "#000",
          shadowOpacity: isDarkMode ? 0.4 : 0.1,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = TABS.find((t) => t.name === route.name) || TABS[0];

        const allowed = isAllowed(route.name);

        const onPress = () => {
          if (!allowed) {
            showError("Acest tab nu îți este disponibil.");
            return;
          }
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            const initialScreen = INITIAL_ROUTES[route.name];
            if (initialScreen) {
              navigation.navigate(route.name, { screen: initialScreen });
            } else {
              navigation.navigate(route.name);
            }
          }
        };

        return (
          <TutorialTarget key={route.key} id={`tab-${route.name}`} label={`Tab ${tab.label}`} style={{ flex: 1 }}>
            <TabButton route={route} isFocused={isFocused} onPress={onPress} tab={tab} disabled={!allowed} testID={`tab-${route.name}`} />
          </TutorialTarget>
        );
      })}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingTop: 8,
    borderTopWidth: 0,
    elevation: 20,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  focusBg: {
    position: "absolute",
    width: 56,
    height: 35,
    borderRadius: 10,
    top: -2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "System",
  },
});
