/**
 * Temă proprie Planning Center — calibrată pe screenshot-urile PCO (§9 „Temă PCO").
 * NU moștenește tema app-ului; modulul arată identic cu PCO (near-black + verde PCO).
 * Replicabil (§14.4): culorile se pot override din pc_org.brandColors pe viitor.
 */
export const pcColors = {
  // Fundaluri
  bg: "#0E0E0E", // ecran
  bgHeader: "#000000", // antet
  bgNav: "#000000", // bottom nav
  card: "#1C1C1E", // rânduri / carduri
  cardAlt: "#161618",
  sheet: "#1A1A1A", // bottom-sheet
  input: "#1E1E20", // search / inputuri

  // Verde PCO (accent / activ)
  primary: "#86C13F",
  primaryDim: "#6C9E33",
  tabActivePill: "#20330F", // pill verde-închis în spatele iconului activ

  // Portocaliu (badge / unconfirmed / dot necitit)
  orange: "#F5A623",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#9A9A9A",
  textMuted: "#6E6E70",

  // Linii / borduri
  divider: "#242426",
  chipBorder: "#3A3A3C",
  inputBorder: "#2A2A2C",

  // Diverse
  avatarBg: "#3A3A3C",
  danger: "#EF4444",
  overlay: "rgba(0,0,0,0.6)",
  white: "#FFFFFF",
};

/** hex → rgba (pt. tenta translucidă a item row colors pe dark). */
export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== "string") return "transparent";
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return "transparent";
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const pcSpacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 };

export const pcRadius = { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 };

export const pcFont = {
  // System sans (Roboto/SF) ca în PCO — nu folosim fonturile custom ale app-ului.
  h1: { fontSize: 26, fontWeight: "700", color: pcColors.textPrimary },
  title: { fontSize: 20, fontWeight: "700", color: pcColors.textPrimary },
  rowName: { fontSize: 17, fontWeight: "600", color: pcColors.textPrimary },
  body: { fontSize: 15, color: pcColors.textPrimary },
  sub: { fontSize: 14, color: pcColors.textSecondary },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
};

export default { pcColors, pcSpacing, pcRadius, pcFont };
