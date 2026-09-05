"use client";

import {
  learningRunIdempotencyKey,
  learningRunRetryIdempotencyKey,
  learningWatchUpsertIdempotencyKey,
} from "@/lib/learning-contract";
import { callMarketingProduct } from "@/lib/product-client";
import type { LearningWatch } from "@/lib/learning-store";

function logicalActionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `learning-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function upsertLearningWatch(input: { workspaceId: string; watch: LearningWatch }) {
  return callMarketingProduct<unknown, { watch: LearningWatch }>({
    operation: "learning.watch.upsert",
    workspaceId: input.workspaceId,
    idempotencyKey: learningWatchUpsertIdempotencyKey(input.watch),
    payload: { watch: input.watch },
  });
}

export function startLearningRun(input: {
  workspaceId: string;
  watchId: string;
  topics: string[];
  sourceTypes: string[];
  logicalActionId?: string;
}) {
  const actionId = input.logicalActionId ?? logicalActionId();
  return callMarketingProduct<unknown, { watch_id: string; topics: string[]; source_types: string[]; logical_action_id: string }>({
    operation: "learning.run",
    workspaceId: input.workspaceId,
    idempotencyKey: learningRunIdempotencyKey(input.watchId, actionId),
    payload: {
      watch_id: input.watchId,
      topics: input.topics,
      source_types: input.sourceTypes,
      logical_action_id: actionId,
    },
  });
}

export function getLearningRun(input: { workspaceId: string; watchId: string; runId: string }) {
  return callMarketingProduct<unknown, { run_id: string; watch_id: string }>({
    operation: "learning.run.get",
    workspaceId: input.workspaceId,
    payload: { run_id: input.runId, watch_id: input.watchId },
  });
}

export function retryLearningRun(input: {
  workspaceId: string;
  watchId: string;
  runId: string;
  attempt: number;
  topics: string[];
  sourceTypes: string[];
}) {
  return callMarketingProduct<unknown, { run_id: string; watch_id: string; attempt: number; topics: string[]; source_types: string[] }>({
    operation: "learning.run.retry",
    workspaceId: input.workspaceId,
    idempotencyKey: learningRunRetryIdempotencyKey(input.runId, input.attempt),
    payload: {
      run_id: input.runId,
      watch_id: input.watchId,
      attempt: input.attempt,
      topics: input.topics,
      source_types: input.sourceTypes,
    },
  });
}
