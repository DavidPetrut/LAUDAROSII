import React from "react";
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from "@expo/vector-icons";

const SETS = {
  ionicons: Ionicons,
  material: MaterialCommunityIcons,
  feather: Feather,
  fontawesome5: FontAwesome5,
};

/**
 * Renderer unic de iconita pentru devotionale: alege familia dupa `set`.
 */
export const DevotionalIcon = ({ set = "ionicons", name, size = 24, color = "#fff" }) => {
  const Comp = SETS[set] || Ionicons;
  return <Comp name={name} size={size} color={color} />;
};

export default DevotionalIcon;
