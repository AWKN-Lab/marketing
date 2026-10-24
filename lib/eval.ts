export type EvalTaskSample = {
  taskId: string;
  workspaceId: string;
  taskType: string;
  taskSequence?: number;
  startedAt?: string;
  feedback: string | null;
  outcome: string | null;
  editCount: number;
  appliedExperienceCount: number;
};

const positiveOutcomes = new Set(["项目推进", "获得反馈", "方案采用"]);

export function countLineDiff(aiDraft: string, userFinal: string) {
  const aiLines = aiDraft.split("\n").map((line) => line.trim()).filter(Boolean);
  const finalLines = userFinal.split("\n").map((line) => line.trim()).filter(Boolean);
  const removed = aiLines.filter((line) => !finalLines.includes(line)).length;
  const added = finalLines.filter((line) => !aiLines.includes(line)).length;
  return removed + added;
}

function orderRepeatedSamples(group: EvalTaskSample[]) {
  const hasSequence = group.every((item) => Number.isFinite(item.taskSequence));
  if (hasSequence) {
    return [...group].sort((a, b) => (a.taskSequence! - b.taskSequence!) || a.taskId.localeCompare(b.taskId));
  }

  const withTime = group.map((item) => ({ item, time: item.startedAt ? Date.parse(item.startedAt) : Number.NaN }));
  if (withTime.every(({ time }) => Number.isFinite(time))) {
    return withTime.sort((a, b) => (a.time - b.time) || a.item.taskId.localeCompare(b.item.taskId)).map(({ item }) => item);
  }

  return null;
}

/**
 * 重复任务组的时间轨迹。
 *
 * improving = 末次优于首次，且中途没有比首次更差（持续改善）
 * improving-with-regression = 末次优于首次，但中途劣化过（端点差会掩盖）
 * stable = 末次等于首次
 * deteriorating = 末次差于首次
 */
export type EvalTrajectory = "improving" | "improving-with-regression" | "stable" | "deteriorating";

export function buildP0Metrics(samples: EvalTaskSample[]) {
  const feedbackSamples = samples.filter((item) => item.feedback);
  const outcomeSamples = samples.filter((item) => item.outcome);
  const totalEdits = feedbackSamples.reduce((sum, item) => sum + item.editCount, 0);

  const byWorkspaceAndType = new Map<string, EvalTaskSample[]>();
  for (const sample of feedbackSamples) {
    const key = `${sample.workspaceId}\u0000${sample.taskType}`;
    const group = byWorkspaceAndType.get(key) ?? [];
    group.push(sample);
    byWorkspaceAndType.set(key, group);
  }

  const repeated = [...byWorkspaceAndType.values()]
    .filter((group) => group.length >= 2)
    .flatMap((group) => {
      const ordered = orderRepeatedSamples(group);
      if (!ordered) return [];
      const first = ordered[0];
      const latest = ordered[ordered.length - 1];
      const editDelta = latest.editCount - first.editCount;
      // 端点差只看首尾，测不出中途劣化：编辑量 8 → 12 → 3 的序列端点是「改善 5」，
      // 但中间那次比首次更差 —— 「持续改善」（EVAL-ACCEPTANCE 开篇第 3 条）并不成立。
      // 峰值是这条序列里最差的一次，用它把中途劣化显式暴露出来。
      const peakEditCount = ordered.reduce((peak, item) => Math.max(peak, item.editCount), first.editCount);
      const peakEditDelta = peakEditCount - first.editCount;
      const trajectory: EvalTrajectory = editDelta < 0
        ? peakEditDelta <= 0 ? "improving" : "improving-with-regression"
        : editDelta === 0 ? "stable" : "deteriorating";
      return [{
        workspaceId: first.workspaceId,
        taskType: first.taskType,
        samples: ordered.length,
        firstEditCount: first.editCount,
        latestEditCount: latest.editCount,
        editDelta,
        peakEditCount,
        peakEditDelta,
        trajectory,
      }];
    });

  const unknownOrderGroups = [...byWorkspaceAndType.values()]
    .filter((group) => group.length >= 2 && !orderRepeatedSamples(group))
    .map((group) => ({ workspaceId: group[0].workspaceId, taskType: group[0].taskType, samples: group.length }));

  return {
    totalTasks: samples.length,
    feedbackCoverage: samples.length ? feedbackSamples.length / samples.length : 0,
    firstPassAdoption: feedbackSamples.length ? feedbackSamples.filter((item) => item.feedback === "采用").length / feedbackSamples.length : 0,
    outcomeCoverage: samples.length ? outcomeSamples.length / samples.length : 0,
    outcomeSuccessRate: outcomeSamples.length ? outcomeSamples.filter((item) => positiveOutcomes.has(item.outcome ?? "")).length / outcomeSamples.length : 0,
    experienceReuseRate: samples.length ? samples.filter((item) => item.appliedExperienceCount > 0).length / samples.length : 0,
    averageEditCount: feedbackSamples.length ? totalEdits / feedbackSamples.length : 0,
    repeatedTaskTypes: repeated,
    unknownOrderGroups,
    /**
     * 持续改善的重复任务类型数 —— 严格口径。
     *
     * 要求「末次优于首次」**且**「中途没有比首次更差」，对应 EVAL-ACCEPTANCE
     * 开篇第 3 条「重复任务中的实际表现**持续**改善」。只有 2 个样本时，
     * 峰值就是首末两者的较大值，两种口径必然一致。
     */
    improvedTaskTypes: repeated.filter((item) => item.trajectory === "improving").length,
    /** 端点改善（含中途劣化）—— 保留原公式口径，便于对照，不作为对外结论。 */
    endpointImprovedTaskTypes: repeated.filter((item) => item.editDelta < 0).length,
    /** 端点改善但中途劣化过 —— 原来会被端点差掩盖的那一类。 */
    regressedMidwayTaskTypes: repeated.filter((item) => item.trajectory === "improving-with-regression").length,
  };
}
