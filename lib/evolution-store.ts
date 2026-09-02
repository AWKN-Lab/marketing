import type { EvolutionCandidate } from "@/lib/types";

export type LocalEvolutionCandidate = EvolutionCandidate & {
  createdAt: string;
  taskId: string;
  workspaceId?: string;
};

export const LOCAL_CANDIDATES_KEY = "marketing:evolution:candidates";
export const EVOLUTION_REVIEWS_KEY = "marketing:evolution:reviews";

export function createExperienceCandidate(input: {
  taskId: string;
  workspaceId: string;
  artifactTitle: string;
  feedback: string;
  outcome: string;
  editCount: number;
}): LocalEvolutionCandidate {
  return {
    id: `local-ev-${Date.now()}`,
    taskId: input.taskId,
    workspaceId: input.workspaceId,
    createdAt: new Date().toISOString(),
    type: "Experience Candidate",
    lesson: `在“${input.artifactTitle}”类任务中，优先参考本次用户最终采用的结构与表达`,
    why: `本次产出被标记为“${input.feedback}”，真实结果为“${input.outcome}”，AI 初稿与用户最终稿存在 ${input.editCount} 处结构化差异。`,
    source: `${input.taskId} / AI Initial → User Final → Outcome`,
    scope: "当前 Workspace / 相似任务",
    counterexample: "目标、受众、交付形式或业务阶段显著变化时需重新验证",
    confidence: 0.55,
  };
}
