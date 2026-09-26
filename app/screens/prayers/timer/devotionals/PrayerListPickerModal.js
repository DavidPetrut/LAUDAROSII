import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { prayerBoardsApi } from "../../lists/prayerBoardsApi";
import { api } from "../../../../global/functions";
import { PUBLIC_LIST_IMAGE, resolveListImage } from "../../lists/listImages";

/**
 * Alegerea unei liste de rugaciuni pentru un moment devotional: lista publica a
 * userului, listele private si camerele de rugaciune (fara "tragere la sort", care
 * nu are motive fixe). Cea selectata are border verde. Se poate scoate legatura.
 * Returneaza { kind, boardId, roomId } sau null.
 */
export const PrayerListPickerModal = ({ visible, selected, onSelect, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState([]);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([
      prayerBoardsApi.list().then((res) => res.boards || []).catch(() => []),
      api.get("/pray-rooms/my").then((r) => (r || []).filter((x) => x.roomType !== "roulette")).catch(() => []),
    ])
      .then(([b, r]) => { setBoards(b); setRooms(r); })
      .finally(() => setLoading(false));
  }, [visible]);

  const isPublicSel = selected?.kind === "public";
  const isChurchSel = selected?.kind === "church";
  const isBoardSel = (id) => selected?.kind === "private" && String(selected?.boardId) === String(id);
  const isRoomSel = (id) => selected?.kind === "prayroom" && String(selected?.roomId) === String(id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Alege o listă de rugăciuni</Text>

          {loading ? (
            <ActivityIndicator color="#10b981" style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepLabel}>Biserica</Text>
              <TouchableOpacity
                style={[styles.pickListRow, isChurchSel && styles.pickListRowActive]}
                onPress={() => onSelect({ kind: "church", boardId: null, roomId: null })}
                activeOpacity={0.85}
              >
                <View style={[styles.pickListThumb, styles.pickListThumbEmpty]}>
                  <Ionicons name="business" size={18} color="#94a3b8" />
                </View>
                <Text style={styles.pickListName} numberOfLines={1}>Rugăciunile bisericii</Text>
                {isChurchSel && <Ionicons name="checkmark-circle" size={22} color="#10b981" />}
              </TouchableOpacity>

              <Text style={styles.stepLabel}>Ale mele</Text>
              <TouchableOpacity
                style={[styles.pickListRow, isPublicSel && styles.pickListRowActive]}
                onPress={() => onSelect({ kind: "public", boardId: null, roomId: null })}
                activeOpacity={0.85}
              >
                <ImageBackground source={PUBLIC_LIST_IMAGE} style={styles.pickListThumb} imageStyle={{ borderRadius: 8 }} />
                <Text style={styles.pickListName} numberOfLines={1}>Rugăciuni publice</Text>
                {isPublicSel && <Ionicons name="checkmark-circle" size={22} color="#10b981" />}
              </TouchableOpacity>

              {boards.map((b) => {
                const src = resolveListImage(b.image);
                return (
                  <TouchableOpacity
                    key={b._id}
                    style={[styles.pickListRow, isBoardSel(b._id) && styles.pickListRowActive]}
                    onPress={() => onSelect({ kind: "private", boardId: b._id, roomId: null })}
                    activeOpacity={0.85}
                  >
                    {src ? (
                      <Image source={src} style={styles.pickListThumb} />
                    ) : (
                      <View style={[styles.pickListThumb, styles.pickListThumbEmpty]}>
                        <Ionicons name="list" size={18} color="#94a3b8" />
                      </View>
                    )}
                    <Text style={styles.pickListName} numberOfLines={1}>{b.title}</Text>
                    {isBoardSel(b._id) && <Ionicons name="checkmark-circle" size={22} color="#10b981" />}
                  </TouchableOpacity>
                );
              })}

              {rooms.length > 0 && <Text style={styles.stepLabel}>Camere de rugăciune</Text>}
              {rooms.map((room) => (
                <TouchableOpacity
                  key={room._id}
                  style={[styles.pickListRow, isRoomSel(room._id) && styles.pickListRowActive]}
                  onPress={() => onSelect({ kind: "prayroom", boardId: null, roomId: room._id })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.pickListThumb, styles.pickListThumbEmpty]}>
                    <Ionicons name="people" size={18} color="#94a3b8" />
                  </View>
                  <Text style={styles.pickListName} numberOfLines={1}>{room.name}</Text>
                  {isRoomSel(room._id) && <Ionicons name="checkmark-circle" size={22} color="#10b981" />}
                </TouchableOpacity>
              ))}

              {boards.length === 0 && rooms.length === 0 && (
                <Text style={styles.helperNote}>
                  Nu ai liste private sau camere. Creează-le în tabul Rugăciuni.
                </Text>
              )}
            </ScrollView>
          )}

          {selected?.kind && (
            <TouchableOpacity style={styles.skipBtn} onPress={() => onSelect(null)}>
              <Text style={[styles.skipBtnText, { color: "#f87171" }]}>Scoate lista</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default PrayerListPickerModal;
