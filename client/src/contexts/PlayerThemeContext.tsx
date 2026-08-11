import React, { createContext, useContext, useEffect, useState } from "react";

// Per-user light/dark preference for the /training lesson player ONLY. Mirrors
// GrayscaleContext (persisted user preference) but is deliberately SCOPED: it never
// touches the document root or the app-wide ThemeContext/.dark. The player reads `theme`
// and applies its own conditional CHCG tokens, so nothing outside the player is affected.
// Default is "focus" — the dark focus mode.

export type PlayerTheme = "focus" | "light";

const STORAGE_KEY = "enableos.player.theme";

interface PlayerThemeContextType {
  theme: PlayerTheme;
  /** Convenience: true when the player is in the dark focus mode. */
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: PlayerTheme) => void;
}

const PlayerThemeContext = createContext<PlayerThemeContextType | undefined>(undefined);

export function PlayerThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<PlayerTheme>(() => {
    if (typeof window === "undefined") return "focus";
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "focus";
  });

  // Persist only. No document-root class — this preference is local to the player.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode / blocked) — state still drives the UI.
    }
  }, [theme]);

  return (
    <PlayerThemeContext.Provider
      value={{
        theme,
        isDark: theme === "focus",
        toggleTheme: () => setTheme((current) => (current === "focus" ? "light" : "focus")),
        setTheme,
      }}
    >
      {children}
    </PlayerThemeContext.Provider>
  );
}

export function usePlayerTheme() {
  const context = useContext(PlayerThemeContext);
  if (!context) throw new Error("usePlayerTheme must be used within PlayerThemeProvider");
  return context;
}
