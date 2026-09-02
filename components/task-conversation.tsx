"use client";

import type { MarketingTask } from "@/lib/types";
import { AppliedExperience } from "@/components/applied-experience";
import { MarketingRuntimeProvider } from "@/components/assistant-ui/marketing-runtime-provider";
import { MarketingThread } from "@/components/assistant-ui/marketing-thread";

export function TaskConversation({ task }: { task: MarketingTask }) {
  return (
    <section className="conversation-panel">
      <AppliedExperience items={task.appliedExperiences} />
      <MarketingRuntimeProvider initialMessages={[
        { role: "user", content: task.userPrompt },
        { role: "assistant", content: `任务判断：${task.judgment}` },
      ]}>
        <MarketingThread />
      </MarketingRuntimeProvider>
    </section>
  );
}
