import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  StyleSheet,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { headerGradient } from "../../public/styles/global";
import { api, showError } from "../../global/functions";
import { useAuth } from "../../global/context/AuthContext";
import { styles } from "./styles";
import { PrayRealmNavigator } from "./game_pray-realm";

const PRAY_REALM_ICON = require("./game_pray-realm/assets/logo-app.png");

const gameEmojis = {
  quizBiblic: "📖",
  memoreazaVerset: "🧠",
  ghicesteCantecu: "🎵",
};

const gameScreens = {
  quizBiblic: "QuizGame",
  memoreazaVerset: "MemoryGame",
  ghicesteCantecu: "QuizGame",
};

export const GamesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPrayRealm, setShowPrayRealm] = useState(false);

  const userId = user?._id || "guest";

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const data = await api.get("/games");
      setGames(data);
    } catch (e) {
      showError("Nu am putut încarca jocurile");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGames();
    setRefreshing(false);
  };

  const playGame = (game) => {
    const screen = gameScreens[game.gameKey] || "QuizGame";
    navigation.navigate(screen, {
      gameKey: game.gameKey,
      gameName: game.name,
    });
  };

  const viewLeaderboard = (game) => {
    navigation.navigate("Leaderboard", {
      gameKey: game.gameKey,
      gameName: game.name,
    });
  };

  const openPrayRealm = () => {
    setShowPrayRealm(true);
  };

  const closePrayRealm = () => {
    setShowPrayRealm(false);
  };

  const renderGame = ({ item }) => (
    <View style={styles.gameCard}>
      {item.multiplayer && (
        <View style={styles.multiplayerBadge}>
          <Text style={styles.multiplayerText}>👥 Multiplayer</Text>
        </View>
      )}
      <View style={styles.gameGradient}>
        <Text style={styles.gameEmoji}>{gameEmojis[item.gameKey] || "🎮"}</Text>
        <Text style={styles.gameName}>{item.name}</Text>
        <Text style={styles.gameDescription}>{item.description}</Text>

        <View style={styles.gameStats}>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => viewLeaderboard(item)}
          >
            <Text style={styles.statValue}>🏆</Text>
            <Text style={styles.statLabel}>Clasament</Text>
          </TouchableOpacity>
          <View style={styles.stat}>
            <Text style={styles.statValue}>⭐</Text>
            <Text style={styles.statLabel}>Puncte</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => playGame(item)}
          accessibilityRole="button"
          accessibilityLabel={`Joaca ${item.name}`}
        >
          <Text>🎮</Text>
          <Text style={styles.playButtonText}>Joaca acum</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrayRealmIcon = () => (
    <View style={prayRealmStyles.container}>
      <TouchableOpacity
        style={prayRealmStyles.iconButton}
        onPress={openPrayRealm}
        activeOpacity={0.7}
      >
        <Image
          source={PRAY_REALM_ICON}
          style={prayRealmStyles.icon}
          resizeMode="contain"
        />
        <Text style={prayRealmStyles.gameName}>Kingdom War</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={headerGradient.colors}
        start={headerGradient.start}
        end={headerGradient.end}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <Ionicons name="game-controller" size={28} color="#fff" />
          <Text style={styles.gradientHeaderTitle}>JOCURI</Text>
        </View>
      </LinearGradient>

      <View style={styles.screenBg}>
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={(item) => item._id || item.gameKey}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderPrayRealmIcon}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      </View>

      <Modal
        visible={showPrayRealm}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closePrayRealm}
      >
        {/* key={userId} forțează remontarea completă când user-ul se schimbă */}
        <PrayRealmNavigator
          key={userId}
          userId={userId}
          userAvatar={user?.personalData?.profilePicture}
          onExit={closePrayRealm}
        />
      </Modal>
    </View>
  );
};

const prayRealmStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: "flex-start",
  },
  iconButton: {
    alignItems: "center",
  },
  icon: {
    width: 62,
    height: 80,
    borderRadius: 14,
  },
  gameName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4a3728",
    textAlign: "center",
    marginTop: 1,
  },
});
