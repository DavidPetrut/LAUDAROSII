/**
 * People — ecranul principal (§9 [PEOPLE-LIST]). IDENTIC cu screenshot-urile PCO.
 * Design uniformizat prin primitivele globale (PcSearchBar/PcChip/PcIconButton/PcListRow).
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import {
  PcScreen, PcAvatar, PcBottomSheet, PcSearchBar, PcChip, PcIconButton, PcListRow,
} from "../../components";
import { usePc, usePcShell } from "../../navigation/PcContext";
import { PeopleFilterSheet } from "./PeopleFilterSheet";
import { PeopleSortMenu } from "./PeopleSortMenu";
import { PersonQuickActions } from "./PersonQuickActions";

export function PeopleListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const { exitModule } = usePcShell();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [sortBy, setSortBy] = useState("firstName");
  const [dir, setDir] = useState("asc");
  const [filters, setFilters] = useState({ teamIds: [], tagIds: [], minPermission: "" });
  const [scope, setScope] = useState("");

  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [filterData, setFilterData] = useState(null);
  const [quickPerson, setQuickPerson] = useState(null);

  const pageRef = useRef(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const buildParams = (p) => ({
    q: debounced, sortBy, dir, page: p, limit: 40,
    teamIds: filters.teamIds.join(","), tagIds: filters.tagIds.join(","),
    minPermission: filters.minPermission, scope,
  });

  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pcApi.people.list(buildParams(1));
      setItems(res.results);
      setTotal(res.total);
      setHasMore(res.hasMore);
      pageRef.current = res.page;
    } catch (e) {
      showError(e?.message || "Nu s-a putut încărca lista.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, sortBy, dir, filters, scope]);

  // Reîncarcă la focus (ex. după Add Person / Import) ȘI când se schimbă filtre/sort/search.
  useFocusEffect(useCallback(() => { loadFirst(); }, [loadFirst]));

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const res = await pcApi.people.list(buildParams(next));
      setItems((prev) => [...prev, ...res.results]);
      setHasMore(res.hasMore);
      pageRef.current = res.page;
    } catch (e) {
      /* silent */
    } finally {
      setLoadingMore(false);
    }
  };

  const openFilter = async () => {
    setFilterVisible(true);
    if (!filterData) {
      try { setFilterData(await pcApi.people.filters()); }
      catch (e) { showError("Nu s-au putut încărca filtrele."); }
    }
  };

  const openProfile = (id) => navigation.navigate("PcProfile", { personId: id });
  const openQuick = async (row) => {
    try { setQuickPerson(await pcApi.people.get(row.id)); }
    catch (e) { setQuickPerson({ ...row }); }
  };

  const activeFilterCount =
    filters.teamIds.length + filters.tagIds.length + (filters.minPermission ? 1 : 0) + (scope ? 1 : 0);

  const canCreate = !!me?.capabilities?.createPeople;
  const canImport = !!me?.capabilities?.import;
  const canReports = !!me?.capabilities?.reportsView;

  const renderRow = ({ item }) => (
    <PcListRow
      left={<PcAvatar uri={item.avatar} initials={item.initials} size={44} />}
      title={item.fullName}
      onPress={() => openProfile(item.id)}
      onLongPress={() => openQuick(item)}
    />
  );

  return (
    <PcScreen>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>People</Text>
        <View style={styles.headerIcons}>
          {canReports && <PcIconButton icon="stats-chart-outline" color={pcColors.textSecondary} onPress={() => navigation.navigate("PcReports")} style={{ marginLeft: 18 }} />}
          <PcIconButton icon="chatbox-outline" onPress={() => {}} style={{ marginLeft: 18 }} />
          <PcIconButton icon="notifications-outline" dot onPress={() => {}} style={{ marginLeft: 18 }} />
          <Pressable onPress={() => setAccountVisible(true)} hitSlop={10} style={{ marginLeft: 18 }}>
            <PcAvatar uri={me?.person?.avatar} initials={me?.person?.initials || ""} size={34} />
          </Pressable>
        </View>
      </View>

      {/* Search + filter row */}
      <View style={styles.searchWrap}>
        <PcSearchBar value={query} onChangeText={setQuery} placeholder="Search People" onClear={() => setQuery("")} />
        <View style={styles.chipRow}>
          <PcChip label="My Teams" selected={scope === "myTeams"} onPress={() => setScope((s) => (s === "myTeams" ? "" : "myTeams"))} />
          <Pressable style={styles.addFilter} onPress={openFilter} hitSlop={8}>
            <Ionicons name="add" size={22} color={pcColors.primary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Results + sort */}
      <View style={styles.resultsBar}>
        <Text style={styles.results}>{total} Results</Text>
        <Pressable onPress={() => setSortVisible(true)} hitSlop={8}>
          <MaterialCommunityIcons name="sort-variant" size={24} color={pcColors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderRow}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>Niciun rezultat.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={pcColors.primary} style={{ marginVertical: 16 }} /> : null}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* FAB Add person (perm-gated), peste tab bar (regula ta) */}
      {canCreate && (
        <Pressable style={styles.fab} onPress={() => navigation.navigate("PcAddPerson")}>
          <Ionicons name="add" size={30} color="#0A0A0A" />
        </Pressable>
      )}

      {/* Sheets */}
      <PeopleFilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        data={filterData}
        value={filters}
        resultCount={total}
        onApply={(v) => setFilters({ teamIds: v.teamIds || [], tagIds: v.tagIds || [], minPermission: v.minPermission || "" })}
      />
      <PeopleSortMenu
        visible={sortVisible}
        onClose={() => setSortVisible(false)}
        sortBy={sortBy}
        dir={dir}
        onChange={(c) => { if (c.sortBy) setSortBy(c.sortBy); if (c.dir) setDir(c.dir); }}
      />
      <PersonQuickActions
        person={quickPerson}
        visible={!!quickPerson}
        onClose={() => setQuickPerson(null)}
        onViewProfile={() => { const id = quickPerson.id; setQuickPerson(null); openProfile(id); }}
      />

      {/* Account / Exit */}
      <PcBottomSheet visible={accountVisible} onClose={() => setAccountVisible(false)} maxHeightPct={0.4}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {me?.person && (
            <Pressable style={styles.acctRow} onPress={() => { setAccountVisible(false); openProfile(me.person.id); }}>
              <Ionicons name="person-outline" size={22} color={pcColors.textPrimary} />
              <Text style={styles.acctTxt}>Profilul meu</Text>
            </Pressable>
          )}
          {canImport && (
            <Pressable style={styles.acctRow} onPress={() => { setAccountVisible(false); navigation.navigate("PcImport"); }}>
              <Ionicons name="cloud-upload-outline" size={22} color={pcColors.textPrimary} />
              <Text style={styles.acctTxt}>Import & export CSV</Text>
            </Pressable>
          )}
          <Pressable style={styles.acctRow} onPress={() => { setAccountVisible(false); exitModule(); }}>
            <Ionicons name="exit-outline" size={22} color={pcColors.primary} />
            <Text style={[styles.acctTxt, { color: pcColors.primary }]}>Ieși din Planificare</Text>
          </Pressable>
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  searchWrap: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  addFilter: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: pcColors.chipBorder, alignItems: "center", justifyContent: "center" },
  filterBadge: { position: "absolute", top: -4, right: -4, backgroundColor: pcColors.primary, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  filterBadgeTxt: { color: "#0A0A0A", fontSize: 10, fontWeight: "700" },
  resultsBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  results: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  acctRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
  acctTxt: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "600" },
  fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: pcColors.primary, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
});

export default PeopleListScreen;
