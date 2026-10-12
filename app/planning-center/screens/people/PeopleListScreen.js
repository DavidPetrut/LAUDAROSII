/**
 * People — ecranul principal (§9 [PEOPLE-LIST]). IDENTIC cu screenshot-urile PCO.
 * Header (chat/bell/avatar) + search + My Teams chip + „+" (Filter) + N Results + sort + listă paginată.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcAvatar, PcBottomSheet } from "../../components";
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [sortBy, setSortBy] = useState("firstName");
  const [dir, setDir] = useState("asc");
  const [filters, setFilters] = useState({ teamIds: [], tagIds: [], minPermission: "" });
  const [scope, setScope] = useState(""); // "" | "myTeams"

  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [filterData, setFilterData] = useState(null);
  const [quickPerson, setQuickPerson] = useState(null);

  const pageRef = useRef(1);

  // Debounce căutare
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const buildParams = (p) => ({
    q: debounced,
    sortBy,
    dir,
    page: p,
    limit: 40,
    teamIds: filters.teamIds.join(","),
    tagIds: filters.tagIds.join(","),
    minPermission: filters.minPermission,
    scope,
  });

  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pcApi.people.list(buildParams(1));
      setItems(res.results);
      setTotal(res.total);
      setHasMore(res.hasMore);
      pageRef.current = res.page;
      setPage(res.page);
    } catch (e) {
      showError(e?.message || "Nu s-a putut încărca lista.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, sortBy, dir, filters, scope]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

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
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const openFilter = async () => {
    setFilterVisible(true);
    if (!filterData) {
      try {
        setFilterData(await pcApi.people.filters());
      } catch (e) {
        showError("Nu s-au putut încărca filtrele.");
      }
    }
  };

  const openProfile = (id) => navigation.navigate("PcProfile", { personId: id });

  const openQuick = async (row) => {
    try {
      const full = await pcApi.people.get(row.id);
      setQuickPerson(full);
    } catch (e) {
      setQuickPerson({ ...row });
    }
  };

  const activeFilterCount =
    filters.teamIds.length + filters.tagIds.length + (filters.minPermission ? 1 : 0) + (scope ? 1 : 0);

  const HeaderIcon = ({ children, onPress, dot }) => (
    <Pressable onPress={onPress} hitSlop={10} style={{ marginLeft: 18 }}>
      {children}
      {dot && <View style={styles.dot} />}
    </Pressable>
  );

  const renderRow = ({ item }) => (
    <Pressable style={styles.row} onPress={() => openProfile(item.id)} onLongPress={() => openQuick(item)}>
      <PcAvatar uri={item.avatar} initials={item.initials} size={44} />
      <Text style={styles.rowName} numberOfLines={1}>{item.fullName}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>People</Text>
        <View style={styles.headerIcons}>
          <HeaderIcon onPress={() => {}}>
            <Ionicons name="chatbox-outline" size={24} color={pcColors.primary} />
          </HeaderIcon>
          <HeaderIcon onPress={() => {}} dot>
            <Ionicons name="notifications-outline" size={24} color={pcColors.primary} />
          </HeaderIcon>
          <HeaderIcon onPress={() => setAccountVisible(true)}>
            <PcAvatar uri={me?.person?.avatar} initials={me?.person?.initials || ""} size={34} />
          </HeaderIcon>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={pcColors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search People"
            placeholderTextColor={pcColors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={pcColors.textMuted} />
            </Pressable>
          )}
        </View>
        {/* My Teams chip + Filter */}
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.myTeamsChip, scope === "myTeams" && styles.myTeamsChipOn]}
            onPress={() => setScope((s) => (s === "myTeams" ? "" : "myTeams"))}
          >
            <Text style={[styles.myTeamsTxt, scope === "myTeams" && { color: pcColors.primary }]}>My Teams</Text>
          </Pressable>
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
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>Niciun rezultat.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={pcColors.primary} style={{ marginVertical: 16 }} /> : null}
          keyboardShouldPersistTaps="handled"
        />
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
        onChange={(c) => {
          if (c.sortBy) setSortBy(c.sortBy);
          if (c.dir) setDir(c.dir);
        }}
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
            <Pressable
              style={styles.acctRow}
              onPress={() => { setAccountVisible(false); openProfile(me.person.id); }}
            >
              <Ionicons name="person-outline" size={22} color={pcColors.textPrimary} />
              <Text style={styles.acctTxt}>Profilul meu</Text>
            </Pressable>
          )}
          <Pressable style={styles.acctRow} onPress={() => { setAccountVisible(false); exitModule(); }}>
            <Ionicons name="exit-outline" size={22} color={pcColors.primary} />
            <Text style={[styles.acctTxt, { color: pcColors.primary }]}>Ieși din Planificare</Text>
          </Pressable>
        </View>
      </PcBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: pcColors.bg },
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  dot: { position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: pcColors.orange },
  searchWrap: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12 },
  search: { flexDirection: "row", alignItems: "center", backgroundColor: pcColors.input, borderRadius: 10, paddingHorizontal: 12, height: 46, gap: 8 },
  searchInput: { flex: 1, color: pcColors.textPrimary, fontSize: 16 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  myTeamsChip: { borderWidth: 1, borderColor: pcColors.chipBorder, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  myTeamsChipOn: { borderColor: pcColors.primary, backgroundColor: "rgba(134,193,63,0.12)" },
  myTeamsTxt: { color: pcColors.textPrimary, fontWeight: "600" },
  addFilter: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: pcColors.chipBorder, alignItems: "center", justifyContent: "center" },
  filterBadge: { position: "absolute", top: -4, right: -4, backgroundColor: pcColors.primary, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  filterBadgeTxt: { color: "#0A0A0A", fontSize: 10, fontWeight: "700" },
  resultsBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  results: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  rowName: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "600", flex: 1 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: pcColors.divider, marginLeft: 74 },
  empty: { color: pcColors.textMuted, textAlign: "center", marginTop: 40 },
  acctRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
  acctTxt: { color: pcColors.textPrimary, fontSize: 17, fontWeight: "600" },
});

export default PeopleListScreen;
