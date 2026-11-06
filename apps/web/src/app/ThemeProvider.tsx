
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "eclat-theme";

const ThemeContext =
  createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Start with a consistent server/client value
  // to avoid hydration mismatches.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    let initialTheme: Theme = "dark";

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved === "light" || saved === "dark") {
        initialTheme = saved;
      } else if (
        window.matchMedia(
          "(prefers-color-scheme: light)"
        ).matches
      ) {
        initialTheme = "light";
      }
    } catch {
      // Storage may be disabled.
    }

    // Defer the state update out of the effect body.
    queueMicrotask(() => {
      setThemeState(initialTheme);
      document.documentElement.dataset.theme =
        initialTheme;
    });

    // Follow system changes if the user
    // hasn't chosen a theme explicitly.
    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    function handleSystemChange(event: MediaQueryListEvent) {
      try {
        if (localStorage.getItem(STORAGE_KEY)) {
          return;
        }
      } catch {
        // Continue using system preference.
      }

      const next = event.matches ? "dark" : "light";

      setThemeState(next);
      document.documentElement.dataset.theme = next;
    }

    media.addEventListener("change", handleSystemChange);

    return () => {
      media.removeEventListener(
        "change",
        handleSystemChange
      );
    };
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    document.documentElement.dataset.theme = next;

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Theme still works if storage is unavailable.
    }
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
}
