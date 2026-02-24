import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
  Image,
} from "react-native";
import { RibbonBadge, UserAvatar } from "../../global/components";
import { useTheme } from "../../global/context";
import { userDetailStyles as styles } from "./styles";

const TAG_ICON = require("../../public/icons/before_tag.png");

const MOOD_LABELS = {
  tulburat: "Ma tulbura mult",
  incredere: "Ma încred în El",
  eliberare: "Nevoie de eliberare",
  voia_lui: "Voia Lui",
  persistent: "Persistent",
  nelinistit: "Ma simt nelinistit",
  astept: "Aștept un răspuns",
};

const REACTIONS = [
  { key: "thumbsup", emoji: "👍" },
  { key: "heart", emoji: "❤️" },
  { key: "pray", emoji: "🙏" },
  { key: "laugh", emoji: "😂" },
];

const WORD_LIMIT = 18;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const POPUP_WIDTH = 220;
const POPUP_MAX_HEIGHT = 280;

const ExpandableText = ({ text, textStyle }) => {
  const [expanded, setExpanded] = useState(false);
  const words = text?.split(/\s+/) || [];
  const isLongText = words.length > WORD_LIMIT;
  const truncatedText = isLongText
    ? words.slice(0, WORD_LIMIT).join(" ")
    : text;

  if (!isLongText) {
    return <Text style={[styles.prayerText, textStyle]}>{text}</Text>;
  }

  return (
    <Text style={[styles.prayerText, textStyle]}>
      {expanded ? text : truncatedText}
      {!expanded && "... "}
      <Text style={styles.readMoreBtn} onPress={() => setExpanded(!expanded)}>
        {expanded ? "citeste mai putin" : "citeste mai mult"}
      </Text>
    </Text>
  );
};

export const UserPrayersList = ({
  selectedUser,
  selectedPrayer,
  setSelectedPrayer,
  reactedPrayers,
  onReact,
  refreshing,
  onRefresh,
  prayerReactors,
}) => {
  const { theme, isDarkMode } = useTheme();
  const lastTapRef = useRef({});
  const cardRefs = useRef({});
  const [showReactorsList, setShowReactorsList] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, right: 0 });
  const popupAnim = useRef(new Animated.Value(0)).current;

  const canReact = (item) => !reactedPrayers[item._id];

  const handleLongPress = (item) => {
    if (!canReact(item)) return;
    setSelectedPrayer(item._id);
  };

  const handlePress = (item) => {
    if (!canReact(item)) return;

    const now = Date.now();
    const lastTap = lastTapRef.current[item._id] || 0;

    if (now - lastTap < 400) {
      setSelectedPrayer(item._id);
      lastTapRef.current[item._id] = 0;
    } else {
      lastTapRef.current[item._id] = now;
    }
  };

  const handleDismiss = () => {
    if (selectedPrayer) setSelectedPrayer(null);
    if (showReactorsList) closePopup();
  };

  const openPopup = (item, event) => {
    if (item.totalReactions > 0) {
      const { pageY } = event.nativeEvent;

      let top = pageY - 50;
      if (top < 60) {
        top = pageY + 25;
      }

      setPopupPosition({ top, right: 16 });
      setShowReactorsList(item._id);
      Animated.spring(popupAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const closePopup = () => {
    Animated.timing(popupAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setShowReactorsList(null));
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleContextMenu = (e, itemId) => {
      e.preventDefault();
      const item = selectedUser.prayers.find((p) => p._id === itemId);
      if (item && canReact(item)) {
        setSelectedPrayer(itemId);
      }
    };

    Object.entries(cardRefs.current).forEach(([id, ref]) => {
      if (ref) {
        ref.oncontextmenu = (e) => handleContextMenu(e, id);
      }
    });

    return () => {
      Object.values(cardRefs.current).forEach((ref) => {
        if (ref) ref.oncontextmenu = null;
      });
    };
  }, [selectedUser.prayers, reactedPrayers]);

  const getReactorsForPrayer = (prayerId) => {
    return prayerReactors?.[prayerId] || [];
  };

  const getCurrentPrayerReactions = () => {
    if (!showReactorsList) return null;
    const prayer = selectedUser.prayers.find((p) => p._id === showReactorsList);
    return prayer?.reactions || {};
  };

  const dynamicStyles = {
    card: { backgroundColor: theme.surface },
    text: { color: theme.textPrimary },
    textMuted: { color: theme.textMuted },
    reactionContainer: { backgroundColor: theme.surface },
    popupSurface: { backgroundColor: theme.surface },
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={handleDismiss}>
      <FlatList
        data={selectedUser.prayers}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View
            style={{
              position: "relative",
              overflow: "visible",
              marginBottom: 16,
            }}
            ref={(ref) => {
              if (Platform.OS === "web") cardRefs.current[item._id] = ref;
            }}
          >
            <Pressable
              style={[
                styles.prayerCard,
                dynamicStyles.card,
                item.isUrgent && styles.prayerUrgent,
              ]}
              onPress={() => handlePress(item)}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={600}
            >
              {item.isUrgent && <RibbonBadge label="URGENT!" />}

              <ExpandableText text={item.text} textStyle={dynamicStyles.text} />

              {item.mood && (
                <View style={styles.moodBadge}>
                  <Image source={TAG_ICON} style={styles.moodTagImage} />
                  <Text style={styles.moodText}>{MOOD_LABELS[item.mood]}</Text>
                </View>
              )}
            </Pressable>

            {item.totalReactions > 0 && (
              <TouchableOpacity
                style={styles.reactionsDisplay}
                onPress={(e) => openPopup(item, e)}
                activeOpacity={0.7}
              >
                {REACTIONS.map(
                  (r) =>
                    item.reactions[r.key] > 0 && (
                      <View
                        key={r.key}
                        style={[
                          styles.reactionCount,
                          dynamicStyles.reactionContainer,
                        ]}
                      >
                        <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                        <Text
                          style={[styles.reactionNum, dynamicStyles.textMuted]}
                        >
                          {item.reactions[r.key]}
                        </Text>
                      </View>
                    )
                )}
              </TouchableOpacity>
            )}

            {selectedPrayer === item._id && canReact(item) && (
              <Pressable
                style={styles.reactionOverlayContainer}
                onPress={(e) => e.stopPropagation()}
              >
                <View
                  style={[styles.reactionBubble, dynamicStyles.popupSurface]}
                >
                  {REACTIONS.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[
                        styles.reactionBubbleBtn,
                        { backgroundColor: theme.background },
                      ]}
                      onPress={() => {
                        onReact(item._id, r.key);
                        setSelectedPrayer(null);
                      }}
                    >
                      <Text style={styles.reactionBubbleEmoji}>{r.emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Pressable>
            )}
          </View>
        )}
        contentContainerStyle={styles.prayersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {showReactorsList && (
        <Pressable style={styles.popupOverlay} onPress={closePopup}>
          <Animated.View
            style={[
              styles.reactorsPopup,
              dynamicStyles.popupSurface,
              {
                top: popupPosition.top,
                right: popupPosition.right,
                opacity: popupAnim,
                transform: [
                  {
                    scale: popupAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.popupHeader,
                { backgroundColor: theme.background },
              ]}
            >
              <View style={styles.popupTitleRow}>
                <Text style={[styles.popupTitle, dynamicStyles.text]}>
                  Reacții
                </Text>
                <View style={styles.popupTotalBadge}>
                  {REACTIONS.map(
                    (r) =>
                      getCurrentPrayerReactions()?.[r.key] > 0 && (
                        <View key={r.key} style={styles.popupTotalItem}>
                          <Text style={styles.popupTotalEmoji}>{r.emoji}</Text>
                          <Text style={styles.popupTotalNum}>
                            {getCurrentPrayerReactions()[r.key]}
                          </Text>
                        </View>
                      )
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={closePopup}>
                <Text style={styles.popupClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.popupScroll}>
              {getReactorsForPrayer(showReactorsList).map((reactor, idx) => (
                <View
                  key={idx}
                  style={[styles.popupRow, { borderBottomColor: theme.border }]}
                >
                  <UserAvatar
                    profilePicture={reactor.profilePicture}
                    size={32}
                    style={styles.popupAvatar}
                  />
                  <Text style={[styles.popupName, dynamicStyles.text]}>
                    {reactor.name}
                  </Text>
                  <Text style={styles.popupReactionEmoji}>
                    {REACTIONS.find((r) => r.key === reactor.type)?.emoji}
                  </Text>
                </View>
              ))}
              {getReactorsForPrayer(showReactorsList).length === 0 && (
                <Text style={styles.popupEmpty}>Nu sunt reacții</Text>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      )}
    </Pressable>
  );
};
