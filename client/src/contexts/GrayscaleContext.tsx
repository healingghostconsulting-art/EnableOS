import React, { createContext, useContext, useEffect, useState } from "react";

// Grayscale accessibility mode — a persisted user preference that desaturates the whole
// app (filter: grayscale(1) on the document root). It is the litmus test for the
// non-color status work: with color removed, the SidebarNav active state and every
// StatusMark must still be distinguishable by silhouette/weight/shape alone.

const STORAGE_KEY = "enableos.grayscale";

interface GrayscaleContextType {
  grayscale: boolean;
  toggleGrayscale: () => void;
  setGrayscale: (on: boolean) => void;
}

const GrayscaleContext = createContext<GrayscaleContextType | undefined>(undefined);

export function GrayscaleProvider({ children }: { children: React.ReactNode }) {
  const [grayscale, setGrayscale] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("app-grayscale", grayscale);
    try {
      window.localStorage.setItem(STORAGE_KEY, grayscale ? "1" : "0");
    } catch {
      // Storage can be unavailable (private mode / blocked) — the class still applies.
    }
  }, [grayscale]);

  return (
    <GrayscaleContext.Provider value={{ grayscale, toggleGrayscale: () => setGrayscale((v) => !v), setGrayscale }}>
      {children}
    </GrayscaleContext.Provider>
  );
}

export function useGrayscale() {
  const context = useContext(GrayscaleContext);
  if (!context) throw new Error("useGrayscale must be used within GrayscaleProvider");
  return context;
}
