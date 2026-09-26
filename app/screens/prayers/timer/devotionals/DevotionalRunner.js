import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, Platform, FlatList, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import { devotionalStyles as styles } from "../devotionalStyles";
import { PlayerControls } from "../session/PlayerControls";
import { DevotionalIcon } from "./DevotionalIcon";
import { useImmersive, useAuth } from "../../../../global/context";
import { api } from "../../../../global/functions";
import { loadFocusConfig, activateFocus, deactivateFocus } from "../../../../global/services";
import { prayerBoardsApi } from "../../lists/prayerBoardsApi";
import { useHorizontalSwipe } from "../useHorizontalSwipe";
import { useExitConfirm } from "../useExitConfirm";
import { ExitConfirm } from "../ExitConfirm";
import { SwipeToast } from "../SwipeToast";
import { saveProgress, clearProgress } from "../devotionalProgress";
import { pickTracks } from "../trackFilter";

const fmt = (total) => {
  const s = Math.max(0, total);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Ruleaza un devotional moment cu moment. Dupa ce trece timpul minim al unui
 * moment nu avanseaza automat: apare un buton fin cu numele momentului urmator,
 * apasat de user. Fiecare moment isi reda muzica proprie (daca e activata).
 */
export const DevotionalRunner = ({ devotional, program, resumeProgress, onComplete, onExit }) => {
  const insets = useSafeAreaInsets();
  const { setImmersive } = useImmersive();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const tasks = devotional.tasks || [];

  const startIndex =
    resumeProgress && resumeProgress.taskIndex >= 0 && resumeProgress.taskIndex < tasks.length
      ? resumeProgress.taskIndex
      : 0;

  const [index, setIndex] = useState(startIndex);
  const [remaining, setRemaining] = useState(
    resumeProgress?.remaining > 0 ? resumeProgress.remaining : (tasks[startIndex]?.durationMin || 1) * 60
  );
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [motives, setMotives] = useState([]);
  const [toast, setToast] = useState(null);

  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const readyRef = useRef(false);
  readyRef.current = ready;
  const indexRef = useRef(0);
  indexRef.current = index;
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const didInitRef = useRef(false);

  const tickRef = useRef(null);
  const exitedRef = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;

  const soundRef = useRef(null);
  const orderRef = useRef([]);
  const posRef = useRef(0);
  const activeRef = useRef(true);

  useEffect(() => {
    setImmersive(true);
    activeRef.current = true;
    loadFocusConfig().then(activateFocus);
    if (Platform.OS !== "web") ScreenOrientation.unlockAsync().catch(() => {});

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    tickRef.current = setInterval(() => {
      if (pausedRef.current || readyRef.current) return;
      setRemaining((prev) => {
        if (prev <= 1) {
          setReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      setImmersive(false);
      activeRef.current = false;
      deactivateFocus();
      if (tickRef.current) clearInterval(tickRef.current);
      stopMusic();
      if (Platform.OS !== "web") {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La schimbarea momentului: reseteaza timpul, opreste "ready", inchide modul lista
  // si porneste muzica lui. La primul mount cu progres salvat, pastreaza timpul reluat.
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      if (resumeProgress?.remaining > 0 && index === startIndex) {
        setReady(false);
        playTaskMusic(tasks[index]);
        return;
      }
    }
    setRemaining((tasks[index]?.durationMin || 1) * 60);
    setReady(false);
    setListMode(false);
    setMotives([]);
    playTaskMusic(tasks[index]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Incarca motivele listei atasate momentului curent (publica = ale userului,
  // privata = dintr-un board propriu) si deschide modul lista.
  const openList = async () => {
    setListMode(true);
    const pl = tasks[index]?.prayerList;
    try {
      if (pl?.kind === "public") {
        const all = await api.get("/prayers/personal");
        const mine = (all || []).filter(
          (p) => p.userId?._id?.toString() === user?._id?.toString() && !p.answered
        );
        setMotives(mine.map((p) => ({ id: p._id, text: p.text })));
      } else if (pl?.kind === "private" && pl.boardId) {
        const res = await prayerBoardsApi.list();
        const board = (res.boards || []).find((b) => String(b._id) === String(pl.boardId));
        const items = (board?.prayers || []).filter((p) => !p.answered);
        setMotives(items.map((p) => ({ id: p._id, text: p.text })));
      } else if (pl?.kind === "prayroom" && pl.roomId) {
        const room = await api.get(`/pray-rooms/${pl.roomId}`);
        setMotives((room?.prayers || []).map((p) => ({ id: p._id, text: p.text })));
      }
    } catch (e) {
      setMotives([]);
    }
  };

  const stopMusic = () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      try { s.pause(); s.remove(); } catch (e) {}
    }
  };

  const playAt = (i) => {
    if (!activeRef.current || orderRef.current.length === 0) return;
    if (i >= orderRef.current.length) {
      orderRef.current = shuffle(orderRef.current);
      i = 0;
    }
    posRef.current = i;
    const track = orderRef.current[i];
    try {
      stopMusic();
      const player = createAudioPlayer({ uri: track.url });
      if (!activeRef.current) { try { player.remove(); } catch (e) {} return; }
      soundRef.current = player;
      player.volume = 1;
      player.play();
      player.addListener("playbackStatusUpdate", (st) => {
        if (st?.didJustFinish) playAt(posRef.current + 1);
      });
    } catch (e) {
      if (activeRef.current) setTimeout(() => playAt(i + 1), 400);
    }
  };

  // Sare la piesa urmatoare / anterioara din ordinea random (cu wrap) si arata
  // titlul piesei noi ca toast, cu directia swipe-ului.
  const showTrackToast = (dir) => {
    const title = orderRef.current[posRef.current]?.title || "";
    if (title) setToast({ id: Date.now(), title, dir });
  };
  const nextTrack = () => {
    playAt(posRef.current + 1);
    showTrackToast("right");
  };
  const prevTrack = () => {
    const len = orderRef.current.length;
    if (len === 0) return;
    const target = posRef.current - 1;
    playAt(target < 0 ? len - 1 : target);
    showTrackToast("left");
  };

  const playTaskMusic = async (task) => {
    stopMusic();
    if (!task?.music?.enabled) return;
    const tracks = pickTracks(program?.playlist, task.music.category);
    if (tracks.length === 0) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: Platform.OS !== "web",
        interruptionMode: "doNotMix",
      });
    } catch (e) {}
    orderRef.current = shuffle(tracks);
    playAt(0);
  };

  const advance = () => {
    if (indexRef.current >= tasks.length - 1) {
      leave(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  const leave = async (completed) => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    await stopMusic();
    if (completed) {
      await clearProgress();
      onComplete?.();
    } else {
      await saveProgress(devotional._id, indexRef.current, remainingRef.current);
    }
    onExit?.();
  };

  const pause = () => {
    setPaused(true);
    try { soundRef.current?.pause(); } catch (e) {}
  };
  const resume = () => {
    setPaused(false);
    try { soundRef.current?.play(); } catch (e) {}
  };

  const task = tasks[index] || {};
  const accent = task.color || devotional.color || "#10b981";
  const isLast = index >= tasks.length - 1;
  const nextTask = tasks[index + 1];
  const hasList = !!task.prayerList?.kind;

  const hasMusic = !!task.music?.enabled;

  const swipe = useHorizontalSwipe({
    enabled: hasMusic,
    onSwipeRight: nextTrack,
    onSwipeLeft: prevTrack,
  });

  const exitConfirm = useExitConfirm({
    onExit: () => leave(false),
    onPause: pause,
    onResume: resume,
  });

  // Controalele compacte din modul lista: iconita momentului, timp, pauza si
  // butonul activ de lista (care inchide modul). Aceleasi elemente in portrait
  // (rand jos) si in landscape (coloana dreapta).
  const compactControls = (
    <>
      <View style={[styles.compactIcon, { backgroundColor: accent + "22" }]}>
        <DevotionalIcon set={task.iconSet} name={task.icon} size={22} color={accent} />
      </View>
      <Text style={styles.compactTime}>{fmt(remaining)}</Text>
      <TouchableOpacity style={styles.compactBtn} onPress={paused ? resume : pause} activeOpacity={0.85}>
        <Text style={{ color: "#d4d4d8", fontSize: 15 }}>{paused ? "▶" : "❚❚"}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.compactBtn, styles.compactBtnActive]}
        onPress={() => setListMode(false)}
        activeOpacity={0.85}
      >
        <Ionicons name="list" size={22} color="#10b981" />
      </TouchableOpacity>
    </>
  );

  const motivesList = (
    <FlatList
      data={motives}
      keyExtractor={(item) => item.id}
      style={styles.listMotives}
      contentContainerStyle={[
        styles.listMotivesContent,
        !landscape && { paddingBottom: 130 },
        landscape && { paddingLeft: insets.left + 28, paddingRight: 132 },
      ]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <View style={styles.listMotiveRow}>
          <Text style={styles.listMotiveText}>{item.text}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.listMotivesEmpty}>Nicio rugăciune în această listă.</Text>}
    />
  );

  const iconEl = (
    <Animated.View style={[styles.runnerIcon, { backgroundColor: accent + "22", transform: [{ scale: pulse }] }]}>
      <DevotionalIcon set={task.iconSet} name={task.icon} size={64} color={accent} />
    </Animated.View>
  );
  const titleEl = <Text style={styles.runnerTitle}>{task.title}</Text>;
  const timerEl = <Text style={styles.runnerTimer}>{fmt(remaining)}</Text>;
  const controlsEl = (
    <View style={[styles.runnerControlsRow, { marginTop: 32 }]}>
      <PlayerControls paused={paused} onPause={pause} onResume={resume} onStop={() => leave(false)} />
      {hasList && (
        <TouchableOpacity style={styles.runnerListBtn} onPress={openList} activeOpacity={0.85}>
          <Ionicons name="list" size={30} color="#d4d4d8" />
        </TouchableOpacity>
      )}
    </View>
  );
  const readyEl = ready ? (
    <TouchableOpacity style={[styles.runnerNextBtn, { borderColor: accent }]} onPress={advance} activeOpacity={0.85}>
      <Text style={[styles.runnerNextText, { color: accent }]}>
        {isLast ? "Termină" : nextTask?.title}
      </Text>
      <Ionicons name="arrow-forward" size={18} color={accent} />
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.overlay} {...swipe}>
      {landscape && !listMode ? (
        <View style={styles.runnerLandscape}>
          <View style={styles.runnerLandCol}>
            {iconEl}
            {titleEl}
          </View>
          <View style={styles.runnerLandCol}>
            {timerEl}
            {controlsEl}
            {readyEl}
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.runnerStep}>{index + 1} / {tasks.length}</Text>
          {iconEl}
          {titleEl}
          {timerEl}
          {controlsEl}
          {readyEl}
        </>
      )}

      <Text style={[styles.overlayHint, { bottom: insets.bottom + 24 }]}>
        {ready ? "Poți sta cât ai nevoie — apasă când ești gata." : "Următorul moment îl pornești tu."}
      </Text>

      {listMode && (
        <View style={styles.listMode}>
          {landscape ? (
            <View style={styles.listModeRow}>
              {motivesList}
              <View style={styles.compactBarLandscape}>{compactControls}</View>
            </View>
          ) : (
            <>
              {motivesList}
              <View style={[styles.compactBarPortrait, { bottom: insets.bottom + 20 }]}>
                {compactControls}
              </View>
            </>
          )}
        </View>
      )}

      <SwipeToast toast={toast} />

      <ExitConfirm visible={exitConfirm.visible} onStay={exitConfirm.stay} onExit={exitConfirm.exit} />
    </View>
  );
};

export default DevotionalRunner;
