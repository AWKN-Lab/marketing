import type { EvolutionCandidate, MarketingTask } from "@/lib/types";
import type { LearningWatch } from "@/lib/learning-store";
import type {
  MarketingProductRequest,
  MarketingProductResponse,
  ProductOperation,
} from "@/lib/product-contract";

/** 产品前端只依赖业务语义接口；P0 使用 local/mock adapter。 */
export interface MarketingFrontendPort {
  getTask(taskId: string): Promise<MarketingTask | null>;
  submitFeedback(input: { taskId: string; artifactText: string; feedback: string }): Promise<void>;
  recordOutcome(input: { taskId: string; outcome: string; note?: string }): Promise<void>;
  reviewCandidate(input: { candidateId: string; decision: "accept" | "scope" | "reject" }): Promise<void>;
}

export interface MarketingProductPort {
  request<TData = unknown, TPayload = unknown>(
    input: MarketingProductRequest<TPayload>,
  ): Promise<MarketingProductResponse<TData>>;
}

export interface WorkspacePort {
  create(input: { name: string; type: string; goal: string; successCriteria?: string }): Promise<{ workspaceId: string }>;
  update(input: { workspaceId: string; patch: Record<string, unknown> }): Promise<void>;
}

export interface MaterialPort {
  feed(input: {
    workspaceId: string;
    kind: "file" | "url" | "text";
    title: string;
    contentRef?: string;
    source?: string;
  }): Promise<{ materialId: string; status: "processing" | "ready" | "needs_review" }>;
}

export interface TaskPort {
  create(input: { workspaceId: string; taskType: string; goal: string }): Promise<{ taskId: string }>;
  run(input: { taskId: string }): Promise<{ runId: string }>;
}

export interface OutcomePort {
  record(input: { taskId: string; outcome: string; reason?: string; evidenceRefs?: string[] }): Promise<void>;
}

export interface EvolutionPort {
  review(input: {
    candidateId: string;
    decision: "accept" | "scope" | "reject";
    scope?: string;
  }): Promise<void>;
}

export interface LearningPort {
  upsertWatch(watch: LearningWatch): Promise<void>;
  runOnce(input: { workspaceId: string; watchId: string }): Promise<{ runId: string }>;
}

export interface ProductOperationPort {
  supports(operation: ProductOperation): boolean;
}

export type CandidateView = EvolutionCandidate;
