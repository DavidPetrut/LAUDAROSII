/**
 * Navigator imbricat Planning Center (app-in-app).
 * - PcTabs: bottom nav propriu (Schedule/Plans/Songs/Media/People) cu PcTabBar.
 * - Ecrane full-screen peste tab-uri: Profile / My Teams / Edit Contact / Settings.
 */
import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PcTabBar, PcMiniPlayer, PcExitHandle, PcBottomNav } from "../components";
import { pcColors } from "../theme";
import { PcNavContext, usePcNav } from "./PcContext";
import {
  PeopleListScreen,
  ProfileScreen,
  MyTeamsScreen,
  EditContactScreen,
  PcSettingsScreen,
  AddPersonScreen,
  ImportScreen,
  PersonTagsScreen,
} from "../screens/people";
import { PlansScreen, ServiceTypePlansScreen, PlanScreen, ItemDetailScreen, OrderTemplatesScreen, AddServiceTypeScreen, SelectSongScreen, ServiceTypeSettingsScreen, MatrixScreen } from "../screens/plans";
import { MyScheduleScreen, CalendarScreen, BlockoutEditorScreen } from "../screens/schedule";
import { SongsScreen, SongDetailScreen, ArrangementScreen, IntegrationsScreen, SequenceEditorScreen, TagsManagerScreen, LyricsChordsEditor } from "../screens/songs";
import { MediaPlayerScreen, MusicStandScreen, SongbookViewScreen } from "../screens/rehearse";
import { MediaListScreen, MediaItemScreen, AddMediaScreen } from "../screens/media";
import { ReportsScreen } from "../screens/reports";
import { PcAudioProvider, usePcAudio } from "./PcAudioContext";

/** Capturează navigația stack-ului PC (pt. mini-player ȘI bara de jos persistentă). */
function NavCapture() {
  const nav = useNavigation();
  const { attachNav } = usePcAudio();
  const { stackNavRef } = usePcNav();
  useEffect(() => { attachNav(nav); if (stackNavRef) stackNavRef.current = nav; }, [nav, attachNav, stackNavRef]);
  return null;
}

const Tab = createBottomTabNavigator();
function PcTabs() {
  const { setActiveTab } = usePcNav();
  return (
    <>
      <NavCapture />
      <Tab.Navigator
        tabBar={() => null}
        initialRouteName="People"
        screenOptions={{ headerShown: false, sceneContainerStyle: { backgroundColor: pcColors.bg } }}
        screenListeners={{ focus: (e) => { const name = String(e?.target || "").split("-")[0]; if (name) setActiveTab(name); } }}
      >
        <Tab.Screen name="Schedule" component={MyScheduleScreen} />
        <Tab.Screen name="Plans" component={PlansScreen} />
        <Tab.Screen name="Songs" component={SongsScreen} />
        <Tab.Screen name="Media" component={MediaListScreen} />
        <Tab.Screen name="People" component={PeopleListScreen} />
      </Tab.Navigator>
    </>
  );
}

const Stack = createNativeStackNavigator();
export function PlanningCenterNavigator() {
  const [activeTab, setActiveTab] = useState("People");
  const [currentRoute, setCurrentRoute] = useState("PcTabs");
  const stackNavRef = useRef(null);
  return (
    <PcAudioProvider>
      <PcNavContext.Provider value={{ activeTab, setActiveTab, stackNavRef, currentRoute, setCurrentRoute }}>
        <View style={{ flex: 1, backgroundColor: pcColors.bg }}>
          <PcStack />
          <PcMiniPlayer />
          <PcBottomNav />
          <PcExitHandle />
        </View>
      </PcNavContext.Provider>
    </PcAudioProvider>
  );
}

// Ecrane full-screen (fără bară de jos): modale + editoare/viewere imersive.
const FULL_SCREEN = { contentStyle: { backgroundColor: pcColors.bg } };

function PcStack() {
  const insets = useSafeAreaInsets();
  const { setCurrentRoute } = usePcNav();
  const navH = 58 + (insets.bottom > 0 ? insets.bottom : 8);
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: pcColors.bg, paddingBottom: navH } }}
      screenListeners={{ state: (e) => { try { const s = e?.data?.state; const r = s?.routes?.[s.index]?.name; if (r) setCurrentRoute(r); } catch (_) {} } }}
    >
      <Stack.Screen name="PcTabs" component={PcTabs} options={FULL_SCREEN} />
      <Stack.Screen name="PcProfile" component={ProfileScreen} />
      <Stack.Screen name="PcMyTeams" component={MyTeamsScreen} />
      <Stack.Screen name="PcEditContact" component={EditContactScreen} />
      <Stack.Screen name="PcSettings" component={PcSettingsScreen} />
      <Stack.Screen name="PcAddPerson" component={AddPersonScreen} />
      <Stack.Screen name="PcImport" component={ImportScreen} />
      <Stack.Screen name="PcPersonTags" component={PersonTagsScreen} />
      <Stack.Screen name="PcServiceTypePlans" component={ServiceTypePlansScreen} />
      <Stack.Screen name="PcPlan" component={PlanScreen} />
      <Stack.Screen name="PcItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="PcOrderTemplates" component={OrderTemplatesScreen} />
      <Stack.Screen name="PcAddServiceType" component={AddServiceTypeScreen} />
      <Stack.Screen name="PcSelectSong" component={SelectSongScreen} />
      <Stack.Screen name="PcServiceTypeSettings" component={ServiceTypeSettingsScreen} />
      <Stack.Screen name="PcMatrix" component={MatrixScreen} />
      <Stack.Screen name="PcSongDetail" component={SongDetailScreen} />
      <Stack.Screen name="PcArrangement" component={ArrangementScreen} />
      <Stack.Screen name="PcIntegrations" component={IntegrationsScreen} />
      <Stack.Screen name="PcSequenceEditor" component={SequenceEditorScreen} />
      <Stack.Screen name="PcTagsManager" component={TagsManagerScreen} />
      <Stack.Screen name="PcLyricsChords" component={LyricsChordsEditor} options={FULL_SCREEN} />
      <Stack.Screen name="PcChartViewer" component={LyricsChordsEditor} initialParams={{ readOnly: true }} options={FULL_SCREEN} />
      <Stack.Screen name="PcMediaPlayer" component={MediaPlayerScreen} options={{ presentation: "modal", ...FULL_SCREEN }} />
      <Stack.Screen name="PcMusicStand" component={MusicStandScreen} options={FULL_SCREEN} />
      <Stack.Screen name="PcSongbookView" component={SongbookViewScreen} options={FULL_SCREEN} />
      <Stack.Screen name="PcMediaItem" component={MediaItemScreen} />
      <Stack.Screen name="PcAddMedia" component={AddMediaScreen} />
      <Stack.Screen name="PcCalendar" component={CalendarScreen} />
      <Stack.Screen name="PcBlockoutEditor" component={BlockoutEditorScreen} options={{ presentation: "modal", ...FULL_SCREEN }} />
      <Stack.Screen name="PcReports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}

export default PlanningCenterNavigator;
