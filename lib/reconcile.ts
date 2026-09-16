import type { MarketingProductResponse, ProductErrorCode } from "@/lib/product-contract";

export type EntityReadData<T> = {
  entity_id: string;
  revision: number;
  entity: T;
  updated_at?: string;
};

export type ReconcileState = "clean" | "local-newer" | "platform-newer" | "conflict" | "unbased" | "stale-platform";

export type ReconcileAssessment = {
  state: ReconcileState;
  localFingerprint: string;
  platformFingerprint: string;
  baselineFingerprint?: string;
  baselineRevision?: number;
  platformRevision: number;
};

export type ReconcileResolutionPolicy = {
  canAcceptPlatform: boolean;
  canKeepLocalAndWrite: boolean;
  errorCode: ProductErrorCode | null;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return Object.keys(record).sort().reduce<Record<string, unknown>>((result, key) => {
    if (typeof record[key] !== "undefined") result[key] = canonicalize(record[key]);
    return result;
  }, {});
}

export function snapshotFingerprint(value: unknown) {
  const text = JSON.stringify(canonicalize(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fp-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function validateEntityReadResponse<T extends { id: string }>(response: MarketingProductResponse<EntityReadData<T>>, expectedEntityId: string): MarketingProductResponse<EntityReadData<T>> {
  if (!response.ok) return response;
  const data = response.data;
  if (!data || typeof data.entity_id !== "string" || typeof data.revision !== "number" || !data.entity || typeof data.entity !== "object") {
    return { ok: false, error: { code: "INVALID_ENTITY_READ", message: `平台没有返回完整实体快照：${expectedEntityId}` }, trace_id: response.trace_id };
  }
  if (data.entity_id !== expectedEntityId || data.entity.id !== expectedEntityId) {
    return { ok: false, error: { code: "ENTITY_READ_IDENTITY_MISMATCH", message: `平台读回实体与产品 ID ${expectedEntityId} 不一致。` }, trace_id: response.trace_id };
  }
  return response;
}

export function reconcileResolutionPolicy(assessment: ReconcileAssessment | null): ReconcileResolutionPolicy {
  if (!assessment || assessment.state === "clean") {
    return { canAcceptPlatform: false, canKeepLocalAndWrite: false, errorCode: null };
  }
  if (assessment.state === "stale-platform") {
    return { canAcceptPlatform: false, canKeepLocalAndWrite: false, errorCode: "INVALID_REVISION" };
  }
  return { canAcceptPlatform: true, canKeepLocalAndWrite: true, errorCode: null };
}

export function reconcileSnapshots(input: {
  localSnapshot: unknown;
  platformSnapshot: unknown;
  platformRevision: number;
  baselineFingerprint?: string;
  baselineRevision?: number;
}): ReconcileAssessment {
  const localFingerprint = snapshotFingerprint(input.localSnapshot);
  const platformFingerprint = snapshotFingerprint(input.platformSnapshot);
  if (!input.baselineFingerprint || typeof input.baselineRevision !== "number") {
    return {
      state: localFingerprint === platformFingerprint ? "clean" : "unbased",
      localFingerprint,
      platformFingerprint,
      baselineFingerprint: input.baselineFingerprint,
      baselineRevision: input.baselineRevision,
      platformRevision: input.platformRevision,
    };
  }
  if (input.platformRevision < input.baselineRevision) {
    return { state: "stale-platform", localFingerprint, platformFingerprint, baselineFingerprint: input.baselineFingerprint, baselineRevision: input.baselineRevision, platformRevision: input.platformRevision };
  }
  const localChanged = localFingerprint !== input.baselineFingerprint;
  const platformChanged = input.platformRevision !== input.baselineRevision || platformFingerprint !== input.baselineFingerprint;
  const state: ReconcileState = localChanged && platformChanged ? "conflict" : localChanged ? "local-newer" : platformChanged ? "platform-newer" : "clean";
  return { state, localFingerprint, platformFingerprint, baselineFingerprint: input.baselineFingerprint, baselineRevision: input.baselineRevision, platformRevision: input.platformRevision };
}