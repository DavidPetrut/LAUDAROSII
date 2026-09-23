import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenHeader, TiledBackground } from "../../../global/components";
import { api } from "../../../global/functions";
import { useTheme } from "../../../global/context";
import { prayRoomStyles as styles } from "./styles";

const BG_LIGHT = require("../../../public/images/day-light-mode-background.png");
const BG_DARK = require("../../../public/images/dark-mode-small.png");
const ROOM_BTN = require("../../../public/icons/room-btn.png");

const ICON_MAP = {
  room_icon1: require("../../../public/icons/room_icon1.png"),
  room_icon2: require("../../../public/icons/room_icon2.png"),
  room_icon3: require("../../../public/icons/room_icon3.png"),
};

export const PrayRoomList = ({ navigation }) => {
  const { isDarkMode, theme } = useTheme();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      const data = await api.get("/pray-rooms/my");
      setRooms(data || []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const getActiveMembers = (room) =>
    room.members?.filter((m) => m.hasAccepted).length || 0;

  const getDaysLeft = (room) => {
    const diff = Math.ceil((new Date(room.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const isMaxRooms = rooms.length >= 5;

  const renderRoom = ({ item }) => (
    <TouchableOpacity
      style={[styles.roomCard, { backgroundColor: theme.surface }]}
      onPress={() => navigation.navigate("PrayRoomScreen", { roomId: item._id })}
      activeOpacity={0.85}
    >
      <Image source={ICON_MAP[item.icon] || ICON_MAP.room_icon1} style={styles.roomIcon} />
      <View style={styles.roomInfo}>
        <Text style={[styles.roomName, { color: theme.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.roomMeta, { color: theme.textMuted }]}>
          {getActiveMembers(item)} membri • {getDaysLeft(item)} zile ramase
        </Text>
      </View>
      <Text style={[styles.roomChevron, { color: theme.textMuted }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <TiledBackground
      tileSource={BG_DARK}
      solidSource={BG_LIGHT}
      useTiled={isDarkMode}
      style={styles.container}
    >
      <ScreenHeader
        title="Pray Rooms"
        subtitle={`${rooms.length} camere active`}
        onBack={() => navigation.goBack()}
      />
      <FlatList
        data={rooms}
        keyExtractor={(item) => item._id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🙏</Text>
            <Text style={styles.emptyTitle}>Nu ai camere active</Text>
            <Text style={styles.emptySubtitle}>Creeaza una sau alatura-te cu un cod</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={[styles.fab, isMaxRooms && styles.fabDisabled]}
        onPress={() => !isMaxRooms && navigation.navigate("PrayRoomEntry")}
        disabled={isMaxRooms}
        activeOpacity={isMaxRooms ? 1 : 0.7}
      >
        <Image source={ROOM_BTN} style={styles.fabImage} />
      </TouchableOpacity>
      {isMaxRooms && (
        <Text style={styles.maxRoomsHint}>Poti fi in maxim 5 camere de rugaciune</Text>
      )}
    </TiledBackground>
  );
};
