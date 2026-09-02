"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";

const marketingP0Adapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    if (abortSignal.aborted) return;
    const latest = messages.at(-1);
    const preview = latest?.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .slice(0, 80);

    yield {
      content: [
        {
          type: "text",
          text: `已收到这条任务补充${preview ? `：“${preview}”` : ""}。P0 当前由前端 Runtime 验证交互；接入 AWKN 后，这里将通过 AgentRuntimePort 继续任务，并把 Evidence、Experience 与 Artifact 更新回同一工作台。`,
        },
      ],
    };
  },
};

export function MarketingRuntimeProvider({
  initialMessages,
  children,
}: {
  initialMessages: ThreadMessageLike[];
  children: ReactNode;
}) {
  const runtime = useLocalRuntime(marketingP0Adapter, { initialMessages });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
