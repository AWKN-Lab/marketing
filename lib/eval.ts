export type EvalTaskSample = {
  taskId: string;
  taskType: string;
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

export function buildP0Metrics(samples: EvalTaskSample[]) {
  const feedbackSamples = samples.filter((item) => item.feedback);
  const outcomeSamples = samples.filter((item) => item.outcome);
  const totalEdits = feedbackSamples.reduce((sum, item) => sum + item.editCount, 0);

  const byType = new Map<string, EvalTaskSample[]>();
  for (const sample of feedbackSamples) {
    const group = byType.get(sample.taskType) ?? [];
    group.push(sample);
    byType.set(sample.taskType, group);
  }

  const repeated = [...byType.entries()]
    .filter(([, group]) => group.length >= 2)
    .map(([taskType, group]) => ({
      taskType,
      samples: group.length,
      firstEditCount: group[0].editCount,
      latestEditCount: group[group.length - 1].editCount,
      editDelta: group[group.length - 1].editCount - group[0].editCount,
    }));

  return {
    totalTasks: samples.length,
    feedbackCoverage: samples.length ? feedbackSamples.length / samples.length : 0,
    firstPassAdoption: feedbackSamples.length ? feedbackSamples.filter((item) => item.feedback === "采用").length / feedbackSamples.length : 0,
    outcomeCoverage: samples.length ? outcomeSamples.length / samples.length : 0,
    outcomeSuccessRate: outcomeSamples.length ? outcomeSamples.filter((item) => positiveOutcomes.has(item.outcome ?? "")).length / outcomeSamples.length : 0,
    experienceReuseRate: samples.length ? samples.filter((item) => item.appliedExperienceCount > 0).length / samples.length : 0,
    averageEditCount: feedbackSamples.length ? totalEdits / feedbackSamples.length : 0,
    repeatedTaskTypes: repeated,
    improvedTaskTypes: repeated.filter((item) => item.editDelta < 0).length,
  };
}
