import {
  evolutionCandidateId,
  evolutionPatternCandidateId,
  evolutionReviewId,
  isEvolutionReviewDecision,
  type EvolutionCandidateEvidenceChain,
  type EvolutionReviewDecision,
  type PatternSupportingChain,
} from "@/lib/evolution-contract";
import { PATTERN_MIN_SUPPORT, detectPatterns, type PatternSample, type PatternSignal } from "@/lib/pattern-detection";
import type { AppliedExperience, EvolutionCandidate } from "@/lib/types";

export type LocalEvolutionCandidate = EvolutionCandidate & {
  createdAt: string;
  taskId: string;
  workspaceId?: string;
  sourceTaskType?: string;
  sourceTaskGoal?: string;
  polarity?: "positive" | "caution" | "negative";
  fingerprint?: string;
  revision?: number;
  evidence?: EvolutionCandidateEvidenceChain;
};

export type EvolutionReviewState = {
  reviewId: string;
  decision: EvolutionReviewDecision;
  candidateRevision: number;
  scopeWorkspaceId?: string;
  platformRevision?: number;
  traceId?: string;
};

export type EvolutionReviewValue = EvolutionReviewDecision | EvolutionReviewState;

export const LOCAL_CANDIDATES_KEY = "marketing:evolution:candidates";
export const EVOLUTION_REVIEWS_KEY = "marketing:evolution:reviews";

const positiveOutcomes = new Set(["项目推进", "获得反馈", "方案采用"]);

function normalizeEvidenceRefs(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

export function candidateRevision(candidate: LocalEvolutionCandidate) {
  return typeof candidate.revision === "number" && Number.isSafeInteger(candidate.revision) && candidate.revision > 0
    ? candidate.revision
    : 1;
}

export function candidateFingerprint(input: {
  finalText: string;
  feedback: string;
  outcome: string;
  outcomeNote: string;
  aiDraft?: string;
  evidenceRefs?: string[];
  runId?: string;
}) {
  return JSON.stringify([
    input.aiDraft ?? "",
    input.finalText,
    input.feedback,
    input.outcome,
    input.outcomeNote,
    normalizeEvidenceRefs(input.evidenceRefs ?? []),
    input.runId?.trim() ?? "",
  ]);
}

export function createExperienceCandidate(input: {
  taskId: string;
  workspaceId: string;
  taskType: string;
  taskGoal: string;
  artifactTitle: string;
  aiDraft: string;
  finalText: string;
  feedback: string;
  outcome: string;
  outcomeNote: string;
  editCount: number;
  fingerprint: string;
  feedbackEventId: string;
  outcomeEventId: string;
  evidenceRefs?: string[];
  runId?: string;
  traceId?: string;
  previousCandidate?: LocalEvolutionCandidate;
}): LocalEvolutionCandidate {
  const isPositive = positiveOutcomes.has(input.outcome);
  const isFailure = input.outcome === "失败";
  const polarity: LocalEvolutionCandidate["polarity"] = isPositive ? "positive" : isFailure ? "negative" : "caution";

  const lesson = isPositive
    ? `在“${input.taskType}”类任务中，可优先参考本次最终采用的结构与表达，再结合新场景校验`
    : isFailure
      ? `将本次“${input.taskType}”路径作为反例；相似任务先检查失败原因，禁止直接复用本次做法`
      : `相似“${input.taskType}”任务进入执行前，先验证本次搁置原因与时机约束`;

  const confidenceBase = isPositive ? 0.62 : input.outcomeNote.trim() ? 0.5 : 0.35;
  const confidence = Math.min(0.75, confidenceBase + (input.feedback === "采用" ? 0.05 : 0) + (input.outcomeNote.trim() ? 0.05 : 0));
  const id = evolutionCandidateId(input.taskId);
  const previous = input.previousCandidate?.id === id ? input.previousCandidate : undefined;
  const sameCandidate = Boolean(previous && previous.fingerprint === input.fingerprint);
  const previousRevision = previous ? candidateRevision(previous) : 0;
  const revision = sameCandidate ? previousRevision : previousRevision + 1;

  return {
    id,
    taskId: input.taskId,
    workspaceId: input.workspaceId,
    sourceTaskType: input.taskType,
    sourceTaskGoal: input.taskGoal,
    polarity,
    fingerprint: input.fingerprint,
    revision: Math.max(1, revision),
    createdAt: sameCandidate && previous ? previous.createdAt : new Date().toISOString(),
    type: isFailure ? "Counterexample Candidate" : "Experience Candidate",
    lesson,
    why: `Feedback：${input.feedback}；Outcome：${input.outcome}；AI 初稿与用户最终稿存在 ${input.editCount} 处结构化差异。${input.outcomeNote.trim() ? ` 结果说明：${input.outcomeNote.trim()}` : " 当前缺少结果原因说明，置信度已降低。"}`,
    source: `${input.taskId} / AI Initial → User Final → Feedback → Outcome`,
    scope: `${input.taskType} / 相似目标`,
    counterexample: "任务类型、目标、受众、交付形式或业务阶段显著变化时重新验证",
    confidence,
    evidence: {
      ai_draft: input.aiDraft,
      user_final: input.finalText,
      feedback_event_id: input.feedbackEventId,
      outcome_event_id: input.outcomeEventId,
      evidence_refs: normalizeEvidenceRefs(input.evidenceRefs ?? []),
      run_id: input.runId?.trim() || undefined,
      trace_id: input.traceId?.trim() || undefined,
    },
  };
}

export function evolutionCandidateReadyForReview(candidate: LocalEvolutionCandidate) {
  const evidence = candidate.evidence;
  const baseReady = Boolean(
    candidate.workspaceId
    && candidate.taskId
    && candidate.fingerprint
    && candidate.revision
    && evidence
    && evidence.ai_draft.trim()
    && evidence.user_final.trim()
    && evidence.feedback_event_id.startsWith(`feedback-event:${candidate.taskId}:`)
    && evidence.outcome_event_id.startsWith(`outcome-event:${candidate.taskId}:`),
  );
  if (!baseReady) return false;
  if (!evidence?.pattern_evidence) return true;
  // Pattern Candidate 额外要求：跨任务支撑证据链完整，且每个支撑任务都有独立事件链。
  const pattern = evidence.pattern_evidence;
  return Boolean(
    pattern.support_count >= PATTERN_MIN_SUPPORT
    && pattern.source_task_ids.length >= PATTERN_MIN_SUPPORT
    && pattern.supporting_chains.length >= PATTERN_MIN_SUPPORT
    && pattern.source_task_ids.includes(candidate.taskId)
    && pattern.supporting_chains.every((chain) => chain.task_id
      && chain.feedback_event_id.startsWith(`feedback-event:${chain.task_id}:`)
      && chain.outcome_event_id.startsWith(`outcome-event:${chain.task_id}:`)),
  );
}

export function createPatternCandidate(input: {
  pattern: PatternSignal;
  anchorTaskId: string;
  anchor: {
    aiDraft: string;
    userFinal: string;
    feedbackEventId: string;
    outcomeEventId: string;
    evidenceRefs?: string[];
    runId?: string;
    traceId?: string;
  };
  supportingChains: PatternSupportingChain[];
  previousCandidate?: LocalEvolutionCandidate;
}): LocalEvolutionCandidate {
  const { pattern } = input;
  const id = evolutionPatternCandidateId(pattern.patternId);
  const previous = input.previousCandidate?.id === id ? input.previousCandidate : undefined;
  const fingerprint = JSON.stringify([
    pattern.kind,
    pattern.patternId,
    pattern.supportCount,
    [...pattern.sourceTaskIds].sort(),
    input.supportingChains.map((chain) => chain.task_id).sort(),
  ]);
  const sameCandidate = Boolean(previous && previous.fingerprint === fingerprint);
  const previousRevision = previous ? candidateRevision(previous) : 0;
  const revision = sameCandidate ? previousRevision : previousRevision + 1;

  const type = pattern.kind === "repeated-failure"
    ? "Counterexample Candidate"
    : pattern.kind === "repeated-edit"
      ? "Preference Candidate"
      : "Decision Pattern Candidate";

  return {
    id,
    taskId: input.anchorTaskId,
    workspaceId: pattern.workspaceId,
    sourceTaskType: pattern.taskType,
    polarity: pattern.polarity,
    fingerprint,
    revision: Math.max(1, revision),
    createdAt: sameCandidate && previous ? previous.createdAt : new Date().toISOString(),
    type,
    lesson: pattern.lesson,
    why: pattern.why,
    source: `${pattern.sourceTaskIds.join(" / ")} · 跨任务重复模式 · ${pattern.supportCount} 次支持`,
    scope: pattern.scope,
    counterexample: pattern.counterexample,
    confidence: pattern.confidence,
    evidence: {
      ai_draft: input.anchor.aiDraft,
      user_final: input.anchor.userFinal,
      feedback_event_id: input.anchor.feedbackEventId,
      outcome_event_id: input.anchor.outcomeEventId,
      evidence_refs: normalizeEvidenceRefs(input.anchor.evidenceRefs ?? []),
      run_id: input.anchor.runId?.trim() || undefined,
      trace_id: input.anchor.traceId?.trim() || undefined,
      pattern_evidence: {
        kind: pattern.kind,
        signal: pattern.kind === "repeated-edit" ? pattern.removedLines[0] ?? "" : pattern.outcomes[0] ?? "",
        support_count: pattern.supportCount,
        source_task_ids: [...pattern.sourceTaskIds],
        supporting_chains: input.supportingChains,
      },
    },
  };
}

export function reviewDecisionForCandidate(review: EvolutionReviewValue | undefined, candidate: LocalEvolutionCandidate): EvolutionReviewDecision | null {
  if (!review || !evolutionCandidateReadyForReview(candidate)) return null;
  const revision = candidateRevision(candidate);
  if (typeof review === "string") {
    return revision === 1 && isEvolutionReviewDecision(review) ? review : null;
  }
  if (review.reviewId !== evolutionReviewId(candidate.id)) return null;
  if (review.candidateRevision !== revision) return null;
  return isEvolutionReviewDecision(review.decision) ? review.decision : null;
}

export function buildPatternCandidates(input: {
  samples: PatternSample[];
  previous?: LocalEvolutionCandidate[];
}): LocalEvolutionCandidate[] {
  const samples = input.samples.filter((sample) => sample.feedbackEventId && sample.outcomeEventId);
  const patterns = detectPatterns(samples);
  return patterns.map((pattern) => {
    const anchorTaskId = pattern.sourceTaskIds[pattern.sourceTaskIds.length - 1];
    const anchor = samples.find((sample) => sample.taskId === anchorTaskId);
    if (!anchor) return null;
    const supportingChains = pattern.sourceTaskIds.map((taskId) => {
      const sample = samples.find((item) => item.taskId === taskId);
      return {
        task_id: taskId,
        feedback_event_id: sample?.feedbackEventId ?? "",
        outcome_event_id: sample?.outcomeEventId ?? "",
      };
    });
    const id = evolutionPatternCandidateId(pattern.patternId);
    return createPatternCandidate({
      pattern,
      anchorTaskId,
      anchor: {
        aiDraft: anchor.aiDraft,
        userFinal: anchor.userFinal,
        feedbackEventId: anchor.feedbackEventId ?? "",
        outcomeEventId: anchor.outcomeEventId ?? "",
        evidenceRefs: anchor.evidenceRefs,
        runId: anchor.runId,
        traceId: anchor.traceId,
      },
      supportingChains,
      previousCandidate: input.previous?.find((candidate) => candidate.id === id),
    });
  }).filter((candidate): candidate is LocalEvolutionCandidate => candidate !== null);
}

export function matchReviewedExperience(input: {
  candidates: LocalEvolutionCandidate[];
  reviews: Record<string, EvolutionReviewValue>;
  workspaceId: string;
  taskType: string;
  maxExperiences?: number;
  maxCounterexamples?: number;
}): { experiences: AppliedExperience[]; counterexamples: LocalEvolutionCandidate[] } {
  const approved = input.candidates
    .filter(evolutionCandidateReadyForReview)
    .filter((candidate) => candidate.sourceTaskType === input.taskType)
    .filter((candidate) => {
      const review = input.reviews[candidate.id];
      const decision = reviewDecisionForCandidate(review, candidate);
      if (decision === "accepted") return true;
      if (decision !== "scoped") return false;
      if (typeof review === "object" && review.scopeWorkspaceId) return review.scopeWorkspaceId === input.workspaceId;
      return candidate.workspaceId === input.workspaceId;
    });

  const experiences = approved
    .filter((candidate) => candidate.polarity !== "negative")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, input.maxExperiences ?? 3)
    .map((candidate) => ({
      id: candidate.id,
      lesson: candidate.lesson,
      source: `${candidate.source} · 已审核 r${candidateRevision(candidate)} · ${Math.round(candidate.confidence * 100)}%`,
    }));

  const counterexamples = approved
    .filter((candidate) => candidate.polarity === "negative")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, input.maxCounterexamples ?? 2);

  return { experiences, counterexamples };
}
