import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api } from "../functions";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

/**
 * Provider pentru gestionarea notificărilor în-app
 * Suportă categorii multiple cu criterii de "seen" personalizate
 */
export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    personal: 0,
    church: 0,
    more: 0,
    system: 0,
  });
  const [loading, setLoading] = useState(false);

  // Folosește user ID pentru a detecta schimbări de autentificare
  const currentUserId = user?._id;
  const isAuthenticated = !!currentUserId;

  // Încarcă contoarele de notificări
  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated) {
      setCounts({ personal: 0, church: 0, more: 0, system: 0 });
      return;
    }

    try {
      setLoading(true);
      const data = await api.get("/notifications/counts");
      if (data) {
        setCounts(data);
      }
    } catch (error) {
      console.error("Error fetching notification counts:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Marchează notificările ca văzute pentru o categorie
  const markAsSeen = useCallback(
    async (category) => {
      if (!isAuthenticated || counts[category] === 0) return;

      try {
        await api.post(`/notifications/seen/${category}`);
        setCounts((prev) => ({ ...prev, [category]: 0 }));
      } catch (error) {
        console.error("Error marking notifications as seen:", error);
      }
    },
    [isAuthenticated, counts]
  );

  // Marchează o notificare specifică ca văzută
  const markOneAsSeen = useCallback(
    async (notificationId) => {
      if (!isAuthenticated) return;

      try {
        await api.post(`/notifications/seen-by-id/${notificationId}`);
        // Reîncarcă contoarele
        fetchCounts();
      } catch (error) {
        console.error("Error marking notification as seen:", error);
      }
    },
    [isAuthenticated, fetchCounts]
  );

  // Incrementează local un contor (pentru real-time updates)
  const incrementCount = useCallback((category) => {
    setCounts((prev) => ({
      ...prev,
      [category]: (prev[category] || 0) + 1,
    }));
  }, []);

  // Resetează un contor local
  const resetCount = useCallback((category) => {
    setCounts((prev) => ({ ...prev, [category]: 0 }));
  }, []);

  // Reset și reîncărcare când user-ul se schimbă
  useEffect(() => {
    // Reset counts când user-ul se schimbă
    setCounts({ personal: 0, church: 0, more: 0, system: 0 });

    if (currentUserId) {
      fetchCounts();
    }
  }, [currentUserId, fetchCounts]);

  // Polling pentru actualizări (la fiecare 30 secunde)
  useEffect(() => {
    if (!currentUserId) return;

    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [currentUserId, fetchCounts]);

  const value = {
    counts,
    loading,
    fetchCounts,
    markAsSeen,
    markOneAsSeen,
    incrementCount,
    resetCount,
    totalUnseen: counts.personal + counts.church + counts.more + counts.system,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  // Returnează valori default dacă contextul nu este disponibil
  // pentru a evita blocarea aplicației
  if (!context) {
    return {
      counts: { personal: 0, church: 0, more: 0, system: 0 },
      loading: false,
      fetchCounts: () => {},
      markAsSeen: () => {},
      markOneAsSeen: () => {},
      incrementCount: () => {},
      resetCount: () => {},
      totalUnseen: 0,
    };
  }
  return context;
};
