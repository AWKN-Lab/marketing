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
      return [{
        workspaceId: first.workspaceId,
        taskType: first.taskType,
        samples: ordered.length,
        firstEditCount: first.editCount,
        latestEditCount: latest.editCount,
        editDelta: latest.editCount - first.editCount,
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
    improvedTaskTypes: repeated.filter((item) => item.editDelta < 0).length,
  };
}
