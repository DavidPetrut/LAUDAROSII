import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
  ImageBackground,
  Image,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

const BG_IMAGE = require("../../public/images/whit-bg2.png");
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../global/context";
import { UserAvatar } from "../../global/components";
import { headerGradient } from "../../public/styles/global";
import {
  api,
  showError,
  showSuccess,
  getTimeAgo,
} from "../../global/functions";
import { styles, modalStyles } from "./styles";

const REACTIONS = [
  { key: "thumbsup", emoji: "👍" },
  { key: "heart", emoji: "❤️" },
  { key: "pray", emoji: "🙏" },
  { key: "laugh", emoji: "😂" },
];

const BG_COLORS = [
  { key: "plain", color: null, label: "Plain" },
  { key: "blue", color: "#3b82f6" },
  { key: "green", color: "#10b981" },
  { key: "purple", color: "#8b5cf6" },
  { key: "orange", color: "#f59e0b" },
  { key: "red", color: "#ef4444" },
];

const getTimeRemaining = (expiresAt) => {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry - now;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} ${days === 1 ? "zi" : "zile"}`;
  return `${hours} ${hours === 1 ? "ora" : "ore"}`;
};

export const AnnouncementsScreen = ({ navigation }) => {
  const { isAdmin, user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    expiryDays: "7",
    bgColor: null,
    bgImage: null,
  });
  const [bgMode, setBgMode] = useState("color");
  const [reactedAnnouncements, setReactedAnnouncements] = useState({});
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const lastTapRef = useRef({});
  const deletingRef = useRef(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await api.get("/announcements");
      const list = (data.announcements || []).filter((a) => {
        if (!a.expiresAt) return true;
        return new Date(a.expiresAt) > new Date();
      });
      setAnnouncements(list);

      const reacted = {};
      list.forEach((a) => {
        if (a.reactions?.some((r) => r.userId === (user?._id || user?.id))) {
          reacted[a._id] = true;
        }
      });
      setReactedAnnouncements(reacted);
    } catch (error) {
      showError("Nu am putut încarca anunțurile");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  const handlePickBgImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return showError("Permisiunea pentru galerie este necesara");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setForm({ ...form, bgImage: base64, bgColor: null });
      }
    } catch (e) {
      showError("Eroare la selectare imagine");
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      showError("Completeaza toate campurile");
      return;
    }

    const days = parseInt(form.expiryDays) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    try {
      const payload = {
        title: form.title,
        body: form.body,
        expiresAt: expiresAt.toISOString(),
        bgColor: bgMode === "color" ? form.bgColor : null,
        bgImage: bgMode === "image" ? form.bgImage : null,
      };
      const newAnnouncement = await api.post("/announcements", payload);
      setAnnouncements([newAnnouncement, ...announcements]);
      setModalVisible(false);
      setForm({ title: "", body: "", expiryDays: "7", bgColor: null, bgImage: null });
      setBgMode("color");
      showSuccess("Anunt creat cu succes!");
    } catch (error) {
      showError(error.message);
    }
  };

  const handleDelete = async (id) => {
    deletingRef.current = true;

    const doDelete = async () => {
      try {
        await api.delete(`/announcements/${id}`);
        setAnnouncements(announcements.filter((a) => a._id !== id));
        showSuccess("Anunț șters!");
      } catch (e) {
        showError("Eroare la ștergere");
      }
      deletingRef.current = false;
    };

    if (Platform.OS === "web") {
      if (window.confirm("Ești sigur că vrei să ștergi acest anunț?")) {
        doDelete();
      } else {
        deletingRef.current = false;
      }
    } else {
      Alert.alert("Șterge anunț", "Ești sigur?", [
        {
          text: "Anuleaza",
          style: "cancel",
          onPress: () => {
            deletingRef.current = false;
          },
        },
        {
          text: "Șterge",
          style: "destructive",
          onPress: doDelete,
        },
      ]);
    }
  };

  const handleReact = async (announcementId, type) => {
    if (reactedAnnouncements[announcementId]) return;
    try {
      await api.post(`/announcements/${announcementId}/react`, { type });
      setReactedAnnouncements({
        ...reactedAnnouncements,
        [announcementId]: true,
      });
      setAnnouncements(
        announcements.map((a) => {
          if (a._id === announcementId) {
            const counts = { ...a.reactionCounts } || {};
            counts[type] = (counts[type] || 0) + 1;
            counts.total = (counts.total || 0) + 1;
            return { ...a, reactionCounts: counts };
          }
          return a;
        })
      );
      setSelectedAnnouncement(null);
    } catch (e) {
      showError("Eroare");
    }
  };

  const canReact = (item) => !reactedAnnouncements[item._id];

  const handleLongPress = (item) => {
    if (!canReact(item)) return;
    setSelectedAnnouncement(item._id);
  };

  const handlePress = (item) => {
    if (deletingRef.current) return;

    if (selectedAnnouncement) {
      setSelectedAnnouncement(null);
      return;
    }

    if (!canReact(item)) {
      navigation.navigate("AnnouncementDetail", { announcementId: item._id });
      return;
    }

    const now = Date.now();
    const lastTap = lastTapRef.current[item._id] || 0;
    if (now - lastTap < 400) {
      setSelectedAnnouncement(item._id);
      lastTapRef.current[item._id] = 0;
    } else {
      lastTapRef.current[item._id] = now;
    }
  };

  const renderAnnouncement = ({ item }) => {
    const timeRemaining = getTimeRemaining(item.expiresAt);
    const counts = item.reactionCounts || {};
    const hasReacted = reactedAnnouncements[item._id];
    const hasBg = !!item.bgColor;
    const author = item.authorId;

    const cardStyle = [styles.card, hasBg && { backgroundColor: item.bgColor }];

    const textColor = hasBg ? "#fff" : undefined;

    return (
      <View style={{ position: "relative", marginBottom: 12 }}>
        <Pressable
          style={cardStyle}
          onPress={() => handlePress(item)}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
        >
          <View style={styles.cardHeader}>
            <View style={styles.authorRow}>
              <UserAvatar
                profilePicture={author?.personalData?.profilePicture}
                size={28}
              />
              <Text style={[styles.authorName, hasBg && { color: "#fff" }]}>
                {author?.personalData?.fullName || "Admin"}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text
                style={[
                  styles.cardDate,
                  hasBg && { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                {getTimeAgo(item.date)}
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item._id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={[styles.cardTitle, hasBg && { color: "#fff" }]}>
            {item.title}
          </Text>
          <Text
            style={[
              styles.cardBody,
              hasBg && { color: "rgba(255,255,255,0.9)" },
            ]}
            numberOfLines={2}
          >
            {item.body}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.reactionsRow}>
              {counts.total > 0 &&
                REACTIONS.filter((r) => counts[r.key] > 0).map((r) => (
                  <View
                    key={r.key}
                    style={[
                      styles.reactionCount,
                      hasBg && { backgroundColor: "rgba(255,255,255,0.2)" },
                    ]}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    <Text
                      style={[styles.reactionNum, hasBg && { color: "#fff" }]}
                    >
                      {counts[r.key]}
                    </Text>
                  </View>
                ))}
            </View>

            {timeRemaining && (
              <View
                style={[
                  styles.expiryBadge,
                  hasBg && { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              >
                <Text style={[styles.expiryText, hasBg && { color: "#fff" }]}>
                  ⏱️ {timeRemaining}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        {selectedAnnouncement === item._id && canReact(item) && (
          <Pressable
            style={styles.reactionOverlay}
            onPress={() => setSelectedAnnouncement(null)}
          >
            <View style={styles.reactionBubble}>
              {REACTIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={styles.reactionBubbleBtn}
                  onPress={() => handleReact(item._id, r.key)}
                >
                  <Text style={styles.reactionBubbleEmoji}>{r.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={headerGradient.colors}
        start={headerGradient.start}
        end={headerGradient.end}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>ANUNȚURI</Text>
      </LinearGradient>

      <ImageBackground
        source={BG_IMAGE}
        style={styles.bgImage}
        imageStyle={styles.bgImageStyle}
        resizeMode="stretch"
      >
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>Niciun anunț momentan</Text>
            </View>
          }
        />
      </ImageBackground>

      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setModalVisible(false)}
          />
          <ScrollView style={modalStyles.content} bounces={false} keyboardShouldPersistTaps="handled">
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Anunț nou</Text>

            <TextInput
              style={modalStyles.input}
              placeholder="Titlu anunț"
              value={form.title}
              onChangeText={(v) => setForm({ ...form, title: v.slice(0, 27) })}
              maxLength={27}
            />

            <TextInput
              style={[modalStyles.input, modalStyles.textArea]}
              placeholder="Conținut anunț..."
              value={form.body}
              onChangeText={(v) => setForm({ ...form, body: v })}
              multiline
              numberOfLines={5}
            />

            <Text style={modalStyles.colorLabel}>Fundal:</Text>
            <View style={modalStyles.bgToggle}>
              <TouchableOpacity
                style={[modalStyles.bgToggleBtn, bgMode === "color" && modalStyles.bgToggleActive]}
                onPress={() => setBgMode("color")}
              >
                <Text style={[modalStyles.bgToggleText, bgMode === "color" && modalStyles.bgToggleTextActive]}>Culoare</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.bgToggleBtn, bgMode === "image" && modalStyles.bgToggleActive]}
                onPress={() => setBgMode("image")}
              >
                <Text style={[modalStyles.bgToggleText, bgMode === "image" && modalStyles.bgToggleTextActive]}>Imagine</Text>
              </TouchableOpacity>
            </View>

            {bgMode === "color" && (
              <View style={modalStyles.colorRow}>
                {BG_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      modalStyles.colorBtn,
                      c.color ? { backgroundColor: c.color } : modalStyles.colorPlain,
                      form.bgColor === c.color && modalStyles.colorActive,
                    ]}
                    onPress={() => setForm({ ...form, bgColor: c.color, bgImage: null })}
                  />
                ))}
              </View>
            )}

            {bgMode === "image" && (
              <View style={modalStyles.imagePickWrap}>
                <TouchableOpacity style={modalStyles.imagePickBtn} onPress={handlePickBgImage}>
                  <Text style={modalStyles.imagePickText}>
                    {form.bgImage ? "Schimba imaginea" : "Alege imagine"}
                  </Text>
                </TouchableOpacity>
                {form.bgImage && (
                  <Image source={{ uri: form.bgImage }} style={modalStyles.imagePreview} />
                )}
              </View>
            )}

            {(form.title || form.body) && (
              <View style={modalStyles.previewWrap}>
                <Text style={modalStyles.previewLabel}>Preview:</Text>
                <View style={[
                  modalStyles.previewCard,
                  form.bgColor && bgMode === "color" && { backgroundColor: form.bgColor },
                ]}>
                  {form.bgImage && bgMode === "image" && (
                    <Image source={{ uri: form.bgImage }} style={modalStyles.previewBgImg} />
                  )}
                  <Text style={[modalStyles.previewTitle, (form.bgColor || form.bgImage) && { color: "#fff" }]} numberOfLines={1}>
                    {form.title || "Titlu"}
                  </Text>
                  <Text style={[modalStyles.previewBody, (form.bgColor || form.bgImage) && { color: "rgba(255,255,255,0.85)" }]} numberOfLines={2}>
                    {form.body || "Continut..."}
                  </Text>
                </View>
              </View>
            )}

            <View style={modalStyles.expiryRow}>
              <Text style={modalStyles.expiryLabel}>Expira in:</Text>
              <TextInput
                style={modalStyles.expiryInput}
                value={form.expiryDays}
                onChangeText={(v) => setForm({ ...form, expiryDays: v })}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={modalStyles.expiryLabel}>zile</Text>
            </View>

            <TouchableOpacity style={modalStyles.button} onPress={handleCreate}>
              <Text style={modalStyles.buttonText}>Publica Anuntul</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};
