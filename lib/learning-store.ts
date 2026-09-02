export type LearningWatch = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  topics: string[];
  sourceTypes: string[];
  cadence: "daily";
  enabled: boolean;
  updatedAt: string;
};

export const LEARNING_WATCHES_KEY = "marketing:learning:watches";

export const learningSourceTypes = ["政策", "客户公开动态", "行业", "竞争", "采购 / 项目"] as const;

export function createLearningWatch(input: Omit<LearningWatch, "id" | "cadence" | "updatedAt">): LearningWatch {
  return {
    ...input,
    id: `watch-${input.workspaceId}`,
    cadence: "daily",
    updatedAt: new Date().toISOString(),
  };
}
