import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ScreenHeader } from "../../../global/components";
import { broadcastStyles as styles } from "./broadcastStyles";
import { ComposeView } from "./ComposeView";
import { ScheduledView } from "./ScheduledView";
import { AudienceView } from "./AudienceView";

const TABS = [
  { key: "compose", label: "Compune" },
  { key: "scheduled", label: "Programate" },
  { key: "audience", label: "Audiență" },
];

/**
 * Ecranul de notificari broadcast (super-admin): compunere, notificari programate
 * si gestionarea audientei (statusuri + atribuire). Accesibil doar din Profile.
 */
export const BroadcastScreen = () => {
  const [tab, setTab] = useState("compose");

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notificări" />
      <View style={styles.segment}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.segItem, tab === t.key && styles.segActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segText, tab === t.key && styles.segTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "compose" && <ComposeView />}
      {tab === "scheduled" && <ScheduledView />}
      {tab === "audience" && <AudienceView />}
    </View>
  );
};

export default BroadcastScreen;
