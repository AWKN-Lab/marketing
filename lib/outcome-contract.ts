import { isFeedbackDisposition, type FeedbackDisposition } from "@/lib/feedback-contract";
import type { MarketingProductRequest, ProductErrorCode } from "@/lib/product-contract";
import { snapshotFingerprint } from "@/lib/reconcile";
import { taskExecutionId, type TaskExecutionState } from "@/lib/task-execution";

export const OUTCOME_TAXONOMY_VERSION = "outcome.v1" as const;
export const OUTCOME_VALUES = ["项目推进", "获得反馈", "方案采用", "暂时搁置", "失败"] as const;
export const OUTCOME_UNKNOWN = "unknown" as const;

export type OutcomeValue = (typeof OUTCOME_VALUES)[number];
export type OutcomeInput = OutcomeValue | typeof OUTCOME_UNKNOWN;
export type OutcomeProjectionState = "pending" | "unknown" | "observed";
export type RecordedOutcomeState = Exclude<OutcomeProjectionState, "pending">;

export type OutcomeEvent = {
  id: string;
  taxonomy_version: typeof OUTCOME_TAXONOMY_VERSION;
  workspace_id: string;
  task_id: string;
  task_execution_id: string;
  feedback_event_id: string;
  state: RecordedOutcomeState;
  outcome: OutcomeInput;
  reason?: string;
  feedback: FeedbackDisposition;
  artifact_text: string;
  evidence_refs: string[];
  run_id?: string;
  trace_id?: string;
};

type OutcomeContractViolation = {
  code: ProductErrorCode;
  message: string;
};

type ProductRequestLike = Partial<MarketingProductRequest> & Record<string, unknown>;
type OutcomeIdentityInput = Omit<OutcomeEvent, "id" | "trace_id">;
export type OutcomeExecutionProjection = Pick<
  TaskExecutionState,
  "id" | "taskId" | "workspaceId" | "feedback" | "outcome" | "outcomeNote" | "finalText"
>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeEvidenceRefs(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function evidenceRefsFromUnknown(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => typeof item === "string" ? item.trim() : "");
  if (items.some((item) => !item)) return null;
  const normalized = normalizeEvidenceRefs(items);
  if (normalized.length !== items.length) return null;
  if (normalized.some((item, index) => item !== items[index])) return null;
  return normalized;
}

export function isOutcomeValue(value: unknown): value is OutcomeValue {
  return typeof value === "string" && (OUTCOME_VALUES as readonly string[]).includes(value);
}

export function isOutcomeInput(value: unknown): value is OutcomeInput {
  return value === OUTCOME_UNKNOWN || isOutcomeValue(value);
}

export function outcomeProjectionState(value: unknown): OutcomeProjectionState {
  if (value === null || typeof value === "undefined" || value === "") return "pending";
  if (value === OUTCOME_UNKNOWN) return "unknown";
  return isOutcomeValue(value) ? "observed" : "unknown";
}

export function requiresOutcomeReason(value: unknown) {
  return value === "暂时搁置" || value === "失败";
}

export function outcomeEventId(input: OutcomeIdentityInput) {
  return `outcome-event:${input.task_id}:${snapshotFingerprint(input)}`;
}

export function outcomeRecordIdempotencyKey(eventId: string) {
  return `outcome.record:${eventId}`;
}

export function buildOutcomeEvent(input: {
  execution: OutcomeExecutionProjection;
  feedbackEventId: string;
  evidenceRefs?: string[];
  runId?: string;
  traceId?: string;
}): OutcomeEvent | null {
  const execution = input.execution;
  if (execution.id !== taskExecutionId(execution.taskId)) return null;
  if (!isFeedbackDisposition(execution.feedback) || !isOutcomeInput(execution.outcome)) return null;
  const state = outcomeProjectionState(execution.outcome);
  if (state === "pending") return null;
  const feedbackEventId = text(input.feedbackEventId);
  if (!feedbackEventId.startsWith(`feedback-event:${execution.taskId}:`)) return null;
  const reason = execution.outcomeNote.trim() || undefined;
  if (requiresOutcomeReason(execution.outcome) && (!reason || reason.length < 3)) return null;

  const identity: OutcomeIdentityInput = {
    taxonomy_version: OUTCOME_TAXONOMY_VERSION,
    workspace_id: execution.workspaceId,
    task_id: execution.taskId,
    task_execution_id: execution.id,
    feedback_event_id: feedbackEventId,
    state,
    outcome: execution.outcome,
    reason,
    feedback: execution.feedback,
    artifact_text: execution.finalText,
    evidence_refs: normalizeEvidenceRefs(input.evidenceRefs ?? []),
    run_id: input.runId?.trim() || undefined,
  };

  return {
    id: outcomeEventId(identity),
    ...identity,
    trace_id: input.traceId?.trim() || undefined,
  };
}

export function outcomeEventMatchesExecution(event: OutcomeEvent, execution: OutcomeExecutionProjection) {
  const reason = execution.outcomeNote.trim() || undefined;
  return event.workspace_id === execution.workspaceId
    && event.task_id === execution.taskId
    && event.task_execution_id === execution.id
    && event.feedback === execution.feedback
    && event.outcome === execution.outcome
    && event.reason === reason
    && event.artifact_text === execution.finalText;
}

function eventFromRecord(event: Record<string, unknown>): OutcomeIdentityInput | null {
  if (event.taxonomy_version !== OUTCOME_TAXONOMY_VERSION) return null;
  if (!isOutcomeInput(event.outcome) || !isFeedbackDisposition(event.feedback)) return null;
  const state = outcomeProjectionState(event.outcome);
  if (state === "pending" || event.state !== state) return null;
  const artifactText = stringValue(event.artifact_text);
  const evidenceRefs = evidenceRefsFromUnknown(event.evidence_refs);
  if (artifactText === null || evidenceRefs === null) return null;
  const reason = typeof event.reason === "undefined" ? undefined : text(event.reason);
  if (typeof event.reason !== "undefined" && !reason) return null;
  if (requiresOutcomeReason(event.outcome) && (!reason || reason.length < 3)) return null;
  const runId = typeof event.run_id === "undefined" ? undefined : text(event.run_id);
  if (typeof event.run_id !== "undefined" && !runId) return null;

  return {
    taxonomy_version: OUTCOME_TAXONOMY_VERSION,
    workspace_id: text(event.workspace_id),
    task_id: text(event.task_id),
    task_execution_id: text(event.task_execution_id),
    feedback_event_id: text(event.feedback_event_id),
    state,
    outcome: event.outcome,
    reason,
    feedback: event.feedback,
    artifact_text: artifactText,
    evidence_refs: evidenceRefs,
    run_id: runId || undefined,
  };
}

export function validateOutcomeProductRequest(input: ProductRequestLike): OutcomeContractViolation | null {
  if (input.operation !== "outcome.record") return null;

  const workspaceId = text(input.workspace_id);
  const taskId = text(input.task_id);
  const payload = record(input.payload);
  const event = record(payload?.outcome_event);
  if (!event) return { code: "VALIDATION_ERROR", message: "outcome.record 缺少 payload.outcome_event。" };

  const eventId = text(event.id);
  if (!eventId) return { code: "VALIDATION_ERROR", message: "outcome.record 缺少 outcome_event.id。" };
  if (text(event.workspace_id) !== workspaceId) {
    return { code: "IDENTITY_MISMATCH", message: "outcome.record 的 Workspace identity 与请求信封不一致。" };
  }
  if (text(event.task_id) !== taskId) {
    return { code: "IDENTITY_MISMATCH", message: "outcome.record 的 Task identity 与请求信封不一致。" };
  }
  if (text(event.task_execution_id) !== taskExecutionId(taskId)) {
    return { code: "IDENTITY_MISMATCH", message: "outcome.record 的 Task Execution identity 不稳定。" };
  }
  if (!text(event.feedback_event_id).startsWith(`feedback-event:${taskId}:`)) {
    return { code: "IDENTITY_MISMATCH", message: "outcome.record 缺少当前 Task 的稳定 Feedback Event identity。" };
  }

  const identity = eventFromRecord(event);
  if (!identity) {
    return { code: "VALIDATION_ERROR", message: "outcome.record 的 taxonomy / state / outcome / feedback / evidence / trace 字段无效。" };
  }
  if (!identity.workspace_id || !identity.task_id || !identity.task_execution_id || !identity.feedback_event_id) {
    return { code: "VALIDATION_ERROR", message: "outcome.record 缺少完整事件关联字段。" };
  }

  const expectedEventId = outcomeEventId(identity);
  if (eventId !== expectedEventId) {
    return { code: "IDENTITY_MISMATCH", message: `outcome.record 事件 ID ${eventId} 与稳定事件 ID ${expectedEventId} 不一致。` };
  }

  const expectedIdempotencyKey = outcomeRecordIdempotencyKey(eventId);
  if (text(input.idempotency_key) !== expectedIdempotencyKey) {
    return { code: "VALIDATION_ERROR", message: "outcome.record 必须使用由稳定事件 ID 派生的 idempotency_key。" };
  }

  if (typeof event.trace_id !== "undefined" && !text(event.trace_id)) {
    return { code: "VALIDATION_ERROR", message: "outcome.record 的 trace_id 必须是非空字符串。" };
  }

  return null;
}

export function expectedOutcomeEntityId(input: ProductRequestLike) {
  if (input.operation !== "outcome.record") return undefined;
  const payload = record(input.payload);
  const event = record(payload?.outcome_event);
  return text(event?.id) || undefined;
}
