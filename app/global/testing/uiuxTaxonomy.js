/**
 * Taxonomii pentru categoriile UI/UX din butonul TEST:
 *  - DESIGN (kind "ui_design"): DOAR design-ul ca element vizual (nu experienta).
 *    Maxim 3 categorii, fiecare cu cateva sub-probleme (code) — la fel ca bugTaxonomy.
 *  - UX (kind "ux"): experienta utilizatorului. 3 categorii mari; detaliul vine din
 *    formularul obligatoriu (ce incerca / a reusit / descriere / stres 1-5).
 *
 * `type` (key) -> DB `bugType`; `code` -> DB `bugCode`. NU schimba codurile fara sa
 * actualizezi tool-ul de admin (server taxonomies + promptBuilder).
 */

export const DESIGN_TYPES = [
  {
    key: "ALINIERE",
    label: "Aliniere / spațiere",
    icon: "grid-outline",
    color: "#a855f7",
    hint: "Poziționare vizuală",
    problems: [
      { code: "DECALAT", label: "Elemente decalate / neuniforme" },
      { code: "SPATIERE", label: "Spațiere inconsistentă (prea lipit / prea rar)" },
      { code: "TAIAT", label: "Tăiat / iese din ecran / suprapus" },
    ],
  },
  {
    key: "CULORI",
    label: "Culori / contrast",
    icon: "color-palette-outline",
    color: "#ec4899",
    hint: "Paletă și contrast",
    problems: [
      { code: "CONTRAST", label: "Contrast slab / greu de citit" },
      { code: "NEPOTRIVIT", label: "Culori nepotrivite / inconsistente" },
      { code: "TEMA", label: "Nu respectă tema (dark / light)" },
    ],
  },
  {
    key: "TIPOGRAFIE",
    label: "Text / mărime",
    icon: "text-outline",
    color: "#0ea5e9",
    hint: "Tipografie și dimensiuni",
    problems: [
      { code: "MIC", label: "Text / element prea mic" },
      { code: "MARE", label: "Text / element prea mare" },
      { code: "FONT", label: "Font / stil / greutate nepotrivit" },
    ],
  },
];

export const UX_TYPES = [
  {
    key: "INTELEGERE",
    label: "Greu de înțeles",
    icon: "help-circle-outline",
    color: "#f59e0b",
    hint: "Nu e clar ce / cum",
  },
  {
    key: "PASI",
    label: "Prea mulți pași",
    icon: "footsteps-outline",
    color: "#ef4444",
    hint: "Greoi / prea lung",
  },
  {
    key: "INCREDERE",
    label: "Nesigur / fără feedback",
    icon: "alert-circle-outline",
    color: "#14b8a6",
    hint: "Nu știu ce s-a întâmplat",
  },
];

// Exemple de animatii oferite la UI/UX-dev (ca sugestii, nu obligatoriu).
export const ANIMATION_EXAMPLES = [
  "fade in / out",
  "slide (stânga / dreapta / sus / jos)",
  "scale / zoom (pop)",
  "bounce / spring",
  "shimmer / skeleton la încărcare",
  "cross-fade la schimbare",
  "shake (la eroare)",
];

export const getUiuxType = (kind, key) => {
  const list = kind === "ux" ? UX_TYPES : DESIGN_TYPES;
  return list.find((t) => t.key === key) || null;
};
