import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import { showError, showSuccess } from "../../../../global/functions";
import { DevotionalIcon } from "./DevotionalIcon";
import { PrayerListPickerModal } from "./PrayerListPickerModal";
import { templatesApi } from "./templatesApi";
import { devotionalsApi } from "./devotionalsApi";

const MUSIC_OPTIONS = [
  { key: "none", label: "Fara muzica" },
  { key: "instrumental", label: "Instrumental" },
  { key: "lyrics", label: "Cu versuri" },
];

/**
 * Import ghidat al unui template: userul configureaza pas cu pas momentele pe care
 * creatorul le-a lasat pe "userul alege" (lista si/sau muzica), apoi salveaza si
 * primeste un devotional propriu.
 */
export const TemplateImportView = ({ templateId, onDone, onCancel }) => {
  const [tpl, setTpl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState({});
  const [listPicker, setListPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    templatesApi
      .get(templateId)
      .then((r) => setTpl(r.template))
      .catch(() => showError("Nu am putut incarca template-ul"))
      .finally(() => setLoading(false));
  }, [templateId]);

  const chooseTasks = useMemo(
    () => (tpl?.tasks || []).map((t, i) => ({ t, i })).filter(({ t }) => t.chooseList || t.chooseMusic),
    [tpl]
  );

  const setChoice = (taskIndex, patch) =>
    setChoices((prev) => ({ ...prev, [taskIndex]: { ...prev[taskIndex], ...patch } }));

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
        return {
          title: t.title,
          icon: t.icon,
          iconSet: t.iconSet,
          color: t.color,
          durationMin: t.durationMin,
          music,
          prayerList,
        };
      });
      await devotionalsApi.create({
        name: tpl.name,
        icon: tpl.icon,
        iconSet: tpl.iconSet,
        color: tpl.color,
        image: tpl.image,
        tasks,
        schedule: { weekdays: [] },
      });
      showSuccess("Template importat");
      onDone?.();
    } catch (e) {
      showError(e.response?.data?.error || e.message || "Eroare la import");
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

  if (chooseTasks.length === 0) {
    return (
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>{tpl.name}</Text>
          <Text style={styles.introDesc}>Acest template e gata de folosit. Il salvezi ca devotional al tau.</Text>
        </View>
        <TouchableOpacity style={[styles.startBtn, saving && styles.startBtnDisabled]} onPress={save} disabled={saving} activeOpacity={0.9}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.startBtnText}>Importa</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={onCancel}>
          <Text style={styles.skipBtnText}>Anuleaza</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const { t, i } = chooseTasks[step];
  const c = choices[i] || {};
  const isLast = step === chooseTasks.length - 1;

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.runnerStep}>{step + 1} / {chooseTasks.length}</Text>

      <View style={styles.introCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <View style={[styles.devCardIcon, { backgroundColor: (t.color || "#10b981") + "22" }]}>
            <DevotionalIcon set={t.iconSet} name={t.icon} size={24} color={t.color || "#10b981"} />
          </View>
          <Text style={styles.introTitle}>{t.title}</Text>
        </View>
        <Text style={styles.introDesc}>
          Aici ai momentul „{t.title}". {t.chooseList ? "Alege o listă de rugăciuni." : ""} {t.chooseMusic ? "Alege muzica." : ""}
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
              {c.prayerList?.kind === "public" ? "Rugaciuni publice" : c.prayerList?.kind ? "Lista aleasa" : "Alege o lista"}
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
                onPress={() => setChoice(i, { music: m.key })}
              >
                <Text style={[styles.chipText, (c.music || "none") === m.key && styles.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.startBtn, saving && styles.startBtnDisabled]}
        onPress={() => (isLast ? save() : setStep((s) => s + 1))}
        disabled={saving}
        activeOpacity={0.9}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.startBtnText}>{isLast ? "Salveaza" : "Continua"}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipBtn} onPress={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}>
        <Text style={styles.skipBtnText}>{step === 0 ? "Anuleaza" : "Inapoi"}</Text>
      </TouchableOpacity>

      <PrayerListPickerModal
        visible={listPicker}
        selected={c.prayerList}
        onSelect={(pl) => { setChoice(i, { prayerList: pl || { kind: null } }); setListPicker(false); }}
        onClose={() => setListPicker(false)}
      />
    </ScrollView>
  );
};

export default TemplateImportView;
