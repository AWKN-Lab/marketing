"use client";

import { useEffect, useState } from "react";
import {
  AGENT_RESULT_EVENT,
  readAgentTaskResult,
  type AgentTaskResult,
} from "@/lib/agent-result-store";

export function useAgentTaskResult(taskId: string) {
  const [result, setResult] = useState<AgentTaskResult | null>(null);

  useEffect(() => {
    const refresh = () => setResult(readAgentTaskResult(taskId));
    const onResult = (event: Event) => {
      const custom = event as CustomEvent<{ taskId?: string }>;
      if (!custom.detail?.taskId || custom.detail.taskId === taskId) refresh();
    };
    refresh();
    window.addEventListener(AGENT_RESULT_EVENT, onResult);
    return () => window.removeEventListener(AGENT_RESULT_EVENT, onResult);
  }, [taskId]);

  return result;
}
