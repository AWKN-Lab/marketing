import type { EvolutionCandidate, MarketingTask } from "@/lib/types";

/**
 * 产品前端只依赖这些语义接口。
 * P0 使用 mock adapter；后续由 AWKN 平台适配层提供真实实现。
 */
export interface MarketingFrontendPort {
  getTask(taskId: string): Promise<MarketingTask | null>;
  submitFeedback(input: { taskId: string; artifactText: string; feedback: string }): Promise<void>;
  recordOutcome(input: { taskId: string; outcome: string; note?: string }): Promise<void>;
  reviewCandidate(input: { candidateId: string; decision: "accept" | "scope" | "reject" }): Promise<void>;
}

export type CandidateView = EvolutionCandidate;
