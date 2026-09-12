import { api } from "../functions";

/**
 * Apeluri catre backend pentru modul de TESTARE.
 * Folosesc helper-ul global `api` care ataseaza automat token-ul de auth.
 */

// Verifica daca modul de testare este activ (flag controlat de pe server).
// Nu arunca eroare - daca serverul nu raspunde, consideram flag-ul de fallback.
export const fetchTestingConfig = async () => {
  try {
    const data = await api.get("/testing/config");
    return { enabled: !!data?.enabled, remote: true };
  } catch (e) {
    return { enabled: null, remote: false };
  }
};

// Trimite un raport de bug. Payload-ul complet e construit in TestingContext.
export const submitBugReport = async (payload) => {
  return api.post("/testing/bugs", payload);
};
