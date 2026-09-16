import type { MarketingProductRequest, MarketingProductResponse, ProductErrorCode, ProductOperation } from "@/lib/product-contract";
import { snapshotFingerprint } from "@/lib/reconcile";
import type { LearningWatch } from "@/lib/learning-store";

export const LEARNING_RUN_STATUSES = ["queued", "running", "completed", "failed"] as const;
export type LearningRunStatus = (typeof LEARNING_RUN_STATUSES)[number];

type LearningContractViolation = {
  code: ProductErrorCode;
  message: string;
};

type ProductRequestLike = Partial<MarketingProductRequest> & Record<string, unknown>;

type LearningWatchIdentity = Pick<LearningWatch, "id" | "workspaceId" | "topics" | "sourceTypes" | "cadence" | "enabled">;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validTimestamp(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function validAttempt(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function requestPayload(input: ProductRequestLike) {
  return record(input.payload);
}

export function isLearningRunStatus(value: unknown): value is LearningRunStatus {
  return typeof value === "string" && (LEARNING_RUN_STATUSES as readonly string[]).includes(value);
}

export function learningWatchEntityId(workspaceId: string) {
  return `watch-${workspaceId}`;
}

export function learningWatchUpsertIdempotencyKey(watch: LearningWatchIdentity) {
  return `learning.watch.upsert:${watch.id}:${snapshotFingerprint({
    workspace_id: watch.workspaceId,
    topics: watch.topics,
    source_types: watch.sourceTypes,
    cadence: watch.cadence,
    enabled: watch.enabled,
  })}`;
}

export function learningRunIdempotencyKey(watchId: string, logicalActionId: string) {
  return `learning.run:${watchId}:${logicalActionId}`;
}

export function learningRunRetryIdempotencyKey(runId: string, attempt: number) {
  return `learning.run.retry:${runId}:attempt:${attempt}`;
}

function validateWatchRequest(input: ProductRequestLike): LearningContractViolation | null {
  const workspaceId = text(input.workspace_id);
  const payload = requestPayload(input);
  const watch = record(payload?.watch);
  if (!watch) return { code: "VALIDATION_ERROR", message: "learning.watch.upsert 缺少 payload.watch。" };

  const watchId = text(watch.id);
  const expectedWatchId = learningWatchEntityId(workspaceId);
  if (watchId !== expectedWatchId) {
    return { code: "IDENTITY_MISMATCH", message: `learning.watch.upsert 的 Watch ID ${watchId || "MISSING"} 与稳定 ID ${expectedWatchId} 不一致。` };
  }
  if (text(watch.workspaceId ?? watch.workspace_id) !== workspaceId) {
    return { code: "IDENTITY_MISMATCH", message: "learning.watch.upsert 的 Workspace identity 与请求信封不一致。" };
  }
  if (!validStringList(watch.topics) || !validStringList(watch.sourceTypes ?? watch.source_types)) {
    return { code: "VALIDATION_ERROR", message: "learning.watch.upsert 的 topics / sourceTypes 必须是非空字符串数组。" };
  }
  if (watch.cadence !== "daily") {
    return { code: "VALIDATION_ERROR", message: "learning.watch.upsert 仅接受 daily cadence。" };
  }
  if (typeof watch.enabled !== "boolean") {
    return { code: "VALIDATION_ERROR", message: "learning.watch.upsert 的 enabled 必须为 boolean。" };
  }
  if (!validTimestamp(watch.updatedAt ?? watch.updated_at)) {
    return { code: "VALIDATION_ERROR", message: "learning.watch.upsert 缺少有效 updatedAt。" };
  }

  const expectedKey = learningWatchUpsertIdempotencyKey({
    id: watchId,
    workspaceId,
    topics: watch.topics as string[],
    sourceTypes: (watch.sourceTypes ?? watch.source_types) as string[],
    cadence: "daily",
    enabled: watch.enabled,
  });
  if (text(input.idempotency_key) !== expectedKey) {
    return { code: "VALIDATION_ERROR", message: "learning.watch.upsert 必须使用由稳定 Watch 状态派生的 idempotency_key。" };
  }
  return null;
}

function validateRunRequest(input: ProductRequestLike): LearningContractViolation | null {
  const workspaceId = text(input.workspace_id);
  const payload = requestPayload(input);
  if (!payload) return { code: "VALIDATION_ERROR", message: `operation ${String(input.operation)} 的 payload 必须是对象。` };

  const watchId = text(payload.watch_id);
  const expectedWatchId = learningWatchEntityId(workspaceId);
  if (watchId !== expectedWatchId) {
    return { code: "IDENTITY_MISMATCH", message: `${String(input.operation)} 的 watch_id ${watchId || "MISSING"} 与稳定 Watch ID ${expectedWatchId} 不一致。` };
  }

  if (input.operation === "learning.run") {
    if (!validStringList(payload.topics) || !validStringList(payload.source_types)) {
      return { code: "VALIDATION_ERROR", message: "learning.run 的 topics / source_types 必须是非空字符串数组。" };
    }
    const logicalActionId = text(payload.logical_action_id);
    if (!logicalActionId) return { code: "VALIDATION_ERROR", message: "learning.run 缺少 logical_action_id。" };
    if (text(input.idempotency_key) !== learningRunIdempotencyKey(watchId, logicalActionId)) {
      return { code: "VALIDATION_ERROR", message: "learning.run 必须复用由 logical_action_id 派生的 idempotency_key。" };
    }
    return null;
  }

  const runId = text(payload.run_id);
  if (!runId) return { code: "VALIDATION_ERROR", message: `${String(input.operation)} 缺少 run_id。` };
  if (input.operation === "learning.run.get") return null;

  if (!validStringList(payload.topics) || !validStringList(payload.source_types)) {
    return { code: "VALIDATION_ERROR", message: "learning.run.retry 的 topics / source_types 必须是非空字符串数组。" };
  }
  const attempt = payload.attempt;
  if (!validAttempt(attempt) || attempt < 2) {
    return { code: "VALIDATION_ERROR", message: "learning.run.retry 的 attempt 必须是大于等于 2 的整数。" };
  }
  if (text(input.idempotency_key) !== learningRunRetryIdempotencyKey(runId, attempt)) {
    return { code: "VALIDATION_ERROR", message: "learning.run.retry 必须使用 run_id + attempt 派生的 idempotency_key。" };
  }
  return null;
}

export function validateLearningProductRequest(input: ProductRequestLike): LearningContractViolation | null {
  if (input.operation === "learning.watch.upsert") return validateWatchRequest(input);
  if (input.operation === "learning.run" || input.operation === "learning.run.get" || input.operation === "learning.run.retry") {
    return validateRunRequest(input);
  }
  return null;
}

export function expectedLearningEntityId(input: ProductRequestLike) {
  if (input.operation === "learning.watch.upsert") {
    const workspaceId = text(input.workspace_id);
    return workspaceId ? learningWatchEntityId(workspaceId) : undefined;
  }
  if (input.operation === "learning.run.get" || input.operation === "learning.run.retry") {
    return text(requestPayload(input)?.run_id) || undefined;
  }
  return undefined;
}

function responseError(response: MarketingProductResponse, code: ProductErrorCode, message: string): MarketingProductResponse {
  return { ok: false, error: { code, message, retryable: false }, trace_id: response.trace_id };
}

function validateSignalScope(signal: Record<string, unknown>, workspaceId: string, watchId: string): LearningContractViolation | null {
  if (!text(signal.source ?? signal.url)) {
    return { code: "VALIDATION_ERROR", message: "Learning Signal 缺少 source。" };
  }
  const signalWorkspaceId = text(signal.workspace_id ?? signal.workspaceId);
  if (signalWorkspaceId && signalWorkspaceId !== workspaceId) {
    return { code: "IDENTITY_MISMATCH", message: "Learning Signal 的 Workspace identity 与请求信封不一致。" };
  }
  const signalWatchId = text(signal.watch_id ?? signal.watchId);
  if (signalWatchId && signalWatchId !== watchId) {
    return { code: "IDENTITY_MISMATCH", message: "Learning Signal 的 Watch identity 与请求不一致。" };
  }
  if (typeof signal.trace_id !== "undefined" && !text(signal.trace_id)) {
    return { code: "VALIDATION_ERROR", message: "Learning Signal 的 trace_id 必须是非空字符串。" };
  }
  if (typeof signal.traceId !== "undefined" && !text(signal.traceId)) {
    return { code: "VALIDATION_ERROR", message: "Learning Signal 的 traceId 必须是非空字符串。" };
  }
  return null;
}

export function validateLearningProductResponse(
  operation: ProductOperation,
  response: MarketingProductResponse,
  request: ProductRequestLike,
): MarketingProductResponse {
  if (!response.ok) return response;
  if (operation !== "learning.run" && operation !== "learning.run.get" && operation !== "learning.run.retry") return response;

  const data = record(response.data);
  const payload = requestPayload(request);
  if (!data || !payload) return responseError(response, "VALIDATION_ERROR", `${operation} 缺少完整异步运行数据。`);

  const runId = text(data.run_id);
  const entityId = text(data.entity_id);
  if (!runId) return responseError(response, "VALIDATION_ERROR", `${operation} 缺少 run_id。`);
  if (entityId !== runId) {
    return responseError(response, "IDENTITY_MISMATCH", `${operation} 的 entity_id ${entityId || "MISSING"} 与 run_id ${runId} 不一致。`);
  }

  const expectedRunId = operation === "learning.run" ? "" : text(payload.run_id);
  if (expectedRunId && runId !== expectedRunId) {
    return responseError(response, "IDENTITY_MISMATCH", `${operation} 返回 run_id ${runId}，与逻辑 Learning Run ${expectedRunId} 不一致。`);
  }

  const watchId = text(payload.watch_id);
  const responseWatchId = text(data.watch_id ?? data.watchId);
  if (responseWatchId && responseWatchId !== watchId) {
    return responseError(response, "IDENTITY_MISMATCH", `${operation} 返回的 Watch identity 与请求不一致。`);
  }

  if (!validAttempt(data.attempt)) {
    return responseError(response, "VALIDATION_ERROR", `${operation} 缺少有效 attempt。`);
  }
  if (operation === "learning.run" && data.attempt !== 1) {
    return responseError(response, "VALIDATION_ERROR", "learning.run 初次运行的 attempt 必须为 1。");
  }
  if (operation === "learning.run.retry" && data.attempt !== payload.attempt) {
    return responseError(response, "VALIDATION_ERROR", "learning.run.retry 返回的 attempt 与请求不一致。");
  }
  if (!isLearningRunStatus(data.status)) {
    return responseError(response, "VALIDATION_ERROR", `${operation} 返回了无效 Learning status。`);
  }

  if (typeof data.signals !== "undefined") {
    if (!Array.isArray(data.signals)) return responseError(response, "VALIDATION_ERROR", `${operation} 的 signals 必须为数组。`);
    for (const item of data.signals) {
      const signal = record(item);
      if (!signal) return responseError(response, "VALIDATION_ERROR", `${operation} 返回了无效 Learning Signal。`);
      const violation = validateSignalScope(signal, text(request.workspace_id), watchId);
      if (violation) return responseError(response, violation.code, violation.message);
    }
  }

  return response;
}
