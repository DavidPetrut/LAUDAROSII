import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../global/context";
import { UserAvatar } from "../../global/components";
import { api, getTimeAgo } from "../../global/functions";
import { styles } from "./styles";
const ICON_PRAY = require("../../public/icons/room_icon3.png");
const ICON_ROOMS = require("../../public/icons/room_icon1.png");
const LOGO_VERTICAL = require("../../public/images/logo_vertical.jpg");

const REACTIONS_MAP = { thumbsup: "👍", heart: "❤️", pray: "🙏", laugh: "😂" };

export const HomeScreen = ({ navigation }) => {
  const { user, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const carouselTimer = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  // Auto-scroll carousel la fiecare 8 secunde
  useEffect(() => {
    if (announcements.length <= 1) return;
    carouselTimer.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % announcements.length);
    }, 8000);
    return () => clearInterval(carouselTimer.current);
  }, [announcements.length]);

  const loadData = async () => {
    try {
      const res = await api.get("/announcements?limit=5");
      setAnnouncements(res.announcements || []);
    } catch (e) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const quickActions = [
    { icon: ICON_PRAY, title: "Rugaciuni", screen: "Prayers", params: { screen: "PrayersMain" }, bg: "#f0e6ff" },
    {
      icon: ICON_ROOMS,
      title: "Pray Rooms",
      screen: "Prayers",
      params: { screen: "PrayRoomList" },
      bg: "#e6f4ff",
    },
    { emoji: "🎓", title: "Cursuri", screen: "Courses", bg: "#e6fff0" },
    { emoji: "🎮", title: "Jocuri", screen: "Games", bg: "#fff4e6" },
  ];

  return (
    <View style={styles.screenBg}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {announcements.length > 0 &&
            (() => {
              const item = announcements[activeSlide];
              if (!item) return null;
              const hasBgImg = !!item.bgImage;
              const hasBg = !!item.bgColor && !hasBgImg;
              const author = item.authorId;

              return (
                <View style={styles.carouselWrap}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate("AnnouncementDetail", {
                        announcementId: item._id,
                      })
                    }
                    style={[
                      styles.carouselCard,
                      hasBg && { backgroundColor: item.bgColor },
                    ]}
                  >
                    {hasBgImg && (
                      <Image
                        source={{ uri: item.bgImage }}
                        style={styles.carouselBgImg}
                      />
                    )}

                    {hasBgImg ? (
                      <>
                        <View style={styles.imgAuthorBadge}>
                          <UserAvatar
                            profilePicture={
                              author?.personalData?.profilePicture
                            }
                            size={28}
                          />
                          <View>
                            <Text style={styles.imgAuthorName}>
                              {author?.personalData?.fullName || "Admin"}
                            </Text>
                            <Text style={styles.imgAuthorDate}>
                              {getTimeAgo(item.date)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.carouselFooter}>
                          <Text
                            style={styles.carouselFooterTitle}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <Image source={LOGO_VERTICAL} style={styles.cardLogo} />
                        <View style={styles.colorCardTop}>
                          <UserAvatar
                            profilePicture={
                              author?.personalData?.profilePicture
                            }
                            size={28}
                          />
                          <View>
                            <Text
                              style={[
                                styles.colorAuthorName,
                                hasBg && { color: "#fff" },
                              ]}
                            >
                              {author?.personalData?.fullName || "Admin"}
                            </Text>
                            <Text
                              style={[
                                styles.colorAuthorDate,
                                hasBg && { color: "rgba(255,255,255,0.6)" },
                              ]}
                            >
                              {getTimeAgo(item.date)}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.colorBody,
                            hasBg && { color: "rgba(255,255,255,0.9)" },
                          ]}
                        >
                          {item.body?.length > 185
                            ? item.body.slice(0, 185) + "..."
                            : item.body}
                        </Text>
                        <Text
                          style={[
                            styles.readMore,
                            hasBg && { color: "rgba(255,255,255,0.7)" },
                          ]}
                        >
                          Citeste mai mult →
                        </Text>
                        <View style={styles.carouselFooter}>
                          <Text
                            style={styles.carouselFooterTitle}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>

                  {announcements.length > 1 && (
                    <View style={styles.dotsRow}>
                      {announcements.map((_, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setActiveSlide(i)}
                          style={[
                            styles.dot,
                            i === activeSlide && styles.dotActive,
                          ]}
                          accessibilityLabel={`Anunt ${i + 1}`}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}

          <Text style={styles.sectionTitle}>Actiuni rapide</Text>
          <View style={styles.quickActions}>
            {quickActions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.actionCard}
                onPress={() =>
                  navigation.navigate(action.screen, action.params || {})
                }
                accessibilityRole="button"
                accessibilityLabel={action.title}
              >
                <View
                  style={[styles.actionIcon, { backgroundColor: action.bg }]}
                >
                  {action.icon ? (
                    <Image source={action.icon} style={styles.actionImg} />
                  ) : (
                    <Text style={styles.actionEmoji}>{action.emoji}</Text>
                  )}
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {isAdmin && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate("Announcements")}
            accessibilityLabel="Adauga anunt"
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};
