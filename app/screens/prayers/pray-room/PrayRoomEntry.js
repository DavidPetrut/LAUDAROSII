import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { ScreenHeader, TiledBackground, BackArrowIcon } from "../../../global/components";
import { api, showError } from "../../../global/functions";
import { useTheme } from "../../../global/context";
import { prayRoomStyles as styles } from "./styles";

const BG_LIGHT = require("../../../public/images/day-light-mode-background.png");
const BG_DARK = require("../../../public/images/dark-mode-small.png");
const WAR_ROOM_1 = require("../../../public/images/war_room_1.jpg");
const WAR_ROOM_2 = require("../../../public/images/war_room_2.jpg");

export const PrayRoomEntry = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim() || joinCode.length !== 6) {
      return showError("Introdu un cod valid de 6 cifre");
    }
    setJoining(true);
    try {
      const room = await api.post(`/pray-rooms/join/${joinCode.trim()}`);
      navigation.replace("PrayRoomScreen", { roomId: room._id });
    } catch (e) {
      showError(e.response?.data?.error || "Eroare la join");
    } finally {
      setJoining(false);
    }
  };

  if (showJoinInput) {
    return (
      <TiledBackground
        tileSource={BG_DARK}
        solidSource={BG_LIGHT}
        useTiled={isDarkMode}
        style={styles.container}
      >
        <ScreenHeader
          title="Alatura-te"
          subtitle="Introdu codul camerei"
          onBack={() => setShowJoinInput(false)}
        />
        <KeyboardAvoidingView
          style={styles.joinContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Text style={styles.joinLabel}>Cod camera (6 cifre)</Text>
          <TextInput
            style={styles.joinInput}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="123456"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.joinBtn, joining && styles.btnDisabled]}
            onPress={handleJoin}
            disabled={joining}
          >
            <Text style={styles.joinBtnText}>
              {joining ? "Se proceseaza..." : "Intra in camera"}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TiledBackground>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.entryCardFull}
        onPress={() => navigation.navigate("PrayRoomSetup")}
        activeOpacity={0.9}
      >
        <View style={styles.entryBgImage}>
          <Image source={WAR_ROOM_1} style={styles.entryBgImg} resizeMode="contain" />
          <View style={styles.entryOverlay} />
          <Text style={styles.entryTitleFull}>CREEAZA PRAY ROOM</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.entryCardFull}
        onPress={() => setShowJoinInput(true)}
        activeOpacity={0.9}
      >
        <View style={styles.entryBgImage}>
          <Image source={WAR_ROOM_2} style={styles.entryBgImg} resizeMode="contain" />
          <View style={styles.entryOverlay} />
          <Text style={styles.entryTitleFull}>ALATURA-TE CU COD</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.entryBackBtn}
        onPress={() => navigation.goBack()}
      >
        <BackArrowIcon size={48} light />
      </TouchableOpacity>
    </View>
  );
};
