import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../global/components";
import { useTheme } from "../../../global/context";
import { showError, showSuccess } from "../../../global/functions";
import { accessApi } from "./accessApi";
import { CapabilityEditor } from "./CapabilityEditor";
import { ac, ACCENT, ROLE_META } from "./appControlStyles";

const GRANT_ROLES = ["admin", "developer", "editor", "user"];

const fmtWhen = (iso) => {
  if (!iso) return null;
  try { return new Date(iso).toLocaleString("ro-RO"); } catch { return null; }
};

export const AppControlAccess = ({ navigation }) => {
  const { theme } = useTheme();
  const [catalog, setCatalog] = useState(null);
  const [roleData, setRoleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async (isRefresh) => {
    try {
      const [cat, roles] = await Promise.all([accessApi.catalog(), accessApi.roles()]);
      setCatalog(cat);
      const map = {};
      (roles.roles || []).forEach((r) => (map[r.role] = r));
      setRoleData(map);
      return map;
    } catch {
      showError("Nu am putut incarca accesele");
      return null;
    } finally {
      if (isRefresh) setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const pickRole = (r) => {
    setRole(r);
    setDraft({ ...((roleData[r] && roleData[r].perms) || {}) });
    setDirty(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    const map = await loadData(true);
    if (map && role && !dirty) {
      setDraft({ ...((map[role] && map[role].perms) || {}) });
    }
    showSuccess("Accese reincarcate");
  };

  const change = (key, level) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (level === "none") delete next[key];
      else next[key] = level;
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await accessApi.setRolePerms(role, draft);
      setRoleData((prev) => ({
        ...prev,
        [role]: { role, perms: res.perms || {}, updatedAt: new Date().toISOString(), updatedByName: "tine" },
      }));
      setDirty(false);
      showSuccess("Accese salvate");
    } catch (e) {
      showError(e.response?.data?.error || "Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[ac.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Accesibilitate" onBack={() => navigation.goBack()} />
        <View style={ac.center}><ActivityIndicator color={ACCENT} size="large" /></View>
      </View>
    );
  }

  const meta = role ? roleData[role] : null;
  const when = fmtWhen(meta?.updatedAt);

  return (
    <View style={[ac.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Accesibilitate" subtitle="Alege rolul, apoi acorda accese" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ac.content}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={ac.sectionLabel}>1 · Alege rolul</Text>
          <TouchableOpacity
            onPress={refresh}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, padding: 6 }}
            disabled={refreshing}
          >
            <Ionicons name="refresh" size={16} color={ACCENT} />
            <Text style={{ color: ACCENT, fontWeight: "700", fontSize: 13 }}>{refreshing ? "..." : "Reincarca"}</Text>
          </TouchableOpacity>
        </View>

        <View style={ac.rolesRow}>
          {GRANT_ROLES.map((r) => {
            const rm = ROLE_META[r];
            const active = role === r;
            return (
              <TouchableOpacity
                key={r}
                style={[ac.roleChip, { borderColor: rm.color, backgroundColor: active ? rm.color + "22" : "transparent" }]}
                onPress={() => pickRole(r)}
              >
                <View style={[ac.statDot, { backgroundColor: rm.color }]} />
                <Text style={[ac.roleChipText, { color: active ? rm.color : theme.textPrimary }]}>{rm.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {role ? (
          <>
            <Text style={ac.sectionLabel}>2 · Accese pentru {ROLE_META[role].label}</Text>
            {when && (
              <Text style={[ac.capDesc, { marginTop: -4, marginBottom: 8, fontStyle: "italic" }]}>
                Modificat: {when}{meta?.updatedByName ? ` de ${meta.updatedByName}` : ""}
              </Text>
            )}
            <CapabilityEditor catalog={catalog} value={draft} onChange={change} />
          </>
        ) : (
          <Text style={[ac.muted, { marginTop: 40 }]}>Selecteaza un rol ca sa-i configurezi accesele.</Text>
        )}
      </ScrollView>

      {role && (
        <View style={[ac.saveBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[ac.saveBtn, (!dirty || saving) && ac.saveBtnDisabled]}
            onPress={save}
            disabled={!dirty || saving}
          >
            <Text style={ac.saveBtnText}>{saving ? "Se salveaza..." : "Salveaza accesele"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
