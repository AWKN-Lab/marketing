import type { MarketingTask } from "@/lib/types";

export const LOCAL_TASKS_KEY = "marketing:local-tasks";

export const taskTypes = [
  "资料消化",
  "营销研究",
  "策略判断",
  "方案 / 内容",
  "会前 / 沟通",
  "任务复盘",
] as const;

export function createLocalTask(input: {
  workspaceId: string;
  workspaceName: string;
  type: string;
  title: string;
  goal: string;
  prompt: string;
}): MarketingTask {
  return {
    id: `local-task-${Date.now()}`,
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    type: input.type,
    title: input.title,
    goal: input.goal,
    status: "ready",
    userPrompt: input.prompt,
    judgment: "任务已建立。P0 会优先使用当前 Workspace 的目标、资料和已确认经验；接入 AWKN 后由 AgentRuntimePort 生成真实判断。",
    appliedExperiences: [],
    artifact: {
      title: `${input.title}｜任务产出`,
      aiDraft: "任务已创建。\n\n等待 Marketing Agent 基于 Workspace Context 生成第一版产出。",
      userFinal: "任务已创建。\n\n等待 Marketing Agent 基于 Workspace Context 生成第一版产出。",
    },
  };
}
