import type { MarketingProductRequest, MarketingProductResponse, ProductErrorCode } from "@/lib/product-contract";
import { snapshotFingerprint } from "@/lib/reconcile";

export const EVOLUTION_REVIEW_DECISIONS = ["accepted", "scoped", "rejected"] as const;
export type EvolutionReviewDecision = (typeof EVOLUTION_REVIEW_DECISIONS)[number];

/** 跨任务重复模式 Candidate 使用的类型。 */
export const EVOLUTION_PATTERN_CANDIDATE_TYPES = ["Preference Candidate", "Decision Pattern Candidate"] as const;
export type EvolutionPatternCandidateType = (typeof EVOLUTION_PATTERN_CANDIDATE_TYPES)[number];

export const PATTERN_CANDIDATE_ID_PREFIX = "local-evp-";
export const PATTERN_MIN_SUPPORT = 2;

export type PatternSupportingChain = {
  task_id: string;
  feedback_event_id: string;
  outcome_event_id: string;
};

export type PatternEvidenceChain = {
  kind: string;
  signal: string;
  support_count: number;
  source_task_ids: string[];
  supporting_chains: PatternSupportingChain[];
};

export type EvolutionCandidateEvidenceChain = {
  ai_draft: string;
  user_final: string;
  feedback_event_id: string;
  outcome_event_id: string;
  evidence_refs: string[];
  run_id?: string;
  trace_id?: string;
  /** 仅 Pattern Candidate 存在：跨任务模式的支撑证据链。 */
  pattern_evidence?: PatternEvidenceChain;
};

export type EvolutionReviewScope =
  | { type: "global" }
  | { type: "workspace"; workspace_id: string }
  | { type: "none" };

export type EvolutionReviewRecord = {
  id: string;
  candidate_id: string;
  candidate_revision: number;
  workspace_id: string;
  task_id: string;
  decision: EvolutionReviewDecision;
  scope: EvolutionReviewScope;
  reviewer_actor_id: string;
};

type EvolutionContractViolation = {
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

function positiveRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validDate(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function normalizedEvidenceRefs(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const refs = value.map((item) => typeof item === "string" ? item.trim() : "");
  if (refs.some((item) => !item)) return null;
  const normalized = Array.from(new Set(refs)).sort();
  if (normalized.length !== refs.length) return null;
  if (normalized.some((item, index) => item !== refs[index])) return null;
  return normalized;
}

export function isEvolutionReviewDecision(value: unknown): value is EvolutionReviewDecision {
  return typeof value === "string" && (EVOLUTION_REVIEW_DECISIONS as readonly string[]).includes(value);
}

export function evolutionCandidateId(taskId: string) {
  return `local-ev-${taskId}`;
}

export function evolutionPatternCandidateId(patternId: string) {
  return `${PATTERN_CANDIDATE_ID_PREFIX}${patternId}`;
}

export function isPatternCandidateType(value: unknown): value is EvolutionPatternCandidateType {
  return typeof value === "string" && (EVOLUTION_PATTERN_CANDIDATE_TYPES as readonly string[]).includes(value);
}

export function evolutionReviewId(candidateId: string) {
  return `evolution-review:${candidateId}`;
}

export function evolutionReviewScope(decision: EvolutionReviewDecision, workspaceId: string): EvolutionReviewScope {
  if (decision === "accepted") return { type: "global" };
  if (decision === "scoped") return { type: "workspace", workspace_id: workspaceId };
  return { type: "none" };
}

export function buildEvolutionReview(input: {
  candidateId: string;
  candidateRevision: number;
  workspaceId: string;
  taskId: string;
  decision: EvolutionReviewDecision;
  reviewerActorId: string;
}): EvolutionReviewRecord {
  return {
    id: evolutionReviewId(input.candidateId),
    candidate_id: input.candidateId,
    candidate_revision: input.candidateRevision,
    workspace_id: input.workspaceId,
    task_id: input.taskId,
    decision: input.decision,
    scope: evolutionReviewScope(input.decision, input.workspaceId),
    reviewer_actor_id: input.reviewerActorId,
  };
}

export function evolutionReviewIdempotencyKey(review: EvolutionReviewRecord, baseRevision?: number) {
  return `evolution.review:${review.id}:${snapshotFingerprint({
    candidate_id: review.candidate_id,
    candidate_revision: review.candidate_revision,
    decision: review.decision,
    scope: review.scope,
    reviewer_actor_id: review.reviewer_actor_id,
    base_revision: baseRevision ?? null,
  })}`;
}

function validatePatternEvidence(evidence: Record<string, unknown>, anchorTaskId: string): EvolutionContractViolation | null {
  const pattern = record(evidence.pattern_evidence);
  if (!pattern) return { code: "VALIDATION_ERROR", message: "Pattern Candidate 必须携带 pattern_evidence。" };
  const supportCount = pattern.support_count;
  if (!positiveRevision(supportCount) || supportCount < PATTERN_MIN_SUPPORT) {
    return { code: "VALIDATION_ERROR", message: `Pattern Candidate 至少需要 ${PATTERN_MIN_SUPPORT} 个支撑任务。` };
  }
  const sourceTaskIds = pattern.source_task_ids;
  if (!Array.isArray(sourceTaskIds) || sourceTaskIds.length < PATTERN_MIN_SUPPORT) {
    return { code: "VALIDATION_ERROR", message: "Pattern Candidate 的 source_task_ids 不完整。" };
  }
  const taskIds = sourceTaskIds.map((item) => text(item));
  if (taskIds.some((item) => !item)) {
    return { code: "VALIDATION_ERROR", message: "Pattern Candidate 的 source_task_ids 含空值。" };
  }
  if (new Set(taskIds).size !== taskIds.length) {
    return { code: "VALIDATION_ERROR", message: "Pattern Candidate 的 source_task_ids 必须去重。" };
  }
  if (!taskIds.includes(anchorTaskId)) {
    return { code: "IDENTITY_MISMATCH", message: "Pattern Candidate 的锚点任务必须包含在 source_task_ids 中。" };
  }
  const chains = pattern.supporting_chains;
  if (!Array.isArray(chains) || chains.length < PATTERN_MIN_SUPPORT) {
    return { code: "VALIDATION_ERROR", message: "Pattern Candidate 缺少支撑任务的证据链。" };
  }
  const seen = new Set<string>();
  for (const chain of chains) {
    const row = record(chain);
    const chainTaskId = text(row?.task_id);
    const feedbackEventId = text(row?.feedback_event_id);
    const outcomeEventId = text(row?.outcome_event_id);
    if (!chainTaskId || !feedbackEventId || !outcomeEventId) {
      return { code: "VALIDATION_ERROR", message: "Pattern Candidate 的支撑证据链不完整。" };
    }
    if (!taskIds.includes(chainTaskId)) {
      return { code: "IDENTITY_MISMATCH", message: "Pattern Candidate 的支撑证据链引用了未知任务。" };
    }
    if (seen.has(chainTaskId)) {
      return { code: "VALIDATION_ERROR", message: "Pattern Candidate 的支撑证据链存在重复任务。" };
    }
    seen.add(chainTaskId);
    if (!feedbackEventId.startsWith(`feedback-event:${chainTaskId}:`)) {
      return { code: "IDENTITY_MISMATCH", message: "Pattern Candidate 支撑任务的 Feedback Event identity 无效。" };
    }
    if (!outcomeEventId.startsWith(`outcome-event:${chainTaskId}:`)) {
      return { code: "IDENTITY_MISMATCH", message: "Pattern Candidate 支撑任务的 Outcome Event identity 无效。" };
    }
  }
  if (seen.size !== taskIds.length) {
    return { code: "VALIDATION_ERROR", message: "Pattern Candidate 的每个支撑任务都必须有独立证据链。" };
  }
  return null;
}

function validateCandidate(candidate: Record<string, unknown>, workspaceId: string, taskId: string): EvolutionContractViolation | null {
  const candidateId = text(candidate.id);
  const patternCandidate = Boolean(record(candidate.evidence)?.pattern_evidence) || isPatternCandidateType(candidate.type);
  if (patternCandidate) {
    if (!candidateId.startsWith(PATTERN_CANDIDATE_ID_PREFIX)) {
      return { code: "IDENTITY_MISMATCH", message: "Pattern Candidate ID 必须使用 local-evp- 前缀。" };
    }
  } else if (candidateId !== evolutionCandidateId(taskId)) {
    return { code: "IDENTITY_MISMATCH", message: "Evolution Candidate ID 与稳定 Task identity 不一致。" };
  }
  if (text(candidate.taskId) !== taskId || text(candidate.workspaceId) !== workspaceId) {
    return { code: "IDENTITY_MISMATCH", message: "Evolution Candidate 的 Workspace / Task identity 与请求信封不一致。" };
  }
  if (!positiveRevision(candidate.revision)) {
    return { code: "INVALID_REVISION", message: "Evolution Candidate 缺少有效 revision。" };
  }
  if (!text(candidate.fingerprint) || !validDate(candidate.createdAt)) {
    return { code: "VALIDATION_ERROR", message: "Evolution Candidate 缺少 fingerprint 或 createdAt。" };
  }
  if (candidate.polarity !== "positive" && candidate.polarity !== "caution" && candidate.polarity !== "negative") {
    return { code: "VALIDATION_ERROR", message: "Evolution Candidate polarity 无效。" };
  }
  if (candidate.type !== "Experience Candidate" && candidate.type !== "Counterexample Candidate" && !patternCandidate) {
    return { code: "VALIDATION_ERROR", message: "Evolution Candidate type 无效。" };
  }
  if (candidate.polarity === "negative" && candidate.type !== "Counterexample Candidate") {
    return { code: "VALIDATION_ERROR", message: "negative Candidate 必须保持 Counterexample 语义。" };
  }
  if (typeof candidate.confidence !== "number" || !Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
    return { code: "VALIDATION_ERROR", message: "Evolution Candidate confidence 必须位于 0 到 1。" };
  }
  for (const field of ["lesson", "why", "source", "scope", "counterexample"] as const) {
    if (!text(candidate[field])) return { code: "VALIDATION_ERROR", message: `Evolution Candidate 缺少 ${field}。` };
  }

  const evidence = record(candidate.evidence);
  if (!evidence) return { code: "VALIDATION_ERROR", message: "Evolution Candidate 缺少 evidence chain。" };
  if (!text(evidence.ai_draft) || !text(evidence.user_final)) {
    return { code: "VALIDATION_ERROR", message: "Evolution Candidate 必须引用 AI Draft 与 User Final。" };
  }
  if (!text(evidence.feedback_event_id).startsWith(`feedback-event:${taskId}:`)) {
    return { code: "IDENTITY_MISMATCH", message: "Evolution Candidate Feedback Event identity 无效。" };
  }
  if (!text(evidence.outcome_event_id).startsWith(`outcome-event:${taskId}:`)) {
    return { code: "IDENTITY_MISMATCH", message: "Evolution Candidate Outcome Event identity 无效。" };
  }
  if (normalizedEvidenceRefs(evidence.evidence_refs) === null) {
    return { code: "VALIDATION_ERROR", message: "Evolution Candidate Evidence refs 必须去重并排序。" };
  }
  if (typeof evidence.run_id !== "undefined" && !text(evidence.run_id)) {
    return { code: "VALIDATION_ERROR", message: "Evolution Candidate run_id 必须是非空字符串。" };
  }
  if (typeof evidence.trace_id !== "undefined" && !text(evidence.trace_id)) {
    return { code: "VALIDATION_ERROR", message: "Evolution Candidate trace_id 必须是非空字符串。" };
  }
  if (patternCandidate) {
    const patternViolation = validatePatternEvidence(evidence, taskId);
    if (patternViolation) return patternViolation;
  }
  return null;
}

function validateReviewScope(review: Record<string, unknown>, workspaceId: string): EvolutionContractViolation | null {
  if (!isEvolutionReviewDecision(review.decision)) {
    return { code: "VALIDATION_ERROR", message: "evolution.review decision 无效。" };
  }
  const scope = record(review.scope);
  if (!scope) return { code: "VALIDATION_ERROR", message: "evolution.review 缺少 scope。" };
  if (review.decision === "accepted" && (scope.type !== "global" || typeof scope.workspace_id !== "undefined")) {
    return { code: "VALIDATION_ERROR", message: "accepted Review 必须使用 global scope。" };
  }
  if (review.decision === "scoped" && (scope.type !== "workspace" || text(scope.workspace_id) !== workspaceId)) {
    return { code: "IDENTITY_MISMATCH", message: "scoped Review 必须绑定当前 Workspace。" };
  }
  if (review.decision === "rejected" && (scope.type !== "none" || typeof scope.workspace_id !== "undefined")) {
    return { code: "VALIDATION_ERROR", message: "rejected Review 必须使用 none scope。" };
  }
  return null;
}

export function validateEvolutionProductRequest(input: ProductRequestLike): EvolutionContractViolation | null {
  if (input.operation !== "evolution.review") return null;

  const workspaceId = text(input.workspace_id);
  const taskId = text(input.task_id);
  if (!taskId) return { code: "VALIDATION_ERROR", message: "evolution.review 缺少 task_id。" };

  const payload = record(input.payload);
  const candidate = record(payload?.candidate);
  const review = record(payload?.review);
  if (!candidate || !review) {
    return { code: "VALIDATION_ERROR", message: "evolution.review 缺少 candidate 或 review。" };
  }

  const candidateViolation = validateCandidate(candidate, workspaceId, taskId);
  if (candidateViolation) return candidateViolation;

  const candidateId = text(candidate.id);
  const candidateRevision = candidate.revision;
  const expectedReviewId = evolutionReviewId(candidateId);
  if (text(review.id) !== expectedReviewId || text(review.candidate_id) !== candidateId) {
    return { code: "IDENTITY_MISMATCH", message: "Evolution Review identity 与 Candidate 不一致。" };
  }
  if (!positiveRevision(review.candidate_revision) || review.candidate_revision !== candidateRevision) {
    return { code: "INVALID_REVISION", message: "Evolution Review 必须绑定当前 Candidate revision。" };
  }
  if (text(review.workspace_id) !== workspaceId || text(review.task_id) !== taskId) {
    return { code: "IDENTITY_MISMATCH", message: "Evolution Review 的 Workspace / Task identity 与请求信封不一致。" };
  }
  if (!text(review.reviewer_actor_id)) {
    return { code: "VALIDATION_ERROR", message: "Evolution Review 缺少 reviewer_actor_id。" };
  }
  const scopeViolation = validateReviewScope(review, workspaceId);
  if (scopeViolation) return scopeViolation;

  const baseRevision = payload?.base_revision;
  if (typeof baseRevision !== "undefined" && !positiveRevision(baseRevision)) {
    return { code: "INVALID_REVISION", message: "evolution.review base_revision 必须是正整数。" };
  }

  const normalizedReview = review as unknown as EvolutionReviewRecord;
  const expectedIdempotencyKey = evolutionReviewIdempotencyKey(normalizedReview, typeof baseRevision === "number" ? baseRevision : undefined);
  if (text(input.idempotency_key) !== expectedIdempotencyKey) {
    return { code: "VALIDATION_ERROR", message: "evolution.review 必须使用 Candidate revision 与 Review 状态派生的 idempotency_key。" };
  }
  return null;
}

export function expectedEvolutionEntityId(input: ProductRequestLike) {
  if (input.operation !== "evolution.review") return undefined;
  const payload = record(input.payload);
  const review = record(payload?.review);
  return text(review?.id) || undefined;
}

export function validateEvolutionProductResponse(
  operation: unknown,
  response: MarketingProductResponse,
  request: ProductRequestLike,
): MarketingProductResponse {
  if (operation !== "evolution.review" || !response.ok) return response;
  const payload = record(request.payload);
  const baseRevision = payload?.base_revision;
  const data = record(response.data);
  if (typeof baseRevision === "number" && typeof data?.revision === "number" && data.revision <= baseRevision) {
    return {
      ok: false,
      error: { code: "INVALID_REVISION", message: "Evolution Review 成功 Ack revision 必须推进。" },
      trace_id: response.trace_id,
    };
  }
  return response;
}
