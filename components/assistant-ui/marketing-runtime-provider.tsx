"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { buildAgentMaterialContext, localMaterialsKey, type LocalMaterial } from "@/lib/material-store";
import { readPersistedValue } from "@/lib/persistence";

function createMarketingAdapter(context: { taskId: string; workspaceId: string }): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const serialized = messages.map((message) => ({
        role: message.role,
        content: message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n"),
      }));
      const localMaterials = readPersistedValue<LocalMaterial[]>(localMaterialsKey(context.workspaceId), []);
      const materials = buildAgentMaterialContext(localMaterials);

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ taskId: context.taskId, workspaceId: context.workspaceId, messages: serialized, materials }),
          signal: abortSignal,
        });
        const payload = (await response.json()) as { text?: string; error?: string };
        if (!response.ok || !payload.text) {
          const hint = payload.error === "platform_not_configured"
            ? "AWKN 产品接口尚未配置。当前 Thread、任务上下文、Artifact、Feedback、Outcome 和进化闭环仍可在 P0 本地验证。"
            : `AWKN 产品接口暂不可用：${payload.error ?? response.status}`;
          yield { content: [{ type: "text", text: hint }] };
          return;
        }
        yield { content: [{ type: "text", text: payload.text }] };
      } catch (error) {
        if (abortSignal.aborted) return;
        yield { content: [{ type: "text", text: `任务请求未完成：${error instanceof Error ? error.message : "unknown error"}` }] };
      }
    },
  };
}

export function MarketingRuntimeProvider({ taskId, workspaceId, initialMessages, children }: { taskId: string; workspaceId: string; initialMessages: ThreadMessageLike[]; children: ReactNode }) {
  const adapter = useMemo(() => createMarketingAdapter({ taskId, workspaceId }), [taskId, workspaceId]);
  const runtime = useLocalRuntime(adapter, { initialMessages });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
