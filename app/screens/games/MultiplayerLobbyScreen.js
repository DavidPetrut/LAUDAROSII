import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { useAuth } from "../../global/context";
import {
  getSocket,
  createRoom,
  joinRoom,
  startGame,
  leaveRoom,
} from "../../global/services";
import { ScreenHeader } from "../../global/components";
import { lobbyStyles as styles } from "./styles";

export const MultiplayerLobbyScreen = ({ route, navigation }) => {
  const { gameKey, gameName } = route.params;
  const { user } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    const socket = getSocket();

    socket.on("roomCreated", ({ roomId, players }) => {
      setRoomId(roomId);
      setPlayers(players);
      setIsHost(true);
      setInRoom(true);
    });

    socket.on("playerJoined", ({ players }) => {
      setPlayers(players);
    });

    socket.on("playerLeft", ({ players }) => {
      setPlayers(players);
    });

    socket.on("gameStarted", () => {
      navigation.replace("QuizGame", {
        gameKey,
        gameName,
        roomId,
        multiplayer: true,
      });
    });

    socket.on("error", ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off("roomCreated");
      socket.off("playerJoined");
      socket.off("playerLeft");
      socket.off("gameStarted");
      socket.off("error");
      leaveRoom();
    };
  }, []);

  const handleCreateRoom = () => {
    const userName = user?.personalData?.fullName || "Jucator";
    createRoom(gameKey, user?._id || user?.id, userName);
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      alert("Introdu codul camerei");
      return;
    }
    const userName = user?.personalData?.fullName || "Jucator";
    joinRoom(joinCode, user?._id || user?.id, userName);
    setInRoom(true);
    setRoomId(joinCode);
  };

  const handleStart = () => {
    if (players.length < 2) {
      alert("Așteapta cel puțin 2 jucatori");
      return;
    }
    startGame(roomId);
  };

  if (!inRoom) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={`🎮 ${gameName}`} subtitle="Multiplayer" />

        <View style={styles.content}>
          <TouchableOpacity style={styles.button} onPress={handleCreateRoom}>
            <Text style={styles.buttonText}>Creeaza Camera</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <Text style={styles.dividerText}>sau</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Cod camera"
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={handleJoinRoom}
          >
            <Text style={styles.buttonSecondaryText}>Intra în Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`📍 Camera: ${roomId.slice(-6)}`}
        subtitle={`${players.length} jucatori așteptând...`}
      />

      <FlatList
        data={players}
        keyExtractor={(item) => item.userId}
        renderItem={({ item, index }) => (
          <View style={styles.playerRow}>
            <Text style={styles.playerEmoji}>{index === 0 ? "👑" : "👤"}</Text>
            <Text style={styles.playerName}>{item.userName}</Text>
            <Text style={styles.playerScore}>{item.score} pct</Text>
          </View>
        )}
        style={styles.playerList}
      />

      {isHost && (
        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>Începe Jocul!</Text>
        </TouchableOpacity>
      )}

      {!isHost && (
        <Text style={styles.waitText}>Așteapta ca host-ul sa înceapa...</Text>
      )}

      <TouchableOpacity
        style={styles.leaveBtn}
        onPress={() => {
          leaveRoom();
          navigation.goBack();
        }}
      >
        <Text style={styles.leaveText}>Parasește Camera</Text>
      </TouchableOpacity>
    </View>
  );
};
