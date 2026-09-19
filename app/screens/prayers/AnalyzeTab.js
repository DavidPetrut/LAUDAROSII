import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { analyzeStyles as styles } from "./analyzeStyles";

const MEDAL_ICON = require("../../public/icons/medal.png");
const ROOM_ICON = require("../../public/icons/room_icon1.png");
const DEVOTIONAL_ICON = require("../../public/icons/room_icon3.png");

export const AnalyzeTab = ({ answeredPrayers, navigation }) => {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Default închis
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      friction: 8,
      tension: 100,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  useEffect(() => {
    if (answeredPrayers.length === 0 || isPaused || !isExpanded) return;

    const itemHeight = 60;
    const totalHeight = answeredPrayers.length * itemHeight;

    animRef.current = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -totalHeight,
        duration: answeredPrayers.length * 4000, // Mai rapid
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animRef.current.start();
    return () => animRef.current?.stop();
  }, [answeredPrayers.length, isPaused, isExpanded]);

  const handleTouchStart = () => {
    setIsPaused(true);
    animRef.current?.stop();
  };

  const handleTouchEnd = () => {
    setTimeout(() => setIsPaused(false), 2000);
  };

  const toggleExpand = () => {
    if (answeredPrayers.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const duplicatedPrayers = [
    ...answeredPrayers,
    ...answeredPrayers,
    ...answeredPrayers,
  ];

  const carouselHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180], // Când e închis = 0
  });

  const rotateArrow = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.carouselContainer}>
        <TouchableOpacity
          style={styles.carouselHeader}
          onPress={toggleExpand}
          activeOpacity={0.8}
        >
          <Text style={styles.carouselTitle}>Rugaciuni Implinite</Text>
          <View style={styles.headerRight}>
            <Image source={MEDAL_ICON} style={styles.medalIcon} />
            <Text style={styles.carouselCount}>{answeredPrayers.length}</Text>
            {answeredPrayers.length > 0 && (
              <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </Animated.View>
            )}
          </View>
        </TouchableOpacity>

        <Animated.View
          style={[styles.carouselWrapper, { height: carouselHeight }]}
        >
          <ScrollView
            showsVerticalScrollIndicator={true}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onScrollEndDrag={handleTouchEnd}
            scrollEnabled={isExpanded}
          >
            <Animated.View
              style={[
                styles.carouselContent,
                { transform: [{ translateY: isPaused ? 0 : scrollAnim }] },
              ]}
            >
              {duplicatedPrayers.map((prayer, index) => (
                <View
                  key={`${prayer._id}-${index}`}
                  style={styles.carouselItem}
                >
                  <Text style={styles.carouselEmoji}>✓</Text>
                  <Text style={styles.carouselText} numberOfLines={2}>
                    {prayer.text}
                  </Text>
                </View>
              ))}
            </Animated.View>
          </ScrollView>

          {answeredPrayers.length === 0 && (
            <View style={styles.emptyCarousel}>
              <Text style={styles.emptyText}>
                Nu ai rugaciuni implinite inca
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      <View style={styles.buttonsContainer}>
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

        <TouchableOpacity
          style={styles.analyzeBtn}
          onPress={() => navigation.navigate("PrayerAnalysis")}
        >
          <Text style={styles.btnEmoji}>🧠</Text>
          <View style={styles.btnTextWrap}>
            <Text style={styles.btnTitle}>Analiza Rugaciuni</Text>
            <Text style={styles.btnSubtitle}>AI analizeaza motivele tale</Text>
          </View>
        </TouchableOpacity>

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
      </View>
    </ScrollView>
  );
};
