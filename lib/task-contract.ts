import type { MarketingProductRequest, MarketingProductResponse, ProductErrorCode, ProductOperation } from "@/lib/product-contract";
import { isMarketingTaskStatus } from "@/lib/types";

type TaskContractViolation = {
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

function taskId(input: ProductRequestLike) {
  return text(input.task_id);
}

function workspaceId(input: ProductRequestLike) {
  return text(input.workspace_id);
}

function taskSnapshotViolation(task: Record<string, unknown>, expectedTaskId: string, expectedWorkspaceId: string, operation: string): TaskContractViolation | null {
  const payloadTaskId = text(task.id);
  if (!payloadTaskId) return { code: "VALIDATION_ERROR", message: `${operation} 缺少 task.id。` };
  if (payloadTaskId !== expectedTaskId) {
    return { code: "IDENTITY_MISMATCH", message: `${operation} 的 Task ID ${payloadTaskId} 与 task_id ${expectedTaskId} 不一致。` };
  }

  const payloadWorkspaceId = text(task.workspaceId ?? task.workspace_id);
  if (!payloadWorkspaceId) return { code: "VALIDATION_ERROR", message: `${operation} 缺少 task.workspaceId。` };
  if (payloadWorkspaceId !== expectedWorkspaceId) {
    return { code: "IDENTITY_MISMATCH", message: `${operation} 的 Workspace ID ${payloadWorkspaceId} 与 workspace_id ${expectedWorkspaceId} 不一致。` };
  }

  if (!isMarketingTaskStatus(task.status)) {
    return { code: "VALIDATION_ERROR", message: `${operation} 返回或提交了无效 Task status：${String(task.status ?? "MISSING")}` };
  }

  return null;
}

export function validateTaskProductRequest(input: ProductRequestLike): TaskContractViolation | null {
  if (input.operation !== "task.create" && input.operation !== "task.update" && input.operation !== "task.get") {
    return null;
  }

  const expectedTaskId = taskId(input);
  const expectedWorkspaceId = workspaceId(input);
  const payload = record(input.payload);
  if (!payload) return { code: "VALIDATION_ERROR", message: `operation ${input.operation} 的 payload 必须是对象。` };

  if (input.operation === "task.get") {
    const entityId = text(payload.entity_id);
    if (!entityId) return { code: "VALIDATION_ERROR", message: "task.get 缺少 payload.entity_id。" };
    if (entityId !== expectedTaskId) {
      return { code: "IDENTITY_MISMATCH", message: `task.get 的 entity_id ${entityId} 与 task_id ${expectedTaskId} 不一致。` };
    }
    return null;
  }

  const task = record(payload.task);
  if (!task) return { code: "VALIDATION_ERROR", message: `${input.operation} 缺少 payload.task。` };
  const violation = taskSnapshotViolation(task, expectedTaskId, expectedWorkspaceId, input.operation);
  if (violation) return violation;

  if (input.operation === "task.update" && !validRevision(payload.base_revision)) {
    return { code: "INVALID_REVISION", message: "task.update 必须携带大于 0 的 base_revision。" };
  }

  return null;
}

export function expectedTaskEntityId(input: ProductRequestLike) {
  if (input.operation !== "task.create" && input.operation !== "task.update" && input.operation !== "task.get") {
    return undefined;
  }
  return taskId(input) || undefined;
}

export function validateTaskProductResponse(
  operation: ProductOperation,
  response: MarketingProductResponse,
  expectedTaskId?: string,
  expectedWorkspaceId?: string,
): MarketingProductResponse {
  if (!response.ok || operation !== "task.get") return response;
  const data = record(response.data);
  const task = record(data?.entity);
  if (!task) return response;
  const violation = taskSnapshotViolation(task, expectedTaskId ?? "", expectedWorkspaceId ?? "", operation);
  if (!violation) return response;
  return {
    ok: false,
    error: { code: violation.code, message: violation.message, retryable: false },
    trace_id: response.trace_id,
  };
}

export function taskCreateIdempotencyKey(taskIdValue: string) {
  return `task.create:${taskIdValue}`;
}

export function taskUpdateIdempotencyKey(taskIdValue: string, baseRevision: number, fingerprint: string) {
  return `task.update:${taskIdValue}:${baseRevision}:${fingerprint}`;
}
