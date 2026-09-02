"use client";

import { useEffect, useRef, useState } from "react";
import { parsePersistedValue, serializePersistedValue } from "@/lib/persistence";
import { scopedStorageKey } from "@/lib/storage-scope";

export const PERSISTED_STATE_EVENT = "awkn-marketing:persisted-state";
let persistedStateInstance = 0;

export function usePersistedState<T>(key: string, initialValue: T) {
  const storageKey = scopedStorageKey(key);
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const suppressNextWrite = useRef(false);
  const lastSerialized = useRef<string | null>(null);
  const instanceId = useRef(`persisted-${++persistedStateInstance}`);

  useEffect(() => {
    setHydrated(false);
    try {
      const saved = window.localStorage.getItem(storageKey);
      const next = parsePersistedValue(saved, initialValue);
      lastSerialized.current = saved ?? serializePersistedValue(next);
      setValue(next);
    } catch {
      lastSerialized.current = serializePersistedValue(initialValue);
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    const applyStoredValue = () => {
      try {
        const saved = window.localStorage.getItem(storageKey);
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
      if (custom.detail?.key === storageKey) applyStoredValue();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) applyStoredValue();
    };
    window.addEventListener(PERSISTED_STATE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PERSISTED_STATE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (suppressNextWrite.current) {
      suppressNextWrite.current = false;
      return;
    }
    try {
      const serialized = serializePersistedValue(value);
      if (serialized === lastSerialized.current) return;
      window.localStorage.setItem(storageKey, serialized);
      lastSerialized.current = serialized;
      window.dispatchEvent(new CustomEvent(PERSISTED_STATE_EVENT, { detail: { key: storageKey, source: instanceId.current } }));
    } catch {
      // Local persistence failure must not block task use.
    }
  }, [hydrated, storageKey, value]);

  return [value, setValue, hydrated] as const;
}
