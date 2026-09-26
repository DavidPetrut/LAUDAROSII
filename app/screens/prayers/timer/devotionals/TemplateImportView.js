import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { showError, showSuccess } from "../../../../global/functions";
import { DevotionalIcon } from "./DevotionalIcon";
import { PrayerListPickerModal } from "./PrayerListPickerModal";
import { NotificationEditModal } from "./NotificationEditModal";
import { templatesApi } from "./templatesApi";
import { devotionalsApi } from "./devotionalsApi";
import { syncDevotionalNotification } from "./devotionalNotify";

const MUSIC_OPTIONS = [
  { key: "none", label: "Fara muzica" },
  { key: "instrumental", label: "Instrumental" },
  { key: "lyrics", label: "Cu versuri" },
];

const DAYS = [
  { label: "Lu", wd: 2 },
  { label: "Ma", wd: 3 },
  { label: "Mi", wd: 4 },
  { label: "Jo", wd: 5 },
  { label: "Vi", wd: 6 },
  { label: "Sâ", wd: 7 },
  { label: "Du", wd: 1 },
];

const pad = (n) => n.toString().padStart(2, "0");

// Construieste lista de pasi in functie de ce a configurat creatorul template-ului
const buildSteps = (tpl) => {
  const steps = [];
  (tpl?.tasks || []).forEach((t, i) => {
    if (t.chooseList || t.chooseMusic) steps.push({ type: "moment", taskIndex: i });
    if (t.action?.required) steps.push({ type: "action", taskIndex: i });
  });
  if (tpl?.schedule?.weekdays?.length > 0) steps.push({ type: "days" });
  if (tpl?.notification?.enabled) steps.push({ type: "notif" });
  steps.push({ type: "review" });
  return steps;
};

/**
 * Import ghidat (wizard) al unui template: pas cu pas userul configureaza momentele
 * lasate pe "userul alege", confirma actiunile cerute de creator, accepta/modifica
 * zilele recomandate (cu detectarea conflictelor) si notificarea, apoi salveaza.
 */
export const TemplateImportView = ({ templateId, onDone, onCancel }) => {
  const [tpl, setTpl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myDevotionals, setMyDevotionals] = useState([]);
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState({});
  const [actions, setActions] = useState({});
  const [days, setDays] = useState([]);
  const [notif, setNotif] = useState({ enabled: false, message: "", hour: 8, minute: 0 });
  const [listPicker, setListPicker] = useState(false);
  const [notifEditor, setNotifEditor] = useState(false);
  const [dayError, setDayError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      templatesApi.get(templateId).then((r) => r.template),
      devotionalsApi.list().then((r) => r.devotionals || []).catch(() => []),
    ])
      .then(([template, list]) => {
        setTpl(template);
        setMyDevotionals(list);
        setDays(template?.schedule?.weekdays || []);
        if (template?.notification?.enabled) setNotif(template.notification);
        const initActions = {};
        (template?.tasks || []).forEach((t, i) => {
          if (t.action?.required) initActions[i] = true;
        });
        setActions(initActions);
      })
      .catch(() => showError("Nu am putut incarca template-ul"))
      .finally(() => setLoading(false));
  }, [templateId]);

  const steps = useMemo(() => (tpl ? buildSteps(tpl) : []), [tpl]);

  const occupiedBy = useMemo(() => {
    const map = {};
    myDevotionals.forEach((d) => {
      (d.schedule?.weekdays || []).forEach((wd) => {
        if (!map[wd]) map[wd] = d.name;
      });
    });
    return map;
  }, [myDevotionals]);

  const setChoice = (taskIndex, patch) =>
    setChoices((prev) => ({ ...prev, [taskIndex]: { ...prev[taskIndex], ...patch } }));

  const toggleDay = (wd) => {
    if (occupiedBy[wd] && !days.includes(wd)) {
      setDayError(`Ziua e deja ocupată de „${occupiedBy[wd]}". Alege alta sau eliber-o întâi.`);
      return;
    }
    setDayError("");
    setDays((prev) => (prev.includes(wd) ? prev.filter((x) => x !== wd) : [...prev, wd]));
  };

  const save = async () => {
    setSaving(true);
    try {
      const tasks = (tpl.tasks || []).map((t, i) => {
        const c = choices[i] || {};
        const music = t.chooseMusic
          ? c.music && c.music !== "none"
            ? { enabled: true, category: c.music }
            : { enabled: false, category: "instrumental" }
          : t.music;
        const prayerList = t.chooseList ? c.prayerList || { kind: null } : t.prayerList;
        const action = t.action?.required
          ? { required: actions[i] !== false, description: t.action.description || "" }
          : { required: false, description: "" };
        return {
          title: t.title,
          icon: t.icon,
          iconSet: t.iconSet,
          color: t.color,
          durationMin: t.durationMin,
          music,
          prayerList,
          action,
        };
      });
      const res = await devotionalsApi.create({
        name: tpl.name,
        icon: tpl.icon,
        iconSet: tpl.iconSet,
        color: tpl.color,
        image: tpl.image,
        tasks,
        schedule: { weekdays: days, repeatWeekly: tpl.schedule?.repeatWeekly !== false },
        notification: notif,
      });
      await syncDevotionalNotification(res.devotional);
      showSuccess("Template importat");
      onDone?.();
    } catch (e) {
      showError(e.message || "Eroare la import");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }
  if (!tpl) {
    return (
      <View style={styles.emptyPersonal}>
        <Text style={styles.introDesc}>Template indisponibil.</Text>
      </View>
    );
  }

  const current = steps[step] || { type: "review" };
  const isLast = step === steps.length - 1;
  const goNext = () => (isLast ? save() : setStep((s) => s + 1));
  const goBack = () => (step === 0 ? onCancel() : setStep((s) => s - 1));

  const renderStepDots = () => (
    <View style={styles.wizardSteps}>
      {steps.map((s, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <View style={[styles.wizardConn, idx <= step && styles.wizardConnDone]} />}
          <View style={[styles.wizardDot, idx === step && styles.wizardDotActive, idx < step && styles.wizardDotDone]}>
            {idx < step ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : (
              <Text style={[styles.wizardDotText, idx === step && styles.wizardDotTextActive]}>{idx + 1}</Text>
            )}
          </View>
        </React.Fragment>
      ))}
    </View>
  );

  const renderBody = () => {
    if (current.type === "moment") {
      const t = tpl.tasks[current.taskIndex];
      const c = choices[current.taskIndex] || {};
      return (
        <>
          <View style={styles.introCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <View style={[styles.devCardIcon, { backgroundColor: (t.color || "#10b981") + "22" }]}>
                <DevotionalIcon set={t.iconSet} name={t.icon} size={24} color={t.color || "#10b981"} />
              </View>
              <Text style={styles.introTitle}>{t.title}</Text>
            </View>
            <Text style={styles.introDesc}>
              {t.chooseList ? "Alege o listă de rugăciuni. " : ""}{t.chooseMusic ? "Alege muzica." : ""}
            </Text>
          </View>

          {t.chooseList && (
            <>
              <Text style={styles.stepLabel}>Lista de rugaciuni</Text>
              <TouchableOpacity style={styles.pickListRow} onPress={() => setListPicker(true)} activeOpacity={0.85}>
                <View style={[styles.pickListThumb, styles.pickListThumbEmpty]}>
                  <Ionicons name="list" size={18} color="#94a3b8" />
                </View>
                <Text style={styles.pickListName}>
                  {c.prayerList?.kind === "public" ? "Rugaciuni publice" : c.prayerList?.kind === "church" ? "Rugaciunile bisericii" : c.prayerList?.kind ? "Lista aleasa" : "Alege o lista"}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="rgba(229,231,235,0.5)" />
              </TouchableOpacity>
            </>
          )}

          {t.chooseMusic && (
            <>
              <Text style={styles.stepLabel}>Muzica</Text>
              <View style={styles.chipsRow}>
                {MUSIC_OPTIONS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.chip, (c.music || "none") === m.key && styles.chipActive]}
                    onPress={() => setChoice(current.taskIndex, { music: m.key })}
                  >
                    <Text style={[styles.chipText, (c.music || "none") === m.key && styles.chipTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </>
      );
    }

    if (current.type === "action") {
      const t = tpl.tasks[current.taskIndex];
      const yes = actions[current.taskIndex] !== false;
      return (
        <>
          <View style={styles.introCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <View style={[styles.devCardIcon, { backgroundColor: (t.color || "#10b981") + "22" }]}>
                <DevotionalIcon set={t.iconSet} name={t.icon} size={24} color={t.color || "#10b981"} />
              </View>
              <Text style={styles.introTitle}>{t.title}</Text>
            </View>
            <Text style={styles.introDesc}>
              {t.action?.description || "Creatorul îți cere să confirmi acest moment."}
            </Text>
          </View>
          <Text style={styles.stepLabel}>Incluzi acest moment ca acțiune?</Text>
          <View style={styles.optRow}>
            <TouchableOpacity
              style={[styles.optCard, yes && styles.optCardActive]}
              onPress={() => setActions((p) => ({ ...p, [current.taskIndex]: true }))}
            >
              <Text style={[styles.optCardText, yes && styles.optCardTextActive]}>Da</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optCard, !yes && styles.optCardActive]}
              onPress={() => setActions((p) => ({ ...p, [current.taskIndex]: false }))}
            >
              <Text style={[styles.optCardText, !yes && styles.optCardTextActive]}>Nu</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (current.type === "days") {
      return (
        <>
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>Zile recomandate</Text>
            <Text style={styles.introDesc}>
              Creatorul a recomandat aceste zile. Le poți păstra sau schimba. Zilele ocupate de alte devotionale sunt blocate.
            </Text>
          </View>
          <Text style={styles.stepLabel}>Zile</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d) => {
              const selected = days.includes(d.wd);
              const occupied = !!occupiedBy[d.wd] && !selected;
              return (
                <TouchableOpacity
                  key={d.wd}
                  style={[
                    styles.dayChip,
                    selected && { backgroundColor: tpl.color || "#10b981", borderColor: tpl.color || "#10b981" },
                    occupied && { opacity: 0.4 },
                  ]}
                  onPress={() => toggleDay(d.wd)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{d.label}</Text>
                  {occupied && <Ionicons name="lock-closed" size={10} color="#94a3b8" style={{ marginTop: 2 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
          {!!dayError && <Text style={styles.errorNote}>{dayError}</Text>}
        </>
      );
    }

    if (current.type === "notif") {
      return (
        <>
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>Notificare recomandată</Text>
            <Text style={styles.introDesc}>
              Creatorul a setat un memento. Îl poți personaliza sau scoate complet.
            </Text>
          </View>
          <View style={styles.repeatRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.repeatTitle}>Notificare</Text>
              <Text style={styles.repeatDesc}>
                {notif.enabled ? `${pad(notif.hour)}:${pad(notif.minute)} — ${notif.message || "memento"}` : "Dezactivată"}
              </Text>
            </View>
            {notif.enabled && (
              <TouchableOpacity style={styles.notifEditBtn} onPress={() => setNotifEditor(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="create-outline" size={22} color={tpl.color || "#10b981"} />
              </TouchableOpacity>
            )}
            <Switch
              value={notif.enabled}
              onValueChange={(v) => setNotif((n) => ({ ...n, enabled: v }))}
              trackColor={{ true: tpl.color || "#10b981", false: "rgba(255,255,255,0.2)" }}
              thumbColor="#fff"
            />
          </View>
        </>
      );
    }

    // review
    return (
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>{tpl.name}</Text>
        <Text style={styles.introDesc}>
          Gata! {tpl.tasks?.length || 0} momente
          {days.length ? ` · ${days.length} zile` : ""}
          {notif.enabled ? " · notificare activă" : ""}. Îl salvezi ca devotional al tău.
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      {renderStepDots()}
      {renderBody()}

      <TouchableOpacity
        style={[styles.startBtn, saving && styles.startBtnDisabled]}
        onPress={goNext}
        disabled={saving}
        activeOpacity={0.9}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.startBtnText}>{isLast ? "Salveaza" : "Continua"}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipBtn} onPress={goBack} disabled={saving}>
        <Text style={styles.skipBtnText}>{step === 0 ? "Anuleaza" : "Inapoi"}</Text>
      </TouchableOpacity>

      <PrayerListPickerModal
        visible={listPicker}
        selected={current.type === "moment" ? (choices[current.taskIndex]?.prayerList) : null}
        onSelect={(pl) => {
          if (current.type === "moment") setChoice(current.taskIndex, { prayerList: pl || { kind: null } });
          setListPicker(false);
        }}
        onClose={() => setListPicker(false)}
      />

      <NotificationEditModal
        visible={notifEditor}
        value={notif}
        onSave={(v) => {
          setNotif((n) => ({ ...n, ...v, enabled: true }));
          setNotifEditor(false);
        }}
        onClose={() => setNotifEditor(false)}
      />
    </ScrollView>
  );
};

export default TemplateImportView;
