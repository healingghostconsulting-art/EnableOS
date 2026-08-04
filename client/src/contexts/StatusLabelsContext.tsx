import React, { createContext, useContext, useEffect, useState } from "react";

// Always-show-status-labels — a persisted preference that forces every StatusMark to
// render its text label (including dense `variant="dot"` legends that normally show the
// icon only). Mirrors GrayscaleContext. Unlike GrayscaleContext this uses a permissive
// default (no provider → false) rather than throwing, because StatusMark is a leaf used
// in many trees and must never crash if one render path lacks the provider.

const STORAGE_KEY = "enableos.alwaysShowStatusLabels";

interface StatusLabelsContextType {
  alwaysShowLabels: boolean;
  setAlwaysShowLabels: (on: boolean) => void;
  toggleAlwaysShowLabels: () => void;
}

const StatusLabelsContext = createContext<StatusLabelsContextType>({
  alwaysShowLabels: false,
  setAlwaysShowLabels: () => {},
  toggleAlwaysShowLabels: () => {},
});

export function StatusLabelsProvider({ children }: { children: React.ReactNode }) {
  const [alwaysShowLabels, setAlwaysShowLabels] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, alwaysShowLabels ? "true" : "false");
    } catch {
      // Storage unavailable — keep the in-memory value.
    }
  }, [alwaysShowLabels]);

  return (
    <StatusLabelsContext.Provider value={{ alwaysShowLabels, setAlwaysShowLabels, toggleAlwaysShowLabels: () => setAlwaysShowLabels((v) => !v) }}>
      {children}
    </StatusLabelsContext.Provider>
  );
}

export function useStatusLabels() {
  return useContext(StatusLabelsContext);
}
