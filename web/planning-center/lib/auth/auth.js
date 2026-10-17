/**
 * Auth web — ACELEAȘI credențiale ca în app-ul mobil.
 * Login la /api/auth/login (JWT 30 zile), tokenul ținut în localStorage.
 * Nu inventăm un sistem de auth paralel: e exact tokenul backend-ului.
 */
const TOKEN_KEY = "pc_web_token";
const USER_KEY = "pc_web_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
}

export function setSession(token, user) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  } catch { /* private mode etc. — ignoră */ }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch { /* noop */ }
}

export function isAuthed() { return !!getToken(); }

/** Login cu email + parolă. Întoarce { token, user } sau aruncă cu mesajul backend-ului. */
export async function login(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Autentificare eșuată.");
  setSession(data.token, data.user);
  return data;
}
