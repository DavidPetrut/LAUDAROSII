import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { ScreenHeader } from "../../../global/components";
import { api } from "../../../global/functions";
import { devotionalStyles as styles } from "./devotionalStyles";
import { SessionSetup, DevotionalPlayer } from "./session";
import { GoalsQuiz, goalsApi, quizSkip } from "./goals";
import { PersonalScreen } from "./personal";
import { DevotionalNotificationsTab } from "./notifications";

const TABS = [
  { key: "session", label: "Sesiune" },
  { key: "personal", label: "Personale" },
  { key: "notifications", label: "Notificări" },
];

/**
 * Hub-ul Devotional: la prima intrare fara plan afiseaza quiz-ul de goluri (cu
 * skip). Apoi ofera trei zone interne - sesiunea de inchinare, statisticile
 * personale si memento-urile. Sesiunea porneste overlay-ul player-ului.
 */
export const DevotionalScreen = () => {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState(null);
  const [view, setView] = useState("session");
  const [tab, setTab] = useState("session");
  const [session, setSession] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [prog, active_] = await Promise.all([
          api.get("/prayer-programs/worship").catch(() => null),
          goalsApi.getActive().catch(() => ({ plan: null })),
        ]);
        if (!active) return;
        setProgram(prog);
        const skipped = await quizSkip.get();
        if (!active_.plan && !skipped) setView("quiz");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const startSession = (config) => setSession(config);

  const endSession = async (completed) => {
    if (completed) {
      try {
        await goalsApi.logSession();
      } catch (e) {}
    }
  };

  const goTab = (key) => {
    setTab(key);
    setView(key);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Devotional" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Se încarcă…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Devotional" />

      {view === "quiz" ? (
        <GoalsQuiz onDone={() => goTab("session")} />
      ) : (
        <>
          <View style={styles.tabBar}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
                onPress={() => goTab(t.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {view === "session" && <SessionSetup program={program} onStart={startSession} />}
          {view === "personal" && <PersonalScreen onCreatePlan={() => setView("quiz")} />}
          {view === "notifications" && <DevotionalNotificationsTab />}
        </>
      )}

      {session && (
        <DevotionalPlayer
          durationMin={session.minutes}
          withMusic={session.withMusic}
          tracks={(program?.playlist || []).filter(
            (t) => t.category === session.category && t.url
          )}
          onComplete={() => endSession(true)}
          onExit={() => setSession(null)}
        />
      )}
    </View>
  );
};

export default DevotionalScreen;
