"use client";

import { useEffect, useState } from "react";

/**
 * useState that's saved to localStorage. Starts from `initial` on the server
 * and first render, then loads the saved value, so hydration stays consistent.
 * Storage can be unavailable (private mode, blocked site data); the state
 * then simply isn't remembered.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved !== null) setValue(JSON.parse(saved) as T);
    } catch {
      // Ignore unreadable or corrupt storage.
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore full or blocked storage.
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
