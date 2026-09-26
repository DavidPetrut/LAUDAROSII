/**
 * Catalogul de capabilitati (accese) al aplicatiei — SURSA UNICA DE ADEVAR.
 * Traieste in cod, nu in DB: baza stocheaza doar comutatoarele (rol -> cheie ->
 * nivel) si override-urile per user, niciodata catalogul. Asta tine DB-ul usor si
 * face imposibila inventarea de accese din afara.
 *
 * Niveluri: "none" < "view" < "edit". "view" = poate vedea/citi; "edit" = poate
 * modifica. Rutele de scriere cer "edit", cele de citire admin cer "view".
 *
 * NU sunt aici (raman EXCLUSIV super-admin, ne-acordabile): schimbarea rolurilor,
 * ban/deblocare, stergerea utilizatorilor, ecranul de control al accesului.
 */

const LEVELS = ["none", "view", "edit"];
const LEVEL_RANK = { none: 0, view: 1, edit: 2 };

const GROUPS = ["Comunicare", "Continut", "Comunitate", "Utilizatori", "Sistem", "Ecrane"];

const CAPABILITIES = [
  { key: "announcements.manage", type: "feature", group: "Comunicare", label: "Anunturi", desc: "Creeaza, editeaza si sterge anunturi" },
  { key: "broadcasts.manage", type: "feature", group: "Comunicare", label: "Notificari in masa", desc: "Trimite push/email catre membri (broadcast)" },

  { key: "courses.manage", type: "feature", group: "Continut", label: "Cursuri", desc: "Adauga, editeaza si sterge cursuri" },
  { key: "songs.manage", type: "feature", group: "Continut", label: "Cantari", desc: "Adauga, editeaza si sterge cantari" },
  { key: "prayer_programs.manage", type: "feature", group: "Continut", label: "Programe de rugaciune", desc: "Liste SIM/Tineret, predicatori, playlist" },
  { key: "templates.manage", type: "feature", group: "Continut", label: "Template-uri devotional", desc: "Creeaza si sterge template-uri de devotional pentru toti userii" },

  { key: "games.manage", type: "feature", group: "Comunitate", label: "Jocuri", desc: "Sterge scoruri / jocuri" },
  { key: "church_prayers.manage", type: "feature", group: "Comunitate", label: "Motive de rugaciune (biserica)", desc: "Adauga si sterge motive in lista de rugaciune a bisericii" },

  { key: "users.view", type: "feature", group: "Utilizatori", label: "Vizualizare utilizatori", desc: "Vede lista de utilizatori si detaliile lor" },

  { key: "testing.manage", type: "feature", group: "Sistem", label: "Mod testare", desc: "Configureaza modul de testare/feedback" },

  { key: "screen.admin_panel", type: "screen", group: "Ecrane", label: "Ecran: Panou Admin", desc: "Acces la ecranul de panou admin (utilizatori + statistici)" },
];

const CAPABILITY_KEYS = CAPABILITIES.map((c) => c.key);
const CAPABILITY_MAP = Object.fromEntries(CAPABILITIES.map((c) => [c.key, c]));

const isValidLevel = (lv) => LEVELS.includes(lv);
const isValidKey = (k) => CAPABILITY_KEYS.includes(k);

module.exports = {
  LEVELS,
  LEVEL_RANK,
  GROUPS,
  CAPABILITIES,
  CAPABILITY_KEYS,
  CAPABILITY_MAP,
  isValidLevel,
  isValidKey,
};
