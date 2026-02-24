import React, { createContext, useState, useContext, useEffect } from "react";
import { storage } from "../utils/storage";

const ThemeContext = createContext(null);

const THEME_KEY = "appTheme";

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await storage.getItem(THEME_KEY);
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === "dark");
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await storage.setItem(THEME_KEY, newMode ? "dark" : "light");
  };

  const theme = {
    isDarkMode,
    background: isDarkMode ? "#1f1f1f" : "#f8fafc",
    surface: isDarkMode ? "#242626" : "#ffffff",
    textPrimary: isDarkMode ? "#ffffff" : "#1e293b",
    textSecondary: isDarkMode ? "#969797" : "#64748b",
    textMuted: isDarkMode ? "#969797" : "#94a3b8",
    border: isDarkMode ? "#333333" : "#e2e8f0",
    headerGradient: isDarkMode ? ["#1f1f1f", "#333333"] : ["#f8fafc", "#ffffff"],
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        theme,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme trebuie folosit în ThemeProvider");
  }
  return context;
};
