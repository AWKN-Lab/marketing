"use client";

import { callMarketingProduct } from "@/lib/product-client";

export function getLearningRun(input: { workspaceId: string; watchId: string; runId: string }) {
  return callMarketingProduct<unknown, { run_id: string; watch_id: string }>({
    operation: "learning.run.get",
    workspaceId: input.workspaceId,
    payload: { run_id: input.runId, watch_id: input.watchId },
  });
}

export function retryLearningRun(input: { workspaceId: string; watchId: string; runId: string; topics: string[]; sourceTypes: string[] }) {
  return callMarketingProduct<unknown, { run_id: string; watch_id: string; topics: string[]; source_types: string[] }>({
    operation: "learning.run.retry",
    workspaceId: input.workspaceId,
    idempotencyKey: `learning.run.retry:${input.runId}`,
    payload: { run_id: input.runId, watch_id: input.watchId, topics: input.topics, source_types: input.sourceTypes },
  });
}
