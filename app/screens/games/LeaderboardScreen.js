import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { api, showError } from "../../global/functions";
import { ScreenHeader } from "../../global/components";
import { leaderboardStyles as styles } from "./styles";

export const LeaderboardScreen = ({ route, navigation }) => {
  const { gameKey, gameName } = route.params;
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await api.get(`/games/${gameKey}/leaderboard`);
      setLeaderboard(data);
    } catch (error) {
      showError("Nu am putut încarca clasamentul");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const getMedal = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const renderItem = ({ item, index }) => (
    <View style={[styles.row, index < 3 && styles.topRow]}>
      <View style={styles.rankContainer}>
        <Text style={styles.rank}>{getMedal(item.rank || index + 1)}</Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.playerName}</Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{item.score}</Text>
        <Text style={styles.scoreLabel}>puncte</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="🏆 Clasament" subtitle={gameName} />

      <FlatList
        data={leaderboard}
        renderItem={renderItem}
        keyExtractor={(item, idx) => idx.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎮</Text>
            <Text style={styles.emptyText}>
              Niciun scor înca. Fii primul care joaca!
            </Text>
          </View>
        }
      />
    </View>
  );
};
