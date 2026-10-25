import assert from "node:assert/strict";
import {
  createPatternCandidate,
  matchReviewedExperience,
  type LocalEvolutionCandidate,
} from "../lib/evolution-store.ts";
import { detectPatterns, type PatternSample } from "../lib/pattern-detection.ts";
import { matchTaskType, RELATED_TASK_TYPES } from "../lib/task-affinity.ts";
import { runP6Case } from "./p6-test-support.ts";

/**
 * F2：经验匹配必须支持「相似任务」，不能只做 taskType 全等。
 *
 * PRD §21.1 C：「相似场景反复出现相同修改、相同选择或相同结果」。
 * PRD 验收第 10 条：「至少有 5 个 Candidate 在后续相似任务中被再次匹配」。
 */

const WORKSPACE_ID = "w-match";
const OTHER_WORKSPACE_ID = "w-match-other";
const TASK_TYPE = "策略判断";

/**
 * 用真实的模式检测 + 候选提升路径造一个「可审核」的候选。
 *
 * 手搓候选会绕过 `evolutionCandidateReadyForReview` 的证据链要求，
 * 那样测的就不是产品的真实判定路径了。
 */
function buildCandidate(input: {
  taskType?: string;
  workspaceId?: string;
  outcome?: string;
}): LocalEvolutionCandidate {
  const taskType = input.taskType ?? TASK_TYPE;
  const workspaceId = input.workspaceId ?? WORKSPACE_ID;
  const outcome = input.outcome ?? "项目推进";
  const samples: PatternSample[] = [
    {
      taskId: "t-1",
      workspaceId,
      taskType,
      feedback: "修改后采用",
      outcome,
      editCount: 2,
      aiDraft: "标题\n宏观趋势铺垫段落\n核心判断",
      userFinal: "标题\n核心判断",
      completedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      taskId: "t-2",
      workspaceId,
      taskType,
      feedback: "修改后采用",
      outcome,
      editCount: 2,
      aiDraft: "标题\n宏观趋势铺垫段落\n核心判断",
      userFinal: "标题\n核心判断",
      completedAt: "2026-09-02T00:00:00.000Z",
    },
  ];
  const patterns = detectPatterns(samples);
  const pattern = patterns.find((item) => item.kind === "repeated-outcome") ?? patterns[0];
  assert.ok(pattern, "expected a detected pattern");
  const anchorTaskId = pattern.sourceTaskIds[pattern.sourceTaskIds.length - 1];
  const anchor = samples.find((item) => item.taskId === anchorTaskId);
  assert.ok(anchor, "expected an anchor sample");
  return createPatternCandidate({
    pattern,
    anchorTaskId,
    anchor: {
      aiDraft: anchor.aiDraft,
      userFinal: anchor.userFinal,
      feedbackEventId: `feedback-event:${anchorTaskId}:fp-feedback`,
      outcomeEventId: `outcome-event:${anchorTaskId}:fp-outcome`,
      evidenceRefs: [`ev-${anchorTaskId}`],
    },
    supportingChains: pattern.sourceTaskIds.map((taskId) => ({
      task_id: taskId,
      feedback_event_id: `feedback-event:${taskId}:fp-feedback`,
      outcome_event_id: `outcome-event:${taskId}:fp-outcome`,
    })),
  });
}

function candidate(overrides: Partial<LocalEvolutionCandidate> & { id: string }): LocalEvolutionCandidate {
  const base = buildCandidate({});
  return { ...base, ...overrides } as LocalEvolutionCandidate;
}

/** 与平台插件 `plugins/awkn-marketing/src/task-affinity.ts` 的表逐项对齐。 */
const EXPECTED_AFFINITY: Record<string, Array<{ taskType: string; weight: number }>> = {
  资料消化: [{ taskType: "营销研究", weight: 0.8 }],
  营销研究: [{ taskType: "策略判断", weight: 0.8 }],
  策略判断: [{ taskType: "方案 / 内容", weight: 0.8 }],
  "方案 / 内容": [{ taskType: "会前 / 沟通", weight: 0.8 }],
  "会前 / 沟通": [{ taskType: "方案 / 内容", weight: 0.7 }],
  任务复盘: [],
};

async function main() {
  await runP6Case("experience match: 亲缘表与平台插件逐项一致", () => {
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(RELATED_TASK_TYPES).map(([key, value]) => [key, value.map((item) => ({ ...item }))]),
      ),
      EXPECTED_AFFINITY,
      "亲缘表与平台插件不一致：两侧任何一侧改动都会让另一侧测试失败",
    );
    assert.equal(Object.keys(EXPECTED_AFFINITY).length, Object.keys(RELATED_TASK_TYPES).length);
  });

  await runP6Case("experience match: 同类型命中，权重 1", () => {
    const relation = matchTaskType("策略判断", "策略判断");
    assert.deepEqual(relation, { relation: "same", weight: 1, sourceTaskType: "策略判断" });
  });

  await runP6Case("experience match: 1 跳亲缘命中并降权", () => {
    const relation = matchTaskType("营销研究", "策略判断");
    assert.deepEqual(relation, { relation: "related", weight: 0.8, sourceTaskType: "营销研究" });
  });

  await runP6Case("experience match: 2 跳之外不匹配", () => {
    // 会前 / 沟通 → 方案 / 内容 → 策略判断 是两跳，按纪律不推断。
    assert.equal(matchTaskType("会前 / 沟通", "策略判断"), null);
    assert.equal(matchTaskType("资料消化", "策略判断"), null);
    assert.equal(matchTaskType("任务复盘", "策略判断"), null);
  });

  await runP6Case("experience match: 跨类型经验进入结果集并标注来源", () => {
    const same: LocalEvolutionCandidate = { ...candidate({ id: "c-same" }), confidence: 0.8 };
    const related: LocalEvolutionCandidate = { ...buildCandidate({ taskType: "营销研究" }), id: "c-related", confidence: 0.9 };
    const unrelated: LocalEvolutionCandidate = { ...buildCandidate({ taskType: "会前 / 沟通" }), id: "c-unrelated", confidence: 0.99 };
    const matched = matchReviewedExperience({
      candidates: [same, related, unrelated],
      reviews: { "c-same": "accepted", "c-related": "accepted", "c-unrelated": "accepted" },
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.equal(matched.experiences.length, 2);
    // 同类型排在前面：0.8 > 0.9 × 0.8 = 0.72。
    assert.equal(matched.experiences[0].id, "c-same");
    assert.equal(matched.experiences[1].id, "c-related");
    assert.ok(matched.experiences[1].source.includes("跨类型推断（来自「营销研究」）"), matched.experiences[1].source);
    assert.ok(matched.experiences[1].source.includes("72%"), matched.experiences[1].source);
  });

  await runP6Case("experience match: 未审核的候选永远不匹配", () => {
    const reviewed = candidate({ id: "c-reviewed" });
    const unreviewed = candidate({ id: "c-unreviewed" });
    const matched = matchReviewedExperience({
      candidates: [reviewed, unreviewed],
      reviews: { "c-reviewed": "accepted" },
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.deepEqual(matched.experiences.map((item) => item.id), ["c-reviewed"]);
  });

  await runP6Case("experience match: 已否决的候选永远不匹配", () => {
    const rejected = candidate({ id: "c-rejected" });
    const matched = matchReviewedExperience({
      candidates: [rejected],
      reviews: { "c-rejected": "rejected" },
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.equal(matched.experiences.length, 0);
    assert.equal(matched.counterexamples.length, 0);
  });

  await runP6Case("experience match: scoped 审核不跨 Workspace 泄漏", () => {
    const scoped: LocalEvolutionCandidate = { ...buildCandidate({ workspaceId: OTHER_WORKSPACE_ID }), id: "c-scoped" };
    const matched = matchReviewedExperience({
      candidates: [scoped],
      reviews: {
        "c-scoped": { reviewId: "r1", decision: "scoped", candidateRevision: 1, scopeWorkspaceId: OTHER_WORKSPACE_ID },
      },
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.equal(matched.experiences.length, 0);
  });

  await runP6Case("experience match: 亲缘命中同样受审核 scope 约束", () => {
    const scoped: LocalEvolutionCandidate = { ...buildCandidate({ taskType: "营销研究", workspaceId: OTHER_WORKSPACE_ID }), id: "c-scoped-related" };
    const matched = matchReviewedExperience({
      candidates: [scoped],
      reviews: {
        "c-scoped-related": {
          reviewId: "r1",
          decision: "scoped",
          candidateRevision: 1,
          scopeWorkspaceId: OTHER_WORKSPACE_ID,
        },
      },
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.equal(matched.experiences.length, 0);
  });

  await runP6Case("experience match: 反例走负极性，不进可复用经验", () => {
    const positive: LocalEvolutionCandidate = { ...candidate({ id: "c-pos" }), id: "c-pos" };
    const negative: LocalEvolutionCandidate = { ...buildCandidate({ outcome: "失败" }), id: "c-neg", polarity: "negative" };
    const matched = matchReviewedExperience({
      candidates: [positive, negative],
      reviews: { "c-pos": "accepted", "c-neg": "accepted" },
      workspaceId: WORKSPACE_ID,
      taskType: TASK_TYPE,
    });
    assert.deepEqual(matched.experiences.map((item) => item.id), ["c-pos"]);
    assert.deepEqual(matched.counterexamples.map((item) => item.id), ["c-neg"]);
  });

  console.log("[P6][PASS] experience match supports similar-task reuse without loosening review discipline");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
