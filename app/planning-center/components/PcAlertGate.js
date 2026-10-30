/**
 * PcAlertGate (mobil) — pop-up OBLIGATORIU pentru Planning Center Alerts, pe ~80% din ecran.
 * Nu se poate închide până nu derulezi până jos, bifezi checkbox-ul ȘI apeși „Am înțeles" (→ ack pe server).
 * Face polling la /alerts/pending. Se montează o singură dată, global (în App.js), doar pentru user logat.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, View, Text, ScrollView, Pressable, Image, Linking, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pcApi } from "../api/pcApi";
import { pcColors } from "../theme";

const { height: SCREEN_H } = Dimensions.get("window");

function mergeQueue(prev, next) {
  const nextIds = new Set(next.map((a) => String(a.id)));
  const kept = prev.filter((a) => nextIds.has(String(a.id)));
  const keptIds = new Set(kept.map((a) => String(a.id)));
  const added = next.filter((a) => !keptIds.has(String(a.id)));
  return [...kept, ...added];
}

export function PcAlertGate() {
  const [queue, setQueue] = useState([]);
  const [atEnd, setAtEnd] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const sizes = useRef({ content: 0, view: 0 });

  const poll = useCallback(() => {
    pcApi.alertsViewer.pending().then((r) => setQueue((q) => mergeQueue(q, r.alerts || []))).catch(() => {});
  }, []);
  useEffect(() => { poll(); const t = setInterval(poll, 60000); return () => clearInterval(t); }, [poll]);

  const cur = queue[0] || null;
  useEffect(() => { setAtEnd(false); setChecked(false); }, [cur && cur.id]);

  const checkEnd = () => { if (sizes.current.view && sizes.current.content <= sizes.current.view + 6) setAtEnd(true); };
  const onScroll = (e) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 8) setAtEnd(true);
  };

  async function ack() {
    if (!cur || !atEnd || !checked || busy) return;
    setBusy(true);
    try { await pcApi.alertsViewer.ack(cur.id); setQueue((q) => q.filter((a) => String(a.id) !== String(cur.id))); }
    catch {} finally { setBusy(false); }
  }

  if (!cur) return null;
  const by = cur.by;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <View style={st.overlay}>
        <View style={[st.card, { maxHeight: SCREEN_H * 0.82 }]}>
          <View style={st.head}>
            {by && by.avatar ? (
              <Image source={{ uri: by.avatar }} style={st.av} />
            ) : (
              <View style={[st.av, st.avDot]}><Text style={st.avInit}>{(by && by.initials) || "!"}</Text></View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{(by && by.name) || "Planning Center"}</Text>
              <Text style={st.tag}>ALERTĂ · trebuie confirmată</Text>
            </View>
            <Ionicons name="alert-circle" size={26} color={pcColors.danger || "#E5534B"} />
          </View>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ padding: 18 }}
            onScroll={onScroll} scrollEventThrottle={16}
            onContentSizeChange={(w, h) => { sizes.current.content = h; checkEnd(); }}
            onLayout={(e) => { sizes.current.view = e.nativeEvent.layout.height; checkEnd(); }}
          >
            <Text style={st.title}>{cur.title}</Text>
            {!!cur.body && <Text style={st.body}>{cur.body}</Text>}

            {(cur.attachments || []).length > 0 && (
              <View style={st.sec}>
                <Text style={st.sl}>ATAȘAMENTE</Text>
                {cur.attachments.map((a, i) => (
                  a.kind === "image" && a.url ? (
                    <Pressable key={i} onPress={() => a.url && Linking.openURL(a.url)}><Image source={{ uri: a.url }} style={st.img} resizeMode="cover" /></Pressable>
                  ) : (
                    <Pressable key={i} onPress={() => a.url && Linking.openURL(a.url)}><Text style={st.link}>{a.kind === "video" ? "▶" : a.kind === "audio" ? "♪" : "▢"} {a.name || a.url}</Text></Pressable>
                  )
                ))}
              </View>
            )}
            {(cur.links || []).length > 0 && (
              <View style={st.sec}>
                <Text style={st.sl}>LINKURI</Text>
                {cur.links.map((l, i) => <Pressable key={i} onPress={() => l.url && Linking.openURL(l.url)}><Text style={st.link}>🔗 {l.label || l.url}</Text></Pressable>)}
              </View>
            )}
          </ScrollView>

          <View style={st.foot}>
            {!atEnd ? (
              <Text style={st.scrollHint}>Derulează până jos ca să confirmi ▾</Text>
            ) : (
              <Pressable style={st.check} onPress={() => setChecked((v) => !v)}>
                <View style={[st.box, checked && st.boxOn]}>{checked && <Ionicons name="checkmark" size={16} color="#fff" />}</View>
                <Text style={st.checkTxt}>Am citit și am înțeles această alertă</Text>
              </Pressable>
            )}
            <Pressable style={[st.ok, (!atEnd || !checked || busy) && st.okOff]} onPress={ack} disabled={!atEnd || !checked || busy}>
              <Text style={st.okTxt}>{busy ? "..." : "Am înțeles"}</Text>
            </Pressable>
            {queue.length > 1 && <Text style={st.more}>+{queue.length - 1} alte alerte</Text>}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const DANGER = "#E5534B";
const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", backgroundColor: pcColors.bgCard || "#1b212a", borderRadius: 16, borderWidth: 1.5, borderColor: DANGER, overflow: "hidden" },
  head: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider || "#232a33" },
  av: { width: 38, height: 38, borderRadius: 19 },
  avDot: { backgroundColor: DANGER, alignItems: "center", justifyContent: "center" },
  avInit: { color: "#fff", fontWeight: "800", fontSize: 15 },
  name: { color: pcColors.textPrimary, fontWeight: "700", fontSize: 15 },
  tag: { color: DANGER, fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginTop: 2 },
  title: { color: pcColors.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 10 },
  body: { color: pcColors.textSecondary, fontSize: 15, lineHeight: 23 },
  sec: { marginTop: 16 },
  sl: { color: pcColors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 7 },
  img: { width: "100%", height: 180, borderRadius: 10, marginBottom: 8 },
  link: { color: pcColors.primary, fontSize: 14.5, paddingVertical: 6 },
  foot: { padding: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider || "#232a33", gap: 12 },
  scrollHint: { color: pcColors.textMuted, fontSize: 13, textAlign: "center" },
  check: { flexDirection: "row", alignItems: "center", gap: 11 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: pcColors.chipBorder || "#2d3640", alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: DANGER, borderColor: DANGER },
  checkTxt: { color: pcColors.textPrimary, fontSize: 14, flex: 1 },
  ok: { backgroundColor: DANGER, borderRadius: 11, paddingVertical: 15, alignItems: "center" },
  okOff: { opacity: 0.4 },
  okTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  more: { color: pcColors.textMuted, fontSize: 12, textAlign: "center" },
});

export default PcAlertGate;
