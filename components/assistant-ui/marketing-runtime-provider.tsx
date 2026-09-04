"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useProductSession } from "@/components/product-session-provider";
import {
  appliedExperienceStableId,
  stableAgentLogicalActionId,
  type MarketingAgentMessage,
  type MarketingAgentRouteResponse,
} from "@/lib/agent-contract";
import { persistAgentTaskResult, projectMarketingAgentResult } from "@/lib/agent-result-store";
import { buildAgentMaterialContext, localMaterialsKey, type LocalMaterial } from "@/lib/material-store";
import { readPersistedValue } from "@/lib/persistence";
import { canMarketingAction } from "@/lib/product-session";
import type { MarketingTask } from "@/lib/types";

function requestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createMarketingAdapter(context: {
  task: MarketingTask;
  tenantId: string;
  actorId: string;
  capabilityScope: string[];
  canRun: boolean;
}): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      if (!context.canRun) {
        yield { content: [{ type: "text", text: "当前账号没有执行该 Workspace 营销任务的权限。需要 task.run + Workspace write Grant。" }] };
        return;
      }

      const serialized: MarketingAgentMessage[] = messages.map((message) => ({
        role: message.role,
        content: message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n"),
      })).filter((message) => message.content.trim());
      const localMaterials = readPersistedValue<LocalMaterial[]>(localMaterialsKey(context.task.workspaceId), []);
      const materials = buildAgentMaterialContext(localMaterials).map((material) => ({
        ...material,
        workspace_id: context.task.workspaceId,
      }));
      const appliedExperienceIds = context.task.appliedExperiences.map(appliedExperienceStableId);
      const logicalActionId = stableAgentLogicalActionId({
        taskId: context.task.id,
        messages: serialized,
        appliedExperienceIds,
      });
      const currentRequestId = requestId();
      const body = {
        tenantId: context.tenantId,
        actorId: context.actorId,
        workspaceId: context.task.workspaceId,
        taskId: context.task.id,
        taskType: context.task.type,
        goal: context.task.goal,
        userPrompt: context.task.userPrompt,
        contextRefs: materials.map((material) => material.id),
        appliedExperienceIds,
        capabilityScope: context.capabilityScope,
        requestId: currentRequestId,
        logicalActionId,
        messages: serialized,
        materials,
      };

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json", "x-request-id": currentRequestId },
          body: JSON.stringify(body),
          signal: abortSignal,
        });
        const payload = await response.json().catch(() => null) as MarketingAgentRouteResponse | null;
        if (!payload || !payload.ok || !payload.data) {
          const code = payload?.error?.code ?? `HTTP_${response.status}`;
          const message = code === "UPSTREAM_UNAVAILABLE"
            ? "AWKN Agent Runtime 暂不可用。"
            : payload?.error?.message ?? "AWKN Agent 执行失败。";
          yield { content: [{ type: "text", text: `${message}${payload?.trace_id ? ` Trace: ${payload.trace_id}` : ""}` }] };
          return;
        }

        const result = projectMarketingAgentResult(payload.data);
        persistAgentTaskResult(context.task.id, result);
        yield { content: [{ type: "text", text: result.text || `Agent Run ${result.runId} 已结束。` }] };
      } catch (error) {
        if (abortSignal.aborted) return;
        yield { content: [{ type: "text", text: `任务请求未完成：${error instanceof Error ? error.message : "unknown error"}` }] };
      }
    },
  };
}

export function MarketingRuntimeProvider({
  task,
  initialMessages,
  children,
}: {
  task: MarketingTask;
  initialMessages: ThreadMessageLike[];
  children: ReactNode;
}) {
  const session = useProductSession();
  const canRun = canMarketingAction(session, "task.run", task.workspaceId, "write");
  const adapter = useMemo(() => createMarketingAdapter({
    task,
    tenantId: session.tenant.id,
    actorId: session.actor.id,
    capabilityScope: session.capabilities,
    canRun,
  }), [task, session.tenant.id, session.actor.id, session.capabilities, canRun]);
  const runtime = useLocalRuntime(adapter, { initialMessages });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
