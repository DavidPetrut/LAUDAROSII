import React, { useState, useRef, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, Animated, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { DevotionalIcon } from "./DevotionalIcon";

const LONG_PRESS_MS = 450;
const DEFAULT_ROW_H = 68;

// Popover cu iconurile functiilor atasate unui moment. Se "umfla" ca un balon din
// dreptul butonului (origine jos) la deschidere si e "absorbit" la inchidere.
const ActionsPopover = ({ open, actions, onPick, onClosed }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(
        ({ finished }) => finished && onClosed?.()
      );
    }
  }, [open]);
  return (
    <Animated.View
      style={[
        styles.momentPopover,
        {
          opacity: anim,
          transformOrigin: "bottom center",
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        },
      ]}
    >
      {actions.map((a) => (
        <TouchableOpacity key={a.key} style={styles.momentPopItem} onPress={() => onPick(a)} activeOpacity={0.8}>
          <Ionicons name={a.icon} size={20} color={a.color} />
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

/**
 * Lista de momente ca timeline vertical, cu reordonare prin drag (long-press) si
 * un popover de actiuni pe moment cand are mai multe functii atasate.
 */
export const TaskTimeline = ({ tasks, accent = "#10b981", onEdit, onRemove, onAdd, onPickList, onPickMusic, onPickBible, onReorder, onDragActive }) => {
  const [menu, setMenu] = useState(null);
  const [popover, setPopover] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  // Deschide/inchide (toggle) popover-ul de actiuni al unui moment, cu animatie de iesire.
  const togglePopover = (i) => {
    if (popover === i && popoverOpen) setPopoverOpen(false);
    else {
      setPopover(i);
      setPopoverOpen(true);
    }
  };

  const dragIndexRef = useRef(null);
  const fromRef = useRef(0);
  const curRef = useRef(0);
  const rowHRef = useRef(DEFAULT_ROW_H);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const onDragActiveRef = useRef(onDragActive);
  onDragActiveRef.current = onDragActive;

  const dragY = useRef(new Animated.Value(0)).current;
  const offsets = useMemo(() => tasks.map(() => new Animated.Value(0)), [tasks.length]);

  // Aplica deplasarea (gap) celorlalte randuri in functie de slotul tinta curent.
  const applyOffsets = (target) => {
    const from = fromRef.current;
    const h = rowHRef.current;
    offsets.forEach((o, j) => {
      let to = 0;
      if (j !== from) {
        if (target > from && j > from && j <= target) to = -h;
        else if (target < from && j >= target && j < from) to = h;
      }
      Animated.spring(o, { toValue: to, useNativeDriver: true, friction: 10, tension: 80 }).start();
    });
  };

  const endDrag = () => {
    const from = fromRef.current;
    const to = curRef.current;
    const h = rowHRef.current;
    Animated.spring(dragY, { toValue: (to - from) * h, useNativeDriver: true, friction: 11, tension: 90 }).start(() => {
      dragIndexRef.current = null;
      setDragIndex(null);
      dragY.setValue(0);
      offsets.forEach((o) => o.setValue(0));
      if (to !== from) {
        const arr = [...tasksRef.current];
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        onReorderRef.current?.(arr);
      }
      onDragActiveRef.current?.(false);
    });
  };

  const beginDrag = (index) => {
    setPopover(null);
    setPopoverOpen(false);
    setMenu(null);
    fromRef.current = index;
    curRef.current = index;
    dragIndexRef.current = index;
    dragY.setValue(0);
    offsets.forEach((o) => o.setValue(0));
    setDragIndex(index);
    onDragActiveRef.current?.(true);
  };

  const responders = useMemo(
    () =>
      tasks.map((_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: () => dragIndexRef.current === index,
          onPanResponderMove: (e, g) => {
            dragY.setValue(g.dy);
            const steps = Math.round(g.dy / rowHRef.current);
            const target = Math.max(0, Math.min(tasksRef.current.length - 1, fromRef.current + steps));
            if (target !== curRef.current) {
              curRef.current = target;
              applyOffsets(target);
            }
          },
          onPanResponderRelease: endDrag,
          onPanResponderTerminate: endDrag,
        })
      ),
    [tasks.length]
  );

  const buildActions = (t, i) => {
    const color = t.color || accent;
    const arr = [];
    if (t.music?.enabled) arr.push({ key: "music", icon: "musical-notes", color, onPress: () => onPickMusic(i) });
    if (t.prayerList?.kind) arr.push({ key: "list", icon: "list", color: "#10b981", onPress: () => onPickList(i) });
    if (t.bible?.enabled) arr.push({ key: "bible", icon: "book", color, onPress: () => onPickBible(i) });
    return arr;
  };

  return (
    <View>
      {tasks.map((t, i) => {
        const color = t.color || accent;
        const actions = buildActions(t, i);
        const isDragging = dragIndex === i;
        const translateY = isDragging ? dragY : offsets[i];
        return (
          <Animated.View
            key={`${t.title}-${i}`}
            onLayout={(e) => { rowHRef.current = e.nativeEvent.layout.height || DEFAULT_ROW_H; }}
            style={[
              styles.tlRow,
              { transform: [{ translateY }] },
              isDragging && styles.tlRowDragging,
            ]}
            {...responders[i].panHandlers}
          >
            <Pressable
              style={styles.tlDragZone}
              onPress={() => onEdit(i)}
              onLongPress={() => beginDrag(i)}
              delayLongPress={LONG_PRESS_MS}
            >
              <Text style={styles.tlTime}>{t.durationMin}m</Text>
              <View style={styles.tlNodeCol}>
                {i > 0 && <View style={styles.tlLineTop} />}
                <View style={styles.tlLineBottom} />
                <View style={[styles.tlNode, { backgroundColor: color }]}>
                  <DevotionalIcon set={t.iconSet} name={t.icon} size={20} color="#fff" />
                </View>
              </View>
              <View style={styles.tlContent}>
                <Text style={styles.tlTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.tlMeta}>{t.durationMin} minute</Text>
              </View>
            </Pressable>

            <View style={styles.tlActions}>
              {actions.length >= 2 ? (
                <View style={styles.popoverAnchor}>
                  <TouchableOpacity
                    style={styles.tlActionsChip}
                    onPress={() => togglePopover(i)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name={actions[0].icon} size={13} color={actions[0].color} />
                    <Text style={styles.tlActionsCount}>{actions.length}</Text>
                  </TouchableOpacity>
                  {popover === i && (
                    <View style={styles.popoverCenter} pointerEvents="box-none">
                      <ActionsPopover
                        open={popoverOpen}
                        actions={actions}
                        onPick={(a) => { setPopoverOpen(false); a.onPress(); }}
                        onClosed={() => setPopover(null)}
                      />
                    </View>
                  )}
                </View>
              ) : actions.length === 1 ? (
                <TouchableOpacity style={styles.tlActionBtn} onPress={actions[0].onPress} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name={actions[0].icon} size={16} color={actions[0].color} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.tlActionBtn} onPress={() => setMenu(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="create-outline" size={16} color="rgba(229,231,235,0.7)" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => onRemove(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      <View style={styles.tlRow}>
        <Text style={styles.tlTime} />
        <View style={styles.tlNodeCol}>
          {tasks.length > 0 && <View style={styles.tlLineTop} />}
          <TouchableOpacity style={styles.tlAddNode} onPress={onAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.tlContent} onPress={onAdd} activeOpacity={0.8}>
          <Text style={styles.tlAddLabel}>Adaugă un moment</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuHeader} numberOfLines={1}>
              {menu !== null ? tasks[menu]?.title : ""}
            </Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { const i = menu; setMenu(null); onEdit(i); }}
            >
              <Ionicons name="create-outline" size={20} color="#e5e7eb" />
              <Text style={styles.menuItemText}>Editează momentul</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { const i = menu; setMenu(null); onPickList(i); }}
            >
              <Ionicons name="list-outline" size={20} color="#10b981" />
              <Text style={styles.menuItemText}>
                {menu !== null && tasks[menu]?.prayerList?.kind ? "Schimbă lista de rugăciuni" : "Adaugă listă de rugăciuni"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default TaskTimeline;
