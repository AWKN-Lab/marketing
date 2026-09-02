import assert from "node:assert/strict";
import {
  candidateFingerprint,
  createExperienceCandidate,
  matchReviewedExperience,
} from "../lib/evolution-store.ts";
import { buildP0Metrics } from "../lib/eval.ts";
import { buildAgentMaterialContext, isLocalTextFile, type LocalMaterial } from "../lib/material-store.ts";
import { buildP0Bundle, parseP0Bundle } from "../lib/p0-bundle.ts";
import { parsePersistedValue, serializePersistedValue } from "../lib/persistence.ts";

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

const metrics = buildP0Metrics([
  { taskId: "a", taskType: "策略判断", feedback: "修改后采用", outcome: "方案采用", editCount: 8, appliedExperienceCount: 0 },
  { taskId: "b", taskType: "策略判断", feedback: "采用", outcome: "项目推进", editCount: 3, appliedExperienceCount: 1 },
]);
assert.equal(metrics.totalTasks, 2);
assert.equal(metrics.feedbackCoverage, 1);
assert.equal(metrics.outcomeSuccessRate, 1);
assert.equal(metrics.experienceReuseRate, 0.5);
assert.equal(metrics.repeatedTaskTypes[0].editDelta, -5);
assert.equal(metrics.improvedTaskTypes, 1);

const legacy = JSON.stringify({ hello: "legacy" });
assert.deepEqual(parsePersistedValue(legacy, {}), { hello: "legacy" });
const versioned = serializePersistedValue({ hello: "v1" });
assert.deepEqual(parsePersistedValue(versioned, {}), { hello: "v1" });
assert.deepEqual(parsePersistedValue("broken-json", { safe: true }), { safe: true });

const bundle = buildP0Bundle({ "marketing:task": "x", "unrelated:key": "secret" }, "2026-09-02T00:00:00.000Z");
assert.deepEqual(bundle.entries, { "marketing:task": "x" });
const parsedBundle = parseP0Bundle(JSON.stringify(bundle));
assert.equal(parsedBundle.entries["marketing:task"], "x");
assert.throws(() => parseP0Bundle(JSON.stringify({ format: "wrong", version: 1, entries: {} })));

assert.equal(isLocalTextFile({ name: "meeting.md", type: "text/markdown" }), true);
assert.equal(isLocalTextFile({ name: "proposal.pdf", type: "application/pdf" }), false);
const materialSamples: LocalMaterial[] = [
  { id: "m1", title: "meeting.md", kind: "MD", source: "local", status: "Ready", parseMode: "local_text", content: "ABCDEFGHIJ", createdAt: "now" },
  { id: "m2", title: "proposal.pdf", kind: "PDF", source: "local", status: "等待 AWKN 解析", parseMode: "platform_required", createdAt: "now" },
];
const agentMaterials = buildAgentMaterialContext(materialSamples, 5);
assert.equal(agentMaterials[0].content, "ABCDE");
assert.equal(agentMaterials[0].truncated, true);
assert.equal("content" in agentMaterials[1], false);

console.log("P0 acceptance passed: evolution, eval, persistence, portability and material-context boundaries are enforced.");
