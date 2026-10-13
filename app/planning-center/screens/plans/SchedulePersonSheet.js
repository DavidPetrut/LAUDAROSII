/**
 * Scheduling UI (din poze: Add People + Schedule Person popup).
 * AddPeopleSheet = picker de persoane. SchedulePersonSheet = form (team/position/times/status/prepared).
 * Convertit web light → mobil dark.
 */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showError, showSuccess } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcBottomSheet, PcSearchBar, PcAvatar, PcSelect, PcCheckbox, PcSegmented, PcButton } from "../../components";

/* ───────── Add People (picker) ───────── */
export function AddPeopleSheet({ visible, onClose, planId, onPicked }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);
  const load = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try { setPeople((await pcApi.plans.schedulable(planId, debounced)).people || []); }
    catch (e) { showError(e?.message || "Eroare."); }
    finally { setLoading(false); }
  }, [visible, planId, debounced]);
  useEffect(() => { load(); }, [load]);

  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.85}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={styles.title}>Add People</Text>
        <PcSearchBar value={query} onChangeText={setQuery} placeholder="Caută persoană" onClear={() => setQuery("")} />
        {loading ? (
          <ActivityIndicator color={pcColors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={{ maxHeight: 400, marginTop: 10 }}>
            {people.map((p) => (
              <Pressable key={String(p.id)} style={styles.pRow} onPress={() => onPicked(p)}>
                <PcAvatar uri={p.avatar} initials={p.initials} size={34} />
                <Text style={styles.pName}>{p.name}</Text>
              </Pressable>
            ))}
            {people.length === 0 && <Text style={styles.empty}>Niciun rezultat.</Text>}
          </View>
        )}
      </View>
    </PcBottomSheet>
  );
}

const STATUS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "unconfirmed", label: "Pending" },
  { key: "declined", label: "Declined" },
];

/* ───────── Schedule Person (form) ───────── */
export function SchedulePersonSheet({ visible, onClose, planId, person, schedulable, scopeTeamId, scopePositionId, onSaved }) {
  const [teamId, setTeamId] = useState(null);
  const [positionId, setPositionId] = useState(null);
  const [timeIds, setTimeIds] = useState([]);
  const [status, setStatus] = useState("unconfirmed");
  const [prepared, setPrepared] = useState(false); // implicit: persoana VEDE imediat cererea în My Schedule (poate accepta chiar fără email)
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && schedulable) {
      const t = scopeTeamId || schedulable.teams?.[0]?.id || null;
      setTeamId(t);
      setPositionId(scopePositionId || null);
      setTimeIds((schedulable.serviceTimes || []).map((s) => String(s.id))); // toate orele implicit
      setStatus("unconfirmed");
      setPrepared(false);
    }
  }, [visible, schedulable, scopeTeamId, scopePositionId]);

  if (!schedulable) return null;
  const teams = schedulable.teams || [];
  const currentTeam = teams.find((t) => String(t.id) === String(teamId));
  const positions = currentTeam?.positions || [];
  const serviceTimes = schedulable.serviceTimes || [];
  const toggleTime = (id) => setTimeIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const save = async () => {
    if (!teamId) return showError("Alege o echipă.");
    setSaving(true);
    try {
      await pcApi.plans.assign(planId, {
        personId: person.id, teamId, positionId,
        timeIds, status, prepared,
      });
      showSuccess(`${person.name} programat(ă)`);
      onSaved && onSaved();
      onClose();
    } catch (e) {
      showError(e?.message || "Nu s-a putut programa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.9}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={styles.personHead}>
          <PcAvatar uri={person?.avatar} initials={person?.initials} size={48} />
          <Text style={styles.personName}>{person?.name}</Text>
        </View>

        <PcSegmented options={STATUS} value={status} onChange={setStatus} style={{ alignSelf: "stretch", marginBottom: 16 }} />

        <Text style={styles.label}>Echipă</Text>
        <PcSelect value={teamId} options={teams.map((t) => ({ value: t.id, label: t.name }))} onChange={(v) => { setTeamId(v); setPositionId(null); }} />

        <Text style={[styles.label, { marginTop: 14 }]}>Poziție</Text>
        <PcSelect value={positionId} options={positions.map((p) => ({ value: p.id, label: p.name }))} onChange={setPositionId} placeholder="Alege poziția" />

        <Text style={[styles.label, { marginTop: 14 }]}>Ore de serviciu</Text>
        {serviceTimes.map((t) => (
          <Pressable key={String(t.id)} style={styles.timeRow} onPress={() => toggleTime(String(t.id))}>
            <PcCheckbox checked={timeIds.includes(String(t.id))} onPress={() => toggleTime(String(t.id))} size={22} />
            <Text style={styles.timeTxt}>{t.label}</Text>
          </Pressable>
        ))}

        <Pressable style={styles.prepRow} onPress={() => setPrepared((v) => !v)}>
          <PcCheckbox checked={prepared} onPress={() => setPrepared((v) => !v)} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={styles.prepTxt}>Prepared</Text>
            <Text style={styles.prepSub}>Persoana nu vede cererea până nu trimiți emailul de programare.</Text>
          </View>
        </Pressable>

        <PcButton title="Save" onPress={save} loading={saving} block style={{ marginTop: 14 }} />
      </View>
    </PcBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", marginBottom: 12 },
  pRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  pName: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 20 },
  personHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  personName: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700" },
  label: { color: pcColors.textSecondary, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  timeTxt: { color: pcColors.textPrimary, fontSize: 15 },
  prepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 16 },
  prepTxt: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "600" },
  prepSub: { color: pcColors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 16 },
});

export default SchedulePersonSheet;
