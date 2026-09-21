import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { devotionalStyles as d } from "../timer/devotionalStyles";
import { listsStyles as styles } from "./listsStyles";
import { LIST_IMAGE_PRESETS, resolveListImage } from "./listImages";
import { prayerBoardsApi } from "./prayerBoardsApi";

const DURATIONS = [
  { key: 30, label: "O lună" },
  { key: 90, label: "3 luni" },
  { key: 180, label: "6 luni" },
  { key: "custom", label: "Custom" },
];

/**
 * Ecran de creare/editare a unei liste private: imagine + titlu (ca la devotionale)
 * si durata pana la expirare. La editare, durata nu se cere din nou (se pastreaza).
 */
export const CreatePrayerListView = ({ initial, onSaved, onCancel }) => {
  const editing = !!initial;
  const [title, setTitle] = useState(initial?.title || "");
  const [image, setImage] = useState(initial?.image || "");
  const [duration, setDuration] = useState(30);
  const [customDays, setCustomDays] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const source = resolveListImage(image);

  const upload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.4,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]?.base64) {
        setImage(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch (e) {}
  };

  const resolveDurationDays = () => {
    if (editing) return undefined;
    if (duration === "custom") {
      const n = parseInt(customDays, 10);
      return n > 0 ? n : 30;
    }
    return duration;
  };

  const canSave = title.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const payload = { title: title.trim(), image };
      const durationDays = resolveDurationDays();
      if (durationDays !== undefined) payload.durationDays = durationDays;
      const res = editing
        ? await prayerBoardsApi.update(initial._id, payload)
        : await prayerBoardsApi.create(payload);
      onSaved(res.board);
    } catch (e) {
      setError(e.message || "Nu am putut salva.");
      setSaving(false);
    }
  };

  return (
    <View style={styles.createWrap}>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.subBack} onPress={onCancel}>
          <Ionicons name="chevron-back" size={26} color="#e5e7eb" />
        </TouchableOpacity>
        <Text style={[styles.subTitle, { color: "#e5e7eb" }]}>
          {editing ? "Editează lista" : "Listă nouă"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.createContent} showsVerticalScrollIndicator={false}>
        <ImageBackground source={source || undefined} style={d.headerImage} imageStyle={d.headerImageRadius}>
          {!source && (
            <View style={d.headerImageEmpty}>
              <Ionicons name="image-outline" size={30} color="rgba(255,255,255,0.5)" />
              <Text style={d.headerImageEmptyText}>Alege o imagine</Text>
            </View>
          )}
          <View style={d.headerNameBar}>
            <TextInput
              style={d.headerNameInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nume listă"
              placeholderTextColor="rgba(255,255,255,0.5)"
              maxLength={60}
            />
          </View>
        </ImageBackground>

        <View style={d.presetRow}>
          {LIST_IMAGE_PRESETS.map((p) => {
            const active = image === `preset:${p.key}`;
            return (
              <TouchableOpacity
                key={p.key}
                style={[d.presetThumb, active && d.presetThumbActive]}
                onPress={() => setImage(`preset:${p.key}`)}
                activeOpacity={0.85}
              >
                <Image source={p.source} style={d.presetThumbImg} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={d.presetUpload} onPress={upload} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={22} color="#e5e7eb" />
            <Text style={d.presetUploadText}>Galerie</Text>
          </TouchableOpacity>
        </View>

        {!editing && (
          <>
            <Text style={styles.stepLabel}>Când expiră lista</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.durationChip, duration === opt.key && styles.durationChipActive]}
                  onPress={() => setDuration(opt.key)}
                >
                  <Text style={[styles.durationText, duration === opt.key && styles.durationTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {duration === "custom" && (
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  value={customDays}
                  onChangeText={(v) => setCustomDays(v.replace(/[^0-9]/g, ""))}
                  placeholder="ex. 45"
                  placeholderTextColor="rgba(229,231,235,0.4)"
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Text style={styles.customUnit}>zile</Text>
              </View>
            )}
          </>
        )}

        {!!error && <Text style={d.errorNote}>{error}</Text>}

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{editing ? "Salvează" : "Creează lista"}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Anulează</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default CreatePrayerListView;
