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

// Bugurile proprii marcate "Rezolvat" de dev, pentru confirmare finala.
export const fetchMyBugs = async () => {
  return api.get("/testing/bugs/mine");
};

// Redeschide un bug propriu rezolvat (il trimite inapoi dev-ului ca "Esuat").
export const reopenMyBug = async (id, note) => {
  return api.patch(`/testing/bugs/${id}/reopen`, { note });
};

// Inchide definitiv (sterge) un bug propriu rezolvat.
export const closeMyBug = async (id) => {
  return api.delete(`/testing/bugs/${id}`);
};

// Inchide definitiv toate bugurile proprii rezolvate.
export const closeAllMyBugs = async () => {
  return api.delete("/testing/bugs/mine/closed");
};
