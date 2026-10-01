"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { applyThemeClass, readStoredTheme, type Theme } from "@/lib/theme";
import { runThemeTransition, type ThemeTransitionOrigin } from "@/lib/theme-transition";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: (origin?: ThemeTransitionOrigin) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function currentThemeFromDom(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const lockRef = useRef(false);

  useEffect(() => {
    const stored = readStoredTheme();
    applyThemeClass(stored);
    setThemeState(stored);
  }, []);

  const toggleTheme = useCallback((origin?: ThemeTransitionOrigin) => {
    if (lockRef.current) return;
    lockRef.current = true;

    const next: Theme = currentThemeFromDom() === "dark" ? "light" : "dark";

    const release = () => {
      lockRef.current = false;
    };

    try {
      runThemeTransition(next, setThemeState, release, origin);
    } catch {
      applyThemeClass(next);
      setThemeState(next);
      release();
    }
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
