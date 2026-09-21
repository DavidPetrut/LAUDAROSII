import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, showError, showSuccess } from "../../../global/functions";
import { listsStyles as styles } from "./listsStyles";
import { PrayerListRow } from "./PrayerListRow";
import { PrayerListDetail } from "./PrayerListDetail";
import { CreatePrayerListView } from "./CreatePrayerListView";
import { PrayerFormModal } from "./PrayerFormModal";
import { prayerBoardsApi } from "./prayerBoardsApi";
import { PUBLIC_LIST_IMAGE, resolveListImage } from "./listImages";

const MAX_BOARDS = 3;
const PUBLIC_TITLE = "Rugăciuni publice";
const RENEW_OPTIONS = [
  { key: 30, label: "O lună" },
  { key: 90, label: "3 luni" },
  { key: 180, label: "6 luni" },
];

/**
 * Selectorul de liste de rugaciuni (tabul RUGACIUNI): o grila cu maxim 4 rows
 * (1 lista publica fixa + max 3 liste private) fara scroll, plus sub-ecranele de
 * detaliu si de creare. Lista publica sta pe /prayers/personal; cele private au
 * propriul model (prayer-boards).
 */
export const PrayerListsView = ({ currentUserId, fabBottom = 28 }) => {
  const [view, setView] = useState({ name: "grid" });
  const [publicPrayers, setPublicPrayers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuBoard, setMenuBoard] = useState(null);
  const [renewBoard, setRenewBoard] = useState(null);
  const [form, setForm] = useState({ open: false, target: null });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [all, boardsRes] = await Promise.all([
        api.get("/prayers/personal"),
        prayerBoardsApi.list().catch(() => ({ boards: [] })),
      ]);
      const mine = (all || []).filter(
        (p) => p.userId?._id?.toString() === currentUserId?.toString() && !p.answered
      );
      setPublicPrayers(mine);
      setBoards(boardsRes.boards || []);
    } catch (e) {
      showError("Eroare la încărcare");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeBoard = view.name === "private" ? boards.find((b) => b._id === view.id) : null;

  // ---- Actiuni motive ----
  const submitPrayer = async (text, isUrgent, mood) => {
    setSubmitting(true);
    try {
      if (form.target === "public") {
        await api.post("/prayers/personal", { text, isUrgent, mood });
      } else {
        await prayerBoardsApi.addPrayer(form.target, { text, isUrgent, mood });
      }
      showSuccess("Adăugat!");
      setForm({ open: false, target: null });
      await loadAll();
    } catch (e) {
      showError(e.message || "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePublic = async (id) => {
    try {
      await api.delete(`/prayers/personal/${id}`);
      loadAll();
    } catch (e) {
      showError("Eroare");
    }
  };
  const answerPublic = async (id) => {
    try {
      await api.put(`/prayers/personal/${id}`, { answered: true });
      loadAll();
    } catch (e) {
      showError("Eroare");
    }
  };
  const deleteBoardPrayer = async (boardId, id) => {
    try {
      const res = await prayerBoardsApi.removePrayer(boardId, id);
      setBoards((prev) => prev.map((b) => (b._id === boardId ? res.board : b)));
    } catch (e) {
      showError("Eroare");
    }
  };
  const answerBoardPrayer = async (boardId, id) => {
    try {
      const res = await prayerBoardsApi.updatePrayer(boardId, id, { answered: true });
      setBoards((prev) => prev.map((b) => (b._id === boardId ? res.board : b)));
    } catch (e) {
      showError("Eroare");
    }
  };

  // ---- Actiuni liste ----
  const deleteBoard = (board) => {
    setMenuBoard(null);
    Alert.alert(
      "Ștergi lista?",
      `„${board.title}" și toate motivele ei vor fi șterse definitiv.`,
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Șterge",
          style: "destructive",
          onPress: async () => {
            try {
              await prayerBoardsApi.remove(board._id);
              setBoards((prev) => prev.filter((b) => b._id !== board._id));
              setView({ name: "grid" });
            } catch (e) {
              showError("Eroare la ștergere");
            }
          },
        },
      ]
    );
  };

  const renewBoardWith = async (days) => {
    const board = renewBoard;
    setRenewBoard(null);
    if (!board) return;
    try {
      const res = await prayerBoardsApi.renew(board._id, days);
      setBoards((prev) => prev.map((b) => (b._id === board._id ? res.board : b)));
    } catch (e) {
      showError("Eroare la reîncărcare");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#21c063" />
      </View>
    );
  }

  // ---- Sub-ecran: creare/editare ----
  if (view.name === "create") {
    return (
      <CreatePrayerListView
        initial={view.board}
        onSaved={async () => {
          await loadAll();
          setView({ name: "grid" });
        }}
        onCancel={() => setView({ name: "grid" })}
      />
    );
  }

  // ---- Sub-ecran: detaliu lista publica ----
  if (view.name === "public") {
    return (
      <>
        <PrayerListDetail
          title={PUBLIC_TITLE}
          prayers={publicPrayers}
          isPublic
          expired={false}
          canAdd={publicPrayers.length < 3}
          fabColor="#f59e0b"
          fabBottom={fabBottom}
          currentUserId={currentUserId}
          onBack={() => setView({ name: "grid" })}
          onAddPress={() => setForm({ open: true, target: "public" })}
          onDeletePrayer={deletePublic}
          onAnswerPrayer={answerPublic}
        />
        <PrayerFormModal
          visible={form.open}
          submitting={submitting}
          title="Motiv public (max 3)"
          onClose={() => setForm({ open: false, target: null })}
          onSubmit={submitPrayer}
        />
      </>
    );
  }

  // ---- Sub-ecran: detaliu lista privata ----
  if (view.name === "private" && activeBoard) {
    return (
      <>
        <PrayerListDetail
          title={activeBoard.title}
          prayers={activeBoard.prayers}
          isPublic={false}
          expired={activeBoard.expired}
          canAdd
          fabColor="#21c063"
          fabBottom={fabBottom}
          currentUserId={currentUserId}
          onBack={() => setView({ name: "grid" })}
          onAddPress={() => setForm({ open: true, target: activeBoard._id })}
          onDeletePrayer={(id) => deleteBoardPrayer(activeBoard._id, id)}
          onAnswerPrayer={(id) => answerBoardPrayer(activeBoard._id, id)}
          onReload={() => setRenewBoard(activeBoard)}
          onEnd={() => deleteBoard(activeBoard)}
        />
        <PrayerFormModal
          visible={form.open}
          submitting={submitting}
          title="Motiv privat"
          onClose={() => setForm({ open: false, target: null })}
          onSubmit={submitPrayer}
        />
        {renderRenewModal()}
      </>
    );
  }

  // ---- Grila principala (max 4 rows) ----
  function renderRenewModal() {
    return (
      <Modal visible={!!renewBoard} transparent animationType="fade" onRequestClose={() => setRenewBoard(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setRenewBoard(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuHeader}>Prelungește lista cu…</Text>
            {RENEW_OPTIONS.map((o) => (
              <TouchableOpacity key={o.key} style={styles.menuItem} onPress={() => renewBoardWith(o.key)}>
                <Ionicons name="time-outline" size={20} color="#e5e7eb" />
                <Text style={styles.menuItemText}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    );
  }

  const showAddRow = boards.length < MAX_BOARDS;

  return (
    <View style={styles.grid}>
      <PrayerListRow
        title={PUBLIC_TITLE}
        image={PUBLIC_LIST_IMAGE}
        isPublic
        expired={false}
        count={publicPrayers.length}
        onPress={() => setView({ name: "public" })}
      />

      {boards.map((b) => (
        <PrayerListRow
          key={b._id}
          title={b.title}
          image={resolveListImage(b.image)}
          isPublic={false}
          expired={b.expired}
          count={b.prayers?.length || 0}
          onPress={() => setView({ name: "private", id: b._id })}
          onLongPress={() => setMenuBoard(b)}
        />
      ))}

      {showAddRow && (
        <TouchableOpacity
          style={styles.addRow}
          onPress={() => setView({ name: "create", board: null })}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={30} color="#21c063" />
          <Text style={styles.addRowText}>Listă nouă</Text>
        </TouchableOpacity>
      )}

      <Modal visible={!!menuBoard} transparent animationType="fade" onRequestClose={() => setMenuBoard(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuBoard(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuHeader} numberOfLines={1}>{menuBoard?.title}</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const b = menuBoard;
                setMenuBoard(null);
                setView({ name: "create", board: b });
              }}
            >
              <Ionicons name="create-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuItemText}>Editează</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => deleteBoard(menuBoard)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: "#ef4444" }]}>Șterge</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {renderRenewModal()}
    </View>
  );
};

export default PrayerListsView;
