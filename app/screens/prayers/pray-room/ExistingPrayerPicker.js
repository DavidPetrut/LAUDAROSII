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
import { devotionalStyles as d } from "../timer/devotionalStyles";
import { api, showError } from "../../../global/functions";
import { prayerBoardsApi } from "../lists/prayerBoardsApi";
import { PUBLIC_LIST_IMAGE, resolveListImage } from "../lists/listImages";

/**
 * Alegerea unui motiv existent din listele userului (publica + private) pentru a-l
 * copia intr-o pray room. Pas 1: alegi lista; pas 2: alegi motivul si confirmi.
 * Copie independenta: textul/starea sunt trimise, nu o referinta la lista sursa.
 */
export const ExistingPrayerPicker = ({ visible, currentUserId, submitting, onClose, onPick }) => {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState([]);
  const [step, setStep] = useState("lists");
  const [activeList, setActiveList] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setStep("lists");
    setActiveList(null);
    setSelectedId(null);
    setLoading(true);
    (async () => {
      try {
        const [all, boardsRes] = await Promise.all([
          api.get("/prayers/personal"),
          prayerBoardsApi.list().catch(() => ({ boards: [] })),
        ]);
        const mine = (all || []).filter(
          (p) => p.userId?._id?.toString() === currentUserId?.toString() && !p.answered
        );
        const publicList = {
          key: "public",
          title: "Rugaciuni publice",
          image: PUBLIC_LIST_IMAGE,
          prayers: mine.map((p) => ({ _id: p._id, text: p.text, isUrgent: p.isUrgent, mood: p.mood })),
        };
        const privateLists = (boardsRes.boards || []).map((b) => ({
          key: b._id,
          title: b.title,
          image: resolveListImage(b.image),
          prayers: (b.prayers || [])
            .filter((p) => !p.answered)
            .map((p) => ({ _id: p._id, text: p.text, isUrgent: p.isUrgent, mood: p.mood })),
        }));
        setLists([publicList, ...privateLists]);
      } catch {
        showError("Nu s-au putut incarca listele");
        setLists([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, currentUserId]);

  const openList = (list) => {
    setActiveList(list);
    setSelectedId(null);
    setStep("motives");
  };

  const confirm = () => {
    const motive = activeList?.prayers.find((p) => p._id === selectedId);
    if (!motive) return;
    onPick({ text: motive.text, isUrgent: !!motive.isUrgent, mood: motive.mood || null });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={d.sheetBackdrop} onPress={onClose}>
        <Pressable style={d.sheet} onPress={() => {}}>
          <View style={d.sheetHandle} />

          {step === "lists" ? (
            <>
              <Text style={d.sheetTitle}>Alege lista</Text>
              {loading ? (
                <ActivityIndicator color="#10b981" style={{ marginVertical: 24 }} />
              ) : (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {lists.map((list) => (
                    <TouchableOpacity
                      key={list.key}
                      style={d.pickListRow}
                      onPress={() => openList(list)}
                      activeOpacity={0.85}
                    >
                      {list.image ? (
                        list.key === "public" ? (
                          <ImageBackground source={list.image} style={d.pickListThumb} imageStyle={{ borderRadius: 8 }} />
                        ) : (
                          <Image source={list.image} style={d.pickListThumb} />
                        )
                      ) : (
                        <View style={[d.pickListThumb, d.pickListThumbEmpty]}>
                          <Ionicons name="list" size={18} color="#94a3b8" />
                        </View>
                      )}
                      <Text style={d.pickListName} numberOfLines={1}>{list.title}</Text>
                      <Text style={[d.helperNote, { marginTop: 0 }]}>{list.prayers.length}</Text>
                      <Ionicons name="chevron-forward" size={20} color="rgba(229,231,235,0.5)" />
                    </TouchableOpacity>
                  ))}
                  {lists.length === 0 && (
                    <Text style={d.helperNote}>Nu ai motive salvate. Creeaza-ti liste in tabul Rugaciuni.</Text>
                  )}
                </ScrollView>
              )}
              <TouchableOpacity style={d.skipBtn} onPress={onClose}>
                <Text style={d.skipBtnText}>Anuleaza</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }} onPress={() => setStep("lists")}>
                <Ionicons name="chevron-back" size={20} color="#10b981" />
                <Text style={[d.skipBtnText, { color: "#10b981" }]}>Inapoi la liste</Text>
              </TouchableOpacity>
              <Text style={d.sheetTitle} numberOfLines={1}>{activeList?.title}</Text>
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {activeList?.prayers.map((p) => {
                  const sel = selectedId === p._id;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      style={[d.pickListRow, sel && d.pickListRowActive]}
                      onPress={() => setSelectedId(p._id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[d.pickListName, { fontWeight: "500" }]} numberOfLines={3}>{p.text}</Text>
                      {sel && <Ionicons name="checkmark-circle" size={22} color="#10b981" />}
                    </TouchableOpacity>
                  );
                })}
                {activeList?.prayers.length === 0 && (
                  <Text style={d.helperNote}>Lista nu are motive active.</Text>
                )}
              </ScrollView>
              <TouchableOpacity
                style={[d.startBtn, (!selectedId || submitting) && d.startBtnDisabled]}
                onPress={confirm}
                disabled={!selectedId || submitting}
                activeOpacity={0.9}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={d.startBtnText}>Adauga in camera</Text>}
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ExistingPrayerPicker;
