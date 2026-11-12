"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { colors, typography, spacing, shadows, breakpoints } from "@peas/theme";

export type Theme = "light" | "dark";

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
  breakpoints: typeof breakpoints;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// The old "theme" key was filled in from the OS setting; there is no dark
// palette yet, so only an explicit choice stored under this key is honored.
const THEME_STORAGE_KEY = "peas-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  // Update document class when theme changes
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    colors,
    typography,
    spacing,
    shadows,
    breakpoints,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
