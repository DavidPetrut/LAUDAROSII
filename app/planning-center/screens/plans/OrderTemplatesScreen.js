/**
 * Șabloane de ORDER (mobil) — paritate cu web (OrderTemplateModal). ISTORIC-SAFE prin construcție:
 *  - „Aplică pe acest plan" operează DOAR pe acest planId (soft-delete itemii + recreare din șablon). Niciun alt plan atins.
 *  - „Rescrie din planul curent" scrie DOAR în pc_orderTemplates (nu atinge niciun PcPlanItem).
 *  - „Default" afectează DOAR crearea de planuri NOI.
 * Accesat din PlanScreen (⋮ → Șablon Order). Gated editOrder.
 */
import React, { useState, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showInfo, showConfirm } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcButton, PcBottomSheet, PcCheckbox } from "../../components";
import { usePc } from "../../navigation/PcContext";

export function OrderTemplatesScreen({ route, navigation }) {
  const { planId, serviceTypeId, serviceTypeName, orderTemplateId, planSortDate } = route.params || {};
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const canEdit = !!me?.capabilities?.editOrder;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderCount, setOrderCount] = useState(0);
  const [expanded, setExpanded] = useState(null);       // tid cu preview deschis
  const [preview, setPreview] = useState({});           // tid → items[]
  const [renameFor, setRenameFor] = useState(null);     // template obiect pt. redenumire
  const [nameInput, setNameInput] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);      // sheet „salvează ca nou"
  const [saveName, setSaveName] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  const [saveGlobal, setSaveGlobal] = useState(false);
  const [busy, setBusy] = useState(false);

  const planInPast = planSortDate ? new Date(planSortDate).getTime() < Date.now() : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, ord] = await Promise.all([
        pcApi.orderTemplates.list(serviceTypeId),
        pcApi.plans.order(planId).catch(() => ({ items: [] })),
      ]);
      setTemplates(r.templates || []);
      setOrderCount((ord.items || []).length);
    } catch (e) { showError(e?.message || "Eroare la șabloane."); }
    finally { setLoading(false); }
  }, [serviceTypeId, planId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const current = templates.find((t) => String(t.id) === String(orderTemplateId)) || templates.find((t) => t.isDefault) || null;

  const togglePreview = async (tid) => {
    if (expanded === tid) { setExpanded(null); return; }
    setExpanded(tid);
    if (!preview[tid]) {
      try { const d = await pcApi.orderTemplates.get(tid); setPreview((p) => ({ ...p, [tid]: d.items || [] })); }
      catch (e) { /* silent */ }
    }
  };

  const apply = (t) => {
    const warn = [];
    if (orderCount > 0) warn.push(`Ordinea actuală (${orderCount} iteme) va fi înlocuită complet.`);
    if (planInPast) warn.push("ATENȚIE: acest plan este în trecut.");
    showConfirm(
      `Aplică „${t.name}"`,
      `${warn.join(" ")}${warn.length ? " " : ""}Doar ACEST plan e afectat — planurile din istoric NU se ating.`,
      async () => {
        if (busy) return; setBusy(true);
        try { await pcApi.plans.applyOrderTemplate(planId, t.id); showInfo("Șablon aplicat pe acest plan."); navigation.goBack(); }
        catch (e) { showError(e?.message || "Eroare la aplicare."); }
        finally { setBusy(false); }
      },
    );
  };

  const overwrite = (t) => showConfirm(
    `Rescrie „${t.name}"`,
    "Șablonul va prelua structura ordinii din planul curent. Nu se atinge niciun plan — doar șablonul.",
    async () => {
      try { await pcApi.orderTemplates.overwrite(t.id, { planId }); setPreview((p) => ({ ...p, [t.id]: undefined })); showInfo("Șablon rescris."); load(); }
      catch (e) { showError(e?.message || "Eroare la rescriere."); }
    },
  );

  const makeDefault = async (t) => {
    try { await pcApi.orderTemplates.update(t.id, { isDefault: true }); load(); }
    catch (e) { showError(e?.message || "Eroare."); }
  };

  const del = (t) => showConfirm(
    `Șterge „${t.name}"`,
    "Șablonul se șterge. Planurile existente NU sunt afectate (păstrează copiile lor).",
    async () => {
      try { await pcApi.orderTemplates.remove(t.id); load(); }
      catch (e) { showError(e?.message || "Eroare la ștergere."); }
    },
  );

  const openRename = (t) => { setRenameFor(t); setNameInput(t.name || ""); };
  const doRename = async () => {
    const n = nameInput.trim(); if (!n || !renameFor) { setRenameFor(null); return; }
    try { await pcApi.orderTemplates.update(renameFor.id, { name: n }); setRenameFor(null); load(); }
    catch (e) { showError(e?.message || "Eroare la redenumire."); }
  };

  const doSaveAs = async () => {
    const n = saveName.trim(); if (!n) { showInfo("Dă un nume șablonului."); return; }
    if (busy) return; setBusy(true);
    try {
      await pcApi.orderTemplates.create({ planId, name: n, serviceTypeId: saveGlobal ? null : serviceTypeId, isDefault: saveDefault });
      setSaveOpen(false); setSaveName(""); setSaveDefault(false); setSaveGlobal(false);
      showInfo("Șablon salvat.");
      load();
    } catch (e) { showError(e?.message || "Eroare la salvare."); }
    finally { setBusy(false); }
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Șablon Order</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }} keyboardShouldPersistTaps="handled">
          {/* Notă istoric-safe */}
          <View style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={18} color={pcColors.primary} />
            <Text style={styles.noteTxt}>Șabloanele creează structură pentru planuri. Nu ating niciodată istoricul — „Aplică" schimbă DOAR acest plan.</Text>
          </View>

          {/* Șablon curent */}
          <Text style={styles.sectionLbl}>ȘABLONUL ACESTUI PLAN{serviceTypeName ? ` · ${serviceTypeName}` : ""}</Text>
          <View style={styles.currentCard}>
            <Ionicons name="bookmark" size={18} color={pcColors.primary} />
            <Text style={styles.currentName}>{current ? current.name : "— niciun șablon asociat —"}</Text>
            {current?.isDefault && <View style={styles.defTag}><Text style={styles.defTagTxt}>default</Text></View>}
          </View>

          {/* Listă șabloane */}
          <Text style={[styles.sectionLbl, { marginTop: 20 }]}>TOATE ȘABLOANELE</Text>
          {!templates.length ? (
            <Text style={styles.empty}>Niciun șablon încă. Salvează structura curentă ca primul șablon (jos).</Text>
          ) : templates.map((t) => {
            const open = expanded === t.id;
            const isCur = String(t.id) === String(current?.id);
            return (
              <View key={String(t.id)} style={[styles.tCard, isCur && styles.tCardCur]}>
                <Pressable style={styles.tTop} onPress={() => togglePreview(t.id)}>
                  <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={18} color={pcColors.textMuted} />
                  <Text style={styles.tName} numberOfLines={1}>{t.name}</Text>
                  {t.isDefault && <View style={styles.defTag}><Text style={styles.defTagTxt}>default</Text></View>}
                  <Text style={styles.tCount}>{t.itemCount} iteme</Text>
                </Pressable>

                {open && (
                  <View style={styles.tPreview}>
                    {preview[t.id] === undefined ? (
                      <ActivityIndicator color={pcColors.primary} style={{ marginVertical: 8 }} />
                    ) : preview[t.id].length ? (
                      preview[t.id].map((it, i) => (
                        <View key={i} style={styles.pRow}>
                          <Text style={styles.pType}>{it.type === "header" ? "§" : it.type === "song" ? "♪" : it.type === "transition" ? "⇄" : "•"}</Text>
                          <Text style={styles.pTitle} numberOfLines={1}>{it.title || "—"}</Text>
                          {!!it.keyName && <Text style={styles.pKey}>{it.keyName}</Text>}
                        </View>
                      ))
                    ) : <Text style={styles.empty}>Șablon gol.</Text>}
                  </View>
                )}

                {canEdit && (
                  <View style={styles.tActions}>
                    <PcButton title="Aplică pe acest plan" onPress={() => apply(t)} style={styles.applyBtn} textStyle={{ fontSize: 13 }} />
                    <View style={styles.tIcons}>
                      <Pressable style={styles.iconBtn} onPress={() => overwrite(t)} hitSlop={6}><Ionicons name="refresh" size={18} color={pcColors.textSecondary} /></Pressable>
                      {!t.isDefault && <Pressable style={styles.iconBtn} onPress={() => makeDefault(t)} hitSlop={6}><Ionicons name="star-outline" size={18} color={pcColors.textSecondary} /></Pressable>}
                      <Pressable style={styles.iconBtn} onPress={() => openRename(t)} hitSlop={6}><Ionicons name="create-outline" size={18} color={pcColors.textSecondary} /></Pressable>
                      <Pressable style={styles.iconBtn} onPress={() => del(t)} hitSlop={6}><Ionicons name="trash-outline" size={18} color={pcColors.danger} /></Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {canEdit && !loading && (
        <Pressable style={[styles.saveFab, { bottom: (insets.bottom || 10) + 16 }]} onPress={() => { setSaveName(""); setSaveDefault(false); setSaveGlobal(false); setSaveOpen(true); }}>
          <Ionicons name="add" size={20} color="#0A0A0A" />
          <Text style={styles.saveFabTxt}>Salvează structura curentă ca șablon</Text>
        </Pressable>
      )}

      {/* Redenumire */}
      <PcBottomSheet visible={!!renameFor} onClose={() => setRenameFor(null)} maxHeightPct={0.4}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={styles.sheetTitle}>Redenumește șablonul</Text>
          <TextInput style={styles.input} value={nameInput} onChangeText={setNameInput} placeholder="Nume șablon" placeholderTextColor={pcColors.textMuted} autoFocus />
          <PcButton title="Salvează" onPress={doRename} style={{ marginTop: 14 }} />
        </View>
      </PcBottomSheet>

      {/* Salvează ca nou */}
      <PcBottomSheet visible={saveOpen} onClose={() => setSaveOpen(false)} maxHeightPct={0.55}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={styles.sheetTitle}>Salvează ca șablon nou</Text>
          <Text style={styles.sheetSub}>Copiază structura ordinii din acest plan (fără persoane — rolurile se reiau din Matrix).</Text>
          <TextInput style={styles.input} value={saveName} onChangeText={setSaveName} placeholder="Nume (ex. Cină, Binecuvântare)" placeholderTextColor={pcColors.textMuted} autoFocus />
          <Pressable style={styles.optRow} onPress={() => setSaveDefault((v) => !v)}>
            <PcCheckbox checked={saveDefault} onPress={() => setSaveDefault((v) => !v)} size={20} />
            <Text style={styles.optTxt}>Setează ca default (doar pentru planuri NOI)</Text>
          </Pressable>
          <Pressable style={styles.optRow} onPress={() => setSaveGlobal((v) => !v)}>
            <PcCheckbox checked={saveGlobal} onPress={() => setSaveGlobal((v) => !v)} size={20} />
            <Text style={styles.optTxt}>Global (toate tipurile de serviciu){serviceTypeName ? ` — altfel doar „${serviceTypeName}"` : ""}</Text>
          </Pressable>
          <PcButton title={busy ? "Se salvează…" : "Salvează șablon"} onPress={doSaveAs} disabled={busy} style={{ marginTop: 14 }} />
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  note: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: pcColors.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: pcColors.divider },
  noteTxt: { flex: 1, color: pcColors.textSecondary, fontSize: 13, lineHeight: 19 },
  sectionLbl: { color: pcColors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 18, marginBottom: 8 },
  currentCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: pcColors.card, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: pcColors.primary },
  currentName: { flex: 1, color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  defTag: { backgroundColor: pcColors.tabActivePill, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  defTagTxt: { color: pcColors.primary, fontSize: 11, fontWeight: "800" },
  empty: { color: pcColors.textMuted, fontSize: 14, lineHeight: 20, paddingVertical: 8 },
  tCard: { backgroundColor: pcColors.card, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: pcColors.divider, overflow: "hidden" },
  tCardCur: { borderColor: pcColors.primary },
  tTop: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 13, paddingHorizontal: 12 },
  tName: { flex: 1, color: pcColors.textPrimary, fontSize: 15, fontWeight: "700" },
  tCount: { color: pcColors.textMuted, fontSize: 12 },
  tPreview: { paddingHorizontal: 14, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider, paddingTop: 8 },
  pRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  pType: { width: 16, textAlign: "center", color: pcColors.textMuted, fontSize: 13 },
  pTitle: { flex: 1, color: pcColors.textSecondary, fontSize: 13.5 },
  pKey: { color: "#fff", backgroundColor: "#6fa02e", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, fontSize: 12, fontWeight: "800" },
  tActions: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2 },
  applyBtn: { flex: 1, paddingVertical: 10 },
  tIcons: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: pcColors.input },
  saveFab: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: pcColors.primary, borderRadius: 14, paddingVertical: 15, elevation: 6 },
  saveFabTxt: { color: "#0A0A0A", fontSize: 15, fontWeight: "800" },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "800", marginBottom: 6 },
  sheetSub: { color: pcColors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  input: { backgroundColor: pcColors.input, borderWidth: 1, borderColor: pcColors.inputBorder, borderRadius: 10, color: pcColors.textPrimary, fontSize: 16, paddingVertical: 12, paddingHorizontal: 14 },
  optRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  optTxt: { flex: 1, color: pcColors.textPrimary, fontSize: 14 },
});

export default OrderTemplatesScreen;
