import assert from "node:assert/strict";
import { buildP0Metrics, type EvalTaskSample } from "../lib/eval.ts";
import { runP6Case } from "./p6-test-support.ts";

/**
 * F6：重复任务的改善口径必须能看见**中途劣化**。
 *
 * EVAL-ACCEPTANCE 开篇第 3 条要求的是「重复任务中的实际表现**持续**改善」，
 * 而端点公式 `latest - first` 只会回答「末次比首次好多少」。
 * 序列 8 → 12 → 3 的端点是「改善 5」，但中间那次比首次更差 —— 「持续改善」并不成立。
 */

function sample(overrides: Partial<EvalTaskSample> & { taskId: string; editCount: number }): EvalTaskSample {
  return {
    workspaceId: "w-eval",
    taskType: "策略判断",
    taskSequence: 1,
    feedback: "修改后采用",
    outcome: "项目推进",
    appliedExperienceCount: 0,
    ...overrides,
  } as EvalTaskSample;
}

async function main() {
  await runP6Case("eval: 端点差公式保持不变（不改已发布口径）", () => {
    const metrics = buildP0Metrics([
      sample({ taskId: "a", taskSequence: 1, editCount: 8 }),
      sample({ taskId: "b", taskSequence: 2, editCount: 3 }),
    ]);
    assert.equal(metrics.repeatedTaskTypes[0].editDelta, -5);
    assert.equal(metrics.repeatedTaskTypes[0].firstEditCount, 8);
    assert.equal(metrics.repeatedTaskTypes[0].latestEditCount, 3);
  });

  await runP6Case("eval: 2 个样本时严格口径与端点口径一致", () => {
    const metrics = buildP0Metrics([
      sample({ taskId: "a", taskSequence: 1, editCount: 8 }),
      sample({ taskId: "b", taskSequence: 2, editCount: 3 }),
    ]);
    assert.equal(metrics.improvedTaskTypes, 1);
    assert.equal(metrics.endpointImprovedTaskTypes, 1);
    assert.equal(metrics.regressedMidwayTaskTypes, 0);
    assert.equal(metrics.repeatedTaskTypes[0].trajectory, "improving");
  });

  await runP6Case("eval: 中途劣化被显式暴露，端点差不再掩盖", () => {
    const metrics = buildP0Metrics([
      sample({ taskId: "a", taskSequence: 1, editCount: 8 }),
      sample({ taskId: "b", taskSequence: 2, editCount: 12 }),
      sample({ taskId: "c", taskSequence: 3, editCount: 3 }),
    ]);
    const group = metrics.repeatedTaskTypes[0];
    // 端点差仍然是 -5 —— 公式没动。
    assert.equal(group.editDelta, -5);
    // 但峰值把中途那次劣化暴露出来。
    assert.equal(group.peakEditCount, 12);
    assert.equal(group.peakEditDelta, 4);
    assert.equal(group.trajectory, "improving-with-regression");
    // 端点口径会说「改善 5」，严格口径不认这是持续改善。
    assert.equal(metrics.endpointImprovedTaskTypes, 1);
    assert.equal(metrics.improvedTaskTypes, 0);
    assert.equal(metrics.regressedMidwayTaskTypes, 1);
  });

  await runP6Case("eval: 全程不劣于首次才算持续改善", () => {
    const metrics = buildP0Metrics([
      sample({ taskId: "a", taskSequence: 1, editCount: 8 }),
      sample({ taskId: "b", taskSequence: 2, editCount: 6 }),
      sample({ taskId: "c", taskSequence: 3, editCount: 7 }),
      sample({ taskId: "d", taskSequence: 4, editCount: 3 }),
    ]);
    const group = metrics.repeatedTaskTypes[0];
    assert.equal(group.peakEditCount, 8);
    assert.equal(group.peakEditDelta, 0);
    assert.equal(group.trajectory, "improving");
    assert.equal(metrics.improvedTaskTypes, 1);
  });

  await runP6Case("eval: 持平与恶化分别归类", () => {
    const stable = buildP0Metrics([
      sample({ taskId: "a", taskSequence: 1, editCount: 5 }),
      sample({ taskId: "b", taskSequence: 2, editCount: 5 }),
    ]);
    assert.equal(stable.repeatedTaskTypes[0].trajectory, "stable");
    assert.equal(stable.improvedTaskTypes, 0);
    assert.equal(stable.endpointImprovedTaskTypes, 0);

    const worse = buildP0Metrics([
      sample({ taskId: "a", taskSequence: 1, editCount: 3 }),
      sample({ taskId: "b", taskSequence: 2, editCount: 9 }),
    ]);
    assert.equal(worse.repeatedTaskTypes[0].trajectory, "deteriorating");
    assert.equal(worse.improvedTaskTypes, 0);
    assert.equal(worse.endpointImprovedTaskTypes, 0);
  });

  await runP6Case("eval: 缺少可靠顺序的组仍然排除在改善计数外", () => {
    const metrics = buildP0Metrics([
      sample({ taskId: "u1", editCount: 5, taskSequence: undefined, startedAt: undefined }),
      sample({ taskId: "u2", editCount: 2, taskSequence: undefined, startedAt: undefined }),
    ]);
    assert.equal(metrics.repeatedTaskTypes.length, 0);
    assert.equal(metrics.unknownOrderGroups.length, 1);
    assert.equal(metrics.improvedTaskTypes, 0);
  });

  console.log("[P6][PASS] eval trajectory exposes midway regression that the endpoint delta hid");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
