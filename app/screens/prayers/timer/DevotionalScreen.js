import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, TiledBackground } from "../../../global/components";
import { useToast } from "../../../global/context";
import { api } from "../../../global/functions";
import { devotionalStyles as styles } from "./devotionalStyles";
import { HomeView, PrayerSetupModal, randomQuote } from "./home";
import { DevotionalPlayer } from "./session";
import { DevotionalsView, BuilderView, ShareView, DevotionalRunner, devotionalsApi } from "./devotionals";
import { PersonalHubView, ProgressView } from "./personal";

const BG_DARK = require("../../../public/images/dark-mode-small.png");

const TITLES = {
  home: "Devotional",
  personalHub: "Personale",
  devotionals: "Devotionalele mele",
  builder: "Devotional",
  share: "Distribuie",
  progress: "Progresul meu",
};

/**
 * Hub-ul Devotional: ecran principal cu citat + actiuni, plus zone interne
 * (devotionale, personale, progres, notificari) printr-un mic stack local.
 * Overlay-urile de sesiune (rugaciune / runner devotional) stau peste tot.
 */
export const DevotionalScreen = () => {
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState(null);
  const [devotionals, setDevotionals] = useState([]);
  const [quote] = useState(() => randomQuote());
  const [stack, setStack] = useState([{ view: "home" }]);

  const [prayerSetup, setPrayerSetup] = useState(false);
  const [prayerConfig, setPrayerConfig] = useState(null);
  const [running, setRunning] = useState(null);

  const current = stack[stack.length - 1];
  const defaultDevotional = devotionals.find((d) => d.isDefault) || devotionals[0] || null;

  const loadDevotionals = useCallback(async () => {
    try {
      const res = await devotionalsApi.list();
      setDevotionals(res.devotionals || []);
    } catch (e) {
      setDevotionals([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const prog = await api.get("/prayer-programs/worship").catch(() => null);
      if (!active) return;
      setProgram(prog);
      await loadDevotionals();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadDevotionals]);

  const go = (view, params = {}) => setStack((s) => [...s, { view, params }]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  const startPrayer = (config) => {
    setPrayerSetup(false);
    setPrayerConfig(config);
  };

  const completeDevotional = async (dev) => {
    try {
      await devotionalsApi.complete(dev._id);
      await loadDevotionals();
      showSuccess("Devotional completat");
    } catch (e) {}
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

  const headerRight =
    current.view === "home" ? (
      <TouchableOpacity onPress={() => go("personalHub")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="person-circle-outline" size={28} color="#fff" />
      </TouchableOpacity>
    ) : null;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={TITLES[current.view] || "Devotional"}
        onBack={stack.length > 1 ? back : undefined}
        rightComponent={headerRight}
      />

      <TiledBackground tileSource={BG_DARK} style={styles.bg}>
        {current.view === "home" && (
          <HomeView
            quote={quote}
            defaultDevotional={defaultDevotional}
            onToast={(m) => showSuccess(m)}
            onStartPrayer={() => setPrayerSetup(true)}
            onStartDevotional={(dev) => setRunning(dev)}
            onCreateDevotional={() => go("builder", { initial: null })}
          />
        )}

        {current.view === "personalHub" && <PersonalHubView onNavigate={(v) => go(v)} />}

        {current.view === "devotionals" && (
          <DevotionalsView
            onCreate={() => go("builder", { initial: null })}
            onEdit={(item) => go("builder", { initial: item })}
            onShare={(item) => go("share", { devotional: item })}
          />
        )}

        {current.view === "builder" && (
          <BuilderView
            initial={current.params?.initial}
            onSaved={async () => {
              await loadDevotionals();
              back();
            }}
            onCancel={back}
          />
        )}

        {current.view === "share" && (
          <ShareView devotional={current.params.devotional} onDone={back} onCancel={back} />
        )}

        {current.view === "progress" && <ProgressView />}
      </TiledBackground>

      <PrayerSetupModal
        visible={prayerSetup}
        program={program}
        onStart={startPrayer}
        onClose={() => setPrayerSetup(false)}
      />

      {prayerConfig && (
        <DevotionalPlayer
          durationMin={prayerConfig.minutes}
          withMusic={prayerConfig.withMusic}
          tracks={(program?.playlist || []).filter(
            (t) => t.category === prayerConfig.category && t.url
          )}
          onComplete={() => {}}
          onExit={() => setPrayerConfig(null)}
        />
      )}

      {running && (
        <DevotionalRunner
          devotional={running}
          onComplete={() => completeDevotional(running)}
          onExit={() => setRunning(null)}
        />
      )}
    </View>
  );
};

export default DevotionalScreen;
