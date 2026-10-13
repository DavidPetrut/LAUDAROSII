/** Dropdown Sort (§9 [PEOPLE-SORT]) — folosește primitivele globale PcAnchoredMenu/PcMenuRow. */
import React from "react";
import { View, StyleSheet } from "react-native";
import { PcAnchoredMenu, PcMenuRow, PcMenuSection } from "../../components";
import { pcColors } from "../../theme";

export function PeopleSortMenu({ visible, onClose, sortBy, dir, onChange }) {
  return (
    <PcAnchoredMenu visible={visible} onClose={onClose} offsetTop={150}>
      <PcMenuSection>SORT BY</PcMenuSection>
      <PcMenuRow active={sortBy === "firstName"} label="First Name" onPress={() => onChange({ sortBy: "firstName" })} />
      <PcMenuRow active={sortBy === "lastName"} label="Last Name" onPress={() => onChange({ sortBy: "lastName" })} />
      <View style={styles.divider} />
      <PcMenuSection>SORT DIRECTION</PcMenuSection>
      <PcMenuRow active={dir === "asc"} label="A-Z" onPress={() => onChange({ dir: "asc" })} />
      <PcMenuRow active={dir === "desc"} label="Z-A" onPress={() => onChange({ dir: "desc" })} />
    </PcAnchoredMenu>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: pcColors.divider, marginVertical: 2 },
});

export default PeopleSortMenu;
