/**
 * Edit item (§9 plan + flux Order). Editabil: titlu, length, plasare (Before/During/After + ore),
 * description, co-lideri (persoană SAU poziție), delete. Tab-uri NOTES/SONG/MEDIA/FILES.
 * Autosave la blur / la schimbare. Read-only pentru cine n-are editOrder.
 */
import React, { useState, useCallback } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Linking, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showConfirm, showInfo } from "../../../global/functions";
import { pcApi } from "../../api/pcApi";
import { pcColors } from "../../theme";
import { PcScreen, PcUnderlineTabs, PcAvatar, PcButton, PcBottomSheet, PcCheckbox, PcSearchBar, PcSelect } from "../../components";
import { usePc } from "../../navigation/PcContext";
import { usePcAudio } from "../../navigation/PcAudioContext";
import { ROLE_META, BASE_ROLES, parseVoicesText } from "../../lib/voices";

// Numele vine uneori URL-encodat (ex. „My%20Song.mp3") → afișat/redat decodat, lizibil.
const prettyName = (n) => { const s = String(n || ""); if (!s.includes("%")) return s; try { return decodeURIComponent(s); } catch (e) { return s; } };
// Audio după kind SAU extensie → redare în playerul INTERN (nu browser).
const AUDIO_RX = /\.(mp3|m4a|aac|wav|ogg|flac|opus|aiff?)(\?|#|$)/i;
const isAudio = (f) => !!(f && (f.kind === "audio" || (f.url && AUDIO_RX.test(f.url)) || (f.name && AUDIO_RX.test(f.name))));

const TABS = [
  { key: "NOTES", label: "NOTES", icon: "document-text-outline" },
  { key: "SONG", label: "SONG", icon: "musical-notes-outline" },
  { key: "MEDIA", label: "MEDIA", icon: "videocam-outline" },
  { key: "FILES", label: "FILES", icon: "attach-outline" },
];
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function ItemDetailScreen({ route, navigation }) {
  const { planId, itemId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { me } = usePc();
  const { playQueue } = usePcAudio();
  const canEdit = !!me?.capabilities?.editOrder;

  // Deschide un fișier al cântecului: chord chart → viewer; audio → player global; alt fișier → se deschide.
  const openSongFile = useCallback(async (f) => {
    if (!f) return;
    if (f.derived && f.source === "chordpro") {
      navigation.navigate("PcChartViewer", { songId: f.songId, arrangementId: f.arrangementId, initialDisplayKey: f.displayKey });
      return;
    }
    if (isAudio(f) && f.url) {
      const ok = await playQueue([{ id: String(f.id), title: prettyName(f.name), url: f.url }], 0);
      if (!ok) showError("Nu pot reda acest fișier audio.");
      return;
    }
    if (f.url) {
      try { await Linking.openURL(f.url); } catch (e) { showError("Nu pot deschide fișierul."); }
      return;
    }
    if (f.pending || f.transposeStatus === "pending") { showInfo("Fișier în așteptare (transpunere/MultiTracks)."); return; }
    showInfo("Fișier fără conținut descărcabil.");
  }, [navigation, playQueue]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("FILES");
  const [songMeta, setSongMeta] = useState(null); // { arrangements:[] }
  const [arrDetail, setArrDetail] = useState(null); // { keys:[], arrangementFiles:[] }
  const [title, setTitle] = useState("");
  const [min, setMin] = useState("0");
  const [sec, setSec] = useState("0");
  const [desc, setDesc] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchRes, setSearchRes] = useState({ positions: [], people: [] });
  const [voices, setVoices] = useState([]);
  const [pool, setPool] = useState([]);
  const [voiceRole, setVoiceRole] = useState(null); // rolul pt. care alegem din pool (sheet)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const it = await pcApi.plans.item(planId, itemId);
      setItem(it);
      setTitle(it.title || "");
      setMin(String(Math.floor((it.lengthSec || 0) / 60)));
      setSec(String((it.lengthSec || 0) % 60));
      setDesc(it.description || "");
      setVoices(it.voices || []);
      pcApi.plans.voicesPool(planId).then((r) => setPool(r.people || [])).catch(() => {});
      setTab((t) => (t === "FILES" && it.type === "song" ? "SONG" : t));
      // Edit a song from a plan: aduce aranjamentele + detaliul aranjamentului linkat.
      if (it.type === "song" && it.songId) {
        const sm = await pcApi.songs.get(it.songId).catch(() => null);
        setSongMeta(sm);
        if (it.arrangementId) {
          const ad = await pcApi.songs.arrangement(it.songId, it.arrangementId).catch(() => null);
          setArrDetail(ad);
        } else setArrDetail(null);
      } else { setSongMeta(null); setArrDetail(null); }
    } catch (e) { showError(e?.message || "Eroare la item."); }
    finally { setLoading(false); }
  }, [planId, itemId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changeArrangement = async (aid) => { await patch({ arrangementId: aid, keyId: "" }); load(); };
  const changeKey = async (kid) => { await patch({ keyId: kid }); load(); };

  const patch = async (fields) => {
    try { await pcApi.plans.updateItem(planId, itemId, fields); } catch (e) { showError(e?.message || "Nu s-a salvat."); }
  };
  const saveTitle = () => canEdit && title !== item?.title && patch({ title });
  const saveLen = () => {
    if (!canEdit) return;
    const total = (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
    if (total !== item?.lengthSec) patch({ lengthSec: total }).then(load);
  };
  const saveDesc = () => canEdit && desc !== item?.description && patch({ description: desc });

  // ── Voci structurate ──
  const saveVoices = (next) => { setVoices(next); patch({ voices: next.map((v) => ({ role: v.role, personId: v.personId || undefined, name: v.personId ? undefined : (v.name || "") })) }); };
  const toggleVoice = (role, person) => {
    const key = String(person.personId || person.name);
    const has = voices.some((v) => v.role === role && String(v.personId || v.name) === key);
    if (has) saveVoices(voices.filter((v) => !(v.role === role && String(v.personId || v.name) === key)));
    else saveVoices([...voices, { role, personId: person.personId || null, name: person.personId ? "" : (person.name || ""), avatar: person.avatar, initials: person.initials }]);
  };
  const removeVoiceAt = (role, idx) => { let seen = -1; return voices.filter((v) => { if (v.role !== role) return true; seen++; return seen !== idx; }); };
  const importVoices = () => {
    const parsed = parseVoicesText(desc);
    if (!parsed.length) { showInfo("Nu am găsit voci în descriere."); return; }
    const mapped = parsed.map((v) => {
      const p = pool.find((x) => x.name.toLowerCase().startsWith(v.name.toLowerCase()) || v.name.toLowerCase().startsWith((x.name.split(" ")[0] || "").toLowerCase()));
      return p ? { role: v.role, personId: p.personId, name: "", avatar: p.avatar, initials: p.initials } : { role: v.role, personId: null, name: v.name };
    });
    saveVoices(mapped);
  };
  const toggleTransition = () => { if (!canEdit) return; patch({ isTransition: !item?.isTransition }).then(load); };

  // ── Medley ──
  const saveMedley = async (next) => {
    try { await pcApi.plans.updateMedley(planId, itemId, { medley: next.map((c) => ({ songId: c.songId, arrangementId: c.arrangementId, keyId: c.keyId, keyName: c.keyName, title: c.title, sequence: c.sequence, lengthSec: c.lengthSec, note: c.note })) }); load(); }
    catch (e) { showError(e?.message || "Nu s-a salvat medley-ul."); }
  };

  const savePlacement = async (placement, timeIds, allTimes) => {
    await patch({ placement, timeIds: allTimes ? [] : timeIds, duringAll: allTimes });
    setPlaceOpen(false);
    load();
  };

  const doSearch = async (q) => {
    setSearch(q);
    try { setSearchRes(await pcApi.plans.leaderSearch(planId, q)); } catch (e) { /* silent */ }
  };
  const addLeader = async (payload) => {
    try { await pcApi.plans.addLeader(planId, itemId, payload); setLeaderOpen(false); setSearch(""); load(); }
    catch (e) { showError(e?.message || "Nu s-a putut adăuga."); }
  };
  const removeLeader = async (l) => {
    try { await pcApi.plans.removeLeader(planId, itemId, { personId: l.id, positionId: l.positionId }); load(); }
    catch (e) { showError(e?.message || "Nu s-a putut scoate."); }
  };

  const del = () => showConfirm("Șterge itemul", "Sigur ștergi acest element din order?", async () => {
    try { await pcApi.plans.deleteItem(planId, itemId); navigation.goBack(); } catch (e) { showError(e?.message || "Nu s-a putut șterge."); }
  });

  const placementLabel = () => {
    if (!item) return "During All";
    const all = item.duringAll || (item.timeIds || []).length === 0;
    return all ? `${cap(item.placement || "during")} All` : `${cap(item.placement || "during")} ${(item.timeIds || []).length} times`;
  };

  return (
    <PcScreen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={pcColors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit item</Text>
        {canEdit && <Pressable onPress={del} hitSlop={10}><Text style={styles.delete}>Delete</Text></Pressable>}
      </View>

      {loading || !item ? (
        <ActivityIndicator color={pcColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <TextInput style={styles.title} value={title} onChangeText={setTitle} onEndEditing={saveTitle} editable={canEdit} placeholder="Titlu" placeholderTextColor={pcColors.textMuted} />

          <View style={styles.boxesRow}>
            <View style={styles.box}>
              <Ionicons name="time-outline" size={18} color={pcColors.primary} />
              <TextInput style={styles.timeIn} value={min} onChangeText={setMin} onEndEditing={saveLen} editable={canEdit} keyboardType="number-pad" maxLength={3} />
              <Text style={styles.unit}>min</Text>
              <TextInput style={styles.timeIn} value={sec} onChangeText={setSec} onEndEditing={saveLen} editable={canEdit} keyboardType="number-pad" maxLength={2} />
              <Text style={styles.unit}>sec</Text>
            </View>
            <Pressable style={styles.box} onPress={() => canEdit && setPlaceOpen(true)}>
              <Text style={styles.during}>{placementLabel()}</Text>
              {canEdit && <Ionicons name="chevron-down" size={16} color={pcColors.textMuted} />}
            </Pressable>
          </View>

          {item.type !== "header" && (
            <Pressable style={styles.transRow} onPress={toggleTransition}>
              <PcCheckbox checked={!!item.isTransition} onPress={toggleTransition} size={20} />
              <Text style={styles.transTxt}>Tranziție <Text style={{ color: pcColors.textMuted }}>— timp neinclus, marcat „!"</Text></Text>
            </Pressable>
          )}

          <View style={styles.block}>
            <View style={styles.vhead}>
              <Text style={styles.label}>Voci</Text>
              {canEdit && !!desc && <Pressable onPress={importVoices}><Text style={styles.importV}>Importă din descriere</Text></Pressable>}
            </View>
            {ROLE_META.filter((r) => BASE_ROLES.includes(r.k) || voices.some((v) => v.role === r.k)).map((r) => {
              const picks = voices.filter((v) => v.role === r.k);
              return (
                <View key={r.k} style={styles.vrow}>
                  <Text style={styles.vlabel}>{r.s ? `${r.s} · ` : ""}{r.l}</Text>
                  <View style={styles.vpeople}>
                    {picks.map((v, i) => (
                      <View key={i} style={styles.vchip}>
                        {v.personId ? <PcAvatar uri={v.avatar} initials={v.initials} size={18} /> : null}
                        <Text style={styles.vchipTxt}>{v.name || "—"}</Text>
                        {canEdit && <Pressable onPress={() => saveVoices(removeVoiceAt(r.k, i))} hitSlop={6}><Ionicons name="close" size={13} color={pcColors.textMuted} /></Pressable>}
                      </View>
                    ))}
                    {canEdit && <Pressable style={styles.vadd} onPress={() => setVoiceRole(r.k)}><Ionicons name="add" size={16} color={pcColors.primary} /></Pressable>}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.descIn} value={desc} onChangeText={setDesc} onEndEditing={saveDesc} editable={canEdit} multiline placeholder={canEdit ? "Note libere (versete, cue-uri)" : ""} placeholderTextColor={pcColors.textMuted} textAlignVertical="top" />
          </View>

          {item.type === "medley" && (
            <MedleyBlock item={item} canEdit={canEdit} onSave={saveMedley}
              onOpenChart={(c) => c.songId && c.arrangementId && navigation.navigate("PcChartViewer", { songId: c.songId, arrangementId: c.arrangementId, initialDisplayKey: c.keyName })} />
          )}

          <View style={styles.block}>
            <Text style={styles.label}>Item leader</Text>
            <View style={styles.leaderWrap}>
              {(item.leaders || []).map((l, i) => (
                <View key={i} style={styles.leaderChip}>
                  {l.needed ? (
                    <Text style={styles.leaderNeeded}>{l.positionName} (gol)</Text>
                  ) : (
                    <>
                      <PcAvatar uri={l.avatar} initials={l.initials} size={22} />
                      <Text style={styles.leaderName}>{l.name}</Text>
                    </>
                  )}
                  {canEdit && <Pressable onPress={() => removeLeader(l)} hitSlop={6}><Ionicons name="close" size={16} color={pcColors.textMuted} /></Pressable>}
                </View>
              ))}
            </View>
            {canEdit && <PcButton title="Add leader" variant="outline" onPress={() => { setSearch(""); setSearchRes({ positions: [], people: [] }); setLeaderOpen(true); }} style={{ alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 24 }} />}
          </View>

          <PcUnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
          {tab === "SONG" ? (
            <SongTab
              item={item} songMeta={songMeta} arrDetail={arrDetail} canEdit={canEdit}
              onChangeArrangement={changeArrangement} onChangeKey={changeKey}
              onAddArrangement={() => navigation.navigate("PcSongDetail", { songId: item.songId })}
              onEditArrangement={() => navigation.navigate("PcArrangement", { songId: item.songId, arrangementId: item.arrangementId })}
              onEditSequence={() => navigation.navigate("PcSequenceEditor", { mode: "plan", planId, itemId, songId: item.songId, arrangementId: item.arrangementId })}
              onOpenFile={(f) => openSongFile({ ...f, songId: item.songId, arrangementId: item.arrangementId })}
            />
          ) : (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              {tab === "FILES" ? (
                item.files?.length ? (
                  item.files.map((f) => (
                    <Pressable key={String(f.id)} style={styles.fileRow} onPress={() => openSongFile(f)}>
                      <Ionicons name={isAudio(f) ? "musical-note" : "document-outline"} size={20} color={f.url ? pcColors.primary : pcColors.textSecondary} />
                      <Text style={styles.fileName} numberOfLines={1}>{prettyName(f.name)}</Text>
                      {f.url && <Ionicons name={isAudio(f) ? "play-circle" : "open-outline"} size={20} color={pcColors.textMuted} />}
                    </Pressable>
                  ))
                ) : (
                  <>
                    <MaterialCommunityIcons name="folder-outline" size={56} color={pcColors.primary} />
                    <Text style={styles.emptyTxt}>There are no files{"\n"}attached to this item</Text>
                  </>
                )
              ) : (
                <Text style={styles.emptyTxt}>{tab} — vine cu feliile Songs/Media</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Placement sheet */}
      <PlacementSheet visible={placeOpen} onClose={() => setPlaceOpen(false)} item={item} onSave={savePlacement} />

      {/* Leader search sheet */}
      <PcBottomSheet visible={leaderOpen} onClose={() => setLeaderOpen(false)} maxHeightPct={0.85}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={styles.sheetTitle}>Add leader</Text>
          <PcSearchBar value={search} onChangeText={doSearch} placeholder="Caută persoană sau poziție" onClear={() => doSearch("")} />
          <ScrollView style={{ maxHeight: 360, marginTop: 12 }} keyboardShouldPersistTaps="handled">
            {searchRes.positions.length > 0 && <Text style={styles.resLabel}>POSITIONS</Text>}
            {searchRes.positions.map((p) => (
              <Pressable key={String(p.id)} style={styles.resRow} onPress={() => addLeader({ positionId: p.id })}>
                <Ionicons name="briefcase-outline" size={20} color={pcColors.textSecondary} />
                <Text style={styles.resName}>{p.name}{p.team ? ` (${p.team})` : ""}</Text>
              </Pressable>
            ))}
            {searchRes.people.length > 0 && <Text style={styles.resLabel}>PEOPLE</Text>}
            {searchRes.people.map((p) => (
              <Pressable key={String(p.id)} style={styles.resRow} onPress={() => addLeader({ personId: p.id })}>
                <PcAvatar uri={p.avatar} initials={p.initials} size={28} />
                <Text style={styles.resName}>{p.name}</Text>
              </Pressable>
            ))}
            {search.length >= 1 && searchRes.positions.length === 0 && searchRes.people.length === 0 && (
              <Text style={styles.emptyTxt}>Niciun rezultat.</Text>
            )}
          </ScrollView>
        </View>
      </PcBottomSheet>

      {/* Voices pool sheet */}
      <PcBottomSheet visible={!!voiceRole} onClose={() => setVoiceRole(null)} maxHeightPct={0.7}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={styles.sheetTitle}>Alege — {ROLE_META.find((r) => r.k === voiceRole)?.l || ""}</Text>
          <Text style={styles.resLabel}>VOCALIȘTII SĂPTĂMÂNII</Text>
          <ScrollView style={{ maxHeight: 360, marginTop: 6 }} keyboardShouldPersistTaps="handled">
            {pool.map((p) => {
              const on = voices.some((v) => v.role === voiceRole && String(v.personId) === String(p.personId));
              return (
                <Pressable key={String(p.personId)} style={styles.resRow} onPress={() => toggleVoice(voiceRole, p)}>
                  <PcAvatar uri={p.avatar} initials={p.initials} size={28} />
                  <Text style={styles.resName}>{p.name}</Text>
                  {p.isVocalist && <View style={styles.mtTag}><Text style={styles.mtTagTxt}>voce</Text></View>}
                  {on && <Ionicons name="checkmark" size={20} color={pcColors.primary} />}
                </Pressable>
              );
            })}
            {!pool.length && <Text style={styles.emptyTxt}>Nimeni programat pe acest plan încă.</Text>}
          </ScrollView>
        </View>
      </PcBottomSheet>
    </PcScreen>
  );
}

/** MedleyBlock (mobil) — snippet-urile medley-ului, cu săgeți jos; editare key/time/parts/note, reorder, remove, chart. */
function MedleyBlock({ item, canEdit, onSave, onOpenChart }) {
  const [list, setList] = useState(item.medley || []);
  React.useEffect(() => { setList(item.medley || []); }, [item.medley]);
  const commit = (next) => { setList(next); onSave(next); };
  const edit = (i, patch) => commit(list.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= list.length) return; const a = [...list]; [a[i], a[j]] = [a[j], a[i]]; commit(a); };
  const remove = (i) => commit(list.filter((_, j) => j !== i));
  const L = (s) => ({ m: Math.floor((s || 0) / 60), s: (s || 0) % 60 });
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <Text style={styles.label}>Cântece în medley</Text>
      {list.map((c, i) => {
        const t = L(c.lengthSec);
        return (
          <View key={i} style={styles.snip}>
            <View style={styles.snHead}>
              <Text style={styles.snN}>{i + 1}</Text>
              <TextInput style={styles.snTitle} value={c.title} editable={canEdit} onChangeText={(v) => edit(i, { title: v })} placeholder="Titlu" placeholderTextColor={pcColors.textMuted} />
              <TextInput style={styles.snKey} value={c.keyName} editable={canEdit} onChangeText={(v) => edit(i, { keyName: v })} placeholder="Gamă" placeholderTextColor={pcColors.textMuted} />
              {canEdit && (
                <>
                  <Pressable onPress={() => move(i, -1)} hitSlop={6}><Ionicons name="chevron-up" size={18} color={pcColors.textMuted} /></Pressable>
                  <Pressable onPress={() => move(i, 1)} hitSlop={6}><Ionicons name="chevron-down" size={18} color={pcColors.textMuted} /></Pressable>
                  <Pressable onPress={() => remove(i)} hitSlop={6}><Ionicons name="close" size={16} color={pcColors.danger} /></Pressable>
                </>
              )}
            </View>
            <View style={styles.snRow2}>
              <TextInput style={styles.snTime} value={String(t.m)} editable={canEdit} keyboardType="number-pad" onChangeText={(v) => edit(i, { lengthSec: (parseInt(v, 10) || 0) * 60 + t.s })} />
              <Text style={styles.unit}>:</Text>
              <TextInput style={styles.snTime} value={String(t.s)} editable={canEdit} keyboardType="number-pad" onChangeText={(v) => edit(i, { lengthSec: t.m * 60 + (parseInt(v, 10) || 0) })} />
              <TextInput style={styles.snSeq} value={(c.sequence || []).join(", ")} editable={canEdit} onChangeText={(v) => edit(i, { sequence: v.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="Părți (ex: Bridge, Coda)" placeholderTextColor={pcColors.textMuted} />
              {c.songId && c.arrangementId && <Pressable onPress={() => onOpenChart(c)} hitSlop={6}><Ionicons name="musical-notes-outline" size={20} color={pcColors.primary} /></Pressable>}
            </View>
            {i < list.length - 1 && <Text style={styles.snArrow}>↓</Text>}
          </View>
        );
      })}
      {!list.length && <Text style={styles.emptyTxt}>Niciun cântec în medley.</Text>}
      {canEdit && <Text style={[styles.emptyTxt, { textAlign: "left", fontSize: 13, marginTop: 10 }]}>Adaugă cântece în medley din aplicația web.</Text>}
    </View>
  );
}

/** Sheet plasare: Before/During/After + bife per oră de serviciu. */
function PlacementSheet({ visible, onClose, item, onSave }) {
  const [placement, setPlacement] = useState("during");
  const [times, setTimes] = useState([]);
  // init la deschidere
  React.useEffect(() => {
    if (visible && item) {
      setPlacement(item.placement || "during");
      const all = item.duringAll || (item.timeIds || []).length === 0;
      setTimes(all ? (item.serviceTimes || []).map((t) => String(t.id)) : (item.timeIds || []).map(String));
    }
  }, [visible, item]);
  if (!item) return null;
  const allTimes = (item.serviceTimes || []).length > 0 && times.length === (item.serviceTimes || []).length;
  const toggleTime = (id) => setTimes((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  return (
    <PcBottomSheet visible={visible} onClose={onClose} maxHeightPct={0.7}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={styles.sheetTitle}>Plasare</Text>
        {["before", "during", "after"].map((p) => (
          <Pressable key={p} style={styles.placeRow} onPress={() => setPlacement(p)}>
            <Ionicons name={placement === p ? "radio-button-on" : "radio-button-off"} size={22} color={placement === p ? pcColors.primary : pcColors.textMuted} />
            <Text style={styles.placeTxt}>{cap(p)}</Text>
          </Pressable>
        ))}
        <View style={styles.divider} />
        <Text style={styles.resLabel}>ORE DE SERVICIU</Text>
        {(item.serviceTimes || []).map((t) => (
          <Pressable key={String(t.id)} style={styles.placeRow} onPress={() => toggleTime(String(t.id))}>
            <PcCheckbox checked={times.includes(String(t.id))} onPress={() => toggleTime(String(t.id))} size={22} />
            <Text style={styles.placeTxt}>{t.label}</Text>
          </Pressable>
        ))}
        <PcButton title="Salvează" onPress={() => onSave(placement, times, allTimes)} block style={{ marginTop: 14 }} />
      </View>
    </PcBottomSheet>
  );
}

/** SONG tab — Edit a song from a plan: aranjament/cheie (dropdown + Add), Sequence, Files (linked song). */
function SongTab({ item, songMeta, arrDetail, canEdit, onChangeArrangement, onChangeKey, onAddArrangement, onEditArrangement, onEditSequence, onOpenFile }) {
  if (item.type !== "song" || !item.songId) {
    return <View style={{ padding: 30, alignItems: "center" }}><Text style={styles.emptyTxt}>Acest element nu e un cântec{"\n"}din bibliotecă.</Text></View>;
  }
  const arrOpts = [
    ...(songMeta?.arrangements || []).map((a) => ({ value: String(a.id), label: a.name })),
    ...(canEdit ? [{ value: "__add_arr__", label: "➕ Add arrangement" }] : []),
  ];
  const keyOpts = [
    ...((arrDetail?.keys) || []).map((k) => ({ value: String(k.id), label: k.label })),
    ...(canEdit && item.arrangementId ? [{ value: "__add_key__", label: "➕ Add key" }] : []),
  ];
  const selKey = ((arrDetail?.keys) || []).find((k) => String(k.id) === String(item.keyId));
  const files = [...((arrDetail?.arrangementFiles) || []), ...((selKey?.files) || [])];
  const onArr = (v) => (v === "__add_arr__" ? onAddArrangement() : onChangeArrangement(v));
  const onKey = (v) => (v === "__add_key__" ? onEditArrangement() : onChangeKey(v));

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
      <Text style={styles.label}>Arrangement</Text>
      <PcSelect value={String(item.arrangementId || "")} options={arrOpts} placeholder={canEdit ? "Alege aranjament" : "—"} onChange={canEdit ? onArr : () => {}} />

      <Text style={[styles.label, { marginTop: 16 }]}>Key</Text>
      <PcSelect value={String(item.keyId || "")} options={keyOpts} placeholder={item.keyName || (canEdit ? "Alege cheia" : "—")} onChange={canEdit ? onKey : () => {}} />

      <Pressable style={styles.seqBtn} onPress={onEditSequence}>
        <Ionicons name="list-outline" size={20} color={pcColors.primary} />
        <Text style={styles.seqBtnTxt}>{item.sequence && item.sequence.length ? `Sequence (${item.sequence.length})` : "Sequence"}</Text>
        <Ionicons name="chevron-forward" size={18} color={pcColors.textMuted} style={{ marginLeft: "auto" }} />
      </Pressable>

      <Text style={[styles.label, { marginTop: 20 }]}>Files</Text>
      {files.length ? files.map((f) => (
        <Pressable key={String(f.id)} style={styles.songFileRow} onPress={() => onOpenFile && onOpenFile(f)}>
          <Ionicons
            name={isAudio(f) ? "musical-note" : f.derived ? "musical-notes-outline" : "document-text-outline"}
            size={20}
            color={(isAudio(f) && f.url) || f.derived ? pcColors.primary : pcColors.textSecondary}
          />
          <Text style={styles.fileName} numberOfLines={1}>{prettyName(f.name)}</Text>
          {f.derived && <View style={styles.mtTag}><Text style={styles.mtTagTxt}>♪</Text></View>}
          {f.source === "multitracks" && <View style={styles.mtTag}><Text style={styles.mtTagTxt}>MT</Text></View>}
          {(f.pending || f.transposeStatus === "pending") && <View style={styles.pendTag}><Text style={styles.pendTxt}>pending</Text></View>}
          {isAudio(f) && f.url && <Ionicons name="play-circle" size={20} color={pcColors.textMuted} />}
        </Pressable>
      )) : <Text style={[styles.emptyTxt, { textAlign: "left", marginTop: 6 }]}>Niciun fișier pe aranjament/cheie.</Text>}

      {canEdit && item.arrangementId && (
        <Pressable style={styles.addFilesRow} onPress={onEditArrangement}>
          <Ionicons name="add-circle-outline" size={20} color={pcColors.primary} />
          <Text style={styles.seqBtnTxt}>Add files to linked song</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: pcColors.bgHeader, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: pcColors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginLeft: 12 },
  delete: { color: pcColors.danger, fontSize: 15, fontWeight: "700" },
  title: { color: pcColors.textPrimary, fontSize: 24, fontWeight: "700", textAlign: "center", paddingVertical: 18, paddingHorizontal: 16 },
  boxesRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  box: { flex: 1, backgroundColor: "#1C1C1E", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  timeIn: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", minWidth: 28, textAlign: "center" },
  unit: { color: pcColors.textMuted, fontSize: 13 },
  during: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "700" },
  block: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  label: { color: pcColors.textSecondary, fontSize: 14, marginBottom: 10 },
  descIn: { color: pcColors.textPrimary, fontSize: 16, minHeight: 60, backgroundColor: pcColors.input, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: pcColors.inputBorder },
  leaderWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  leaderChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: pcColors.card, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  leaderName: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "600" },
  leaderNeeded: { color: pcColors.orange, fontSize: 14, fontWeight: "600" },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, alignSelf: "stretch", paddingHorizontal: 16 },
  fileName: { color: pcColors.textPrimary, fontSize: 15, flexShrink: 1 },
  seqBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: pcColors.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, marginTop: 20 },
  seqBtnTxt: { color: pcColors.primary, fontSize: 15, fontWeight: "600" },
  songFileRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  mtTag: { backgroundColor: pcColors.primary, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  mtTagTxt: { color: "#0A0A0A", fontSize: 10, fontWeight: "800" },
  pendTag: { backgroundColor: pcColors.input, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  pendTxt: { color: pcColors.textMuted, fontSize: 10, fontWeight: "700" },
  addFilesRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14 },
  emptyTxt: { color: pcColors.textMuted, fontSize: 16, textAlign: "center", marginTop: 14, lineHeight: 22 },
  sheetTitle: { color: pcColors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  resLabel: { color: pcColors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  resRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.divider },
  resName: { color: pcColors.textPrimary, fontSize: 16, flex: 1 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  placeTxt: { color: pcColors.textPrimary, fontSize: 16, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: pcColors.divider, marginVertical: 8 },
  transRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  transTxt: { color: pcColors.textPrimary, fontSize: 14, fontWeight: "600" },
  vhead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  importV: { color: pcColors.primary, fontSize: 12.5, fontWeight: "600" },
  vrow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 5 },
  vlabel: { width: 78, color: pcColors.textSecondary, fontSize: 13, paddingTop: 4 },
  vpeople: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  vchip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: pcColors.card, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
  vchipTxt: { color: pcColors.textPrimary, fontSize: 13 },
  vadd: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: pcColors.inputBorder, alignItems: "center", justifyContent: "center" },
  snip: { backgroundColor: pcColors.card, borderRadius: 10, padding: 10, marginBottom: 8 },
  snHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  snN: { width: 20, height: 20, borderRadius: 10, backgroundColor: pcColors.input, color: pcColors.textSecondary, fontSize: 11, fontWeight: "700", textAlign: "center", lineHeight: 20 },
  snTitle: { flex: 1, color: pcColors.textPrimary, fontSize: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.inputBorder, paddingVertical: 2 },
  snKey: { width: 54, color: pcColors.primary, fontSize: 13, fontWeight: "700", textAlign: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pcColors.inputBorder, paddingVertical: 2 },
  snRow2: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  snTime: { width: 36, backgroundColor: pcColors.input, borderRadius: 6, color: pcColors.textPrimary, fontSize: 13, textAlign: "center", paddingVertical: 4 },
  snSeq: { flex: 1, backgroundColor: pcColors.input, borderRadius: 6, color: pcColors.textPrimary, fontSize: 13, paddingHorizontal: 8, paddingVertical: 5 },
  snArrow: { color: pcColors.primary, fontSize: 16, textAlign: "center", marginTop: 6 },
});

export default ItemDetailScreen;
