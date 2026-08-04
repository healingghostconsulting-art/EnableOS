import { useEffect, useState } from "react";

// Small localStorage-backed state hook for client-side preferences (Settings page).
// JSON-serialized; tolerant of unavailable storage (private mode) and malformed values.
export function usePersistedState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable — keep the in-memory value.
    }
  }, [key, value]);

  return [value, setValue];
}
