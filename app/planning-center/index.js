/**
 * Planning Center — entry al modulului (frontend). TOT trăiește în `app/planning-center/`.
 * Montat ca tab „Planificare" în App.js (singura atingere din afara folderului).
 *
 * Shell app-in-app: la focus ascunde tab-bar-ul principal (Immersive) și arată bottom nav-ul PC.
 * Ieșire = „Ieși din Planificare" (account sheet) sau Android back → revine în app-ul principal.
 */
import React, { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useImmersive } from "../global/context";
import { PcProvider, PcShellContext } from "./navigation/PcContext";
import { PlanningCenterNavigator } from "./navigation/PlanningCenterNavigator";

export default function PlanningCenterRoot({ navigation }) {
  const { setImmersive } = useImmersive();

  // Ascunde footer-ul principal cât timp ești în modul; îl readuce la ieșire.
  useFocusEffect(
    useCallback(() => {
      setImmersive(true);
      return () => setImmersive(false);
    }, [setImmersive])
  );

  const exitModule = useCallback(() => {
    navigation.navigate("Home");
  }, [navigation]);

  return (
    <PcProvider>
      <PcShellContext.Provider value={{ exitModule }}>
        <PlanningCenterNavigator />
      </PcShellContext.Provider>
    </PcProvider>
  );
}
