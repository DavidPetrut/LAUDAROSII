/**
 * Navigator imbricat Planning Center (app-in-app).
 * - PcTabs: bottom nav propriu (Schedule/Plans/Songs/Media/People) cu PcTabBar.
 * - Ecrane full-screen peste tab-uri: Profile / My Teams / Edit Contact / Settings.
 */
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { PcTabBar } from "../components";
import { pcColors } from "../theme";
import {
  PeopleListScreen,
  ProfileScreen,
  MyTeamsScreen,
  EditContactScreen,
  PcSettingsScreen,
} from "../screens/people";
import { makeComingSoon } from "../screens/placeholders/ComingSoon";

const ScheduleScreen = makeComingSoon("Schedule", "calendar-outline");
const PlansScreen = makeComingSoon("Plans", "list-outline");
const SongsScreen = makeComingSoon("Songs", "musical-notes-outline");
const MediaScreen = makeComingSoon("Media", "play-outline");

const Tab = createBottomTabNavigator();
function PcTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PcTabBar {...props} />}
      initialRouteName="People"
      screenOptions={{ headerShown: false, sceneContainerStyle: { backgroundColor: pcColors.bg } }}
    >
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Plans" component={PlansScreen} />
      <Tab.Screen name="Songs" component={SongsScreen} />
      <Tab.Screen name="Media" component={MediaScreen} />
      <Tab.Screen name="People" component={PeopleListScreen} />
    </Tab.Navigator>
  );
}

const Stack = createNativeStackNavigator();
export function PlanningCenterNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: pcColors.bg } }}>
      <Stack.Screen name="PcTabs" component={PcTabs} />
      <Stack.Screen name="PcProfile" component={ProfileScreen} />
      <Stack.Screen name="PcMyTeams" component={MyTeamsScreen} />
      <Stack.Screen name="PcEditContact" component={EditContactScreen} />
      <Stack.Screen name="PcSettings" component={PcSettingsScreen} />
    </Stack.Navigator>
  );
}

export default PlanningCenterNavigator;
