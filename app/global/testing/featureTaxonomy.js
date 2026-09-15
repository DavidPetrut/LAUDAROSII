/**
 * Taxonomia cererilor de FEATURE pentru modul de TESTARE.
 *
 * Testerii sunt si utilizatori reali: pe langa bug-uri, vor sa ceara imbunatatiri
 * si functionalitati noi CHIAR de pe ecranul respectiv. Aceste cereri folosesc
 * EXACT acelasi flux, acelasi JSON si acelasi model (TestBug) ca bug-urile, doar
 * cu `kind: "feature"`. Astfel nu schimbam arhitectura si admin-ul le trateaza la fel.
 *
 * Structura identica cu bugTaxonomy:
 *   - type (key) -> salvat pe `bugType`
 *   - code       -> salvat pe `bugCode`
 *
 * NU schimba codurile fara sa actualizezi tool-ul de admin (promptBuilder.js).
 */

export const FEATURE_TYPES = [
  {
    key: "FUNCTIE_NOUA",
    label: "Funcție nouă",
    icon: "add-circle-outline",
    color: "#22c55e",
    hint: "Ceva ce nu există",
    problems: [
      { code: "ACTIUNE_NOUA", label: "Vreau să pot face o acțiune nouă aici" },
      { code: "BUTON_NOU", label: "Ar trebui un buton / opțiune nouă" },
      { code: "ECRAN_NOU", label: "Lipsește un ecran / o secțiune întreagă" },
    ],
  },
  {
    key: "IMBUNATATIRE",
    label: "Îmbunătățire",
    icon: "trending-up-outline",
    color: "#3b82f6",
    hint: "Există, dar mai bun",
    problems: [
      { code: "MAI_USOR", label: "Ar trebui mai ușor / mai rapid de folosit" },
      { code: "MAI_CLAR", label: "Ar trebui mai clar / mai ușor de înțeles" },
      { code: "MAI_MULTE_OPTIUNI", label: "Aș vrea mai multe opțiuni / control aici" },
      { code: "ARATA_MAI_BINE", label: "Ar putea arăta mai bine / mai modern" },
    ],
  },
  {
    key: "CONTINUT_NOU",
    label: "Conținut nou",
    icon: "document-text-outline",
    color: "#a855f7",
    hint: "Text / imagini / info",
    problems: [
      { code: "INFO_NOUA", label: "Aș vrea mai multe informații afișate" },
      { code: "EXPLICATII", label: "Ar ajuta explicații / instrucțiuni aici" },
      { code: "MEDIA", label: "Aș adăuga o imagine / video / iconiță" },
    ],
  },
  {
    key: "INTEGRARE",
    label: "Legătură",
    icon: "git-network-outline",
    color: "#0ea5e9",
    hint: "Cu alt ecran / serviciu",
    problems: [
      { code: "LEGATURA_ECRAN", label: "Ar trebui legat de alt ecran din app" },
      { code: "PARTAJARE", label: "Aș vrea să pot partaja / exporta de aici" },
      { code: "NOTIFICARE", label: "Aș vrea o notificare / reamintire legată de asta" },
    ],
  },
  {
    key: "AUTOMATIZARE",
    label: "Automatizare",
    icon: "flash-outline",
    color: "#f59e0b",
    hint: "Să se facă singur",
    problems: [
      { code: "AUTO_ACTIUNE", label: "Ceva ar trebui să se întâmple automat" },
      { code: "MEMOREAZA", label: "Aplicația ar trebui să rețină alegerea mea" },
      { code: "SUGESTII", label: "Aș vrea sugestii / completare automată" },
    ],
  },
  {
    key: "PERSONALIZARE",
    label: "Personalizare",
    icon: "options-outline",
    color: "#ec4899",
    hint: "Setări / preferințe",
    problems: [
      { code: "SETARE_NOUA", label: "Aș vrea o setare / preferință nouă" },
      { code: "TEMA_STIL", label: "Aș vrea să pot schimba tema / stilul" },
      { code: "ORDINE", label: "Aș vrea să pot rearanja / ascunde lucruri" },
    ],
  },
  {
    key: "ALTELE",
    label: "Altele",
    icon: "sparkles-outline",
    color: "#64748b",
    hint: "Orice altă idee",
    problems: [], // doar descriere libera
  },
];

export const getFeatureType = (key) => FEATURE_TYPES.find((t) => t.key === key) || null;

export const getFeatureProblemLabel = (typeKey, code) => {
  const t = getFeatureType(typeKey);
  if (!t) return code;
  const p = t.problems.find((p) => p.code === code);
  return p ? p.label : code;
};
