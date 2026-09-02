import type { EvolutionCandidate } from "@/lib/types";

export type LocalEvolutionCandidate = EvolutionCandidate & {
  createdAt: string;
  taskId: string;
  workspaceId?: string;
  sourceTaskType?: string;
  sourceTaskGoal?: string;
  polarity?: "positive" | "caution" | "negative";
  fingerprint?: string;
};

export const LOCAL_CANDIDATES_KEY = "marketing:evolution:candidates";
export const EVOLUTION_REVIEWS_KEY = "marketing:evolution:reviews";

const positiveOutcomes = new Set(["项目推进", "获得反馈", "方案采用"]);

export function candidateFingerprint(input: { finalText: string; feedback: string; outcome: string; outcomeNote: string }) {
  return JSON.stringify([input.finalText, input.feedback, input.outcome, input.outcomeNote]);
}

export function createExperienceCandidate(input: {
  taskId: string;
  workspaceId: string;
  taskType: string;
  taskGoal: string;
  artifactTitle: string;
  feedback: string;
  outcome: string;
  outcomeNote: string;
  editCount: number;
  fingerprint: string;
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

  return {
    id: `local-ev-${input.taskId}`,
    taskId: input.taskId,
    workspaceId: input.workspaceId,
    sourceTaskType: input.taskType,
    sourceTaskGoal: input.taskGoal,
    polarity,
    fingerprint: input.fingerprint,
    createdAt: new Date().toISOString(),
    type: isFailure ? "Counterexample Candidate" : "Experience Candidate",
    lesson,
    why: `Feedback：${input.feedback}；Outcome：${input.outcome}；AI 初稿与用户最终稿存在 ${input.editCount} 处结构化差异。${input.outcomeNote.trim() ? ` 结果说明：${input.outcomeNote.trim()}` : " 当前缺少结果原因说明，置信度已降低。"}`,
    source: `${input.taskId} / AI Initial → User Final → Feedback → Outcome`,
    scope: `${input.taskType} / 相似目标`,
    counterexample: "任务类型、目标、受众、交付形式或业务阶段显著变化时重新验证",
    confidence,
  };
}
