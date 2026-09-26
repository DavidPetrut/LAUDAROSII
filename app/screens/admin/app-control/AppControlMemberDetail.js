import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, UserAvatar } from "../../../global/components";
import { useAuth, useTheme } from "../../../global/context";
import { showError, showSuccess } from "../../../global/functions";
import { accessApi } from "./accessApi";
import { CapabilityEditor } from "./CapabilityEditor";
import { ac, ROLE_META } from "./appControlStyles";

const ROLES = ["user", "editor", "developer", "admin", "superadmin"];

export const AppControlMemberDetail = ({ navigation, route }) => {
  const { id } = route.params;
  const { theme } = useTheme();
  const { user: me } = useAuth();

  const [member, setMember] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [grants, setGrants] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSelf = String(id) === String(me?._id);

  const load = async () => {
    try {
      const [m, cat] = await Promise.all([accessApi.member(id), accessApi.catalog()]);
      setMember(m);
      setGrants(m.grants || {});
      setCatalog(cat);
    } catch {
      showError("Nu am putut incarca utilizatorul");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const changeRole = async (role) => {
    if (role === member.role) return;
    try {
      await accessApi.changeRole(id, role);
      setMember((prev) => ({ ...prev, role }));
      showSuccess("Rol schimbat");
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const toggleBan = async () => {
    try {
      await accessApi.ban(id, !member.isBanned, member.isBanned ? "" : "Blocat din App Control");
      setMember((prev) => ({ ...prev, isBanned: !prev.isBanned }));
      showSuccess(member.isBanned ? "Deblocat" : "Blocat");
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const doDelete = async () => {
    setConfirmDel(false);
    try {
      await accessApi.remove(id);
      showSuccess("Utilizator sters");
      navigation.goBack();
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    }
  };

  const changeGrant = (key, level) => {
    setGrants((prev) => {
      const next = { ...prev };
      if (level === "none") delete next[key];
      else next[key] = level;
      return next;
    });
    setDirty(true);
  };

  const saveGrants = async () => {
    setSaving(true);
    try {
      const res = await accessApi.setGrants(id, grants);
      setGrants(res.grants || {});
      setDirty(false);
      showSuccess("Accese extra salvate");
    } catch (e) {
      showError(e.response?.data?.error || "Eroare");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !member) {
    return (
      <View style={[ac.container, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Membru" onBack={() => navigation.goBack()} />
        <View style={ac.center}><ActivityIndicator color="#7c3aed" size="large" /></View>
      </View>
    );
  }

  const meta = ROLE_META[member.role] || ROLE_META.user;
  const isSuper = member.role === "superadmin";

  return (
    <View style={[ac.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Membru" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ac.content}>
        <View style={ac.detailHead}>
          <UserAvatar profilePicture={member.profilePicture} size={72} />
          <Text style={[ac.detailName, { color: theme.textPrimary }]}>{member.fullName || "Fara nume"}</Text>
          <Text style={ac.detailEmail}>{member.email}</Text>
          <View style={[ac.roleBadge, { backgroundColor: meta.color + "22" }]}>
            <Text style={[ac.roleBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {!isSelf && (
          <>
            <Text style={ac.sectionLabel}>Rol</Text>
            <View style={ac.rolesRow}>
              {ROLES.map((r) => {
                const rm = ROLE_META[r];
                const active = member.role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[ac.roleChip, { borderColor: rm.color, backgroundColor: active ? rm.color + "22" : "transparent" }]}
                    onPress={() => changeRole(r)}
                  >
                    <View style={[ac.statDot, { backgroundColor: rm.color }]} />
                    <Text style={[ac.roleChipText, { color: active ? rm.color : theme.textPrimary }]}>{rm.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={ac.actionRow}>
              <TouchableOpacity
                style={[ac.actionBtn, { borderColor: "#f59e0b" }]}
                onPress={toggleBan}
              >
                <Ionicons name={member.isBanned ? "lock-open-outline" : "lock-closed-outline"} size={18} color="#f59e0b" />
                <Text style={[ac.actionBtnText, { color: "#f59e0b" }]}>{member.isBanned ? "Deblocheaza" : "Blocheaza"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ac.actionBtn, { borderColor: "#ef4444" }]}
                onPress={() => setConfirmDel(true)}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={[ac.actionBtnText, { color: "#ef4444" }]}>Sterge</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {isSuper ? (
          <Text style={[ac.muted, { marginTop: 24 }]}>Super-adminul are acces la tot; nu are nevoie de accese extra.</Text>
        ) : (
          <>
            <Text style={ac.sectionLabel}>Accese extra (peste rol)</Text>
            <CapabilityEditor catalog={catalog} value={grants} onChange={changeGrant} />
          </>
        )}
      </ScrollView>

      {!isSuper && (
        <View style={[ac.saveBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[ac.saveBtn, (!dirty || saving) && ac.saveBtnDisabled]}
            onPress={saveGrants}
            disabled={!dirty || saving}
          >
            <Text style={ac.saveBtnText}>{saving ? "Se salveaza..." : "Salveaza accesele extra"}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={confirmDel} transparent animationType="fade" onRequestClose={() => setConfirmDel(false)}>
        <Pressable style={ac.center} onPress={() => setConfirmDel(false)}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 20, width: "100%", maxWidth: 320 }}>
            <Text style={[ac.detailName, { color: theme.textPrimary, fontSize: 17 }]}>Stergi utilizatorul?</Text>
            <Text style={[ac.muted, { textAlign: "left", marginVertical: 12 }]}>
              Contul devine inactiv (soft-delete, recuperabil). Sesiunile lui se invalideaza imediat.
            </Text>
            <View style={ac.actionRow}>
              <TouchableOpacity style={[ac.actionBtn, { borderColor: theme.border }]} onPress={() => setConfirmDel(false)}>
                <Text style={[ac.actionBtnText, { color: theme.textPrimary }]}>Anuleaza</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ac.actionBtn, { borderColor: "#ef4444", backgroundColor: "#ef444422" }]} onPress={doDelete}>
                <Text style={[ac.actionBtnText, { color: "#ef4444" }]}>Sterge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};
