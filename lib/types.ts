export type AppliedExperience = { lesson: string; source: string };

export type MarketingTask = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  type: string;
  title: string;
  goal: string;
  status: string;
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
