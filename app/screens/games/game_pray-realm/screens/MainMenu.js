import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
  Animated,
  Text,
  StyleSheet,
} from "react-native";
import { GameImages } from "../assets";
import { mainMenuStyles as styles } from "./styles/mainMenuStyles";
import {
  useMissions,
  useMissionAdmin,
  MissionAdminSettings,
  CreateMissionScreen,
  ManageMissionsScreen,
  MissionPlayersScreen,
  MissionRequestsScreen,
} from "../missions";
import { rem } from "../constants/dimensions";

const BUTTONS_CONFIG = [
  { key: "start", action: "onStartGame", label: "Începe jocul" },
  { key: "challenges", action: "onChallenges", label: "Provocări" },
  { key: "shop", action: "onPrayerShop", label: "Magazin" },
  { key: "gallery", action: "onAchievements", label: "Galerie" },
  { key: "exit", action: "onExit", label: "Ieșire" },
];

const MainMenu = ({
  isNewPlayer,
  onStartGame,
  onChallenges,
  onPrayerShop,
  onAchievements,
  onExit,
  userId,
}) => {
  // Mission admin state
  const [showCreateMission, setShowCreateMission] = useState(false);
  const [showManageMissions, setShowManageMissions] = useState(false);
  const [showMissionPlayers, setShowMissionPlayers] = useState(false);
  const [showMissionRequests, setShowMissionRequests] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);

  // Missions hooks
  const { isMissionAdmin } = useMissions(userId);
  const { createMission: createMissionAdmin } = useMissionAdmin(userId);
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(100)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeOutOpacity = useRef(new Animated.Value(1)).current;

  const actions = {
    onStartGame,
    onChallenges,
    onPrayerShop,
    onAchievements,
    onExit,
  };

  // Animatii la mount: fade in bg, slide up butoane, start float
  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(buttonsTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(buttonsOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      startFloatingAnimation();
    });
  }, []);

  // Animatie subtila de plutire sus-jos
  const startFloatingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Calculeaza translateY pentru floating (foarte subtil: 3-4px)
  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  // Handler pentru click cu crossfade
  const handlePress = (actionName) => {
    Animated.timing(fadeOutOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      actions[actionName]?.();
    });
  };

  // Determina imaginea pentru butonul de start/continue
  const getButtonImage = (key) => {
    if (key === "start") {
      return isNewPlayer ? GameImages.btnIncepeJocul : GameImages.btnContinua;
    }
    const imageMap = {
      challenges: GameImages.btnProvocari,
      shop: GameImages.btnMagazin,
      gallery: GameImages.btnGalerie,
      exit: GameImages.btnIesire,
    };
    return imageMap[key];
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeOutOpacity }]}>
      <Animated.View style={[styles.bgContainer, { opacity: bgOpacity }]}>
        <ImageBackground
          source={GameImages.bgStart}
          style={styles.background}
          imageStyle={styles.backgroundImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Mission Admin Settings - doar pentru admini */}
      <MissionAdminSettings
        visible={isMissionAdmin}
        onCreateMission={() => setShowCreateMission(true)}
        onManageMissions={() => setShowManageMissions(true)}
      />

      <Animated.View
        style={[
          styles.menuContainer,
          {
            opacity: buttonsOpacity,
            transform: [
              { translateY: buttonsTranslateY },
              { translateY: floatTranslateY },
            ],
          },
        ]}
      >
        {BUTTONS_CONFIG.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            style={styles.menuButton}
            onPress={() => handlePress(btn.action)}
            activeOpacity={0.8}
            accessibilityLabel={
              btn.key === "start" && !isNewPlayer ? "Continuă jocul" : btn.label
            }
            accessibilityRole="button"
          >
            <Image
              source={getButtonImage(btn.key)}
              style={styles.buttonImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Create Mission Screen */}
      <CreateMissionScreen
        visible={showCreateMission}
        onClose={() => setShowCreateMission(false)}
        onSubmit={async (missionData) => {
          const result = await createMissionAdmin(missionData);
          return result;
        }}
      />

      {/* Manage Missions Screen */}
      <ManageMissionsScreen
        visible={showManageMissions}
        onClose={() => setShowManageMissions(false)}
        userId={userId}
        onOpenPlayers={(mission) => {
          setSelectedMission(mission);
          setShowMissionPlayers(true);
        }}
        onOpenRequests={(mission) => {
          setSelectedMission(mission);
          setShowMissionRequests(true);
        }}
      />

      {/* Mission Players Screen */}
      <MissionPlayersScreen
        visible={showMissionPlayers}
        onClose={() => setShowMissionPlayers(false)}
        mission={selectedMission}
      />

      {/* Mission Requests Screen */}
      <MissionRequestsScreen
        visible={showMissionRequests}
        onClose={() => setShowMissionRequests(false)}
        mission={selectedMission}
        onActionComplete={() => {
          // Forțează reîncărcarea ManageMissionsScreen
          setShowManageMissions(false);
          setTimeout(() => setShowManageMissions(true), 100);
        }}
      />
    </Animated.View>
  );
};

export default MainMenu;
