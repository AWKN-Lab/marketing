export const PRODUCT_OPERATIONS = [
  "workspace.create",
  "workspace.update",
  "workspace.get",
  "material.feed",
  "material.parse.get",
  "material.parse.retry",
  "task.create",
  "task.update",
  "task.get",
  "task.execution.get",
  "task.execution.upsert",
  "task.run",
  "feedback.record",
  "outcome.record",
  "evolution.review",
  "learning.watch.upsert",
  "learning.run",
  "learning.run.get",
  "learning.run.retry",
] as const;

export type ProductOperation = (typeof PRODUCT_OPERATIONS)[number];
export type ProductOperationKind = "read" | "write" | "append" | "async";
export type ProductResponseContract = "entity-ack" | "entity-read" | "entity-state" | "async-ack" | "async-read";
export type ProductFieldRequirement = "required" | "optional";

export type ProductOperationMetadata = {
  kind: ProductOperationKind;
  idempotency: "required" | "none";
  workspaceId: ProductFieldRequirement;
  taskId: ProductFieldRequirement;
  response: ProductResponseContract;
};

export const PRODUCT_OPERATION_METADATA = {
  "workspace.create": { kind: "write", idempotency: "required", workspaceId: "required", taskId: "optional", response: "entity-ack" },
  "workspace.update": { kind: "write", idempotency: "required", workspaceId: "required", taskId: "optional", response: "entity-ack" },
  "workspace.get": { kind: "read", idempotency: "none", workspaceId: "required", taskId: "optional", response: "entity-read" },
  "material.feed": { kind: "write", idempotency: "required", workspaceId: "required", taskId: "optional", response: "entity-ack" },
  "material.parse.get": { kind: "read", idempotency: "none", workspaceId: "required", taskId: "optional", response: "entity-state" },
  "material.parse.retry": { kind: "async", idempotency: "required", workspaceId: "required", taskId: "optional", response: "async-ack" },
  "task.create": { kind: "write", idempotency: "required", workspaceId: "required", taskId: "required", response: "entity-ack" },
  "task.update": { kind: "write", idempotency: "required", workspaceId: "required", taskId: "required", response: "entity-ack" },
  "task.get": { kind: "read", idempotency: "none", workspaceId: "required", taskId: "required", response: "entity-read" },
  "task.execution.get": { kind: "read", idempotency: "none", workspaceId: "required", taskId: "required", response: "entity-state" },
  "task.execution.upsert": { kind: "write", idempotency: "required", workspaceId: "required", taskId: "required", response: "entity-ack" },
  "task.run": { kind: "async", idempotency: "required", workspaceId: "required", taskId: "required", response: "async-ack" },
  "feedback.record": { kind: "append", idempotency: "required", workspaceId: "required", taskId: "required", response: "entity-ack" },
  "outcome.record": { kind: "append", idempotency: "required", workspaceId: "required", taskId: "required", response: "entity-ack" },
  "evolution.review": { kind: "write", idempotency: "required", workspaceId: "required", taskId: "optional", response: "entity-ack" },
  "learning.watch.upsert": { kind: "write", idempotency: "required", workspaceId: "required", taskId: "optional", response: "entity-ack" },
  "learning.run": { kind: "async", idempotency: "required", workspaceId: "required", taskId: "optional", response: "async-ack" },
  "learning.run.get": { kind: "read", idempotency: "none", workspaceId: "required", taskId: "optional", response: "async-read" },
  "learning.run.retry": { kind: "async", idempotency: "required", workspaceId: "required", taskId: "optional", response: "async-ack" },
} satisfies Record<ProductOperation, ProductOperationMetadata>;

export const PRODUCT_ERROR_CODES = [
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "WORKSPACE_REVOKED",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "UNSUPPORTED_OPERATION",
  "MISSING_ENTITY_ACK",
  "IDENTITY_MISMATCH",
  "REVISION_CONFLICT",
  "INVALID_REVISION",
  "IDEMPOTENCY_CONFLICT",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_TIMEOUT",
  "RATE_LIMITED",
  "RUN_FAILED",
  "UNKNOWN_UPSTREAM_ERROR",
] as const;

export type ProductErrorCode = (typeof PRODUCT_ERROR_CODES)[number];

export interface MarketingProductRequest<TPayload = unknown> {
  product: "awkn-marketing";
  operation: ProductOperation;
  request_id: string;
  idempotency_key?: string;
  workspace_id?: string;
  task_id?: string;
  payload: TPayload;
}

export interface MarketingProductResponse<TData = unknown> {
  ok: boolean;
  data?: TData;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  trace_id?: string;
}

export type EntityAck = {
  entity_id: string;
  revision: number;
  updated_at: string;
};

export type AsyncRunAck = EntityAck & {
  run_id: string;
  status: "queued" | "running" | "completed" | "failed";
  retryable?: boolean;
};

export type ProductContractViolation = {
  code: ProductErrorCode;
  message: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validUpdatedAt(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function validAsyncStatus(value: unknown): value is AsyncRunAck["status"] {
  return value === "queued" || value === "running" || value === "completed" || value === "failed";
}

function contractError(code: ProductErrorCode, message: string, traceId?: string, retryable?: boolean): MarketingProductResponse {
  return { ok: false, error: { code, message, retryable }, trace_id: traceId };
}

function responseTraceId(value: Record<string, unknown> | null, fallbackTraceId?: string) {
  return text(value?.trace_id ?? value?.traceId) || fallbackTraceId;
}

export function isProductOperation(value: unknown): value is ProductOperation {
  return typeof value === "string" && (PRODUCT_OPERATIONS as readonly string[]).includes(value);
}

export function isProductErrorCode(value: unknown): value is ProductErrorCode {
  return typeof value === "string" && (PRODUCT_ERROR_CODES as readonly string[]).includes(value);
}

export function productOperationMetadata(operation: ProductOperation) {
  return PRODUCT_OPERATION_METADATA[operation];
}

export function validateProductRequestContract(input: unknown): ProductContractViolation | null {
  const row = record(input);
  if (!row) return { code: "VALIDATION_ERROR", message: "产品请求必须是对象。" };
  if (row.product !== "awkn-marketing") return { code: "VALIDATION_ERROR", message: "product 必须为 awkn-marketing。" };
  if (!text(row.request_id)) return { code: "VALIDATION_ERROR", message: "缺少 request_id。" };
  if (!isProductOperation(row.operation)) {
    return { code: "UNSUPPORTED_OPERATION", message: `不支持的 operation：${text(row.operation) || "UNKNOWN"}` };
  }
  if (!("payload" in row)) return { code: "VALIDATION_ERROR", message: `operation ${row.operation} 缺少 payload。` };

  const metadata = PRODUCT_OPERATION_METADATA[row.operation];
  if (metadata.workspaceId === "required" && !text(row.workspace_id)) {
    return { code: "VALIDATION_ERROR", message: `operation ${row.operation} 缺少 workspace_id。` };
  }
  if (metadata.taskId === "required" && !text(row.task_id)) {
    return { code: "VALIDATION_ERROR", message: `operation ${row.operation} 缺少 task_id。` };
  }
  if (metadata.idempotency === "required" && !text(row.idempotency_key)) {
    return { code: "VALIDATION_ERROR", message: `operation ${row.operation} 缺少 idempotency_key。` };
  }
  return null;
}

function validateEntityEnvelope(data: Record<string, unknown> | null, traceId?: string, expectedEntityId?: string): MarketingProductResponse | null {
  if (!data || !text(data.entity_id)) {
    return contractError("MISSING_ENTITY_ACK", `平台没有返回完整 entity_id${expectedEntityId ? `：${expectedEntityId}` : ""}。`, traceId);
  }
  const entityId = text(data.entity_id);
  if (expectedEntityId && entityId !== expectedEntityId) {
    return contractError("IDENTITY_MISMATCH", `平台返回 ID ${entityId}，与产品 ID ${expectedEntityId} 不一致。`, traceId);
  }
  if (!validRevision(data.revision)) {
    return contractError("INVALID_REVISION", `平台返回了无效 revision：${String(data.revision ?? "MISSING")}`, traceId);
  }
  if (!validUpdatedAt(data.updated_at)) {
    return contractError("VALIDATION_ERROR", "平台持久化 Ack 缺少有效 updated_at。", traceId);
  }
  return null;
}

export function validateStableEntityAck<T>(response: MarketingProductResponse<T>, expectedEntityId: string): MarketingProductResponse<T> {
  if (!response.ok) return response;
  const data = record(response.data);
  const error = validateEntityEnvelope(data, response.trace_id, expectedEntityId);
  return error ? error as MarketingProductResponse<T> : response;
}

function errorCodeForHttpStatus(status?: number): ProductErrorCode {
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 408 || status === 504) return "UPSTREAM_TIMEOUT";
  if (status === 429) return "RATE_LIMITED";
  if (typeof status === "number" && status >= 500 && status <= 599) return "UPSTREAM_UNAVAILABLE";
  return "UNKNOWN_UPSTREAM_ERROR";
}

export function normalizeProductResponseContract(
  operation: ProductOperation,
  input: unknown,
  options: { expectedEntityId?: string; fallbackTraceId?: string; httpStatus?: number } = {},
): MarketingProductResponse {
  const row = record(input);
  const traceId = responseTraceId(row, options.fallbackTraceId);
  if (!row || typeof row.ok !== "boolean") {
    return contractError("UNKNOWN_UPSTREAM_ERROR", "AWKN 产品接口返回了无效响应信封。", traceId, true);
  }

  if (!row.ok) {
    const error = record(row.error);
    const rawCode = text(error?.code);
    const code = isProductErrorCode(rawCode) ? rawCode : errorCodeForHttpStatus(options.httpStatus);
    const message = text(error?.message) || "AWKN 产品接口返回失败响应。";
    const retryable = typeof error?.retryable === "boolean" ? error.retryable : undefined;
    return contractError(code, message, traceId, retryable);
  }

  const data = record(row.data);
  const metadata = PRODUCT_OPERATION_METADATA[operation];
  const envelopeError = validateEntityEnvelope(data, traceId, options.expectedEntityId);
  if (envelopeError) return envelopeError;

  if (metadata.response === "entity-read") {
    const entity = record(data?.entity);
    if (!entity) return contractError("VALIDATION_ERROR", `operation ${operation} 缺少 entity 快照。`, traceId);
    if (options.expectedEntityId && text(entity.id) !== options.expectedEntityId) {
      return contractError("IDENTITY_MISMATCH", `平台实体快照 ID ${text(entity.id) || "MISSING"}，与产品 ID ${options.expectedEntityId} 不一致。`, traceId);
    }
  }

  if (metadata.response === "async-ack" || metadata.response === "async-read") {
    if (!text(data?.run_id)) return contractError("VALIDATION_ERROR", `operation ${operation} 缺少 run_id。`, traceId);
    if (!validAsyncStatus(data?.status)) return contractError("VALIDATION_ERROR", `operation ${operation} 返回了无效异步状态。`, traceId);
  }

  return {
    ok: true,
    data: row.data,
    trace_id: traceId,
  };
}
