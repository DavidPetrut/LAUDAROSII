import { createNavigationContainerRef } from "@react-navigation/native";
import { TAB_LABELS } from "../testing";

// Ref global la containerul de navigare (atasat in App.js), folosit de tutorial
// ca sa te duca pe ecranul de start la pornirea redarii.
export const navigationRef = createNavigationContainerRef();

const TABS = new Set(Object.keys(TAB_LABELS));

// "Ecranul" unui pas: tab-ul activ (Home/Prayers/...) sau ruta de nivel root.
export const getCurrentTutorialScreen = () => {
  try {
    if (!navigationRef.isReady()) return "";
    const state = navigationRef.getRootState();
    const top = state?.routes?.[state.index ?? state.routes.length - 1];
    if (!top) return "";
    if (top.name === "MainTabs" && top.state) {
      const tabs = top.state;
      const tab = tabs.routes?.[tabs.index ?? 0];
      return tab?.name || "";
    }
    return top.name || "";
  } catch (e) {
    return "";
  }
};

// Navigheaza la ecranul de start al tutorialului (o singura data, la pornire).
export const navigateToTutorialScreen = (screen) => {
  if (!screen || !navigationRef.isReady()) return;
  try {
    if (TABS.has(screen)) navigationRef.navigate("MainTabs", { screen });
    else navigationRef.navigate(screen);
  } catch (e) {}
};
