"use client";

import { useEffect, useState } from "react";
import { parsePersistedValue, serializePersistedValue } from "@/lib/persistence";

export function usePersistedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      setValue(parsePersistedValue(saved, initialValue));
    } catch {
      // P0: local persistence failure must not block task use.
    } finally {
      setHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, serializePersistedValue(value));
    } catch {
      // P0: UI remains usable even when storage is unavailable.
    }
  }, [hydrated, key, value]);

  return [value, setValue, hydrated] as const;
}
