/**
 * PcBottomNav — bara de jos PERSISTENTĂ a modulului (Schedule/Plans/Songs/Media/People).
 * Spre deosebire de bara nativă a Tab.Navigator-ului (care dispare pe ecranele de detaliu împinse peste tabs),
 * aceasta e un overlay mereu vizibil → rămâne și pe ecranul de Plan/Item etc., exact ca în PCO.
 * Reutilizează vizualul `PcTabBar` cu un `state`+`navigation` construite manual.
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { PcTabBar } from "./PcTabBar";
import { usePcNav } from "../navigation/PcContext";

const TAB_ORDER = ["Schedule", "Plans", "Songs", "Media", "People"];
// Ecrane full-screen unde bara de jos NU trebuie să apară (player, editoare, viewere imersive).
const HIDE_ON = new Set(["PcMediaPlayer", "PcBlockoutEditor", "PcMusicStand", "PcLyricsChords", "PcChartViewer", "PcSongbookView"]);

export function PcBottomNav() {
  const { activeTab, setActiveTab, stackNavRef, currentRoute } = usePcNav();
  if (HIDE_ON.has(currentRoute)) return null;

  const state = {
    index: Math.max(0, TAB_ORDER.indexOf(activeTab)),
    routes: TAB_ORDER.map((name) => ({ name, key: name })),
  };
  const navigation = {
    emit: () => ({ defaultPrevented: false }),
    navigate: (name) => {
      setActiveTab(name);
      // Revine la tabs (scoate ecranul de detaliu) și comută pe tab-ul ales.
      try { stackNavRef.current?.navigate("PcTabs", { screen: name }); } catch (e) {}
    },
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <PcTabBar state={state} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
});

export default PcBottomNav;
