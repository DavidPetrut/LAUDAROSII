/**
 * Taxonomia bug-urilor pentru modul de TESTARE.
 *
 * Structura:
 *   - type  : categoria majora (se salveaza in DB pe field-ul `bugType`)
 *   - code  : sub-problema concreta (se salveaza in DB pe field-ul `bugCode`)
 *
 * Textul (label) este ce vede utilizatorul in limbaj natural; `code` este ce
 * stocam standardizat in DB ca sa putem grupa/filtra usor in interfata de admin.
 *
 * Aceleasi valori (type + code) sunt folosite si de tool-ul de admin de pe
 * desktop pentru filtre si pentru generarea prompturilor. NU schimba codurile
 * fara sa actualizezi si admin-ul.
 */

export const BUG_TYPES = [
  {
    key: "INTERFATA",
    label: "Interfață",
    icon: "color-palette-outline",
    color: "#a855f7",
    hint: "Cum arată",
    problems: [
      { code: "INUTIL", label: "Ce am ales este inutil" },
      { code: "GREU_DE_IDENTIFICAT", label: "Mi-e greu să-l găsesc / observ" },
      { code: "EXTRA", label: "E în plus, poate fi scos" },
      { code: "DESIGN", label: "Nu se înțelege vizual / arată prost" },
      { code: "ALINIERE", label: "E prost aliniat / tăiat / poziționat" },
    ],
  },
  {
    key: "ACCES",
    label: "Accesibilitate",
    icon: "accessibility-outline",
    color: "#0ea5e9",
    hint: "Cât de ușor ajung la el",
    problems: [
      { code: "GREU_DE_ATINS", label: "Greu de apăsat / prea mic" },
      { code: "CONTRAST", label: "Nu se citește / contrast slab" },
      { code: "ASCUNS", label: "E acoperit / nu se vede complet" },
      { code: "NAVIGARE", label: "Greu de ajuns până aici" },
    ],
  },
  {
    key: "STRICAT",
    label: "Stricat",
    icon: "bug-outline",
    color: "#ef4444",
    hint: "Nu funcționează",
    problems: [
      { code: "NU_RASPUNDE", label: "Apăs și nu se întâmplă nimic" },
      { code: "EROARE", label: "Dă eroare / se închide (crash)" },
      { code: "GRESIT", label: "Face altceva decât ar trebui" },
      { code: "INCARCARE", label: "Nu se încarcă / rămâne blocat" },
      { code: "DATE_GRESITE", label: "Afișează date greșite" },
    ],
  },
  {
    key: "EXPERIENTA",
    label: "Experiență (UX)",
    icon: "walk-outline",
    color: "#f59e0b",
    hint: "Cum mă simt folosind",
    problems: [
      { code: "CONFUZ", label: "Nu înțeleg ce trebuie să fac" },
      { code: "LENT", label: "E prea lent / se mișcă greu" },
      { code: "PASI_MULTI", label: "Prea mulți pași pentru un lucru simplu" },
      { code: "NEASTEPTAT", label: "S-a întâmplat ceva neașteptat" },
    ],
  },
  {
    key: "CONTINUT",
    label: "Conținut",
    icon: "text-outline",
    color: "#10b981",
    hint: "Text / imagini",
    problems: [
      { code: "TEXT_GRESIT", label: "Text greșit / greșeală de scriere" },
      { code: "TRADUCERE", label: "Traducere / limbaj nepotrivit" },
      { code: "IMAGINE", label: "Imagine / iconiță greșită sau lipsă" },
      { code: "NEPOTRIVIT", label: "Conținut nepotrivit aici" },
    ],
  },
  {
    key: "ALTELE",
    label: "Altele",
    icon: "ellipsis-horizontal-circle-outline",
    color: "#64748b",
    hint: "Orice altceva",
    problems: [], // doar descriere libera
  },
];

export const getBugType = (key) => BUG_TYPES.find((t) => t.key === key) || null;

export const getProblemLabel = (typeKey, code) => {
  const t = getBugType(typeKey);
  if (!t) return code;
  const p = t.problems.find((p) => p.code === code);
  return p ? p.label : code;
};
