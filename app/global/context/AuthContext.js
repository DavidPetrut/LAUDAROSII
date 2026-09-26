import React, { createContext, useState, useContext, useEffect } from "react";
import { Platform } from "react-native";
import { storage } from "../utils/storage";
import { api } from "../functions/api";

const AuthContext = createContext(null);

// Serverul trimite "id" la login/register, dar "_id" la /users/me.
// Normalizam ca restul aplicatiei sa gaseasca mereu ambele campuri.
const normalizeUser = (u) => {
  if (!u) return u;
  const id = u._id || u.id;
  return id ? { ...u, _id: id, id } : u;
};

const LEVEL_RANK = { none: 0, view: 1, edit: 2 };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingShareCode, setPendingShareCode] = useState(null);
  const [access, setAccess] = useState({});

  useEffect(() => {
    checkDeepLink();
    checkAuth();
  }, []);

  // Incarca accesul efectiv al userului curent (rol + acordari) pentru gating in UI.
  // Poarta reala e pe server; asta doar ascunde ce nu are voie.
  const refreshAccess = async () => {
    try {
      const data = await api.get("/access/me");
      setAccess(data?.access || {});
    } catch (e) {
      setAccess({});
    }
  };

  const checkDeepLink = () => {
    if (Platform.OS !== "web") return;
    const path = window.location.pathname;
    const match = path.match(/\/prayers\/form\/([a-f0-9]+)/i);
    if (match) {
      setPendingShareCode(match[1]);
    }
  };

  const checkAuth = async () => {
    try {
      const token = await storage.getItem("authToken");
      if (token) {
        const userData = await api.get("/users/me");
        setUser(normalizeUser(userData));
        await refreshAccess();
      }
    } catch (error) {
      await storage.deleteItem("authToken");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    await storage.setItem("authToken", response.token);
    setUser(normalizeUser(response.user));
    await refreshAccess();
    return response;
  };

  const register = async (data) => {
    const response = await api.post("/auth/register", data);
    await storage.setItem("authToken", response.token);
    setUser(normalizeUser(response.user));
    await refreshAccess();
    return response;
  };

  const logout = async () => {
    // Reset winstreak la logout
    try {
      await api.post("/stats/reset-winstreak");
    } catch (error) {
      // Ignoră eroarea dacă nu reușește
    }
    
    // Ștergem token-ul și user-ul curent ÎNAINTE de a seta user null
    // pentru a putea accesa user.id pentru cleanup
    const currentUserId = user?.id;
    
    await storage.deleteItem("authToken");
    
    // Cleanup pray-realm game data din AsyncStorage pentru acest user
    if (currentUserId) {
      try {
        await storage.deleteItem(`pray_realm_player_${currentUserId}`);
      } catch (error) {
        // Ignoră eroarea dacă nu reușește
      }
    }
    
    setUser(null);
    setAccess({});
  };

  const updateUser = (userData) => {
    setUser((prev) => normalizeUser({ ...prev, ...userData }));
  };

  const isAdmin =
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.role === "developer";

  const isSuperAdmin = user?.role === "superadmin";

  // Verifica accesul efectiv la o capabilitate. Super-adminul are tot.
  const can = (key, minLevel = "edit") => {
    if (isSuperAdmin) return true;
    const lv = access?.[key] || "none";
    return (LEVEL_RANK[lv] || 0) >= (LEVEL_RANK[minLevel] || 0);
  };

  const clearPendingShareCode = () => setPendingShareCode(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAdmin,
        isSuperAdmin,
        access,
        can,
        refreshAccess,
        pendingShareCode,
        clearPendingShareCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth trebuie folosit în AuthProvider");
  }
  return context;
};
