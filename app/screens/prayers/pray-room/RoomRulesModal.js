import React from "react";
import { Keyboard, View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";

const ROOM_RULES = {
  common: {
    title: "Motive Comune",
    lines: [
      "Aici toți membrii se roagă împreună pentru aceleași motive.",
      "Oricine poate adăuga motive, în limita stabilită de organizator.",
      "Toate motivele sunt vizibile pentru toată lumea, ca să vă rugați unii pentru alții.",
      "Camera rămâne activă până la data de final aleasă la creare.",
    ],
  },
  targeted: {
    title: "Motive de Grup",
    lines: [
      "Această cameră e dedicată motivelor unei singure persoane sau ale unui grup.",
      "Doar organizatorul adaugă motivele de rugăciune.",
      "Ceilalți membri le văd și se roagă pentru ele, fără să adauge motive proprii.",
      "Camera rămâne activă până la data de final aleasă la creare.",
    ],
  },
  roulette: {
    title: "Tragere la Sort",
    lines: [
      "Fiecare membru își adaugă propriile motive de rugăciune.",
      "Când organizatorul pornește tragerea, fiecăruia îi este repartizată, aleatoriu, o altă persoană din cameră.",
      "Vezi cine ți-a picat și te rogi pentru motivele acelei persoane.",
      "Repartizarea e valabilă pentru ziua respectivă; cine nu confirmă la timp poate rămâne pe dinafară.",
    ],
  },
};

/**
 * Explica regulile unui tip de camera. La prima intrare (firstTime) e obligatoriu
 * si se inchide doar prin "Am inteles, nu mai arata" (persista pe cont). Redeschisa
 * din iconul info, se poate inchide simplu.
 */
export const RoomRulesModal = ({ visible, roomType, firstTime, onAcknowledge, onClose }) => {
  const rules = ROOM_RULES[roomType];
  if (!rules) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={firstTime ? undefined : onClose}>
      <Pressable style={styles.backdrop} onPress={firstTime ? undefined : onClose}>
        <Pressable style={styles.card} onPress={() => Keyboard.dismiss()}>
          <Text style={styles.kicker}>Cum funcționează</Text>
          <Text style={styles.title}>{rules.title}</Text>

          <View style={styles.body}>
            {rules.lines.map((line, i) => (
              <Text key={i} style={styles.line}>{line}</Text>
            ))}
          </View>

          <TouchableOpacity
            style={styles.btn}
            activeOpacity={0.9}
            onPress={firstTime ? onAcknowledge : onClose}
          >
            <Text style={styles.btnText}>{firstTime ? "Am înțeles, nu mai arăta" : "Am înțeles"}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#161a24",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(229,231,235,0.5)",
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f3f4f6",
    marginBottom: 18,
  },
  body: {
    gap: 12,
    marginBottom: 26,
  },
  line: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(229,231,235,0.82)",
  },
  btn: {
    backgroundColor: "#21c063",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#21c063",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default RoomRulesModal;
