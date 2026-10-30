/**
 * ALERTS tab (mobil). View-only pentru toți (alertsViewer.mine) + creare/management pentru editOrder.
 * Doar echipele alese primesc. Push-ul pleacă DOAR cu flagul de server (zero autonom). Fără upload de fișiere
 * pe mobil deocamdată (atașamente se adaugă de pe web; aici se văd).
 */
import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, StyleSheet, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showSuccess } from "../../../../global/functions";
import { pcApi } from "../../../api/pcApi";
import { pcColors } from "../../../theme";
import { PcButton, PcBottomSheet } from "../../../components";

const fmtDT = (d) => { try { return new Date(d).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; } };
const attIcon = (k) => (k === "image" ? "🖼" : k === "video" ? "▶" : k === "audio" ? "♪" : "▢");

export function AlertsTab({ planId }) {
  const insets = useSafeAreaInsets();
  const [canEdit, setCanEdit] = useState(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    pcApi.me().then((m) => alive && setCanEdit(!!(m?.capabilities?.editOrder))).catch(() => alive && setCanEdit(false));
    return () => { alive = false; };
  }, []));

  if (canEdit === null) return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />;
  return canEdit ? <Manage planId={planId} insets={insets} /> : <ViewOnly planId={planId} insets={insets} />;
}

/* ── View-only (toți) ── */
function ViewOnly({ planId, insets }) {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => { pcApi.alertsViewer.mine().then((r) => setList(r.alerts || [])).catch(() => setList([])); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (list === null) return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 30 }} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
      {!list.length ? <Text style={s.empty}>Nu ai nicio alertă.</Text> : list.map((a) => (
        <Pressable key={a.id} style={s.card} onPress={() => setOpen(a)}>
          <View style={s.cHead}>
            <Text style={s.cName}>{a.by?.name || "Alertă"}</Text>
            {a.acked ? <Text style={s.ack}>✓ citit</Text> : <Text style={s.new}>NOU</Text>}
          </View>
          <Text style={s.cTitle}>{a.title}</Text>
          {!!a.body && <Text style={s.cBody} numberOfLines={2}>{a.body}</Text>}
          <Text style={s.cAt}>{fmtDT(a.at)}</Text>
        </Pressable>
      ))}
      {open && <DetailSheet alert={open} onClose={() => setOpen(null)} />}
    </ScrollView>
  );
}

/* ── Creare + management (editOrder) ── */
function Manage({ planId, insets }) {
  const [teams, setTeams] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [teamIds, setTeamIds] = useState([]);
  const [links, setLinks] = useState([]);
  const [lnk, setLnk] = useState({ label: "", url: "" });
  const [schedAt, setSchedAt] = useState(""); // "YYYY-MM-DD HH:MM" opțional
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [seenFor, setSeenFor] = useState(null);

  const loadAlerts = useCallback(() => { pcApi.plans.alerts(planId).then((r) => setAlerts(r.alerts || [])).catch(() => {}); }, [planId]);
  useFocusEffect(useCallback(() => {
    pcApi.plans.teams(planId).then((r) => setTeams([...(r.myTeams || []), ...(r.otherTeams || [])].map((t) => ({ id: String(t.teamId), name: t.name })))).catch(() => {});
    loadAlerts();
  }, [planId, loadAlerts]));

  const toggleTeam = (id) => setTeamIds((x) => x.includes(id) ? x.filter((t) => t !== id) : [...x, id]);
  async function addLink() {
    const url = lnk.url.trim(); if (!url) return;
    let label = lnk.label.trim();
    if (!label) { try { const m = await pcApi.plans.linkMeta(planId, url); label = m?.title || url; } catch { label = url; } }
    setLinks((l) => [...l, { label, url }]); setLnk({ label: "", url: "" });
  }
  function reset() { setTitle(""); setBody(""); setTeamIds([]); setLinks([]); setSchedAt(""); setEditId(null); }
  function parseSched() {
    if (!schedAt.trim()) return null;
    const d = new Date(schedAt.replace(" ", "T"));
    if (isNaN(d.getTime())) { showError("Format dată: YYYY-MM-DD HH:MM"); return undefined; }
    return d.toISOString();
  }
  async function submit(scheduled) {
    if (!title.trim()) return showError("Scrie un titlu.");
    if (!teamIds.length) return showError("Alege cel puțin o echipă.");
    let scheduledAt = null;
    if (scheduled) { scheduledAt = parseSched(); if (scheduledAt === undefined) return; if (!scheduledAt) return showError("Completează data programării."); }
    setBusy(true);
    try {
      const payload = { title, body, teamIds, links, scheduledAt };
      if (editId) await pcApi.plans.updateAlert(planId, editId, payload);
      else await pcApi.plans.createAlert(planId, payload);
      showSuccess(scheduledAt ? "Alertă programată." : "Alertă trimisă.");
      reset(); loadAlerts();
    } catch (e) { showError(e?.message || "Eroare."); } finally { setBusy(false); }
  }
  function editAlert(a) { setEditId(a.id); setTitle(a.title); setBody(a.body); setTeamIds(a.teamIds || []); setLinks(a.links || []); setSchedAt(a.scheduledAt ? fmtDT(a.scheduledAt) : ""); }
  async function del(a) { try { await pcApi.plans.deleteAlert(planId, a.id); loadAlerts(); if (editId === a.id) reset(); } catch (e) { showError(e?.message || "Eroare."); } }
  async function sendNow(a) { try { await pcApi.plans.updateAlert(planId, a.id, { scheduledAt: null }); showSuccess("Trimisă acum."); loadAlerts(); } catch (e) { showError(e?.message || "Eroare."); } }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 60 }} keyboardShouldPersistTaps="handled">
      <Text style={s.formH}>{editId ? "Editează alerta" : "Alertă nouă"}</Text>
      <TextInput style={[s.inp, s.inpBig]} value={title} onChangeText={setTitle} placeholder="Titlu alertă" placeholderTextColor={pcColors.textMuted} />
      <TextInput style={[s.inp, s.ta]} value={body} onChangeText={setBody} placeholder="Descriere…" placeholderTextColor={pcColors.textMuted} multiline />

      <Text style={s.lbl}>Trimite către echipele (obligatoriu)</Text>
      <View style={s.chips}>
        {teams.map((t) => (
          <Pressable key={t.id} onPress={() => toggleTeam(t.id)} style={[s.chip, teamIds.includes(t.id) && s.chipOn]}>
            <Text style={[s.chipTxt, teamIds.includes(t.id) && s.chipTxtOn]}>{t.name}</Text>
          </Pressable>
        ))}
        {!teams.length && <Text style={s.muted}>Nicio echipă pe acest plan.</Text>}
      </View>

      <Text style={s.lbl}>Linkuri</Text>
      {links.map((l, i) => (
        <View key={i} style={s.chipline}><Text style={s.clTxt} numberOfLines={1}>🔗 {l.label}</Text><Pressable onPress={() => setLinks((x) => x.filter((_, j) => j !== i))}><Ionicons name="close" size={16} color={pcColors.textMuted} /></Pressable></View>
      ))}
      <TextInput style={s.inp} value={lnk.label} onChangeText={(v) => setLnk((x) => ({ ...x, label: v }))} placeholder="Etichetă (auto din YouTube)" placeholderTextColor={pcColors.textMuted} />
      <View style={s.lnkRow}>
        <TextInput style={[s.inp, { flex: 1 }]} value={lnk.url} onChangeText={(v) => setLnk((x) => ({ ...x, url: v }))} placeholder="https://…" placeholderTextColor={pcColors.textMuted} autoCapitalize="none" />
        <PcButton title="Adaugă" variant="outline" onPress={addLink} />
      </View>

      <Text style={s.lbl}>Programare (opțional)</Text>
      <TextInput style={s.inp} value={schedAt} onChangeText={setSchedAt} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={pcColors.textMuted} autoCapitalize="none" />

      <View style={s.actions}>
        {editId && <PcButton title="Anulează" variant="outline" onPress={reset} />}
        {!!schedAt.trim() && <PcButton title="Programează" variant="outline" onPress={() => submit(true)} disabled={busy} />}
        <PcButton title={busy ? "..." : "Trimite acum"} onPress={() => submit(false)} disabled={busy} />
      </View>

      <Text style={[s.formH, { marginTop: 26 }]}>Alerte · {alerts.length}</Text>
      {!alerts.length ? <Text style={s.muted}>Nicio alertă încă.</Text> : alerts.map((a) => (
        <View key={a.id} style={s.card}>
          <View style={s.cHead}>
            <Text style={[s.st, a.status === "scheduled" ? s.stSched : s.stSent]}>{a.status === "scheduled" ? "PROGRAMATĂ" : "TRIMISĂ"}</Text>
            <Pressable onPress={() => setSeenFor(a)}><Text style={s.read}><Text style={s.seen}>✓ {a.ackCount}</Text>  <Text style={s.unseen}>○ {Math.max(0, a.recipientCount - a.ackCount)}</Text></Text></Pressable>
          </View>
          <Text style={s.cTitle}>{a.title}</Text>
          {!!a.body && <Text style={s.cBody} numberOfLines={2}>{a.body}</Text>}
          {a.status === "scheduled" && !!a.scheduledAt && <Text style={s.when}>⏰ {fmtDT(a.scheduledAt)}</Text>}
          <View style={s.cAct}>
            {a.status === "scheduled" && <Pressable onPress={() => sendNow(a)}><Text style={s.actSnd}>Trimite acum</Text></Pressable>}
            <Pressable onPress={() => editAlert(a)}><Text style={s.act}>Editează</Text></Pressable>
            <Pressable onPress={() => del(a)}><Text style={s.actDel}>Șterge</Text></Pressable>
          </View>
        </View>
      ))}

      {seenFor && <SeenSheet alert={seenFor} onClose={() => setSeenFor(null)} />}
    </ScrollView>
  );
}

function SeenSheet({ alert, onClose }) {
  const seen = alert.ackedPeople || [], notSeen = alert.pendingPeople || [];
  const Row = ({ p, ok }) => (
    <View style={s.sr}>
      {p.avatar ? <Image source={{ uri: p.avatar }} style={s.srAv} /> : <View style={[s.srAv, s.srAvDot]}><Text style={s.srAvTx}>{p.initials || "?"}</Text></View>}
      <Text style={s.srN} numberOfLines={1}>{p.name}</Text>
      <View style={[s.srB, ok ? s.srBok : s.srBno]}><Text style={ok ? s.srBokT : s.srBnoT}>{ok ? "✓ Văzut" : "✕ Nevăzut"}</Text></View>
    </View>
  );
  return (
    <PcBottomSheet visible onClose={onClose} maxHeightPct={0.7}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={s.sheetH}>Citit · {seen.length}/{seen.length + notSeen.length}</Text>
        {notSeen.length > 0 && <><Text style={s.lbl}>N-au văzut ({notSeen.length})</Text>{notSeen.map((p) => <Row key={p.id} p={p} ok={false} />)}</>}
        {seen.length > 0 && <><Text style={s.lbl}>Au văzut ({seen.length})</Text>{seen.map((p) => <Row key={p.id} p={p} ok />)}</>}
        {!seen.length && !notSeen.length && <Text style={s.muted}>Niciun destinatar.</Text>}
      </ScrollView>
    </PcBottomSheet>
  );
}

function DetailSheet({ alert, onClose }) {
  return (
    <PcBottomSheet visible onClose={onClose} maxHeightPct={0.85}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={s.cName}>{alert.by?.name || "Alertă"} · {fmtDT(alert.at)}</Text>
        <Text style={s.detailTitle}>{alert.title}</Text>
        {!!alert.body && <Text style={s.detailBody}>{alert.body}</Text>}
        {(alert.attachments || []).length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.lbl}>Atașamente</Text>
            {alert.attachments.map((a, i) => (
              a.kind === "image" && a.url ? <Pressable key={i} onPress={() => Linking.openURL(a.url)}><Image source={{ uri: a.url }} style={s.detailImg} /></Pressable>
                : <Pressable key={i} onPress={() => a.url && Linking.openURL(a.url)}><Text style={s.detailLink}>{attIcon(a.kind)} {a.name || a.url}</Text></Pressable>
            ))}
          </View>
        )}
        {(alert.links || []).length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.lbl}>Linkuri</Text>
            {alert.links.map((l, i) => <Pressable key={i} onPress={() => l.url && Linking.openURL(l.url)}><Text style={s.detailLink}>🔗 {l.label || l.url}</Text></Pressable>)}
          </View>
        )}
      </ScrollView>
    </PcBottomSheet>
  );
}

const DANGER = "#E5534B";
const s = StyleSheet.create({
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 30 },
  muted: { color: pcColors.textMuted, fontSize: 13, marginTop: 6 },
  formH: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 10 },
  lbl: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 16, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  inp: { color: pcColors.textPrimary, fontSize: 15, backgroundColor: pcColors.bgInput || "#1c222b", borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: pcColors.chipBorder, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  inpBig: { fontSize: 16, fontWeight: "600" },
  ta: { minHeight: 110, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipOn: { backgroundColor: pcColors.primary, borderColor: pcColors.primary },
  chipTxt: { color: pcColors.textSecondary, fontSize: 13 },
  chipTxtOn: { color: "#fff", fontWeight: "700" },
  chipline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: pcColors.bgInput || "#1c222b", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 6 },
  clTxt: { color: pcColors.textPrimary, fontSize: 13, flex: 1 },
  lnkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" },
  card: { backgroundColor: pcColors.bgCard || "#171c23", borderWidth: StyleSheet.hairlineWidth, borderColor: pcColors.divider, borderRadius: 12, padding: 14, marginBottom: 12 },
  cHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  cName: { color: pcColors.textSecondary, fontSize: 12.5, fontWeight: "600" },
  ack: { color: pcColors.product || "#57b98a", fontSize: 11, fontWeight: "700" },
  new: { color: "#fff", backgroundColor: DANGER, fontSize: 10, fontWeight: "800", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: "hidden" },
  cTitle: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  cBody: { color: pcColors.textSecondary, fontSize: 13.5, marginTop: 3, lineHeight: 19 },
  cAt: { color: pcColors.textMuted, fontSize: 11.5, marginTop: 7 },
  st: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, overflow: "hidden" },
  stSent: { color: pcColors.product || "#57b98a", borderColor: pcColors.product || "#57b98a" },
  stSched: { color: "#c9a227", borderColor: "#c9a227" },
  read: { fontSize: 12 },
  seen: { color: pcColors.product || "#57b98a", fontWeight: "700" },
  unseen: { color: pcColors.textMuted, fontWeight: "700" },
  when: { color: "#c9a227", fontSize: 12.5, marginTop: 7 },
  cAct: { flexDirection: "row", gap: 18, marginTop: 11 },
  act: { color: pcColors.textSecondary, fontSize: 13 },
  actSnd: { color: pcColors.primary, fontSize: 13, fontWeight: "700" },
  actDel: { color: DANGER, fontSize: 13 },
  sr: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  srAv: { width: 34, height: 34, borderRadius: 17 },
  srAvDot: { backgroundColor: pcColors.chipBorder, alignItems: "center", justifyContent: "center" },
  srAvTx: { color: pcColors.textPrimary, fontSize: 12, fontWeight: "700" },
  srN: { color: pcColors.textPrimary, fontSize: 14, flex: 1 },
  srB: { flexDirection: "row", alignItems: "center", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  srBok: { backgroundColor: "rgba(87,185,138,0.16)" },
  srBno: { backgroundColor: pcColors.bgInput || "#1c222b" },
  srBokT: { color: pcColors.product || "#57b98a", fontSize: 11.5, fontWeight: "700" },
  srBnoT: { color: pcColors.textMuted, fontSize: 11.5, fontWeight: "700" },
  sheetH: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", marginBottom: 6 },
  detailTitle: { color: pcColors.textPrimary, fontSize: 21, fontWeight: "800", marginTop: 10, marginBottom: 10 },
  detailBody: { color: pcColors.textSecondary, fontSize: 15, lineHeight: 23 },
  detailImg: { width: "100%", height: 180, borderRadius: 10, marginBottom: 8 },
  detailLink: { color: pcColors.primary, fontSize: 14.5, paddingVertical: 6 },
});

export default AlertsTab;
