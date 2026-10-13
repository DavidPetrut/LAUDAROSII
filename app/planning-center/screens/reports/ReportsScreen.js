/** Reports (admin/editor) — hub minimal, coerent, cu vizualizări (react-native-svg).
 *  Overview org · Persoană (slujiri/accept/decline/decline-după-accept + blockouts lună/an) · Songs (CCLI) · Blockouts. */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcIconButton, PcSearchBar, PcAvatar, PcSegmented, PcCard, PcChip } from "../../components";
import { DonutChart, Legend, BarList, ColumnChart, StatCard } from "./charts";

const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const MONTHS_SHORT = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];

function presetRange(key) {
  const now = new Date();
  const to = todayStr();
  if (key === "month") return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to };
  if (key === "year") return { from: `${now.getFullYear()}-01-01`, to };
  if (key === "90d") { const d = new Date(now); d.setDate(d.getDate() - 90); return { from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, to }; }
  return {}; // 12m = default pe server
}
/** Lista lunilor din interval (max 12), cu label scurt + cheie YYYY-MM. */
function monthsIn(fromStr, toStr) {
  const from = fromStr ? new Date(fromStr + "T00:00:00Z") : (() => { const d = new Date(toStr + "T00:00:00Z"); d.setFullYear(d.getFullYear() - 1); return d; })();
  const to = new Date(toStr + "T00:00:00Z");
  const out = [];
  let y = from.getUTCFullYear(), m = from.getUTCMonth();
  while (out.length < 18 && (y < to.getUTCFullYear() || (y === to.getUTCFullYear() && m <= to.getUTCMonth()))) {
    out.push({ key: `${y}-${pad(m + 1)}`, label: MONTHS_SHORT[m] });
    m++; if (m > 11) { m = 0; y++; }
  }
  return out.slice(-12);
}

const PRESETS = [{ key: "month", label: "Luna" }, { key: "year", label: "Anul" }, { key: "90d", label: "90 zile" }, { key: "12m", label: "12 luni" }];
const TABS = [{ key: "overview", label: "Overview" }, { key: "person", label: "Persoană" }, { key: "songs", label: "Songs" }, { key: "blockouts", label: "Blockouts" }];

export function ReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("overview");
  const [preset, setPreset] = useState("12m");
  const rangeParams = useMemo(() => presetRange(preset), [preset]);
  const toStr = rangeParams.to || todayStr();

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <PcIconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.controls}>
        <PcSegmented options={TABS} value={tab} onChange={setTab} style={{ alignSelf: "stretch", marginBottom: 10 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PRESETS.map((p) => <PcChip key={p.key} label={p.label} selected={preset === p.key} onPress={() => setPreset(p.key)} />)}
        </ScrollView>
      </View>

      {tab === "overview" && <Overview params={rangeParams} />}
      {tab === "person" && <PersonReport params={rangeParams} toStr={toStr} />}
      {tab === "songs" && <SongsReport params={rangeParams} />}
      {tab === "blockouts" && <BlockoutsReport params={rangeParams} />}
    </PcScreen>
  );
}

/* ───────── Overview ───────── */
function Overview({ params }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let on = true; setLoading(true); pcApi.reports.overview(params).then((r) => on && setD(r)).catch((e) => showError(e?.message)).finally(() => on && setLoading(false)); return () => { on = false; }; }, [params]);
  if (loading) return <Loader />;
  if (!d) return null;
  const sb = d.statusBreakdown || {};
  const segs = [
    { value: sb.confirmed, color: pcColors.primary, label: "Confirmate" },
    { value: sb.unconfirmed, color: pcColors.orange, label: "În așteptare" },
    { value: sb.declined, color: pcColors.danger, label: "Refuzate" },
  ];
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.statRow}>
        <StatCard value={d.plansCount} label="Planuri" />
        <StatCard value={d.assignmentsCount} label="Programări" />
        <StatCard value={d.songsUsed} label="Cântări" color={pcColors.orange} />
        <StatCard value={d.blockoutsCount} label="Blockouts" color="#4F9CF9" />
      </View>

      <PcCard style={styles.card}>
        <Text style={styles.cardTitle}>Status programări</Text>
        <View style={styles.donutRow}>
          <DonutChart segments={segs} centerValue={d.assignmentsCount} centerLabel="total" />
          <View style={{ flex: 1 }}><Legend items={segs} /></View>
        </View>
      </PcCard>

      <PcCard style={styles.card}>
        <Text style={styles.cardTitle}>Top slujitori (confirmate)</Text>
        <BarList data={(d.topServed || []).map((p) => ({ label: p.name, value: p.count }))} />
      </PcCard>
    </ScrollView>
  );
}

/* ───────── Person ───────── */
function PersonReport({ params, toStr }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [people, setPeople] = useState([]);
  const [person, setPerson] = useState(null);
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);
  useEffect(() => { if (person) return; let on = true; pcApi.people.list({ q: debounced || undefined }).then((r) => on && setPeople(r.people || [])).catch(() => {}); return () => { on = false; }; }, [debounced, person]);

  const loadPerson = useCallback((p) => {
    setPerson(p); setLoading(true);
    pcApi.reports.person(p.id, params).then(setD).catch((e) => showError(e?.message)).finally(() => setLoading(false));
  }, [params]);
  useEffect(() => { if (person) loadPerson(person); }, [params]); // eslint-disable-line

  if (!person) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <PcSearchBar value={query} onChangeText={setQuery} placeholder="Caută o persoană" onClear={() => setQuery("")} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {people.map((p) => (
            <Pressable key={String(p.id)} style={styles.pRow} onPress={() => loadPerson(p)}>
              <PcAvatar uri={p.avatar} initials={p.initials} size={38} />
              <Text style={styles.pName}>{p.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={pcColors.textMuted} />
            </Pressable>
          ))}
          {people.length === 0 && <Text style={styles.empty}>Nicio persoană.</Text>}
        </ScrollView>
      </View>
    );
  }

  const months = monthsIn(params.from, toStr);
  const servedCols = months.map((m) => ({ label: m.label, value: (d?.servedByMonth || {})[m.key] || 0 }));
  const blockoutCols = months.map((m) => ({ label: m.label, value: (d?.blockoutsByMonth || {})[m.key] || 0 }));
  const t = d?.totals || {};
  const segs = [
    { value: t.served, color: pcColors.primary, label: "Confirmate" },
    { value: t.pending, color: pcColors.orange, label: "În așteptare" },
    { value: t.declined, color: pcColors.danger, label: "Refuzate" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Pressable style={styles.personHead} onPress={() => { setPerson(null); setD(null); }}>
        <Ionicons name="chevron-back" size={18} color={pcColors.primary} />
        <PcAvatar uri={person.avatar} initials={person.initials} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.personName}>{person.name}</Text>
          {!!d?.person?.email && <Text style={styles.personEmail}>{d.person.email}</Text>}
        </View>
      </Pressable>

      {loading ? <Loader /> : d && (
        <>
          <View style={styles.statRow}>
            <StatCard value={t.served} label="Slujiri" color={pcColors.primary} accent />
            <StatCard value={t.pending} label="În așteptare" color={pcColors.orange} />
            <StatCard value={t.declinedPlain} label="Refuzate" color={pcColors.danger} />
          </View>
          <View style={styles.statRow}>
            <StatCard value={t.declinedAfterConfirm} label="Refuz după accept" color="#E06C9F" accent />
            <StatCard value={t.accepted} label="Acceptate total" color={pcColors.primary} />
            <StatCard value={t.blockouts} label="Blockouts" color="#4F9CF9" accent />
          </View>

          <PcCard style={styles.card}>
            <Text style={styles.cardTitle}>Distribuție status</Text>
            <View style={styles.donutRow}>
              <DonutChart size={150} segments={segs} centerValue={t.scheduled} centerLabel="programări" />
              <View style={{ flex: 1 }}><Legend items={segs} /></View>
            </View>
          </PcCard>

          <PcCard style={styles.card}>
            <Text style={styles.cardTitle}>Slujiri pe lună</Text>
            <ColumnChart data={servedCols} color={pcColors.primary} />
          </PcCard>

          <PcCard style={styles.card}>
            <Text style={styles.cardTitle}>Blockouts pe lună</Text>
            <ColumnChart data={blockoutCols} color="#4F9CF9" />
            {Object.keys(d.blockoutsByYear || {}).length > 0 && (
              <Text style={styles.byYear}>Pe an: {Object.entries(d.blockoutsByYear).map(([y, n]) => `${y}: ${n}`).join("  ·  ")}</Text>
            )}
          </PcCard>

          <PcCard style={styles.card}>
            <Text style={styles.cardTitle}>Istoric recent</Text>
            {(d.recent || []).map((r, i) => (
              <View key={i} style={styles.recentRow}>
                <Ionicons name={r.status === "confirmed" ? "checkmark-circle" : r.status === "declined" ? "close-circle" : "help-circle"} size={18}
                  color={r.status === "confirmed" ? pcColors.primary : r.status === "declined" ? pcColors.danger : pcColors.orange} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentDate}>{r.dateLabel} · {r.serviceTypeName}</Text>
                  <Text style={styles.recentPos}>{r.positionName}{r.declinedAfterConfirm ? " · refuz după accept" : ""}</Text>
                </View>
              </View>
            ))}
            {(d.recent || []).length === 0 && <Text style={styles.empty}>Niciun istoric în interval.</Text>}
          </PcCard>
        </>
      )}
    </ScrollView>
  );
}

/* ───────── Songs (CCLI copy minimal) ───────── */
function SongsReport({ params }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let on = true; setLoading(true); pcApi.reports.songs(params).then((r) => on && setD(r)).catch((e) => showError(e?.message)).finally(() => on && setLoading(false)); return () => { on = false; }; }, [params]);
  if (loading) return <Loader />;
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.note}>Câte planuri a apărut fiecare cântec (bază pentru raportul CCLI Copy). Print/Digital/Recording/Translation = câmpuri de raportare (felie ulterioară).</Text>
      <PcCard style={styles.card}>
        <Text style={styles.cardTitle}>Song usage ({d?.total || 0})</Text>
        <BarList data={(d?.songs || []).map((s) => ({ label: s.title, value: s.plans, sub: [s.ccli ? `CCLI #${s.ccli}` : null, s.author].filter(Boolean).join(" · ") }))} color={pcColors.orange} formatValue={(v) => `${v} pl`} />
      </PcCard>
    </ScrollView>
  );
}

/* ───────── Blockouts (toți) ───────── */
function BlockoutsReport({ params }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let on = true; setLoading(true); pcApi.reports.blockouts(params).then((r) => on && setD(r)).catch((e) => showError(e?.message)).finally(() => on && setLoading(false)); return () => { on = false; }; }, [params]);
  if (loading) return <Loader />;
  return (
    <ScrollView contentContainerStyle={styles.body}>
      {(d?.people || []).map((p) => (
        <PcCard key={p.personId} style={styles.card}>
          <View style={styles.boHead}><Text style={styles.cardTitle}>{p.name}</Text><Text style={styles.boCount}>{p.items.length}</Text></View>
          {p.items.map((b, i) => (
            <View key={i} style={styles.boRow}>
              <Ionicons name="calendar-clear-outline" size={16} color={pcColors.danger} />
              <Text style={styles.boLabel}>{b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}`}{b.repeat !== "none" ? ` · ${b.repeat}` : ""}{b.reason ? ` · ${b.reason}` : ""}</Text>
            </View>
          ))}
        </PcCard>
      ))}
      {(d?.people || []).length === 0 && <Text style={styles.empty}>Niciun blockout în interval.</Text>}
    </ScrollView>
  );
}

function Loader() { return <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />; }

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },
  controls: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: pcColors.bgHeader, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  body: { padding: 16, paddingBottom: 60, gap: 14 },
  statRow: { flexDirection: "row", gap: 10 },
  card: { padding: 16 },
  cardTitle: { color: pcColors.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 12 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  byYear: { color: pcColors.textMuted, fontSize: 12, marginTop: 10 },
  note: { color: pcColors.textMuted, fontSize: 12, lineHeight: 17 },
  pRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  pName: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600", flex: 1 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginVertical: 16 },
  personHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  personName: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "800" },
  personEmail: { color: pcColors.textSecondary, fontSize: 13, marginTop: 1 },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pcColors.divider },
  recentDate: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "600" },
  recentPos: { color: pcColors.textSecondary, fontSize: 13, marginTop: 1 },
  boHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  boCount: { color: pcColors.danger, fontSize: 15, fontWeight: "800" },
  boRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  boLabel: { color: pcColors.textSecondary, fontSize: 13, flex: 1 },
});

export default ReportsScreen;
