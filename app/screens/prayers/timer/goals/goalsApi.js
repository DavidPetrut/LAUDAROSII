import { api } from "../../../../global/functions";
import { storage } from "../../../../global/utils/storage";

const SKIP_KEY = "devotional_quiz_skipped";

/**
 * Wrappere subtiri peste API-ul de planuri devotional + un flag local pentru
 * "am dat skip la quiz" (ca sa nu reapara automat la fiecare intrare).
 */
export const goalsApi = {
  getActive: () => api.get("/devotional-plans/active"),
  create: (weeklyGoal, focusAreas) =>
    api.post("/devotional-plans", { weeklyGoal, focusAreas }),
  remove: (id) => api.delete(`/devotional-plans/${id}`),
  logSession: () => api.post("/devotional-plans/log-session", {}),
  history: () => api.get("/devotional-plans/history"),
};

export const quizSkip = {
  get: async () => (await storage.getItem(SKIP_KEY)) === "1",
  set: async () => storage.setItem(SKIP_KEY, "1"),
  clear: async () => storage.deleteItem(SKIP_KEY),
};
