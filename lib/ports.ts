import type { EvolutionCandidate, MarketingTask } from "@/lib/types";
import type { LearningWatch } from "@/lib/learning-store";

/** 产品前端只依赖业务语义接口；P0 使用 local/mock adapter。 */
export interface MarketingFrontendPort {
  getTask(taskId: string): Promise<MarketingTask | null>;
  submitFeedback(input: { taskId: string; artifactText: string; feedback: string }): Promise<void>;
  recordOutcome(input: { taskId: string; outcome: string; note?: string }): Promise<void>;
  reviewCandidate(input: { candidateId: string; decision: "accept" | "scope" | "reject" }): Promise<void>;
}

export interface LearningPort {
  upsertWatch(watch: LearningWatch): Promise<void>;
  runOnce(input: { workspaceId: string; watchId: string }): Promise<{ runId: string }>;
}

export type CandidateView = EvolutionCandidate;
