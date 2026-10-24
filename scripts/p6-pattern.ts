import assert from "node:assert/strict";
import {
  evolutionPatternCandidateId,
  evolutionReviewIdempotencyKey,
  validateEvolutionProductRequest,
  type PatternSupportingChain,
} from "../lib/evolution-contract.ts";
import {
  createPatternCandidate,
  evolutionCandidateReadyForReview,
  matchReviewedExperience,
  type LocalEvolutionCandidate,
} from "../lib/evolution-store.ts";
import {
  detectPatterns,
  PATTERN_MIN_SUPPORT,
  type PatternSample,
} from "../lib/pattern-detection.ts";
import { runP6Case } from "./p6-test-support.ts";

const WORKSPACE_ID = "w-pattern";
const OTHER_WORKSPACE_ID = "w-pattern-other";
const TASK_TYPE = "策略判断";

function sample(overrides: Partial<PatternSample> & { taskId: string }): PatternSample {
  return {
    workspaceId: WORKSPACE_ID,
    taskType: TASK_TYPE,
    feedback: "修改后采用",
    outcome: "项目推进",
    editCount: 2,
    aiDraft: "标题\n宏观趋势铺垫段落\n核心判断",
    userFinal: "标题\n核心判断",
    completedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function chain(taskId: string): PatternSupportingChain {
  return {
    task_id: taskId,
    feedback_event_id: `feedback-event:${taskId}:fp-feedback`,
    outcome_event_id: `outcome-event:${taskId}:fp-outcome`,
  };
}

function promote(patternSamples: PatternSample[], patterns = detectPatterns(patternSamples)) {
  const pattern = patterns[0];
  assert.ok(pattern, "expected at least one detected pattern");
  const anchorTaskId = pattern.sourceTaskIds[pattern.sourceTaskIds.length - 1];
  const anchor = patternSamples.find((item) => item.taskId === anchorTaskId);
  assert.ok(anchor, "expected anchor sample");
  const supportingChains = pattern.sourceTaskIds.map((taskId) => chain(taskId));
  const candidate = createPatternCandidate({
    pattern,
    anchorTaskId,
    anchor: {
      aiDraft: anchor.aiDraft,
      userFinal: anchor.userFinal,
      feedbackEventId: `feedback-event:${anchorTaskId}:fp-feedback`,
      outcomeEventId: `outcome-event:${anchorTaskId}:fp-outcome`,
      evidenceRefs: [`ev-${anchorTaskId}`],
      runId: `run-${anchorTaskId}`,
      traceId: `trace-${anchorTaskId}`,
    },
    supportingChains,
  });
  return { pattern, candidate, anchorTaskId, supportingChains };
}

async function main() {
  // ────────────────────────────────────────────────────────────────
  // 1. 最小支持度：单任务永远不产生模式
  // ────────────────────────────────────────────────────────────────
  await runP6Case("single task never produces a pattern", () => {
    const patterns = detectPatterns([sample({ taskId: "t-only" })]);
    assert.equal(patterns.length, 0);
  });

  await runP6Case("repeated signal needs at least two supporting tasks", () => {
    const patterns = detectPatterns([
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2" }),
    ]);
    assert.ok(patterns.length >= 1);
    for (const pattern of patterns) {
      assert.ok(pattern.supportCount >= PATTERN_MIN_SUPPORT);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // 2. 重复删除 → Preference Candidate
  // ────────────────────────────────────────────────────────────────
  await runP6Case("repeated removal across tasks yields a preference pattern", () => {
    const patterns = detectPatterns([
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ]);
    const removal = patterns.find((item) => item.kind === "repeated-edit");
    assert.ok(removal, "expected a repeated-edit pattern");
    assert.equal(removal.polarity, "positive");
    assert.equal(removal.supportCount, 2);
    assert.deepEqual([...removal.sourceTaskIds].sort(), ["t-1", "t-2"]);
    assert.ok(removal.removedLines[0].includes("宏观趋势铺垫"));
    assert.ok(removal.lesson.includes("删除"));
    assert.ok(removal.confidence > 0);
  });

  await runP6Case("removal pattern is stable across recomputation", () => {
    const inputs = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const first = detectPatterns(inputs).find((item) => item.kind === "repeated-edit");
    const second = detectPatterns(inputs).find((item) => item.kind === "repeated-edit");
    assert.equal(first?.patternId, second?.patternId);
  });

  // ────────────────────────────────────────────────────────────────
  // 3. 重复 Outcome → Decision Pattern Candidate
  // ────────────────────────────────────────────────────────────────
  await runP6Case("repeated outcome yields a decision pattern", () => {
    const patterns = detectPatterns([
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
      sample({ taskId: "t-3", completedAt: "2026-09-03T00:00:00.000Z" }),
    ]);
    const outcome = patterns.find((item) => item.kind === "repeated-outcome");
    assert.ok(outcome, "expected a repeated-outcome pattern");
    assert.equal(outcome.polarity, "positive");
    assert.equal(outcome.supportCount, 3);
    assert.deepEqual(outcome.outcomes, ["项目推进"]);
  });

  await runP6Case("repeated failure yields a negative counterexample pattern", () => {
    const patterns = detectPatterns([
      sample({ taskId: "t-1", outcome: "失败" }),
      sample({ taskId: "t-2", outcome: "失败", completedAt: "2026-09-02T00:00:00.000Z" }),
    ]);
    const failure = patterns.find((item) => item.kind === "repeated-failure");
    assert.ok(failure, "expected a repeated-failure pattern");
    assert.equal(failure.polarity, "negative");
    assert.ok(failure.lesson.includes("反例") || failure.lesson.includes("失败"));
  });

  // ────────────────────────────────────────────────────────────────
  // 4. 隔离纪律：Workspace / taskType / 顺序
  // ────────────────────────────────────────────────────────────────
  await runP6Case("identical removals in different workspaces never merge", () => {
    const patterns = detectPatterns([
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", workspaceId: OTHER_WORKSPACE_ID, completedAt: "2026-09-02T00:00:00.000Z" }),
    ]);
    assert.equal(patterns.length, 0);
  });

  await runP6Case("different task types never merge", () => {
    const patterns = detectPatterns([
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", taskType: "营销研究", completedAt: "2026-09-02T00:00:00.000Z" }),
    ]);
    assert.equal(patterns.length, 0);
  });

  await runP6Case("group without reliable order is excluded", () => {
    const patterns = detectPatterns([
      sample({ taskId: "t-1", completedAt: undefined }),
      sample({ taskId: "t-2", completedAt: undefined }),
    ]);
    assert.equal(patterns.length, 0);
  });

  await runP6Case("noise-level lines never become a pattern", () => {
    const patterns = detectPatterns([
      sample({ taskId: "t-1", aiDraft: "标题\n好的\n核心判断", userFinal: "标题\n核心判断" }),
      sample({ taskId: "t-2", aiDraft: "标题\n好的\n核心判断", userFinal: "标题\n核心判断", completedAt: "2026-09-02T00:00:00.000Z" }),
    ]);
    assert.equal(patterns.filter((item) => item.kind === "repeated-edit").length, 0);
  });

  // ────────────────────────────────────────────────────────────────
  // 5. 提升为 Candidate：证据链与审核门
  // ────────────────────────────────────────────────────────────────
  await runP6Case("promoted pattern candidate is review ready", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate } = promote(samples);
    assert.ok(candidate.id.startsWith("local-evp-"));
    assert.equal(candidate.id, evolutionPatternCandidateId(candidate.id.replace("local-evp-", "")));
    assert.equal(evolutionCandidateReadyForReview(candidate), true);
    assert.equal(candidate.evidence?.pattern_evidence?.support_count, 2);
    assert.equal(candidate.evidence?.pattern_evidence?.source_task_ids.length, 2);
  });

  await runP6Case("pattern candidate keeps every supporting task chain", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate } = promote(samples);
    const chains = candidate.evidence?.pattern_evidence?.supporting_chains ?? [];
    assert.equal(chains.length, 2);
    for (const item of chains) {
      assert.ok(item.feedback_event_id.startsWith(`feedback-event:${item.task_id}:`));
      assert.ok(item.outcome_event_id.startsWith(`outcome-event:${item.task_id}:`));
    }
  });

  await runP6Case("pattern candidate with a broken supporting chain is not review ready", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate } = promote(samples);
    const broken: LocalEvolutionCandidate = {
      ...candidate,
      evidence: {
        ...candidate.evidence!,
        pattern_evidence: {
          ...candidate.evidence!.pattern_evidence!,
          supporting_chains: [{ ...chain("t-1"), feedback_event_id: "feedback-event:other:fp" }],
        },
      },
    };
    assert.equal(evolutionCandidateReadyForReview(broken), false);
  });

  await runP6Case("pattern candidate with a single supporting task is not review ready", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate } = promote(samples);
    const weakened: LocalEvolutionCandidate = {
      ...candidate,
      evidence: {
        ...candidate.evidence!,
        pattern_evidence: {
          ...candidate.evidence!.pattern_evidence!,
          support_count: 1,
          source_task_ids: ["t-1"],
          supporting_chains: [chain("t-1")],
        },
      },
    };
    assert.equal(evolutionCandidateReadyForReview(weakened), false);
  });

  // ────────────────────────────────────────────────────────────────
  // 6. 平台契约：Pattern Candidate 必须通过 evolution.review 校验
  // ────────────────────────────────────────────────────────────────
  await runP6Case("pattern candidate passes the platform evolution contract", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate, anchorTaskId } = promote(samples);
    const review = {
      id: `evolution-review:${candidate.id}`,
      candidate_id: candidate.id,
      candidate_revision: candidate.revision,
      workspace_id: WORKSPACE_ID,
      task_id: anchorTaskId,
      decision: "accepted",
      scope: { type: "global" },
      reviewer_actor_id: "actor-1",
    };
    const request = {
      operation: "evolution.review" as const,
      workspace_id: WORKSPACE_ID,
      task_id: anchorTaskId,
      idempotency_key: evolutionReviewIdempotencyKey(review as never),
      payload: { candidate, review },
    };
    assert.equal(validateEvolutionProductRequest(request), null);
  });

  await runP6Case("pattern candidate missing pattern evidence is rejected by the contract", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate, anchorTaskId } = promote(samples);
    const stripped: LocalEvolutionCandidate = {
      ...candidate,
      evidence: { ...candidate.evidence!, pattern_evidence: undefined },
    };
    const review = {
      id: `evolution-review:${stripped.id}`,
      candidate_id: stripped.id,
      candidate_revision: stripped.revision,
      workspace_id: WORKSPACE_ID,
      task_id: anchorTaskId,
      decision: "accepted",
      scope: { type: "global" },
      reviewer_actor_id: "actor-1",
    };
    const violation = validateEvolutionProductRequest({
      operation: "evolution.review" as const,
      workspace_id: WORKSPACE_ID,
      task_id: anchorTaskId,
      idempotency_key: evolutionReviewIdempotencyKey(review as never),
      payload: { candidate: stripped, review },
    });
    assert.ok(violation, "expected a contract violation");
    assert.equal(violation.code, "VALIDATION_ERROR");
  });

  await runP6Case("pattern candidate with an unknown supporting task is rejected", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate, anchorTaskId } = promote(samples);
    const tampered: LocalEvolutionCandidate = {
      ...candidate,
      evidence: {
        ...candidate.evidence!,
        pattern_evidence: {
          ...candidate.evidence!.pattern_evidence!,
          supporting_chains: [chain("t-1"), chain("t-unknown")],
        },
      },
    };
    const review = {
      id: `evolution-review:${tampered.id}`,
      candidate_id: tampered.id,
      candidate_revision: tampered.revision,
      workspace_id: WORKSPACE_ID,
      task_id: anchorTaskId,
      decision: "accepted",
      scope: { type: "global" },
      reviewer_actor_id: "actor-1",
    };
    const violation = validateEvolutionProductRequest({
      operation: "evolution.review" as const,
      workspace_id: WORKSPACE_ID,
      task_id: anchorTaskId,
      idempotency_key: evolutionReviewIdempotencyKey(review as never),
      payload: { candidate: tampered, review },
    });
    assert.ok(violation);
    assert.equal(violation.code, "IDENTITY_MISMATCH");
  });

  // ────────────────────────────────────────────────────────────────
  // 7. 闭环：审核通过后进入下一次任务匹配
  // ────────────────────────────────────────────────────────────────
  await runP6Case("reviewed pattern candidate enters the next task matching", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate } = promote(samples);
    const reviews = { [candidate.id]: "accepted" as const };
    const matched = matchReviewedExperience({
      candidates: [candidate],
      reviews,
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.equal(matched.experiences.length, 1);
    assert.equal(matched.counterexamples.length, 0);
    assert.ok(matched.experiences[0].source.includes("跨任务重复模式"));
  });

  await runP6Case("unreviewed pattern candidate never enters task matching", () => {
    const samples = [
      sample({ taskId: "t-1" }),
      sample({ taskId: "t-2", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate } = promote(samples);
    const matched = matchReviewedExperience({
      candidates: [candidate],
      reviews: {},
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.equal(matched.experiences.length, 0);
    assert.equal(matched.counterexamples.length, 0);
  });

  await runP6Case("repeated failure pattern surfaces as a counterexample, never as a method", () => {
    const samples = [
      sample({ taskId: "t-1", outcome: "失败" }),
      sample({ taskId: "t-2", outcome: "失败", completedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    const { candidate } = promote(samples, detectPatterns(samples).filter((item) => item.kind === "repeated-failure"));
    assert.equal(candidate.type, "Counterexample Candidate");
    assert.equal(candidate.polarity, "negative");
    const matched = matchReviewedExperience({
      candidates: [candidate],
      reviews: { [candidate.id]: "accepted" },
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.equal(matched.experiences.length, 0);
    assert.equal(matched.counterexamples.length, 1);
  });

  console.log("[P6][PASS] cross-task pattern detection produces reviewable, evidence-backed candidates");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
