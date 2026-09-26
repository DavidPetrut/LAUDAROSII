import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { analyzeStyles as styles } from "./analyzeStyles";

const ROOM_ICON = require("../../public/icons/room_icon1.png");
const DEVOTIONAL_ICON = require("../../public/icons/room_icon3.png");

export const AnalyzeTab = ({ navigation }) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.timerBtn}
          onPress={() => navigation.navigate("PrayerTimer")}
        >
          <Image source={DEVOTIONAL_ICON} style={styles.btnIcon} />
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Devotionalul meu</Text>
            <Text style={styles.btnSubtitle}>Momentul tău devotional</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.achievementsBtn}
          onPress={() => navigation.navigate("PrayRoomList")}
        >
          <Image source={ROOM_ICON} style={styles.btnIcon} />
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Pray Rooms</Text>
            <Text style={styles.btnSubtitle}>Camera de rugaciune</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.achievementsBtn}
          onPress={() => navigation.navigate("Achievements")}
        >
          <Text style={styles.btnEmoji}>🏆</Text>
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Achievements</Text>
            <Text style={styles.btnSubtitle}>Vezi statisticile tale</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
