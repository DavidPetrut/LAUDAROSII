import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, TiledBackground } from "../../../global/components";
import { useToast, useAuth } from "../../../global/context";
import { api } from "../../../global/functions";
import { devotionalStyles as styles } from "./devotionalStyles";
import { HomeView, PrayerSetupModal, getDailyQuote } from "./home";
import { DevotionalPlayer } from "./session";
import { DevotionalsView, BuilderView, ShareView, DevotionalRunner, devotionalsApi, TemplatesView, TemplateImportView, templatesApi } from "./devotionals";
import { PersonalHubView, ProgressView } from "./personal";
import { loadProgress } from "./devotionalProgress";
import { pickTracks } from "./trackFilter";

const BG_DARK = require("../../../public/images/dark-mode-small.png");

const TITLES = {
  home: "Devotional",
  personalHub: "Personale",
  devotionals: "Devotionalele mele",
  builder: "Devotional",
  share: "Distribuie",
  progress: "Progresul meu",
  templates: "Template-uri",
  templateImport: "Import template",
};

/**
 * Hub-ul Devotional: ecran principal cu citat + actiuni, plus zone interne
 * (devotionale, personale, progres, notificari) printr-un mic stack local.
 * Overlay-urile de sesiune (rugaciune / runner devotional) stau peste tot.
 */
export const DevotionalScreen = () => {
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();
  const canTemplate = can("templates.manage", "edit");
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState(null);
  const [devotionals, setDevotionals] = useState([]);
  const [quote, setQuote] = useState({ text: "", author: "" });
  const [stack, setStack] = useState([{ view: "home" }]);

  useEffect(() => {
    getDailyQuote().then(setQuote);
  }, []);

  const [prayerSetup, setPrayerSetup] = useState(false);
  const [prayerConfig, setPrayerConfig] = useState(null);
  const [running, setRunning] = useState(null);
  const [resume, setResume] = useState(null);

  const current = stack[stack.length - 1];
  const pickToday = (list) =>
    list.find((d) => d.dueToday) || list.find((d) => d.isDefault) || list[0] || null;
  const todaysDevotional = pickToday(devotionals);

  const reloadResume = useCallback(async () => {
    const dev = pickToday(devotionals);
    setResume(dev ? await loadProgress(dev._id) : null);
  }, [devotionals]);

  useEffect(() => {
    reloadResume();
  }, [reloadResume]);

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

  const saveTemplate = async (payload) => {
    try {
      await templatesApi.create(payload);
      showSuccess("Template creat");
      setStack([{ view: "home" }]);
    } catch (e) {
      showError?.(e.response?.data?.error || e.message || "Eroare la template");
    }
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
            defaultDevotional={todaysDevotional}
            hasAny={devotionals.length > 0}
            hasResume={!!resume}
            onToast={(m) => showSuccess(m)}
            onStartPrayer={() => setPrayerSetup(true)}
            onStartDevotional={(dev) => setRunning({ dev, resume })}
            onCreateDevotional={() => go("builder", { initial: null })}
            onGoDevotionals={() => go("devotionals")}
          />
        )}

        {current.view === "personalHub" && <PersonalHubView onNavigate={(v) => go(v)} />}

        {current.view === "devotionals" && (
          <DevotionalsView
            onCreate={() => go("builder", { initial: null })}
            onChooseTemplate={() => go("templates")}
            onEdit={(item) => go("builder", { initial: item })}
            onShare={(item) => go("share", { devotional: item })}
            onChanged={loadDevotionals}
          />
        )}

        {current.view === "templates" && (
          <TemplatesView onImport={(templateId) => go("templateImport", { templateId })} />
        )}

        {current.view === "templateImport" && (
          <TemplateImportView
            templateId={current.params.templateId}
            onDone={async () => {
              await loadDevotionals();
              setStack([{ view: "home" }]);
            }}
            onCancel={back}
          />
        )}

        {current.view === "builder" && (
          <BuilderView
            initial={current.params?.initial}
            devotionals={devotionals}
            canTemplate={canTemplate}
            onSaved={async () => {
              await loadDevotionals();
              back();
            }}
            onSaveTemplate={saveTemplate}
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
          tracks={pickTracks(program?.playlist, prayerConfig.category)}
          onComplete={() => {}}
          onExit={() => setPrayerConfig(null)}
        />
      )}

      {running && (
        <DevotionalRunner
          devotional={running.dev}
          program={program}
          resumeProgress={running.resume}
          onComplete={() => completeDevotional(running.dev)}
          onExit={() => {
            setRunning(null);
            reloadResume();
          }}
        />
      )}
    </View>
  );
};

export default DevotionalScreen;
