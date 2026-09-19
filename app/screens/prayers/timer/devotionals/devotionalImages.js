/**
 * Imaginile devotionalului: 3 presets din aplicatie + suport pentru upload (data URI).
 * `resolveImage` intoarce un source utilizabil de <Image>/<ImageBackground>.
 */
export const IMAGE_PRESETS = [
  { key: "sim_duminica", label: "Duminică", source: require("../../../../public/images/sim_duminica.jpg") },
  { key: "war_room_1", label: "War Room", source: require("../../../../public/images/war_room_1.jpg") },
  { key: "sim_duminica2", label: "Închinare", source: require("../../../../public/images/sim_duminica2.jpg") },
];

const PRESET_MAP = IMAGE_PRESETS.reduce((acc, p) => {
  acc[p.key] = p.source;
  return acc;
}, {});

export const resolveImage = (image) => {
  if (!image) return null;
  if (image.startsWith("preset:")) return PRESET_MAP[image.slice(7)] || null;
  return { uri: image };
};
