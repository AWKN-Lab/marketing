export const MARKETING_TASK_STATUSES = ["ready", "running", "completed", "failed"] as const;

export type MarketingTaskStatus = (typeof MARKETING_TASK_STATUSES)[number];

export function isMarketingTaskStatus(value: unknown): value is MarketingTaskStatus {
  return typeof value === "string" && (MARKETING_TASK_STATUSES as readonly string[]).includes(value);
}

export type AppliedExperience = { id?: string; lesson: string; source: string };

export type MarketingTask = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  type: string;
  title: string;
  goal: string;
  status: MarketingTaskStatus;
  userPrompt: string;
  judgment: string;
  appliedExperiences: AppliedExperience[];
  artifact: { title: string; aiDraft: string; userFinal: string };
};

export type EvolutionCandidate = {
  id: string;
  type: string;
  lesson: string;
  why: string;
  source: string;
  scope: string;
  counterexample: string;
  confidence: number;
};
