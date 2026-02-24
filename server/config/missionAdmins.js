/**
 * Lista de email-uri autorizate să creeze și administreze misiuni
 * Doar acești utilizatori vor vedea butonul de Settings în joc
 */
const MISSION_ADMIN_EMAILS = [
  "eduard_matei@gmail.com",
  "avram_stoican@gmail.com",
  "alex_manolica@gmail.com",
  "naomi@gmail.com",
  "erika@gmail.com",
  "andreea@gmail.com",
  "silviu@gmail.com",
  "andreea_macina@gmail.com",
  "admin@gmail.com",
];

/**
 * Verifică dacă un email are permisiuni de admin pentru misiuni
 * @param {string} email - Email-ul de verificat
 * @returns {boolean}
 */
const isMissionAdmin = (email) => {
  if (!email) return false;
  return MISSION_ADMIN_EMAILS.includes(email.toLowerCase());
};

module.exports = {
  MISSION_ADMIN_EMAILS,
  isMissionAdmin,
};
