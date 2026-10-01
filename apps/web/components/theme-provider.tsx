"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { applyThemeClass, readStoredTheme, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isTransitioning: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const commitTheme = useCallback((next: Theme) => {
    applyThemeClass(next);
    setThemeState(next);
  }, []);

  const setTheme = useCallback(
    (next: Theme) => {
      if (next === theme || isTransitioning) {
        commitTheme(next);
        return;
      }
      setPendingTheme(next);
      setIsTransitioning(true);
    },
    [commitTheme, isTransitioning, theme],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isTransitioning }),
    [isTransitioning, setTheme, theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {pendingTheme && isTransitioning ? (
          <motion.div
            key={pendingTheme}
            className="pointer-events-none fixed inset-0 z-[10000] bg-background"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "top" }}
            onAnimationStart={() => {
              if (pendingTheme) commitTheme(pendingTheme);
            }}
            onAnimationComplete={() => {
              setPendingTheme(null);
              setIsTransitioning(false);
            }}
          />
        ) : null}
      </AnimatePresence>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
