/**
 * Navigator imbricat Planning Center (app-in-app).
 * - PcTabs: bottom nav propriu (Schedule/Plans/Songs/Media/People) cu PcTabBar.
 * - Ecrane full-screen peste tab-uri: Profile / My Teams / Edit Contact / Settings.
 */
import React, { useEffect } from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { PcTabBar, PcMiniPlayer } from "../components";
import { pcColors } from "../theme";
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
import { PlansScreen, PlanScreen, ItemDetailScreen, AddServiceTypeScreen, SelectSongScreen, ServiceTypeSettingsScreen, MatrixScreen } from "../screens/plans";
import { MyScheduleScreen, CalendarScreen, BlockoutEditorScreen } from "../screens/schedule";
import { SongsScreen, SongDetailScreen, ArrangementScreen, IntegrationsScreen, SequenceEditorScreen, TagsManagerScreen, LyricsChordsEditor } from "../screens/songs";
import { MediaPlayerScreen, MusicStandScreen, SongbookViewScreen } from "../screens/rehearse";
import { MediaListScreen, MediaItemScreen, AddMediaScreen } from "../screens/media";
import { ReportsScreen } from "../screens/reports";
import { PcAudioProvider, usePcAudio } from "./PcAudioContext";

/** Capturează navigația stack-ului PC pentru mini-player (deschide Media Player de oriunde). */
function NavCapture() {
  const nav = useNavigation();
  const { attachNav } = usePcAudio();
  useEffect(() => { attachNav(nav); }, [nav, attachNav]);
  return null;
}

const Tab = createBottomTabNavigator();
function PcTabs() {
  return (
    <>
      <NavCapture />
      <Tab.Navigator
        tabBar={(props) => <PcTabBar {...props} />}
        initialRouteName="People"
        screenOptions={{ headerShown: false, sceneContainerStyle: { backgroundColor: pcColors.bg } }}
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
  return (
    <PcAudioProvider>
      <View style={{ flex: 1, backgroundColor: pcColors.bg }}>
        <PcStack />
        <PcMiniPlayer />
      </View>
    </PcAudioProvider>
  );
}

function PcStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: pcColors.bg } }}>
      <Stack.Screen name="PcTabs" component={PcTabs} />
      <Stack.Screen name="PcProfile" component={ProfileScreen} />
      <Stack.Screen name="PcMyTeams" component={MyTeamsScreen} />
      <Stack.Screen name="PcEditContact" component={EditContactScreen} />
      <Stack.Screen name="PcSettings" component={PcSettingsScreen} />
      <Stack.Screen name="PcAddPerson" component={AddPersonScreen} />
      <Stack.Screen name="PcImport" component={ImportScreen} />
      <Stack.Screen name="PcPersonTags" component={PersonTagsScreen} />
      <Stack.Screen name="PcPlan" component={PlanScreen} />
      <Stack.Screen name="PcItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="PcAddServiceType" component={AddServiceTypeScreen} />
      <Stack.Screen name="PcSelectSong" component={SelectSongScreen} />
      <Stack.Screen name="PcServiceTypeSettings" component={ServiceTypeSettingsScreen} />
      <Stack.Screen name="PcMatrix" component={MatrixScreen} />
      <Stack.Screen name="PcSongDetail" component={SongDetailScreen} />
      <Stack.Screen name="PcArrangement" component={ArrangementScreen} />
      <Stack.Screen name="PcIntegrations" component={IntegrationsScreen} />
      <Stack.Screen name="PcSequenceEditor" component={SequenceEditorScreen} />
      <Stack.Screen name="PcTagsManager" component={TagsManagerScreen} />
      <Stack.Screen name="PcLyricsChords" component={LyricsChordsEditor} />
      <Stack.Screen name="PcChartViewer" component={LyricsChordsEditor} initialParams={{ readOnly: true }} />
      <Stack.Screen name="PcMediaPlayer" component={MediaPlayerScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="PcMusicStand" component={MusicStandScreen} />
      <Stack.Screen name="PcSongbookView" component={SongbookViewScreen} />
      <Stack.Screen name="PcMediaItem" component={MediaItemScreen} />
      <Stack.Screen name="PcAddMedia" component={AddMediaScreen} />
      <Stack.Screen name="PcCalendar" component={CalendarScreen} />
      <Stack.Screen name="PcBlockoutEditor" component={BlockoutEditorScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="PcReports" component={ReportsScreen} />
    </Stack.Navigator>
  );
}

export default PlanningCenterNavigator;
