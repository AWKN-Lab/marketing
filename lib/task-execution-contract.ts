import type { MarketingProductRequest, MarketingProductResponse, ProductErrorCode, ProductOperation } from "@/lib/product-contract";
import { isTaskExecutionStatus, taskExecutionId, type TaskExecutionState } from "@/lib/task-execution";

type TaskExecutionContractViolation = {
  code: ProductErrorCode;
  message: string;
};

type ProductRequestLike = Partial<MarketingProductRequest> & Record<string, unknown>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validRevision(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validAttempt(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validTimestamp(value: unknown) {
  return typeof value === "undefined" || (typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value)));
}

function executionSnapshotViolation(
  execution: Record<string, unknown>,
  expectedExecutionId: string,
  expectedTaskId: string,
  expectedWorkspaceId: string,
  operation: string,
): TaskExecutionContractViolation | null {
  const executionId = text(execution.id);
  if (!executionId) return { code: "VALIDATION_ERROR", message: `${operation} 缺少 execution.id。` };
  if (executionId !== expectedExecutionId) {
    return { code: "IDENTITY_MISMATCH", message: `${operation} 的 Execution ID ${executionId} 与产品稳定 ID ${expectedExecutionId} 不一致。` };
  }

  const taskId = text(execution.taskId ?? execution.task_id);
  if (!taskId) return { code: "VALIDATION_ERROR", message: `${operation} 缺少 execution.taskId。` };
  if (taskId !== expectedTaskId) {
    return { code: "IDENTITY_MISMATCH", message: `${operation} 的 taskId ${taskId} 与 task_id ${expectedTaskId} 不一致。` };
  }

  const workspaceId = text(execution.workspaceId ?? execution.workspace_id);
  if (!workspaceId) return { code: "VALIDATION_ERROR", message: `${operation} 缺少 execution.workspaceId。` };
  if (workspaceId !== expectedWorkspaceId) {
    return { code: "IDENTITY_MISMATCH", message: `${operation} 的 workspaceId ${workspaceId} 与 workspace_id ${expectedWorkspaceId} 不一致。` };
  }

  if (!isTaskExecutionStatus(execution.status)) {
    return { code: "VALIDATION_ERROR", message: `${operation} 返回或提交了无效 Execution status：${String(execution.status ?? "MISSING")}` };
  }
  if (!validAttempt(execution.attempt)) {
    return { code: "VALIDATION_ERROR", message: `${operation} 必须携带大于 0 的整数 attempt。` };
  }
  if (!validTimestamp(execution.startedAt ?? execution.started_at) || !validTimestamp(execution.finishedAt ?? execution.finished_at)) {
    return { code: "VALIDATION_ERROR", message: `${operation} 携带了无效的 startedAt / finishedAt。` };
  }
  if (typeof execution.retryable !== "undefined" && typeof execution.retryable !== "boolean") {
    return { code: "VALIDATION_ERROR", message: `${operation} 的 retryable 必须为 boolean。` };
  }
  return null;
}

export function validateTaskExecutionProductRequest(input: ProductRequestLike): TaskExecutionContractViolation | null {
  if (input.operation !== "task.execution.get" && input.operation !== "task.execution.upsert") return null;

  const expectedTaskId = text(input.task_id);
  const expectedWorkspaceId = text(input.workspace_id);
  const expectedExecutionId = taskExecutionId(expectedTaskId);
  const payload = record(input.payload);
  if (!payload) return { code: "VALIDATION_ERROR", message: `operation ${input.operation} 的 payload 必须是对象。` };

  if (input.operation === "task.execution.get") {
    const entityId = text(payload.entity_id);
    if (!entityId) return { code: "VALIDATION_ERROR", message: "task.execution.get 缺少 payload.entity_id。" };
    if (entityId !== expectedExecutionId) {
      return { code: "IDENTITY_MISMATCH", message: `task.execution.get 的 entity_id ${entityId} 与稳定 Execution ID ${expectedExecutionId} 不一致。` };
    }
    return null;
  }

  const execution = record(payload.execution);
  if (!execution) return { code: "VALIDATION_ERROR", message: "task.execution.upsert 缺少 payload.execution。" };
  const violation = executionSnapshotViolation(execution, expectedExecutionId, expectedTaskId, expectedWorkspaceId, input.operation);
  if (violation) return violation;

  if (typeof payload.base_revision !== "undefined" && !validRevision(payload.base_revision)) {
    return { code: "INVALID_REVISION", message: "task.execution.upsert 的 base_revision 必须为空或大于 0。" };
  }
  return null;
}

export function expectedTaskExecutionEntityId(input: ProductRequestLike) {
  if (input.operation !== "task.execution.get" && input.operation !== "task.execution.upsert") return undefined;
  const taskId = text(input.task_id);
  return taskId ? taskExecutionId(taskId) : undefined;
}

export function validateTaskExecutionProductResponse(
  operation: ProductOperation,
  response: MarketingProductResponse,
  expectedTaskId?: string,
  expectedWorkspaceId?: string,
): MarketingProductResponse {
  if (!response.ok || operation !== "task.execution.get") return response;
  const data = record(response.data);
  const execution = record(data?.entity);
  if (!execution) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "task.execution.get 缺少 Execution 快照。", retryable: false },
      trace_id: response.trace_id,
    };
  }
  const taskId = expectedTaskId ?? "";
  const violation = executionSnapshotViolation(
    execution,
    taskExecutionId(taskId),
    taskId,
    expectedWorkspaceId ?? "",
    operation,
  );
  if (!violation) return response;
  return {
    ok: false,
    error: { code: violation.code, message: violation.message, retryable: false },
    trace_id: response.trace_id,
  };
}

export function taskExecutionUpsertIdempotencyKey(input: {
  executionId: string;
  baseRevision?: number;
  fingerprint: string;
}) {
  return `task.execution.upsert:${input.executionId}:${input.baseRevision ?? "new"}:${input.fingerprint}`;
}

export function taskExecutionRetryIdempotencyKey(execution: Pick<TaskExecutionState, "id" | "attempt">) {
  return `task.execution.retry:${execution.id}:attempt:${execution.attempt}`;
}
