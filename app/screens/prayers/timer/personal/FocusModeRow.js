import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Switch, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { devotionalStyles as styles } from "../devotionalStyles";
import {
  loadFocusConfig,
  saveFocusConfig,
  getFocusConfig,
  openSystemDnd,
} from "../../../../global/services";

/**
 * Rand "Nu deranja": activ DOAR in timpul rugaciunii/devotionalului. Opreste
 * notificarile PROPRII ale aplicatiei; pentru apeluri/SMS/alte apps deschide
 * setarea de Nu deranja a telefonului (o app nu le poate bloca singura).
 */
export const FocusModeRow = () => {
  const [cfg, setCfg] = useState(getFocusConfig());
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    loadFocusConfig().then(setCfg);
  }, []);

  const setEnabled = async (v) => setCfg(await saveFocusConfig({ enabled: v }));
  const setMute = async (v) => setCfg(await saveFocusConfig({ muteAppNotifs: v }));

  return (
    <View style={styles.hubRow}>
      <View style={styles.hubIcon}>
        <Ionicons name="moon-outline" size={22} color="#10b981" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.hubTitle}>Nu deranja</Text>
        <Text style={styles.hubDesc}>Doar în timpul rugăciunii / devotionalului</Text>
      </View>
      <TouchableOpacity onPress={() => setEdit(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 10 }}>
        <Ionicons name="create-outline" size={20} color="#10b981" />
      </TouchableOpacity>
      <Switch
        value={cfg.enabled}
        onValueChange={setEnabled}
        trackColor={{ true: "#10b981", false: "rgba(255,255,255,0.2)" }}
        thumbColor="#fff"
      />

      <Modal visible={edit} transparent animationType="fade" onRequestClose={() => setEdit(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setEdit(false)}>
          <Pressable style={styles.colorSheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Nu deranja</Text>
            <Text style={[styles.hubDesc, { marginBottom: 12 }]}>
              Cât timp ești în rugăciune sau devotional, aplicația nu-ți mai trimite notificări.
              Pentru apeluri, SMS și alte aplicații (WhatsApp etc.), telefonul trebuie pus pe
              „Nu deranja" — nicio aplicație nu le poate opri singură.
            </Text>

            <View style={styles.repeatRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.repeatTitle}>Oprește notificările aplicației</Text>
                <Text style={styles.repeatDesc}>În timpul sesiunii</Text>
              </View>
              <Switch
                value={cfg.muteAppNotifs}
                onValueChange={setMute}
                trackColor={{ true: "#10b981", false: "rgba(255,255,255,0.2)" }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity style={[styles.bigBtn, { marginTop: 16 }]} onPress={openSystemDnd} activeOpacity={0.9}>
              <Ionicons name="phone-portrait-outline" size={22} color="#fff" />
              <Text style={styles.bigBtnText}>Deschide „Nu deranja" pe telefon</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={() => setEdit(false)}>
              <Text style={styles.skipBtnText}>Închide</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default FocusModeRow;
