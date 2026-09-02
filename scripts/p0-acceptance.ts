import assert from "node:assert/strict";
import { normalizeAgentTaskResult } from "../lib/agent-result-store.ts";
import { candidateFingerprint, createExperienceCandidate, matchReviewedExperience } from "../lib/evolution-store.ts";
import { buildP0Metrics } from "../lib/eval.ts";
import { normalizeLearningRun } from "../lib/learning-run-store.ts";
import { buildAgentMaterialContext, isLocalTextFile, type LocalMaterial } from "../lib/material-store.ts";
import { buildP0Bundle, parseP0Bundle } from "../lib/p0-bundle.ts";
import { parsePersistedValue, serializePersistedValue } from "../lib/persistence.ts";

function candidate(input: { taskId: string; workspaceId: string; taskType: string; outcome: string; note?: string }) {
  const fingerprint = candidateFingerprint({ finalText: `final-${input.taskId}`, feedback: "采用", outcome: input.outcome, outcomeNote: input.note ?? "" });
  return createExperienceCandidate({ taskId: input.taskId, workspaceId: input.workspaceId, taskType: input.taskType, taskGoal: "推进下一阶段", artifactTitle: "测试产出", feedback: "采用", outcome: input.outcome, outcomeNote: input.note ?? "", editCount: 3, fingerprint });
}

const positive = candidate({ taskId: "t1", workspaceId: "w1", taskType: "策略判断", outcome: "方案采用", note: "客户确认进入下一轮" });
const failure = candidate({ taskId: "t2", workspaceId: "w1", taskType: "策略判断", outcome: "失败", note: "过早进入价格讨论" });
assert.equal(positive.polarity, "positive"); assert.equal(failure.polarity, "negative");
const reviews = { [positive.id]: "accepted", [failure.id]: "accepted" };
const matched = matchReviewedExperience({ candidates: [positive, failure], reviews, workspaceId: "w2", taskType: "策略判断" });
assert.equal(matched.experiences.length, 1); assert.equal(matched.counterexamples.length, 1);
assert.equal(matchReviewedExperience({ candidates: [positive], reviews, workspaceId: "w1", taskType: "会前准备" }).experiences.length, 0);
assert.equal(matchReviewedExperience({ candidates: [positive], reviews: { [positive.id]: "scoped" }, workspaceId: "w2", taskType: "策略判断" }).experiences.length, 0);
assert.equal(matchReviewedExperience({ candidates: [positive], reviews: { [positive.id]: "rejected" }, workspaceId: "w1", taskType: "策略判断" }).experiences.length, 0);

const metrics = buildP0Metrics([{ taskId: "a", taskType: "策略判断", feedback: "修改后采用", outcome: "方案采用", editCount: 8, appliedExperienceCount: 0 }, { taskId: "b", taskType: "策略判断", feedback: "采用", outcome: "项目推进", editCount: 3, appliedExperienceCount: 1 }]);
assert.equal(metrics.outcomeSuccessRate, 1); assert.equal(metrics.experienceReuseRate, 0.5); assert.equal(metrics.repeatedTaskTypes[0].editDelta, -5);

assert.deepEqual(parsePersistedValue(JSON.stringify({ hello: "legacy" }), {}), { hello: "legacy" });
assert.deepEqual(parsePersistedValue(serializePersistedValue({ hello: "v1" }), {}), { hello: "v1" });
const bundle = buildP0Bundle({ "marketing:task": "x", "unrelated:key": "secret" }, "2026-09-02T00:00:00.000Z");
assert.deepEqual(bundle.entries, { "marketing:task": "x" }); assert.equal(parseP0Bundle(JSON.stringify(bundle)).entries["marketing:task"], "x");

assert.equal(isLocalTextFile({ name: "meeting.md", type: "text/markdown" }), true); assert.equal(isLocalTextFile({ name: "proposal.pdf", type: "application/pdf" }), false);
const materialSamples: LocalMaterial[] = [{ id: "m1", title: "meeting.md", kind: "MD", source: "local", status: "Ready", parseMode: "local_text", content: "ABCDEFGHIJ", createdAt: "now" }, { id: "m2", title: "proposal.pdf", kind: "PDF", source: "local", status: "等待 AWKN 解析", parseMode: "platform_required", createdAt: "now" }];
const agentMaterials = buildAgentMaterialContext(materialSamples, 5); assert.equal(agentMaterials[0].content, "ABCDE"); assert.equal("content" in agentMaterials[1], false);

const agentResult = normalizeAgentTaskResult({ text: "明确判断", trace_id: "trace-1", evidence: [{ type: "WEB", title: "来源 A", snippet: "关键证据", source: "https://example.com" }, { title: "bad" }], artifact: { title: "策略稿", markdown: "# 第一版\n内容" } }, "2026-09-02T00:00:00.000Z");
assert.ok(agentResult); assert.equal(agentResult?.evidence.length, 1); assert.equal(agentResult?.artifact?.content, "# 第一版\n内容");

const learningRun = normalizeLearningRun({ data: { run_id: "lr-1", status: "completed", signals: [{ title: "政策变化", summary: "出现新要求", why_it_matters: "影响当前方案", action: "更新提案", source: "gov.example" }, { title: "bad" }] }, workspaceId: "w1", watchId: "watch-w1", traceId: "trace-learning", startedAt: "2026-09-02T00:00:00.000Z" });
assert.ok(learningRun); assert.equal(learningRun?.signals.length, 1); assert.equal(learningRun?.status, "completed"); assert.equal(learningRun?.traceId, "trace-learning");
assert.equal(normalizeLearningRun({ data: {}, workspaceId: "w1", watchId: "watch-w1" }), null);

console.log("P0 acceptance passed: evolution, materials, agent results and real learning boundaries are enforced.");
