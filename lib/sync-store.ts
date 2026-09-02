"use client";

import { callMarketingProduct } from "@/lib/product-client";
import type { MarketingProductResponse, ProductOperation } from "@/lib/product-contract";
import { parsePersistedValue, serializePersistedValue } from "@/lib/persistence";

export type SyncState = "syncing" | "synced" | "local-only" | "sync-error";

export type SyncRecord = {
  entityKey: string;
  operation: ProductOperation;
  state: SyncState;
  updatedAt: string;
  traceId?: string;
  error?: string;
};

export const SYNC_RECORDS_KEY = "marketing:sync:records";
export const SYNC_EVENT = "awkn-marketing:sync";

export function syncRecordFromResponse(input: {
  entityKey: string;
  operation: ProductOperation;
  response: MarketingProductResponse;
  updatedAt?: string;
}): SyncRecord {
  const state: SyncState = input.response.ok
    ? "synced"
    : input.response.error?.code === "PLATFORM_NOT_CONFIGURED"
      ? "local-only"
      : "sync-error";
  return {
    entityKey: input.entityKey,
    operation: input.operation,
    state,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    traceId: input.response.trace_id,
    error: input.response.ok ? undefined : input.response.error?.message,
  };
}

function writeRecord(record: SyncRecord) {
  if (typeof window === "undefined") return;
  const current = parsePersistedValue<Record<string, SyncRecord>>(window.localStorage.getItem(SYNC_RECORDS_KEY), {});
  const next = { ...current, [record.entityKey]: record };
  window.localStorage.setItem(SYNC_RECORDS_KEY, serializePersistedValue(next));
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { entityKey: record.entityKey } }));
}

export function readSyncRecord(entityKey: string) {
  if (typeof window === "undefined") return null;
  const current = parsePersistedValue<Record<string, SyncRecord>>(window.localStorage.getItem(SYNC_RECORDS_KEY), {});
  return current[entityKey] ?? null;
}

export async function syncMarketingProduct<TPayload>(input: {
  entityKey: string;
  operation: ProductOperation;
  workspaceId?: string;
  taskId?: string;
  payload: TPayload;
}) {
  writeRecord({ entityKey: input.entityKey, operation: input.operation, state: "syncing", updatedAt: new Date().toISOString() });
  const response = await callMarketingProduct({ operation: input.operation, workspaceId: input.workspaceId, taskId: input.taskId, payload: input.payload });
  writeRecord(syncRecordFromResponse({ entityKey: input.entityKey, operation: input.operation, response }));
  return response;
}
