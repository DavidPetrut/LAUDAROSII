/**
 * Imaginile listelor de rugaciuni: poza fixa a listei publice + presets pentru
 * listele private (aceleasi ca la devotionale) + suport upload (data URI).
 */
export const PUBLIC_LIST_IMAGE = require("../../../public/images/nu_slujesc.jpg");

export const LIST_IMAGE_PRESETS = [
  { key: "war_room_1", label: "War Room", source: require("../../../public/images/war_room_1.jpg") },
  { key: "sim_duminica", label: "Duminică", source: require("../../../public/images/sim_duminica.jpg") },
  { key: "sim_duminica2", label: "Închinare", source: require("../../../public/images/sim_duminica2.jpg") },
];

const PRESET_MAP = LIST_IMAGE_PRESETS.reduce((acc, p) => {
  acc[p.key] = p.source;
  return acc;
}, {});

/**
 * Intoarce un source utilizabil de <Image>/<ImageBackground> pentru o lista privata.
 */
export const resolveListImage = (image) => {
  if (!image) return null;
  if (image.startsWith("preset:")) return PRESET_MAP[image.slice(7)] || null;
  return { uri: image };
};
