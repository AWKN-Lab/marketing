import assert from "node:assert/strict";
import {
  candidateFingerprint,
  createExperienceCandidate,
  matchReviewedExperience,
} from "../lib/evolution-store.ts";

function candidate(input: { taskId: string; workspaceId: string; taskType: string; outcome: string; note?: string }) {
  const fingerprint = candidateFingerprint({
    finalText: `final-${input.taskId}`,
    feedback: "采用",
    outcome: input.outcome,
    outcomeNote: input.note ?? "",
  });
  return createExperienceCandidate({
    taskId: input.taskId,
    workspaceId: input.workspaceId,
    taskType: input.taskType,
    taskGoal: "推进下一阶段",
    artifactTitle: "测试产出",
    feedback: "采用",
    outcome: input.outcome,
    outcomeNote: input.note ?? "",
    editCount: 3,
    fingerprint,
  });
}

const positive = candidate({ taskId: "t1", workspaceId: "w1", taskType: "策略判断", outcome: "方案采用", note: "客户确认进入下一轮" });
assert.equal(positive.polarity, "positive");
assert.ok(positive.confidence >= 0.7);

const failure = candidate({ taskId: "t2", workspaceId: "w1", taskType: "策略判断", outcome: "失败", note: "过早进入价格讨论" });
assert.equal(failure.polarity, "negative");
assert.match(failure.lesson, /反例/);

const reviews = { [positive.id]: "accepted", [failure.id]: "accepted" };
const matched = matchReviewedExperience({ candidates: [positive, failure], reviews, workspaceId: "w2", taskType: "策略判断" });
assert.equal(matched.experiences.length, 1);
assert.equal(matched.counterexamples.length, 1);
assert.match(matched.experiences[0].source, /已审核/);

const wrongType = matchReviewedExperience({ candidates: [positive], reviews, workspaceId: "w1", taskType: "会前准备" });
assert.equal(wrongType.experiences.length, 0);

const scopedReviews = { [positive.id]: "scoped" };
const sameWorkspace = matchReviewedExperience({ candidates: [positive], reviews: scopedReviews, workspaceId: "w1", taskType: "策略判断" });
const otherWorkspace = matchReviewedExperience({ candidates: [positive], reviews: scopedReviews, workspaceId: "w2", taskType: "策略判断" });
assert.equal(sameWorkspace.experiences.length, 1);
assert.equal(otherWorkspace.experiences.length, 0);

const rejected = matchReviewedExperience({ candidates: [positive], reviews: { [positive.id]: "rejected" }, workspaceId: "w1", taskType: "策略判断" });
assert.equal(rejected.experiences.length, 0);

console.log("P0 acceptance passed: evolution learning boundaries are enforced.");
