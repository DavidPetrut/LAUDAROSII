import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { broadcastStyles as styles } from "./broadcastStyles";
import { broadcastApi } from "./broadcastApi";

const STATUS = {
  pending: { label: "Programată", bg: "rgba(245,158,11,0.15)", color: "#d97706" },
  sent: { label: "Trimisă", bg: "rgba(16,185,129,0.15)", color: "#059669" },
  failed: { label: "Eșuată", bg: "rgba(239,68,68,0.15)", color: "#dc2626" },
  canceled: { label: "Anulată", bg: "rgba(100,116,139,0.15)", color: "#64748b" },
};

const fmtDate = (d) => {
  const date = new Date(d);
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Notificarile programate si trimise, in timp real (pull-to-refresh). Cele
 * programate inca netrimise pot fi anulate.
 */
export const ScheduledView = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await broadcastApi.list();
      setItems(res.broadcasts || []);
    } catch (e) { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    try {
      await broadcastApi.cancel(id);
      load();
    } catch (e) {}
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator size="large" color="#0ea5e9" /></View>;
  }

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
      {items.length === 0 && <Text style={styles.emptyText}>Nicio notificare încă.</Text>}
      {items.map((b) => {
        const st = STATUS[b.status] || STATUS.sent;
        const target = [...(b.targetRoles || []), ...(b.targetTags || [])].join(", ") || "toți";
        return (
          <View key={b._id} style={styles.listItem}>
            {!!b.title && <Text style={styles.listTitle}>{b.title}</Text>}
            <Text style={styles.listMsg} numberOfLines={2}>{b.message}</Text>
            <View style={[styles.badge, { backgroundColor: st.bg }]}>
              <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={styles.listMeta}>
              {fmtDate(b.sendAt)} · {target}
              {b.status === "sent" ? ` · ${b.recipientCount} destinatari` : ""}
              {b.sendEmail ? " · +email" : ""}
            </Text>
            {b.status === "pending" && (
              <TouchableOpacity onPress={() => cancel(b._id)}>
                <Text style={styles.cancelText}>Anulează</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

export default ScheduledView;
