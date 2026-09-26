import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StatusBar,
  ActivityIndicator,
  View,
  Text,
  Platform,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Font from "expo-font";
import {
  AuthProvider,
  useAuth,
  ThemeProvider,
  ToastProvider,
  TransitionProvider,
  NotificationProvider,
  ImmersiveProvider,
} from "./global/context";
import {
  ErrorBoundary,
  CustomTabBar,
  TransitionOverlay,
  BugReporter,
} from "./global/components";
import { TestingProvider, useTesting, getActiveRouteName } from "./global/testing";
import {
  registerForPushNotifications,
  addNotificationResponseListener,
  navigateFromNotification,
  ensureNotificationChannel,
} from "./global/services";
import { initApiUrl } from "./global/config";
import { colors } from "./public/styles/global";

import { LoginScreen, RegisterScreen, ForgotPasswordScreen } from "./screens/auth";
import { HomeScreen } from "./screens/home";
import {
  PrayersScreen,
  AnalysisScreen,
  DevotionalScreen,
  AchievementsScreen,
  PrayRoomEntry,
  PrayRoomSetup,
  PrayRoomList,
  PrayRoomScreen,
} from "./screens/prayers";
import {
  AnnouncementsScreen,
  AnnouncementDetailScreen,
} from "./screens/announcements";
import { CoursesScreen, CourseDetailScreen } from "./screens/courses";
import {
  GamesScreen,
  QuizGameScreen,
  LeaderboardScreen,
  MemoryGameScreen,
  MultiplayerLobbyScreen,
} from "./screens/games";
import {
  ProfileScreen,
  EditProfileScreen,
  SettingsScreen,
  BroadcastScreen,
} from "./screens/profile";
import { AdminScreen } from "./screens/admin";
import {
  AppControlHub,
  AppControlAccess,
  AppControlMembers,
  AppControlMemberDetail,
  AppControlAddMember,
} from "./screens/admin/app-control";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const PrayersNav = createNativeStackNavigator();

const PrayersStackScreen = () => (
  <PrayersNav.Navigator screenOptions={{ headerShown: false }}>
    <PrayersNav.Screen name="PrayersMain" component={PrayersScreen} />
    <PrayersNav.Screen name="PrayRoomList" component={PrayRoomList} />
    <PrayersNav.Screen name="PrayRoomEntry" component={PrayRoomEntry} />
    <PrayersNav.Screen name="PrayRoomSetup" component={PrayRoomSetup} />
    <PrayersNav.Screen name="PrayRoomScreen" component={PrayRoomScreen} />
    <PrayersNav.Screen name="PrayerAnalysis" component={AnalysisScreen} />
    <PrayersNav.Screen name="PrayerTimer" component={DevotionalScreen} />
    <PrayersNav.Screen name="Achievements" component={AchievementsScreen} />
  </PrayersNav.Navigator>
);

const HomeStackScreen = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
    <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home" component={HomeStackScreen} />
    <Tab.Screen name="Prayers" component={PrayersStackScreen} />
    <Tab.Screen name="Courses" component={CoursesScreen} />
    <Tab.Screen name="Games" component={GamesScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
    <Stack.Screen name="QuizGame" component={QuizGameScreen} />
    <Stack.Screen name="MemoryGame" component={MemoryGameScreen} />
    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
    <Stack.Screen name="MultiplayerLobby" component={MultiplayerLobbyScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Admin" component={AdminScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Broadcast" component={BroadcastScreen} />
    <Stack.Screen name="AppControl" component={AppControlHub} />
    <Stack.Screen name="AppControlAccess" component={AppControlAccess} />
    <Stack.Screen name="AppControlMembers" component={AppControlMembers} />
    <Stack.Screen name="AppControlMemberDetail" component={AppControlMemberDetail} />
    <Stack.Screen name="AppControlAddMember" component={AppControlAddMember} />
  </Stack.Navigator>
);

const Navigation = () => {
  const { user, loading, pendingShareCode } = useAuth();
  const { setCurrentRouteName } = useTesting();
  const navigationRef = useRef(null);

  useEffect(() => {
    if (user && Platform.OS !== "web") {
      registerForPushNotifications();
      ensureNotificationChannel();
    }
  }, [user]);

  // Ruteaza catre ecranul corect cand userul apasa pe o notificare (inclusiv cold start).
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = addNotificationResponseListener((response) => {
      navigateFromNotification(
        navigationRef.current,
        response?.notification?.request?.content?.data
      );
    });
    return () => sub?.remove?.();
  }, []);

  const handleNavigationReady = () => {
    try {
      const state = navigationRef.current?.getRootState();
      if (state) setCurrentRouteName(getActiveRouteName(state));
    } catch (e) {}
    if (user && pendingShareCode) {
      navigationRef.current?.navigate("MainTabs", { screen: "Prayers" });
    }
  };

  useEffect(() => {
    if (user && pendingShareCode && navigationRef.current?.isReady()) {
      navigationRef.current?.navigate("MainTabs", { screen: "Prayers" });
    }
  }, [user, pendingShareCode]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#6366f1",
          minHeight: Platform.OS === "web" ? "100vh" : "100%",
        }}
      >
        <Text style={{ fontSize: 60, marginBottom: 20 }}>🎵</Text>
        <Text
          style={{
            color: "white",
            fontSize: 24,
            fontFamily: "PilotCommand",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          LAUDAROSII VERTICAL
        </Text>
        <ActivityIndicator size="large" color="white" />
        <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 10 }}>
          Se încarca...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={handleNavigationReady}
      onStateChange={(state) => {
        try {
          setCurrentRouteName(getActiveRouteName(state));
        } catch (e) {}
      }}
    >
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default function App() {
  const [ready, setReady] = useState(false);

  const bootstrap = useCallback(async () => {
    // Adresa serverului trebuie incarcata inaintea oricarei cereri de retea.
    await initApiUrl();
    try {
      await Font.loadAsync({
        PilotCommand: require("./public/fonts/PilotCommandSpaced-0WodP-regular.otf"),
        PilotCommandOutline: require("./public/fonts/PilotCommandOutline-Thick-transparent.otf"),
        Seagoe: require("./public/fonts/seagoe-regular.ttf"),
        Raleway: require("./public/fonts/Raleway-VariableFont_wght-regular.ttf"),
        "IMFellEnglish-Italic": require("./public/fonts/IMFellEnglish-Italic.ttf"),
      });
      setReady(true);
    } catch (e) {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#6366f1",
          minHeight: Platform.OS === "web" ? "100vh" : "100%",
        }}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, minHeight: Platform.OS === "web" ? "100vh" : "100%" }}
    >
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <ImmersiveProvider>
                <ToastProvider>
                  <TransitionProvider>
                    <TestingProvider>
                      <StatusBar
                        barStyle="light-content"
                        backgroundColor="#6366f1"
                      />
                      <Navigation />
                      <TransitionOverlay />
                      <BugReporter />
                    </TestingProvider>
                  </TransitionProvider>
                </ToastProvider>
                </ImmersiveProvider>
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </View>
  );
}
