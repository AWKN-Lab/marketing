"use client";

import { callMarketingProduct } from "@/lib/product-client";
import { validateStableEntityAck, type MarketingProductResponse, type ProductOperation } from "@/lib/product-contract";
import { parsePersistedValue, serializePersistedValue } from "@/lib/persistence";
import { snapshotFingerprint } from "@/lib/reconcile";
import { scopedStorageKey } from "@/lib/storage-scope";

export type SyncState = "syncing" | "synced" | "local-only" | "sync-error";
export type SyncRecord = { entityKey: string; operation: ProductOperation; state: SyncState; updatedAt: string; traceId?: string; error?: string; platformRevision?: number; syncedFingerprint?: string };
export const SYNC_RECORDS_KEY = "marketing:sync:records";
export const SYNC_EVENT = "awkn-marketing:sync";

export function syncRecordFromResponse(input: { entityKey: string; operation: ProductOperation; response: MarketingProductResponse; updatedAt?: string; syncedFingerprint?: string }): SyncRecord {
  const state: SyncState = input.response.ok ? "synced" : input.response.error?.code === "PLATFORM_NOT_CONFIGURED" ? "local-only" : "sync-error";
  const data = input.response.data && typeof input.response.data === "object" ? input.response.data as Record<string, unknown> : null;
  return { entityKey: input.entityKey, operation: input.operation, state, updatedAt: input.updatedAt ?? new Date().toISOString(), traceId: input.response.trace_id, error: input.response.ok ? undefined : input.response.error?.message, platformRevision: typeof data?.revision === "number" ? data.revision : undefined, syncedFingerprint: input.response.ok ? input.syncedFingerprint : undefined };
}

function readAllRecords() {
  if (typeof window === "undefined") return {} as Record<string, SyncRecord>;
  return parsePersistedValue<Record<string, SyncRecord>>(window.localStorage.getItem(scopedStorageKey(SYNC_RECORDS_KEY)), {});
}

function writeRecord(record: SyncRecord) {
  if (typeof window === "undefined") return;
  const current = readAllRecords();
  const previous = current[record.entityKey];
  const merged: SyncRecord = {
    ...previous,
    ...record,
    platformRevision: record.platformRevision ?? previous?.platformRevision,
    syncedFingerprint: record.syncedFingerprint ?? previous?.syncedFingerprint,
  };
  window.localStorage.setItem(scopedStorageKey(SYNC_RECORDS_KEY), serializePersistedValue({ ...current, [record.entityKey]: merged }));
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { entityKey: record.entityKey } }));
}

export function readSyncRecord(entityKey: string) {
  return readAllRecords()[entityKey] ?? null;
}

function inferSnapshot(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  return record.workspace ?? record.task ?? record.material ?? record.entity ?? payload;
}

export function markPlatformSnapshotAccepted(input: { entityKey: string; operation: ProductOperation; revision: number; snapshot: unknown; traceId?: string }) {
  writeRecord({ entityKey: input.entityKey, operation: input.operation, state: "synced", updatedAt: new Date().toISOString(), traceId: input.traceId, platformRevision: input.revision, syncedFingerprint: snapshotFingerprint(input.snapshot) });
}

export async function syncMarketingProduct<TPayload>(input: { entityKey: string; operation: ProductOperation; workspaceId?: string; taskId?: string; idempotencyKey?: string; expectedEntityId?: string; payload: TPayload; snapshot?: unknown }) {
  writeRecord({ entityKey: input.entityKey, operation: input.operation, state: "syncing", updatedAt: new Date().toISOString() });
  let response = await callMarketingProduct({ operation: input.operation, workspaceId: input.workspaceId, taskId: input.taskId, idempotencyKey: input.idempotencyKey, payload: input.payload });
  if (input.expectedEntityId && response.ok) response = validateStableEntityAck(response, input.expectedEntityId);
  const fingerprint = response.ok ? snapshotFingerprint(input.snapshot ?? inferSnapshot(input.payload)) : undefined;
  writeRecord(syncRecordFromResponse({ entityKey: input.entityKey, operation: input.operation, response, syncedFingerprint: fingerprint }));
  return response;
}
