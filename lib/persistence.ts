import { scopedStorageKey } from "@/lib/storage-scope";

export const P0_STORAGE_VERSION = 1;
type PersistedEnvelope<T> = { __awkn_marketing_p0: true; version: number; data: T };

export function serializePersistedValue<T>(value: T) { const envelope: PersistedEnvelope<T> = { __awkn_marketing_p0: true, version: P0_STORAGE_VERSION, data: value }; return JSON.stringify(envelope); }
export function parsePersistedValue<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "__awkn_marketing_p0" in parsed && (parsed as { __awkn_marketing_p0?: unknown }).__awkn_marketing_p0 === true && "data" in parsed) return (parsed as PersistedEnvelope<T>).data;
    return parsed as T;
  } catch { return fallback; }
}
export function readPersistedValue<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; return parsePersistedValue(window.localStorage.getItem(scopedStorageKey(key)), fallback); }
export function writePersistedValue<T>(key: string, value: T) { if (typeof window === "undefined") return; window.localStorage.setItem(scopedStorageKey(key), serializePersistedValue(value)); }
