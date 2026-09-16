import type { MarketingProductRequest, ProductErrorCode } from "@/lib/product-contract";
import { snapshotFingerprint } from "@/lib/reconcile";

export const FEEDBACK_DISPOSITIONS = ["采用", "部分采用", "需要修改", "放弃"] as const;

export type FeedbackDisposition = (typeof FEEDBACK_DISPOSITIONS)[number];

export type FeedbackEvent = {
  id: string;
  workspace_id: string;
  task_id: string;
  task_execution_id: string;
  feedback: FeedbackDisposition;
  artifact_title: string;
  ai_draft: string;
  user_final: string;
  edit_count: number;
  run_id?: string;
  trace_id?: string;
};

type FeedbackContractViolation = {
  code: ProductErrorCode;
  message: string;
};

type ProductRequestLike = Partial<MarketingProductRequest> & Record<string, unknown>;

type FeedbackIdentityInput = Omit<FeedbackEvent, "id" | "trace_id">;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function validEditCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function isFeedbackDisposition(value: unknown): value is FeedbackDisposition {
  return typeof value === "string" && (FEEDBACK_DISPOSITIONS as readonly string[]).includes(value);
}

export function artifactEditCount(aiDraft: string, userFinal: string) {
  const aiLines = aiDraft.split("\n").filter(Boolean);
  const finalLines = userFinal.split("\n").filter(Boolean);
  return aiLines.filter((line) => !finalLines.includes(line)).length
    + finalLines.filter((line) => !aiLines.includes(line)).length;
}

export function feedbackEventId(input: FeedbackIdentityInput) {
  return `feedback-event:${input.task_id}:${snapshotFingerprint(input)}`;
}

export function feedbackRecordIdempotencyKey(eventId: string) {
  return `feedback.record:${eventId}`;
}

export function buildFeedbackEvent(input: {
  workspaceId: string;
  taskId: string;
  feedback: FeedbackDisposition;
  artifactTitle: string;
  aiDraft: string;
  userFinal: string;
  runId?: string;
  traceId?: string;
}): FeedbackEvent {
  const identity: FeedbackIdentityInput = {
    workspace_id: input.workspaceId,
    task_id: input.taskId,
    task_execution_id: `task-execution:${input.taskId}`,
    feedback: input.feedback,
    artifact_title: input.artifactTitle,
    ai_draft: input.aiDraft,
    user_final: input.userFinal,
    edit_count: artifactEditCount(input.aiDraft, input.userFinal),
    run_id: input.runId,
  };
  return {
    id: feedbackEventId(identity),
    ...identity,
    trace_id: input.traceId,
  };
}

function eventFromRecord(event: Record<string, unknown>): FeedbackIdentityInput | null {
  const aiDraft = stringValue(event.ai_draft);
  const userFinal = stringValue(event.user_final);
  if (aiDraft === null || userFinal === null || !isFeedbackDisposition(event.feedback)) return null;
  if (!validEditCount(event.edit_count)) return null;
  const runId = typeof event.run_id === "undefined" ? undefined : text(event.run_id);
  if (typeof event.run_id !== "undefined" && !runId) return null;
  return {
    workspace_id: text(event.workspace_id),
    task_id: text(event.task_id),
    task_execution_id: text(event.task_execution_id),
    feedback: event.feedback,
    artifact_title: text(event.artifact_title),
    ai_draft: aiDraft,
    user_final: userFinal,
    edit_count: event.edit_count,
    run_id: runId || undefined,
  };
}

export function validateFeedbackProductRequest(input: ProductRequestLike): FeedbackContractViolation | null {
  if (input.operation !== "feedback.record") return null;

  const workspaceId = text(input.workspace_id);
  const taskId = text(input.task_id);
  const payload = record(input.payload);
  const event = record(payload?.feedback_event);
  if (!event) return { code: "VALIDATION_ERROR", message: "feedback.record 缺少 payload.feedback_event。" };

  const eventId = text(event.id);
  if (!eventId) return { code: "VALIDATION_ERROR", message: "feedback.record 缺少 feedback_event.id。" };
  if (text(event.workspace_id) !== workspaceId) {
    return { code: "IDENTITY_MISMATCH", message: "feedback.record 的 Workspace identity 与请求信封不一致。" };
  }
  if (text(event.task_id) !== taskId) {
    return { code: "IDENTITY_MISMATCH", message: "feedback.record 的 Task identity 与请求信封不一致。" };
  }
  if (text(event.task_execution_id) !== `task-execution:${taskId}`) {
    return { code: "IDENTITY_MISMATCH", message: "feedback.record 的 Task Execution identity 不稳定。" };
  }
  if (!isFeedbackDisposition(event.feedback)) {
    return { code: "VALIDATION_ERROR", message: `feedback.record 返回或提交了无效 feedback：${String(event.feedback ?? "MISSING")}` };
  }
  if (!text(event.artifact_title)) {
    return { code: "VALIDATION_ERROR", message: "feedback.record 缺少 artifact_title。" };
  }

  const identity = eventFromRecord(event);
  if (!identity) {
    return { code: "VALIDATION_ERROR", message: "feedback.record 的 AI Draft / User Final / edit_count / run_id 字段无效。" };
  }
  const expectedEditCount = artifactEditCount(identity.ai_draft, identity.user_final);
  if (identity.edit_count !== expectedEditCount) {
    return { code: "VALIDATION_ERROR", message: `feedback.record 的 edit_count ${identity.edit_count} 与实际差异 ${expectedEditCount} 不一致。` };
  }

  const expectedEventId = feedbackEventId(identity);
  if (eventId !== expectedEventId) {
    return { code: "IDENTITY_MISMATCH", message: `feedback.record 事件 ID ${eventId} 与稳定事件 ID ${expectedEventId} 不一致。` };
  }

  const expectedIdempotencyKey = feedbackRecordIdempotencyKey(eventId);
  if (text(input.idempotency_key) !== expectedIdempotencyKey) {
    return { code: "VALIDATION_ERROR", message: "feedback.record 必须使用由稳定事件 ID 派生的 idempotency_key。" };
  }

  if (typeof event.trace_id !== "undefined" && !text(event.trace_id)) {
    return { code: "VALIDATION_ERROR", message: "feedback.record 的 trace_id 必须是非空字符串。" };
  }

  return null;
}

export function expectedFeedbackEntityId(input: ProductRequestLike) {
  if (input.operation !== "feedback.record") return undefined;
  const payload = record(input.payload);
  const event = record(payload?.feedback_event);
  return text(event?.id) || undefined;
}
