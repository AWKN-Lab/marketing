"use client";

import { useEffect, useRef, useState } from "react";
import { parsePersistedValue, serializePersistedValue } from "@/lib/persistence";

export const PERSISTED_STATE_EVENT = "awkn-marketing:persisted-state";
let persistedStateInstance = 0;

export function usePersistedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const suppressNextWrite = useRef(false);
  const lastSerialized = useRef<string | null>(null);
  const instanceId = useRef(`persisted-${++persistedStateInstance}`);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      const next = parsePersistedValue(saved, initialValue);
      lastSerialized.current = saved ?? serializePersistedValue(next);
      setValue(next);
    } catch {
      lastSerialized.current = serializePersistedValue(initialValue);
    } finally {
      setHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    const applyStoredValue = () => {
      try {
        const saved = window.localStorage.getItem(key);
        const serialized = saved ?? serializePersistedValue(initialValue);
        if (serialized === lastSerialized.current) return;
        lastSerialized.current = serialized;
        suppressNextWrite.current = true;
        setValue(parsePersistedValue(saved, initialValue));
      } catch {
        // External sync failure must not block local editing.
      }
    };
    const onCustom = (event: Event) => {
      const custom = event as CustomEvent<{ key?: string; source?: string }>;
      if (custom.detail?.source === instanceId.current) return;
      if (custom.detail?.key === key) applyStoredValue();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) applyStoredValue();
    };
    window.addEventListener(PERSISTED_STATE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PERSISTED_STATE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    if (suppressNextWrite.current) {
      suppressNextWrite.current = false;
      return;
    }
    try {
      const serialized = serializePersistedValue(value);
      if (serialized === lastSerialized.current) return;
      window.localStorage.setItem(key, serialized);
      lastSerialized.current = serialized;
      window.dispatchEvent(new CustomEvent(PERSISTED_STATE_EVENT, { detail: { key, source: instanceId.current } }));
    } catch {
      // P0: local persistence failure must not block task use.
    }
  }, [hydrated, key, value]);

  return [value, setValue, hydrated] as const;
}
