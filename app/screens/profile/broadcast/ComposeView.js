import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { broadcastStyles as styles } from "./broadcastStyles";
import { colors } from "../../../public/styles/global";
import { useToast } from "../../../global/context";
import { broadcastApi } from "./broadcastApi";
import { ScheduleModal } from "./ScheduleModal";

const ROLE_OPTIONS = [
  { key: "user", label: "Membri" },
  { key: "admin", label: "Admini" },
  { key: "superadmin", label: "Super-admini" },
];
const MSG_MAX = 500;
const TITLE_MAX = 80;

/**
 * Compunerea unei notificari: audienta (roluri + statusuri, cu numar live),
 * titlu + mesaj (cu sabloane salvate), email si trimitere imediata sau programata.
 */
export const ComposeView = ({ onSent }) => {
  const { showSuccess, showError } = useToast();
  const [roles, setRoles] = useState([]);
  const [tags, setTags] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [count, setCount] = useState(null);
  const [sending, setSending] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplTitle, setTplTitle] = useState("");
  const debounce = useRef(null);

  const load = useCallback(async () => {
    try {
      const [t, tpl] = await Promise.all([broadcastApi.listTags(), broadcastApi.listTemplates()]);
      setCatalog(t.tags || []);
      setTemplates(tpl.templates || []);
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await broadcastApi.audience(tags, roles);
        setCount(res.count);
      } catch (e) { setCount(null); }
    }, 300);
  }, [tags, roles]);

  const toggle = (arr, setArr, v) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const send = async (sendAt) => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await broadcastApi.create({
        title: title.trim(),
        message: message.trim(),
        targetTags: tags,
        targetRoles: roles,
        sendEmail,
        sendAt: (sendAt || new Date()).toISOString(),
      });
      showSuccess(sendAt ? "Notificare programată" : "Notificare trimisă");
      setMessage("");
      setTitle("");
      onSent?.();
    } catch (e) {
      showError("Eroare", e.message || "Nu am putut trimite.");
    }
    setSending(false);
    setScheduleOpen(false);
  };

  const saveTemplate = async () => {
    if (!tplTitle.trim() || !message.trim()) return;
    try {
      await broadcastApi.createTemplate(tplTitle.trim(), message.trim());
      setSaveOpen(false);
      setTplTitle("");
      load();
      showSuccess("Șablon salvat");
    } catch (e) {}
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Cui te adresezi</Text>
      <View style={styles.chipsRow}>
        {ROLE_OPTIONS.map((r) => (
          <TouchableOpacity key={r.key} style={[styles.chip, roles.includes(r.key) && styles.chipActive]} onPress={() => toggle(roles, setRoles, r.key)}>
            <Text style={[styles.chipText, roles.includes(r.key) && styles.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
        {catalog.map((t) => (
          <TouchableOpacity key={t._id} style={[styles.chip, tags.includes(t.name) && styles.chipActive]} onPress={() => toggle(tags, setTags, t.name)}>
            <Text style={[styles.chipText, tags.includes(t.name) && styles.chipTextActive]}>{t.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.audiencePill}>
        <Ionicons name="people" size={14} color="#0ea5e9" />
        <Text style={styles.audienceText}>
          {count === null ? "…" : `${count} destinatari`}{roles.length + tags.length === 0 ? " (toți)" : ""}
        </Text>
      </View>

      {templates.length > 0 && (
        <>
          <Text style={styles.label}>Șabloane</Text>
          <View style={styles.chipsRow}>
            {templates.map((tpl) => (
              <TouchableOpacity key={tpl._id} style={styles.chip} onPress={() => setMessage(tpl.message)}>
                <Text style={styles.chipText}>{tpl.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Titlu (opțional)</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Anunț important" placeholderTextColor={colors.textMuted} maxLength={TITLE_MAX} />

      <Text style={styles.label}>Mesaj</Text>
      <TextInput style={[styles.input, styles.textArea]} value={message} onChangeText={setMessage} placeholder="Scrie mesajul notificării…" placeholderTextColor={colors.textMuted} maxLength={MSG_MAX} multiline />
      <View style={styles.rowBetween}>
        <TouchableOpacity onPress={() => message.trim() && setSaveOpen(true)}>
          <Text style={styles.linkText}>＋ Salvează ca șablon</Text>
        </TouchableOpacity>
        <Text style={styles.charCount}>{message.length}/{MSG_MAX}</Text>
      </View>

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchTitle}>Trimite și pe email</Text>
          <Text style={styles.switchDesc}>De la numele tău, prin adresa comună</Text>
        </View>
        <Switch value={sendEmail} onValueChange={setSendEmail} trackColor={{ true: "#0ea5e9", false: colors.border }} thumbColor="#fff" />
      </View>

      <TouchableOpacity style={[styles.primaryBtn, (!message.trim() || sending) && styles.disabled]} onPress={() => send(null)} disabled={!message.trim() || sending}>
        {sending ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send" size={18} color="#fff" /><Text style={styles.primaryBtnText}>Trimite acum</Text></>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.ghostBtn, !message.trim() && styles.disabled]} onPress={() => message.trim() && setScheduleOpen(true)} disabled={!message.trim()}>
        <Ionicons name="calendar" size={18} color="#0ea5e9" /><Text style={styles.ghostBtnText}>Programează</Text>
      </TouchableOpacity>

      <ScheduleModal visible={scheduleOpen} onConfirm={send} onClose={() => setScheduleOpen(false)} />

      <Modal visible={saveOpen} transparent animationType="fade" onRequestClose={() => setSaveOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSaveOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Salvează șablonul</Text>
            <TextInput style={styles.input} value={tplTitle} onChangeText={setTplTitle} placeholder="Titlu (ex: pentru botez)" placeholderTextColor={colors.textMuted} maxLength={60} autoFocus />
            <TouchableOpacity style={[styles.primaryBtn, !tplTitle.trim() && styles.disabled]} onPress={saveTemplate} disabled={!tplTitle.trim()}>
              <Text style={styles.primaryBtnText}>Salvează</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

export default ComposeView;
